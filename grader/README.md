# TRS Grader Java

Spring Boot C++ grader for TRS.

## Run locally

From this directory:

```bash
mvn spring-boot:run
```

The service listens on port `5103`.

## API

- `GET /api/health`
- `POST /api/grader`

The request and response JSON shapes match the backend contract so the current backend can keep using `GRADER_URL=http://grader:5103/api/grader`.

Runtime testcase assets are stored inside `grader/assets`:

- `assets/support-files`
- `assets/expected_outputs`

## Docker

Build from the repository root because the Dockerfile copies the grader assets:

```bash
docker build -f grader/Dockerfile .
```
