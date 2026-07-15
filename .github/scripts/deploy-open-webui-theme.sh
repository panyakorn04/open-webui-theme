#!/usr/bin/env bash
set -Eeuo pipefail

: "${DEPLOY_IMAGE:?DEPLOY_IMAGE is required}"
: "${IMAGE_REPOSITORY:?IMAGE_REPOSITORY is required}"
: "${NEXT_PUBLIC_AI_MODELS:?NEXT_PUBLIC_AI_MODELS is required}"
: "${IMAGE_RETENTION:?IMAGE_RETENTION is required}"
: "${PUBLIC_DOMAIN:?PUBLIC_DOMAIN is required}"
: "${GHCR_USERNAME:?GHCR_USERNAME is required}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required}"

registry_host="${IMAGE_REPOSITORY%%/*}"
docker_config_dir="$(mktemp -d)"
export DOCKER_CONFIG="$docker_config_dir"
cleanup_registry_auth() {
  rm -rf "$docker_config_dir"
}
trap cleanup_registry_auth EXIT
printf '%s\n' "$GHCR_TOKEN" | docker login "$registry_host" --username "$GHCR_USERNAME" --password-stdin
unset GHCR_TOKEN

cd /opt/apps

compose_files=(-f docker-compose.yml -f docker-compose.open-webui-theme.yml)
ts="$(date +%Y%m%d-%H%M%S)"
caddy_backup="caddy/Caddyfile.bak.open-webui-theme.${ts}"
overlay_backup="docker-compose.open-webui-theme.yml.bak.${ts}"
had_overlay=0

test -f docker-compose.yml
test -f caddy/Caddyfile
cp caddy/Caddyfile "$caddy_backup"
if [ -f docker-compose.open-webui-theme.yml ]; then
  had_overlay=1
  cp docker-compose.open-webui-theme.yml "$overlay_backup"
fi

previous_image=""
if docker inspect open-webui-theme >/dev/null 2>&1; then
  previous_image="$(docker inspect --format='{{.Config.Image}}' open-webui-theme || true)"
fi
if [ -z "$previous_image" ] && [ "$had_overlay" -eq 1 ]; then
  previous_image="$(grep -E '^[[:space:]]*image:' docker-compose.open-webui-theme.yml | head -1 | awk '{print $2}' || true)"
fi

echo "Previous image: ${previous_image:-none}"
echo "Deploy image: ${DEPLOY_IMAGE}"

# Verify the previous image is still pullable before deploying the new one
if [ -n "$previous_image" ]; then
  echo "Verifying previous image is pullable: ${previous_image}"
  if docker pull "$previous_image" >/dev/null 2>&1; then
    echo "Previous image is pullable — rollback path is safe"
  else
    echo "Warning: could not pull previous image (${previous_image}) — rollback may use local cache"
  fi
fi

write_compose() {
  local image="$1"
  local models_json
  models_json="$(python3 -c 'import json, os; print(json.dumps(os.environ["NEXT_PUBLIC_AI_MODELS"]))')"
  cat > docker-compose.open-webui-theme.yml <<YAML
services:
  open-webui-theme:
    image: ${image}
    container_name: open-webui-theme
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: ""
      NEXT_PUBLIC_AI_MODELS: ${models_json}
    expose:
      - "3000"
YAML
}

health_check() {
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if docker exec caddy curl -sfS -o /dev/null --max-time 10 http://open-webui-theme:3000; then
      echo "open-webui-theme is reachable from caddy"
      break
    fi
    echo "Waiting for open-webui-theme... attempt ${attempt}/10"
    docker logs --tail=20 open-webui-theme || true
    sleep 3
  done

  docker exec caddy curl -sfS -o /dev/null --max-time 10 http://open-webui-theme:3000

  local tls_ready=0
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 20 \
      --resolve "${PUBLIC_DOMAIN}:443:127.0.0.1" \
      "https://${PUBLIC_DOMAIN}/" >/dev/null; then
      tls_ready=1
      break
    fi
    echo "Waiting for Caddy TLS route... attempt ${attempt}/10"
    sleep 3
  done
  if [ "$tls_ready" -ne 1 ]; then
    echo "Caddy TLS route did not become healthy for ${PUBLIC_DOMAIN}"
    return 1
  fi

  local path status
  for path in /api/ai/chat /api/ai/chat/stream; do
    status="$(curl -sS -o /tmp/open-webui-api-probe.txt -w '%{http_code}' \
      --max-time 20 \
      --resolve "${PUBLIC_DOMAIN}:443:127.0.0.1" \
      -H 'Content-Type: application/json' \
      --data-binary '{"invalid":' \
      "https://${PUBLIC_DOMAIN}${path}")"
    case "$status" in
      400|401|403|405|415|422|429)
        ;;
      *)
        echo "Backend route ${path} returned unexpected HTTP ${status}"
        return 1
        ;;
    esac
  done

  status="$(curl -sS -o /dev/null -w '%{http_code}' \
    --max-time 20 \
    --resolve "${PUBLIC_DOMAIN}:443:127.0.0.1" \
    "https://${PUBLIC_DOMAIN}/api/not-public")"
  if [ "$status" != "404" ]; then
    echo "Unexpected public API exposure: /api/not-public returned HTTP ${status}"
    return 1
  fi
}

rollback_release() {
  local exit_code=$?
  trap - ERR
  set +e
  echo "Deployment failed; restoring previous Compose and Caddy configuration"

  cp "$caddy_backup" caddy/Caddyfile
  if [ "$had_overlay" -eq 1 ]; then
    cp "$overlay_backup" docker-compose.open-webui-theme.yml
  elif [ -n "$previous_image" ]; then
    write_compose "$previous_image"
  else
    rm -f docker-compose.open-webui-theme.yml
  fi

  local rollback_files=(-f docker-compose.yml)
  if [ -f docker-compose.open-webui-theme.yml ]; then
    rollback_files=("${compose_files[@]}")
  fi

  docker compose "${rollback_files[@]}" config >/dev/null
  if [ -f docker-compose.open-webui-theme.yml ]; then
    docker compose "${rollback_files[@]}" pull open-webui-theme || true
    docker compose "${rollback_files[@]}" up -d open-webui-theme caddy
  else
    docker compose "${rollback_files[@]}" up -d caddy
  fi
  docker exec caddy caddy validate --config /etc/caddy/Caddyfile
  docker exec caddy caddy reload --config /etc/caddy/Caddyfile

  if [ -n "$previous_image" ] && health_check; then
    echo "$previous_image" > .open-webui-theme-current-image
    echo "Rollback succeeded"
  else
    echo "Rollback restored configuration, but application health could not be confirmed"
  fi
  exit "$exit_code"
}
trap rollback_release ERR

write_compose "$DEPLOY_IMAGE"

python3 - <<'PY'
import os
from pathlib import Path

path = Path("caddy/Caddyfile")
text = path.read_text()
domain = os.environ["PUBLIC_DOMAIN"]
legacy_domain = "ai.panyakorn.com"


def remove_site_block(source: str, marker: str) -> str:
    start = source.find(f"{marker} {{")
    if start == -1:
        return source
    depth = 0
    for index in range(start, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[:start].rstrip() + "\n\n" + source[index + 1 :].lstrip()
    raise SystemExit(f"Could not parse {marker} Caddy block")


text = remove_site_block(text, domain)
if legacy_domain != domain:
    text = remove_site_block(text, legacy_domain)

block = f'''{domain} {{
  @public_chat path /api/ai/chat /api/ai/chat/stream
  handle @public_chat {{
    reverse_proxy backend:8888
  }}

  handle /api/* {{
    respond "Not Found" 404
  }}

  handle {{
    reverse_proxy open-webui-theme:3000
  }}
}}
'''
path.write_text(text.rstrip() + "\n\n" + block)
PY

docker compose "${compose_files[@]}" config >/dev/null
docker compose "${compose_files[@]}" pull open-webui-theme
docker compose "${compose_files[@]}" up -d open-webui-theme caddy
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
docker compose "${compose_files[@]}" ps open-webui-theme caddy
health_check

trap - ERR
echo "$DEPLOY_IMAGE" > .open-webui-theme-current-image
docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' "$IMAGE_REPOSITORY" \
  | awk 'NR > '"$IMAGE_RETENTION"' {print $1}' \
  | xargs -r docker image rm || true
docker image prune -f --filter "until=168h" || true
