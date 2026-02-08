# Script para reiniciar o servidor Angular com cache limpo

Write-Host "🔄 Parando processos Node existentes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*inverno-erp*" } | Stop-Process -Force

Write-Host "🧹 Limpando cache do Angular..." -ForegroundColor Yellow
Remove-Item -Path ".angular" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "🚀 Iniciando servidor de desenvolvimento..." -ForegroundColor Green
npm start
