param(
    [string]$FrontendBaseUrl = "http://127.0.0.1:3000",
    [string]$Routes = "/,/anime,/archiv",
    [ValidateRange(1, 5)]
    [int]$Passes = 2,
    [ValidateRange(5, 120)]
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

$routeList = @($Routes.Split(",", [StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() })

if ($routeList.Count -eq 0) {
    throw "Mindestens eine Frontend-Route ist erforderlich."
}

$baseUrl = $FrontendBaseUrl.TrimEnd("/")
$results = @()

Write-Host "Frontend-Dev-Warm-up" -ForegroundColor Cyan
Write-Host "Dieser Schritt ruft nur Frontend-Routen ab; Backend und Datenbank werden weder neu gebaut noch neu gestartet."
Write-Host "Basis-URL: $baseUrl"

for ($pass = 1; $pass -le $Passes; $pass++) {
    foreach ($route in $routeList) {
        if (-not $route.StartsWith("/")) {
            throw "Ungültige Route '$route': Routen müssen mit '/' beginnen."
        }

        $uri = "$baseUrl$route"
        $stopwatch = [Diagnostics.Stopwatch]::StartNew()

        try {
            $response = Invoke-WebRequest `
                -UseBasicParsing `
                -Uri $uri `
                -TimeoutSec $TimeoutSeconds
        }
        catch {
            $stopwatch.Stop()
            throw "Warm-up fehlgeschlagen für '$uri' nach $([math]::Round($stopwatch.Elapsed.TotalSeconds, 3)) s: $($_.Exception.Message)"
        }

        $stopwatch.Stop()
        if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
            throw "Warm-up fehlgeschlagen für '$uri': HTTP $($response.StatusCode)."
        }

        $results += [pscustomobject]@{
            Pass = $pass
            Route = $route
            Status = $response.StatusCode
            Seconds = [math]::Round($stopwatch.Elapsed.TotalSeconds, 3)
        }
    }
}

Write-Host ""
$results | Format-Table -AutoSize

Write-Host "Warm-up abgeschlossen. Für dynamische UAT-Seiten die exakten Routen über -Routes ergänzen." -ForegroundColor Green
