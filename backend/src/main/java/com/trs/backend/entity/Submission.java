package com.trs.backend.entity;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "submissions")
public class Submission extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "varchar[]")
    private String[] files = new String[0];

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "boolean[]")
    private Boolean[] scores = new Boolean[0];

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @Transient
    private String compileError;

    @Transient
    private String runtimeError;

    @Transient
    private Map<String, Object> failedOutputs = new LinkedHashMap<>();

    @OneToOne(mappedBy = "submission", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private Recommendation recommendation;

    @OneToOne(mappedBy = "submission", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private FeedbackForm form;

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public Assignment getAssignment() {
        return assignment;
    }

    public void setAssignment(Assignment assignment) {
        this.assignment = assignment;
    }

    public List<Map<String, Object>> getFiles() {
        List<Map<String, Object>> savedFiles = new ArrayList<>();
        for (String path : files == null ? new String[0] : files) {
            Map<String, Object> file = new LinkedHashMap<>();
            file.put("filename", filenameFromPath(path));
            file.put("path", path);
            savedFiles.add(file);
        }
        return savedFiles;
    }

    public void setFiles(List<Map<String, Object>> files) {
        if (files == null) {
            this.files = new String[0];
            return;
        }
        this.files = files.stream()
                .map(file -> file == null ? "" : String.valueOf(file.getOrDefault("path", file.getOrDefault("filename", ""))))
                .filter(path -> path != null && !path.isBlank())
                .toArray(String[]::new);
    }

    public Object getScores() {
        return scores == null ? List.of() : Arrays.asList(scores);
    }

    public void setScores(Object scores) {
        this.scores = toBooleanArray(scores);
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCompileError() {
        return compileError;
    }

    public void setCompileError(String compileError) {
        this.compileError = compileError;
    }

    public String getRuntimeError() {
        return runtimeError;
    }

    public void setRuntimeError(String runtimeError) {
        this.runtimeError = runtimeError;
    }

    public Map<String, Object> getFailedOutputs() {
        return failedOutputs;
    }

    public void setFailedOutputs(Map<String, Object> failedOutputs) {
        this.failedOutputs = failedOutputs;
    }

    public Recommendation getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(Recommendation recommendation) {
        this.recommendation = recommendation;
    }

    public FeedbackForm getForm() {
        return form;
    }

    public void setForm(FeedbackForm form) {
        this.form = form;
    }

    private static Boolean[] toBooleanArray(Object value) {
        if (value == null) {
            return new Boolean[0];
        }
        if (value instanceof Boolean[] booleans) {
            return booleans;
        }
        if (value instanceof boolean[] booleans) {
            Boolean[] boxed = new Boolean[booleans.length];
            for (int i = 0; i < booleans.length; i++) {
                boxed[i] = booleans[i];
            }
            return boxed;
        }
        if (value instanceof List<?> list) {
            return list.stream().map(Submission::toBoolean).toArray(Boolean[]::new);
        }
        if (value instanceof Map<?, ?> map) {
            return map.values().stream().map(Submission::toBoolean).toArray(Boolean[]::new);
        }
        if (value instanceof String text && !text.isBlank()) {
            String normalized = text.replace("[", "").replace("]", "");
            if (normalized.isBlank()) {
                return new Boolean[0];
            }
            return Arrays.stream(normalized.split(","))
                    .map(String::trim)
                    .map(Submission::toBoolean)
                    .toArray(Boolean[]::new);
        }
        return new Boolean[0];
    }

    private static Boolean toBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private static String filenameFromPath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        String normalized = path.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        return slash >= 0 ? normalized.substring(slash + 1) : normalized;
    }
}
