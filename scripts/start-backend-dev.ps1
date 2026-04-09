param(
    [switch]$RunMigrations
)

$ErrorActionPreference = "Stop"

# start-backend-dev.ps1 configures the local backend process against the
# project-local Postgres and Redis instances so the server can be debugged
# directly from VS Code without rebuilding Docker images.

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$migrationsDir = Join-Path $repoRoot "database\migrations"
$mediaDir = Join-Path $repoRoot "media"
$envFile = Join-Path $repoRoot ".env"

function Get-DotEnvValue {
    param(
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path $Path)) {
        return ""
    }

    $prefix = "$Name="
    foreach ($line in Get-Content -Path $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }
        if ($trimmed.StartsWith($prefix)) {
            return $trimmed.Substring($prefix.Length).Trim()
        }
    }

    return ""
}

Write-Host "Backend dev startup" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host "Backend: $backendDir"

$env:PORT = "8092"
$env:RUNTIME_PROFILE = "local"
$env:DATABASE_URL = "postgres://team4s:team4s_dev_password@localhost:5433/team4s_v2?sslmode=disable"
$env:REDIS_ADDR = "localhost:6379"
$env:REDIS_DB = "0"
$env:AUTH_TOKEN_SECRET = "team4s-local-dev-secret"
$env:AUTH_ADMIN_BOOTSTRAP_USER_IDS = "1"
$env:AUTH_ISSUE_DEV_MODE = "true"
$env:AUTH_ISSUE_DEV_USER_ID = "1"
$env:AUTH_ISSUE_DEV_DISPLAY_NAME = "LocalAdmin"
$env:MEDIA_STORAGE_DIR = $mediaDir
$env:MEDIA_PUBLIC_BASE_URL = "http://localhost:8092"

# Local integration config: read optional Jellyfin values from the repo .env so
# the local backend can exercise provider flows without hand-exporting secrets.
$jellyfinBaseUrl = Get-DotEnvValue -Path $envFile -Name "JELLYFIN_BASE_URL"
$jellyfinApiKey = Get-DotEnvValue -Path $envFile -Name "JELLYFIN_API_KEY"
$jellyfinStreamTemplate = Get-DotEnvValue -Path $envFile -Name "JELLYFIN_STREAM_PATH_TEMPLATE"

if ($jellyfinBaseUrl) {
    $env:JELLYFIN_BASE_URL = $jellyfinBaseUrl
}
if ($jellyfinApiKey) {
    $env:JELLYFIN_API_KEY = $jellyfinApiKey
}
if ($jellyfinStreamTemplate) {
    $env:JELLYFIN_STREAM_PATH_TEMPLATE = $jellyfinStreamTemplate
}

Write-Host ""
Write-Host "Environment configured:" -ForegroundColor Green
Write-Host "  PORT=$env:PORT"
Write-Host "  DATABASE_URL=$env:DATABASE_URL"
Write-Host "  REDIS_ADDR=$env:REDIS_ADDR"
Write-Host "  MEDIA_STORAGE_DIR=$env:MEDIA_STORAGE_DIR"
Write-Host "  JELLYFIN_BASE_URL=$($env:JELLYFIN_BASE_URL)"
Write-Host "  JELLYFIN_API_KEY=$(if ($env:JELLYFIN_API_KEY) { 'configured' } else { 'missing' })"

Push-Location $backendDir
try {
    if ($RunMigrations) {
        Write-Host ""
        Write-Host "Applying migrations..." -ForegroundColor Yellow
        go run .\cmd\migrate up -dir $migrationsDir
    }

    Write-Host ""
    Write-Host "Starting backend on http://localhost:8092" -ForegroundColor Green
    go run .\cmd\server
}
finally {
    Pop-Location
}
