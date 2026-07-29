# Metrics

## Product outcome

| Stage           | MCPえらびでの意味                      | Event / state   |
| --------------- | -------------------------------------- | --------------- |
| `signed_up`     | ログインなしで訪問した                 | `visited`       |
| `activated`     | 用途や名称で候補を検索した             | `searched`      |
| `value_created` | 2件以上の接続条件を並べた              | `compared`      |
| `job_completed` | メタデータ由来の設定をコピーした       | `config_copied` |
| `returned`      | 別の日に同じ匿名ブラウザから再利用した | `returned`      |

設定コピーは実インストールの確認ではなく、導入着手の代理指標である。実インストール数として報告しない。

## Stored events

- `visited`
- `searched`
- `filtered`
- `compared`
- `config_copied`
- `source_opened`
- `returned`

検索語、絞り込み値、サーバー名、設定内容はイベントへ保存しない。ランダムなブラウザ内IDはSHA-256ハッシュ化して保存し、35日後に削除する。`?qa=1`、WebDriver、同一セッション内で伝播したQAフラグは集計対象外になる。

## Operator contract

`npm run metrics`は本番D1から集計JSONを出力する。メールアドレス、IP、検索語、サーバー名、個別ID、生ログを出力しない。分母0の比率は0とし、欠測を成功扱いしない。
