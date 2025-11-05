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
- `GET /api/v1/standings?league=PL&season=2024&provider=fd`
- `GET /api/v1/fixtures?league=39&season=2024&provider=af`

## Deploy
- Dockerfile included.
- Works on Render/Railway/Heroku.
