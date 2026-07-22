# PGH-Pizza

PGH-Pizza is split into two top-level projects:

- `frontend/`: Angular application.
- `backend/`: Spring Boot REST API.

## How The App Works

PGH-Pizza is a container-ready Angular and Spring Boot application. Users open the
frontend in their browser, and the Angular app handles public pages like Home, Ratings,
Blog, Apply, and About Me. Anonymous users can view public content and submit contributor
applications. Approved contributors can create ratings and blog posts, while admins can
approve or reject contributor applications.

In container mode, the frontend runs as an Nginx container. Nginx serves the compiled
Angular files and proxies every `/api` request to the backend container over the Docker
network. This lets the browser use the same origin for the UI and API calls, while the
backend remains a separate Spring Boot service.

The backend validates requests, checks JWT roles, enforces contributor ownership rules,
hashes passwords with BCrypt, stores only hashed password reset tokens, and uses Flyway to
create or validate the PostgreSQL schema. Spring Data JPA repositories handle database
access with parameter binding, so user input is treated as data rather than executable SQL.

Errors are handled quietly in the UI. Client errors are logged to the browser console and
sent to `POST /api/client-logs`; backend errors are written to console output and the
backend log file at `backend/logs/pgh-pizza-api.log` or the container log volume.

## Information Flow

![PGH-Pizza frontend/backend information flow](docs/pgh-pizza-flow.svg)

## Contributor And Content Flow

![PGH-Pizza contributor and content data flow](docs/pgh-pizza-content-flow.svg)

## Local Development

Start PostgreSQL:

```powershell
docker compose up -d postgres
```

Start the backend:

```powershell
cd backend
.\mvnw spring-boot:run
```

Start the frontend:

```powershell
cd frontend
npm start
```

The frontend calls `/api`. During `npm start`, Angular proxies that to
`http://localhost:8080`. In containers, Nginx proxies `/api` to the backend container.
The backend uses PostgreSQL with database `pgh_pizza`, user `postgres`, and password
`postgres` by default.

The default local admin is `admin@pgh-pizza.local` / `ChangeMe123!`. Override it with
`PGH_ADMIN_EMAIL`, `PGH_ADMIN_PASSWORD`, and `PGH_ADMIN_DISPLAY_NAME`.

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
