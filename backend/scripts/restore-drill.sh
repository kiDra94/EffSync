#!/usr/bin/env bash
# Restore drill (GOALS.md M31, T15, UC-41): backs up the database in
# DATABASE_URL, restores the dump into a fresh database and compares the
# schema, the data (sequences included) and the row count of every table.
# Runs in CI against the seeded test database.
#
#   DATABASE_URL=postgresql://…/effsync_test scripts/restore-drill.sh
#
# Only for a database whose name ends in _test: it creates and drops a
# second database next to it.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pg.sh
. "$here/lib/pg.sh"

source_url="$(libpq_url "${DATABASE_URL:?DATABASE_URL is not set}")"
use_url_password "$DATABASE_URL"
source_db="$(db_name "$source_url")"
if [[ "$source_db" != *_test ]]; then
  echo "refusing to drill on $source_db (not a *_test database)" >&2
  exit 1
fi
drill_db="${source_db%_test}_drill_test"
drill_url="$(with_db "$source_url" "$drill_db")"
work="$(mktemp -d)"

psql_() { "$(pg_tool psql)" -X -v ON_ERROR_STOP=1 "$@"; }
cleanup() {
  psql_ "$source_url" -qc "SET client_min_messages = warning" -c "DROP DATABASE IF EXISTS $drill_db" >/dev/null || true
  rm -rf "$work"
}
trap cleanup EXIT

# row count per table, sorted: "table|count"
row_counts() {
  local url="$1" tables table count
  tables="$(psql_ "$url" -tAc "SELECT quote_ident(table_name) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1")"
  for table in $tables; do
    # a variable first, so set -e stops on a failed count (review M31)
    count="$(psql_ "$url" -tAc "SELECT count(*) FROM $table")"
    echo "$table|$count"
  done
}

# schema and data as pg_dump writes them, without the lines naming the
# database or the dump's own run
dump_text() {
  # the data-only dump warns that tasks refers to itself (parent_task_id);
  # the comparison needs no restorable order
  "$(pg_tool pg_dump)" --no-owner --no-privileges "$@" \
    2> >(grep -vE 'circular foreign-key|^pg_dump: (detail|hint):' >&2) |
    grep -vE '^(-- Dumped|\\restrict|\\unrestrict|SELECT pg_catalog.set_config)'
}

same() {
  local what="$1" a="$2" b="$3"
  if ! diff -q "$a" "$b" >/dev/null; then
    diff -u "$a" "$b" | head -40 >&2
    echo "FAILED: the restored $what differs" >&2
    exit 1
  fi
}

compare() {
  local label="$1"
  row_counts "$drill_url" >"$work/counts-$label.txt"
  same "row counts ($label)" "$work/counts-source.txt" "$work/counts-$label.txt"
  dump_text --schema-only "$drill_url" >"$work/schema-$label.sql"
  same "schema ($label)" "$work/schema-source.sql" "$work/schema-$label.sql"
  dump_text --data-only "$drill_url" >"$work/data-$label.sql"
  same "data or sequences ($label)" "$work/data-source.sql" "$work/data-$label.sql"
}

echo "1. backup of $source_db"
"$here/backup.sh" "$work/drill.dump" >/dev/null
row_counts "$source_url" >"$work/counts-source.txt"
dump_text --schema-only "$source_url" >"$work/schema-source.sql"
dump_text --data-only "$source_url" >"$work/data-source.sql"

echo "2. a fresh database $drill_db"
psql_ "$source_url" -qc "SET client_min_messages = warning" -c "DROP DATABASE IF EXISTS $drill_db" >/dev/null
psql_ "$source_url" -qc "CREATE DATABASE $drill_db" >/dev/null

echo "3. a restore without confirmation is refused and writes nothing"
if DATABASE_URL="$drill_url" "$here/restore.sh" "$work/drill.dump" </dev/null >/dev/null 2>"$work/refused.txt"; then
  echo "FAILED: restore.sh ran without confirmation" >&2
  exit 1
fi
grep -q "not confirmed" "$work/refused.txt" || {
  cat "$work/refused.txt" >&2
  echo "FAILED: restore.sh failed for another reason than the confirmation" >&2
  exit 1
}
if [[ "$(psql_ "$drill_url" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")" != 0 ]]; then
  echo "FAILED: the refused restore created tables" >&2
  exit 1
fi

echo "4. restore into $drill_db"
DATABASE_URL="$drill_url" RESTORE_CONFIRM="$drill_db" "$here/restore.sh" "$work/drill.dump" >/dev/null

echo "5. schema, data and row counts"
compare restored

echo "6. restore over changed data and a newer table (the recovery case)"
psql_ "$drill_url" -q >/dev/null <<'SQL'
DELETE FROM notifications;
UPDATE tasks SET title = 'changed';
-- as a later migration would add it, with a foreign key into the dump's tables
CREATE TABLE drill_newer (id int PRIMARY KEY, task_id int REFERENCES tasks (task_id));
SQL
DATABASE_URL="$drill_url" RESTORE_CONFIRM="$drill_db" "$here/restore.sh" "$work/drill.dump" >/dev/null
compare again

tables="$(wc -l <"$work/counts-source.txt")"
rows="$(awk -F'|' '{ sum += $2 } END { print sum }' "$work/counts-source.txt")"
if [[ "$tables" -eq 0 || "$rows" -eq 0 ]]; then
  echo "FAILED: nothing to compare (seed the database first)" >&2
  exit 1
fi
echo "OK: $tables tables, $rows rows; schema and data restored identically"
