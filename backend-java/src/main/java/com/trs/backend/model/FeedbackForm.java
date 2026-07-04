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
@Table(name = "feedback_forms")
public class FeedbackForm extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private Submission submission;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "list_used_tcids", columnDefinition = "json")
    private List<Integer> listUsedTcids = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "time_ordered_tcids", columnDefinition = "json")
    private List<Integer> timeOrderedTcids = new ArrayList<>();

    @Column(nullable = false)
    private int scores;

    @Column(columnDefinition = "text")
    private String feedback;

    public Submission getSubmission() {
        return submission;
    }

    public void setSubmission(Submission submission) {
        this.submission = submission;
    }

    public List<Integer> getListUsedTcids() {
        return listUsedTcids;
    }

    public void setListUsedTcids(List<Integer> listUsedTcids) {
        this.listUsedTcids = listUsedTcids;
    }

    public List<Integer> getTimeOrderedTcids() {
        return timeOrderedTcids;
    }

    public void setTimeOrderedTcids(List<Integer> timeOrderedTcids) {
        this.timeOrderedTcids = timeOrderedTcids;
    }

    public int getScores() {
        return scores;
    }

    public void setScores(int scores) {
        this.scores = scores;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }
}
