import type { Child } from "hono/jsx";

import { product } from "../config/product";

type LayoutProps = {
  children: Child;
  description?: string;
  title?: string;
};

function BrandMark() {
  return (
    <svg aria-hidden="true" class="brand-mark" viewBox="0 0 36 36">
      <path d="M9 10.5 18 5l9 5.5v15L18 31l-9-5.5z"></path>
      <circle cx="18" cy="11.5" r="2.25"></circle>
      <circle cx="13" cy="22.5" r="2.25"></circle>
      <circle cx="23" cy="22.5" r="2.25"></circle>
      <path d="m17 13-3 7.5m5-7.5 3 7.5m-7-.1h6"></path>
    </svg>
  );
}

export function Layout({
  children,
  description = product.description,
  title = product.name,
}: LayoutProps) {
  return (
    <html itemscope itemtype="https://schema.org/WebApplication" lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content={description} name="description" />
        <meta content={product.name} itemProp="name" />
        <meta content={description} itemProp="description" />
        <meta content={product.url} itemProp="url" />
        <meta content={product.applicationCategory} itemProp="applicationCategory" />
        <meta content="Any" itemProp="operatingSystem" />
        <meta content="true" itemProp="isAccessibleForFree" />
        <meta content={description} property="og:description" />
        <meta content="ja_JP" property="og:locale" />
        <meta content={title} property="og:title" />
        <meta content="website" property="og:type" />
        <meta content={product.url} property="og:url" />
        <link href={product.url} rel="canonical" />
        <link href="/styles.css" rel="stylesheet" />
        <script defer src="/app.js"></script>
        <title>{title}</title>
      </head>
      <body>
        <a class="skip-link" href="#main">
          本文へ移動
        </a>
        <header class="site-header">
          <a class="brand" href="/">
            <BrandMark />
            <span>
              MCP<em>えらび</em>
            </span>
          </a>
          <nav aria-label="メイン">
            <a
              href="https://registry.modelcontextprotocol.io/"
              rel="noopener noreferrer"
              target="_blank"
            >
              データ元
              <span aria-hidden="true">↗</span>
            </a>
            <a href="/privacy">プライバシー</a>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer>
          <span class="footer-brand">
            <BrandMark />
            MCPえらび
          </span>
          <p>Official MCP Registryの公開メタデータを利用した非公式ツールです。</p>
          <nav aria-label="フッター">
            <a href="/privacy">プライバシー</a>
            <a href="/healthz">稼働状態</a>
            <a href="https://github.com/yhay81/mcp-erabi" rel="noopener noreferrer" target="_blank">
              GitHub
            </a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
