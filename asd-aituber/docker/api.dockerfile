# API Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY apps/api/app ./app

# Create non-root user
RUN adduser --disabled-password --gecos '' apiuser
USER apiuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
