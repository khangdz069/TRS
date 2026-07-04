package com.trs.backend.entity;

import java.util.Arrays;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "matrixfactorizations")
public class MatrixFactorization extends BaseEntity {
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "list_student_ids", nullable = false, columnDefinition = "varchar[]")
    private String[] listStudentIds = new String[0];

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "list_testcase_ids", nullable = false, columnDefinition = "integer[]")
    private Integer[] listTestcaseIds = new Integer[0];

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @Column(name = "model_name", nullable = false, length = 255)
    private String modelName;

    @Column(name = "matrix_npz_path", nullable = false, length = 1024)
    private String matrixNpzPath;

    public List<String> getListStudentIds() {
        return listStudentIds == null ? List.of() : Arrays.asList(listStudentIds);
    }

    public void setListStudentIds(List<String> listStudentIds) {
        this.listStudentIds = listStudentIds == null
                ? new String[0]
                : listStudentIds.stream().filter(value -> value != null && !value.isBlank()).toArray(String[]::new);
    }

    public List<Integer> getListTestcaseIds() {
        return listTestcaseIds == null ? List.of() : Arrays.asList(listTestcaseIds);
    }

    public void setListTestcaseIds(List<Integer> listTestcaseIds) {
        this.listTestcaseIds = listTestcaseIds == null
                ? new Integer[0]
                : listTestcaseIds.stream().filter(value -> value != null).toArray(Integer[]::new);
    }

    public Assignment getAssignment() {
        return assignment;
    }

    public void setAssignment(Assignment assignment) {
        this.assignment = assignment;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getMatrixNpzPath() {
        return matrixNpzPath;
    }

    public void setMatrixNpzPath(String matrixNpzPath) {
        this.matrixNpzPath = matrixNpzPath;
    }
}
