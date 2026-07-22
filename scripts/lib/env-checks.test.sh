#!/usr/bin/env bash
# Plain-bash tests for scripts/lib/env-checks.sh. No external dependencies
# (no bats) so this runs anywhere bash does, including on a non-Linux dev
# machine.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./env-checks.sh
. "$SCRIPT_DIR/env-checks.sh"

TESTS_RUN=0
TESTS_FAILED=0

assert_eq() {
  local description="$1"
  local expected="$2"
  local actual="$3"

  TESTS_RUN=$((TESTS_RUN + 1))
  if [ "$expected" != "$actual" ]; then
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "FAIL: $description"
    echo "  expected: $expected"
    echo "  actual:   $actual"
  else
    echo "PASS: $description"
  fi
}

assert_status() {
  local description="$1"
  local expected_status="$2"
  local actual_status="$3"

  TESTS_RUN=$((TESTS_RUN + 1))
  if [ "$expected_status" != "$actual_status" ]; then
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "FAIL: $description"
    echo "  expected exit status: $expected_status"
    echo "  actual exit status:   $actual_status"
  else
    echo "PASS: $description"
  fi
}

make_env_file() {
  local file
  file="$(mktemp)"
  cat > "$file"
  printf '%s' "$file"
}

# --- env_parse_file: unquoted value with a space must not break parsing ---
# This is the exact shape of the original bug: PGH_ADMIN_DISPLAY_NAME=PGH Admin
env_file="$(make_env_file <<'EOF'
# comment line
PGH_ADMIN_DISPLAY_NAME=PGH Admin
PGH_JWT_SECRET="quoted-secret-value"
PGH_POSTGRES_PASSWORD='single-quoted-password'
EMPTY_VALUE=

not a valid key line
EOF
)"
env_parse_file "$env_file"
rm -f "$env_file"

assert_eq "unquoted value with a space is captured verbatim, not executed" \
  "PGH Admin" "${ENV_VALUES[PGH_ADMIN_DISPLAY_NAME]-}"
assert_eq "double-quoted value has quotes stripped" \
  "quoted-secret-value" "${ENV_VALUES[PGH_JWT_SECRET]-}"
assert_eq "single-quoted value has quotes stripped" \
  "single-quoted-password" "${ENV_VALUES[PGH_POSTGRES_PASSWORD]-}"
assert_eq "empty value parses to empty string" \
  "" "${ENV_VALUES[EMPTY_VALUE]-unset}"
assert_eq "line with no '=' key is skipped (no crash)" \
  "unset" "${ENV_VALUES[not]-unset}"

# --- env_validate_required: all required keys present and valid ---
env_file="$(make_env_file <<'EOF'
PGH_SITE_ADDRESS=pghpizza.org
PGH_TLS_SERVER_NAME=pghpizza.org
PGH_FRONTEND_BASE_URL=https://pghpizza.org
PGH_POSTGRES_PASSWORD=a-real-password
PGH_JWT_SECRET=a-real-jwt-secret-value
PGH_ADMIN_EMAIL=admin@pghpizza.org
PGH_ADMIN_PASSWORD=a-real-admin-password
EOF
)"
env_parse_file "$env_file"
rm -f "$env_file"

env_validate_required >/dev/null 2>&1
assert_status "fully-populated, non-placeholder .env passes validation" "0" "$?"

# --- env_validate_required: missing key fails ---
env_file="$(make_env_file <<'EOF'
PGH_SITE_ADDRESS=pghpizza.org
PGH_TLS_SERVER_NAME=pghpizza.org
PGH_FRONTEND_BASE_URL=https://pghpizza.org
PGH_POSTGRES_PASSWORD=a-real-password
PGH_JWT_SECRET=a-real-jwt-secret-value
PGH_ADMIN_EMAIL=admin@pghpizza.org
EOF
)"
env_parse_file "$env_file"
rm -f "$env_file"

env_validate_required >/dev/null 2>&1
assert_status "missing PGH_ADMIN_PASSWORD fails validation" "1" "$?"

# --- env_validate_required: leftover .env.example placeholder fails ---
env_file="$(make_env_file <<'EOF'
PGH_SITE_ADDRESS=pghpizza.org
PGH_TLS_SERVER_NAME=pghpizza.org
PGH_FRONTEND_BASE_URL=https://pghpizza.org
PGH_POSTGRES_PASSWORD=replace-with-a-strong-postgres-password
PGH_JWT_SECRET=a-real-jwt-secret-value
PGH_ADMIN_EMAIL=admin@pghpizza.org
PGH_ADMIN_PASSWORD=a-real-admin-password
EOF
)"
env_parse_file "$env_file"
rm -f "$env_file"

env_validate_required >/dev/null 2>&1
assert_status "leftover 'replace-with-' placeholder fails validation" "1" "$?"

echo
echo "$TESTS_RUN tests run, $TESTS_FAILED failed"
[ "$TESTS_FAILED" -eq 0 ]
