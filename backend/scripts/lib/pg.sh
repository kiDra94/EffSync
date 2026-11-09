# Helpers for backup.sh, restore.sh and restore-drill.sh (GOALS.md M31).

# DATABASE_URL as libpq takes it, without the password (use_url_password
# passes it in PGPASSWORD, so it isn't on the command line where `ps` shows
# it) and without Prisma's own parameters, which libpq rejects. A parameter
# that would point libpq at another database than the one in the path is
# refused, so the name the scripts check and confirm is the one they use.
libpq_url() {
  local url="$1" base query kept=() param
  base="${url%%\?*}"
  # drop the password: scheme://user:password@host → scheme://user@host
  if [[ "$base" =~ ^([a-z]+://[^:/@]+):[^@]*@(.*)$ ]]; then
    base="${BASH_REMATCH[1]}@${BASH_REMATCH[2]}"
  fi
  if [[ "$url" == *\?* ]]; then
    query="${url#*\?}"
    IFS='&' read -ra params <<<"$query"
    for param in "${params[@]}"; do
      case "${param%%=*}" in
        dbname | host | hostaddr | port | user | password | service)
          echo "refusing the URL parameter ${param%%=*}: name the database in the path" >&2
          return 1
          ;;
        schema | connection_limit | pool_timeout | socket_timeout | pgbouncer | statement_cache_size | sslaccept) ;;
        *) kept+=("$param") ;;
      esac
    done
  fi
  if ((${#kept[@]})); then
    (IFS='&' && echo "$base?${kept[*]}")
  else
    echo "$base"
  fi
}

# exports the URL's password (percent-decoded) as PGPASSWORD, if it has one
use_url_password() {
  local base="${1%%\?*}" password
  if [[ "$base" =~ ^[a-z]+://[^:/@]+:([^@]*)@ ]]; then
    password="${BASH_REMATCH[1]}"
    printf -v PGPASSWORD '%b' "${password//%/\\x}"
    export PGPASSWORD
  fi
}

# the database name of a URL
db_name() {
  local path="${1%%\?*}"
  echo "${path##*/}"
}

# host:port of a URL, for the restore's confirmation
db_server() {
  local path="${1%%\?*}" authority
  authority="${path#*://}"
  authority="${authority%%/*}"
  echo "${authority##*@}"
}

# the URL with another database name
with_db() {
  local url="$1" name="$2" path query=""
  path="${url%%\?*}"
  [[ "$url" == *\?* ]] && query="?${url#*\?}"
  echo "${path%/*}/$name$query"
}

# pg_dump, pg_restore or psql, from PG_BINDIR if set: the client must be at
# least the server's major version (PostgreSQL 17)
pg_tool() {
  echo "${PG_BINDIR:+$PG_BINDIR/}$1"
}
