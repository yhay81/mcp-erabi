# MCPえらび

Official MCP Registryの最新メタデータから、MCPサーバーの接続方式、必要な秘密情報、コード確認先を同じ形式で比べる日本語検索ツール。

本番: <https://mcp-erabi.yhay81.com>

## Product surface

- 名称と説明文を対象にした用途検索
- 外部接続／手元で実行、秘密情報、Repository有無の絞り込み
- 最大3件の接続条件比較
- Registryメタデータから生成した汎用`mcpServers`設定のコピー
- Registry収録と安全審査を分離した表示

## Data source

カタログは[Official MCP Registry](https://registry.modelcontextprotocol.io/)の公開APIを利用する非公式アグリゲーター。RegistryメタデータはCC0として提供されている。掲載はMCPサーバーの安全性、品質、推奨を意味しない。

## Local development

```powershell
vp env off
npm ci
npm run check
npm test
npm run build
```

ローカルD1を作る場合:

```powershell
npx wrangler d1 migrations apply mcp-erabi --local
```

## Operations

```powershell
npm run metrics
npm run deploy
npm run indexnow
```

初回同期用の`/internal/sync`は`SYNC_TOKEN` Secretで保護する。通常更新は毎時のscheduled handlerがOfficial MCP Registryの`updated_since`とcursorを使って取り込む。
