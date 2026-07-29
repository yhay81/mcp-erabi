import { normalizeRegistryServer, type NormalizedServer, type RegistryList } from "./registry";

const registryEndpoint = "https://registry.modelcontextprotocol.io/v0.1/servers";

export type ServerResult = Omit<NormalizedServer, "searchText">;

export type SearchFilters = {
  category: string;
  mode: string;
  query: string;
  repository: boolean;
  secret: string;
};

export type SyncResult = {
  completed: boolean;
  imported: number;
  nextCursor: string;
};

type SyncState = {
  cursor: string | null;
  cycle_started_at: string | null;
  last_completed_at: string | null;
};

type ServerRow = {
  categories_json: string;
  description: string;
  input_signals_json: string;
  install_json: string;
  local_count: number;
  name: string;
  package_types_json: string;
  published_at: string;
  remote_count: number;
  remote_types_json: string;
  repository_url: string;
  required_input_count: number;
  secret_count: number;
  status: string;
  title: string;
  updated_at: string;
  version: string;
  website_url: string;
};

const queryAliases: Record<string, string[]> = {
  ai: ["ai", "llm", "model", "agent"],
  web: ["web", "browser", "search", "fetch", "crawl"],
  カレンダー: ["calendar", "schedule"],
  クラウド: ["cloud", "aws", "azure", "gcp", "kubernetes"],
  コード: ["code", "developer", "github", "repository"],
  データ: ["data", "database", "analytics", "sql"],
  データベース: ["database", "sql", "postgres", "mysql", "sqlite"],
  ファイル: ["file", "filesystem", "document", "drive", "storage"],
  ブラウザ: ["browser", "web", "crawl", "fetch"],
  メール: ["email", "gmail", "mail"],
  検索: ["search", "browser", "fetch"],
  画像: ["image", "photo", "design"],
  開発: ["developer", "code", "github", "gitlab", "repository"],
  連絡: ["slack", "discord", "email", "teams", "chat"],
};

function parseArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToResult(row: ServerRow): ServerResult {
  const install = row.install_json ? JSON.parse(row.install_json) : null;
  return {
    categories: parseArray(row.categories_json) as string[],
    description: row.description,
    inputSignals: parseArray(row.input_signals_json) as ServerResult["inputSignals"],
    install,
    localCount: row.local_count,
    name: row.name,
    packageTypes: parseArray(row.package_types_json) as string[],
    publishedAt: row.published_at,
    remoteCount: row.remote_count,
    remoteTypes: parseArray(row.remote_types_json) as string[],
    repositoryUrl: row.repository_url,
    requiredInputCount: row.required_input_count,
    secretCount: row.secret_count,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
    version: row.version,
    websiteUrl: row.website_url,
  };
}

function likeTerm(value: string) {
  return `%${value.toLowerCase().replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

export async function searchServers(db: D1Database, filters: SearchFilters) {
  const conditions = ["status = 'active'"];
  const bindings: Array<string | number> = [];
  const words = filters.query.trim().toLowerCase().split(/\s+/u).filter(Boolean).slice(0, 4);

  words.forEach((word) => {
    const aliases = queryAliases[word] ?? [word];
    conditions.push(`(${aliases.map(() => "search_text LIKE ? ESCAPE '\\'").join(" OR ")})`);
    bindings.push(...aliases.map(likeTerm));
  });
  if (filters.category) {
    conditions.push("categories_json LIKE ?");
    bindings.push(`%${filters.category}%`);
  }
  if (filters.mode === "remote") conditions.push("remote_count > 0");
  if (filters.mode === "local") conditions.push("local_count > 0");
  if (filters.secret === "none") conditions.push("secret_count = 0");
  if (filters.secret === "required") conditions.push("secret_count > 0");
  if (filters.repository) conditions.push("repository_url <> ''");

  const query = `SELECT
      name, title, description, version, repository_url, website_url,
      categories_json, local_count, remote_count, secret_count, required_input_count,
      package_types_json, remote_types_json, input_signals_json, install_json,
      published_at, updated_at, status
    FROM servers
    WHERE ${conditions.join(" AND ")}
    ORDER BY CASE WHEN updated_at = '' THEN 1 ELSE 0 END, updated_at DESC, title COLLATE NOCASE
    LIMIT 40`;
  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<ServerRow>();
  return (result.results ?? []).map(rowToResult);
}

export async function catalogStatus(db: D1Database) {
  const counts = await db
    .prepare(
      `SELECT
        COUNT(*) AS server_count,
        MAX(updated_at) AS newest_server_at
       FROM servers
       WHERE status = 'active'`,
    )
    .first<{ newest_server_at: string | null; server_count: number }>();
  const state = await db
    .prepare(
      `SELECT cursor, cycle_started_at, last_completed_at, last_error
       FROM sync_state WHERE id = 1`,
    )
    .first<SyncState & { last_error: string | null }>();
  return {
    lastCompletedAt: state?.last_completed_at ?? "",
    newestServerAt: counts?.newest_server_at ?? "",
    serverCount: Number(counts?.server_count ?? 0),
    syncing: Boolean(state?.cursor),
  };
}

function upsertStatement(db: D1Database, server: NormalizedServer) {
  return db
    .prepare(
      `INSERT INTO servers (
        name, title, description, version, repository_url, website_url,
        categories_json, local_count, remote_count, secret_count, required_input_count,
        package_types_json, remote_types_json, input_signals_json, install_json,
        search_text, published_at, updated_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        version = excluded.version,
        repository_url = excluded.repository_url,
        website_url = excluded.website_url,
        categories_json = excluded.categories_json,
        local_count = excluded.local_count,
        remote_count = excluded.remote_count,
        secret_count = excluded.secret_count,
        required_input_count = excluded.required_input_count,
        package_types_json = excluded.package_types_json,
        remote_types_json = excluded.remote_types_json,
        input_signals_json = excluded.input_signals_json,
        install_json = excluded.install_json,
        search_text = excluded.search_text,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at,
        status = excluded.status`,
    )
    .bind(
      server.name,
      server.title,
      server.description,
      server.version,
      server.repositoryUrl,
      server.websiteUrl,
      JSON.stringify(server.categories),
      server.localCount,
      server.remoteCount,
      server.secretCount,
      server.requiredInputCount,
      JSON.stringify(server.packageTypes),
      JSON.stringify(server.remoteTypes),
      JSON.stringify(server.inputSignals),
      server.install ? JSON.stringify(server.install) : "",
      server.searchText,
      server.publishedAt,
      server.updatedAt,
      server.status,
    );
}

async function fetchRegistryPage(cursor: string, updatedSince: string) {
  const url = new URL(registryEndpoint);
  url.searchParams.set("limit", "100");
  url.searchParams.set("version", "latest");
  if (cursor) url.searchParams.set("cursor", cursor);
  if (!cursor && updatedSince) url.searchParams.set("updated_since", updatedSince);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "mcp-erabi/0.1" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`registry_${response.status}`);
    return (await response.json()) as RegistryList;
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncRegistryPage(db: D1Database): Promise<SyncResult> {
  const state = (await db
    .prepare("SELECT cursor, cycle_started_at, last_completed_at FROM sync_state WHERE id = 1")
    .first<SyncState>()) ?? {
    cursor: null,
    cycle_started_at: null,
    last_completed_at: null,
  };
  const cycleStartedAt = state.cursor
    ? (state.cycle_started_at ?? new Date().toISOString())
    : new Date().toISOString();
  const list = await fetchRegistryPage(state.cursor ?? "", state.last_completed_at ?? "");
  const normalized = (list.servers ?? [])
    .map(normalizeRegistryServer)
    .filter((server): server is NormalizedServer => Boolean(server));
  if (normalized.length) await db.batch(normalized.map((server) => upsertStatement(db, server)));

  const nextCursor = list.metadata?.nextCursor ?? "";
  const completed = !nextCursor;
  await db
    .prepare(
      `UPDATE sync_state SET
        cursor = ?,
        cycle_started_at = ?,
        last_completed_at = ?,
        last_error = NULL,
        updated_at = unixepoch()
       WHERE id = 1`,
    )
    .bind(
      nextCursor || null,
      completed ? null : cycleStartedAt,
      completed ? cycleStartedAt : state.last_completed_at,
    )
    .run();
  return { completed, imported: normalized.length, nextCursor };
}

export async function recordSyncError(db: D1Database, error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  await db
    .prepare(
      `UPDATE sync_state
       SET last_error = ?, updated_at = unixepoch()
       WHERE id = 1`,
    )
    .bind(message.slice(0, 160))
    .run();
}

export const registrySourceUrl = "https://registry.modelcontextprotocol.io/";
