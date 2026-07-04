# Lộ Trình Hiểu Code TRS Rebuild

Mục tiêu: đi từ "mở được app" đến "giải thích được luồng nộp bài, grader và recommendation".

## Giai Đoạn 1 - Hiểu Theo Người Dùng

Bạn cần trả lời được:

- Teacher làm được gì?
- Student làm được gì?
- Submission là gì?
- Recommendation là gì?
- Feedback form dùng để làm gì?

Kết quả mong muốn:

```text
Mở app -> login -> tạo assignment -> import sinh viên -> nộp bài -> xem kết quả
```

## Giai Đoạn 2 - Hiểu Một Request Đi Đâu

Học request nộp bài:

```text
Student bấm Submit
-> frontend gọi POST /api/submissions
-> backend lưu dữ liệu và gọi grader
-> grader compile/chạy testcase
-> backend lưu kết quả
-> backend tạo recommendation
```

File cần đọc:

```text
frontend/src/app/student/page.tsx
backend/app/routes/submission.py
grader/main.py
backend/app/services/recommendation_service.py
```

Cách đọc:

- Trong frontend, tìm các lệnh `fetch`.
- Trong backend, tìm route tạo submission.
- Trong route submission, tìm đoạn gọi `GRADER_URL`.
- Trong grader, tìm endpoint `/api/grader`.

## Giai Đoạn 3 - Hiểu Dữ Liệu

File cần đọc:

```text
backend/app/models/
```

Các object quan trọng:

- Account
- Student
- Teacher
- Assignment
- Submission
- Recommendation
- FeedbackForm
- MatrixFactorization

Mỗi class model tương ứng một bảng database. Mỗi `db.Column` là một cột. Mỗi `db.relationship` là quan hệ giữa các bảng.

## Giai Đoạn 4 - Hiểu Recommendation

Câu hỏi cần trả lời:

- Vì sao chỉ gợi ý tối đa 3 testcase?
- Testcase được chọn từ đâu?
- RSVD, timeSVD, LSTM nằm ở đâu?
- Khi không tìm thấy sinh viên trong matrix thì fallback thế nào?

File cần đọc:

```text
backend/app/services/recommendation_service.py
backend/app/services/recommendation_engine.py
backend/app/models/matrix_factorization.py
```

Câu giải thích ngắn:

```text
Hệ thống lấy các testcase fail, chấm điểm chúng bằng model prediction,
rồi chọn tối đa 3 testcase có điểm cao nhất để gợi ý cho sinh viên.
```

## Giai Đoạn 5 - Hiểu Grader

Câu hỏi cần trả lời:

- Code sinh viên được compile ở đâu?
- Bộ testcase đến từ đâu?
- Expected output nằm ở đâu?
- Khi compile lỗi thì backend nhận gì?
- Khi output sai thì backend nhận gì?

File cần đọc:

```text
grader/main.py
grader/support-files/
grader/expected_outputs/
```

## Giai Đoạn 6 - Chuẩn Bị Báo Cáo

Nên chuẩn bị 4 phần:

1. Bài toán: sinh viên cần gợi ý testcase phù hợp sau khi nộp bài.
2. Hệ thống: web app, backend, grader, recommendation engine.
3. Phương pháp: learner grouping, matrix prediction, ranking failed testcases.
4. Đánh giá: testcase được gợi ý, feedback sinh viên, tỉ lệ sửa được lỗi.

## Lịch Đọc Gợi Ý

Ngày 1:

- Đọc `PROJECT_MAP.md`.
- Mở app và đi hết luồng người dùng.

Ngày 2:

- Đọc `frontend/src/app/student/page.tsx`.
- Tập trung vào các hàm `fetch`.

Ngày 3:

- Đọc `backend/app/routes/submission.py`.
- Vẽ lại luồng nộp bài.

Ngày 4:

- Đọc `grader/main.py`.
- Hiểu compile, run testcase, compare output.

Ngày 5:

- Đọc `backend/app/services/recommendation_service.py`.
- Hiểu business rules: no testcase, daily limit, previous recommendation.

Ngày 6:

- Đọc `backend/app/services/recommendation_engine.py`.
- Hiểu group, model, matrix và fallback.

Ngày 7:

- Tự giải thích project trong 5 phút mà không nhìn code.
