WITH event_metrics AS (
  SELECT
    COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_hash END) AS users,
    COUNT(DISTINCT CASE WHEN name = 'searched' THEN session_hash END) AS searchers,
    COUNT(DISTINCT CASE WHEN name = 'filtered' THEN session_hash END) AS filter_users,
    COUNT(DISTINCT CASE WHEN name = 'compared' THEN session_hash END) AS comparers,
    COUNT(DISTINCT CASE WHEN name = 'config_copied' THEN session_hash END) AS config_copiers,
    COUNT(DISTINCT CASE WHEN name = 'source_opened' THEN session_hash END) AS source_openers,
    COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_hash END) AS returned,
    COUNT(DISTINCT CASE WHEN name = 'visited' AND occurred_on >= date('now', '-6 days') THEN session_hash END) AS users_7d,
    COUNT(DISTINCT CASE WHEN name = 'searched' AND occurred_on >= date('now', '-6 days') THEN session_hash END) AS searchers_7d,
    COUNT(DISTINCT CASE WHEN name = 'config_copied' AND occurred_on >= date('now', '-6 days') THEN session_hash END) AS config_copiers_7d
  FROM product_events
),
catalog_metrics AS (
  SELECT
    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_servers,
    COUNT(CASE WHEN status = 'active' AND remote_count > 0 THEN 1 END) AS remote_servers,
    COUNT(CASE WHEN status = 'active' AND local_count > 0 THEN 1 END) AS local_servers,
    COUNT(CASE WHEN status = 'active' AND secret_count > 0 THEN 1 END) AS servers_with_secrets,
    COUNT(CASE WHEN status = 'active' AND repository_url <> '' THEN 1 END) AS servers_with_repository
  FROM servers
)
SELECT *
FROM event_metrics
CROSS JOIN catalog_metrics;
