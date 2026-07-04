FROM python:3.10-slim

WORKDIR /app

# Install Python dependencies first to keep Docker rebuilds faster.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . ./backend

ENV PYTHONPATH=/app
# Expose backend port
EXPOSE 5102

# Run Flask server
CMD ["python", "backend/main.py"]
