# TRS Backend Java

Spring Boot backend API for TRS.

## Run locally

From this directory:

```bash
mvn spring-boot:run
```

By default the service listens on port `5102` and connects to PostgreSQL at `localhost:55432`.

Useful environment variables:

- `DB_HOST`
- `DB_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `GRADER_URL`
- `JWT_SECRET`
- `UPLOAD_DIR`

## Docker

Build from the repository root:

```bash
docker build -f backend-java/Dockerfile .
```

## Notes

The main REST API has been ported for the current frontend workflow: auth, assignments, student import, submissions, recommendations, testcase details, and feedback forms.

The legacy backend has been moved out of the active source tree. The RSVD model rebuild endpoint currently returns `501`; the Java recommendation service uses a simple fallback strategy until the original NumPy model pipeline is ported.
