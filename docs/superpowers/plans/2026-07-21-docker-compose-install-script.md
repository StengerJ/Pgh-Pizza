# Docker Compose Install Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `scripts/install-and-run-linux.sh` so it deploys the whole app (Caddy, frontend, backend, Postgres) via the existing `docker-compose.yml`/`Caddyfile` instead of the current hybrid systemd/nginx/certbot path, fixing the `.env`-sourcing crash bug along the way.

**Architecture:** Extract the `.env` parsing/validation logic into a small sourceable library (`scripts/lib/env-checks.sh`) with pure functions that never `source`/`eval` the `.env` file, so it can be unit-tested with plain bash on any platform. Rewrite `scripts/install-and-run-linux.sh` to source that library and orchestrate: verify Docker is present, ensure the Docker daemon is running, require and validate `.env`, clean up any leftover hybrid-mode services (host nginx, old backend systemd unit), then `docker compose up -d --build`, wait for all four services to report running, and print a summary. All hybrid-mode-only code (Java/Node host install, JAR build, nginx site generation, certbot) is deleted.

**Tech Stack:** Bash (POSIX-ish, targets Linux with systemd + Docker Compose v2 plugin), no new dependencies.

## Global Constraints

- Never `source` or `eval` values read from `.env` — this is the exact bug being fixed (`Admin: command not found`). All `.env` reads go through the safe line-splitting parser in `scripts/lib/env-checks.sh`.
- Do not add any Docker installation step — the script only verifies `docker` and `docker compose` are present and errors out with an install pointer if not (per user decision).
- Do not add host firewall (ufw) configuration — out of scope (per user decision).
- Do not auto-generate `.env` — the script must require a pre-existing, already-edited `.env` and fail fast with a `cp .env.example .env` hint if missing (per user decision).
- Required `.env` keys to validate (non-empty, not a `.env.example` placeholder): `PGH_SITE_ADDRESS`, `PGH_TLS_SERVER_NAME`, `PGH_FRONTEND_BASE_URL`, `PGH_POSTGRES_PASSWORD`, `PGH_JWT_SECRET`, `PGH_ADMIN_EMAIL`, `PGH_ADMIN_PASSWORD`.
- `docker-compose.yml` service names are `caddy`, `postgres`, `backend`, `frontend` — the wait/verify step must confirm all four are running.
- Spec reference: `docs/superpowers/specs/2026-07-21-docker-compose-install-script-design.md`.

---

### Task 1: Safe `.env` parsing/validation library

**Files:**
- Create: `scripts/lib/env-checks.sh`
- Create: `scripts/lib/env-checks.test.sh`

**Interfaces:**
- Produces (used by Task 2):
  - `env_parse_file "<path>"` — populates global associative array `ENV_VALUES` with `KEY -> VALUE` pairs from a `KEY=VALUE` file, stripping one layer of surrounding matching quotes from each value. Skips blank lines, lines starting with `#`, and any line whose key isn't a valid `[A-Za-z0-9_]+` identifier. Never sources or evals the file.
  - `REQUIRED_ENV_KEYS` — array of the required key names (see Global Constraints).
  - `env_validate_required` — reads `ENV_VALUES` (must be populated first via `env_parse_file`), checks every key in `REQUIRED_ENV_KEYS` is present, non-empty, and not a placeholder (substring `replace-with-`). Prints one `... >&2` line per problem. Returns `0` if all required keys are valid, `1` otherwise.

This library has no top-level executable statements — only function/array definitions — so it is safe to `source` from a test script on any platform (including this Windows dev machine's git-bash), without triggering any Linux/systemd/Docker checks.

- [ ] **Step 1: Write `scripts/lib/env-checks.sh`**

```bash
#!/usr/bin/env bash
# Safe .env reading and validation helpers.
#
# These functions never `source` or `eval` .env file contents. A .env value
# containing spaces or shell metacharacters (e.g. an unquoted display name)
# must never be able to run as a second shell command.

REQUIRED_ENV_KEYS=(
  PGH_SITE_ADDRESS
  PGH_TLS_SERVER_NAME
  PGH_FRONTEND_BASE_URL
  PGH_POSTGRES_PASSWORD
  PGH_JWT_SECRET
  PGH_ADMIN_EMAIL
  PGH_ADMIN_PASSWORD
)

declare -gA ENV_VALUES

# Strips one layer of surrounding matching single or double quotes.
env_strip_quotes() {
  local value="$1"

  if [ "${#value}" -ge 2 ]; then
    case "$value" in
      '"'*'"')
        value="${value#\"}"
        value="${value%\"}"
        ;;
      "'"*"'")
        value="${value#\'}"
        value="${value%\'}"
        ;;
    esac
  fi

  printf '%s' "$value"
}

# Populates the global ENV_VALUES associative array with KEY -> VALUE pairs
# read from a plain KEY=VALUE file. Blank lines and lines starting with '#'
# are skipped. Lines whose key is not a valid identifier are skipped.
env_parse_file() {
  local file="$1"
  local line key value

  ENV_VALUES=()

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

    case "$key" in
      ''|*[!A-Za-z0-9_]*) continue ;;
    esac

    ENV_VALUES["$key"]="$(env_strip_quotes "$value")"
  done < "$file"
}

# Returns 0 (true) if the value still looks like an unedited .env.example
# placeholder.
env_is_placeholder() {
  case "$1" in
    *replace-with-*) return 0 ;;
    *) return 1 ;;
  esac
}

# Validates ENV_VALUES (populated by env_parse_file) against
# REQUIRED_ENV_KEYS. Prints one error line per problem to stderr. Returns 1
# if any required key is missing, empty, or still a placeholder; returns 0
# if everything is valid.
env_validate_required() {
  local key value has_errors=0

  for key in "${REQUIRED_ENV_KEYS[@]}"; do
    value="${ENV_VALUES[$key]-}"

    if [ -z "$value" ]; then
      echo "Missing or empty required .env key: $key" >&2
      has_errors=1
      continue
    fi

    if env_is_placeholder "$value"; then
      echo "$key still has a placeholder value from .env.example -- edit .env before deploying." >&2
      has_errors=1
    fi
  done

  return "$has_errors"
}
```

- [ ] **Step 2: Write `scripts/lib/env-checks.test.sh`**

```bash
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
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `bash scripts/lib/env-checks.test.sh`

Expected: every line prints `PASS: ...`, followed by `N tests run, 0 failed`, and the command exits `0`. If any line prints `FAIL: ...`, fix `scripts/lib/env-checks.sh` (not the test) until all pass — the test fixtures above encode the exact bug being fixed, so a failure here means the parser still breaks on unquoted values with spaces.

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/env-checks.sh scripts/lib/env-checks.test.sh
git commit -m "$(cat <<'EOF'
Add safe .env parsing/validation library with tests

Replaces bash `source`-based .env loading, which crashes on any
unquoted value containing a space, with a line-splitting parser that
never sources or evals file contents.
EOF
)"
```

---

### Task 2: Rewrite `scripts/install-and-run-linux.sh` for Docker Compose deploy

**Files:**
- Modify: `scripts/install-and-run-linux.sh` (full rewrite of the body; delete all hybrid-mode-only functions)

**Interfaces:**
- Consumes from Task 1: `env_parse_file "<path>"`, `env_validate_required`, `ENV_VALUES` (associative array), `REQUIRED_ENV_KEYS` (array) — via `. "$ROOT_DIR/scripts/lib/env-checks.sh"`.

- [ ] **Step 1: Replace the full contents of `scripts/install-and-run-linux.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# shellcheck source=./lib/env-checks.sh
. "$ROOT_DIR/scripts/lib/env-checks.sh"

BACKEND_SERVICE_NAME="${PGH_BACKEND_SERVICE_NAME:-pgh-pizza-backend}"
COMPOSE_SERVICES=(caddy postgres backend frontend)
COMPOSE_WAIT_ATTEMPTS=30
COMPOSE_WAIT_SLEEP_SECONDS=2

if [ "$(uname -s)" != "Linux" ]; then
  echo "This script is intended for a Linux server." >&2
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "This script needs systemd, but systemctl was not found." >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null 2>&1; then
  echo "Run this script as root or install sudo for the current user." >&2
  exit 1
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker was not found on PATH. Install it first: https://get.docker.com" >&2
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "The 'docker compose' plugin was not found. Install the Docker Compose plugin, then re-run this script." >&2
    exit 1
  fi
}

ensure_docker_running() {
  $SUDO systemctl enable --now docker
}

require_valid_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "No .env file found at $ENV_FILE." >&2
    echo "Run: cp .env.example .env   then edit .env with real secrets before deploying." >&2
    exit 1
  fi

  env_parse_file "$ENV_FILE"

  if ! env_validate_required; then
    echo >&2
    echo ".env failed validation, see errors above. Fix .env and re-run this script." >&2
    exit 1
  fi
}

cleanup_legacy_hybrid_state() {
  if $SUDO systemctl cat "${BACKEND_SERVICE_NAME}.service" >/dev/null 2>&1; then
    echo "Found legacy ${BACKEND_SERVICE_NAME}.service from a prior hybrid install -- stopping and disabling it."
    $SUDO systemctl disable --now "${BACKEND_SERVICE_NAME}.service" || true
  fi

  if $SUDO systemctl is-active --quiet nginx 2>/dev/null; then
    echo "Found active host nginx from a prior hybrid install -- stopping and disabling it so Caddy can bind 80/443."
    $SUDO systemctl disable --now nginx || true
  fi
}

build_and_launch() {
  cd "$ROOT_DIR"
  $SUDO docker compose up -d --build
}

compose_service_is_in_list() {
  local target="$1"
  local list="$2"
  local line

  while IFS= read -r line; do
    if [ "$line" = "$target" ]; then
      return 0
    fi
  done <<< "$list"

  return 1
}

wait_for_services_running() {
  local attempt running_services service all_running

  cd "$ROOT_DIR"

  for attempt in $(seq 1 "$COMPOSE_WAIT_ATTEMPTS"); do
    running_services="$($SUDO docker compose ps --status running --services)"
    all_running=1

    for service in "${COMPOSE_SERVICES[@]}"; do
      if ! compose_service_is_in_list "$service" "$running_services"; then
        all_running=0
        break
      fi
    done

    if [ "$all_running" -eq 1 ]; then
      return 0
    fi

    sleep "$COMPOSE_WAIT_SLEEP_SECONDS"
  done

  echo "Timed out waiting for all services to report running: ${COMPOSE_SERVICES[*]}" >&2
  for service in "${COMPOSE_SERVICES[@]}"; do
    echo "--- docker compose logs --tail 80 $service ---" >&2
    $SUDO docker compose logs --tail 80 "$service" >&2 || true
  done
  exit 1
}

print_summary() {
  local public_url="${ENV_VALUES[PGH_FRONTEND_BASE_URL]}"

  echo
  echo "PGH-Pizza is deployed via Docker Compose."
  echo "Public URL: $public_url"
  echo
  echo "Useful checks:"
  echo "  $SUDO docker compose ps"
  echo "  $SUDO docker compose logs -f caddy"
  echo "  $SUDO docker compose logs -f backend"
  echo
  echo "To deploy an update later: git pull, then re-run this script."
}

require_docker
ensure_docker_running
require_valid_env_file
cleanup_legacy_hybrid_state
build_and_launch
wait_for_services_running
print_summary
```

- [ ] **Step 2: Syntax-check the script**

Run: `bash -n scripts/install-and-run-linux.sh`

Expected: no output, exit status `0`. This confirms the script parses as valid bash even though its runtime steps (systemd, Docker) can't be exercised on a non-Linux dev machine.

- [ ] **Step 3: Syntax-check the sourced library from within the script's own shebang context**

Run: `bash -n scripts/lib/env-checks.sh`

Expected: no output, exit status `0`.

- [ ] **Step 4: Commit**

```bash
git add scripts/install-and-run-linux.sh
git commit -m "$(cat <<'EOF'
Rework install-and-run-linux.sh to deploy via Docker Compose

Replaces the hybrid systemd/nginx/certbot deploy path with a thin
orchestration script around the existing docker-compose.yml/Caddyfile
stack (Caddy handles HTTPS automatically). Fixes the .env sourcing
crash by using the safe parser from scripts/lib/env-checks.sh instead
of `source`. Cleans up any leftover host nginx / backend systemd unit
from a prior hybrid install so Caddy can bind 80/443.
EOF
)"
```

---

### Task 3: Update `README.md`

**Files:**
- Modify: `README.md:68-149` (the "Linux Docker Compose Server" and "Linux Hybrid Server" sections)

**Interfaces:** None (documentation only).

- [ ] **Step 1: Fold the script into the "Linux Docker Compose Server" section and remove "Linux Hybrid Server"**

Replace the section currently spanning from `## Linux Docker Compose Server` (README.md:68) through the end of `## Linux Hybrid Server` (README.md:149) with:

```markdown
## Linux Docker Compose Server

From the repo root on a Linux server:

```bash
cp .env.example .env
nano .env
bash scripts/install-and-run-linux.sh
```

`scripts/install-and-run-linux.sh` verifies Docker and the Compose plugin are
installed, requires that `.env` exists and has real (non-placeholder) values for
the required keys, stops any leftover host nginx / backend systemd service from an
older hybrid-mode install, then runs `docker compose up -d --build` and waits for
every service to report running. Re-run it after a `git pull` to deploy updates --
`docker compose up -d --build` only rebuilds what changed.

If you'd rather run the underlying commands yourself instead of the script:

```bash
cp .env.example .env
nano .env
docker compose up -d --build
```

The compose stack runs Caddy as the public web entrypoint, the Angular frontend as a
private Nginx container, the Spring Boot backend as a private Java container, and
PostgreSQL as a private database container with a persistent Docker volume.

- `pgh-pizza-caddy`: publicly exposed on `${FRONTEND_PORT:-80}` and `${HTTPS_PORT:-443}`.
- `pgh-pizza-frontend`: private container serving Angular and proxying `/api`.
- `pgh-pizza-backend`: private Spring Boot API container.
- `pgh-pizza-postgres`: private PostgreSQL container using `pgh-pizza-postgres-data`.

For a public domain, point your domain's `A` record at the Droplet, then set:

```bash
PGH_SITE_ADDRESS="pghpizza.org, www.pghpizza.org"
PGH_TLS_SERVER_NAME=pghpizza.org
PGH_FRONTEND_BASE_URL=https://pghpizza.org
FRONTEND_PORT=80
HTTPS_PORT=443
```

With `PGH_SITE_ADDRESS="pghpizza.org, www.pghpizza.org"`, Caddy automatically requests and renews HTTPS
certificates. To use HTTPS directly on the Droplet's public IPv4 address, use the bare
IPv4 address as the Caddy site address:

```bash
PGH_SITE_ADDRESS=YOUR_DROPLET_PUBLIC_IP
PGH_TLS_SERVER_NAME=YOUR_DROPLET_PUBLIC_IP
PGH_FRONTEND_BASE_URL=https://YOUR_DROPLET_PUBLIC_IP
FRONTEND_PORT=80
HTTPS_PORT=443
```

To test by public IP over plain HTTP instead, prefix the site address with `http://`:

```bash
PGH_SITE_ADDRESS=http://YOUR_DROPLET_PUBLIC_IP
PGH_TLS_SERVER_NAME=localhost
PGH_FRONTEND_BASE_URL=http://YOUR_DROPLET_PUBLIC_IP
```

For DigitalOcean firewall rules, allow public inbound `80` and `443`, restrict `22` to
your IP, and keep `8080` and `5432` closed to the public internet.

For password reset emails with Brevo, authenticate `pghpizza.org` in Brevo, add the DNS
records Brevo gives you in Squarespace, create a sender like `no-reply@pghpizza.org`,
then set:

```bash
SMTP_ENABLED=true
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_USERNAME=your-brevo-smtp-login
SMTP_PASSWORD=your-brevo-smtp-key
SMTP_FROM=no-reply@pghpizza.org
SMTP_AUTH=true
SMTP_STARTTLS=false
```

Useful server checks:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f backend
```
```

This removes the old `## Linux Hybrid Server` heading and its `bash scripts/install-and-run-linux.sh` one-liner entirely, since the script no longer performs that deployment mode.

- [ ] **Step 2: Verify the section renders as intended**

Run: `grep -n "^## Linux" README.md`

Expected output: exactly one match, `68:## Linux Docker Compose Server` (line number may shift slightly) -- confirming `## Linux Hybrid Server` no longer exists anywhere in the file.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
Document install-and-run-linux.sh as the Docker Compose deploy path

Removes the Linux Hybrid Server section, which described a deployment
mode the script no longer performs.
EOF
)"
```

---

### Task 4: Final verification pass

**Files:** None created or modified -- this task only runs checks across the files from Tasks 1-3.

**Interfaces:** None.

- [ ] **Step 1: Re-run the env-checks test suite**

Run: `bash scripts/lib/env-checks.test.sh`

Expected: `N tests run, 0 failed`, exit status `0`.

- [ ] **Step 2: Syntax-check both shell files**

Run: `bash -n scripts/install-and-run-linux.sh && bash -n scripts/lib/env-checks.sh && echo OK`

Expected: `OK`.

- [ ] **Step 3: Confirm no leftover references to deleted hybrid-mode functions**

Run: `grep -n "install_nginx_site\|install_certbot\|install_backend_service\|build_frontend\|build_backend\|FRONTEND_WEB_ROOT\|SYSTEMD_ENV_FILE" scripts/install-and-run-linux.sh`

Expected: no output (exit status `1`, meaning no matches) -- confirms the hybrid-mode-only functions were fully removed, not just unreferenced.

- [ ] **Step 4: Confirm the README no longer mentions the hybrid deployment mode**

Run: `grep -n "Hybrid" README.md`

Expected: no output.

- [ ] **Step 5: Commit any fixups from this verification pass, if needed**

Only run this if Steps 1-4 required changes:

```bash
git add -u
git commit -m "$(cat <<'EOF'
Fix issues found during final verification pass
EOF
)"
```

If Steps 1-4 all passed cleanly with no changes needed, skip this step -- there is nothing to commit.
