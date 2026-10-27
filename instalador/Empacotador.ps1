# Empacotador Inverno ERP (modo grafico) - USO EXCLUSIVO DO FABRICANTE.
# Gera o pacote de entrega (ZIP) sem precisar de comandos. Abrir com Empacotar-Inverno.bat.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$root      = Split-Path -Parent $PSScriptRoot
$script    = Join-Path $PSScriptRoot 'empacotar.ps1'
$configTs  = Join-Path $root 'frontend\app\shared\config.ts'
$entrega   = Join-Path $root 'entrega'
$settings  = Join-Path $env:APPDATA 'InvernoEmpacotador.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Load-Settings { try { if (Test-Path $settings) { return Get-Content $settings -Raw | ConvertFrom-Json } } catch {}; return $null }
function Save-Settings($o) { try { $o | ConvertTo-Json | Set-Content -Path $settings -Encoding UTF8 } catch {} }

# ---------- janela ----------
$f = New-Object System.Windows.Forms.Form
$f.Text = 'Inverno ERP - Gerar pacote de entrega'
$f.StartPosition = 'CenterScreen'
$f.ClientSize = New-Object System.Drawing.Size(760, 680)
$f.MinimumSize = New-Object System.Drawing.Size(760, 680)
$f.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$f.BackColor = [System.Drawing.Color]::FromArgb(243, 245, 248)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'Gerar pacote de entrega'
$title.Font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(20, 14); $title.AutoSize = $true
$f.Controls.Add($title)
$sub = New-Object System.Windows.Forms.Label
$sub.Text = 'Compila o programa e cria o ZIP que entrega ao cliente (sem código-fonte).'
$sub.ForeColor = [System.Drawing.Color]::FromArgb(91, 107, 125)
$sub.Location = New-Object System.Drawing.Point(22, 48); $sub.AutoSize = $true
$f.Controls.Add($sub)

function Add-Field($label, $y, $x, $w, $text) {
  $l = New-Object System.Windows.Forms.Label; $l.Text = $label; $l.AutoSize = $true
  $l.Location = New-Object System.Drawing.Point($x, $y); $f.Controls.Add($l)
  $t = New-Object System.Windows.Forms.TextBox; $t.Text = $text
  $t.Location = New-Object System.Drawing.Point($x, ($y + 22)); $t.Width = $w; $f.Controls.Add($t)
  return $t
}
$cfg = Load-Settings
$tbVersao = Add-Field 'Versão a gerar' 84 20 150 ($(if ($cfg.versao) { $cfg.versao } else { '1.0.0' }))
$tbTel    = Add-Field 'O seu telefone/WhatsApp (só números, ex.: 258841234567)' 84 200 300 ($(if ($cfg.telefone) { $cfg.telefone } else { '' }))
$tbMail   = Add-Field 'O seu email de suporte' 84 520 220 ($(if ($cfg.email) { $cfg.email } else { '' }))

# estado
$lblDocker = New-Object System.Windows.Forms.Label
$lblDocker.Location = New-Object System.Drawing.Point(20, 148); $lblDocker.AutoSize = $true
$f.Controls.Add($lblDocker)
$lblKey = New-Object System.Windows.Forms.Label
$lblKey.Location = New-Object System.Drawing.Point(20, 172); $lblKey.AutoSize = $true
$f.Controls.Add($lblKey)

$chkDesk = New-Object System.Windows.Forms.CheckBox
$chkDesk.Text = 'Incluir versão Desktop (aplicação de secretaria) — o cliente fica com versão web e desktop'
$chkDesk.Checked = $(if ($cfg -and $null -ne $cfg.desktop) { [bool]$cfg.desktop } else { $true })
$chkDesk.AutoSize = $true; $chkDesk.Location = New-Object System.Drawing.Point(20, 196)
$f.Controls.Add($chkDesk)
$lblDesk = New-Object System.Windows.Forms.Label
$lblDesk.Location = New-Object System.Drawing.Point(40, 216); $lblDesk.AutoSize = $true
$f.Controls.Add($lblDesk)

$btnGerar = New-Object System.Windows.Forms.Button
$btnGerar.Text = 'Gerar pacote'; $btnGerar.Size = New-Object System.Drawing.Size(170, 42)
$btnGerar.Location = New-Object System.Drawing.Point(20, 240)
$btnGerar.BackColor = [System.Drawing.Color]::FromArgb(29, 95, 209); $btnGerar.ForeColor = [System.Drawing.Color]::White
$btnGerar.FlatStyle = 'Flat'; $btnGerar.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$f.Controls.Add($btnGerar)
$btnPasta = New-Object System.Windows.Forms.Button
$btnPasta.Text = 'Abrir pasta de entrega'; $btnPasta.Size = New-Object System.Drawing.Size(180, 42)
$btnPasta.Location = New-Object System.Drawing.Point(200, 240); $btnPasta.Enabled = $false
$f.Controls.Add($btnPasta)
$btnCopiar = New-Object System.Windows.Forms.Button
$btnCopiar.Text = 'Copiar SHA256'; $btnCopiar.Size = New-Object System.Drawing.Size(130, 42)
$btnCopiar.Location = New-Object System.Drawing.Point(390, 240); $btnCopiar.Enabled = $false
$f.Controls.Add($btnCopiar)
$btnLimpa = New-Object System.Windows.Forms.Button
$btnLimpa.Text = 'Limpar cache Docker'; $btnLimpa.Size = New-Object System.Drawing.Size(150, 30)
$btnLimpa.Location = New-Object System.Drawing.Point(590, 14)
$f.Controls.Add($btnLimpa)
$btnVerif = New-Object System.Windows.Forms.Button
$btnVerif.Text = 'Verificar Docker'; $btnVerif.Size = New-Object System.Drawing.Size(120, 42)
$btnVerif.Location = New-Object System.Drawing.Point(530, 240)
$btnRegisto = New-Object System.Windows.Forms.Button
$btnRegisto.Text = 'Copiar registo'; $btnRegisto.Size = New-Object System.Drawing.Size(100, 42)
$btnRegisto.Location = New-Object System.Drawing.Point(660, 240)
$f.Controls.Add($btnRegisto)
$f.Controls.Add($btnVerif)

$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Location = New-Object System.Drawing.Point(20, 294); $bar.Size = New-Object System.Drawing.Size(720, 10)
$bar.Style = 'Continuous'; $f.Controls.Add($bar)
$lblEstado = New-Object System.Windows.Forms.Label
$lblEstado.Location = New-Object System.Drawing.Point(20, 310); $lblEstado.AutoSize = $true
$lblEstado.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$lblEstado.Text = 'Pronto.'
$f.Controls.Add($lblEstado)

$log = New-Object System.Windows.Forms.RichTextBox
$log.Location = New-Object System.Drawing.Point(20, 340); $log.Size = New-Object System.Drawing.Size(720, 320)
$log.Anchor = 'Top,Bottom,Left,Right'; $log.ReadOnly = $true
$log.BackColor = [System.Drawing.Color]::FromArgb(20, 32, 46); $log.ForeColor = [System.Drawing.Color]::FromArgb(220, 230, 240)
$log.Font = New-Object System.Drawing.Font('Consolas', 9)
$f.Controls.Add($log)

function Log($m, $color) {
  if (-not $color) { $color = [System.Drawing.Color]::FromArgb(220, 230, 240) }
  $log.SelectionStart = $log.TextLength; $log.SelectionColor = $color
  $log.AppendText($m + "`r`n"); $log.ScrollToCaret()
}

function Test-Docker {
  try { & docker info *> $null; return ($LASTEXITCODE -eq 0) } catch { return $false }
}
function Refresh-Desktop {
  $d1 = Join-Path $root 'desktop\Inverno-ERP-Desktop\Inverno ERP.exe'
  $d2 = Join-Path $root 'desktop\dist\win-unpacked\Inverno ERP.exe'
  $green = [System.Drawing.Color]::FromArgb(15, 122, 74); $amber = [System.Drawing.Color]::FromArgb(154, 91, 0); $red = [System.Drawing.Color]::FromArgb(179, 38, 30)
  if (-not $chkDesk.Checked) { $lblDesk.Text = 'Desktop: omitido (só versão web).'; $lblDesk.ForeColor = $amber }
  elseif ((Test-Path $d1) -or (Test-Path $d2)) { $lblDesk.Text = 'Desktop: pronto (pasta encontrada em desktop\).'; $lblDesk.ForeColor = $green }
  elseif (Get-Command npm -ErrorAction SilentlyContinue) { $lblDesk.Text = 'Desktop: será compilado automaticamente (Node.js encontrado). Demora alguns minutos.'; $lblDesk.ForeColor = $green }
  else { $lblDesk.Text = 'Desktop: em falta. Descomprima Inverno-ERP-Desktop-1.0.0-portatil.zip para dentro de desktop\ ou instale o Node.js (nodejs.org).'; $lblDesk.ForeColor = $red }
}
function Refresh-Status {
  Refresh-Desktop
  if (Test-Docker) { $lblDocker.Text = 'Docker: pronto'; $lblDocker.ForeColor = [System.Drawing.Color]::FromArgb(15, 122, 74) }
  else { $lblDocker.Text = 'Docker: não está a correr. Abra o Docker Desktop e espere que fique "running".'; $lblDocker.ForeColor = [System.Drawing.Color]::FromArgb(179, 38, 30) }
  $key = Join-Path $root 'tools\licenca\PRIVADA-NAO-PARTILHAR.pem'
  if (Test-Path $key) { $lblKey.Text = 'Aviso: a chave privada ainda está dentro da pasta do projeto. Guarde-a em 2 cópias fora do projeto. (Não vai para o pacote.)'; $lblKey.ForeColor = [System.Drawing.Color]::FromArgb(154, 91, 0) }
  else { $lblKey.Text = 'Chave privada: fora do projeto (recomendado).'; $lblKey.ForeColor = [System.Drawing.Color]::FromArgb(15, 122, 74) }
}

# ---------- contacto do fornecedor em config.ts ----------
function Apply-Contact($tel, $mail) {
  if (-not (Test-Path $configTs)) { throw "Não encontrei $configTs" }
  $c = [System.IO.File]::ReadAllText($configTs)
  if ($c -notmatch "phone:\s*'[^']*'" -or $c -notmatch "email:\s*'[^']*'") { throw 'VENDOR_CONTACT não encontrado em config.ts.' }
  $c = [regex]::Replace($c, "phone:\s*'[^']*'", "phone: '$tel'")
  $c = [regex]::Replace($c, "email:\s*'[^']*'", "email: '$mail'")
  [System.IO.File]::WriteAllText($configTs, $c, $utf8NoBom)
}

# ---------- execucao ----------
$script:proc = $null
$script:logFile = Join-Path $env:TEMP 'inverno-empacotador.log'
$script:logPos = 0
$script:partial = ''
$script:sha = ''
$script:zip = ''
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 200

function Read-NewLines {
  $out = @()
  try {
    $fs = [System.IO.File]::Open($script:logFile, 'Open', 'Read', 'ReadWrite')
    try {
      if ($fs.Length -gt $script:logPos) {
        [void]$fs.Seek($script:logPos, 'Begin')
        $buf = New-Object byte[] ($fs.Length - $script:logPos)
        $n = $fs.Read($buf, 0, $buf.Length); $script:logPos += $n
        $txt = $script:partial + [System.Text.Encoding]::UTF8.GetString($buf, 0, $n)
        $parts = $txt -split "`r?`n"
        $script:partial = $parts[-1]
        if ($parts.Count -gt 1) { $out = $parts[0..($parts.Count - 2)] }
      }
    } finally { $fs.Close() }
  } catch {}
  return $out
}

$script:tentativa = 1
$script:maxTentativas = 3
$script:ultimaVersao = ''
$script:desktopArg = ''

function Get-Diagnostico($txt) {
  if ($txt -match 'no space left|not enough space|disk full') {
    return @{ auto = $false; msg = "O disco (ou o espaço do Docker) está cheio.`n`nO que fazer: clique em 'Limpar cache Docker' (canto superior direito) e tente de novo. Se persistir, liberte espaço no disco C: ou aumente o limite em Docker Desktop > Settings > Resources." }
  }
  if ($txt -match 'EAI_AGAIN|ETIMEDOUT|ECONNRESET|ENOTFOUND|network|TLS|registry\.npmjs|npm ci|npm error|could not resolve|i/o timeout|failed to fetch|toomanyrequests|TLS handshake') {
    return @{ auto = $true; msg = "Falhou o descarregamento das dependências (internet instável ou Docker sem ligação).`n`nO que fazer: confirme que o computador tem internet, reinicie o Docker Desktop e tente de novo. Este programa já tenta automaticamente até 3 vezes." }
  }
  if ($txt -match 'versao Desktop nao esta pronta|Falha ao compilar a aplicacao Desktop|nao produziu Inverno ERP') {
    return @{ auto = $false; msg = "A versão Desktop não está disponível.`n`nO que fazer: descomprima Inverno-ERP-Desktop-1.0.0-portatil.zip para dentro da pasta 'desktop' do projeto (fica desktop\Inverno-ERP-Desktop\Inverno ERP.exe), ou instale o Node.js. Também pode desmarcar 'Incluir versão Desktop' para gerar só a versão web." }
  }
  if ($txt -match 'pipe/docker|Cannot connect to the Docker daemon|docker daemon|dockerDesktopLinuxEngine') {
    return @{ auto = $false; msg = "O Docker deixou de responder.`n`nO que fazer: abra o Docker Desktop, espere que fique 'running' e tente de novo." }
  }
  if ($txt -match 'error TS\d+|Found \d+ error|Cannot find module|npm run build') {
    return @{ auto = $false; msg = "O código do programa tem um erro de compilação (veja as linhas a vermelho no registo).`n`nO que fazer: use 'Copiar registo' e envie-o a quem mantém o código." }
  }
  return @{ auto = $false; msg = "A geração falhou por uma razão não reconhecida.`n`nO que fazer: clique em 'Copiar registo' e envie-o para análise. Pode também tentar 'Limpar cache Docker' e gerar de novo." }
}

function Start-Build {
  $v = $script:ultimaVersao
  $script:logPos = 0; $script:partial = ''
  try { if (Test-Path $script:logFile) { Remove-Item $script:logFile -Force } } catch {}
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'cmd.exe'
  $psi.Arguments = "/c chcp 65001 >nul & powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -Versao $v$($script:desktopArg) > `"$($script:logFile)`" 2>&1"
  $psi.WorkingDirectory = $root
  $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
  $p = New-Object System.Diagnostics.Process; $p.StartInfo = $psi
  [void]$p.Start()
  $script:proc = $p; $timer.Start()
}

function Set-Busy($busy) {
  $btnGerar.Enabled = -not $busy; $btnVerif.Enabled = -not $busy
  $tbVersao.Enabled = -not $busy; $chkDesk.Enabled = -not $busy; $tbTel.Enabled = -not $busy; $tbMail.Enabled = -not $busy
  if ($busy) { $bar.Style = 'Marquee'; $bar.MarqueeAnimationSpeed = 30 } else { $bar.Style = 'Continuous'; $bar.MarqueeAnimationSpeed = 0 }
}

$timer.Add_Tick({
  foreach ($line in (Read-NewLines)) {
    $color = $null
    if ($line -match '\[X\]|rror|ERROR|Falha') { $color = [System.Drawing.Color]::FromArgb(255, 140, 130) }
    elseif ($line -match '^(A compilar|A descarregar|A exportar|A criar|PACOTE)') { $color = [System.Drawing.Color]::FromArgb(120, 190, 255) }
    if ($line -match 'SHA256:\s*([0-9A-Fa-f]{64})') { $script:sha = $Matches[1] }
    if ($line -match '([A-Za-z]:\\[^\r\n]*\.zip)') { $script:zip = $Matches[1] }
    Log $line $color
  }
  if ($script:proc -and $script:proc.HasExited) {
    $timer.Stop()
    foreach ($l2 in (Read-NewLines)) { Log $l2 $null }
    $code = $script:proc.ExitCode; $script:proc = $null
    Set-Busy $false
    if ($code -eq 0) {
      $lblEstado.ForeColor = [System.Drawing.Color]::FromArgb(15, 122, 74)
      $lblEstado.Text = 'Pacote pronto. Entregue o ZIP ao cliente.'
      $btnPasta.Enabled = $true; $btnCopiar.Enabled = ($script:sha -ne '')
      $bar.Style = 'Continuous'; $bar.Value = 100
      [System.Windows.Forms.MessageBox]::Show("Pacote pronto.`n`n$($script:zip)", 'Inverno ERP', 'OK', 'Information') | Out-Null
    } else {
      $full = ''
      try { $full = [System.IO.File]::ReadAllText($script:logFile) } catch {}
      $d = Get-Diagnostico $full
      if ($d.auto -and $script:tentativa -lt $script:maxTentativas) {
        $script:tentativa++
        Log "" $null
        Log "[!] Falhou. A tentar de novo automaticamente (tentativa $($script:tentativa) de $($script:maxTentativas))..." ([System.Drawing.Color]::FromArgb(255, 200, 100))
        $lblEstado.Text = "A tentar de novo ($($script:tentativa)/$($script:maxTentativas))..."
        Set-Busy $true
        Start-Sleep -Seconds 5
        Start-Build
        return
      }
      $lblEstado.ForeColor = [System.Drawing.Color]::FromArgb(179, 38, 30)
      $lblEstado.Text = 'Falhou. Veja o diagnóstico.'
      $bar.Style = 'Continuous'; $bar.Value = 0
      Log "" $null
      Log "DIAGNÓSTICO: $($d.msg -replace "`n", ' ')" ([System.Drawing.Color]::FromArgb(255, 200, 100))
      [System.Windows.Forms.MessageBox]::Show($d.msg, 'Inverno ERP - A geração falhou', 'OK', 'Warning') | Out-Null
    }
  }
})

$btnVerif.Add_Click({ Refresh-Status })
$chkDesk.Add_CheckedChanged({ Refresh-Desktop })
$btnRegisto.Add_Click({ try { [System.Windows.Forms.Clipboard]::SetText($log.Text); $lblEstado.Text = 'Registo copiado.' } catch {} })
$btnLimpa.Add_Click({
  if (-not (Test-Docker)) { Refresh-Status; return }
  $r = [System.Windows.Forms.MessageBox]::Show("Isto apaga o cache de compilação do Docker (a próxima geração será mais lenta mas limpa).`n`nContinuar?", 'Inverno ERP', 'YesNo', 'Question')
  if ($r -ne 'Yes') { return }
  $lblEstado.Text = 'A limpar o cache do Docker...'; $f.Refresh()
  $o = (& docker builder prune -f 2>&1 | Out-String)
  Log $o $null; $lblEstado.Text = 'Cache limpo.'
})
$btnPasta.Add_Click({ if (Test-Path $entrega) { Start-Process explorer.exe $entrega } })
$btnCopiar.Add_Click({ if ($script:sha) { [System.Windows.Forms.Clipboard]::SetText($script:sha); $lblEstado.Text = 'Código SHA256 copiado.' } })

$btnGerar.Add_Click({
  $v = $tbVersao.Text.Trim(); $tel = ($tbTel.Text -replace '\D', ''); $mail = $tbMail.Text.Trim()
  if ($v -notmatch '^\d+\.\d+\.\d+$') { [System.Windows.Forms.MessageBox]::Show('A versão deve ter o formato 1.0.0', 'Inverno ERP') | Out-Null; return }
  if ($mail -and $mail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { [System.Windows.Forms.MessageBox]::Show('Email inválido.', 'Inverno ERP') | Out-Null; return }
  if (-not $tel -and -not $mail) {
    $r = [System.Windows.Forms.MessageBox]::Show("Não indicou telefone nem email. O cliente só poderá copiar o pedido de licença.`n`nContinuar mesmo assim?", 'Inverno ERP', 'YesNo', 'Question')
    if ($r -ne 'Yes') { return }
  }
  if (-not (Test-Docker)) { Refresh-Status; [System.Windows.Forms.MessageBox]::Show('O Docker não está a correr. Abra o Docker Desktop, espere que fique "running" e tente de novo.', 'Inverno ERP') | Out-Null; return }
  try { Apply-Contact $tel $mail } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Inverno ERP') | Out-Null; return }
  Save-Settings @{ versao = $v; telefone = $tel; email = $mail; desktop = $chkDesk.Checked }

  $log.Clear(); $script:sha = ''; $script:zip = ''
  $btnPasta.Enabled = $false; $btnCopiar.Enabled = $false
  $lblEstado.ForeColor = [System.Drawing.Color]::FromArgb(20, 32, 46); $lblEstado.Text = 'A gerar o pacote... (vários minutos; não feche esta janela)'
  Log "Versão $v - contacto: $tel $mail" ([System.Drawing.Color]::FromArgb(120, 190, 255))
  Set-Busy $true

  $script:ultimaVersao = $v; $script:tentativa = 1
  $script:desktopArg = $(if ($chkDesk.Checked) { '' } else { ' -SemDesktop' })
  Start-Build
})

$f.Add_FormClosing({
  param($s, $e)
  if ($script:proc -and -not $script:proc.HasExited) {
    $r = [System.Windows.Forms.MessageBox]::Show('A geração está a decorrer. Fechar interrompe-a. Fechar mesmo?', 'Inverno ERP', 'YesNo', 'Warning')
    if ($r -ne 'Yes') { $e.Cancel = $true } else { try { $script:proc.Kill() } catch {} }
  }
})

Refresh-Status
[void]$f.ShowDialog()
