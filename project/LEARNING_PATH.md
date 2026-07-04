# Lo Trinh Hieu Code TRS Rebuild

Muc tieu: di tu "mo duoc app" den "giai thich duoc luong nop bai, grader Java va model Python hop den".

## Giai Doan 1 - Hieu Theo Nguoi Dung

Ban can tra loi duoc:

- Teacher lam duoc gi?
- Student lam duoc gi?
- Submission la gi?
- Recommendation la gi?
- Feedback form dung de lam gi?

Ket qua mong muon:

```text
Mo app -> login -> tao assignment -> import sinh vien -> nop bai -> xem ket qua
```

## Giai Doan 2 - Hieu Mot Request Di Dau

Hoc request nop bai:

```text
Student bam Submit
-> frontend goi POST /api/submissions
-> backend Java luu du lieu va goi grader
-> grader Java compile/chay testcase
-> backend Java luu ket qua
-> backend Java goi model Python de tao recommendation
```

File can doc:

```text
frontend/src/app/student/page.tsx
backend/src/main/java/com/trs/backend/controller/SubmissionController.java
backend/src/main/java/com/trs/backend/service/SubmissionService.java
grader/src/main/java/com/trs/grader/GraderController.java
grader/src/main/java/com/trs/grader/GraderService.java
backend/src/main/java/com/trs/backend/service/RecommendationService.java
backend/src/main/java/com/trs/backend/service/ModelRecommendationClient.java
model-python/app.py
```

Cach doc:

- Trong frontend, tim cac lenh `fetch`.
- Trong controller, tim endpoint tao submission.
- Trong service, tim doan goi `GRADER_URL`.
- Trong grader, tim endpoint `/api/grader`.

## Giai Doan 3 - Hieu Du Lieu

Entity can doc:

```text
backend/src/main/java/com/trs/backend/entity/
```

Repository can doc:

```text
backend/src/main/java/com/trs/backend/repository/
```

Object quan trong:

- Account
- Student
- Teacher
- Assignment
- Submission
- Recommendation
- FeedbackForm

Moi class entity tuong ung voi mot bang database. Moi field co annotation JPA la mot cot hoac quan he giua cac bang.

## Giai Doan 4 - Hieu Recommendation

Cau hoi can tra loi:

- Vi sao chi goi y toi da 3 testcase?
- Testcase duoc chon tu dau?
- Khi sinh vien chua sua testcase goi y lan truoc thi sao?
- Khi het gioi han trong ngay thi sao?
- Java goi model Python o dau?
- Neu model Python loi thi fallback Java dang chon testcase nhu the nao?

File can doc:

```text
backend/src/main/java/com/trs/backend/service/RecommendationService.java
backend/src/main/java/com/trs/backend/service/ModelRecommendationClient.java
backend/src/main/java/com/trs/backend/repository/RecommendationRepository.java
backend/src/main/java/com/trs/backend/entity/Recommendation.java
model-python/app.py
```

Cau giai thich ngan:

```text
He thong lay cac testcase fail, kiem tra dieu kien nghiep vu trong Java,
roi goi model Python de rank va chon toi da 3 testcase goi y.
```

## Giai Doan 5 - Hieu Grader

Cau hoi can tra loi:

- Code sinh vien duoc compile o dau?
- Bo testcase den tu dau?
- Expected output nam o dau?
- Khi compile loi thi backend nhan gi?
- Khi output sai thi backend nhan gi?

File can doc:

```text
grader/src/main/java/com/trs/grader/GraderService.java
grader/assets/support-files/
grader/assets/expected_outputs/
```

## Giai Doan 6 - Chuan Bi Bao Cao

Nen chuan bi 4 phan:

1. Bai toan: sinh vien can goi y testcase phu hop sau khi nop bai.
2. He thong: web app, backend Java, grader Java, model Python.
3. Phuong phap: rule nghiep vu trong Java va ranking failed testcases trong model Python.
4. Danh gia: testcase duoc goi y, feedback sinh vien, ti le sua duoc loi.

## Lich Doc Goi Y

Ngay 1:

- Doc `PROJECT_MAP.md`.
- Mo app va di het luong nguoi dung.

Ngay 2:

- Doc `frontend/src/app/student/page.tsx`.
- Tap trung vao cac ham `fetch`.

Ngay 3:

- Doc `backend/src/main/java/com/trs/backend/controller/SubmissionController.java`.
- Doc `backend/src/main/java/com/trs/backend/service/SubmissionService.java`.

Ngay 4:

- Doc `grader/src/main/java/com/trs/grader/GraderService.java`.
- Hieu compile, run testcase, compare output.

Ngay 5:

- Doc `backend/src/main/java/com/trs/backend/service/RecommendationService.java`.
- Hieu business rules: no testcase, daily limit, previous recommendation.

Ngay 6:

- Doc `backend/src/main/java/com/trs/backend/service/ModelRecommendationClient.java`.
- Doc `model-python/app.py`.

Ngay 7:

- Doc entity va repository.

Ngay 8:

- Tu giai thich project trong 5 phut ma khong nhin code.
