# Experiment

## User and job

- Target user: 日本語でClaude Code、CursorなどへMCPサーバーを追加する個人開発者と小規模チーム。
- Job to be done: MCP候補を用途で探し、接続方式、必要な秘密情報、コード確認先を比べ、設定のたたき台を取得する。
- Current workaround: ContextHub、MCP Gallery、Official MCP Registry、各READMEを行き来して手作業で比較する。

## Hypothesis

件数や人気順ではなく、Official MCP Registryの最新メタデータから導入条件を同じ形式で並べると、利用者は候補選定と設定着手を一画面で完了できる。

## Method

- Recruitment channel: Tool Shelf、検索エンジンの自然流入、公開GitHubリポジトリ。個別勧誘や自動投稿は行わない。
- Participants: 自動QAを除く匿名利用者。
- Duration: 公開後30日間。
- Comparison: ContextHubまたはOfficial MCP Registryだけで候補を探す現在の手順。

## Decision

- Success signal: 非QA検索者20人以上、比較者8人以上、設定コピー者5人以上、別日再訪者3人以上。
- Failure signal: 非QA検索者8人未満、または設定コピー者0人。登録件数とページビューだけでは成功としない。
- Deadline: 2026-08-29
- Maximum build time: 1日
- Maximum monthly infrastructure cost: 5 USD

## Guardrails

- Registry収録を安全審査、品質保証、推奨として表示しない。
- 検索語、設定内容、APIキーやトークンの実値を保存しない。
- 自動QAを実利用に数えない。
- 利用者数のために安全性、robots、レート制限、出典表示を弱めない。
- 成功条件を途中で都合よく変更しない。
