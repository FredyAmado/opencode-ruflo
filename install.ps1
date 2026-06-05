$ErrorActionPreference = "Stop"
$RUFFLO_DIR = "$env:USERPROFILE\.config\opencode\opencode-ruflo"

Write-Host "Instalando opencode-ruflo..." -ForegroundColor Cyan

# 1. Verificar Bun
if (-not (Get-Command "bun" -ErrorAction SilentlyContinue)) {
  Write-Host "Instalando Bun..." -ForegroundColor Yellow
  powershell -c "irm bun.sh/install.ps1 | iex"
}
bun --version

# 2. Instalar dependencias del servidor
Write-Host "`nInstalando dependencias del servidor..." -ForegroundColor Cyan
Set-Location "$RUFFLO_DIR\server"
bun install

# 3. Instalar dependencias del MCP
Write-Host "`nInstalando dependencias del MCP..." -ForegroundColor Cyan
Set-Location "$RUFFLO_DIR\mcp"
bun install

# 4. Agregar a opencode.json
$OPENCODE_CONFIG = "$env:USERPROFILE\.config\opencode\opencode.json"
$PLUGIN_ENTRY = "file:///$($RUFFLO_DIR.Replace('\', '/'))/plugin/opencode-ruflo.plugin.ts"

if (Test-Path $OPENCODE_CONFIG) {
  $config = Get-Content $OPENCODE_CONFIG -Raw | ConvertFrom-Json
  $exists = $config.plugins -contains $PLUGIN_ENTRY
  if (-not $exists) {
    $config.plugins += $PLUGIN_ENTRY
    $config | ConvertTo-Json -Depth 10 | Set-Content $OPENCODE_CONFIG
    Write-Host "Plugin agregado a opencode.json" -ForegroundColor Green
  } else {
    Write-Host "Plugin ya está en opencode.json" -ForegroundColor Yellow
  }
} else {
  $config = @{ plugins = @($PLUGIN_ENTRY) }
  $config | ConvertTo-Json -Depth 10 | Set-Content $OPENCODE_CONFIG
  Write-Host "Creado opencode.json con el plugin" -ForegroundColor Green
}

# 5. Probar worker
Write-Host "`nProbando worker..." -ForegroundColor Cyan
Set-Location "$RUFFLO_DIR\server"
$process = Start-Process -NoNewWindow -FilePath "bun" -ArgumentList "run", "src/worker-service.ts" -PassThru
Start-Sleep -Seconds 3
try {
  $response = Invoke-RestMethod -Uri "http://127.0.0.1:37778/api/health" -ErrorAction Stop
  Write-Host "Worker responde: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
  Write-Host "ERROR: No se pudo conectar al worker" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
}
$process | Stop-Process -Force

Write-Host "`nInstalación completa!" -ForegroundColor Green
Write-Host "Reinicia Opencode para activar el plugin." -ForegroundColor Yellow
