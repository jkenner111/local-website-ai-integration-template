#!/usr/bin/env python3
"""
GitLab Webhook Listener
----------------------------------
Listens for push events from GitLab on the main branch and triggers
a Docker container rebuild of the self-hosted Next.js site.

Why this approach:
  - GitLab sends a POST to this service when main branch is updated
  - We verify the request is genuinely from GitLab using a shared secret token
  - The actual rebuild is delegated to rebuild-site.sh (keeps concerns separate)
  - Subprocess runs the rebuild in the background so the webhook returns
    immediately (GitLab expects a fast response, not to wait for a Docker build)

Setup:
  1. Copy this file to the server at ~/deploy/webhook-listener.py
  2. Set GITLAB_WEBHOOK_TOKEN in your environment (or .env file)
  3. Enable and start the systemd service (see site-webhook.service)
  4. Add a Push webhook in GitLab pointing to your Cloudflare tunnel URL

Security model:
  - GitLab token header is compared in constant time to prevent timing attacks
  - Only push events to 'refs/heads/main' trigger a rebuild
  - Rebuild script runs as the same user as this service (not root)
"""

import os
import hmac
import subprocess
import logging
from pathlib import Path
from flask import Flask, request, jsonify

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

# Load token from environment variable.
# Set this in /etc/systemd/system/site-webhook.service or ~/.config/systemd/user/
# Never hardcode this value here.
GITLAB_WEBHOOK_TOKEN = os.environ.get("GITLAB_WEBHOOK_TOKEN", "")

# Port this listener runs on. Cloudflare tunnel will forward to this port.
# Pick something that doesn't conflict with your existing services on the host.
LISTEN_PORT = int(os.environ.get("WEBHOOK_PORT", "9876"))

# Absolute path to the rebuild script.
# Adjust if you place the deploy/ folder somewhere else on the host.
REBUILD_SCRIPT = Path(__file__).parent / "rebuild-site.sh"

# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path.home() / "logs" / "webhook.log"),
    ],
)
log = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint. Useful for verifying the tunnel is working."""
    return jsonify({"status": "ok"}), 200


@app.route("/deploy", methods=["POST"])
def deploy():
    """
    Receives GitLab push webhooks.

    GitLab sends the shared secret as a plain header value (X-Gitlab-Token),
    unlike GitHub which uses HMAC-SHA256. We use hmac.compare_digest anyway
    to get constant-time comparison and avoid timing attacks.
    """

    # --- Token verification ---
    # Why: Without this check, anyone who discovers your endpoint URL could
    # trigger a rebuild. The token proves the request came from GitLab.
    incoming_token = request.headers.get("X-Gitlab-Token", "")
    if not hmac.compare_digest(incoming_token, GITLAB_WEBHOOK_TOKEN):
        log.warning("Webhook received with invalid token — rejected")
        return jsonify({"error": "Unauthorized"}), 403

    # --- Parse payload ---
    payload = request.get_json(silent=True)
    if not payload:
        log.warning("Webhook received with no JSON payload")
        return jsonify({"error": "Bad request"}), 400

    # --- Filter to main branch only ---
    # Why: We only want to rebuild production when main changes.
    # Feature branches and preview branches should not trigger rebuilds —
    # Vercel handles those automatically.
    ref = payload.get("ref", "")
    if ref != "refs/heads/main":
        log.info(f"Push to {ref} — not main, skipping rebuild")
        return jsonify({"status": "skipped", "ref": ref}), 200

    # --- Extract commit info for logging ---
    commits = payload.get("commits", [])
    pusher = payload.get("user_name", "unknown")
    commit_count = len(commits)
    latest_sha = commits[0].get("id", "unknown")[:8] if commits else "unknown"

    log.info(
        f"Main branch push by {pusher} — {commit_count} commit(s), "
        f"latest: {latest_sha} — triggering rebuild"
    )

    # --- Trigger rebuild in background ---
    # Why Popen (not check_call): The webhook must return quickly or GitLab
    # will consider it failed. Docker builds take minutes. We fire-and-forget
    # the rebuild script and return 202 Accepted immediately.
    try:
        subprocess.Popen(
            ["bash", str(REBUILD_SCRIPT)],
            stdout=open(Path.home() / "logs" / "deploy.log", "a"),
            stderr=subprocess.STDOUT,
        )
        log.info("Rebuild script launched in background")
    except Exception as e:
        log.error(f"Failed to launch rebuild script: {e}")
        return jsonify({"error": "Failed to start rebuild"}), 500

    return jsonify({
        "status": "accepted",
        "pusher": pusher,
        "commits": commit_count,
        "sha": latest_sha,
    }), 202


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------

if __name__ == "__main__":
    # Validate config before starting
    if not GITLAB_WEBHOOK_TOKEN:
        raise RuntimeError(
            "GITLAB_WEBHOOK_TOKEN environment variable is not set. "
            "Generate a secret with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
        )

    if not REBUILD_SCRIPT.exists():
        raise RuntimeError(f"Rebuild script not found at {REBUILD_SCRIPT}")

    # Ensure log directory exists
    (Path.home() / "logs").mkdir(exist_ok=True)

    log.info(f"Webhook listener starting on port {LISTEN_PORT}")
    app.run(host="127.0.0.1", port=LISTEN_PORT)
