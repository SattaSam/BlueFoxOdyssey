@echo off
cd /d "%~dp0"
title BlueFox Odyssey - Serveur local

echo.
echo ==============================================
echo   BLUEFOX ODYSSEY - SERVEUR LOCAL
echo ==============================================
echo.
echo Le jeu va s'ouvrir dans Chrome ou le navigateur par defaut.
echo Ne fermez pas cette fenetre pendant le test.
echo.

start "" "http://localhost:8000/"
py -m http.server 8000

echo.
echo Le serveur s'est arrete.
pause
