FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
# Install curl for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
    pip install --prefer-binary --only-binary=:all: -r /app/requirements.txt
COPY backend /app
EXPOSE 3000
ENV REQUIRE_AUTH=0
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
