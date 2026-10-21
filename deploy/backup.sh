#!/bin/sh
# Daily backups: a PostgreSQL dump and an archive of uploaded files, kept for BACKUP_KEEP_DAYS.
# Restore: pg_restore --clean -d "$DATABASE" /backups/db-<stamp>.dump
#          tar -xzf /backups/media-<stamp>.tar.gz -C /
set -eu
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
export PGPASSWORD="$POSTGRES_PASSWORD"

while true; do
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  if pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "/backups/db-$stamp.dump.partial" \
    && mv "/backups/db-$stamp.dump.partial" "/backups/db-$stamp.dump" \
    && tar -czf "/backups/media-$stamp.tar.gz" /media; then
    echo "backup $stamp ok"
  else
    echo "backup $stamp FAILED" >&2
    rm -f "/backups/db-$stamp.dump.partial"
  fi
  find /backups -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
  find /backups -name 'media-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
  sleep "$INTERVAL"
done
