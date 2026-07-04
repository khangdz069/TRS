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

@Entity
@Table(name = "forms")
public class FeedbackForm extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private Submission submission;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "list_used_tcids", columnDefinition = "integer[]")
    private Integer[] listUsedTcids = new Integer[0];

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "time_ordered_tcids", columnDefinition = "integer[]")
    private Integer[] timeOrderedTcids = new Integer[0];

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
        return listUsedTcids == null ? List.of() : Arrays.asList(listUsedTcids);
    }

    public void setListUsedTcids(List<Integer> listUsedTcids) {
        this.listUsedTcids = toIntegerArray(listUsedTcids);
    }

    public List<Integer> getTimeOrderedTcids() {
        return timeOrderedTcids == null ? List.of() : Arrays.asList(timeOrderedTcids);
    }

    public void setTimeOrderedTcids(List<Integer> timeOrderedTcids) {
        this.timeOrderedTcids = toIntegerArray(timeOrderedTcids);
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

    private static Integer[] toIntegerArray(List<Integer> values) {
        if (values == null) {
            return new Integer[0];
        }
        return values.stream().filter(value -> value != null).toArray(Integer[]::new);
    }
}
