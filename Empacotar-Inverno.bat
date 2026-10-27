@echo off
rem Abre o gerador grafico do pacote de entrega (uso exclusivo do fabricante).
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%~dp0instalador\Empacotador.ps1"
