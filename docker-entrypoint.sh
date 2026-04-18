#!/bin/sh
set -e

# Persistent data directory (Render disk mount, Fly volume, etc.)
DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR/uploads"

# Seed DB on first boot from image-baked snapshot
if [ ! -s "$DATA_DIR/veritas.db" ]; then
  if [ -f /app/veritas.db.seed ]; then
    echo "[entrypoint] Seeding DB from /app/veritas.db.seed"
    cp /app/veritas.db.seed "$DATA_DIR/veritas.db"
  else
    touch "$DATA_DIR/veritas.db"
  fi
fi

# Link SQLite + uploads to volume
ln -sf "$DATA_DIR/veritas.db" /app/veritas.db
rm -rf /app/public/uploads
ln -sf "$DATA_DIR/uploads" /app/public/uploads

exec "$@"
