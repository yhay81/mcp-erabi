# Security

MCPえらびはMCPサーバーを実行せず、公開メタデータの検索と設定のたたき台だけを提供する。

## Implemented

- 外部から取得した名称、説明、URLをHTMLとして解釈せず、テキストとして描画する。
- `https:`以外のRepository、Webサイト、接続先URLを同期時に破棄する。
- CSP、HSTS、frame拒否、MIME sniffing拒否を設定する。
- テレメトリの同一サイト制約、入力上限、レート制限を設ける。
- Registry同期の手動入口はCloudflare Secretで保護する。
- APIキーなどの実値を入力・保存する機能を持たない。

## Trust boundary

Official MCP Registryは名前空間と公開メタデータの出典であり、掲載コードや外部接続先の安全性を保証しない。生成設定は導入のたたき台であり、利用クライアントの仕様、提供元README、要求権限を利用者が確認する必要がある。

脆弱性はGitHubのPrivate vulnerability reportingから連絡する。秘密情報を公開Issueへ投稿しない。
