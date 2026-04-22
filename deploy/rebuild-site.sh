#!/bin/bash
# rebuild-site.sh
# ---------------
# Pulls the latest code from GitLab and rebuilds the self-hosted
# Docker container. Called by webhook-listener.py when main branch updates.
#
# Why a separate script (not inline in the Python listener):
#   - Easier to test manually: just run this script directly
#   - Cleaner separation: Python handles HTTP/auth, bash handles Docker
#   - Easier to modify the deploy steps without touching the listener
#
# Run manually to test:
#   bash ~/deploy/rebuild-site.sh
#
# Watch the live log:
#   tail -f ~/logs/deploy.log

set -euo pipefail

# --------------------------------------------------------------------------
# Configuration — adjust these paths to match your server setup
# --------------------------------------------------------------------------

# Where the repo is cloned on the host.
# This should be a git clone of your GitLab repo (not the GitHub mirror).
SITE_DIR="$HOME/sites/local-website-ai-integration"

# Log file (webhook-listener.py also writes here)
LOG_FILE="$HOME/logs/deploy.log"

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# --------------------------------------------------------------------------
# Main deploy sequence
# --------------------------------------------------------------------------

log "=========================================="
log "Deploy started"
log "=========================================="

# Verify the site directory exists before doing anything
if [ ! -d "$SITE_DIR" ]; then
    log "ERROR: Site directory not found at $SITE_DIR"
    log "Run: git clone git@gitlab.com:YOUR_USER/YOUR_REPO.git $SITE_DIR"
    exit 1
fi

cd "$SITE_DIR"

# --- Pull latest code ---
# Why: The webhook fires after GitLab receives the push, but the code
# needs to be pulled to the server before Docker can build from it.
log "Pulling latest from GitLab main..."
git fetch origin main >> "$LOG_FILE" 2>&1
git reset --hard origin/main >> "$LOG_FILE" 2>&1
log "Git pull complete — $(git log -1 --oneline)"

# --- Build new Docker image ---
# Why --no-cache: Next.js builds are sensitive to cached layers if dependencies
# change. --no-cache ensures a clean build every time. Slower, but reliable.
# If build time becomes a problem, remove --no-cache and add cache-busting logic.
log "Building Docker image..."
docker compose build --no-cache >> "$LOG_FILE" 2>&1
log "Docker build complete"

# --- Swap containers ---
# Why 'up -d' after build: docker compose up -d starts the new container
# from the freshly built image and stops the old one. The gap between
# old container stopping and new one starting is typically 2-5 seconds.
# For a low-traffic site this is acceptable. See README for blue-green
# upgrade path if zero-downtime becomes a requirement.
log "Starting new container..."
docker compose up -d >> "$LOG_FILE" 2>&1
log "Container is up"

# --- Verify the site is responding ---
# Why: Gives us a basic sanity check that the new container actually started
# and Next.js is serving. If this fails the log will show it clearly.
log "Waiting 10 seconds for Next.js to initialize..."
sleep 10

if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log "Health check passed — site is responding on port 3000"
else
    log "WARNING: Health check failed — site may not be serving correctly"
    log "Check: docker compose logs"
fi

# --- Clean up old images ---
# Why: Docker accumulates dangling images (old builds) over time and they
# consume disk space. This removes only dangling (untagged) images, not
# any images you've explicitly tagged or are actively using.
log "Cleaning up dangling Docker images..."
docker image prune -f >> "$LOG_FILE" 2>&1

log "=========================================="
log "Deploy complete"
log "=========================================="
