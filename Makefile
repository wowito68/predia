# ── Docker ────────────────────────────────────────────────────────
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-build:
	docker compose build --no-cache

# ── Podman ────────────────────────────────────────────────────────
podman-up:
	podman-compose -f podman-compose.yml up -d

podman-down:
	podman-compose -f podman-compose.yml down

podman-logs:
	podman-compose -f podman-compose.yml logs -f

podman-build:
	podman-compose -f podman-compose.yml build --no-cache

# ── Atajos ────────────────────────────────────────────────────────
up: podman-up      # cambia a docker-up si prefieres Docker por defecto
down: podman-down
logs: podman-logs