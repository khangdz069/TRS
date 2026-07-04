package com.trs.backend.service;

import com.trs.backend.entity.Account;
import com.trs.backend.entity.Student;
import com.trs.backend.entity.Teacher;

public record CurrentUser(
        Account account,
        Student student,
        Teacher teacher
) {
}
