# TRS Rebuild - Bản Tóm Tắt Gửi Trước Khi Demo

## 1. Mục Tiêu Demo

TRS Rebuild là một hệ thống web hỗ trợ sinh viên nộp bài lập trình C++, tự động chấm bài bằng testcase, sau đó gợi ý một số testcase sai có giá trị học tập để sinh viên tập trung sửa lỗi.

Điểm cần nhấn mạnh:

- Đây là một phần mềm có đầy đủ frontend, backend, grader và database.
- Phần nghiên cứu nằm ở recommendation engine: hệ thống không chỉ báo đúng/sai, mà còn chọn testcase nên gợi ý.
- Recommendation dựa trên nhóm người học và ma trận dự đoán từ các model như RSVD, timeSVD, LSTM.

## 2. Kiến Trúc Tổng Quan

```text
Student / Teacher
        |
        v
Frontend Next.js
        |
        v
Backend Flask API
        |
        +--> PostgreSQL database
        |
        +--> Grader service: compile và chạy testcase C++
        |
        +--> Recommendation engine: chọn testcase gợi ý
```

Các thành phần chính:

| Thành phần | Vai trò |
| --- | --- |
| Frontend | Giao diện cho giảng viên và sinh viên |
| Backend | Điều phối nghiệp vụ, lưu dữ liệu, gọi grader |
| Grader | Compile code C++ và chạy bộ testcase |
| Database | Lưu account, assignment, submission, feedback |
| Recommendation engine | Chọn tối đa 3 testcase sai để gợi ý |

## 3. Luồng Demo Chính

### Bước 1: Giảng viên tạo bài tập

Giảng viên đăng nhập, tạo một assignment mới và import danh sách sinh viên từ file CSV.

Ý nghĩa:

```text
Hệ thống mô phỏng quy trình lớp học thật: giảng viên tạo bài tập và gán sinh viên vào bài tập đó.
```

### Bước 2: Sinh viên nộp bài

Sinh viên đăng nhập, chọn assignment, upload file code C++ dạng zip và bấm nộp.

Ý nghĩa:

```text
Frontend gửi bài nộp lên backend. Backend lưu submission và gửi code sang grader để chấm.
```

### Bước 3: Grader chấm bài

Grader compile code C++, chạy các testcase và trả về kết quả pass/fail.

Ý nghĩa:

```text
Đây là phần chấm tự động. Hệ thống biết testcase nào đúng và testcase nào sai.
```

### Bước 4: Recommendation engine gợi ý testcase

Sau khi có danh sách testcase sai, recommendation engine chọn tối đa 3 testcase để gợi ý cho sinh viên.

Ý nghĩa:

```text
Hệ thống không đưa toàn bộ testcase sai cho sinh viên.
Nó chọn một tập nhỏ testcase có khả năng hữu ích hơn cho quá trình sửa bài.
```

### Bước 5: Sinh viên gửi feedback

Sinh viên xem gợi ý, sửa bài, nộp lại và gửi feedback về mức độ hữu ích của gợi ý.

Ý nghĩa:

```text
Feedback là dữ liệu để đánh giá chất lượng của recommendation.
```

## 4. Phần NCKH Nằm Ở Đâu?

Nếu chỉ có nộp bài và chấm testcase thì đây là một hệ thống phần mềm bình thường.

Điểm NCKH nằm ở câu hỏi:

```text
Khi sinh viên sai nhiều testcase, hệ thống nên gợi ý testcase nào trước để hỗ trợ sửa bài hiệu quả hơn?
```

Hệ thống giải quyết bằng cách:

1. Lấy danh sách testcase sinh viên đang sai.
2. Xác định nhóm người học của sinh viên.
3. Chọn model phù hợp với nhóm đó.
4. Dùng matrix prediction để chấm điểm các testcase sai.
5. Sắp xếp và lấy tối đa 3 testcase có điểm cao nhất.

## 5. RSVD, timeSVD, LSTM Được Dùng Như Thế Nào?

Hệ thống không chạy cả 3 model trong mỗi lần nộp bài. Nó chọn một model dựa trên nhóm sinh viên.

| Nhóm sinh viên | Model dùng |
| --- | --- |
| `apr1` | RSVD |
| `apr2` | timeSVD |
| `apr3` | LSTM |
| `unknown` | fallback về RSVD |

Trong bản demo này, các model đã có sẵn dưới dạng file matrix `.npz`. Khi sinh viên nộp bài, backend chỉ load matrix dự đoán để xếp hạng testcase sai, không training lại model tại thời điểm demo.

## 6. Câu Trình Bày Ngắn Gọn

Có thể trình bày như sau:

```text
Project này là một hệ thống web hỗ trợ sinh viên nộp bài lập trình C++.
Sau khi sinh viên nộp bài, hệ thống gửi code sang grader để compile và chạy testcase.
Khi có kết quả chấm, backend lưu submission và gọi recommendation engine.
Điểm nghiên cứu nằm ở phần recommendation: hệ thống không chỉ báo testcase đúng/sai,
mà còn chọn tối đa 3 testcase sai có giá trị học tập để gợi ý cho sinh viên.
Việc chọn testcase dựa trên nhóm người học và matrix prediction từ các model như RSVD, timeSVD hoặc LSTM.
```

## 7. Kịch Bản Demo 5-7 Phút

1. Mở trang login.
2. Đăng nhập teacher.
3. Tạo assignment.
4. Import danh sách sinh viên.
5. Đăng xuất teacher.
6. Đăng nhập student.
7. Chọn assignment và nộp file zip demo.
8. Mở lịch sử submission để xem trạng thái chấm.
9. Chỉ ra kết quả pass/fail.
10. Chỉ ra khu vực recommendation.
11. Giải thích hệ thống chọn testcase gợi ý như thế nào.
12. Gửi feedback.
13. Đăng nhập lại teacher và xem analytics nếu còn thời gian.

## 8. Dữ Liệu Demo

File mẫu:

```text
project/examples/danh_sach_sinh_vien_mau.csv
project/examples/demo_submissions/01_lan_1_co_sai_nhan_goi_y_moi.zip
project/examples/demo_submissions/02_lan_2_fix_goi_y_moi_con_sai_tc_khac.zip
project/examples/demo_submissions/03_lan_3_dung_het.zip
```

Tài khoản demo:

```text
Teacher: teacher@hust.edu.vn
Student: nam.tv20231234@sis.hust.edu.vn
```

## 9. Một Số Câu Hỏi Có Thể Gặp

### Đây có phải chỉ là phần mềm CRUD không?

Không. CRUD chỉ là phần quản lý dữ liệu như account, assignment, submission. Phần nghiên cứu nằm ở recommendation engine, nơi hệ thống chọn testcase nên gợi ý dựa trên learner group và prediction matrix.

### Có training model khi demo không?

Không. Bản demo dùng các matrix đã được chuẩn bị sẵn. Runtime chỉ load matrix để xếp hạng testcase fail.

### Vì sao chỉ gợi ý tối đa 3 testcase?

Để sinh viên không bị quá tải bởi toàn bộ danh sách lỗi. Hệ thống chọn một tập nhỏ testcase có khả năng hữu ích hơn cho việc sửa bài.

### Nếu không tìm thấy nhóm sinh viên thì sao?

Hệ thống fallback về model mặc định RSVD hoặc fallback đơn giản là chọn các testcase fail đầu tiên.

## 10. Kết Luận

TRS Rebuild có thể được nhìn như một phần mềm học tập hoàn chỉnh ở tầng hệ thống, nhưng điểm đóng góp nghiên cứu nằm ở cơ chế gợi ý testcase. Hệ thống biến kết quả chấm bài thành phản hồi có định hướng, giúp sinh viên biết nên tập trung sửa những testcase nào trước.
