# Deploying DocuMind to production

The production stack (`docker-compose.prod.yml`) puts Caddy in front of everything. It gets
and renews a Let's Encrypt certificate for your domain, redirects HTTP to HTTPS, and serves
the site at `/` and the API at `/api`. Nothing else is exposed to the internet.

## 1. Server

- Linux server (Ubuntu 22.04/24.04 works well) with Docker Engine and the Compose plugin.
- For self-hosted AI: an NVIDIA GPU with 8 GB+ VRAM, the NVIDIA driver, and the NVIDIA
  Container Toolkit. 16 GB RAM, 100 GB disk.
- Open ports 80 and 443 (Caddy needs port 80 for the certificate challenge).

## 2. Domain

Create a DNS **A record** for your domain (and `www` if you want it) pointing at the server's
public IP. Wait until `nslookup your-domain` returns that IP before starting Caddy, or the
certificate request fails (Caddy retries, but Let's Encrypt rate-limits repeated failures).

## 3. Configuration

```bash
git clone https://github.com/Hamidhidden/documind-ai.git && cd documind-ai
cp .env.production.example .env.production
```

Fill in every value in `.env.production`. Required:

| Setting | Notes |
| --- | --- |
| `DOMAIN`, `ACME_EMAIL` | Your domain and an email for certificate notices |
| `DJANGO_SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`. The app refuses to start with a weak one |
| `POSTGRES_PASSWORD` | A long random password |
| `EMAIL_*` | Any SMTP provider; needed for password resets |
| `ZARINPAL_MERCHANT_ID` | From your Zarinpal panel; keep `ZARINPAL_SANDBOX=true` until tested |
| `PRICE_PRO_*_TOMAN` | Your real prices |
| `NEXT_PUBLIC_COMPANY_*`, `NEXT_PUBLIC_CONTACT_EMAIL` | Shown on the contact/about pages (required for Enamad) |

`NEXT_PUBLIC_*` values are compiled into the website, so rebuild the frontend after changing
them (`up -d --build frontend`).

## 4. Start

```bash
# With self-hosted AI on an NVIDIA GPU:
docker compose -f docker-compose.prod.yml -f docker-compose.gpu.yml --env-file .env.production --profile local-ai up -d --build
# Without (AI_PROVIDER=openai, or a model server elsewhere via LOCAL_LLM_BASE_URL):
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The first run downloads the AI models (~6 GB). If the server cannot reach ollama.com, copy the
models from a machine that has them: archive `~/.ollama/models` (or the `ollama_data` volume)
there and restore it into the server's `ollama_data` volume.

Create your admin account (for `/admin/`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec web python src/manage.py createsuperuser
```

## 5. Verify

- `https://your-domain/` shows the landing page with a valid certificate; `http://` redirects.
- Register, upload a document, ask a question, request a password reset (check the email).
- Billing: with `ZARINPAL_SANDBOX=true`, buy a plan and confirm it activates; then set
  `ZARINPAL_SANDBOX=false` and restart `web`.

## 6. Before you announce it

- [ ] Have a lawyer review `/terms` and `/privacy`, fill the refund and backup-retention
      placeholders, then set `NEXT_PUBLIC_LEGAL_REVIEWED=true` and rebuild the frontend.
- [ ] Apply for Enamad and add `NEXT_PUBLIC_ENAMAD_ID` / `NEXT_PUBLIC_ENAMAD_CODE` (the `id`
      and `Code` from the seal snippet in your Enamad panel; if their snippet differs from
      the one in `components/marketing.tsx`, use theirs).
- [ ] Submit `https://your-domain/sitemap.xml` to Google Search Console.

## Operations

- **Backups**: the `backup` service writes a database dump and an uploads archive to
  `BACKUP_DIR` every 24 hours and keeps `BACKUP_KEEP_DAYS` days. Copy that folder off the server
  regularly; a backup on the same disk does not survive the disk.
- **Restore**: `docker compose ... exec -T postgres pg_restore --clean -U documind -d documind < backups/db-<stamp>.dump`
  and `tar -xzf backups/media-<stamp>.tar.gz` into the `media_data` volume.
- **Update**: `git pull`, then the same `up -d --build` command; migrations run on start.
- **Logs**: `docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web worker caddy`.
- **Rate limits**: login 10/min, registration 10/hour, password reset 5/hour per client
  (`THROTTLE_*` settings). Counters live in Redis, shared by all workers.
