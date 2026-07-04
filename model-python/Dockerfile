FROM python:3.12-slim

WORKDIR /app

COPY model-python/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY model-python/app.py app.py
COPY model-python/models models

ENV PORT=5104
ENV MODEL_DIR=/app/models

EXPOSE 5104

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5104} --workers 1 --threads 2 app:app"]
