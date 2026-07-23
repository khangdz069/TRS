package com.trs.grader;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GraderService {
    private static final Logger logger = LoggerFactory.getLogger(GraderService.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
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

            if (!request.safeCustomTestcases().isEmpty()) {
                return GradeOutcome.ok(gradeCustomTestcases(workspacePath, request));
            }

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

    private GraderResponse gradeCustomTestcases(Path workspacePath, GraderRequest request) throws IOException, InterruptedException {
        Map<Integer, String> questionAnswers = readQuestionAnswers(request);
        if (!questionAnswers.isEmpty()) {
            return gradeQuestionAnswers(workspacePath, request, questionAnswers);
        }

        List<String> sourceFiles = findAllSourceFiles(workspacePath);
        if (sourceFiles.isEmpty()) {
            return new GraderResponse("FAILED", Map.of(), Map.of(), "No C/C++ source files found.", null);
        }

        Path executablePath = workspacePath.resolve(executableName());
        List<String> compileCommand = buildCompileCommand(
                executablePath.getFileName().toString(),
                sourceFiles,
                shouldUseCCompiler(sourceFiles)
        );

        logger.info("Custom testcase compilation command: {}", String.join(" ", compileCommand));
        ProcessResult compileResult = runProcess(compileCommand, workspacePath, COMPILE_TIMEOUT);
        if (compileResult.timedOut()) {
            return new GraderResponse("FAILED", Map.of(), Map.of(), "Compilation timed out after 15 seconds.", null);
        }
        if (compileResult.exitCode() != 0) {
            return new GraderResponse("FAILED", Map.of(), Map.of(), compileResult.stderr(), null);
        }

        Map<String, Boolean> scores = new LinkedHashMap<>();
        Map<String, FailedOutput> failedOutputs = new LinkedHashMap<>();
        List<String> runtimeErrors = new ArrayList<>();
        List<GraderTestcase> testcases = request.safeCustomTestcases();

        for (int index = 0; index < testcases.size(); index++) {
            GraderTestcase testcase = testcases.get(index);
            String testcaseKey = String.valueOf(index + 1);
            try {
                ProcessResult runResult = runProcessWithInput(
                        List.of(executablePath.toAbsolutePath().toString()),
                        workspacePath,
                        TESTCASE_TIMEOUT,
                        testcase.safeInput()
                );
                if (runResult.timedOut()) {
                    String errorMessage = "tc" + testcaseKey + " execution timed out (limit: 5s)";
                    scores.put(testcaseKey, false);
                    failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, errorMessage));
                    runtimeErrors.add(errorMessage);
                    continue;
                }
                if (runResult.exitCode() != 0) {
                    String errorMessage = "tc" + testcaseKey + " exited with code "
                            + runResult.exitCode() + ": " + runResult.stderr().strip();
                    scores.put(testcaseKey, false);
                    failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, errorMessage));
                    runtimeErrors.add(errorMessage);
                    continue;
                }

                String normalizedActual = normalizeOutput(runResult.stdout());
                String normalizedExpected = normalizeOutput(testcase.safeExpected());
                boolean passed = normalizedActual.equals(normalizedExpected);
                scores.put(testcaseKey, passed);
                if (!passed) {
                    failedOutputs.put(testcaseKey, new FailedOutput(
                            truncate(normalizedExpected),
                            truncate(normalizedActual),
                            null
                    ));
                }
            } catch (Exception ex) {
                String errorMessage = "tc" + testcaseKey + " failed with error: " + ex.getMessage();
                scores.put(testcaseKey, false);
                failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, errorMessage));
                runtimeErrors.add(errorMessage);
            }
        }

        long passedCount = scores.values().stream().filter(Boolean::booleanValue).count();
        logger.info("Completed custom grading submission {}. Passed: {}/{}", request.submissionId(), passedCount, testcases.size());
        String runtimeErrorSummary = runtimeErrors.isEmpty() ? null : String.join("\n", runtimeErrors);
        return new GraderResponse("SUCCESS", scores, failedOutputs, null, runtimeErrorSummary);
    }

    private Map<Integer, String> readQuestionAnswers(GraderRequest request) {
        return request.safeFiles().stream()
                .filter(file -> "answers.json".equalsIgnoreCase(file.filename()))
                .findFirst()
                .map(file -> {
                    try {
                        JsonNode root = OBJECT_MAPPER.readTree(file.safeContent());
                        JsonNode answers = root.path("answers");
                        Map<Integer, String> result = new LinkedHashMap<>();
                        if (answers.isArray()) {
                            for (JsonNode answer : answers) {
                                int question = answer.path("question").asInt(0);
                                if (question > 0) {
                                    result.put(question, answer.path("answer").asText(""));
                                }
                            }
                        }
                        return result;
                    } catch (Exception ex) {
                        logger.warn("Could not parse answers.json for submission {}", request.submissionId(), ex);
                        return Map.<Integer, String>of();
                    }
                })
                .orElseGet(Map::of);
    }

    private GraderResponse gradeQuestionAnswers(Path workspacePath, GraderRequest request, Map<Integer, String> questionAnswers)
            throws IOException, InterruptedException {
        Map<String, Boolean> scores = new LinkedHashMap<>();
        Map<String, FailedOutput> failedOutputs = new LinkedHashMap<>();
        List<String> runtimeErrors = new ArrayList<>();
        List<GraderTestcase> testcases = request.safeCustomTestcases();

        for (int index = 0; index < testcases.size(); index++) {
            GraderTestcase testcase = testcases.get(index);
            String testcaseKey = String.valueOf(index + 1);
            String answer = questionAnswers.getOrDefault(testcase.safeQuestion(), "");
            if (answer.isBlank()) {
                scores.put(testcaseKey, false);
                failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, "Question " + testcase.safeQuestion() + " has no answer."));
                continue;
            }

            boolean fullProgramAnswer = containsMainFunction(answer);
            boolean harnessNeedsCpp = !fullProgramAnswer && isLikelyCppSource(testcase.safeInput());
            boolean useCCompiler = !isLikelyCppSource(answer) && !harnessNeedsCpp;
            Path sourcePath = workspacePath.resolve("question_" + testcase.safeQuestion() + "_tc_" + (index + 1) + (useCCompiler ? ".c" : ".cpp"));
            Path executablePath = workspacePath.resolve("question_" + testcase.safeQuestion() + "_tc_" + (index + 1) + executableName());
            Files.writeString(
                    sourcePath,
                    fullProgramAnswer ? buildFullProgramSource(answer, useCCompiler) : buildHarnessSource(answer, testcase.safeInput(), useCCompiler),
                    StandardCharsets.UTF_8
            );

            ProcessResult compileResult = runProcess(
                    buildCompileCommand(executablePath.getFileName().toString(), List.of(sourcePath.getFileName().toString()), useCCompiler),
                    workspacePath,
                    COMPILE_TIMEOUT
            );
            if (compileResult.timedOut()) {
                String errorMessage = "tc" + testcaseKey + " compilation timed out.";
                scores.put(testcaseKey, false);
                failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, errorMessage));
                runtimeErrors.add(errorMessage);
                continue;
            }
            if (compileResult.exitCode() != 0) {
                scores.put(testcaseKey, false);
                failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, compileResult.stderr()));
                continue;
            }

            ProcessResult runResult = fullProgramAnswer
                    ? runProcessWithInput(List.of(executablePath.toAbsolutePath().toString()), workspacePath, TESTCASE_TIMEOUT, testcase.safeInput())
                    : runProcess(List.of(executablePath.toAbsolutePath().toString()), workspacePath, TESTCASE_TIMEOUT);
            if (runResult.timedOut()) {
                String errorMessage = "tc" + testcaseKey + " execution timed out (limit: 5s)";
                scores.put(testcaseKey, false);
                failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, errorMessage));
                runtimeErrors.add(errorMessage);
                continue;
            }
            if (runResult.exitCode() != 0) {
                String errorMessage = "tc" + testcaseKey + " exited with code " + runResult.exitCode() + ": " + runResult.stderr().strip();
                scores.put(testcaseKey, false);
                failedOutputs.put(testcaseKey, new FailedOutput(testcase.safeExpected(), null, errorMessage));
                runtimeErrors.add(errorMessage);
                continue;
            }

            String normalizedActual = normalizeOutput(runResult.stdout());
            String normalizedExpected = normalizeOutput(testcase.safeExpected());
            boolean passed = normalizedActual.equals(normalizedExpected);
            scores.put(testcaseKey, passed);
            if (!passed) {
                failedOutputs.put(testcaseKey, new FailedOutput(truncate(normalizedExpected), truncate(normalizedActual), null));
            }
        }

        String runtimeErrorSummary = runtimeErrors.isEmpty() ? null : String.join("\n", runtimeErrors);
        return new GraderResponse("SUCCESS", scores, failedOutputs, null, runtimeErrorSummary);
    }

    private String buildHarnessSource(String answer, String testSnippet, boolean cMode) {
        String header = buildDefaultHeader(answer, cMode);
        String mainSignature = cMode ? "int main(void)" : "int main()";
        return header + answer + "\n" + mainSignature + " {\n" + normalizeHarnessSnippet(testSnippet) + "\nreturn 0;\n}\n";
    }

    private String buildFullProgramSource(String answer, boolean cMode) {
        return buildDefaultHeader(answer, cMode) + answer.strip() + "\n";
    }

    private String buildDefaultHeader(String source, boolean cMode) {
        if (cMode) {
            return source.contains("#include <stdio.h>") || source.contains("#include<stdio.h>")
                    ? ""
                    : "#include <stdio.h>\n";
        }
        if (source.contains("#include")) return "";
        return "#include <bits/stdc++.h>\nusing namespace std;\n";
    }

    private List<String> buildCompileCommand(String executableName, List<String> sourceFiles, boolean cMode) {
        List<String> compileCommand = new ArrayList<>();
        compileCommand.add(cMode ? "gcc" : "g++");
        compileCommand.add("-g");
        compileCommand.add("-o");
        compileCommand.add(executableName);
        compileCommand.addAll(sourceFiles);
        compileCommand.add("-I");
        compileCommand.add(".");
        compileCommand.add(cMode ? "-std=c11" : "-std=c++11");
        return compileCommand;
    }

    private boolean shouldUseCCompiler(List<String> sourceFiles) {
        return !sourceFiles.isEmpty() && sourceFiles.stream().allMatch(name -> name.endsWith(".c"));
    }

    private boolean isLikelyCppSource(String source) {
        String value = source == null ? "" : source;
        return value.contains("#include <bits/stdc++.h>")
                || value.contains("#include <iostream>")
                || value.contains("using namespace std")
                || value.contains("std::")
                || value.matches("(?s).*\\b(cin|cout|cerr|clog)\\b.*")
                || value.matches("(?s).*\\b(class|template|namespace)\\b.*")
                || value.matches("(?s).*\\b(vector|string|map|set|queue|stack)\\s*<.*");
    }

    private boolean containsMainFunction(String source) {
        return source != null && source.matches("(?s).*\\bmain\\s*\\([^;{}]*\\)\\s*\\{.*");
    }

    private String normalizeHarnessSnippet(String testSnippet) {
        String snippet = testSnippet == null ? "" : testSnippet.strip();
        if (snippet.isEmpty() || snippet.endsWith(";") || snippet.endsWith("}")) {
            return snippet;
        }
        return snippet + "\n;";
    }

    private List<String> findAllSourceFiles(Path workspacePath) throws IOException {
        try (Stream<Path> paths = Files.list(workspacePath)) {
            return paths
                    .filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .filter(name -> name.endsWith(".cpp") || name.endsWith(".cc") || name.endsWith(".cxx") || name.endsWith(".c"))
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

    private ProcessResult runProcessWithInput(List<String> command, Path workingDirectory, Duration timeout, String input)
            throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.directory(workingDirectory.toFile());
        Process process = processBuilder.start();

        try (OutputStream stdin = process.getOutputStream()) {
            stdin.write((input == null ? "" : input).getBytes(StandardCharsets.UTF_8));
            if (input == null || !input.endsWith("\n")) {
                stdin.write('\n');
            }
        }

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
