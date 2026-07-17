package com.trs.backend.entity;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "assignments")
public class Assignment extends BaseEntity {
    @Column(nullable = false, unique = true, length = 255)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "assignment_type", nullable = false, length = 50)
    private String assignmentType = "STANDARD";

    @Column(name = "supported_languages", columnDefinition = "text")
    private String supportedLanguages = "c";

    @Column(name = "testcase_samples", columnDefinition = "text")
    private String testcaseSamples = "";

    @Column(name = "testcase_generation_strategy", nullable = false, length = 50)
    private String testcaseGenerationStrategy = "MUTATION";

    @Column(name = "testcase_seed_count", nullable = false)
    private Integer testcaseSeedCount = 0;

    @Column(name = "generated_testcase_count", nullable = false)
    private Integer generatedTestcaseCount = 0;

    @Column(name = "problem_statement", columnDefinition = "text")
    private String problemStatement = "";

    @Column(name = "starter_code", columnDefinition = "text")
    private String starterCode = "";

    @Column(name = "reference_solution", columnDefinition = "text")
    private String referenceSolution = "";

    @Column(name = "type_config", columnDefinition = "text")
    private String typeConfig = "";

    @Column(name = "start_date", nullable = false)
    private OffsetDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private OffsetDateTime endDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private Teacher author;

    @OneToMany(mappedBy = "assignment", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Submission> submissions = new ArrayList<>();

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAssignmentType() {
        return assignmentType;
    }

    public void setAssignmentType(String assignmentType) {
        this.assignmentType = assignmentType;
    }

    public String getSupportedLanguages() {
        return supportedLanguages;
    }

    public void setSupportedLanguages(String supportedLanguages) {
        this.supportedLanguages = supportedLanguages;
    }

    public String getTestcaseSamples() {
        return testcaseSamples;
    }

    public void setTestcaseSamples(String testcaseSamples) {
        this.testcaseSamples = testcaseSamples;
    }

    public String getTestcaseGenerationStrategy() {
        return testcaseGenerationStrategy;
    }

    public void setTestcaseGenerationStrategy(String testcaseGenerationStrategy) {
        this.testcaseGenerationStrategy = testcaseGenerationStrategy;
    }

    public Integer getTestcaseSeedCount() {
        return testcaseSeedCount;
    }

    public void setTestcaseSeedCount(Integer testcaseSeedCount) {
        this.testcaseSeedCount = testcaseSeedCount;
    }

    public Integer getGeneratedTestcaseCount() {
        return generatedTestcaseCount;
    }

    public void setGeneratedTestcaseCount(Integer generatedTestcaseCount) {
        this.generatedTestcaseCount = generatedTestcaseCount;
    }

    public String getProblemStatement() {
        return problemStatement;
    }

    public void setProblemStatement(String problemStatement) {
        this.problemStatement = problemStatement;
    }

    public String getStarterCode() {
        return starterCode;
    }

    public void setStarterCode(String starterCode) {
        this.starterCode = starterCode;
    }

    public String getReferenceSolution() {
        return referenceSolution;
    }

    public void setReferenceSolution(String referenceSolution) {
        this.referenceSolution = referenceSolution;
    }

    public String getTypeConfig() {
        return typeConfig;
    }

    public void setTypeConfig(String typeConfig) {
        this.typeConfig = typeConfig;
    }

    public OffsetDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(OffsetDateTime startDate) {
        this.startDate = startDate;
    }

    public OffsetDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(OffsetDateTime endDate) {
        this.endDate = endDate;
    }

    public Teacher getAuthor() {
        return author;
    }

    public void setAuthor(Teacher author) {
        this.author = author;
    }

    public List<Submission> getSubmissions() {
        return submissions;
    }

    public void setSubmissions(List<Submission> submissions) {
        this.submissions = submissions;
    }
}
