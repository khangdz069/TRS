package com.trs.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.trs.backend.entity.MatrixFactorization;

public interface MatrixFactorizationRepository extends JpaRepository<MatrixFactorization, UUID> {
    List<MatrixFactorization> findByAssignmentId(UUID assignmentId);
}
