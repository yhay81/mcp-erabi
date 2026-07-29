[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute mcp-erabi $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param(
        [int]$Numerator,
        [int]$Denominator
    )

    if ($Denominator -eq 0) { return 0.0 }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Searchers = [int]$Row.searchers
$Comparers = [int]$Row.comparers
$Copiers = [int]$Row.config_copiers

[ordered]@{
    generated_at = [DateTimeOffset]::UtcNow.ToString("o")
    service = "mcp-erabi"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        searchers = $Searchers
        filter_users = [int]$Row.filter_users
        comparers = $Comparers
        config_copiers = $Copiers
        source_openers = [int]$Row.source_openers
        returned = [int]$Row.returned
        users_7d = [int]$Row.users_7d
        searchers_7d = [int]$Row.searchers_7d
        config_copiers_7d = [int]$Row.config_copiers_7d
    }
    product = [ordered]@{
        active_servers = [int]$Row.active_servers
        remote_servers = [int]$Row.remote_servers
        local_servers = [int]$Row.local_servers
        servers_with_secrets = [int]$Row.servers_with_secrets
        servers_with_repository = [int]$Row.servers_with_repository
    }
    rates = [ordered]@{
        search_percent = Get-Percent $Searchers $Users
        compare_percent = Get-Percent $Comparers $Searchers
        config_copy_percent = Get-Percent $Copiers $Searchers
        source_open_percent = Get-Percent ([int]$Row.source_openers) $Searchers
        return_percent = Get-Percent ([int]$Row.returned) $Users
    }
} | ConvertTo-Json -Depth 4
