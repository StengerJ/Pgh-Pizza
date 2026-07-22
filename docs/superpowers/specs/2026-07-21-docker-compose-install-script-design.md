# Docker Compose Install Script — Design

## Problem

`scripts/install-and-run-linux.sh` currently deploys in a "hybrid" mode: it uses
Docker only for Postgres, then builds and runs the backend as a systemd service and
the frontend via host nginx + certbot. This completely bypasses the
`docker-compose.yml` / `Caddyfile` already in the repo, which implement a full-Docker
deployment (Caddy, frontend, backend, Postgres as containers) with automatic HTTPS via
Caddy's built-in ACME support.

Running the script on the target server also surfaces a bug: the script writes/loads
`.env` by doing `. "$ENV_FILE"` (a raw bash `source`). Any `.env` value that isn't
valid shell syntax — e.g. an unquoted value containing a space — breaks sourcing. On
the target server, line 21 (`PGH_ADMIN_DISPLAY_NAME`) is an unquoted value with a
space, producing `Admin: command not found`.

The user wants one script that builds and deploys the entire app (frontend, backend,
SSL, Postgres) via Docker, keeps running after SSH logout, and is publicly reachable
at `pghpizza.org`.

## Decision

Rework `scripts/install-and-run-linux.sh` to drive the existing Docker Compose stack
instead of the hybrid systemd/nginx/certbot path. Delete the hybrid-mode code
entirely (Java/Node host install, JAR build, systemd unit for the backend, nginx site
generation, certbot) — none of it is needed once frontend/backend build inside their
own Dockerfiles and Caddy owns HTTPS.

Persistence after logout requires no extra process supervision: `docker compose up -d`
detaches immediately, every service in `docker-compose.yml` already has
`restart: unless-stopped`, and `docker.service` is enabled via systemd — so Docker's
own restart manager keeps containers running across logout and reboot.

## Script Behavior

Executed as root (or via sudo) on the target Linux server, from the repo root:

1. **Preflight** — must be running on Linux; must have `systemctl`.
2. **Verify Docker present** — check `docker` and `docker compose` (the Compose v2
   plugin) are on `PATH`. If missing, exit with an error pointing to
   `https://get.docker.com` — the script does not attempt to install Docker.
3. **Ensure Docker is running and enabled** — `systemctl enable --now docker`. This is
   a state check/ensure, not an install step; it's required so containers restart
   after a host reboot, not just after an SSH logout.
4. **Require a valid `.env`** — if `$ROOT_DIR/.env` doesn't exist, exit with a message
   telling the user to `cp .env.example .env` and edit it first. If it exists, parse it
   safely (see below) and validate:
   - Required keys are present and non-empty: `PGH_SITE_ADDRESS`,
     `PGH_TLS_SERVER_NAME`, `PGH_FRONTEND_BASE_URL`, `PGH_POSTGRES_PASSWORD`,
     `PGH_JWT_SECRET`, `PGH_ADMIN_EMAIL`, `PGH_ADMIN_PASSWORD`.
   - None of those values still contain the literal placeholder text from
     `.env.example` (e.g. `replace-with-`), so a half-edited `.env` fails loudly
     instead of deploying with a known-bad secret.

   **Safe parsing, not sourcing:** read `.env` line by line, skip blank lines and
   lines starting with `#`, split each remaining line on the first `=`
   (`key="${line%%=*}"`, `value="${line#*=}"`), and strip one layer of surrounding
   matching quotes from `value` for the placeholder/emptiness check. Values are never
   passed to `eval`, `source`, or executed as shell — this is what fixes the
   `Admin: command not found` crash class, since a value containing spaces or shell
   metacharacters can no longer be interpreted as a second command. The script does
   not need to export these values into its own environment: `docker compose`
   reads `.env` from the project directory itself.
5. **Clean up leftover hybrid-mode state** — idempotent, only acts if present:
   - If `pgh-pizza-backend.service` exists, stop and disable it.
   - If `nginx.service` is active, stop and disable it (frees port 80/443 for Caddy).
   No files are deleted, only services stopped/disabled, so this is safe to run
   whether or not a prior hybrid install ever happened.
6. **Build and launch** — `cd "$ROOT_DIR" && docker compose up -d --build`.
7. **Wait and verify** — poll `docker compose ps` (or equivalent) until the `caddy`,
   `frontend`, `backend`, and `postgres` services all report running/healthy, up to a
   timeout. On timeout or a container exiting, print that container's recent logs via
   `docker compose logs --tail 80 <service>` and exit non-zero — the script never
   claims success without confirming the containers are actually up.
8. **Print summary** — the public URL (`PGH_FRONTEND_BASE_URL` from `.env`), and the
   useful follow-up commands (`docker compose ps`, `docker compose logs -f <service>`).

Because every step from `.env` validation onward is idempotent and
`docker compose up -d --build` only rebuilds what changed, re-running this same
script after a `git pull` is the intended way to deploy updates. No separate
"update" script is needed.

## Out of scope

- Installing Docker itself (user already has it on the target server).
- Host firewall (ufw) configuration — the user manages inbound rules via the
  DigitalOcean cloud firewall panel.
- Auto-generating `.env` on first run — the user wants the existing
  `cp .env.example .env` + manual edit flow to remain required.
- DNS verification (checking that `pghpizza.org` actually resolves to the server) —
  left to the user; Caddy will simply log ACME failures if DNS isn't pointed
  correctly yet, which isn't fatal to the script.

## Documentation

Update `README.md`:
- Fold `scripts/install-and-run-linux.sh` into the existing "Linux Docker Compose
  Server" section as the one-command path (manual `docker compose up -d --build`
  steps stay documented as the equivalent underlying commands).
- Remove the "Linux Hybrid Server" section, since the script no longer performs that
  deployment mode.

## Testing

This is an infrastructure script for a remote Linux server; it can't be run against
production as a test. Verification will be:
- `bash -n scripts/install-and-run-linux.sh` (syntax check) and `shellcheck` if
  available, run locally.
- Manual review of each function against the steps above.
- The user running it on the actual target server as the real-world test, since a
  local Windows dev machine can't exercise systemd/Docker-on-Linux behavior.
