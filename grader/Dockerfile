FROM python:3.10-slim

# Install g++ compiler and build-essential
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose grader port
EXPOSE 5103

# Run Flask server
CMD ["python", "main.py"]
