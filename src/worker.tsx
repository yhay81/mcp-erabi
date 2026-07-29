import { Hono, type Context } from "hono";
import { requestId } from "hono/request-id";

import {
  catalogStatus,
  recordSyncError,
  registrySourceUrl,
  searchServers,
  syncRegistryPage,
} from "./data";
import { securityHeaders } from "./middleware/security";
import { hashValue } from "./security/hash";
import { HomePage, NotFoundPage, PrivacyPage } from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
  EVENT_LIMITER: RateLimit;
  SYNC_TOKEN?: string;
};

type AppContext = Context<{ Bindings: Bindings }>;
type ObjectPayload = Record<string, unknown>;

const app = new Hono<{ Bindings: Bindings }>();
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const telemetryNames = new Set([
  "visited",
  "searched",
  "filtered",
  "compared",
  "config_copied",
  "source_opened",
  "returned",
]);
const allowedCategories = new Set([
  "",
  "AI",
  "Web",
  "その他",
  "クラウド",
  "データ",
  "ファイル",
  "制作",
  "自動化",
  "連絡",
  "開発",
]);

app.use("*", requestId());
app.use("*", securityHeaders);

function apiError(c: AppContext, status: 400 | 403 | 404 | 413 | 429 | 503, error: string) {
  return c.json({ error, requestId: c.get("requestId") }, status);
}

function validWriteOrigin(c: AppContext) {
  const fetchSite = c.req.header("Sec-Fetch-Site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "same-site";
}

async function readJson(c: AppContext, maximumBytes = 1_000): Promise<ObjectPayload | null> {
  const contentType = c.req.header("Content-Type") ?? "";
  const contentLength = Number(c.req.header("Content-Length") ?? "0");
  if (
    !contentType.toLowerCase().startsWith("application/json") ||
    (contentLength > 0 && contentLength > maximumBytes)
  ) {
    return null;
  }
  const raw = await c.req.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > maximumBytes) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as ObjectPayload)
      : null;
  } catch {
    return null;
  }
}

app.get("/", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.html(<HomePage />);
});
app.get("/privacy", (c) => c.html(<PrivacyPage />));

app.get("/api/servers", async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  const category = c.req.query("category") ?? "";
  const mode = c.req.query("mode") ?? "";
  const secret = c.req.query("secret") ?? "";
  const repository = c.req.query("repository") === "1";
  if (
    query.length > 80 ||
    !allowedCategories.has(category) ||
    !["", "local", "remote"].includes(mode) ||
    !["", "none", "required"].includes(secret)
  ) {
    return apiError(c, 400, "invalid_filter");
  }
  const [results, status] = await Promise.all([
    searchServers(c.env.DB, { category, mode, query, repository, secret }),
    catalogStatus(c.env.DB),
  ]);
  c.header("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  return c.json({ results, source: registrySourceUrl, status });
});

app.post("/api/telemetry", async (c) => {
  if (!validWriteOrigin(c)) return apiError(c, 403, "cross_site_request");
  const payload = await readJson(c, 700);
  const name = typeof payload?.name === "string" ? payload.name : "";
  const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId : "";
  if (payload?.automated === true) return c.body(null, 204);
  if (!telemetryNames.has(name) || !sessionPattern.test(sessionId)) {
    return apiError(c, 400, "invalid_telemetry");
  }
  if (!(await c.env.EVENT_LIMITER.limit({ key: sessionId })).success) {
    return apiError(c, 429, "rate_limited");
  }
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO product_events (session_hash, name, occurred_on)
     VALUES (?, ?, date('now'))`,
  )
    .bind(await hashValue(sessionId), name)
    .run();
  return c.body(null, 204);
});

app.post("/internal/sync", async (c) => {
  const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!c.env.SYNC_TOKEN || token !== c.env.SYNC_TOKEN) return apiError(c, 404, "not_found");
  try {
    return c.json(await syncRegistryPage(c.env.DB));
  } catch (error) {
    await recordSyncError(c.env.DB, error);
    return apiError(c, 503, "registry_unavailable");
  }
});

app.get("/healthz", async (c) => {
  c.header("Cache-Control", "no-store");
  const status = await catalogStatus(c.env.DB);
  return c.json({
    catalog: status,
    healthy: true,
    service: "mcp-erabi",
    time: new Date().toISOString(),
  });
});

app.notFound((c) => {
  if (c.req.path.startsWith("/api/") || c.req.path.startsWith("/internal/")) {
    return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
  }
  return c.html(<NotFoundPage />, 404);
});

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

async function scheduledSync(env: Bindings) {
  try {
    await syncRegistryPage(env.DB);
    await env.DB.prepare(
      "DELETE FROM product_events WHERE occurred_on < date('now', '-35 days')",
    ).run();
  } catch (error) {
    await recordSyncError(env.DB, error);
    throw error;
  }
}

export { app };
export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext) {
    context.waitUntil(scheduledSync(env));
  },
};
