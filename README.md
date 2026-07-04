# TRS Rebuild

TRS Rebuild is a Dockerized teaching support system for programming assignments. The current stack uses a Next.js frontend, a Java Spring Boot backend, a Java Spring Boot grader, a Python black-box model service, and PostgreSQL.

## Services

| Service | URL | Notes |
| --- | --- | --- |
| Frontend | http://localhost:3100 | Next.js student/teacher portal |
| Backend API | http://localhost:5102/api/health | Spring Boot backend |
| Grader API | http://localhost:5103/api/health | Spring Boot C++ grader |
| Model API | http://localhost:5104/api/health | Python recommendation model service |
| PostgreSQL | localhost:55432 | Database `trs_db` |

## Run Locally

Requirements:

- Docker Desktop
- Git

Start the whole project from the repository root:

```bash
docker compose -p trs-rebuild -f project/docker-compose.yml up -d --build
```

Check running containers:

```bash
docker compose -p trs-rebuild -f project/docker-compose.yml ps
```

Stop the project:

```bash
docker compose -p trs-rebuild -f project/docker-compose.yml down
```

Open the app:

```text
http://localhost:3100/login
```

## Demo Accounts

The login screen creates accounts automatically by email domain.

Teacher:

```text
teacher@hust.edu.vn
```

Student examples:

```text
bao.pq20231111@sis.hust.edu.vn
nam.tv20231234@sis.hust.edu.vn
duc.lm20239012@sis.hust.edu.vn
```

Teacher emails must end with `@hust.edu.vn`. Student emails must end with `@sis.hust.edu.vn`.

## Main Test Flow

Teacher flow:

1. Login as a teacher.
2. Create an assignment.
3. Import students from a CSV or Excel file.
4. Open the student list for that assignment.
5. Open analytics after students submit feedback.

Student flow:

1. Login as a student.
2. Open an assigned assignment.
3. Submit C++ source files (`.cpp`, `.hpp`, `.h`, `.c`) or a `.zip`.
4. Wait for status to move from `GRADING` to `SUCCESS` or `FAILED`.
5. Check the score summary, for example `101/109 testcase`.
6. Review public testcase rows and recommended testcase rows.
7. Submit feedback after grading finishes.

## Development

Backend Java:

```bash
cd backend-java
mvn test
mvn spring-boot:run
```

Grader Java:

```bash
cd grader-java
mvn test
mvn spring-boot:run
```

Model Python:

```bash
cd model-python
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

The Docker setup is the recommended way to run all services together.

## Git Workflow For Team Members

Clone the repository:

```bash
git clone https://github.com/khangdz069/TRS.git
cd TRS
```

Create a branch for each task:

```bash
git checkout -b feature/short-task-name
```

After changes:

```bash
git status
git add .
git commit -m "Describe the change"
git push origin feature/short-task-name
```

Open a pull request on GitHub before merging to `main`.

## Project Layout

```text
frontend/      Next.js UI
backend-java/  Spring Boot backend API
grader-java/   Spring Boot C++ grader and testcase assets
model-python/  Python black-box recommendation model
project/       Docker Compose and local backups
```

## Known Limitations

- Model inference is intentionally kept as a Python black-box service because it depends on NumPy matrix files.
- The Java backend falls back to a simple recommendation strategy if the model service is unavailable.
- The RSVD rebuild/training endpoint still returns `501`; runtime recommendation uses the model service.
- Local backups are stored under `project/backups/`, which is ignored by Git.
