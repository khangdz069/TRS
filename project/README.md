# TRS Rebuild Project Notes

TRS Rebuild la prototype cho he thong nop bai, cham code C++ va goi y testcase hoc tap.

## Cau Truc Gon

```text
trs-rebuild/
  frontend/      Next.js + TypeScript, port 3100
  backend-java/  Spring Boot backend API, port 5102
  grader-java/   Spring Boot C++ grader, port 5103
  project/       Docker Compose, tai lieu, du lieu mau va backup local
```

Trong `project/`:

```text
backups/            Backup local, khong commit len Git
docs/               Tai lieu phu va visualization
examples/           CSV mau
docker-compose.yml  Cau hinh chay toan bo he thong
PROJECT_MAP.md      Ban do project
LEARNING_PATH.md    Lo trinh doc code Java
DEMO_FLOW.md        Kich ban demo voi thay
```

## Cong Dich Vu

| Dich vu | Port ngoai | Ghi chu |
| --- | ---: | --- |
| Frontend | `3100` | `http://localhost:3100` |
| Backend Java | `5102` | `http://localhost:5102/api/health` |
| Grader Java | `5103` | `http://localhost:5103/api/health` |
| PostgreSQL | `55432` | Database `trs_db` |

## Chay Bang Docker Compose

Tu thu muc root `trs-rebuild`:

```bash
docker compose -p trs-rebuild -f project/docker-compose.yml up -d --build
docker compose -p trs-rebuild -f project/docker-compose.yml ps
```

Tat toan bo dich vu:

```bash
docker compose -p trs-rebuild -f project/docker-compose.yml down
```

## Chay Local Tung Phan

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend Java:

```bash
cd backend-java
mvn spring-boot:run
```

Grader Java:

```bash
cd grader-java
mvn spring-boot:run
```

## Du Lieu Mau

- CSV sinh vien mau: `project/examples/danh_sach_sinh_vien_mau.csv`
- Flow visualization: `project/docs/trs_flow_visualization.html`
- Kich ban demo: `project/DEMO_FLOW.md`
- Ban tom tat gui nhom/thay: `project/docs/TRS_REBUILD_DEMO_BRIEF.md`
- Ban HTML mo trinh bay nhanh: `project/docs/trs_demo_brief.html`
