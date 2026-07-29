import { describe, expect, it } from "vitest";

import { normalizeRegistryServer, type RegistryEnvelope } from "../src/registry";

function envelope(server: NonNullable<RegistryEnvelope["server"]>): RegistryEnvelope {
  return {
    _meta: {
      "io.modelcontextprotocol.registry/official": {
        isLatest: true,
        status: "active",
        updatedAt: "2026-07-29T00:00:00Z",
      },
    },
    server,
  };
}

describe("registry normalization", () => {
  it("builds a local recipe and surfaces declared secret inputs", () => {
    const result = normalizeRegistryServer(
      envelope({
        description: "Access files in cloud storage.",
        name: "io.example/files",
        packages: [
          {
            environmentVariables: [
              {
                isRequired: true,
                isSecret: true,
                name: "ACCESS_TOKEN",
              },
            ],
            identifier: "@example/files-mcp",
            registryType: "npm",
            runtimeHint: "npx",
            version: "2.0.0",
          },
        ],
        repository: { url: "https://github.com/example/files-mcp" },
        version: "2.0.0",
      }),
    );

    expect(result).toMatchObject({
      categories: expect.arrayContaining(["ファイル", "クラウド"]),
      localCount: 1,
      remoteCount: 0,
      repositoryUrl: "https://github.com/example/files-mcp",
      requiredInputCount: 1,
      secretCount: 1,
    });
    expect(result?.install?.config).toContain("@example/files-mcp@2.0.0");
    expect(result?.install?.config).toContain("${ACCESS_TOKEN}");
  });

  it("builds a remote recipe while rejecting non-HTTPS links", () => {
    const result = normalizeRegistryServer(
      envelope({
        description: "Talk to a chat workspace.",
        name: "io.example/chat",
        remotes: [
          {
            headers: [{ isRequired: true, isSecret: true, name: "Authorization" }],
            type: "streamable-http",
            url: "https://mcp.example.com/connect",
          },
        ],
        repository: { url: "javascript:alert(1)" },
        version: "1.0.0",
        websiteUrl: "http://insecure.example.com",
      }),
    );

    expect(result).toMatchObject({
      remoteCount: 1,
      repositoryUrl: "",
      secretCount: 1,
      websiteUrl: "",
    });
    expect(result?.install?.config).toContain("https://mcp.example.com/connect");
    expect(result?.install?.config).not.toContain("javascript:");
  });

  it("drops malformed entries without a name or version", () => {
    expect(normalizeRegistryServer(envelope({ name: "", version: "1.0.0" }))).toBeNull();
    expect(normalizeRegistryServer(envelope({ name: "io.example/missing" }))).toBeNull();
  });
});
