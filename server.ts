import path from "node:path";
import webpush from "web-push";
import { resolveVapidSubject } from "./vapid-subject";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(import.meta.dir, "public");
const MAX_TIMEOUT = 2_147_483_647;
const jobs = new Map<string, Job>();

type PushSubscriptionJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

type Job = {
  key: string;
  subscription: PushSubscriptionJSON;
  timerId: string;
  endsAt: number;
  title: string;
  body: string;
  timeout: ReturnType<typeof setTimeout>;
};

const vapid = webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  resolveVapidSubject(process.env.VAPID_SUBJECT),
  vapid.publicKey,
  vapid.privateKey,
);

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function isSubscription(value: unknown): value is PushSubscriptionJSON {
  if (!value || typeof value !== "object") return false;
  const sub = value as PushSubscriptionJSON;
  return (
    typeof sub.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    typeof sub.keys?.p256dh === "string" &&
    typeof sub.keys?.auth === "string"
  );
}

function jobKey(endpoint: string, timerId: string) {
  return `${endpoint}::${timerId}`;
}

function cancelKey(key: string) {
  const job = jobs.get(key);
  if (!job) return;
  clearTimeout(job.timeout);
  jobs.delete(key);
}

function cancelEndpoint(endpoint: string) {
  for (const [key, job] of jobs) {
    if (job.subscription.endpoint === endpoint) cancelKey(key);
  }
}

function scheduleJob(input: {
  subscription: PushSubscriptionJSON;
  timerId: string;
  endsAt: number;
  title: string;
  body: string;
}) {
  const key = jobKey(input.subscription.endpoint, input.timerId);
  cancelKey(key);
  const delay = Math.max(0, input.endsAt - Date.now());
  const timeout = setTimeout(() => {
    fire(key).catch((err) => console.error("push failed", err));
  }, Math.min(delay, MAX_TIMEOUT));
  jobs.set(key, { ...input, key, timeout });
}

async function fire(key: string) {
  const job = jobs.get(key);
  if (!job) return;
  jobs.delete(key);
  // setTimeout is capped at ~24.8d; keep waiting if this fired early.
  if (job.endsAt - Date.now() > 1000) {
    scheduleJob(job);
    return;
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: job.subscription.endpoint,
        keys: {
          p256dh: job.subscription.keys!.p256dh!,
          auth: job.subscription.keys!.auth!,
        },
      },
      JSON.stringify({
        title: job.title,
        body: job.body,
        url: "/#/run",
      }),
      { TTL: 3600, urgency: "high" },
    );
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return;
    console.error("web-push error", error);
  }
}

async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function safeFile(pathname: string) {
  const relative = (pathname === "/" ? "index.html" : pathname).replace(/^\/+/, "");
  const resolved = path.normalize(path.join(PUBLIC_DIR, relative));
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) return null;
  return Bun.file(resolved);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, jobs: jobs.size });
    }

    if (url.pathname === "/api/vapid-public-key") {
      return json({ publicKey: vapid.publicKey });
    }

    if (req.method === "POST" && url.pathname === "/api/push/replace") {
      const body = await readBody(req);
      if (!isSubscription(body?.subscription) || !Array.isArray(body?.jobs)) {
        return json({ error: "invalid payload" }, 400);
      }
      cancelEndpoint(body.subscription.endpoint);
      for (const job of body.jobs) {
        const endsAt = Number(job?.endsAt);
        const timerId = String(job?.timerId || "");
        if (!timerId || !Number.isFinite(endsAt) || endsAt <= Date.now()) continue;
        scheduleJob({
          subscription: body.subscription,
          timerId,
          endsAt,
          title: String(job.title || "Timer").slice(0, 80),
          body: String(job.body || "Time is up").slice(0, 160),
        });
      }
      return json({ ok: true, jobs: jobs.size });
    }

    if (req.method === "POST" && url.pathname === "/api/push/cancel-all") {
      const body = await readBody(req);
      const endpoint = String(body?.endpoint || "");
      if (!endpoint.startsWith("https://")) return json({ error: "invalid endpoint" }, 400);
      cancelEndpoint(endpoint);
      return json({ ok: true });
    }

    if (req.method !== "GET") {
      return json({ error: "not found" }, 404);
    }

    const file = safeFile(url.pathname);
    if (file && (await file.exists())) {
      return new Response(file);
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Timer on http://localhost:${server.port}`);
