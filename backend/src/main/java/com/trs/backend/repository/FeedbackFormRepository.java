package com.trs.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.trs.backend.entity.FeedbackForm;

public interface FeedbackFormRepository extends JpaRepository<FeedbackForm, UUID> {
    Optional<FeedbackForm> findBySubmissionId(UUID submissionId);

    @Query("""
            select f from FeedbackForm f
            where f.submission.assignment.id = :assignmentId
            order by f.createdAt desc
            """)
    List<FeedbackForm> findByAssignmentId(@Param("assignmentId") UUID assignmentId);
}
