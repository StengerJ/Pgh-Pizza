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
