package com.trs.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.trs.backend.entity.TeacherOnAssignment;

public interface TeacherOnAssignmentRepository extends JpaRepository<TeacherOnAssignment, UUID> {
    Optional<TeacherOnAssignment> findByTeacherIdAndAssignmentId(UUID teacherId, UUID assignmentId);
}
