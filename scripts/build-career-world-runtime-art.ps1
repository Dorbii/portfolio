param(
  [string]$Node = "node"
)

$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repositoryRoot "public/career-world/art/runtime-art-manifest.json"
$builderPath = Join-Path $PSScriptRoot "build-career-world-runtime-alpha.mjs"

if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Missing Career World runtime manifest at $manifestPath"
}

if (-not (Test-Path -LiteralPath $builderPath)) {
  throw "Missing Career World Sharp builder at $builderPath"
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$records = @($manifest.records)
foreach ($record in $records) {
  # A fresh process per image provides a hard memory boundary. The builder
  # disables the Sharp cache and fixes libvips concurrency at one.
  & $Node $builderPath "--asset=$($record.asset_id)" "--from-source"
  if ($LASTEXITCODE -ne 0) {
    throw "Career World runtime art build failed for $($record.asset_id)"
  }
}

Write-Output "Rebuilt $($records.Count) Career World assets without FFmpeg, including the exact 1600x900 world plane."
