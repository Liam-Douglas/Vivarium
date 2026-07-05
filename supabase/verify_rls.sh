#!/usr/bin/env bash
# ============================================================================
# verify_rls.sh — check the live RLS posture of the Vivarium Supabase project.
#
# Probes ACCESS ONLY (HTTP status + row counts). It never prints animal,
# licence, or address data. Safe to run against production.
#
# Usage:
#   # reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local or env
#   ./supabase/verify_rls.sh
#
#   # or pass explicitly
#   SUPABASE_URL=https://xxxx.supabase.co ANON_KEY=sb_publishable_... ./supabase/verify_rls.sh
#
#   # optionally test as a logged-in user (paste an access_token from the app;
#   # DevTools > Application > Local Storage > sb-*-auth-token > access_token):
#   USER_JWT=eyJ... ./supabase/verify_rls.sh
#
# Run it BEFORE and AFTER applying migrations/0001_rls_policies.sql to confirm
# the exposure is closed.
# ============================================================================
set -euo pipefail

# Load .env.local if present (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
if [ -f .env.local ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env.local; set +a
fi

URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
ANON="${ANON_KEY:-${VITE_SUPABASE_ANON_KEY:-}}"

if [ -z "$URL" ] || [ -z "$ANON" ]; then
  echo "Missing URL/key. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL/ANON_KEY)." >&2
  exit 1
fi

TABLES=(animals animal_photos households household_members profiles \
        vet_contacts feeding_logs shedding_logs weight_logs health_events \
        acquisition_records exit_records breeding_records medication_schedules \
        medication_logs enclosures feeder_items feeder_stock_events expenses)

probe() { # $1 = role label, $2 = bearer token
  local label="$1" token="$2"
  echo
  echo "== Probing as ${label} =="
  printf "%-22s %-6s %-11s %s\n" "TABLE" "HTTP" "ROWS" "VERDICT"
  for t in "${TABLES[@]}"; do
    local code cr count verdict
    code=$(curl -s -o /dev/null -D /tmp/_h.txt -w "%{http_code}" \
      "$URL/rest/v1/$t?select=id&limit=1" \
      -H "apikey: $ANON" -H "Authorization: Bearer $token" \
      -H "Prefer: count=exact" -H "Range: 0-0" || echo "000")
    cr=$(grep -i '^content-range:' /tmp/_h.txt | tr -d '\r' | awk '{print $2}')
    count="${cr##*/}"
    if [ "$code" = "200" ]; then
      if [ -z "$count" ] || [ "$count" = "0" ] || [ "$count" = "*" ]; then
        verdict="ok — no rows visible"
      else
        verdict="!! VISIBLE (${count} rows) — expected 0 for this role"
      fi
    elif [ "$code" = "401" ] || [ "$code" = "403" ]; then verdict="ok — denied"
    elif [ "$code" = "404" ]; then verdict="not exposed"
    else verdict="? ($code)"; fi
    printf "%-22s %-6s %-11s %s\n" "$t" "$code" "${count:-–}" "$verdict"
  done
}

echo "Project: $URL"
# As anonymous (no user). With correct RLS, every data table should show 0 rows.
probe "ANONYMOUS (no login)" "$ANON"

# As a logged-in user, if a token was provided. This shows only YOUR household's
# rows — it does NOT prove cross-tenant isolation on its own (for that, sign in
# as a user in household B and confirm you cannot fetch a household-A row id).
if [ -n "${USER_JWT:-}" ]; then
  probe "AUTHENTICATED USER" "$USER_JWT"
fi

echo
echo "Interpretation:"
echo "  • Any 'VISIBLE' row for ANONYMOUS = RLS missing/disabled on that table (critical)."
echo "  • After applying 0001_rls_policies.sql, anonymous should be 0 rows everywhere."
echo "  • True cross-tenant test: sign in as household B, try to GET a household-A"
echo "    row by id (…/rest/v1/animals?id=eq.<A_id>) — expect 0 rows."
