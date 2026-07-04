package com.trs.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.trs.backend.entity.Submission;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    List<Submission> findByAssignmentIdOrderByCreatedAtDesc(UUID assignmentId);

    List<Submission> findByAssignmentIdAndStudentIdOrderByCreatedAtDesc(UUID assignmentId, UUID studentId);

    Optional<Submission> findByIdAndStudentId(UUID id, UUID studentId);
}
