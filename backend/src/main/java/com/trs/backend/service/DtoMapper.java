package com.trs.backend.service;

import java.util.LinkedHashMap;
import java.util.Arrays;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.trs.backend.entity.Account;
import com.trs.backend.entity.Assignment;
import com.trs.backend.entity.FeedbackForm;
import com.trs.backend.entity.Recommendation;
import com.trs.backend.entity.Student;
import com.trs.backend.entity.Submission;
import com.trs.backend.entity.Teacher;

@Component
public class DtoMapper {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public Map<String, Object> account(Account account) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", account.getId().toString());
        map.put("email", account.getEmail());
        map.put("name", account.getName());
        map.put("role", account.getRole());
        map.put("is_active", account.isActive());
        map.put("created_at", iso(account.getCreatedAt()));
        return map;
    }

    public Map<String, Object> student(Student student) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", student.getId().toString());
        map.put("account_id", student.getAccount().getId().toString());
        map.put("mssv", student.getMssv());
        map.put("name", student.getAccount().getName());
        map.put("email", student.getAccount().getEmail());
        return map;
    }

    public Map<String, Object> teacher(Teacher teacher) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", teacher.getId().toString());
        map.put("account_id", teacher.getAccount().getId().toString());
        map.put("name", teacher.getAccount().getName());
        map.put("email", teacher.getAccount().getEmail());
        return map;
    }

    public Map<String, Object> assignment(Assignment assignment) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", assignment.getId().toString());
        map.put("name", assignment.getName());
        map.put("description", assignment.getDescription());
        map.put("assignment_type", assignment.getAssignmentType());
        map.put("supported_languages", splitLanguages(assignment.getSupportedLanguages()));
        map.put("testcase_samples", assignment.getTestcaseSamples());
        map.put("testcase_generation_strategy", assignment.getTestcaseGenerationStrategy());
        map.put("testcase_seed_count", assignment.getTestcaseSeedCount());
        map.put("generated_testcase_count", assignment.getGeneratedTestcaseCount());
        map.put("problem_statement", assignment.getProblemStatement());
        map.put("starter_code", assignment.getStarterCode());
        map.put("reference_solution", assignment.getReferenceSolution());
        map.put("type_config", assignment.getTypeConfig());
        map.put("start_date", iso(assignment.getStartDate()));
        map.put("end_date", iso(assignment.getEndDate()));
        map.put("is_active", assignment.isActive());
        map.put("author_id", assignment.getAuthor().getId().toString());
        map.put("author_name", assignment.getAuthor().getAccount().getName());
        return map;
    }

    public Map<String, Object> assignmentForStudent(Assignment assignment) {
        Map<String, Object> map = assignment(assignment);
        map.put("testcase_samples", publicTestcaseSamples(assignment.getTestcaseSamples()));
        map.put("reference_solution", "");
        map.put("type_config", publicTypeConfig(assignment.getTypeConfig()));
        return map;
    }

    public Map<String, Object> submission(Submission submission) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", submission.getId().toString());
        map.put("student_id", submission.getStudent().getId().toString());
        map.put("student_name", submission.getStudent().getAccount().getName());
        map.put("student_mssv", submission.getStudent().getMssv());
        map.put("assignment_id", submission.getAssignment().getId().toString());
        map.put("assignment_name", submission.getAssignment().getName());
        map.put("files", submission.getFiles());
        map.put("scores", JsonValues.normalize(submission.getScores()));
        map.put("status", submission.getStatus());
        map.put("compile_error", submission.getCompileError());
        map.put("runtime_error", submission.getRuntimeError());
        map.put("failed_outputs", submission.getFailedOutputs());
        map.put("created_at", iso(submission.getCreatedAt()));
        map.put("updated_at", iso(submission.getUpdatedAt()));
        return map;
    }

    public Map<String, Object> recommendation(Recommendation recommendation) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", recommendation.getId().toString());
        map.put("submission_id", recommendation.getSubmission().getId().toString());
        map.put("status", recommendation.getStatus());
        map.put("recommended_testcases", recommendation.getRecommendedTestcases());
        map.put("failed_testcases", recommendation.getFailedTestcases());
        map.put("is_filled_form", recommendation.isFilledForm());
        map.put("model_used", recommendation.getModelUsed());
        map.put("sampling_group", recommendation.getSamplingGroup());
        map.put("is_fallback", recommendation.getFallback());
        map.put("created_at", iso(recommendation.getCreatedAt()));
        return map;
    }

    public Map<String, Object> feedbackForm(FeedbackForm form) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", form.getId().toString());
        map.put("submission_id", form.getSubmission().getId().toString());
        map.put("list_used_tcids", form.getListUsedTcids());
        map.put("time_ordered_tcids", form.getTimeOrderedTcids());
        map.put("scores", form.getScores());
        map.put("feedback", form.getFeedback());
        map.put("created_at", iso(form.getCreatedAt()));
        return map;
    }

    private static String publicTestcaseSamples(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(value);
            if (!root.isArray()) {
                return value;
            }
            ArrayNode visible = OBJECT_MAPPER.createArrayNode();
            for (JsonNode item : root) {
                if (!isHiddenTestcase(item)) {
                    visible.add(item);
                }
            }
            return OBJECT_MAPPER.writeValueAsString(visible);
        } catch (Exception ignored) {
            return value;
        }
    }

    private static String publicTypeConfig(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(value);
            if (root.isObject()) {
                ObjectNode copy = root.deepCopy();
                JsonNode questions = copy.get("questions");
                if (questions instanceof ArrayNode questionArray) {
                    sanitizeQuestions(questionArray);
                }
                return OBJECT_MAPPER.writeValueAsString(copy);
            }
            if (root.isArray()) {
                ArrayNode copy = root.deepCopy();
                sanitizeQuestions(copy);
                return OBJECT_MAPPER.writeValueAsString(copy);
            }
            return value;
        } catch (Exception ignored) {
            return value;
        }
    }

    private static void sanitizeQuestions(ArrayNode questions) {
        for (JsonNode question : questions) {
            if (!(question instanceof ObjectNode questionObject)) {
                continue;
            }
            questionObject.put("referenceAnswer", "");
            questionObject.remove("correctOption");
            JsonNode testcases = questionObject.get("testcases");
            if (!testcases.isArray()) {
                continue;
            }
            ArrayNode visibleTestcases = OBJECT_MAPPER.createArrayNode();
            for (JsonNode testcase : testcases) {
                if (!isHiddenTestcase(testcase)) {
                    visibleTestcases.add(testcase);
                }
            }
            questionObject.set("testcases", visibleTestcases);
        }
    }

    private static boolean isHiddenTestcase(JsonNode item) {
        if (item == null || item.isNull()) {
            return false;
        }
        String visibility = item.path("visibility").asText("");
        if ("HIDDEN".equalsIgnoreCase(visibility)) {
            return true;
        }
        JsonNode hidden = item.get("hidden");
        return hidden != null && hidden.asBoolean(false);
    }

    private static String iso(Object value) {
        return value == null ? null : value.toString();
    }

    private static java.util.List<String> splitLanguages(String value) {
        if (value == null || value.isBlank()) {
            return java.util.List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }
}
