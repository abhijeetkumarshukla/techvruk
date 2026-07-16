# TechVruk Backend (minimal)

This is a minimal Express backend used by the TechVruk AI Spend Audit MVP.

Features
- Stores audits and leads in a local SQLite database (`data.sqlite`)
- Endpoints:
  - `POST /api/audits` — create an audit (returns `publicId` and URL)
  - `GET /api/audits/public/:publicId` — fetch a public, sanitized audit
  - `POST /api/leads` — save a lead and optionally send a transactional email
- Basic rate-limiting and a honeypot field for bot protection

Quick start

Copy `.env.example` to `.env` and edit if you want SMTP sending.

Install and run:

```bash
cd backend
npm install
npm start
```

The server listens on `PORT` from environment or `4000`.

Notes
- No secrets are checked into the repo. Configure SMTP credentials in `.env` if you want real emails sent.
- For production you should put the SQLite file on persistent storage, run migrations, and use a managed DB (Postgres) for scale.
