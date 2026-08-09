#!/bin/bash
# Backup script for ZT-Reel PostgreSQL

BACKUP_DIR="/root/ztreel-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ztreel_${TIMESTAMP}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"
MAX_BACKUPS=7

mkdir -p "$BACKUP_DIR"

echo "==================================================" >> "$LOG_FILE"
echo "[$(date)] Bắt đầu backup database..." >> "$LOG_FILE"

# 1. Dump database từ container đang chạy
if docker exec ztreel_postgres_prod pg_dump -U root -d ztreel --no-owner --clean > "$BACKUP_FILE"; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup thành công: ${BACKUP_FILE} (Dung lượng: $FILE_SIZE)" >> "$LOG_FILE"
  
  # 2. Xóa các bản backup cũ, chỉ giữ lại MAX_BACKUPS (7) bản mới nhất
  cd "$BACKUP_DIR" && ls -t *.sql | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm --
  
  echo "[$(date)] Đã dọn dẹp các bản backup cũ (giữ lại 7 bản)." >> "$LOG_FILE"
else
  echo "[$(date)] LỖI: Không thể backup database!" >> "$LOG_FILE"
  rm -f "$BACKUP_FILE"
fi

echo "==================================================" >> "$LOG_FILE"