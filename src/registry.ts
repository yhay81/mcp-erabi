export type RegistryInput = {
  default?: string;
  description?: string;
  isRequired?: boolean;
  isSecret?: boolean;
  name?: string;
  value?: string;
};

export type RegistryPackage = {
  environmentVariables?: RegistryInput[];
  identifier?: string;
  registryType?: string;
  runtimeArguments?: Array<RegistryInput & { type?: string }>;
  runtimeHint?: string;
  transport?: { type?: string };
  version?: string;
};

export type RegistryRemote = {
  headers?: RegistryInput[];
  type?: string;
  url?: string;
};

export type RegistryServer = {
  description?: string;
  name?: string;
  packages?: RegistryPackage[];
  remotes?: RegistryRemote[];
  repository?: {
    source?: string;
    subfolder?: string;
    url?: string;
  };
  title?: string;
  version?: string;
  websiteUrl?: string;
};

export type RegistryEnvelope = {
  _meta?: {
    "io.modelcontextprotocol.registry/official"?: {
      isLatest?: boolean;
      publishedAt?: string;
      status?: string;
      updatedAt?: string;
    };
  };
  server?: RegistryServer;
};

export type RegistryList = {
  metadata?: {
    count?: number;
    nextCursor?: string;
  };
  servers?: RegistryEnvelope[];
};

export type InputSignal = {
  name: string;
  required: boolean;
  secret: boolean;
  source: "header" | "environment";
};

export type InstallRecipe = {
  config: string;
  kind: "local" | "remote";
  label: string;
};

export type NormalizedServer = {
  categories: string[];
  description: string;
  inputSignals: InputSignal[];
  install: InstallRecipe | null;
  localCount: number;
  name: string;
  packageTypes: string[];
  publishedAt: string;
  remoteCount: number;
  remoteTypes: string[];
  repositoryUrl: string;
  requiredInputCount: number;
  searchText: string;
  secretCount: number;
  status: string;
  title: string;
  updatedAt: string;
  version: string;
  websiteUrl: string;
};

const categoryRules: Array<[string, RegExp]> = [
  [
    "開発",
    /\b(code|coding|developer|development|git|github|gitlab|repository|debug|test|docs?)\b/i,
  ],
  ["ファイル", /\b(file|filesystem|document|drive|storage|markdown|pdf|office)\b/i],
  ["データ", /\b(database|data|sql|postgres|mysql|sqlite|redis|mongo|analytics|spreadsheet)\b/i],
  ["Web", /\b(browser|web|website|scrap|crawl|fetch|search|http)\b/i],
  ["連絡", /\b(slack|discord|email|gmail|teams|chat|calendar|message|notification)\b/i],
  ["制作", /\b(figma|design|image|video|audio|music|creative|canvas)\b/i],
  ["クラウド", /\b(cloud|aws|azure|gcp|kubernetes|docker|infrastructure|deploy)\b/i],
  ["自動化", /\b(automation|workflow|n8n|zapier|orchestrat|pipeline)\b/i],
  ["AI", /\b(ai|model|llm|agent|embedding|prompt|inference)\b/i],
];

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function httpsUrl(value: unknown) {
  const candidate = text(value, 2_048);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function identifierAlias(name: string) {
  const finalPart = name.split("/").at(-1) ?? "server";
  return (
    finalPart
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "server"
  );
}

function packageCommand(serverName: string, entry: RegistryPackage) {
  const identifier = text(entry.identifier, 300);
  if (!identifier) return null;
  const registryType = text(entry.registryType, 40).toLowerCase();
  const runtimeHint = text(entry.runtimeHint, 40).toLowerCase();
  const version = text(entry.version, 80);
  const fixedArguments = (entry.runtimeArguments ?? [])
    .map((argument) => text(argument.value, 200))
    .filter(Boolean);

  let command = runtimeHint;
  let packageArgument = identifier;
  if (registryType === "npm") {
    command ||= "npx";
    if (version && !identifier.includes("@", 1)) packageArgument += `@${version}`;
  } else if (registryType === "pypi") {
    command ||= "uvx";
    if (version) packageArgument += `==${version}`;
  } else if (registryType === "oci" || registryType === "docker") {
    command ||= "docker";
    packageArgument = version ? `${identifier}:${version}` : identifier;
    fixedArguments.unshift("--rm", "-i");
    fixedArguments.push(packageArgument);
    packageArgument = "run";
  } else {
    command ||= registryType || "run";
  }

  const args =
    command === "npx"
      ? [...(fixedArguments.includes("-y") ? [] : ["-y"]), packageArgument, ...fixedArguments]
      : [packageArgument, ...fixedArguments];
  const environment = Object.fromEntries(
    (entry.environmentVariables ?? [])
      .map((input) => text(input.name, 120))
      .filter(Boolean)
      .map((name) => [name, `\${${name}}`]),
  );
  const config = {
    mcpServers: {
      [identifierAlias(serverName)]: {
        command,
        args,
        ...(Object.keys(environment).length ? { env: environment } : {}),
      },
    },
  };
  return {
    config: JSON.stringify(config, null, 2),
    kind: "local" as const,
    label: `${command} で手元から実行`,
  };
}

function remoteConfig(serverName: string, entry: RegistryRemote) {
  const url = httpsUrl(entry.url);
  if (!url) return null;
  const headers = Object.fromEntries(
    (entry.headers ?? [])
      .map((input) => text(input.name, 120))
      .filter(Boolean)
      .map((name) => [name, `\${${name}}`]),
  );
  const config = {
    mcpServers: {
      [identifierAlias(serverName)]: {
        type: entry.type === "sse" ? "sse" : "http",
        url,
        ...(Object.keys(headers).length ? { headers } : {}),
      },
    },
  };
  return {
    config: JSON.stringify(config, null, 2),
    kind: "remote" as const,
    label: "公開URLへ接続",
  };
}

function collectInputs(packages: RegistryPackage[], remotes: RegistryRemote[]) {
  const found = new Map<string, InputSignal>();
  const add = (entry: RegistryInput, source: InputSignal["source"]) => {
    const name = text(entry.name, 120);
    if (!name) return;
    const previous = found.get(`${source}:${name}`);
    found.set(`${source}:${name}`, {
      name,
      required: Boolean(entry.isRequired || previous?.required),
      secret: Boolean(entry.isSecret || previous?.secret),
      source,
    });
  };
  packages.forEach((entry) =>
    (entry.environmentVariables ?? []).forEach((input) => add(input, "environment")),
  );
  remotes.forEach((entry) => (entry.headers ?? []).forEach((input) => add(input, "header")));
  return [...found.values()].sort((a, b) => Number(b.secret) - Number(a.secret));
}

export function normalizeRegistryServer(envelope: RegistryEnvelope): NormalizedServer | null {
  const server = envelope.server;
  const name = text(server?.name, 300);
  const version = text(server?.version, 100);
  if (!server || !name || !version) return null;

  const packages = (server.packages ?? []).filter((entry) => text(entry.identifier, 300));
  const remotes = (server.remotes ?? []).filter((entry) => httpsUrl(entry.url));
  const official = envelope._meta?.["io.modelcontextprotocol.registry/official"];
  const title = text(server.title, 200) || name.split("/").at(-1) || name;
  const description = text(server.description, 2_000);
  const repositoryUrl = httpsUrl(server.repository?.url);
  const websiteUrl = httpsUrl(server.websiteUrl);
  const inputSignals = collectInputs(packages, remotes);
  const searchable = `${title} ${name} ${description}`.toLowerCase();
  const categories = categoryRules
    .filter(([, pattern]) => pattern.test(searchable))
    .map(([category]) => category)
    .slice(0, 3);
  if (!categories.length) categories.push("その他");

  const install =
    remotes.map((entry) => remoteConfig(name, entry)).find(Boolean) ??
    packages.map((entry) => packageCommand(name, entry)).find(Boolean) ??
    null;

  return {
    categories,
    description,
    inputSignals,
    install,
    localCount: packages.length,
    name,
    packageTypes: [
      ...new Set(packages.map((entry) => text(entry.registryType, 40)).filter(Boolean)),
    ],
    publishedAt: text(official?.publishedAt, 80),
    remoteCount: remotes.length,
    remoteTypes: [...new Set(remotes.map((entry) => text(entry.type, 40)).filter(Boolean))],
    repositoryUrl,
    requiredInputCount: inputSignals.filter((entry) => entry.required).length,
    searchText: `${searchable} ${categories.join(" ")}`.slice(0, 4_000),
    secretCount: inputSignals.filter((entry) => entry.secret).length,
    status: text(official?.status, 30) || "active",
    title,
    updatedAt: text(official?.updatedAt, 80),
    version,
    websiteUrl,
  };
}
