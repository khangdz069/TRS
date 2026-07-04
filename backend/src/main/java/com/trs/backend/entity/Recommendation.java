package com.trs.backend.entity;

import java.util.Arrays;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "recommendations")
public class Recommendation extends BaseEntity {
    private static final int STATUS_PENDING = 0;
    private static final int STATUS_READY = 1;
    private static final int STATUS_NO_TESTCASE = 2;
    private static final int STATUS_DAILY_LIMIT_REACHED = 3;
    private static final int STATUS_PREVIOUS_TESTCASE_NOT_COMPLETED = 4;
    private static final int STATUS_FAILED = 5;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private Submission submission;

    @Column(nullable = false)
    private int status = STATUS_PENDING;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "list_testcase_id", nullable = false, columnDefinition = "integer[]")
    private Integer[] listTestcaseId = new Integer[0];

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "list_false_tcids", nullable = false, columnDefinition = "integer[]")
    private Integer[] listFalseTcids = new Integer[0];

    @Column(name = "is_filled_form", nullable = false)
    private boolean filledForm = false;

    @Transient
    private String modelUsed;

    @Transient
    private String samplingGroup;

    @Transient
    private Boolean fallback;

    public Submission getSubmission() {
        return submission;
    }

    public void setSubmission(Submission submission) {
        this.submission = submission;
    }

    public String getStatus() {
        return statusName(status);
    }

    public void setStatus(String status) {
        this.status = statusCode(status);
    }

    public int getStatusCode() {
        return status;
    }

    public void setStatusCode(int status) {
        this.status = status;
    }

    public List<Integer> getRecommendedTestcases() {
        return listTestcaseId == null ? List.of() : Arrays.asList(listTestcaseId);
    }

    public void setRecommendedTestcases(List<Integer> recommendedTestcases) {
        this.listTestcaseId = toIntegerArray(recommendedTestcases);
    }

    public List<Integer> getFailedTestcases() {
        return listFalseTcids == null ? List.of() : Arrays.asList(listFalseTcids);
    }

    public void setFailedTestcases(List<Integer> failedTestcases) {
        this.listFalseTcids = toIntegerArray(failedTestcases);
    }

    public boolean isFilledForm() {
        return filledForm;
    }

    public void setFilledForm(boolean filledForm) {
        this.filledForm = filledForm;
    }

    public String getModelUsed() {
        return modelUsed;
    }

    public void setModelUsed(String modelUsed) {
        this.modelUsed = modelUsed;
    }

    public String getSamplingGroup() {
        return samplingGroup;
    }

    public void setSamplingGroup(String samplingGroup) {
        this.samplingGroup = samplingGroup;
    }

    public Boolean getFallback() {
        return fallback;
    }

    public void setFallback(Boolean fallback) {
        this.fallback = fallback;
    }

    private static Integer[] toIntegerArray(List<Integer> values) {
        if (values == null) {
            return new Integer[0];
        }
        return values.stream().filter(value -> value != null).toArray(Integer[]::new);
    }

    private static int statusCode(String value) {
        return switch (value == null ? "" : value) {
            case "READY" -> STATUS_READY;
            case "NO_TESTCASE" -> STATUS_NO_TESTCASE;
            case "DAILY_LIMIT_REACHED" -> STATUS_DAILY_LIMIT_REACHED;
            case "PREVIOUS_TESTCASE_NOT_COMPLETED" -> STATUS_PREVIOUS_TESTCASE_NOT_COMPLETED;
            case "FAILED" -> STATUS_FAILED;
            default -> STATUS_PENDING;
        };
    }

    private static String statusName(int value) {
        return switch (value) {
            case STATUS_READY -> "READY";
            case STATUS_NO_TESTCASE -> "NO_TESTCASE";
            case STATUS_DAILY_LIMIT_REACHED -> "DAILY_LIMIT_REACHED";
            case STATUS_PREVIOUS_TESTCASE_NOT_COMPLETED -> "PREVIOUS_TESTCASE_NOT_COMPLETED";
            case STATUS_FAILED -> "FAILED";
            default -> "PENDING";
        };
    }
}
