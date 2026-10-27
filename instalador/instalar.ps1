# Instalador Inverno ERP (Windows) - idempotente: pode correr-se de novo para atualizar.
param([switch]$Silencioso, [int]$Porta = 0)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Say($m, $c = 'Gray') { Write-Host $m -ForegroundColor $c }
function RandHex([int]$bytes) {
  $b = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  -join ($b | ForEach-Object { $_.ToString('x2') })
}
function RandPass([int]$len) {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  $b = New-Object byte[] $len
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  -join ($b | ForEach-Object { $chars[$_ % $chars.Length] })
}

Say ''
Say '  ===  INVERNO ERP - Instalacao  ===' 'Cyan'
Say ''

# 1. Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Say '[!] O Docker Desktop nao esta instalado.' 'Yellow'
  if ($Silencioso) { exit 3 }
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    $r = Read-Host 'Instalar agora o Docker Desktop? (S/N)'
    if ($r -match '^[sSyY]') {
      winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
      Say 'Docker instalado. REINICIE o computador, abra o Docker Desktop e execute este instalador de novo.' 'Green'
    }
  } else {
    Say 'Descarregue em https://www.docker.com/products/docker-desktop , instale, reinicie e execute este instalador de novo.' 'Yellow'
  }
  exit 1
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Say '[!] O Docker esta instalado mas nao esta a correr. Abra o Docker Desktop, espere ficar verde e execute de novo.' 'Yellow'
  if ($Silencioso) { exit 4 }
  exit 1
}

# 2. Configuracao (.env) - criada UMA vez, com segredos aleatorios. Nunca e substituida.
$envFile = Join-Path $root '.env'
$firstInstall = -not (Test-Path $envFile)
if ($firstInstall) {
  Say 'A gerar segredos de seguranca...'
  $adminPass = RandPass 12
  if ($Porta -le 0) { $Porta = 80 }
  $origin = if ($Porta -eq 80) { 'http://localhost' } else { "http://localhost:$Porta" }
  $txt = @(
    "DB_USERNAME=inverno",
    "DB_PASSWORD=$(RandHex 24)",
    "DB_DATABASE=inverno_erp",
    "JWT_SECRET=$(RandHex 48)",
    "LICENSE_SECRET=$(RandHex 32)",
    "INITIAL_ADMIN_PASSWORD=$adminPass",
    "ALLOWED_ORIGINS=$origin",
    "APP_PORT=$Porta"
  ) -join "`r`n"
  [System.IO.File]::WriteAllText($envFile, $txt + "`r`n", (New-Object System.Text.UTF8Encoding $false))
  try { icacls $envFile /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null } catch {}
} else {
  Say 'Instalacao existente detetada: a manter a configuracao e os dados.' 'Green'
  if ($Porta -gt 0) {
    $o = if ($Porta -eq 80) { 'http://localhost' } else { "http://localhost:$Porta" }
    $lines = Get-Content $envFile | ForEach-Object {
      if ($_ -match '^APP_PORT=') { "APP_PORT=$Porta" } elseif ($_ -match '^ALLOWED_ORIGINS=') { "ALLOWED_ORIGINS=$o" } else { $_ }
    }
    [System.IO.File]::WriteAllText($envFile, ($lines -join "`r`n") + "`r`n", (New-Object System.Text.UTF8Encoding $false))
  }
}
$cfg = @{}
Get-Content $envFile | ForEach-Object { if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $cfg[$Matches[1]] = $Matches[2].Trim() } }
$port = if ($cfg['APP_PORT']) { $cfg['APP_PORT'] } else { '80' }
$url = if ($port -eq '80') { 'http://localhost' } else { "http://localhost:$port" }

# 3. Imagens: pre-compiladas (se fornecidas) ou construcao local
$tar = Join-Path $root 'imagens\inverno-imagens.tar'
Say 'A iniciar o sistema (pode demorar alguns minutos na primeira vez)...'
if (Test-Path $tar) {
  docker load -i $tar
  docker compose -f docker-compose.prod.yml --env-file .env up -d --no-build
} else {
  docker compose -f docker-compose.prod.yml --env-file .env up -d --build
}
if ($LASTEXITCODE -ne 0) { Say '[X] Falha ao iniciar. Verifique o Docker Desktop e tente de novo.' 'Red'; exit 1 }

# 4. Esperar pelo sistema e obter o ID desta instalacao
Say 'A aguardar que o sistema fique pronto...'
$iid = $null
for ($i = 0; $i -lt 60; $i++) {
  try {
    $r = Invoke-RestMethod -Uri "$url/licenses/installation-id" -TimeoutSec 5
    $iid = $r.installationId; break
  } catch { Start-Sleep -Seconds 3 }
}
if (-not $iid) { Say '[!] O sistema ainda nao respondeu. Veja: docker compose -f docker-compose.prod.yml logs backend' 'Yellow' }

# 5. Resumo
$out = Join-Path $root 'INSTALACAO-CONCLUIDA.txt'
$lines = @('INVERNO ERP - dados da instalacao', '', "Endereco:        $url", 'Utilizador:      admin')
if ($firstInstall) { $lines += "Palavra-passe:   $($cfg['INITIAL_ADMIN_PASSWORD'])   (altere-a no primeiro acesso)" }
$lines += "ID da instalacao: $iid", '', 'Envie o ID da instalacao ao fornecedor para receber a chave de licenca.',
          'GUARDE estes dados num local seguro e APAGUE este ficheiro.'
[System.IO.File]::WriteAllText($out, ($lines -join "`r`n"), (New-Object System.Text.UTF8Encoding $false))

# 6. Aplicacao Desktop (se vier no pacote): instala no computador do servidor, com atalho
$deskPkg = Join-Path $root 'Desktop'
if (Test-Path (Join-Path $deskPkg 'Inverno ERP.exe')) {
  try {
    $deskDst = Join-Path $env:LOCALAPPDATA 'Inverno ERP Desktop'
    if (Test-Path $deskDst) { Remove-Item $deskDst -Recurse -Force -ErrorAction SilentlyContinue }
    Copy-Item $deskPkg $deskDst -Recurse -Force
    $cfgDir = Join-Path $env:APPDATA 'Inverno ERP'
    New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
    $cfgJson = '{ "serverUrl": "' + $url.TrimEnd('/') + '" }'
    [System.IO.File]::WriteAllText((Join-Path $cfgDir 'config.json'), $cfgJson, (New-Object System.Text.UTF8Encoding $false))
    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Inverno ERP.lnk'))
    $lnk.TargetPath = Join-Path $deskDst 'Inverno ERP.exe'
    $lnk.WorkingDirectory = $deskDst
    $lnk.Save()
    Say '  Aplicacao Desktop instalada (atalho "Inverno ERP" no ambiente de trabalho).' 'Green'
  } catch { Say '[!] Nao foi possivel instalar a aplicacao Desktop (pode usar o browser).' 'Yellow' }
}

Say ''
Say '  INSTALACAO CONCLUIDA' 'Green'
Say "  Endereco:     $url"
Say '  Utilizador:   admin'
if ($firstInstall) { Say "  Palavra-passe: $($cfg['INITIAL_ADMIN_PASSWORD'])" 'Yellow' }
Say "  ID da instalacao: $iid" 'Cyan'
Say '  (dados guardados em INSTALACAO-CONCLUIDA.txt - guarde e apague)'
Say ''
if (-not $Silencioso) { Start-Process $url }
