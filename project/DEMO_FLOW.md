# Luồng Demo Với Thầy

Mục tiêu demo: cho thầy thấy đây là một hệ thống phần mềm hoàn chỉnh, nhưng điểm NCKH nằm ở phần gợi ý testcase sau khi chấm bài.

## 0. Chuẩn Bị Trước Khi Demo

Chạy hệ thống:

```bash
docker compose -f project/docker-compose.yml up -d --build
```

Mở app:

```text
http://localhost:3100
```

File mẫu cần dùng:

```text
project/examples/danh_sach_sinh_vien_mau.csv
project/examples/demo_submissions/01_lan_1_co_sai_nhan_goi_y_moi.zip
project/examples/demo_submissions/02_lan_2_fix_goi_y_moi_con_sai_tc_khac.zip
project/examples/demo_submissions/03_lan_3_dung_het.zip
```

Email demo:

```text
Teacher: teacher@hust.edu.vn
Student: nam.tv20231234@sis.hust.edu.vn
```

Ghi chú: sinh viên demo nên là `nam.tv20231234@sis.hust.edu.vn` vì file CSV mẫu có MSSV `20231234`.

## 1. Mở Đầu Khi Nói Với Thầy

Nói ngắn:

```text
Em demo project theo luồng người dùng. Project gồm frontend, backend, grader và recommendation engine.
Điểm phần mềm là sinh viên nộp bài và hệ thống chấm tự động.
Điểm NCKH là sau khi có các testcase sai, hệ thống chọn một số testcase nên gợi ý cho sinh viên.
```

## 2. Luồng Teacher

### Bước 1: Login Teacher

Thao tác:

```text
Mở /login
Nhập teacher@hust.edu.vn
Bấm đăng nhập với vai trò Teacher
```

Nói với thầy:

```text
Đây là dev-auth để demo. Email đuôi @hust.edu.vn được xem là giảng viên.
```

### Bước 2: Tạo Assignment

Thao tác:

```text
Vào tab bài tập
Tạo assignment mới
Tên gợi ý: Demo A1 - Testcase Recommendation
Ngày bắt đầu: hôm nay
Ngày kết thúc: chọn ngày sau hôm nay
Mô tả: Nộp bài C++ kNN, hệ thống chấm và gợi ý testcase.
```

Nói với thầy:

```text
Giảng viên tạo bài tập để sinh viên có thể nộp bài vào đúng assignment.
```

### Bước 3: Import Sinh Viên

Thao tác:

```text
Vào tab đăng ký sinh viên CSV
Chọn assignment vừa tạo
Upload project/examples/danh_sach_sinh_vien_mau.csv
Kiểm tra danh sách sinh viên đã được import
```

Nói với thầy:

```text
Giảng viên import danh sách lớp. Backend tạo account sinh viên và liên kết sinh viên với assignment.
```

## 3. Luồng Student Nộp Bài

### Bước 4: Login Student

Thao tác:

```text
Logout teacher
Login student bằng nam.tv20231234@sis.hust.edu.vn
Vào trang Student
Kiểm tra thấy assignment vừa tạo
```

Nói với thầy:

```text
Sinh viên chỉ thấy những assignment mà mình được đăng ký.
```

### Bước 5: Nộp Lần 1

Thao tác:

```text
Chọn assignment
Vào tab nộp bài
Upload project/examples/demo_submissions/01_lan_1_co_sai_nhan_goi_y_moi.zip
Bấm nộp file
Chuyển sang tab lịch sử
Đợi trạng thái chấm xong
```

Nói với thầy:

```text
Backend nhận file, gửi sang grader. Grader compile C++ và chạy bộ testcase.
Sau khi có danh sách testcase sai, backend gọi recommendation engine để chọn testcase gợi ý.
```

Điểm cần chỉ trên màn hình:

```text
Submission status
Danh sách testcase pass/fail
Khu vực recommendation
```

## 4. Giải Thích Recommendation

Khi recommendation hiện ra, nói:

```text
Hệ thống không đưa toàn bộ testcase sai cho sinh viên.
Nó lấy danh sách testcase fail, xác định nhóm người học, chọn một model phù hợp,
rồi xếp hạng các testcase fail theo điểm dự đoán.
Cuối cùng chỉ lấy tối đa 3 testcase để gợi ý.
```

Nói đúng về 3 model:

```text
Hệ thống không chạy cả 3 model mỗi lần submit.
Nó chọn một model theo nhóm sinh viên:
apr1 dùng RSVD, apr2 dùng timeSVD, apr3 dùng LSTM.
Nếu không xác định được nhóm thì fallback về RSVD.
```

Nếu thầy hỏi model có train lúc demo không:

```text
Không ạ. Trong bản demo này, các model đã có sẵn dưới dạng file matrix .npz.
Runtime chỉ load prediction matrix để xếp hạng testcase fail.
```

## 5. Luồng Sửa Bài Qua Nhiều Lần Nộp

### Bước 6: Nộp Lần 2

Thao tác:

```text
Vào tab nộp bài
Upload project/examples/demo_submissions/02_lan_2_fix_goi_y_moi_con_sai_tc_khac.zip
Bấm nộp
Vào lịch sử xem submission mới
```

Nói với thầy:

```text
Lần nộp thứ hai mô phỏng sinh viên đã sửa một phần sau khi xem gợi ý.
Nếu vẫn còn testcase sai, hệ thống tiếp tục sinh recommendation mới hoặc nhắc các testcase gợi ý cũ chưa hoàn thành.
```

### Bước 7: Nộp Lần 3

Thao tác:

```text
Upload project/examples/demo_submissions/03_lan_3_dung_het.zip
Xem kết quả pass tốt hơn hoặc hết lỗi tùy bộ chấm
```

Nói với thầy:

```text
Luồng này minh họa vòng lặp học tập: nộp bài, nhận gợi ý, sửa bài, nộp lại.
```

## 6. Feedback Và Analytics

### Bước 8: Student Gửi Feedback

Thao tác:

```text
Ở recommendation, chọn rating
Nhập phản hồi: Gợi ý giúp em tập trung sửa đúng lỗi hơn.
Bấm gửi feedback
```

Nói với thầy:

```text
Feedback là dữ liệu để đánh giá gợi ý testcase có hữu ích với sinh viên hay không.
```

### Bước 9: Teacher Xem Analytics

Thao tác:

```text
Logout student
Login lại teacher
Vào tab analytics
Chọn assignment demo
Xem rating, testcase stats, feedback gần đây
```

Nói với thầy:

```text
Giảng viên có thể xem phản hồi và thống kê để đánh giá chất lượng recommendation.
```

## 7. Tóm Tắt Kiến Trúc Bằng Một Câu

Nói:

```text
Frontend phục vụ thao tác người dùng, backend điều phối dữ liệu,
grader chịu trách nhiệm chấm code C++, còn recommendation engine là phần lõi nghiên cứu
để chọn testcase sai phù hợp nhất cho sinh viên.
```

## 8. Nếu Demo Bị Lỗi Thì Nói Gì?

Nếu Docker chưa chạy:

```text
Em sẽ chuyển sang giải thích flow bằng visualization trước, vì hệ thống chạy theo kiến trúc này.
```

Nếu grader lâu:

```text
Grader đang compile và chạy nhiều testcase C++, nên phần chấm có thể mất một chút thời gian.
Trong lúc chờ, em giải thích backend sẽ lưu submission và sinh recommendation sau khi grader trả kết quả.
```

Nếu recommendation không hiện:

```text
Recommendation phụ thuộc vào kết quả chấm và dữ liệu matrix.
Nếu model/matrix không match sinh viên, hệ thống có fallback để vẫn chọn các testcase fail đầu tiên.
```

Nếu thầy hỏi vì sao đây là NCKH:

```text
Nếu chỉ chấm đúng sai thì đây là hệ thống phần mềm bình thường.
Điểm nghiên cứu là bài toán chọn testcase nào nên gợi ý,
dựa trên learner group và prediction matrix thay vì chọn ngẫu nhiên hoặc đưa hết lỗi cho sinh viên.
```

## 9. Checklist Demo Nhanh

```text
[ ] Chạy Docker
[ ] Mở http://localhost:3100
[ ] Login teacher
[ ] Tạo assignment
[ ] Import CSV sinh viên
[ ] Login student
[ ] Nộp demo zip lần 1
[ ] Xem kết quả chấm và recommendation
[ ] Nộp demo zip lần 2
[ ] Gửi feedback
[ ] Login teacher xem analytics
```
