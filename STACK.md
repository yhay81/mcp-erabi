# Stack

- Cloudflare Workers: Hono API、Hono JSXの初期HTML、定期同期を同じWorkerで配信する。
- D1: Official MCP Registryの検索索引、同期カーソル、匿名日次イベントを保存する。
- Vite+: build、lint、format、typecheck、testを共通化する。
- Vanilla JavaScript: 検索、比較、コピーだけの小さな操作面なのでクライアントUIフレームワークを追加しない。
- Better Auth: 不採用。個人設定や非公開データを持たず、ログインが中核jobを遅くするため。

Official MCP Registry APIは1ページ100件のカーソル方式で取得し、初回は保護された同期入口、以後は毎時cronで差分同期する。API障害時も直近のD1索引から検索できる。
