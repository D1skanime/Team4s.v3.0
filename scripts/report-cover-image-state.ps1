param(
  [string]$ComposeProjectDir = (Split-Path -Parent $PSScriptRoot),
  [string]$DbUser = 'team4s',
  [string]$DbName = 'team4s',
  [string]$CoversDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'frontend/public/covers'),
  [int]$SampleProblemRows = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-ComposePsqlCopy {
  param(
    [Parameter(Mandatory = $true)][string]$ComposeDir,
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$DatabaseName,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  $cmd = @(
    'docker', 'compose',
    '--project-directory', $ComposeDir,
    'exec', '-T', 'postgres',
    'psql', '-U', $User, '-d', $DatabaseName,
    '-v', 'ON_ERROR_STOP=1',
    '-c', $Sql
  )

  $out = & $cmd[0] $cmd[1..($cmd.Count - 1)]
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed (exit=$LASTEXITCODE)"
  }
  return ($out -join "`n")
}

if (-not (Test-Path $ComposeProjectDir)) {
  throw "ComposeProjectDir not found: $ComposeProjectDir"
}

if (-not (Test-Path $CoversDir)) {
  throw "CoversDir not found: $CoversDir"
}

$csv = Invoke-ComposePsqlCopy -ComposeDir $ComposeProjectDir -User $DbUser -DatabaseName $DbName -Sql @"
COPY (
  SELECT id, title, cover_image
  FROM anime
  ORDER BY id
) TO STDOUT WITH (FORMAT csv, HEADER true);
"@

$rows = $csv | ConvertFrom-Csv

$counts = [ordered]@{
  total = 0
  empty = 0
  url = 0
  path = 0
  filename = 0
  cover_asset_present = 0
  cover_asset_missing = 0
}

$urlRows = New-Object System.Collections.Generic.List[object]
$pathRows = New-Object System.Collections.Generic.List[object]
$missingAssetRows = New-Object System.Collections.Generic.List[object]
$emptyRows = New-Object System.Collections.Generic.List[object]

foreach ($r in $rows) {
  $counts.total++

  $coverRaw = $null
  if ($null -ne $r.cover_image) {
    $coverRaw = [string]$r.cover_image
  }
  if ($null -eq $coverRaw) {
    $cover = ''
  } else {
    $cover = $coverRaw.Trim()
  }

  if ([string]::IsNullOrWhiteSpace($cover)) {
    $counts.empty++
    $emptyRows.Add($r) | Out-Null
    continue
  }

  if ($cover -match '^(?i)https?://') {
    $counts.url++
    $urlRows.Add($r) | Out-Null
    continue
  }

  if ($cover.Contains('/') -or $cover.Contains('\')) {
    $counts.path++
    $pathRows.Add($r) | Out-Null
  } else {
    $counts.filename++
  }

  $baseName = [System.IO.Path]::GetFileName($cover)
  if ([string]::IsNullOrWhiteSpace($baseName)) {
    $counts.cover_asset_missing++
    $missingAssetRows.Add($r) | Out-Null
    continue
  }

  $assetPath = Join-Path $CoversDir $baseName
  if (Test-Path $assetPath) {
    $counts.cover_asset_present++
  } else {
    $counts.cover_asset_missing++
    $missingAssetRows.Add($r) | Out-Null
  }
}

Write-Output "=== cover_image state report ==="
Write-Output "compose_dir: $ComposeProjectDir"
Write-Output "covers_dir:  $CoversDir"
Write-Output ""

Write-Output "Counts:"
$counts.GetEnumerator() | ForEach-Object { "  {0}: {1}" -f $_.Key, $_.Value } | Write-Output
Write-Output ""

$problems = New-Object System.Collections.Generic.List[object]
foreach ($x in ($urlRows | Select-Object -First $SampleProblemRows)) { $problems.Add($x) | Out-Null }
foreach ($x in ($pathRows | Select-Object -First $SampleProblemRows)) { if ($problems.Count -ge $SampleProblemRows) { break }; $problems.Add($x) | Out-Null }
foreach ($x in ($missingAssetRows | Select-Object -First $SampleProblemRows)) { if ($problems.Count -ge $SampleProblemRows) { break }; $problems.Add($x) | Out-Null }
foreach ($x in ($emptyRows | Select-Object -First $SampleProblemRows)) { if ($problems.Count -ge $SampleProblemRows) { break }; $problems.Add($x) | Out-Null }

Write-Output ("Problem samples (up to {0} rows):" -f $SampleProblemRows)
if ($problems.Count -eq 0) {
  Write-Output "  (none)"
  exit 0
}

$problems |
  Select-Object `
    @{n='id';e={$_.id}}, `
    @{n='title';e={$_.title}}, `
    @{n='cover_image';e={$_.cover_image}} |
  Format-Table -AutoSize |
  Out-String -Width 400 |
  Write-Output
