package com.trs.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.trs.backend.model.Account;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByEmail(String email);

    Optional<Account> findByIdAndActiveTrue(UUID id);
}
