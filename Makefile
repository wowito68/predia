# ── Docker ────────────────────────────────────────────────────────
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-build:
	docker compose build --no-cache

docker-restart:
	docker compose down && docker compose up -d

# ── Podman ────────────────────────────────────────────────────────
podman-up:
	podman-compose -f podman-compose.yml up -d

podman-down:
	podman-compose -f podman-compose.yml down

podman-logs:
	podman-compose -f podman-compose.yml logs -f

podman-build:
	podman-compose -f podman-compose.yml build --no-cache

podman-restart:
	podman-compose -f podman-compose.yml down && podman-compose -f podman-compose.yml up -d

# ── Estado ────────────────────────────────────────────────────────
status:
	@echo "═══════════════════════════════════════"
	@echo "  🐳 DOCKER containers"
	@echo "═══════════════════════════════════════"
	@docker ps --filter "name=diabetes-ai" --filter "name=predia-n8n" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  Docker no disponible"
	@echo ""
	@echo "═══════════════════════════════════════"
	@echo "  🦭 PODMAN containers"
	@echo "═══════════════════════════════════════"
	@podman ps --filter "name=diabetes-ai-podman" --filter "name=predia-n8n-podman" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  Podman no disponible"

# ── Atajos ────────────────────────────────────────────────────────
up: docker-up         # usa Docker por defecto
down: docker-down
logs: docker-logs

.PHONY: docker-up docker-down docker-logs docker-build docker-restart \
        podman-up podman-down podman-logs podman-build podman-restart \
        status up down logs