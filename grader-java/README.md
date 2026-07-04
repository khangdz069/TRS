# TRS Grader Java

Spring Boot replacement for the original Flask grader in `grader/main.py`.

## Run locally

From this directory:

```bash
mvn spring-boot:run
```

The service listens on port `5103`.

## API

- `GET /api/health`
- `POST /api/grader`

The request and response JSON shapes match the existing Python grader so the current backend can keep using `GRADER_URL=http://grader:5103/api/grader`.

## Docker

Build from the repository root because the Dockerfile copies support files from `grader/`:

```bash
docker build -f grader-java/Dockerfile .
```
