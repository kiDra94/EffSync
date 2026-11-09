#!/usr/bin/env bash
# Backup of the EffSync database (T15, UC-41, decision Q7): a full logical
# dump in PostgreSQL's custom format (documents/AP7-6.md). Run by the
# Superuser as the operator; see "Backup and restore" in the README.
#
#   DATABASE_URL=postgresql://… scripts/backup.sh [file]
#
# Without a file it writes $BACKUP_DIR/effsync-<UTC time>.dump (default
# backend/backups, ignored by git). BACKUP_KEEP_DAYS=n deletes the dumps
# older than n days in the folder it wrote to. Prints the file it wrote.
set -euo pipefail
# the dumps hold password hashes and personal data: for the owner only
umask 077

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pg.sh
. "$here/lib/pg.sh"

url="$(libpq_url "${DATABASE_URL:?DATABASE_URL is not set}")"
use_url_password "$DATABASE_URL"
file="${1:-${BACKUP_DIR:-$(cd "$here/.." && pwd)/backups}/effsync-$(date -u +%Y%m%dT%H%M%SZ).dump}"
dir="$(dirname "$file")"
mkdir -p "$dir"

# under a temporary name until all of the archive reads back, so a failed
# run leaves no file, and none that looks like a backup
trap 'rm -f "$file.partial"' EXIT
"$(pg_tool pg_dump)" --format=custom --no-owner --no-privileges \
  --file="$file.partial" "$url"
"$(pg_tool pg_restore)" --file=/dev/null "$file.partial"
mv "$file.partial" "$file"

if [[ -n "${BACKUP_KEEP_DAYS:-}" ]]; then
  find "$dir" -maxdepth 1 -name 'effsync-*.dump' -mtime +"$BACKUP_KEEP_DAYS" -delete
fi
echo "$file"
