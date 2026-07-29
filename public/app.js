(() => {
  const searchInput = document.querySelector("#search-input");
  const resultsRoot = document.querySelector("#results");
  if (!(searchInput instanceof HTMLInputElement) || !(resultsRoot instanceof HTMLElement)) return;

  const storagePrefix = "mcp-erabi:";
  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.get("qa") === "1") {
    sessionStorage.setItem(`${storagePrefix}automated-qa`, "1");
  }
  const automatedQa =
    navigator.webdriver === true ||
    currentUrl.searchParams.get("qa") === "1" ||
    sessionStorage.getItem(`${storagePrefix}automated-qa`) === "1";
  let sessionId = localStorage.getItem(`${storagePrefix}session`);
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(`${storagePrefix}session`, sessionId);
  }
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = localStorage.getItem(`${storagePrefix}first-day`);
  if (!firstDay) localStorage.setItem(`${storagePrefix}first-day`, today);

  const state = {
    category: "",
    compared: new Map(),
    controller: null,
    mode: "",
    query: "",
    repository: false,
    results: [],
    secret: "",
  };

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const track = (name) => {
    void fetch("/api/telemetry", {
      body: JSON.stringify({ automated: automatedQa, name, sessionId }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);
  };

  track("visited");
  if (firstDay && firstDay !== today) track("returned");

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? "更新日不明"
      : new Intl.DateTimeFormat("ja-JP", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(date);
  };

  const signal = (kind, label, detail, active = true) => {
    const item = create("div", `signal ${active ? "active" : "muted"}`);
    const icon = create("i", `signal-icon ${kind}`);
    icon.setAttribute("aria-hidden", "true");
    const copy = create("span");
    copy.append(create("strong", "", label), create("small", "", detail));
    item.append(icon, copy);
    return item;
  };

  const externalLink = (label, url) => {
    const link = create("a", "source-link", label);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.addEventListener("click", () => track("source_opened"));
    link.append(create("span", "", "↗"));
    return link;
  };

  const copyConfig = async (button, server) => {
    if (!server.install?.config) return;
    try {
      await navigator.clipboard.writeText(server.install.config);
      button.textContent = "コピーしました";
      button.classList.add("copied");
      track("config_copied");
      window.setTimeout(() => {
        button.textContent = "設定をコピー";
        button.classList.remove("copied");
      }, 1_800);
    } catch {
      button.textContent = "コピーできませんでした";
    }
  };

  const toggleCompare = (server) => {
    if (state.compared.has(server.name)) {
      state.compared.delete(server.name);
    } else if (state.compared.size < 3) {
      state.compared.set(server.name, server);
    }
    renderResults();
    renderCompare();
  };

  const serverCard = (server) => {
    const card = create("article", "server-card");
    const heading = create("header", "card-heading");
    const identity = create("div", "card-identity");
    const categoryRow = create("div", "category-row");
    server.categories.forEach((category) =>
      categoryRow.append(create("span", "category-tag", category)),
    );
    categoryRow.append(create("span", "version-tag", `v${server.version}`));
    identity.append(categoryRow, create("h3", "", server.title), create("code", "", server.name));
    const compare = create(
      "button",
      `compare-button ${state.compared.has(server.name) ? "selected" : ""}`,
      state.compared.has(server.name) ? "比較中 ✓" : "比較に追加",
    );
    compare.type = "button";
    compare.setAttribute("aria-pressed", String(state.compared.has(server.name)));
    compare.disabled = state.compared.size >= 3 && !state.compared.has(server.name);
    compare.addEventListener("click", () => toggleCompare(server));
    heading.append(identity, compare);

    const description = create(
      "p",
      `server-description ${server.description ? "" : "muted-copy"}`,
      server.description || "説明はRegistryに登録されていません。",
    );
    const signals = create("div", "signal-grid");
    signals.append(
      signal(
        "remote",
        server.remoteCount ? "外部接続あり" : "外部接続なし",
        server.remoteCount ? `${server.remoteCount}個の公開URL` : "公開URLの収録なし",
        server.remoteCount > 0,
      ),
      signal(
        "local",
        server.localCount ? "手元で実行" : "ローカル情報なし",
        server.localCount
          ? server.packageTypes.join(" / ") || `${server.localCount}パッケージ`
          : "パッケージの収録なし",
        server.localCount > 0,
      ),
      signal(
        "secret",
        server.secretCount ? "秘密情報を要求" : "秘密指定なし",
        server.secretCount
          ? `${server.secretCount}項目（必須 ${server.requiredInputCount}）`
          : "メタデータ上の申告",
        server.secretCount > 0,
      ),
      signal(
        "repo",
        server.repositoryUrl ? "コード確認先あり" : "確認先なし",
        server.repositoryUrl ? "Repository URL収録済み" : "導入前に提供元を確認",
        Boolean(server.repositoryUrl),
      ),
    );

    if (server.inputSignals.length) {
      const inputs = create("div", "input-signals");
      inputs.append(create("span", "", "要求項目"));
      server.inputSignals.slice(0, 5).forEach((input) => {
        const tag = create(
          "code",
          input.secret ? "secret-input" : "",
          `${input.name}${input.required ? " *" : ""}`,
        );
        tag.title = `${input.source === "header" ? "HTTPヘッダー" : "環境変数"}${
          input.secret ? "・秘密情報" : ""
        }`;
        inputs.append(tag);
      });
      if (server.inputSignals.length > 5) {
        inputs.append(create("small", "", `ほか${server.inputSignals.length - 5}項目`));
      }
      card.append(heading, description, signals, inputs);
    } else {
      card.append(heading, description, signals);
    }

    if (server.install) {
      const details = create("details", "config-details");
      const summary = create("summary");
      summary.append(
        create("span", "", "設定のたたき台"),
        create("small", "", server.install.label),
      );
      const config = create("div", "config-block");
      const warning = create(
        "p",
        "",
        "値はプレースホルダーです。利用するクライアントの仕様と提供元の手順を確認してください。",
      );
      const pre = create("pre");
      pre.append(create("code", "", server.install.config));
      const copy = create("button", "copy-button", "設定をコピー");
      copy.type = "button";
      copy.addEventListener("click", () => void copyConfig(copy, server));
      config.append(warning, pre, copy);
      details.append(summary, config);
      card.append(details);
    }

    const footer = create("footer", "card-footer");
    const links = create("div", "source-links");
    if (server.repositoryUrl) links.append(externalLink("コード", server.repositoryUrl));
    if (server.websiteUrl) links.append(externalLink("公式サイト", server.websiteUrl));
    const registryLink = `https://registry.modelcontextprotocol.io/?search=${encodeURIComponent(server.name)}`;
    links.append(externalLink("Registry", registryLink));
    footer.append(create("span", "", `更新 ${formatDate(server.updatedAt)}`), links);
    card.append(footer);
    return card;
  };

  function renderResults() {
    resultsRoot.replaceChildren();
    const empty = document.querySelector("#empty-state");
    if (empty instanceof HTMLElement) empty.hidden = state.results.length > 0;
    state.results.forEach((server) => resultsRoot.append(serverCard(server)));
    const count = document.querySelector("#result-count");
    if (count) count.textContent = `${state.results.length}件を表示`;
  }

  const compareFact = (label, value, tone = "") => {
    const row = create("div", `compare-fact ${tone}`);
    row.append(create("span", "", label), create("strong", "", value));
    return row;
  };

  function renderCompare() {
    const tray = document.querySelector("#compare-tray");
    const grid = document.querySelector("#compare-grid");
    if (!(tray instanceof HTMLElement) || !(grid instanceof HTMLElement)) return;
    tray.hidden = state.compared.size < 2;
    grid.replaceChildren();
    if (state.compared.size < 2) return;
    track("compared");
    state.compared.forEach((server) => {
      const column = create("article", "compare-column");
      const remove = create("button", "compare-remove", "外す");
      remove.type = "button";
      remove.addEventListener("click", () => toggleCompare(server));
      const heading = create("header");
      const text = create("div");
      text.append(create("h3", "", server.title), create("code", "", server.name));
      heading.append(text, remove);
      column.append(
        heading,
        compareFact(
          "接続",
          [server.remoteCount ? "外部" : "", server.localCount ? "手元" : ""]
            .filter(Boolean)
            .join("＋") || "情報なし",
        ),
        compareFact(
          "秘密情報",
          server.secretCount ? `${server.secretCount}項目` : "申告なし",
          server.secretCount ? "caution" : "calm",
        ),
        compareFact(
          "コード",
          server.repositoryUrl ? "確認先あり" : "確認先なし",
          server.repositoryUrl ? "calm" : "caution",
        ),
        compareFact("更新", formatDate(server.updatedAt)),
      );
      grid.append(column);
    });
  }

  const renderStatus = (status) => {
    const target = document.querySelector("#catalog-status");
    if (!target) return;
    const count = Number(status?.serverCount ?? 0).toLocaleString("ja-JP");
    target.textContent = status?.syncing
      ? `${count}件・更新を同期中`
      : `${count}件・最新バージョン`;
  };

  const buildQuery = () => {
    const query = new URLSearchParams();
    if (state.query) query.set("q", state.query);
    if (state.category) query.set("category", state.category);
    if (state.mode) query.set("mode", state.mode);
    if (state.secret) query.set("secret", state.secret);
    if (state.repository) query.set("repository", "1");
    return query;
  };

  async function loadResults() {
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    resultsRoot.classList.add("is-loading");
    try {
      const response = await fetch(`/api/servers?${buildQuery()}`, {
        signal: state.controller.signal,
      });
      if (!response.ok) throw new Error("search_failed");
      const body = await response.json();
      state.results = Array.isArray(body.results) ? body.results : [];
      renderStatus(body.status);
      renderResults();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      resultsRoot.replaceChildren();
      const notice = create("div", "error-state");
      notice.append(
        create("strong", "", "候補を読み込めませんでした"),
        create("p", "", "少し待ってから、もう一度お試しください。"),
      );
      resultsRoot.append(notice);
      const count = document.querySelector("#result-count");
      if (count) count.textContent = "読み込みエラー";
    } finally {
      resultsRoot.classList.remove("is-loading");
    }
  }

  let searchTimer = 0;
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim();
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      if (state.query.length >= 2) track("searched");
      void loadResults();
    }, 320);
  });
  document.querySelector("#search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = searchInput.value.trim();
    if (state.query) track("searched");
    void loadResults();
  });

  const updateCategoryButtons = () => {
    document.querySelectorAll("[data-category]").forEach((node) => {
      if (node instanceof HTMLButtonElement) {
        node.setAttribute("aria-pressed", String(node.dataset.category === state.category));
      }
    });
  };
  document.querySelectorAll("[data-category]").forEach((node) => {
    node.addEventListener("click", () => {
      if (!(node instanceof HTMLButtonElement)) return;
      state.category =
        state.category === node.dataset.category ? "" : (node.dataset.category ?? "");
      updateCategoryButtons();
      track("filtered");
      void loadResults();
    });
  });

  document.querySelectorAll("[data-filter-group]").forEach((group) => {
    group.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const key = group.getAttribute("data-filter-group");
        if (key !== "mode" && key !== "secret") return;
        state[key] = button.dataset.value ?? "";
        group.querySelectorAll("button").forEach((peer) => {
          peer.setAttribute("aria-pressed", String(peer === button));
        });
        track("filtered");
        void loadResults();
      });
    });
  });

  document.querySelector("#repository-filter")?.addEventListener("change", (event) => {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    state.repository = event.currentTarget.checked;
    track("filtered");
    void loadResults();
  });

  const reset = () => {
    state.category = "";
    state.mode = "";
    state.query = "";
    state.repository = false;
    state.secret = "";
    searchInput.value = "";
    updateCategoryButtons();
    document.querySelectorAll("[data-filter-group]").forEach((group) => {
      group.querySelectorAll("button").forEach((button, index) => {
        button.setAttribute("aria-pressed", String(index === 0));
      });
    });
    const repository = document.querySelector("#repository-filter");
    if (repository instanceof HTMLInputElement) repository.checked = false;
    void loadResults();
  };
  document.querySelector("#reset-filters")?.addEventListener("click", reset);
  document.querySelector("#empty-reset")?.addEventListener("click", reset);
  document.querySelector("#close-compare")?.addEventListener("click", () => {
    state.compared.clear();
    renderCompare();
    renderResults();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
    }
  });

  void loadResults();
})();
