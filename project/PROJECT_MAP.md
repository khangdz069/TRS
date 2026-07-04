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
- Backend Java dieu phoi du lieu, goi grader, goi model service va luu ket qua.
- Grader Java compile/chay code C++ qua bo testcase.
- Model Python la hop den recommendation, dung NumPy/matrix de rank testcase fail.

## Bon Khoi Chay Chinh

```text
frontend/      -> Next.js UI, http://localhost:3100
backend/  -> Spring Boot API, http://localhost:5102
grader/   -> Spring Boot C++ grader, http://localhost:5103
model-python/  -> Python recommendation model, http://localhost:5104
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
9. Backend Java goi model-python de rank testcase fail
10. Student xem goi y va gui feedback
```

## File Theo Man Hinh

Login:

```text
frontend/src/app/login/page.tsx
backend/src/main/java/com/trs/backend/controller/AuthController.java
backend/src/main/java/com/trs/backend/service/AuthService.java
```

Teacher:

```text
frontend/src/app/teacher/page.tsx
backend/src/main/java/com/trs/backend/controller/AssignmentController.java
backend/src/main/java/com/trs/backend/controller/StudentController.java
backend/src/main/java/com/trs/backend/controller/FormController.java
```

Student:

```text
frontend/src/app/student/page.tsx
backend/src/main/java/com/trs/backend/controller/SubmissionController.java
backend/src/main/java/com/trs/backend/controller/RecommendationController.java
backend/src/main/java/com/trs/backend/controller/FormController.java
```

## Luong Nop Bai Quan Trong Nhat

```text
frontend/src/app/student/page.tsx
        |
        | POST /api/submissions
        v
backend/src/main/java/com/trs/backend/controller/SubmissionController.java
        |
        v
backend/src/main/java/com/trs/backend/service/SubmissionService.java
        |
        | POST sang grader /api/grader
        v
grader/src/main/java/com/trs/grader/GraderController.java
        |
        v
grader/src/main/java/com/trs/grader/GraderService.java
        |
        | tra ve scores, failed_outputs
        v
backend luu Submission
        |
        v
backend/src/main/java/com/trs/backend/service/RecommendationService.java
        |
        | POST sang model /api/model/recommend
        v
model-python/app.py
```

Neu chi doc mot luong truoc khi bao cao hoac debug, hay doc luong nay.

## Recommendation

File can doc:

```text
backend/src/main/java/com/trs/backend/service/RecommendationService.java
backend/src/main/java/com/trs/backend/service/ModelRecommendationClient.java
backend/src/main/java/com/trs/backend/entity/Recommendation.java
backend/src/main/java/com/trs/backend/repository/RecommendationRepository.java
model-python/app.py
model-python/models/
```

Y tuong hien tai:

- Lay danh sach testcase fail cua submission.
- Neu sinh vien chua sua testcase goi y lan truoc thi tiep tuc tra lai goi y cu.
- Neu da qua gioi han trong ngay thi tra ve `DAILY_LIMIT_REACHED`.
- Neu co testcase fail moi thi backend goi `model-python`.
- Model Python chon group, chon RSVD/timeSVD/LSTM va rank testcase fail theo matrix.
- Neu model service loi thi backend dung `Fallback (Simple Java)`.

## Grader

File can doc:

```text
grader/src/main/java/com/trs/grader/GraderController.java
grader/src/main/java/com/trs/grader/GraderService.java
grader/assets/support-files/
grader/assets/expected_outputs/
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
backend/src/main/java/com/trs/backend/entity/
```

Repository nam trong:

```text
backend/src/main/java/com/trs/backend/repository/
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
2. `backend/src/main/java/com/trs/backend/controller/SubmissionController.java`
3. `backend/src/main/java/com/trs/backend/service/SubmissionService.java`
4. `grader/src/main/java/com/trs/grader/GraderService.java`
5. `backend/src/main/java/com/trs/backend/entity/Submission.java`
6. `backend/src/main/java/com/trs/backend/service/RecommendationService.java`
7. `backend/src/main/java/com/trs/backend/service/ModelRecommendationClient.java`
8. `model-python/app.py`
9. `frontend/src/app/teacher/page.tsx`
10. Cac entity con lai trong `backend/src/main/java/com/trs/backend/entity/`

## Ghi Chu Hien Trang

- Auth hien la dev-auth don gian, chua phai OAuth that.
- Frontend page student/teacher con lon, sau nay nen tach component/hook.
- Java backend va Java grader la source chinh; model Python duoc tach rieng nhu hop den.
- `project/backups/` chi de backup local, khong phai code dang chay.
- `project/docs/trs_flow_visualization.html` la visualization phu, khong phai runtime dependency.
