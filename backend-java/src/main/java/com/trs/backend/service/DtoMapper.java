package com.trs.backend.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.trs.backend.model.Account;
import com.trs.backend.model.Assignment;
import com.trs.backend.model.FeedbackForm;
import com.trs.backend.model.Recommendation;
import com.trs.backend.model.Student;
import com.trs.backend.model.Submission;
import com.trs.backend.model.Teacher;

@Component
public class DtoMapper {
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
        map.put("start_date", iso(assignment.getStartDate()));
        map.put("end_date", iso(assignment.getEndDate()));
        map.put("is_active", assignment.isActive());
        map.put("author_id", assignment.getAuthor().getId().toString());
        map.put("author_name", assignment.getAuthor().getAccount().getName());
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

    private static String iso(Object value) {
        return value == null ? null : value.toString();
    }
}
