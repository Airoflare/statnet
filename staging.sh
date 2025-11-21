#!/bin/bash
set -e
set -o pipefail

# ==================================================
# Import ENV from .env
# ==================================================
source ".env.staging"

# ==================================================
# GLOBAL VARIABLES
# ==================================================
START_TIME=$(date +%s)
SSH_PID=""

# ==================================================
# FUNCTIONS
# ==================================================
log() {
  echo "$(date +"%Y-%m-%d %H:%M:%S") - $1"
}

cleanup() {
  echo ""
  log "[ Cleanup ] Starting cleanup..."

  # Kill SSH tunnel if still active
  if [ -n "$SSH_PID" ] && ps -p "$SSH_PID" > /dev/null 2>&1; then
    kill "$SSH_PID" && log "[ Cleanup ] SSH tunnel terminated."
  fi

  # Remove local Docker registry
  if docker ps -a --filter "name=registry" | grep -q "registry"; then
    docker rm -f registry >/dev/null 2>&1 \
      && log "[ Cleanup ] Docker registry removed."
  fi

  END_TIME=$(date +%s)
  TOTAL=$((END_TIME - START_TIME))
  log "[ Done ] Runtime: ${TOTAL}s"
}

trap cleanup EXIT SIGINT SIGTERM

# ==================================================
# MAIN EXECUTION
# ==================================================
log "[ Runner ] Started."

# -------------------------------
# Step 1: Build Docker Image
# -------------------------------
log "[ Build ] Building Docker image..."
docker build -f Dockerfile -t "$IMAGE_NAME:$DOCKER_TAG" .

# Calculate human-readable size
IMAGE_SIZE_BYTES=$(docker image inspect "$IMAGE_NAME:$DOCKER_TAG" --format='{{.Size}}')
if [ "$IMAGE_SIZE_BYTES" -lt 1073741824 ]; then
  IMAGE_SIZE=$(awk "BEGIN {printf \"%.2f MB\", $IMAGE_SIZE_BYTES/1024/1024}")
else
  IMAGE_SIZE=$(awk "BEGIN {printf \"%.2f GB\", $IMAGE_SIZE_BYTES/1024/1024/1024}")
fi

log "[ Build ] Image built. Size: $IMAGE_SIZE"

# -------------------------------
# Step 2: Start Docker Registry
# -------------------------------
log "[ Registry ] Checking local registry..."
if ! docker ps -f "name=registry" -f "status=running" | grep -q registry; then
  docker run -d -p 5001:5000 --name registry --tmpfs /var/lib/registry registry:2
  log "[ Registry ] Started local registry."
else
  log "[ Registry ] Already running."
fi

# -------------------------------
# Step 3: Push Image → Local Registry
# -------------------------------
log "[ Push ] Tagging + pushing image..."
docker tag "$IMAGE_NAME:$DOCKER_TAG" "localhost:5001/$IMAGE_NAME:$DOCKER_TAG"
docker push "localhost:5001/$IMAGE_NAME:$DOCKER_TAG"

log "[ Push ] Image pushed to local registry."

# -------------------------------
# Step 4: Open SSH Tunnel (Stay Open)
# -------------------------------
echo ""
log "[ Tunnel ] Opening SSH tunnel to VPS."
log "[ Tunnel ] Tunnel will stay open until you press CTRL+C."
echo ""

# Run SSH tunnel in foreground so that CTRL+C closes it
ssh -i "$SSH_KEY_FILE" \
    -p "$VPS_PORT" \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -R 5000:localhost:5001 \
    "$VPS_USERNAME@$VPS_IP"

# When SSH exits, cleanup will run automatically.
