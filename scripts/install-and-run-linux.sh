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
  local compose_project_label

  if $SUDO systemctl cat "${BACKEND_SERVICE_NAME}.service" >/dev/null 2>&1; then
    echo "Found legacy ${BACKEND_SERVICE_NAME}.service from a prior hybrid install -- stopping and disabling it."
    $SUDO systemctl disable --now "${BACKEND_SERVICE_NAME}.service" || true
  fi

  if $SUDO systemctl is-active --quiet nginx 2>/dev/null; then
    echo "Found active host nginx from a prior hybrid install -- stopping and disabling it so Caddy can bind 80/443."
    $SUDO systemctl disable --now nginx || true
  fi

  if $SUDO docker inspect "pgh-pizza-postgres" >/dev/null 2>&1; then
    compose_project_label="$($SUDO docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' "pgh-pizza-postgres" 2>/dev/null)"
    if [ -z "$compose_project_label" ]; then
      echo "Found leftover standalone pgh-pizza-postgres container from a prior hybrid install -- removing it so Docker Compose can manage it (its data volume is preserved)."
      $SUDO docker rm -f "pgh-pizza-postgres" || true
    fi
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
