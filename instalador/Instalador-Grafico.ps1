# Instalador grafico do Inverno ERP - para o computador do cliente. Abrir com Instalar-Inverno.bat.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$root    = Split-Path -Parent $PSScriptRoot
$script  = Join-Path $PSScriptRoot 'instalar.ps1'
$envFile = Join-Path $root '.env'
$compose = Join-Path $root 'docker-compose.prod.yml'
$logFile = Join-Path $env:TEMP 'inverno-instalador.log'
$cGreen = [System.Drawing.Color]::FromArgb(15, 122, 74); $cAmber = [System.Drawing.Color]::FromArgb(154, 91, 0); $cRed = [System.Drawing.Color]::FromArgb(179, 38, 30)
$script:res = @{ url = ''; pass = ''; iid = '' }

function Get-EnvPort {
  try { if (Test-Path $envFile) { foreach ($l in Get-Content $envFile) { if ($l -match '^APP_PORT=(\d+)') { return [int]$Matches[1] } } } } catch {}
  return 80
}
function Test-DockerInstalled { return [bool](Get-Command docker -ErrorAction SilentlyContinue) }
function Test-DockerRunning { try { & docker info *> $null; return ($LASTEXITCODE -eq 0) } catch { return $false } }

$f = New-Object System.Windows.Forms.Form
$f.Text = 'Inverno ERP - Instalação'
$f.StartPosition = 'CenterScreen'
$f.ClientSize = New-Object System.Drawing.Size(720, 640)
$f.MinimumSize = New-Object System.Drawing.Size(720, 640)
$f.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$f.BackColor = [System.Drawing.Color]::FromArgb(243, 245, 248)

function New-Label($text, $x, $y, $font, $color) {
  $l = New-Object System.Windows.Forms.Label; $l.Text = $text; $l.AutoSize = $true
  $l.Location = New-Object System.Drawing.Point($x, $y)
  if ($font) { $l.Font = $font }; if ($color) { $l.ForeColor = $color }
  $f.Controls.Add($l); return $l
}
function New-Button($text, $x, $y, $w) {
  $b = New-Object System.Windows.Forms.Button; $b.Text = $text; $b.Width = $w; $b.Height = 34
  $b.Location = New-Object System.Drawing.Point($x, $y); $b.FlatStyle = 'System'
  $f.Controls.Add($b); return $b
}
[void](New-Label 'Instalar o Inverno ERP' 20 14 (New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)) $null)
[void](New-Label 'Este assistente prepara tudo sozinho. Não precisa de escrever comandos.' 22 48 $null ([System.Drawing.Color]::FromArgb(91, 107, 125)))

$lblDocker = New-Label '' 20 84 $null $null
$lblInst   = New-Label '' 20 110 $null $null
[void](New-Label 'Porta de acesso (80 = endereço simples http://localhost):' 20 144 $null $null)
$tbPorta = New-Object System.Windows.Forms.TextBox; $tbPorta.Width = 70; $tbPorta.Location = New-Object System.Drawing.Point(420, 140)
$tbPorta.Text = [string](Get-EnvPort); $f.Controls.Add($tbPorta)

$btnInstalar = New-Button 'Instalar' 20 180 150
$btnInstalar.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$btnDocker = New-Button 'Instalar Docker' 180 180 150
$btnAbrir  = New-Button 'Abrir o programa' 340 180 150
$btnIniciar = New-Button 'Iniciar' 500 180 95
$btnParar   = New-Button 'Parar' 605 180 95
$btnAbrir.Enabled = $false

$bar = New-Object System.Windows.Forms.ProgressBar; $bar.Location = New-Object System.Drawing.Point(20, 226); $bar.Size = New-Object System.Drawing.Size(680, 12)
$f.Controls.Add($bar)
$lblEstado = New-Label 'Pronto para instalar.' 20 246 $null $null

# resultado
$pnl = New-Object System.Windows.Forms.GroupBox; $pnl.Text = 'Dados do acesso (guarde-os)'; $pnl.Location = New-Object System.Drawing.Point(20, 276); $pnl.Size = New-Object System.Drawing.Size(680, 130); $pnl.Visible = $false
$f.Controls.Add($pnl)
function Add-Row($label, $y) {
  $l = New-Object System.Windows.Forms.Label; $l.Text = $label; $l.AutoSize = $true; $l.Location = New-Object System.Drawing.Point(14, ($y + 4)); $pnl.Controls.Add($l)
  $t = New-Object System.Windows.Forms.TextBox; $t.ReadOnly = $true; $t.Width = 430; $t.Location = New-Object System.Drawing.Point(150, $y); $t.Font = New-Object System.Drawing.Font('Consolas', 10); $pnl.Controls.Add($t)
  $b = New-Object System.Windows.Forms.Button; $b.Text = 'Copiar'; $b.Width = 70; $b.Location = New-Object System.Drawing.Point(590, ($y - 1)); $pnl.Controls.Add($b)
  $b.Add_Click({ if ($t.Text) { [System.Windows.Forms.Clipboard]::SetText($t.Text) } }.GetNewClosure())
  return $t
}
$tUrl = Add-Row 'Endereço:' 24
$tPass = Add-Row 'Palavra-passe (admin):' 56
$tIid = Add-Row 'ID da instalação:' 88

$log = New-Object System.Windows.Forms.RichTextBox
$log.Location = New-Object System.Drawing.Point(20, 416); $log.Size = New-Object System.Drawing.Size(680, 204)
$log.Anchor = 'Top,Bottom,Left,Right'; $log.ReadOnly = $true
$log.BackColor = [System.Drawing.Color]::FromArgb(20, 32, 46); $log.ForeColor = [System.Drawing.Color]::FromArgb(220, 230, 240)
$log.Font = New-Object System.Drawing.Font('Consolas', 9)
$f.Controls.Add($log)

function Log($m, $color) {
  if (-not $color) { $color = [System.Drawing.Color]::FromArgb(220, 230, 240) }
  $log.SelectionStart = $log.TextLength; $log.SelectionColor = $color
  $log.AppendText($m + "`r`n"); $log.ScrollToCaret()
}
function Refresh-Status {
  if (-not (Test-DockerInstalled)) { $lblDocker.Text = 'Docker: não instalado. Clique em "Instalar Docker" (precisa de reiniciar o computador depois).'; $lblDocker.ForeColor = $cRed; $btnDocker.Enabled = $true }
  elseif (-not (Test-DockerRunning)) { $lblDocker.Text = 'Docker: instalado mas parado. Abra o Docker Desktop e espere que fique "running".'; $lblDocker.ForeColor = $cAmber; $btnDocker.Enabled = $false }
  else { $lblDocker.Text = 'Docker: pronto.'; $lblDocker.ForeColor = $cGreen; $btnDocker.Enabled = $false }
  if (Test-Path $envFile) { $lblInst.Text = 'Já existe uma instalação aqui: os dados e a configuração serão mantidos (atualização).'; $lblInst.ForeColor = $cGreen; $btnInstalar.Text = 'Atualizar'; $btnAbrir.Enabled = $true }
  else { $lblInst.Text = 'Instalação nova.'; $lblInst.ForeColor = [System.Drawing.Color]::FromArgb(60, 70, 85); $btnInstalar.Text = 'Instalar' }
  $hasEnv = Test-Path $envFile
  $btnIniciar.Enabled = $hasEnv; $btnParar.Enabled = $hasEnv
}
function Get-Url { $p = Get-EnvPort; if ($p -eq 80) { return 'http://localhost' } else { return "http://localhost:$p" } }

$script:logPos = 0; $script:partial = ''; $script:proc = $null; $script:mode = ''
$timer = New-Object System.Windows.Forms.Timer; $timer.Interval = 200

function Read-NewLines {
  $out = @()
  try {
    $fs = [System.IO.File]::Open($logFile, 'Open', 'Read', 'ReadWrite')
    try {
      if ($fs.Length -gt $script:logPos) {
        [void]$fs.Seek($script:logPos, 'Begin')
        $buf = New-Object byte[] ($fs.Length - $script:logPos)
        $n = $fs.Read($buf, 0, $buf.Length); $script:logPos += $n
        $txt = $script:partial + [System.Text.Encoding]::UTF8.GetString($buf, 0, $n)
        $parts = $txt -split "`r?`n"; $script:partial = $parts[-1]
        if ($parts.Count -gt 1) { $out = $parts[0..($parts.Count - 2)] }
      }
    } finally { $fs.Close() }
  } catch {}
  return $out
}
function Set-Busy($busy) {
  foreach ($c in @($btnInstalar, $btnDocker, $btnIniciar, $btnParar, $tbPorta)) { $c.Enabled = -not $busy }
  if ($busy) { $bar.Style = 'Marquee'; $bar.MarqueeAnimationSpeed = 30 } else { $bar.Style = 'Continuous'; $bar.MarqueeAnimationSpeed = 0 }
}
function Start-Cmd($cmdLine, $mode) {
  $script:mode = $mode; $script:logPos = 0; $script:partial = ''
  try { if (Test-Path $logFile) { Remove-Item $logFile -Force } } catch {}
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'cmd.exe'
  $psi.Arguments = "/c chcp 65001 >nul & $cmdLine > `"$logFile`" 2>&1"
  $psi.WorkingDirectory = $root; $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
  $p = New-Object System.Diagnostics.Process; $p.StartInfo = $psi; [void]$p.Start()
  $script:proc = $p; Set-Busy $true; $timer.Start()
}
function Get-Diagnostico($txt, $code) {
  if ($code -eq 3) { return 'O Docker Desktop não está instalado. Clique em "Instalar Docker", reinicie o computador e volte a abrir este assistente.' }
  if ($code -eq 4) { return 'O Docker está instalado mas não está a correr. Abra o Docker Desktop, espere que fique "running" e clique em Instalar de novo.' }
  if ($txt -match 'port is already allocated|address already in use|bind: ') { return 'A porta escolhida já está a ser usada por outro programa. Mude a porta (ex.: 8080) e clique em Instalar de novo.' }
  if ($txt -match 'no space left|not enough space') { return 'O disco está cheio. Liberte espaço no disco C: e tente de novo.' }
  if ($txt -match 'EAI_AGAIN|ETIMEDOUT|ECONNRESET|TLS|i/o timeout|failed to fetch|toomanyrequests') { return 'Falhou a ligação à internet durante a instalação. Confirme a ligação e tente de novo.' }
  return 'A instalação falhou. Tire uma fotografia do ecrã (inclui o registo em baixo) e envie-a ao suporte.'
}

$timer.Add_Tick({
  foreach ($line in (Read-NewLines)) {
    $color = $null
    if ($line -match '\[X\]|rror|Falha') { $color = [System.Drawing.Color]::FromArgb(255, 140, 130) }
    elseif ($line -match '^\s*(INSTALACAO|A iniciar|A gerar|A aguardar)') { $color = [System.Drawing.Color]::FromArgb(120, 190, 255) }
    if ($line -match '^\s*Endereco:\s+(\S+)') { $script:res.url = $Matches[1] }
    if ($line -match 'Palavra-passe:\s+(\S+)') { $script:res.pass = $Matches[1] }
    if ($line -match 'ID da instalacao:\s+([0-9a-fA-F]{8,})') { $script:res.iid = $Matches[1] }
    Log $line $color
  }
  if ($script:proc -and $script:proc.HasExited) {
    $timer.Stop(); foreach ($l2 in (Read-NewLines)) { Log $l2 $null }
    $code = $script:proc.ExitCode; $script:proc = $null; Set-Busy $false; Refresh-Status
    if ($code -eq 0) {
      if ($script:mode -eq 'instalar') {
        $tUrl.Text = $script:res.url; $tIid.Text = $script:res.iid
        $tPass.Text = $(if ($script:res.pass) { $script:res.pass } else { '(a definida na primeira instalação)' })
        $pnl.Visible = $true; $btnAbrir.Enabled = $true
        $lblEstado.ForeColor = $cGreen; $lblEstado.Text = 'Instalação concluída. Envie o ID da instalação ao fornecedor para receber a licença.'
        [System.Windows.Forms.MessageBox]::Show("Instalação concluída.`n`nGuarde a palavra-passe e envie o ID da instalação ao fornecedor.", 'Inverno ERP', 'OK', 'Information') | Out-Null
      } else { $lblEstado.ForeColor = $cGreen; $lblEstado.Text = 'Feito.' }
    } else {
      $full = ''; try { $full = [System.IO.File]::ReadAllText($logFile) } catch {}
      $msg = Get-Diagnostico $full $code
      $lblEstado.ForeColor = $cRed; $lblEstado.Text = 'Falhou. Veja a mensagem.'
      Log ''; Log ('DIAGNÓSTICO: ' + $msg) ([System.Drawing.Color]::FromArgb(255, 200, 100))
      [System.Windows.Forms.MessageBox]::Show($msg, 'Inverno ERP - Problema', 'OK', 'Warning') | Out-Null
    }
  }
})

$btnInstalar.Add_Click({
  $porta = 0
  if (-not [int]::TryParse($tbPorta.Text.Trim(), [ref]$porta) -or $porta -lt 1 -or $porta -gt 65535) {
    [System.Windows.Forms.MessageBox]::Show('Indique uma porta válida (1 a 65535). Normalmente 80.', 'Inverno ERP', 'OK', 'Warning') | Out-Null; return
  }
  $log.Clear(); $script:res = @{ url = ''; pass = ''; iid = '' }; $pnl.Visible = $false
  $lblEstado.ForeColor = [System.Drawing.Color]::FromArgb(60, 70, 85); $lblEstado.Text = 'A instalar... na primeira vez pode demorar vários minutos. Não feche a janela.'
  Start-Cmd "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -Silencioso -Porta $porta" 'instalar'
})
$btnDocker.Add_Click({
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    $r = [System.Windows.Forms.MessageBox]::Show("Vai ser instalado o Docker Desktop (cerca de 600 MB, precisa de internet).`nNo fim terá de reiniciar o computador.`n`nContinuar?", 'Inverno ERP', 'YesNo', 'Question')
    if ($r -eq 'Yes') { Start-Process 'winget' -ArgumentList 'install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements' -Wait; [System.Windows.Forms.MessageBox]::Show('Se a instalação terminou, reinicie o computador, abra o Docker Desktop e depois este assistente.', 'Inverno ERP', 'OK', 'Information') | Out-Null; Refresh-Status }
  } else { Start-Process 'https://www.docker.com/products/docker-desktop'; [System.Windows.Forms.MessageBox]::Show('Instale o Docker Desktop a partir da página que abriu, reinicie o computador e volte a abrir este assistente.', 'Inverno ERP', 'OK', 'Information') | Out-Null }
})
$btnAbrir.Add_Click({ Start-Process (Get-Url) })
$btnIniciar.Add_Click({ $lblEstado.Text = 'A iniciar o sistema...'; Start-Cmd "docker compose -f docker-compose.prod.yml --env-file .env up -d --no-build" 'iniciar' })
$btnParar.Add_Click({ $lblEstado.Text = 'A parar o sistema...'; Start-Cmd "docker compose -f docker-compose.prod.yml --env-file .env stop" 'parar' })

$f.Add_FormClosing({ param($s, $e)
  if ($script:proc -and -not $script:proc.HasExited) {
    $r = [System.Windows.Forms.MessageBox]::Show('A instalação está a decorrer. Sair agora pode deixá-la incompleta. Sair mesmo assim?', 'Inverno ERP', 'YesNo', 'Warning')
    if ($r -ne 'Yes') { $e.Cancel = $true }
  }
})
$f.Add_Shown({ Refresh-Status })
[void]$f.ShowDialog()
