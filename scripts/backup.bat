@echo off
rem Copia de seguranca completa da base de dados do Inverno ERP (todas as empresas).
rem Uso:  scripts\backup.bat            (usa os valores abaixo)
rem Agendar todos os dias as 22:00:
rem   schtasks /create /tn "Inverno Backup" /tr "\"%~f0\"" /sc daily /st 22:00
setlocal
set CONTAINER=backend-db-1
set DBUSER=postgres
set DEST=%USERPROFILE%\Documents\InvernoBackups
set KEEP=14

if not exist "%DEST%" mkdir "%DEST%"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set STAMP=%%i
set FILE=%DEST%\inverno_%STAMP%.sql

docker exec -t %CONTAINER% pg_dumpall -U %DBUSER% > "%FILE%"
if errorlevel 1 (
  echo ERRO: nao foi possivel gerar a copia. Verifique se o Docker esta activo e o nome do contentor.
  del "%FILE%" 2>nul
  exit /b 1
)
for %%A in ("%FILE%") do if %%~zA LSS 1000 (
  echo ERRO: copia vazia ou incompleta.
  exit /b 1
)
echo Copia criada: %FILE%

rem Mantem apenas as ultimas %KEEP% copias
powershell -NoProfile -Command "Get-ChildItem '%DEST%\inverno_*.sql' | Sort-Object LastWriteTime -Descending | Select-Object -Skip %KEEP% | Remove-Item -Force"
endlocal
