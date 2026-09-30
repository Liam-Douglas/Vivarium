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
# Needs a local PostgreSQL and permission to create databases. Not wired into
# CI: it would want a service container, which is a bigger decision than this
# script.
set -uo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
TESTS="$HERE/supabase/tests"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# psql runs as the postgres user, which cannot read a repo checkout under
# /home or /root. Stage the files somewhere it can.
cp "$TESTS/fixture.sql" "$TESTS/negative_rls.sql" "$WORK/"
mkdir -p "$WORK/breaks" && cp "$TESTS"/breaks/*.sql "$WORK/breaks/"
chmod -R a+rX "$WORK"

run_sql() { su postgres -c "psql -q -d $1 -v ON_ERROR_STOP=1 -f $2" >/dev/null 2>&1; }
fresh_db() {
  su postgres -c "dropdb --if-exists $1" >/dev/null 2>&1
  su postgres -c "createdb $1" >/dev/null 2>&1
  run_sql "$1" "$WORK/fixture.sql"
}

failures=0

echo "The test passes against a correct schema"
fresh_db rls_ok
if su postgres -c "psql -d rls_ok -v ON_ERROR_STOP=1 -f $WORK/negative_rls.sql" >/dev/null 2>&1; then
  echo "  ok"
else
  echo "  FAIL — the test does not pass against a schema with working policies"
  su postgres -c "psql -d rls_ok -f $WORK/negative_rls.sql" 2>&1 | grep -E "FAIL|CHECK|ERROR" | head -5
  failures=$((failures + 1))
fi

for break_file in "$WORK"/breaks/*.sql; do
  name="$(basename "$break_file" .sql)"
  echo "The test catches $name"
  fresh_db rls_broken
  run_sql rls_broken "$break_file"
  # A pass here is the failure: the final assertion in the test raises, so a
  # zero exit status means the break went unnoticed.
  if su postgres -c "psql -d rls_broken -v ON_ERROR_STOP=1 -f $WORK/negative_rls.sql" >/dev/null 2>&1; then
    echo "  FAIL — the test reported a pass against a database with this hole"
    failures=$((failures + 1))
  else
    echo "  ok"
  fi
done

su postgres -c "dropdb --if-exists rls_ok; dropdb --if-exists rls_broken" >/dev/null 2>&1

echo
if [ "$failures" -eq 0 ]; then
  echo "The negative RLS test passes what it should and catches what it should."
  exit 0
fi
echo "$failures problem(s) with the test itself."
exit 1
