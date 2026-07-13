package com.trs.backend.controller;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.trs.backend.entity.Account;
import com.trs.backend.entity.Assignment;
import com.trs.backend.entity.Student;
import com.trs.backend.entity.StudentOnAssignment;
import com.trs.backend.repository.AccountRepository;
import com.trs.backend.repository.AssignmentRepository;
import com.trs.backend.repository.StudentOnAssignmentRepository;
import com.trs.backend.repository.StudentRepository;
import com.trs.backend.service.AuthService;
import com.trs.backend.service.CurrentUser;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final AccountRepository accountRepository;
    private final AssignmentRepository assignmentRepository;
    private final StudentRepository studentRepository;
    private final StudentOnAssignmentRepository studentOnAssignmentRepository;
    private final AuthService authService;

    public StudentController(
            AccountRepository accountRepository,
            AssignmentRepository assignmentRepository,
            StudentRepository studentRepository,
            StudentOnAssignmentRepository studentOnAssignmentRepository,
            AuthService authService) {
        this.accountRepository = accountRepository;
        this.assignmentRepository = assignmentRepository;
        this.studentRepository = studentRepository;
        this.studentOnAssignmentRepository = studentOnAssignmentRepository;
        this.authService = authService;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> addStudent(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, String> body) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (!authService.hasRole(currentUser, "TEACHER")) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }

        String assignmentIdValue = body.getOrDefault("assignment_id", "");
        String mssv = cleanMssv(body.get("mssv"));
        String email = body.getOrDefault("email", "").trim();
        String name = body.getOrDefault("name", "").trim();
        String classSection = body.getOrDefault("class_section", "").trim();

        if (assignmentIdValue.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "assignment_id is required"));
        }
        if (mssv == null || mssv.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "MSSV is required"));
        }
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (!email.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is invalid"));
        }
        if (name.isBlank()) {
            name = email.substring(0, email.indexOf('@'));
        }
        if (classSection.isBlank()) {
            classSection = "Default";
        }

        UUID assignmentId;
        try {
            assignmentId = UUID.fromString(assignmentIdValue);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }

        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }

        Student student = ensureStudent(mssv, email, name);
        StudentOnAssignment registration = studentOnAssignmentRepository
                .findByStudentIdAndAssignmentId(student.getId(), assignment.getId())
                .orElse(null);
        boolean created = registration == null;
        if (registration == null) {
            registration = new StudentOnAssignment();
            registration.setStudent(student);
            registration.setAssignment(assignment);
        }
        registration.setClassSection(classSection);
        registration.setActive(true);
        studentOnAssignmentRepository.save(registration);

        return ResponseEntity.ok(Map.of(
                "message", created
                        ? "Student registered to " + classSection
                        : "Student already existed and was updated in " + classSection,
                "student_id", student.getId().toString(),
                "class_section", classSection,
                "created", created
        ));
    }

    @PostMapping("/import")
    @Transactional
    public ResponseEntity<?> importStudents(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "assignment_id", required = false) String assignmentIdValue,
            @RequestParam(value = "class_section", required = false) String classSectionValue,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (!authService.hasRole(currentUser, "TEACHER")) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }
        if (assignmentIdValue == null || assignmentIdValue.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "assignment_id is required"));
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded"));
        }

        UUID assignmentId;
        try {
            assignmentId = UUID.fromString(assignmentIdValue);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }

        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }
        String classSection = classSectionValue == null || classSectionValue.isBlank()
                ? "Default"
                : classSectionValue.trim();

        List<Map<String, String>> rows;
        try {
            rows = readRows(file);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to read file: " + ex.getMessage()));
        }

        if (rows.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not identify MSSV or Email columns in the uploaded file"));
        }

        int importedCount = 0;
        List<String> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            try {
                Map<String, String> row = rows.get(i);
                String mssv = cleanMssv(firstValue(row, "mssv", "id number", "mã sinh viên", "ma sinh vien"));
                String email = firstValue(row, "email", "thư điện tử", "thu dien tu", "address");
                String name = firstValue(row, "name", "họ tên", "họ và tên", "ho ten", "ho va ten", "fullname");

                if (mssv == null || mssv.isBlank()) {
                    mssv = cleanMssv(valueByIndex(row, 0));
                }
                if (name == null || name.isBlank()) {
                    name = valueByIndex(row, 1);
                }
                if (email == null || email.isBlank()) {
                    email = valueByIndex(row, 2);
                }
                if (mssv == null || email == null || mssv.isBlank() || email.isBlank() || "nan".equalsIgnoreCase(mssv)) {
                    continue;
                }
                if (name == null || name.isBlank()) {
                    name = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
                }

                Student student = ensureStudent(mssv, email.trim(), name.trim());
                StudentOnAssignment registration = studentOnAssignmentRepository
                        .findByStudentIdAndAssignmentId(student.getId(), assignment.getId())
                        .orElse(null);
                if (registration == null) {
                    registration = new StudentOnAssignment();
                    registration.setStudent(student);
                    registration.setAssignment(assignment);
                    registration.setClassSection(classSection);
                    studentOnAssignmentRepository.save(registration);
                } else {
                    registration.setClassSection(classSection);
                    registration.setActive(true);
                    studentOnAssignmentRepository.save(registration);
                }
                importedCount++;
            } catch (Exception ex) {
                errors.add("Row " + (i + 2) + ": " + ex.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Successfully registered " + importedCount + " students to " + classSection + " in assignment " + assignment.getName(),
                "imported_count", importedCount,
                "class_section", classSection,
                "errors", errors
        ));
    }

    private Student ensureStudent(String mssv, String email, String name) {
        Account account = accountRepository.findByEmail(email).orElseGet(() -> {
            Account created = new Account();
            created.setEmail(email);
            created.setName(name);
            created.setRole("STUDENT");
            return accountRepository.saveAndFlush(created);
        });

        return studentRepository.findByAccountId(account.getId())
                .or(() -> studentRepository.findByMssv(mssv))
                .orElseGet(() -> {
                    Student created = new Student();
                    created.setAccount(account);
                    created.setMssv(mssv);
                    return studentRepository.saveAndFlush(created);
                });
    }

    private static List<Map<String, String>> readRows(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (filename.endsWith(".csv")) {
            return readCsv(file);
        }
        if (filename.endsWith(".xls") || filename.endsWith(".xlsx")) {
            return readExcel(file);
        }
        throw new IllegalArgumentException("Only CSV and Excel files are supported");
    }

    private static List<Map<String, String>> readCsv(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setTrim(true)
                .build();
        try (CSVParser parser = new CSVParser(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8), format)) {
            for (CSVRecord record : parser) {
                Map<String, String> row = new LinkedHashMap<>();
                parser.getHeaderNames().forEach(header -> row.put(header, record.get(header)));
                rows.add(row);
            }
        }
        return rows;
    }

    private static List<Map<String, String>> readExcel(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                return rows;
            }
            List<String> headers = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headers.add(formatter.formatCellValue(headerRow.getCell(i)));
            }
            for (int rowIndex = sheet.getFirstRowNum() + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row rowData = sheet.getRow(rowIndex);
                if (rowData == null) {
                    continue;
                }
                Map<String, String> row = new LinkedHashMap<>();
                for (int i = 0; i < headers.size(); i++) {
                    row.put(headers.get(i), formatter.formatCellValue(rowData.getCell(i)));
                }
                rows.add(row);
            }
        }
        return rows;
    }

    private static String firstValue(Map<String, String> row, String... candidates) {
        Map<String, String> normalized = new LinkedHashMap<>();
        row.forEach((key, value) -> normalized.put(normalizeHeader(key), value));
        for (String candidate : candidates) {
            String value = normalized.get(normalizeHeader(candidate));
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        for (Map.Entry<String, String> entry : normalized.entrySet()) {
            for (String candidate : candidates) {
                if (entry.getKey().contains(normalizeHeader(candidate)) && entry.getValue() != null && !entry.getValue().isBlank()) {
                    return entry.getValue().trim();
                }
            }
        }
        return null;
    }

    private static String valueByIndex(Map<String, String> row, int index) {
        if (row.size() <= index) {
            return null;
        }
        return new ArrayList<>(row.values()).get(index);
    }

    private static String normalizeHeader(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
    }

    private static String cleanMssv(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        int dot = cleaned.indexOf('.');
        return dot >= 0 ? cleaned.substring(0, dot) : cleaned;
    }
}
