# TRS Rebuild - Ban Do Project

File nay giup doc project theo luong nguoi dung truoc, roi moi di vao code.

## Project La Gi?

TRS Rebuild la he thong prototype cho bai toan:

```text
Sinh vien nop code C++ -> he thong cham testcase -> he thong goi y vai testcase nen xem lai
```

Vai tro chinh:

- Teacher tao assignment, import danh sach sinh vien va xem analytics feedback.
- Student xem assignment, nop code, xem lich su cham, xem testcase duoc goi y va gui feedback.
- Backend Java dieu phoi du lieu, goi grader va luu ket qua.
- Grader Java compile/chay code C++ qua bo testcase.
- Recommendation service chon toi da 3 testcase fail de goi y.

## Bon Khoi Chay Chinh

```text
frontend/      -> Next.js UI, http://localhost:3100
backend-java/  -> Spring Boot API, http://localhost:5102
grader-java/   -> Spring Boot C++ grader, http://localhost:5103
database       -> PostgreSQL, localhost:55432
```

Nguoi dung chi can mo frontend o `http://localhost:3100`.

## Luong Nguoi Dung

```text
1. Login
2. Teacher tao assignment
3. Teacher import sinh vien
4. Student xem assignment
5. Student nop code
6. Backend Java gui code sang grader Java
7. Grader Java compile va chay testcase
8. Backend Java luu submission va scores
9. Recommendation service chon testcase fail de goi y
10. Student xem goi y va gui feedback
```

## File Theo Man Hinh

Login:

```text
frontend/src/app/login/page.tsx
backend-java/src/main/java/com/trs/backend/controller/AuthController.java
backend-java/src/main/java/com/trs/backend/service/AuthService.java
```

Teacher:

```text
frontend/src/app/teacher/page.tsx
backend-java/src/main/java/com/trs/backend/controller/AssignmentController.java
backend-java/src/main/java/com/trs/backend/controller/StudentController.java
backend-java/src/main/java/com/trs/backend/controller/FormController.java
```

Student:

```text
frontend/src/app/student/page.tsx
backend-java/src/main/java/com/trs/backend/controller/SubmissionController.java
backend-java/src/main/java/com/trs/backend/controller/RecommendationController.java
backend-java/src/main/java/com/trs/backend/controller/FormController.java
```

## Luong Nop Bai Quan Trong Nhat

```text
frontend/src/app/student/page.tsx
        |
        | POST /api/submissions
        v
backend-java/src/main/java/com/trs/backend/controller/SubmissionController.java
        |
        v
backend-java/src/main/java/com/trs/backend/service/SubmissionService.java
        |
        | POST sang grader /api/grader
        v
grader-java/src/main/java/com/trs/grader/GraderController.java
        |
        v
grader-java/src/main/java/com/trs/grader/GraderService.java
        |
        | tra ve scores, failed_outputs
        v
backend-java luu Submission
        |
        v
backend-java/src/main/java/com/trs/backend/service/RecommendationService.java
```

Neu chi doc mot luong truoc khi bao cao hoac debug, hay doc luong nay.

## Recommendation

File can doc:

```text
backend-java/src/main/java/com/trs/backend/service/RecommendationService.java
backend-java/src/main/java/com/trs/backend/model/Recommendation.java
backend-java/src/main/java/com/trs/backend/repository/RecommendationRepository.java
```

Y tuong hien tai:

- Lay danh sach testcase fail cua submission.
- Neu sinh vien chua sua testcase goi y lan truoc thi tiep tuc tra lai goi y cu.
- Neu da qua gioi han trong ngay thi tra ve `DAILY_LIMIT_REACHED`.
- Neu co testcase fail moi thi chon toi da 3 testcase fail dau tien.
- Danh dau `Fallback (Simple Java)` vi pipeline train RSVD/NumPy cu chua duoc port sang Java.

## Grader

File can doc:

```text
grader-java/src/main/java/com/trs/grader/GraderController.java
grader-java/src/main/java/com/trs/grader/GraderService.java
grader-java/assets/support-files/
grader-java/assets/expected_outputs/
```

Grader lam cac viec chinh:

- Nhan code sinh vien.
- Ghep voi file ho tro chinh thuc.
- Compile bang `g++`.
- Chay bo testcase.
- So sanh output thuc te voi expected output.
- Tra ve pass/fail va loi cho backend.

## Database

Entity nam trong:

```text
backend-java/src/main/java/com/trs/backend/model/
```

Repository nam trong:

```text
backend-java/src/main/java/com/trs/backend/repository/
```

Bang chinh:

- `accounts`
- `students`
- `teachers`
- `assignments`
- `student_on_assignments`
- `submissions`
- `recommendations`
- `feedback_forms`

## Thu Tu Doc Code

1. `frontend/src/app/student/page.tsx`
2. `backend-java/src/main/java/com/trs/backend/controller/SubmissionController.java`
3. `backend-java/src/main/java/com/trs/backend/service/SubmissionService.java`
4. `grader-java/src/main/java/com/trs/grader/GraderService.java`
5. `backend-java/src/main/java/com/trs/backend/model/Submission.java`
6. `backend-java/src/main/java/com/trs/backend/service/RecommendationService.java`
7. `frontend/src/app/teacher/page.tsx`
8. Cac entity con lai trong `backend-java/src/main/java/com/trs/backend/model/`

## Ghi Chu Hien Trang

- Auth hien la dev-auth don gian, chua phai OAuth that.
- Frontend page student/teacher con lon, sau nay nen tach component/hook.
- Java backend va Java grader la source dang chay chinh.
- `project/backups/` chi de backup local, khong phai code dang chay.
- `project/docs/trs_flow_visualization.html` la visualization phu, khong phai runtime dependency.
