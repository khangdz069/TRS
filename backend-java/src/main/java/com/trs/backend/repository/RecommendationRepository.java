package com.trs.backend.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.trs.backend.model.Recommendation;

public interface RecommendationRepository extends JpaRepository<Recommendation, UUID> {
    Optional<Recommendation> findBySubmissionId(UUID submissionId);

    @Query("""
            select count(r) from Recommendation r
            where r.submission.student.id = :studentId
              and r.status = 'READY'
              and r.createdAt >= :startOfDay
            """)
    long countReadyForStudentSince(@Param("studentId") UUID studentId, @Param("startOfDay") OffsetDateTime startOfDay);

    @Query("""
            select r from Recommendation r
            where r.submission.student.id = :studentId
              and r.submission.assignment.id = :assignmentId
              and r.submission.id <> :submissionId
              and r.status = :status
            order by r.createdAt desc
            """)
    List<Recommendation> findPreviousReadyRecommendations(
            @Param("studentId") UUID studentId,
            @Param("assignmentId") UUID assignmentId,
            @Param("submissionId") UUID submissionId,
            @Param("status") String status,
            Pageable pageable);
}
