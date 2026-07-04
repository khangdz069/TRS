package com.trs.backend.model;

import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "recommendations")
public class Recommendation extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private Submission submission;

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recommended_testcases", nullable = false, columnDefinition = "json")
    private List<Integer> recommendedTestcases = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "failed_testcases", nullable = false, columnDefinition = "json")
    private List<Integer> failedTestcases = new ArrayList<>();

    @Column(name = "is_filled_form", nullable = false)
    private boolean filledForm = false;

    @Column(name = "model_used", length = 50)
    private String modelUsed;

    @Column(name = "sampling_group", length = 50)
    private String samplingGroup;

    @Column(name = "is_fallback")
    private Boolean fallback;

    public Submission getSubmission() {
        return submission;
    }

    public void setSubmission(Submission submission) {
        this.submission = submission;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<Integer> getRecommendedTestcases() {
        return recommendedTestcases;
    }

    public void setRecommendedTestcases(List<Integer> recommendedTestcases) {
        this.recommendedTestcases = recommendedTestcases;
    }

    public List<Integer> getFailedTestcases() {
        return failedTestcases;
    }

    public void setFailedTestcases(List<Integer> failedTestcases) {
        this.failedTestcases = failedTestcases;
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
}
