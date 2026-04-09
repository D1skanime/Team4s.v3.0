$ErrorActionPreference = "Stop"

# start-frontend-dev.ps1 configures the Next.js dev server to talk to the
# locally running backend so frontend changes hot-reload instantly during UI
# work and browser debugging.

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"

Write-Host "Frontend dev startup" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host "Frontend: $frontendDir"

$env:NEXT_PUBLIC_API_URL = "http://localhost:8092"
$env:API_INTERNAL_URL = "http://localhost:8092"
$env:NEXT_PUBLIC_RUNTIME_PROFILE = "local"
$env:NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE = "true"

Write-Host ""
Write-Host "Environment configured:" -ForegroundColor Green
Write-Host "  NEXT_PUBLIC_API_URL=$env:NEXT_PUBLIC_API_URL"
Write-Host "  API_INTERNAL_URL=$env:API_INTERNAL_URL"

Push-Location $frontendDir
try {
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Write-Host ""
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }

    Write-Host ""
    Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Green
    npm run dev
}
finally {
    Pop-Location
}
