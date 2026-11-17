#!/usr/bin/env bash
# Restore of the EffSync database from a backup.sh dump (T15, UC-41,
# decision Q7). The database in DATABASE_URL becomes the dump: its schema
# `public` is dropped with everything in it, also tables of later
# migrations, and recreated from the dump, in one transaction: all or
# nothing. Stop the backend first; see "Backup and restore" in the README.
#
#   DATABASE_URL=postgresql://… scripts/restore.sh <file>
#
# It asks for the database name to confirm; RESTORE_CONFIRM=<name> answers
# without asking (scripts, CI).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pg.sh
. "$here/lib/pg.sh"

file="${1:?usage: restore.sh <file>}"
[[ -r "$file" ]] || { echo "cannot read $file" >&2; exit 1; }
url="$(libpq_url "${DATABASE_URL:?DATABASE_URL is not set}")"
use_url_password "$DATABASE_URL"
name="$(db_name "$url")"
server="$(db_server "$url")"

# all of the dump must read back before anything is dropped
"$(pg_tool pg_restore)" --file=/dev/null "$file"

answer="${RESTORE_CONFIRM:-}"
if [[ -z "$answer" ]]; then
  read -r -p "This replaces all data in '$name' on $server with $file. Type the database name to go on: " answer || true
fi
if [[ "$answer" != "$name" ]]; then
  echo "not confirmed, nothing changed" >&2
  exit 1
fi

# --clean would drop only the dump's own objects and fail on a table of a
# later migration that refers to them (review M31): the whole schema goes
{
  echo "SET client_min_messages = warning;"
  echo "DROP SCHEMA IF EXISTS public CASCADE;"
  echo "CREATE SCHEMA public;"
  "$(pg_tool pg_restore)" --no-owner --no-privileges --file=- "$file"
} | "$(pg_tool psql)" -X -q -v ON_ERROR_STOP=1 --single-transaction \
  --dbname="$url" >/dev/null
echo "restored $file into $name on $server"
