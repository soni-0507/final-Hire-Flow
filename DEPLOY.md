# Put HireFlow on the public internet

Cheapest and simplest: one small Linux VPS (1 GB RAM is enough) running the existing Docker setup, with automatic HTTPS.

## 1. Get a server and a domain
- Any VPS (DigitalOcean, Hetzner, AWS Lightsail, Oracle free tier...) with Ubuntu 22.04+.
- A domain or subdomain. Create an **A record** pointing to the server's public IP (e.g. `hire.example.com`).
- Open ports **80** and **443** in the provider's firewall.

## 2. Install Docker on the server
```bash
curl -fsSL https://get.docker.com | sh
```

## 3. Upload the project and create `.env`
```bash
scp -r hiring-pipeline user@SERVER_IP:~/      # or git clone your repo
ssh user@SERVER_IP
cd hiring-pipeline
cp .env.example .env
nano .env
```
Fill in **all** of these:
| Variable | Value |
| --- | --- |
| `DOMAIN` | your domain, e.g. `hire.example.com` (no https://) |
| `JWT_SECRET` | output of `openssl rand -hex 32` |
| `RECRUITER_INVITE_CODE` | your own private code |
| `SHOW_RESET_LINK` | `false` |
| `SMTP_*`, `MAIL_FROM` | real SMTP (Gmail App Password, Brevo, Resend, ...) |

## 4. Start
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose logs -f backend      # should say "API running"
```
Open `https://your-domain`. The first visit may take ~30 s while the certificate is issued.

Do **not** run the demo seed on a public server (it has public passwords). Just sign up: recruiters need your invite code.

## Maintenance
- Update: `git pull` (or re-upload), then rerun the `up -d --build` command.
- Backup database: `docker compose exec mongo mongodump --archive > backup.archive`
- Resumes live in the `uploads_data` Docker volume, so back that up too.

## No-server alternative (Render + MongoDB Atlas)
1. Create a free cluster on MongoDB Atlas and allow access from anywhere (0.0.0.0/0); copy the connection string.
2. Render **Web Service** from `backend/` (Docker): set `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `RECRUITER_INVITE_CODE`, `SMTP_*`, `MAIL_FROM`, `CLIENT_ORIGIN=https://<your-frontend-url>`. Add a persistent disk mounted at `/app/uploads` and set `UPLOAD_DIR=/app/uploads` (without a disk, uploaded resumes vanish on every deploy; free tier has no disk).
3. Render **Static Site** from `frontend/`: build `npm install && npm run build`, publish `dist`, env `VITE_API_URL=https://<your-backend-url>/api`, plus a rewrite rule `/*` -> `/index.html`.
