FROM python:3.12-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app/src
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir .
# Collect admin and API-docs assets for WhiteNoise; no database or real secret needed here.
RUN DJANGO_SECRET_KEY=collectstatic-only python src/manage.py collectstatic --noinput
RUN useradd --create-home appuser && mkdir -p /app/media /backups && chown -R appuser /app /backups
USER appuser
# Threads let one worker wait on several slow LLM calls at once.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "4", "--timeout", "300", "--access-logfile", "-"]

