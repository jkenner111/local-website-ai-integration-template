# Self-hosted Deployment Pipeline — Setup Guide

This walks through wiring up an automated deployment pipeline that rebuilds
a Docker container of this site on your server whenever the `main` branch
is updated on GitLab.

**Flow:**
```
You push to GitLab
      ↓
GitLab sends a webhook to your server (via Cloudflare Tunnel or direct ingress)
      ↓
webhook-listener.py verifies the token and filters to main branch
      ↓
rebuild-site.sh pulls latest code and rebuilds the Docker container
      ↓
New site version is live on your server
```

Throughout this doc, `your-site.example.com` is a placeholder — substitute
the actual domain you're deploying to.

---

## Prerequisites

- A Linux server with Docker + Docker Compose installed
- A way to expose HTTPS to the server: Cloudflare Tunnel (recommended — no
  inbound port required), or a reverse proxy like Caddy/nginx + Let's Encrypt
- The repo cloned on the server from GitLab (so the server pulls from the
  source of truth, not a GitHub mirror)
- Python 3 and pip available for the webhook listener

---

## Step 1 — Clone the repo on the server

```bash
mkdir -p ~/sites
git clone git@gitlab.com:YOUR_USER/YOUR_REPO.git ~/sites/YOUR_REPO
```

---

## Step 2 — Copy the deploy/ folder to a runtime location

```bash
cp -r ~/sites/YOUR_REPO/deploy ~/deploy
chmod +x ~/deploy/rebuild-site.sh
```

---

## Step 3 — Install Python dependencies

```bash
pip install -r ~/deploy/requirements.txt --break-system-packages
```

---

## Step 4 — Generate a webhook secret token

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output — you'll use it in Step 5 and Step 7. Treat it like a password.

---

## Step 5 — Install and configure the systemd service

```bash
mkdir -p ~/.config/systemd/user/
cp ~/deploy/site-webhook.service ~/.config/systemd/user/

# Drop-in override keeps the real token out of any file that's in git.
mkdir -p ~/.config/systemd/user/site-webhook.service.d/
cat > ~/.config/systemd/user/site-webhook.service.d/token.conf << 'EOF'
[Service]
Environment=GITLAB_WEBHOOK_TOKEN=YOUR_TOKEN_HERE
EOF
```

Replace `YOUR_TOKEN_HERE` with the token you generated in Step 4.

Create the log directory and start the service:

```bash
mkdir -p ~/logs
systemctl --user daemon-reload
systemctl --user enable site-webhook.service
systemctl --user start site-webhook.service

# Verify
systemctl --user status site-webhook.service
curl http://localhost:9876/health   # {"status": "ok"}
```

---

## Step 6 — Expose the webhook endpoint over HTTPS

**Option A: Cloudflare Tunnel** (recommended — no open ports)

Add a public hostname to your existing tunnel:
- Subdomain: `deploy`
- Domain: `your-site.example.com`
- Service: `http://localhost:9876`

**Option B: Reverse proxy (Caddy / nginx)**

Proxy `https://deploy.your-site.example.com` → `http://127.0.0.1:9876`.

Test it:
```bash
curl https://deploy.your-site.example.com/health   # {"status": "ok"}
```

---

## Step 7 — Add the webhook in GitLab

1. Repo → Settings → Webhooks → Add new webhook
2. Fill in:
   - **URL:** `https://deploy.your-site.example.com/deploy`
   - **Secret token:** (the token from Step 4)
   - **Trigger:** Push events only
   - **Branch filter:** `main`
   - **SSL verification:** Enabled
3. Click **Add webhook**, then **Test → Push events**. Expect HTTP 202.
4. Check the log: `tail -f ~/logs/webhook.log`

---

## Step 8 — Confirm `output: 'standalone'` in next.config.ts

The Dockerfile's final stage copies Next.js's standalone output. Without
this setting, the Docker build will fail. This template ships with it
already enabled — don't remove it.

---

## Step 9 — First manual rebuild

Verify the pipeline end-to-end before relying on automation:

```bash
bash ~/deploy/rebuild-site.sh
tail -f ~/logs/deploy.log
curl http://localhost:3000   # should return your site HTML
```

Once this works, every `git push origin main` will trigger the same
sequence automatically.

---

## Monitoring and troubleshooting

```bash
tail -f ~/logs/webhook.log                          # Webhook listener
tail -f ~/logs/deploy.log                           # Rebuild output
systemctl --user status site-webhook.service        # Service health
docker compose -f ~/sites/YOUR_REPO/docker-compose.yml logs -f  # Container
systemctl --user restart site-webhook.service       # Restart listener
bash ~/deploy/rebuild-site.sh                       # Manual rebuild
```

---

## Security notes

- The webhook endpoint should only be reachable over HTTPS through your
  tunnel or reverse proxy — do not expose port 9876 directly.
- The GitLab token lives in a systemd drop-in (`~/.config/systemd/user/
  site-webhook.service.d/token.conf`) — not in git.
- The rebuild script runs as your user, not root.
- The Next.js container runs as a non-root user inside Docker and binds
  to 127.0.0.1 by default.
