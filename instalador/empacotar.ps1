# Empacotador Inverno ERP - USO EXCLUSIVO DO FABRICANTE.
# Gera a pasta/ZIP de entrega ao cliente: imagens Docker pre-compiladas, SEM codigo-fonte.
# Uso:  powershell -ExecutionPolicy Bypass -File instalador\empacotar.ps1 -Versao 1.0.0
param([string]$Versao = '1.0.0', [switch]$SemDesktop)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
function Say($m, $c = 'Gray') { Write-Host $m -ForegroundColor $c }

docker info *> $null
if ($LASTEXITCODE -ne 0) { Say '[X] Docker nao esta a correr.' 'Red'; exit 1 }

# Aplicacao de secretaria (Desktop): usa a pasta pronta ou compila com Node.js. Falha cedo se faltar.
$deskSrc = $null
if (-not $SemDesktop) {
  $cands = @((Join-Path $root 'desktop\Inverno-ERP-Desktop'), (Join-Path $root 'desktop\dist\win-unpacked'))
  $deskSrc = $cands | Where-Object { Test-Path (Join-Path $_ 'Inverno ERP.exe') } | Select-Object -First 1
  if (-not $deskSrc) {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npm) {
      Say '[X] A versao Desktop nao esta pronta e o Node.js nao esta instalado.' 'Red'
      Say '    Opcao 1: descomprima Inverno-ERP-Desktop-1.0.0-portatil.zip para dentro da pasta desktop\ do projeto.' 'Yellow'
      Say '    Opcao 2: instale o Node.js (https://nodejs.org) e gere de novo.' 'Yellow'
      Say '    Opcao 3: desmarque "Incluir versao Desktop" para gerar so a versao no browser.' 'Yellow'
      exit 1
    }
    Say 'A compilar a aplicacao Desktop (primeira vez demora alguns minutos)...' 'Cyan'
    Push-Location (Join-Path $root 'desktop')
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -eq 0) { & npm run dist:dir }
    $okDesk = ($LASTEXITCODE -eq 0)
    Pop-Location
    if (-not $okDesk) { Say '[X] Falha ao compilar a aplicacao Desktop (npm). Verifique a internet e tente de novo.' 'Red'; exit 1 }
    $deskSrc = Join-Path $root 'desktop\dist\win-unpacked'
    if (-not (Test-Path (Join-Path $deskSrc 'Inverno ERP.exe'))) { Say '[X] A compilacao do Desktop nao produziu Inverno ERP.exe.' 'Red'; exit 1 }
  }
  Say "Desktop: $deskSrc" 'Gray'
} else { Say 'Desktop: omitido (so versao no browser).' 'Yellow' }

# Seguranca: nunca empacotar a chave privada nem segredos
$leak = Get-ChildItem -Path (Join-Path $root 'backend'), (Join-Path $root 'frontend') -Recurse -Include *.pem, .env -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch 'node_modules' }
if ($leak) { Say '[X] Ficheiros sensiveis dentro de backend/frontend (nao vao para a imagem por .dockerignore, mas confirme):' 'Yellow'; $leak | ForEach-Object { Say "    $($_.FullName)" 'Yellow' } }

$env:INVERNO_VERSION = $Versao
Say "A compilar imagens (versao $Versao)..." 'Cyan'
docker compose -f docker-compose.prod.yml build --no-cache
if ($LASTEXITCODE -ne 0) { Say '[X] Falha na compilacao.' 'Red'; exit 1 }

$dest = Join-Path $root "entrega\Inverno-ERP-$Versao"
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Path "$dest\instalador", "$dest\imagens" -Force | Out-Null

Say 'A descarregar a imagem do Postgres...' 'Cyan'
docker pull postgres:15-alpine
if ($LASTEXITCODE -ne 0) { Say '[X] Falha ao descarregar postgres:15-alpine (ligue-se a internet).' 'Red'; exit 1 }
Say 'A exportar imagens (pode demorar)...' 'Cyan'
docker save -o "$dest\imagens\inverno-imagens.tar" "inverno/backend:$Versao" "inverno/frontend:$Versao" postgres:15-alpine
if ($LASTEXITCODE -ne 0) { Say '[X] Falha ao exportar imagens.' 'Red'; exit 1 }

# docker-compose de entrega: sem blocos "build" (o cliente nao tem o codigo)
$c = Get-Content docker-compose.prod.yml -Raw
$c = [regex]::Replace($c, '\s+build:\s*\r?\n\s+context:[^\r\n]*\r?\n\s+dockerfile:[^\r\n]*', '')
$c = $c.Replace('${INVERNO_VERSION:-local}', $Versao)
[System.IO.File]::WriteAllText("$dest\docker-compose.prod.yml", $c, (New-Object System.Text.UTF8Encoding $false))

Copy-Item instalador\Instalar-Inverno.bat, instalador\instalar.ps1, instalador\Instalador-Grafico.ps1 "$dest\instalador\"
# Aplicacao de secretaria (Desktop): copia a pasta preparada no inicio
if ($deskSrc) {
  Say 'A incluir a aplicacao de secretaria (Desktop)...' 'Cyan'
  Copy-Item $deskSrc "$dest\Desktop" -Recurse -Force
}

$leia = @(
 "INVERNO ERP $Versao - Instalacao",
 "",
 "1. Instale o Docker Desktop (https://www.docker.com/products/docker-desktop) e abra-o.",
 "2. Faca duplo clique em  instalador\Instalar-Inverno.bat  (assistente grafico: clique em Instalar)",
 "3. No fim, o sistema abre no browser. Guarde a palavra-passe e o ID da instalacao mostrados.",
 "4. Envie o ID da instalacao ao fornecedor para receber a chave de licenca (menu Administracao > Licenca > Ativar).",
 "",
 "O sistema funciona em modo de avaliacao durante 30 dias. Depois exige licenca valida.",
 "A utilizacao esta sujeita ao Contrato de Licenca apresentado no primeiro acesso.",
 "As copias de seguranca configuram-se em Administracao > Planos Agendados."
)
if ($deskSrc) {
  $leia += @("", "VERSAO DESKTOP: o instalador ja a instala no computador do servidor (atalho Inverno ERP no ambiente de trabalho).",
    "Para os outros computadores da rede: copie a pasta Desktop e abra Inverno ERP.exe; na primeira vez indique o IP do servidor (ex.: http://192.168.1.10).")
}
$leia = $leia -join "`r`n"
[System.IO.File]::WriteAllText("$dest\LEIA-ME.txt", $leia, (New-Object System.Text.UTF8Encoding $false))

$zip = "$dest.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$dest\*" -DestinationPath $zip
$h = (Get-FileHash $zip -Algorithm SHA256).Hash
# registo do pacote (importado depois no Gerador-Licencas, separador Clientes e entregas)
try {
  $regFile = Join-Path (Split-Path $zip -Parent) 'registo-pacotes.json'
  $reg = @()
  if (Test-Path $regFile) { $old = Get-Content $regFile -Raw | ConvertFrom-Json; if ($old) { $reg = @($old) } }
  $reg += [pscustomobject]@{ id = [guid]::NewGuid().ToString(); versao = $Versao; data = (Get-Date).ToString('s'); ficheiro = (Split-Path $zip -Leaf); sha256 = $h.ToLower(); desktop = [bool]$deskSrc; tamanhoMB = [math]::Round((Get-Item $zip).Length / 1MB, 1) }
  ConvertTo-Json -InputObject @($reg) -Depth 4 | Set-Content -Path $regFile -Encoding UTF8
} catch { Say "  (aviso) nao foi possivel gravar registo-pacotes.json: $($_.Exception.Message)" 'Yellow' }
Say ''
Say '  PACOTE PRONTO' 'Green'
Say "  $zip"
Say "  SHA256: $h"
Say '  Entregue o ZIP ao cliente (sem codigo-fonte, sem chave privada). Guarde o SHA256 para verificar a integridade.'
Say '  Registo gravado em registo-pacotes.json (importe-o no Gerador de Licencas).'
