# Timer

Mobile-first preset timer PWA. Vanilla HTML/CSS/JS with a small Bun server for static files and Web Push.

Presets and the current run live in the browser (`localStorage`). There is no database. The server only:

- serves the app
- holds in-memory push jobs until they fire, are cancelled, or the process restarts

A deploy or restart drops pending notifications and mints a new VAPID pair. The next time someone opens the app and uses Notify, the client re-subscribes. The open run on the device is unchanged until you tap End run.

## Local

```bash
bun install
bun run dev
```

Open http://localhost:3000

Chrome allows push on localhost after you grant notification permission.

## Production

`bun run start` serves the app. `PORT` comes from the host (Railway). HTTPS is required for install and push (localhost excepted). No other env vars.

## PWA

Add to Home Screen from the browser. Notifications need that install on iOS. Per-timer **Sound** and **Notify** toggles live on countdown/recurring timers in the preset editor.

Live: previously https://timer-production-f82d.up.railway.app
