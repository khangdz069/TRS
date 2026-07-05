package com.trs.backend.repository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.trs.backend.entity.StudentOnAssignment;

public interface StudentOnAssignmentRepository extends JpaRepository<StudentOnAssignment, UUID> {
    Optional<StudentOnAssignment> findByStudentIdAndAssignmentId(UUID studentId, UUID assignmentId);

    Optional<StudentOnAssignment> findByStudentIdAndAssignmentIdAndActiveTrue(UUID studentId, UUID assignmentId);

    @Query("""
            select soa from StudentOnAssignment soa
            join fetch soa.student s
            join fetch s.account
            where soa.assignment.id = :assignmentId and soa.active = true
            order by soa.classSection asc, s.mssv asc
            """)
    List<StudentOnAssignment> findActiveRosterByAssignmentId(@Param("assignmentId") UUID assignmentId);
}
