param(
    [string]$OutputPath = ".planning/phases/20.1-db-schema-v2-physical-cutover/20.1-02-schema-audit.md"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$auditScript = Join-Path $scriptDir "schema-v2-audit.ps1"

& $auditScript -OutputPath $OutputPath -FailOnContractGaps
