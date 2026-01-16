$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiEnv = Join-Path $root "..\apps\api\.env"
$apiExample = Join-Path $root "..\apps\api\.env.example"

if (-Not (Test-Path $apiEnv)) {
  Copy-Item -Path $apiExample -Destination $apiEnv
  Write-Output "Created apps/api/.env from .env.example"
} else {
  Write-Output "apps/api/.env already exists"
}
