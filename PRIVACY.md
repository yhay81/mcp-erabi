# Privacy

## Collect

- Official MCP Registryから取得した公開メタデータ。
- 訪問、検索、絞り込み、比較、設定コピー、参照元を開いた操作名。
- ブラウザで生成した匿名IDのSHA-256ハッシュと操作日。
- Cloudflare Workersがセキュリティと障害調査のために扱う短期リクエストログ。

## Do not collect

- 検索語、絞り込み値、比較したサーバー名、コピーした設定内容。
- APIキー、アクセストークン、パスワードなどの秘密値。
- 氏名、メールアドレス、Cookie、広告識別子。

## Retention and deletion

- プロダクトイベントは35日後に自動削除する。
- 匿名IDは利用者のlocalStorageに保存し、サイトデータの削除で消去できる。
- カタログは公開Registryの同期データであり、元データの訂正・削除はRegistry運営者へ申請する。
- Operator: yhay81
- Security contact: GitHubの非公開Security Advisory
