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

`bun run start` serves the app. `PORT` comes from the host (Railway). HTTPS is required for install and push (localhost excepted). No other env vars are required.

Apple Web Push rejects VAPID subjects like `mailto:timer@localhost` (`403 BadJwtToken`). The server identifies as `https://timer.wcleeah.me` unless you set `VAPID_SUBJECT` to a real `https:` origin or `mailto:`.

## PWA

Add to Home Screen from the browser. Notifications need that install on iOS. Per-timer **Sound** and **Notify** toggles live on countdown/recurring timers in the preset editor.

On-page time-up audio uses the media playback session (same class as YouTube in Safari) so the iOS Silent switch does not mute it. Unlock happens on Start. There is no background ring after you leave the app.

Live: previously https://timer-production-f82d.up.railway.app
