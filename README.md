# Timer

Mobile-first preset timer PWA. Vanilla HTML/CSS/JS with a small Bun server for static files and Web Push.

Presets and the current run live in the browser (`localStorage`). There is no database. The server only:

- serves the app
- holds in-memory push jobs until they fire, are cancelled, or the process restarts

A deploy or restart drops pending notifications. The open run on the device is unchanged until you tap End run.

## Local

```bash
bun install
bun run dev
```

Open http://localhost:3000

First boot writes `.vapid.json` if `VAPID_*` env vars are unset. Chrome allows push on localhost after you grant notification permission.

## Production

Set stable VAPID keys so subscriptions survive deploys:

```bash
bun run vapid
```

Then set:

- `PORT` (Railway provides this)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (a `mailto:` or `https:` URL)

`bun run start` serves the app. HTTPS is required for install and push (localhost excepted).

## PWA

Add to Home Screen from the browser. Notifications need that install on iOS. Per-timer **Sound** and **Notify** toggles live on countdown/recurring timers in the preset editor.

Live: previously https://timer-production-f82d.up.railway.app
