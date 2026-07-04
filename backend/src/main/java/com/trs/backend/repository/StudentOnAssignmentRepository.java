package com.trs.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.trs.backend.entity.StudentOnAssignment;

public interface StudentOnAssignmentRepository extends JpaRepository<StudentOnAssignment, UUID> {
    Optional<StudentOnAssignment> findByStudentIdAndAssignmentId(UUID studentId, UUID assignmentId);

    Optional<StudentOnAssignment> findByStudentIdAndAssignmentIdAndActiveTrue(UUID studentId, UUID assignmentId);
}
