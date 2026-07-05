package com.trs.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.trs.backend.entity.Assignment;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    Optional<Assignment> findByName(String name);

    List<Assignment> findByAuthorIdOrderByCreatedAtDesc(UUID authorId);

    List<Assignment> findByAuthorIdAndActiveTrueOrderByCreatedAtDesc(UUID authorId);

    @Query("""
            select a from Assignment a
            join StudentOnAssignment soa on soa.assignment = a
            where soa.student.id = :studentId and soa.active = true
            order by a.createdAt desc
            """)
    List<Assignment> findActiveByStudentId(@Param("studentId") UUID studentId);
}
