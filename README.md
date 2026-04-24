# WhatIf FC API (Express)

A separate backend API for WhatIf FC to be consumed by web (Next.js on Vercel) and mobile apps.

## Quick start

```bash
npm i
npm run dev
# or
npm start
```

Create a `.env` file from `.env.example` and fill your keys.

## Endpoints

- `GET /health`
- `GET /api/v1/competitions`
- `GET /api/v1/standings?league=PL&season=2025&provider=fd`
- `GET /api/v1/fixtures?league=PL&season=2025&round=31&provider=fd`
- `GET /api/v1/rounds?league=PL&season=2025`

Notes:
- `provider` is optional (`fd` or `tsdb`).
- If a requested provider fails, API automatically retries with the other provider.
- Responses include `provider`, `providerRequested`, and `providerFallback` fields.

## Deploy
- Dockerfile included.
- Works on Render/Railway/Heroku.
