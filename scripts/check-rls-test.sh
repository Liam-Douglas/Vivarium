#!/usr/bin/env bash
# Does the negative RLS test still have teeth?
#
# supabase/tests/negative_rls.sql is run by hand against the live database, so
# nothing normally exercises it. A test nobody tests is how the CI build job
# spent months passing on a bundle with no application in it.
#
# This builds a miniature of the live schema in a local Postgres, runs the test
# against it (expecting a pass), then runs it against deliberately broken
# copies (expecting a failure from each). A break that goes undetected means
# the test has stopped covering that shape.
#
#   ./scripts/check-rls-test.sh
#
# Reaches PostgreSQL two ways, because the two places it runs differ:
#
#   PGHOST set    connect straight over TCP with the standard libpq variables.
#                 This is CI, against a service container.
#   PGHOST unset  become the postgres unix user, which is how a Debian or
#                 Ubuntu install expects a superuser to arrive.
#
# Either way it needs permission to create databases. CI runs it against a
# throwaway service container; see the rls-test job in .github/workflows/ci.yml.
set -uo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
TESTS="$HERE/supabase/tests"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Under `su postgres`, psql cannot read a repo checkout under /home or /root.
# Stage the files somewhere it can. Harmless on the TCP path.
cp "$TESTS/fixture.sql" "$TESTS/negative_rls.sql" "$WORK/"
mkdir -p "$WORK/breaks" && cp "$TESTS"/breaks/*.sql "$WORK/breaks/"
chmod -R a+rX "$WORK"

# `su -c` takes one string, so the arguments are requoted rather than passed
# through. Without that a path with a space would be split back apart.
if [ -n "${PGHOST:-}" ]; then
  as_super() { "$@"; }
else
  as_super() { su postgres -c "$(printf '%q ' "$@")"; }
fi

run_sql() { as_super psql -q -d "$1" -v ON_ERROR_STOP=1 -f "$2" >/dev/null 2>&1; }
run_sql_loud() { as_super psql -d "$1" -f "$2" 2>&1; }
fresh_db() {
  as_super dropdb --if-exists "$1" >/dev/null 2>&1
  as_super createdb "$1" >/dev/null 2>&1
  run_sql "$1" "$WORK/fixture.sql"
}

# A break case is judged by psql exiting non-zero, so anything that stops psql
# working — no server, no permission, a typo in a path — reads as "the test
# caught it". Every break would report a pass against a database that is not
# there. Check the server answers before trusting any of that.
if ! as_super psql -q -c 'select 1' >/dev/null 2>&1; then
  if [ -n "${PGHOST:-}" ]; then
    echo "Cannot reach PostgreSQL at ${PGHOST}:${PGPORT:-5432} as ${PGUSER:-the default user}."
  else
    echo "Cannot reach PostgreSQL as the postgres user. Start it first:"
    echo "  service postgresql start"
  fi
  echo "Without a server every check below would report a pass for the wrong reason."
  exit 1
fi

failures=0

echo "The test passes against a correct schema"
fresh_db rls_ok
if as_super psql -d rls_ok -v ON_ERROR_STOP=1 -f "$WORK/negative_rls.sql" >/dev/null 2>&1; then
  echo "  ok"
else
  echo "  FAIL — the test does not pass against a schema with working policies"
  run_sql_loud rls_ok "$WORK/negative_rls.sql" | grep -E "FAIL|CHECK|ERROR" | head -5
  failures=$((failures + 1))
fi

for break_file in "$WORK"/breaks/*.sql; do
  name="$(basename "$break_file" .sql)"
  echo "The test catches $name"
  fresh_db rls_broken
  run_sql rls_broken "$break_file"
  # A pass here is the failure: the final assertion in the test raises, so a
  # zero exit status means the break went unnoticed.
  if as_super psql -d rls_broken -v ON_ERROR_STOP=1 -f "$WORK/negative_rls.sql" >/dev/null 2>&1; then
    echo "  FAIL — the test reported a pass against a database with this hole"
    failures=$((failures + 1))
  else
    echo "  ok"
  fi
done

as_super dropdb --if-exists rls_ok >/dev/null 2>&1
as_super dropdb --if-exists rls_broken >/dev/null 2>&1

echo
if [ "$failures" -eq 0 ]; then
  echo "The negative RLS test passes what it should and catches what it should."
  exit 0
fi
echo "$failures problem(s) with the test itself."
exit 1
