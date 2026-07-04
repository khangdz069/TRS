package com.trs.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.trs.backend.model.Teacher;

public interface TeacherRepository extends JpaRepository<Teacher, UUID> {
    Optional<Teacher> findByAccountId(UUID accountId);
}
