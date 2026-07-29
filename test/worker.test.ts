import { describe, expect, it } from "vitest";

import { app, type Bindings } from "../src/worker";

const sessionId = "313c096a-2ab6-4bda-a6bc-21361e522e99";

type RecordedStatement = {
  bindings: unknown[];
  sql: string;
};

const serverRow = {
  categories_json: '["開発","連絡"]',
  description: "Work with issues and pull requests.",
  input_signals_json:
    '[{"name":"GITHUB_TOKEN","required":true,"secret":true,"source":"environment"}]',
  install_json: '{"kind":"local","label":"npx で手元から実行","config":"{\\"mcpServers\\":{}}"}',
  local_count: 1,
  name: "io.github/example/server",
  package_types_json: '["npm"]',
  published_at: "2026-07-01T00:00:00Z",
  remote_count: 0,
  remote_types_json: "[]",
  repository_url: "https://github.com/example/server",
  required_input_count: 1,
  secret_count: 1,
  status: "active",
  title: "Example",
  updated_at: "2026-07-29T00:00:00Z",
  version: "1.0.0",
  website_url: "",
};

function database() {
  const recorded: RecordedStatement[] = [];
  const db = {
    batch: () => Promise.resolve([]),
    prepare(sql: string) {
      let bindings: unknown[] = [];
      const statement = {
        all: async () => ({ results: sql.includes("FROM servers") ? [serverRow] : [] }),
        bind(...values: unknown[]) {
          bindings = values;
          return statement;
        },
        first: async () => {
          if (sql.includes("COUNT(*) AS server_count")) {
            return { newest_server_at: "2026-07-29T00:00:00Z", server_count: 1 };
          }
          if (sql.includes("FROM sync_state")) {
            return {
              cursor: null,
              cycle_started_at: null,
              last_completed_at: "2026-07-29T01:00:00Z",
              last_error: null,
            };
          }
          return null;
        },
        run: async () => {
          recorded.push({ bindings, sql });
          return { meta: { changes: 1 }, success: true };
        },
      };
      return statement;
    },
  };
  return { db: db as unknown as D1Database, recorded };
}

function bindings(db: D1Database): Bindings {
  return {
    ASSETS: {
      fetch: () => Promise.resolve(new Response("not used")),
    } as unknown as Fetcher,
    DB: db,
    EVENT_LIMITER: {
      limit: () => Promise.resolve({ success: true }),
    },
    SYNC_TOKEN: "test-sync-token",
  };
}

describe("worker", () => {
  it("renders the visual search workspace without a text-led hero or experiment copy", async () => {
    const { db } = database();
    const response = await app.request("/", undefined, bindings(db));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(html).toContain('lang="ja"');
    expect(html).toContain('id="search-input"');
    expect(html).toContain('id="compare-tray"');
    expect(html).toContain("収録は安全審査を意味しません");
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain("成功条件");
    expect(html).not.toContain("30日");
  });

  it("searches the catalog with validated filters", async () => {
    const { db } = database();
    const response = await app.request(
      "/api/servers?q=github&mode=local&secret=required&repository=1",
      undefined,
      bindings(db),
    );
    const body = await response.json<{
      results: Array<{ name: string; secretCount: number }>;
      status: { serverCount: number };
    }>();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      name: "io.github/example/server",
      secretCount: 1,
    });
    expect(body.status.serverCount).toBe(1);

    const invalid = await app.request("/api/servers?mode=unknown", undefined, bindings(db));
    expect(invalid.status).toBe(400);
  });

  it("discards automated QA telemetry and stores only valid anonymous events", async () => {
    const automatedDb = database();
    const automated = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ automated: true, name: "searched", sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      bindings(automatedDb.db),
    );
    expect(automated.status).toBe(204);
    expect(automatedDb.recorded).toHaveLength(0);

    const validDb = database();
    const valid = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ automated: false, name: "config_copied", sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      bindings(validDb.db),
    );
    expect(valid.status).toBe(204);
    expect(validDb.recorded).toHaveLength(1);
    expect(validDb.recorded[0]?.bindings).toHaveLength(2);
    expect(validDb.recorded[0]?.bindings).not.toContain(sessionId);
    expect(validDb.recorded[0]?.bindings[1]).toBe("config_copied");
  });

  it("rejects cross-site telemetry and hides the manual sync endpoint", async () => {
    const { db } = database();
    const crossSite = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ automated: false, name: "searched", sessionId }),
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "cross-site",
        },
        method: "POST",
      },
      bindings(db),
    );
    expect(crossSite.status).toBe(403);

    const sync = await app.request("/internal/sync", { method: "POST" }, bindings(db));
    expect(sync.status).toBe(404);
  });

  it("explains the data boundary without accepting secret values", async () => {
    const { db } = database();
    const response = await app.request("/privacy", undefined, bindings(db));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("検索語も、秘密値も保存しません");
    expect(html).toContain("35日間");
    expect(html).toContain("Cookieは使いません");
  });

  it("exposes catalog health and a friendly page not-found", async () => {
    const { db } = database();
    const health = await app.request("/healthz", undefined, bindings(db));
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({
      catalog: { serverCount: 1 },
      healthy: true,
      service: "mcp-erabi",
    });

    const missing = await app.request("/missing", undefined, bindings(db));
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("このページは見つかりません");
  });
});
