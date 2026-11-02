@echo off
title SDR Training Lab - Servidor Local
echo ========================================================
echo         INICIANDO SDR TRAINING LAB
echo ========================================================
echo.
echo Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] No tienes Node.js instalado.
    echo Abriendo la version web directa en tu navegador...
    start SDR_Training_Lab.html
    pause
    exit /b
)

echo Node.js detectado!
echo Iniciando servidor en http://localhost:3000...
echo.
start http://localhost:3000
node server/standalone-server.mjs
pause
