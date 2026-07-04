# TRS Rebuild

TRS Rebuild là prototype cho hệ thống nộp bài, chấm code C++ và gợi ý testcase học tập.

## Cấu Trúc Gọn

```text
trs-rebuild/
  backend/   Flask API chính, port 5102
  frontend/  Next.js + TypeScript, port 3100
  grader/    Flask grader chấm C++, port 5103
  project/   Tài liệu, dữ liệu mẫu, script, archive và Docker Compose
```

Trong `project/`:

```text
archive/            Source gốc và file zip tham khảo
docs/               Tài liệu phụ và visualization
examples/           CSV mẫu và submission demo
tools/              Script tiện ích
docker-compose.yml  Cấu hình chạy toàn bộ hệ thống
PROJECT_MAP.md      Bản đồ project
LEARNING_PATH.md    Lộ trình đọc code
DEMO_FLOW.md        Kịch bản demo với thầy
```

## Cổng Dịch Vụ

| Dịch vụ | Port ngoài | Ghi chú |
| --- | ---: | --- |
| Frontend | `3100` | `http://localhost:3100` |
| Backend | `5102` | `http://localhost:5102/api/health` |
| Grader | `5103` | `http://localhost:5103/api/health` |
| PostgreSQL | `55432` | Database `trs_db` |

## Chạy Bằng Docker Compose

Từ thư mục root `trs-rebuild`:

```bash
docker compose -f project/docker-compose.yml up -d --build
docker compose -f project/docker-compose.yml ps
```

Tắt toàn bộ dịch vụ:

```bash
docker compose -f project/docker-compose.yml down
```

Hoặc vào thẳng thư mục `project` rồi chạy:

```bash
cd project
docker compose up -d --build
```

## Chạy Local Từng Phần

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Grader:

```bash
cd grader
pip install -r requirements.txt
python main.py
```

## Dữ Liệu Mẫu

- CSV sinh viên mẫu: `project/examples/danh_sach_sinh_vien_mau.csv`
- Submission demo: `project/examples/demo_submissions/`
- Tạo lại submission demo: `python project/tools/create_demo_submissions.py`
- Flow visualization: `project/docs/trs_flow_visualization.html`
- Kịch bản demo: `project/DEMO_FLOW.md`
- Bản tóm tắt gửi nhóm/thầy: `project/docs/TRS_REBUILD_DEMO_BRIEF.md`
- Bản HTML mở trình bày nhanh: `project/docs/trs_demo_brief.html`
