# Timer

Mobile-first preset timer app. Next.js + Drizzle + Postgres on Railway.

## Local

```bash
cp .env.example .env
# set DATABASE_URL
npm install
npm run db:migrate
npm run dev
```

## Deploy

Live: https://timer-production-f82d.up.railway.app

`npm start` runs migrations then the Next server. Redeploy with `railway up`.
