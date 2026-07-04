# Luong Demo Voi Thay

Muc tieu demo: cho thay day la he thong web hoan chinh gom frontend, backend Java, grader Java, database va recommendation service.

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

Ghi chu: neu can demo nop bai, co the dung editor tren web de nhap code C++ hoac upload cac file `.cpp`, `.hpp`, `.h`, `.c`, `.zip`.

## 1. Mo Dau Khi Noi Voi Thay

Noi ngan:

```text
Em demo project theo luong nguoi dung. Project gom frontend, backend Java, grader Java va recommendation service.
Diem phan mem la sinh vien nop bai va he thong cham tu dong.
Diem nghien cuu la sau khi co cac testcase sai, he thong chon mot so testcase nen goi y cho sinh vien.
```

## 2. Luong Teacher

### Buoc 1: Login Teacher

Thao tac:

```text
Mo /login
Nhap teacher@hust.edu.vn
Bam dang nhap voi vai tro Teacher
```

Noi voi thay:

```text
Day la dev-auth de demo. Email duoi @hust.edu.vn duoc xem la giang vien.
```

### Buoc 2: Tao Assignment

Thao tac:

```text
Vao tab bai tap
Tao assignment moi
Ten goi y: Demo A1 - Testcase Recommendation
Ngay bat dau: hom nay
Ngay ket thuc: chon ngay sau hom nay
Mo ta: Nop bai C++ kNN, he thong cham va goi y testcase.
```

### Buoc 3: Import Sinh Vien

Thao tac:

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

Thao tac:

```text
Logout teacher
Login student bang nam.tv20231234@sis.hust.edu.vn
Kiem tra thay assignment vua tao
```

### Buoc 5: Nop Bai

Thao tac:

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
```

Diem can chi tren man hinh:

```text
Submission status
Danh sach testcase pass/fail
Khu vuc recommendation
```

## 4. Giai Thich Recommendation

Khi recommendation hien ra, noi:

```text
He thong khong dua toan bo testcase sai cho sinh vien.
Ban Java hien tai lay danh sach testcase fail, kiem tra cac rule nghiep vu,
roi chon toi da 3 testcase fail dau tien de goi y.
```

Noi ro trang thai model:

```text
Pipeline train RSVD/NumPy cua ban cu chua duoc port sang Java.
Vi vay ban Java hien tai dang dung fallback don gian de dam bao luong demo chay on dinh.
```

## 5. Feedback Va Analytics

### Buoc 6: Student Gui Feedback

Thao tac:

```text
O recommendation, chon rating
Nhap phan hoi: Goi y giup em tap trung sua dung loi hon.
Bam gui feedback
```

### Buoc 7: Teacher Xem Analytics

Thao tac:

```text
Logout student
Login lai teacher
Vao tab analytics
Chon assignment demo
Xem rating, testcase stats, feedback gan day
```

## 6. Tom Tat Kien Truc Bang Mot Cau

Noi:

```text
Frontend phuc vu thao tac nguoi dung, backend Java dieu phoi du lieu,
grader Java cham code C++, con recommendation service chon testcase sai de goi y cho sinh vien.
```

## 7. Neu Demo Bi Loi Thi Noi Gi?

Neu Docker chua chay:

```text
Em se chay lai Docker Compose va kiem tra health check cua backend Java, grader Java.
```

Neu grader lau:

```text
Grader dang compile va chay nhieu testcase C++, nen phan cham co the mat mot chut thoi gian.
```

Neu recommendation khong hien:

```text
Recommendation phu thuoc vao ket qua cham. Neu bai nop khong co testcase fail thi he thong se bao khong co testcase can goi y.
```

## 8. Checklist Demo Nhanh

```text
[ ] Chay Docker
[ ] Mo http://localhost:3100/login
[ ] Login teacher
[ ] Tao assignment
[ ] Import CSV sinh vien
[ ] Login student
[ ] Nop bai C++ hoac zip
[ ] Xem ket qua cham va recommendation
[ ] Gui feedback
[ ] Login teacher xem analytics
```
