# Run this while logged into GitHub as the Billifi repo OWNER (funkey18).
# Usage (from repo root):
#   pwsh -File scripts/setup-github-oci-secrets.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$keyFile = Join-Path $repoRoot ".deploy_oci"

if (-not (Test-Path $keyFile)) {
  Write-Error "Missing $keyFile — deploy key was not found."
}

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  $portable = Get-ChildItem -Recurse (Join-Path (Split-Path $repoRoot -Parent) "gh-cli") -Filter gh.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if ($portable) { $gh = $portable } else { Write-Error "Install GitHub CLI: https://cli.github.com/" }
} else {
  $gh = $gh.Source
}

Write-Host "GitHub user:" (& $gh api user --jq .login)
$key = (Get-Content $keyFile -Raw) -replace "`r`n", "`n"

& $gh secret set OCI_SSH_KEY --repo funkey18/Billifi --body $key
& $gh secret set OCI_HOST --repo funkey18/Billifi --body "137.23.53.90"
& $gh secret set OCI_USER --repo funkey18/Billifi --body "ubuntu"
& $gh secret list --repo funkey18/Billifi

Write-Host ""
Write-Host "Secrets set. Trigger deploy: Actions → Deploy to OCI → Run workflow"
