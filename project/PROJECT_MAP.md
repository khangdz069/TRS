# TRS Rebuild - Bản Đồ Project

File này giúp đọc project theo luồng người dùng trước, rồi mới đi vào code.

## Project Là Gì?

TRS Rebuild là hệ thống prototype cho bài toán:

```text
Sinh viên nộp code C++ -> hệ thống chấm testcase -> hệ thống gợi ý vài testcase nên xem lại
```

Các vai trò chính:

- Teacher tạo assignment, import danh sách sinh viên và xem analytics feedback.
- Student xem assignment, nộp code, xem lịch sử chấm, xem testcase được gợi ý và gửi feedback.
- Backend điều phối dữ liệu, gọi grader và lưu kết quả.
- Grader compile/chạy code C++ qua bộ testcase.
- Recommendation engine chọn tối đa 3 testcase fail có ích để gợi ý.

## Bốn Khối Chạy Chính

```text
frontend/   -> Next.js UI, http://localhost:3100
backend/    -> Flask API chính, http://localhost:5102
grader/     -> Flask grader, http://localhost:5103
database    -> PostgreSQL, localhost:55432
```

Người dùng chỉ cần mở frontend ở `http://localhost:3100`.

## Luồng Người Dùng

```text
1. Login
2. Teacher tạo assignment
3. Teacher import sinh viên
4. Student xem assignment
5. Student nộp code
6. Backend gửi code sang grader
7. Grader compile và chạy testcase
8. Backend lưu submission và scores
9. Recommendation engine chọn testcase fail để gợi ý
10. Student xem gợi ý và gửi feedback
```

## File Theo Màn Hình

Login:

```text
frontend/src/app/login/page.tsx
backend/app/routes/auth.py
backend/app/services/auth_service.py
```

Teacher:

```text
frontend/src/app/teacher/page.tsx
backend/app/routes/assignment.py
backend/app/routes/student.py
backend/app/routes/form.py
```

Student:

```text
frontend/src/app/student/page.tsx
backend/app/routes/submission.py
backend/app/routes/recommendation.py
backend/app/routes/form.py
```

## Luồng Nộp Bài Quan Trọng Nhất

```text
frontend/src/app/student/page.tsx
        |
        | POST /api/submissions
        v
backend/app/routes/submission.py
        |
        | POST sang grader /api/grader
        v
grader/main.py
        |
        | trả về scores, failed_outputs
        v
backend lưu Submission
        |
        v
backend/app/services/recommendation_service.py
        |
        v
backend/app/services/recommendation_engine.py
```

Nếu chỉ đọc một luồng trước khi báo cáo hoặc debug, hãy đọc luồng này.

## Recommendation

File cần đọc:

```text
backend/app/services/recommendation_service.py
backend/app/services/recommendation_engine.py
backend/app/models/matrix_factorization.py
backend/app/files/input/A2_group_std.npz
backend/app/files/matries/*.npz
```

Ý tưởng hiện tại:

- Lấy danh sách testcase fail của submission.
- Xác định nhóm sinh viên: `apr1`, `apr2`, `apr3`, hoặc `unknown`.
- Mỗi nhóm ứng với một model: `RSVD`, `timeSVD`, `LSTM`.
- Load matrix prediction tương ứng.
- Xếp hạng các testcase fail theo điểm dự đoán.
- Gợi ý tối đa 3 testcase có điểm cao nhất.

## Grader

File cần đọc:

```text
grader/main.py
grader/support-files/
grader/expected_outputs/
```

Grader làm các việc chính:

- Nhận code sinh viên.
- Ghép với file hỗ trợ chính thức.
- Compile bằng `g++`.
- Chạy bộ testcase.
- So sánh output thực tế với expected output.
- Trả về pass/fail và lỗi cho backend.

## Database

Model nằm trong:

```text
backend/app/models/
```

Bảng chính:

- `accounts`
- `students`
- `teachers`
- `assignments`
- `student_on_assignments`
- `submissions`
- `recommendations`
- `feedback_forms`
- `matrix_factorizations`

## Thứ Tự Đọc Code

1. `frontend/src/app/student/page.tsx`
2. `backend/app/routes/submission.py`
3. `grader/main.py`
4. `backend/app/models/submission.py`
5. `backend/app/services/recommendation_service.py`
6. `backend/app/services/recommendation_engine.py`
7. `frontend/src/app/teacher/page.tsx`
8. Các model còn lại trong `backend/app/models/`

## Ghi Chú Hiện Trạng

- Auth hiện là dev-auth đơn giản, chưa phải OAuth thật.
- Frontend page student/teacher còn lớn, sau này nên tách component/hook.
- `project/archive/` chỉ để tham khảo source gốc, không phải code đang chạy.
- `project/examples/` chứa dữ liệu mẫu để demo.
- `project/docs/trs_flow_visualization.html` là visualization phụ, không phải runtime dependency.
