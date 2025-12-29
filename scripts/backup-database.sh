#!/bin/bash
# Database Backup Script
# Run manually or via cron for regular backups

# Configuration
SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-db.your-project.supabase.co}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.dump"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Creating database backup..."

# Create backup
pg_dump -h "$SUPABASE_DB_HOST" \
  -U "$SUPABASE_DB_USER" \
  -d postgres \
  -F c \
  -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup created: $BACKUP_FILE"
  
  # Compress backup
  gzip "$BACKUP_FILE"
  echo "✅ Backup compressed: ${BACKUP_FILE}.gz"
  
  # Remove backups older than 30 days
  find "$BACKUP_DIR" -name "backup_*.dump.gz" -mtime +30 -delete
  echo "✅ Old backups cleaned up"
else
  echo "❌ Backup failed!"
  exit 1
fi

