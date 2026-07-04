# TRS Model Python

This service keeps the recommendation model as a Python black box.

## API

- `GET /api/health`
- `POST /api/model/recommend`

Example request:

```json
{
  "assignment_id": "demo",
  "student_mssv": "20231234",
  "failed_testcases": [1001, 1002, 1047],
  "limit": 3
}
```

The Java backend calls this service through `MODEL_URL`. If the service is not available, the Java backend falls back to its simple recommendation strategy.
