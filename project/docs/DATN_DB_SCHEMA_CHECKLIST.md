# Checklist doi chieu CSDL theo DATN

Ngay tu kiem: 2026-07-04

Nguon thiet ke:

- `project/docs/DATN_MTRS (2).pdf`
- Hinh 4.17, PDF page 85, trang bao cao 68: luoc do co so du lieu he thong MTRS
- Phan mo ta bang, PDF page 86-87, trang bao cao 69-70

Nguon hien tai da kiem:

- PostgreSQL container `trs_database`, database `trs_db`
- Java entity trong `backend/src/main/java/com/trs/backend/entity/`
- Migration runtime trong `backend/src/main/resources/schema.sql`

Ky hieu:

- `OK`: khop voi nen tang DATN.
- `GAN KHOP`: khop nghiep vu chinh, nhung co khac biet ky thuat nho.
- `CAN QUYET DINH`: khac biet co anh huong luong app, khong nen sua vo dieu kien.

## Ket luan nhanh

Trang thai hien tai: `GAN KHOP`, chua nen goi la `GIONG 100%`.

Da dat:

- Co du 10 bang chinh theo hinh 4.17.
- Khong con bang legacy `feedback_forms`.
- Khong con bang legacy `matrix_factorizations`.
- `forms` giu du 2 dong du lieu da migrate.
- `matrixfactorizations` giu du 10 dong du lieu da migrate.
- Cac cot legacy trong `recommendations` va `submissions` da duoc don khoi DB.
- API van tra `role`, `recommended_testcases`, `failed_testcases`, `failed_outputs` de frontend khong vo, trong khi DB da map ve ten gan DATN hon.

Chua giong 100%:

- `accounts.type` dang la `varchar`, trong hinh la `accounttypeenum`.
- `submissions.status` dang la `varchar` voi gia tri runtime `GRADING`, `SUCCESS`, `FAILED`; trong mo ta DATN la `submissionstatus` voi nhom gia tri `WAITING`, `FAIL`, `SUCCESS`.
- Mot so cot van dung kieu linh hoat hon, vi du `assignments.description` va `forms.feedback` la `text` thay vi `varchar`.
- Mot so bang co them `deleted_at`; day la mo rong phuc vu soft-delete/truy vet, khong lam sai nghiep vu nhung khac hinh neu doi chieu cuc ky nghiem ngat.

## Bang doi chieu

| Bang DATN | Trang thai | Doi chieu hien tai | Ghi chu |
| --- | --- | --- | --- |
| `accounts` | GAN KHOP | Co `id`, `email`, `type`, `is_active`, `created_at`, `updated_at`, `name`, `deleted_at`. | Khac: `type` la `varchar`, khong phai PostgreSQL enum `accounttypeenum`. Co unique `email`, hop ly cho dang nhap. |
| `teachers` | OK | Co `id`, `account_id`, `created_at`, `updated_at`, `is_active`, `deleted_at`. | FK `account_id -> accounts.id` dung. `deleted_at` la mo rong tu `BaseEntity`. |
| `students` | OK | Co `id`, `account_id`, `mssv`, `created_at`, `updated_at`, `is_active`, `deleted_at`. | FK `account_id -> accounts.id`, unique `mssv`, unique `account_id`. |
| `assignments` | GAN KHOP | Co `id`, `name`, `description`, `start_date`, `end_date`, `author_id`, `is_active`, `created_at`, `updated_at`, `deleted_at`. | Khac nho: `description` la `text` thay vi `varchar`. Co FK `author_id -> teachers.id`. |
| `student_on_assignments` | OK | Co `id`, `student_id`, `assignment_id`, `is_active`, `created_at`, `updated_at`, `deleted_at`. | Co FK den `students`, `assignments`; co unique cap `student_id`, `assignment_id`. |
| `teacher_on_assignments` | OK | Co `id`, `teacher_id`, `assignment_id`, `is_leader`, `is_active`, `created_at`, `updated_at`, `deleted_at`. | Co FK den `teachers`, `assignments`; co unique cap `teacher_id`, `assignment_id`. |
| `submissions` | CAN QUYET DINH | Co `id`, `student_id`, `assignment_id`, `files`, `scores`, `status`, `created_at`, `updated_at`, `is_active`, `deleted_at`. | Khac quan trong: `status` dang la `varchar`, runtime co `GRADING/SUCCESS/FAILED`; DATN mo ta `WAITING/FAIL/SUCCESS`. Neu ep enum ngay se phai sua backend, grader, frontend. |
| `matrixfactorizations` | OK | Co `id`, `assignment_id`, `model_name`, `matrix_npz_path`, `list_student_ids`, `list_testcase_ids`, `created_at`, `updated_at`, `is_active`, `deleted_at`. | Kieu array dung: `varchar[]`, `integer[]`. |
| `forms` | GAN KHOP | Co `id`, `submission_id`, `list_used_tcids`, `time_ordered_tcids`, `scores`, `feedback`, `created_at`, `updated_at`, `is_active`, `deleted_at`. | Khac nho: `feedback` la `text` thay vi `varchar`; array hien nullable. Co unique `submission_id`, hop voi 1 submission co 1 form. |
| `recommendations` | OK | Co `id`, `submission_id`, `status`, `list_testcase_id`, `list_false_tcids`, `is_filled_form`, `created_at`, `updated_at`, `is_active`, `deleted_at`. | `status` la `integer`, dung voi hinh. API map ra chu de frontend de doc de hon. |

## Kiem bang DB that

Lenh da chay:

```powershell
docker exec trs_database psql -U trs_user -d trs_db -c "select tablename from pg_tables where schemaname='public' and tablename in ('feedback_forms','forms','matrix_factorizations','matrixfactorizations') order by tablename;"
docker exec trs_database psql -U trs_user -d trs_db -c "select table_name, count(*) as column_count from information_schema.columns where table_schema='public' and table_name in ('accounts','teachers','students','assignments','student_on_assignments','teacher_on_assignments','submissions','forms','recommendations','matrixfactorizations') group by table_name order by table_name;"
docker exec trs_database psql -U trs_user -d trs_db -c "select status, count(*) from submissions group by status order by status; select status, count(*) from recommendations group by status order by status;"
```

Ket qua chinh:

- Bang con lai trong cap legacy/new: chi co `forms`, `matrixfactorizations`.
- Khong con `feedback_forms`.
- Khong con `matrix_factorizations`.
- Co du 10 bang chinh.
- `submissions.status` hien co du lieu `FAILED`, `GRADING`, `SUCCESS`.
- `recommendations.status` hien co du lieu so `1`, `2`, `4`.

## Tu kiem theo muc do nghiem ngat

Neu dinh nghia "giong DATN" la dung ve y tuong CSDL va luong nghiep vu:

- Ket luan: dat muc gan khop.
- Ly do: du bang, du quan he chinh, du cot nghiep vu, du array cho testcase, du soft-delete flag, khong con bang/cot Python legacy.

Neu dinh nghia "giong DATN" la khop 100% tung kieu DB:

- Ket luan: chua dat.
- Can sua them enum/check constraint cho `accounts.type`.
- Can chuan hoa `submissions.status` ve bo gia tri DATN.
- Can quyet dinh co giu `deleted_at` tren moi bang hay chi giu `is_active`.
- Can quyet dinh doi `description`/`feedback` tu `text` ve `varchar` hay xem `text` la tuong thich tot hon.

## De xuat tiep theo

Nen lam theo thu tu an toan:

1. Giu schema hien tai de tiep tuc phat trien, vi app dang chay on va da ton trong nen tang DATN.
2. Neu can bao cao/thuyet minh, noi ro: "Java backend giu schema gan DATN, mot so enum/status duoc hien thuc bang varchar va mapping API de phu hop frontend."
3. Neu muon ep sat hon, lam rieng mot task refactor status:
   - DB: `submissions.status` chuyen ve `WAITING`, `FAIL`, `SUCCESS` hoac them check constraint.
   - Backend: thay `GRADING` bang `WAITING`, thay `FAILED` bang `FAIL`.
   - Grader: tra `FAIL` thay vi `FAILED`.
   - Frontend: doi cac dieu kien hien thi/polling theo status moi.
4. Khong nen ep enum/status trong DB khi chua sua dong bo code, vi se lam mat kha nang submit/cham bai hien tai.
