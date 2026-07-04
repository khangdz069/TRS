# Luong Demo Voi Thay

Muc tieu demo: cho thay day la he thong web hoan chinh gom frontend, backend Java, grader Java, model Python hop den, database va feedback analytics.

## 0. Chuan Bi Truoc Khi Demo

Chay he thong:

```bash
docker compose -p trs-rebuild -f project/docker-compose.yml up -d --build
```

Mo app:

```text
http://localhost:3100/login
```

File mau can dung:

```text
project/examples/danh_sach_sinh_vien_mau.csv
```

Email demo:

```text
Teacher: teacher@hust.edu.vn
Student: nam.tv20231234@sis.hust.edu.vn
```

Neu can demo nop bai, co the dung editor tren web de nhap code C++ hoac upload cac file `.cpp`, `.hpp`, `.h`, `.c`, `.zip`.

## 1. Mo Dau Khi Noi Voi Thay

Noi ngan:

```text
Em demo project theo luong nguoi dung. Project gom frontend, backend Java, grader Java va model Python.
Backend va grader duoc viet bang Java Spring Boot. Rieng model recommendation duoc dong goi nhu mot Python service hop den vi phu thuoc NumPy va matrix file.
Diem nghien cuu la sau khi co cac testcase sai, model rank va chon mot so testcase nen goi y cho sinh vien.
```

## 2. Luong Teacher

### Buoc 1: Login Teacher

```text
Mo /login
Nhap teacher@hust.edu.vn
Bam dang nhap voi vai tro Teacher
```

### Buoc 2: Tao Assignment

```text
Vao tab bai tap
Tao assignment moi
Ten goi y: Demo A1 - Testcase Recommendation
Ngay bat dau: hom nay
Ngay ket thuc: chon ngay sau hom nay
Mo ta: Nop bai C++ kNN, he thong cham va goi y testcase.
```

### Buoc 3: Import Sinh Vien

```text
Vao tab dang ky sinh vien CSV
Chon assignment vua tao
Upload project/examples/danh_sach_sinh_vien_mau.csv
Kiem tra danh sach sinh vien da duoc import
```

Noi voi thay:

```text
Backend Java tao account sinh vien va lien ket sinh vien voi assignment.
```

## 3. Luong Student Nop Bai

### Buoc 4: Login Student

```text
Logout teacher
Login student bang nam.tv20231234@sis.hust.edu.vn
Kiem tra thay assignment vua tao
```

### Buoc 5: Nop Bai

```text
Chon assignment
Vao tab nop bai
Nhap code C++ trong editor hoac upload file C++/zip
Bam nop bai
Chuyen sang tab lich su
Doi trang thai cham xong
```

Noi voi thay:

```text
Backend Java nhan file, luu submission, roi gui code sang grader Java.
Grader Java compile C++ bang g++, chay bo testcase, sau do tra ve pass/fail cho backend.
Backend Java lay danh sach testcase fail, kiem tra rule nghiep vu, roi goi model Python de rank testcase.
```

## 4. Giai Thich Recommendation

Khi recommendation hien ra, noi:

```text
He thong khong dua toan bo testcase sai cho sinh vien.
Backend Java chi xu ly nghiep vu: no testcase, daily limit, testcase goi y lan truoc chua pass.
Neu hop le, backend goi model-python. Model nay chon learner group, chon RSVD/timeSVD/LSTM va rank testcase fail bang matrix.
```

Noi ro ly do giu Python:

```text
Phan model duoc giu Python nhu hop den vi phu thuoc NumPy va cac file matrix .npz.
Backend Java khong can biet cach model tinh diem; no chi gui failed_testcases va nhan recommended_testcases.
Neu model service loi, Java backend co fallback don gian de demo khong bi dung.
```

## 5. Feedback Va Analytics

### Buoc 6: Student Gui Feedback

```text
O recommendation, chon rating
Nhap phan hoi: Goi y giup em tap trung sua dung loi hon.
Bam gui feedback
```

### Buoc 7: Teacher Xem Analytics

```text
Logout student
Login lai teacher
Vao tab analytics
Chon assignment demo
Xem rating, testcase stats, feedback gan day
```

## 6. Tom Tat Kien Truc Bang Mot Cau

```text
Frontend phuc vu thao tac nguoi dung, backend Java dieu phoi du lieu,
grader Java cham code C++, con model Python la hop den recommendation dung de rank testcase sai.
```

## 7. Neu Demo Bi Loi Thi Noi Gi?

Neu Docker chua chay:

```text
Em se chay lai Docker Compose va kiem tra health check cua backend Java, grader Java va model Python.
```

Neu grader lau:

```text
Grader dang compile va chay nhieu testcase C++, nen phan cham co the mat mot chut thoi gian.
```

Neu recommendation khong hien:

```text
Recommendation phu thuoc vao ket qua cham. Neu bai nop khong co testcase fail thi he thong se bao khong co testcase can goi y.
Neu model service loi, backend Java van co fallback de tra goi y don gian.
```

## 8. Checklist Demo Nhanh

```text
[ ] Chay Docker
[ ] Mo http://localhost:3100/login
[ ] Check backend http://localhost:5102/api/health
[ ] Check grader http://localhost:5103/api/health
[ ] Check model http://localhost:5104/api/health
[ ] Login teacher
[ ] Tao assignment
[ ] Import CSV sinh vien
[ ] Login student
[ ] Nop bai C++ hoac zip
[ ] Xem ket qua cham va recommendation
[ ] Gui feedback
[ ] Login teacher xem analytics
```
