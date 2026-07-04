package com.trs.grader;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GraderService {
    private static final Logger logger = LoggerFactory.getLogger(GraderService.class);
    private static final List<String> SUPPORT_FILE_NAMES = List.of("main.cpp", "main.hpp", "tc.hpp", "mnist.csv");
    private static final List<Integer> TESTCASE_IDS = buildTestcaseIds();
    private static final Duration COMPILE_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration TESTCASE_TIMEOUT = Duration.ofSeconds(5);

    private final String supportFilesDirConfig;
    private final String expectedOutputsDirConfig;
    private final String tempDirConfig;

    public GraderService(
            @Value("${grader.support-files-dir}") String supportFilesDirConfig,
            @Value("${grader.expected-outputs-dir}") String expectedOutputsDirConfig,
            @Value("${grader.temp-dir}") String tempDirConfig) {
        this.supportFilesDirConfig = supportFilesDirConfig;
        this.expectedOutputsDirConfig = expectedOutputsDirConfig;
        this.tempDirConfig = tempDirConfig;
    }

    public GradeOutcome grade(GraderRequest request) {
        logger.info("Start grading submission {} for student {}", request.submissionId(), request.studentId());

        Path supportFilesDir = resolveDirectory(supportFilesDirConfig, "grader/assets/support-files");
        Path expectedOutputsDir = resolveDirectory(expectedOutputsDirConfig, "grader/assets/expected_outputs");
        Path tempDir = Paths.get(tempDirConfig).toAbsolutePath().normalize();
        Path workspacePath = tempDir.resolve("submission_" + safeWorkspaceName(request.submissionId()));

        try {
            Files.createDirectories(workspacePath);
            saveSubmittedFiles(workspacePath, request.safeFiles());

            GradeOutcome copySupportOutcome = copySupportFiles(supportFilesDir, workspacePath);
            if (copySupportOutcome != null) {
                return copySupportOutcome;
            }

            List<String> cppFiles = findCppFiles(workspacePath);
            Path executablePath = workspacePath.resolve(executableName());
            List<String> compileCommand = new ArrayList<>();
            compileCommand.add("g++");
            compileCommand.add("-g");
            compileCommand.add("-o");
            compileCommand.add(executablePath.getFileName().toString());
            compileCommand.add("main.cpp");
            compileCommand.addAll(cppFiles);
            compileCommand.add("-I");
            compileCommand.add(".");
            compileCommand.add("-std=c++11");

            logger.info("Compilation command: {}", String.join(" ", compileCommand));
            ProcessResult compileResult = runProcess(compileCommand, workspacePath, COMPILE_TIMEOUT);
            if (compileResult.timedOut()) {
                String message = "Compilation timed out after 15 seconds.";
                logger.warn(message);
                return GradeOutcome.ok(new GraderResponse("FAILED", Collections.emptyList(), null, message, null));
            }

            if (compileResult.exitCode() != 0) {
                logger.info("Compilation failed for submission {}", request.submissionId());
                return GradeOutcome.ok(new GraderResponse("FAILED", Collections.emptyList(), null, compileResult.stderr(), null));
            }

            if (!Files.exists(expectedOutputsDir)) {
                String message = "CRITICAL: Expected outputs directory missing: " + expectedOutputsDir;
                logger.error(message);
                return GradeOutcome.serverError(new GraderResponse("FAILED", Collections.emptyList(), null, message, null));
            }

            return GradeOutcome.ok(runTestcases(workspacePath, executablePath, expectedOutputsDir, request.submissionId()));
        } catch (Exception ex) {
            logger.error("Unhandled error during grading: {}", ex.getMessage(), ex);
            return GradeOutcome.serverError(new GraderResponse(
                    "FAILED",
                    Map.of(),
                    Map.of(),
                    null,
                    "Unhandled grader exception: " + ex.getMessage()
            ));
        } finally {
            deleteRecursively(workspacePath);
            logger.info("Cleaned up workspace for submission {}", request.submissionId());
        }
    }

    private void saveSubmittedFiles(Path workspacePath, List<GraderFile> files) throws IOException {
        for (GraderFile file : files) {
            String filename = cleanFilename(file.filename());
            if (filename.isBlank()) {
                continue;
            }

            if (SUPPORT_FILE_NAMES.contains(filename)) {
                logger.warn("Rejected attempt to overwrite support file: {}", filename);
                continue;
            }

            Files.writeString(workspacePath.resolve(filename), file.safeContent(), StandardCharsets.UTF_8);
        }
    }

    private GradeOutcome copySupportFiles(Path supportFilesDir, Path workspacePath) throws IOException {
        for (String filename : SUPPORT_FILE_NAMES) {
            Path source = supportFilesDir.resolve(filename);
            if (!Files.exists(source)) {
                String message = "CRITICAL: Grader support file missing on disk: " + source;
                logger.error(message);
                return GradeOutcome.serverError(new GraderResponse("FAILED", Collections.emptyList(), null, message, null));
            }

            Files.copy(source, workspacePath.resolve(filename), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }

        return null;
    }

    private List<String> findCppFiles(Path workspacePath) throws IOException {
        try (Stream<Path> paths = Files.list(workspacePath)) {
            return paths
                    .filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .filter(name -> name.endsWith(".cpp"))
                    .filter(name -> !name.equals("main.cpp"))
                    .sorted()
                    .toList();
        }
    }

    private GraderResponse runTestcases(
            Path workspacePath,
            Path executablePath,
            Path expectedOutputsDir,
            String submissionId) {
        Map<String, Boolean> scores = new LinkedHashMap<>();
        Map<String, FailedOutput> failedOutputs = new LinkedHashMap<>();
        List<String> runtimeErrors = new ArrayList<>();

        for (int testcaseId : TESTCASE_IDS) {
            String testcaseKey = String.valueOf(testcaseId);
            List<String> runCommand = List.of(executablePath.toAbsolutePath().toString(), String.valueOf(testcaseId - 1000));

            try {
                ProcessResult runResult = runProcess(runCommand, workspacePath, TESTCASE_TIMEOUT);
                if (runResult.timedOut()) {
                    String errorMessage = "tc" + testcaseId + " execution timed out (limit: 5s)";
                    scores.put(testcaseKey, false);
                    failedOutputs.put(testcaseKey, new FailedOutput(null, null, errorMessage));
                    runtimeErrors.add(errorMessage);
                    continue;
                }

                if (runResult.exitCode() != 0) {
                    String errorMessage = "tc" + testcaseId + " exited with code "
                            + runResult.exitCode() + ": " + runResult.stderr().strip();
                    scores.put(testcaseKey, false);
                    failedOutputs.put(testcaseKey, new FailedOutput(null, null, errorMessage));
                    if (!runResult.stderr().isBlank()) {
                        runtimeErrors.add(errorMessage);
                    }
                    continue;
                }

                Path expectedFile = expectedOutputsDir.resolve("tc" + testcaseId + ".out");
                if (!Files.exists(expectedFile)) {
                    String message = "CRITICAL: Expected output file missing: " + expectedFile;
                    logger.error(message);
                    scores.put(testcaseKey, false);
                    failedOutputs.put(testcaseKey, new FailedOutput(null, null, message));
                    runtimeErrors.add(message);
                    continue;
                }

                String expectedContent = new String(Files.readAllBytes(expectedFile), StandardCharsets.UTF_8);
                String normalizedActual = normalizeOutput(runResult.stdout());
                String normalizedExpected = normalizeOutput(expectedContent);

                if (normalizedActual.equals(normalizedExpected)) {
                    scores.put(testcaseKey, true);
                } else {
                    scores.put(testcaseKey, false);
                    failedOutputs.put(testcaseKey, new FailedOutput(
                            truncate(normalizedExpected),
                            truncate(normalizedActual),
                            null
                    ));
                }
            } catch (Exception ex) {
                String errorMessage = "tc" + testcaseId + " failed with error: " + ex.getMessage();
                scores.put(testcaseKey, false);
                failedOutputs.put(testcaseKey, new FailedOutput(null, null, errorMessage));
                runtimeErrors.add(errorMessage);
            }
        }

        long passedCount = scores.values().stream().filter(Boolean::booleanValue).count();
        logger.info("Completed grading submission {}. Passed: {}/{}", submissionId, passedCount, TESTCASE_IDS.size());

        String runtimeErrorSummary = runtimeErrors.isEmpty() ? null : String.join("\n", runtimeErrors);
        return new GraderResponse("SUCCESS", scores, failedOutputs, null, runtimeErrorSummary);
    }

    static String normalizeOutput(String text) {
        String normalized = text == null ? "" : text.replace("\r\n", "\n");
        String[] rawLines = normalized.split("\n", -1);
        List<String> lines = new ArrayList<>(rawLines.length);
        for (String line : rawLines) {
            lines.add(stripTrailingWhitespace(line));
        }

        while (!lines.isEmpty() && lines.get(lines.size() - 1).isEmpty()) {
            lines.remove(lines.size() - 1);
        }

        return String.join("\n", lines).strip();
    }

    private static String stripTrailingWhitespace(String value) {
        int index = value.length();
        while (index > 0 && Character.isWhitespace(value.charAt(index - 1))) {
            index--;
        }
        return value.substring(0, index);
    }

    private static String truncate(String value) {
        if (value.length() <= 500) {
            return value;
        }
        return value.substring(0, 500) + "...";
    }

    private ProcessResult runProcess(List<String> command, Path workingDirectory, Duration timeout)
            throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.directory(workingDirectory.toFile());
        Process process = processBuilder.start();

        CompletableFuture<String> stdoutFuture = CompletableFuture.supplyAsync(() -> readStream(process.getInputStream()));
        CompletableFuture<String> stderrFuture = CompletableFuture.supplyAsync(() -> readStream(process.getErrorStream()));

        boolean finished = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
        if (!finished) {
            process.destroyForcibly();
            return new ProcessResult(
                    -1,
                    getProcessOutput(stdoutFuture),
                    getProcessOutput(stderrFuture),
                    true
            );
        }

        return new ProcessResult(
                process.exitValue(),
                getProcessOutput(stdoutFuture),
                getProcessOutput(stderrFuture),
                false
        );
    }

    private static String readStream(InputStream stream) {
        try (stream) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            return "";
        }
    }

    private static String getProcessOutput(CompletableFuture<String> outputFuture) {
        try {
            return outputFuture.get(1, TimeUnit.SECONDS);
        } catch (TimeoutException ex) {
            return "";
        } catch (Exception ex) {
            return "";
        }
    }

    private static Path resolveDirectory(String configuredPath, String fallbackPath) {
        Path configured = Paths.get(configuredPath).toAbsolutePath().normalize();
        if (Files.exists(configured)) {
            return configured;
        }
        return Paths.get(fallbackPath).toAbsolutePath().normalize();
    }

    private static String cleanFilename(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }

        String normalized = originalFilename.replace("\\", "/");
        int lastSlash = normalized.lastIndexOf('/');
        return lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
    }

    private static String safeWorkspaceName(String value) {
        return value == null ? "unknown" : value.replaceAll("[^A-Za-z0-9_.-]", "_");
    }

    private static String executableName() {
        String osName = System.getProperty("os.name", "").toLowerCase();
        return osName.contains("win") ? "main.exe" : "main";
    }

    private static void deleteRecursively(Path root) {
        if (root == null || !Files.exists(root)) {
            return;
        }

        try (Stream<Path> paths = Files.walk(root)) {
            paths.sorted((left, right) -> right.compareTo(left))
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ex) {
                            logger.warn("Failed to delete {}", path, ex);
                        }
                    });
        } catch (IOException ex) {
            logger.warn("Failed to clean workspace {}", root, ex);
        }
    }

    private static List<Integer> buildTestcaseIds() {
        List<Integer> ids = new ArrayList<>();
        addRange(ids, 1001, 1011);
        addRange(ids, 1011, 1017);
        addRange(ids, 1021, 1031);
        addRange(ids, 1047, 1061);
        addRange(ids, 1075, 1093);
        addRange(ids, 1111, 1119);
        addRange(ids, 1125, 1131);
        addRange(ids, 1141, 1151);
        addRange(ids, 1155, 1161);
        addRange(ids, 1171, 1176);
        addRange(ids, 1181, 1189);
        addRange(ids, 1201, 1209);
        return List.copyOf(ids);
    }

    private static void addRange(List<Integer> ids, int startInclusive, int endExclusive) {
        IntStream.range(startInclusive, endExclusive).forEach(ids::add);
    }
}
