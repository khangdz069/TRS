package com.trs.backend.service;

import com.trs.backend.model.Account;
import com.trs.backend.model.Student;
import com.trs.backend.model.Teacher;

public record CurrentUser(
        Account account,
        Student student,
        Teacher teacher
) {
}
