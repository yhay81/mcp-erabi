import { Layout } from "./layout";

const categoryChips = [
  ["開発", "コードとリポジトリ"],
  ["ファイル", "文書とストレージ"],
  ["データ", "DBと分析"],
  ["Web", "検索とブラウザ"],
  ["連絡", "チャットと予定"],
  ["制作", "画像とデザイン"],
  ["クラウド", "インフラ"],
  ["AI", "モデルとエージェント"],
];

export function HomePage() {
  return (
    <Layout>
      <h1 class="visually-hidden">MCPえらび — MCPサーバーの接続条件を比較</h1>
      <section class="catalog-shell" id="product">
        <div class="source-strip">
          <span class="source-mark" aria-hidden="true"></span>
          <span id="catalog-status">公式Registryを確認中</span>
          <span class="source-separator" aria-hidden="true"></span>
          <strong>収録は安全審査を意味しません</strong>
        </div>

        <div class="search-deck">
          <form id="search-form" role="search">
            <label class="search-box" for="search-input">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="6.5"></circle>
                <path d="m15.5 15.5 5 5"></path>
              </svg>
              <span class="visually-hidden">MCPサーバーを検索</span>
              <input
                autocomplete="off"
                id="search-input"
                maxlength={80}
                placeholder="やりたいこと・サービス名で探す"
                type="search"
              />
              <kbd>⌘ K</kbd>
            </label>
          </form>
          <div class="task-chips" aria-label="用途から絞り込む">
            {categoryChips.map(([category, description]) => (
              <button aria-pressed="false" class="task-chip" data-category={category} type="button">
                <span>{category}</span>
                <small>{description}</small>
              </button>
            ))}
          </div>
        </div>

        <div class="catalog-grid">
          <aside class="filter-rail" aria-label="比較条件">
            <section>
              <h2>動かし方</h2>
              <div class="segmented" data-filter-group="mode">
                <button aria-pressed="true" data-value="" type="button">
                  すべて
                </button>
                <button aria-pressed="false" data-value="remote" type="button">
                  外部接続
                </button>
                <button aria-pressed="false" data-value="local" type="button">
                  手元で実行
                </button>
              </div>
            </section>
            <section>
              <h2>秘密情報</h2>
              <div class="filter-stack" data-filter-group="secret">
                <button aria-pressed="true" data-value="" type="button">
                  指定なし
                </button>
                <button aria-pressed="false" data-value="none" type="button">
                  メタデータ上なし
                </button>
                <button aria-pressed="false" data-value="required" type="button">
                  要求あり
                </button>
              </div>
            </section>
            <label class="check-filter">
              <input id="repository-filter" type="checkbox" />
              <span>
                <strong>コード確認先あり</strong>
                <small>Repository URLが収録済み</small>
              </span>
            </label>
            <button class="reset-button" id="reset-filters" type="button">
              条件を戻す
            </button>
          </aside>

          <section class="result-stage" aria-labelledby="result-heading">
            <header class="result-toolbar">
              <div>
                <h2 id="result-heading">候補</h2>
                <span id="result-count">読み込み中</span>
              </div>
              <div class="legend" aria-label="表示の見方">
                <span>
                  <i class="dot remote"></i>外部接続
                </span>
                <span>
                  <i class="dot local"></i>手元で実行
                </span>
                <span>
                  <i class="dot secret"></i>秘密情報
                </span>
              </div>
            </header>
            <div aria-live="polite" class="result-grid" id="results">
              <div class="loading-card"></div>
              <div class="loading-card"></div>
              <div class="loading-card"></div>
            </div>
            <div class="empty-state" hidden id="empty-state">
              <svg aria-hidden="true" viewBox="0 0 80 80">
                <path d="M19 24h42M19 40h26M19 56h18"></path>
                <circle cx="58" cy="53" r="10"></circle>
                <path d="m65 60 8 8"></path>
              </svg>
              <p>条件に合う候補がありません。</p>
              <button id="empty-reset" type="button">
                条件を戻す
              </button>
            </div>
          </section>
        </div>

        <section aria-labelledby="compare-heading" class="compare-tray" hidden id="compare-tray">
          <header>
            <div>
              <p>COMPARE</p>
              <h2 id="compare-heading">接続条件を並べる</h2>
            </div>
            <button aria-label="比較を閉じる" id="close-compare" type="button">
              ×
            </button>
          </header>
          <div class="compare-grid" id="compare-grid"></div>
        </section>
      </section>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout title="プライバシー | MCPえらび">
      <article class="prose">
        <p class="eyebrow">PRIVACY</p>
        <h1>検索語も、秘密値も保存しません。</h1>
        <p>
          検索と比較はログインなしで利用できます。検索語、絞り込み条件、生成した設定内容はデータベースへ保存しません。
          APIキーやトークンの実値を入力する欄もありません。
        </p>
        <h2>品質計測</h2>
        <p>
          訪問、検索、絞り込み、比較、設定コピー、参照元を開いた操作を、ランダムな匿名IDのSHA-256ハッシュと日付だけで35日間記録します。
          匿名IDはブラウザのlocalStorageに置き、Cookieは使いません。自動テストは集計から除外します。
        </p>
        <h2>カタログデータ</h2>
        <p>
          公開MCPサーバーの名称、説明、接続方式、必要項目、Repository URLなどをOfficial MCP
          Registryから定期取得します。収録は安全性、品質、推奨を保証しません。
        </p>
        <h2>連絡</h2>
        <p>
          削除やセキュリティの連絡は、公開GitHubリポジトリのIssueから行えます。秘密情報はIssueへ書かないでください。
        </p>
      </article>
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <Layout title="ページが見つかりません | MCPえらび">
      <article class="prose compact-prose">
        <p class="eyebrow">404</p>
        <h1>このページは見つかりません。</h1>
        <p>
          <a href="/">MCPを探す画面へ戻る</a>
        </p>
      </article>
    </Layout>
  );
}
