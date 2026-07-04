package com.trs.backend.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.trs.backend.dto.LoginRequest;
import com.trs.backend.model.Account;
import com.trs.backend.model.Student;
import com.trs.backend.model.Teacher;
import com.trs.backend.repository.AccountRepository;
import com.trs.backend.repository.StudentRepository;
import com.trs.backend.repository.TeacherRepository;
import com.trs.backend.service.AuthService;
import com.trs.backend.service.CurrentUser;
import com.trs.backend.service.DtoMapper;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Pattern FIRST_NUMBER = Pattern.compile("\\d+");

    private final AccountRepository accountRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final AuthService authService;
    private final DtoMapper mapper;

    public AuthController(
            AccountRepository accountRepository,
            StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            AuthService authService,
            DtoMapper mapper) {
        this.accountRepository = accountRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.authService = authService;
        this.mapper = mapper;
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<?> login(@RequestBody(required = false) LoginRequest request) {
        String email = request == null ? null : request.email();
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        String normalizedEmail = email.trim();
        String name = request.name();

        Account account = accountRepository.findByEmail(normalizedEmail).orElseGet(() -> createAccount(normalizedEmail, name));
        String token = authService.generateToken(account);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("account", mapper.account(account));

        if ("STUDENT".equals(account.getRole())) {
            studentRepository.findByAccountId(account.getId())
                    .ifPresent(student -> response.put("student", mapper.student(student)));
        } else {
            teacherRepository.findByAccountId(account.getId())
                    .ifPresent(teacher -> response.put("teacher", mapper.teacher(teacher)));
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return authService.fromAuthorizationHeader(authorization)
                .<ResponseEntity<?>>map(this::meResponse)
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token")));
    }

    private Account createAccount(String email, String providedName) {
        String role = email.endsWith("@hust.edu.vn") ? "TEACHER" : "STUDENT";
        int atIndex = email.indexOf('@');
        String name = providedName == null || providedName.isBlank()
                ? (atIndex >= 0 ? email.substring(0, atIndex) : email).replace('.', ' ')
                : providedName.trim();

        Account account = new Account();
        account.setEmail(email);
        account.setName(titleCase(name));
        account.setRole(role);
        accountRepository.saveAndFlush(account);

        if ("TEACHER".equals(role)) {
            Teacher teacher = new Teacher();
            teacher.setAccount(account);
            teacherRepository.save(teacher);
        } else {
            Student student = new Student();
            student.setAccount(account);
            student.setMssv(extractMssv(email));
            studentRepository.save(student);
        }

        return account;
    }

    private ResponseEntity<?> meResponse(CurrentUser currentUser) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("account", mapper.account(currentUser.account()));
        if ("STUDENT".equals(currentUser.account().getRole()) && currentUser.student() != null) {
            response.put("student", mapper.student(currentUser.student()));
        }
        if ("TEACHER".equals(currentUser.account().getRole()) && currentUser.teacher() != null) {
            response.put("teacher", mapper.teacher(currentUser.teacher()));
        }
        return ResponseEntity.ok(response);
    }

    private static String extractMssv(String email) {
        Matcher matcher = FIRST_NUMBER.matcher(email);
        return matcher.find() ? matcher.group() : "20239999";
    }

    private static String titleCase(String value) {
        String[] parts = value.trim().split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) {
                builder.append(part.substring(1));
            }
        }
        return builder.isEmpty() ? value : builder.toString();
    }
}
