CREATE TABLE servers (
  name TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  website_url TEXT NOT NULL,
  categories_json TEXT NOT NULL,
  local_count INTEGER NOT NULL CHECK (local_count >= 0),
  remote_count INTEGER NOT NULL CHECK (remote_count >= 0),
  secret_count INTEGER NOT NULL CHECK (secret_count >= 0),
  required_input_count INTEGER NOT NULL CHECK (required_input_count >= 0),
  package_types_json TEXT NOT NULL,
  remote_types_json TEXT NOT NULL,
  input_signals_json TEXT NOT NULL,
  install_json TEXT NOT NULL,
  search_text TEXT NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  synced_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX servers_status_updated_idx ON servers (status, updated_at DESC);
CREATE INDEX servers_mode_idx ON servers (status, remote_count, local_count);

CREATE TABLE sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cursor TEXT,
  cycle_started_at TEXT,
  last_completed_at TEXT,
  last_error TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO sync_state (id) VALUES (1);

CREATE TABLE product_events (
  session_hash TEXT NOT NULL,
  name TEXT NOT NULL CHECK (
    name IN (
      'visited', 'searched', 'filtered', 'compared',
      'config_copied', 'source_opened', 'returned'
    )
  ),
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (session_hash, name, occurred_on)
);

CREATE INDEX product_events_date_idx ON product_events (occurred_on);
