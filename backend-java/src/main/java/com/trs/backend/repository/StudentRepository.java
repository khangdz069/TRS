package com.trs.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.trs.backend.model.Student;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    Optional<Student> findByAccountId(UUID accountId);

    Optional<Student> findByMssv(String mssv);

    @Query("""
            select s from Student s
            join StudentOnAssignment soa on soa.student = s
            where soa.assignment.id = :assignmentId and soa.active = true
            order by s.mssv asc
            """)
    List<Student> findActiveByAssignmentId(@Param("assignmentId") UUID assignmentId);
}
