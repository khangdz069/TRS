# TRS Rebuild - Tom Tat Demo

## 1. Muc Tieu Demo

TRS Rebuild la he thong web ho tro sinh vien nop bai lap trinh C++, cham bai bang testcase, sau do goi y mot so testcase sai de sinh vien tap trung sua loi.

Diem can nhan manh:

- He thong co frontend, backend Java, grader Java, model Python va database.
- Backend Java dieu phoi nghiep vu, luu du lieu, goi grader va goi model.
- Grader Java compile code C++ va chay bo testcase.
- Model Python la hop den recommendation, dung NumPy/matrix de rank testcase fail.

## 2. Kien Truc Tong Quan

```text
Student / Teacher
        |
        v
Frontend Next.js
        |
        v
Backend Java Spring Boot
        |
        +--> PostgreSQL database
        |
        +--> Grader Java Spring Boot: compile va chay testcase C++
        |
        +--> Model Python: RSVD/timeSVD/LSTM matrix ranking
```

## 3. Luong Demo Chinh

1. Giang vien dang nhap va tao assignment.
2. Giang vien import danh sach sinh vien tu CSV.
3. Sinh vien dang nhap va nop file C++ hoac zip.
4. Backend Java luu submission va gui sang grader Java.
5. Grader Java compile, chay testcase va tra ket qua pass/fail.
6. Backend Java lay testcase fail, kiem tra rule nghiep vu va goi model Python.
7. Model Python rank testcase fail va tra ve toi da 3 testcase goi y.
8. Sinh vien xem goi y va gui feedback.
9. Giang vien xem analytics feedback.

## 4. Recommendation Dang Hoat Dong Nhu The Nao?

Backend Java:

- Lay danh sach testcase fail cua submission.
- Neu khong co testcase fail thi tra ve `NO_TESTCASE`.
- Neu sinh vien chua sua testcase goi y lan truoc thi tra ve `PREVIOUS_TESTCASE_NOT_COMPLETED`.
- Neu da qua gioi han goi y trong ngay thi tra ve `DAILY_LIMIT_REACHED`.
- Neu hop le thi goi `model-python`.

Model Python:

- Xac dinh learner group tu `A2_group_std.npz`.
- Chon model `RSVD`, `timeSVD` hoac `LSTM`.
- Load matrix `.npz`.
- Rank cac testcase fail theo diem du doan.
- Tra ve toi da 3 testcase goi y.

Neu model service loi, backend Java dung fallback don gian de he thong van demo duoc.

## 5. Cau Trinh Bay Ngan Gon

```text
Project nay la mot he thong web ho tro sinh vien nop bai C++.
Frontend phuc vu thao tac nguoi dung, backend Java dieu phoi du lieu,
grader Java compile va chay testcase, con model Python la hop den recommendation.
Java backend goi model qua HTTP, nen phan NumPy/matrix duoc tach rieng va khong lam roi code Java.
```

## 6. Tai Khoan Demo

```text
Teacher: teacher@hust.edu.vn
Student: nam.tv20231234@sis.hust.edu.vn
```

## 7. File Mau

```text
project/examples/danh_sach_sinh_vien_mau.csv
```

Neu can demo nop bai, dung editor tren web hoac upload file `.cpp`, `.hpp`, `.h`, `.c`, `.zip`.
