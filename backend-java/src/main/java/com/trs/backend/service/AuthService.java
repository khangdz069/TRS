package com.trs.backend.service;

import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.trs.backend.model.Account;
import com.trs.backend.model.Student;
import com.trs.backend.model.Teacher;
import com.trs.backend.repository.AccountRepository;
import com.trs.backend.repository.StudentRepository;
import com.trs.backend.repository.TeacherRepository;

@Service
public class AuthService {
    private final AccountRepository accountRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final Algorithm algorithm;
    private final JWTVerifier verifier;

    public AuthService(
            AccountRepository accountRepository,
            StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            @Value("${trs.jwt.secret}") String jwtSecret) {
        this.accountRepository = accountRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.algorithm = Algorithm.HMAC256(jwtSecret);
        this.verifier = JWT.require(algorithm).build();
    }

    public String generateToken(Account account) {
        Instant now = Instant.now();
        return JWT.create()
                .withClaim("account_id", account.getId().toString())
                .withClaim("email", account.getEmail())
                .withClaim("role", account.getRole())
                .withExpiresAt(Date.from(now.plusSeconds(7L * 24 * 60 * 60)))
                .sign(algorithm);
    }

    @Transactional(readOnly = true)
    public Optional<Account> verifyToken(String token) {
        try {
            String accountId = verifier.verify(token).getClaim("account_id").asString();
            return accountRepository.findByIdAndActiveTrue(UUID.fromString(accountId));
        } catch (IllegalArgumentException | JWTVerificationException ex) {
            return Optional.empty();
        }
    }

    @Transactional(readOnly = true)
    public Optional<CurrentUser> fromAuthorizationHeader(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }

        String token = authorizationHeader.substring("Bearer ".length()).trim();
        return verifyToken(token).map(account -> new CurrentUser(
                account,
                studentRepository.findByAccountId(account.getId()).orElse(null),
                teacherRepository.findByAccountId(account.getId()).orElse(null)
        ));
    }

    public boolean hasRole(CurrentUser currentUser, String role) {
        return currentUser != null && currentUser.account() != null && role.equals(currentUser.account().getRole());
    }

    public Student requireStudent(CurrentUser currentUser) {
        if (!hasRole(currentUser, "STUDENT") || currentUser.student() == null) {
            throw new IllegalStateException("Student profile not found");
        }
        return currentUser.student();
    }

    public Teacher requireTeacher(CurrentUser currentUser) {
        if (!hasRole(currentUser, "TEACHER") || currentUser.teacher() == null) {
            throw new IllegalStateException("Teacher profile not found");
        }
        return currentUser.teacher();
    }
}
