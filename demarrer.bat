@echo off
title One Mission - serveur de developpement
cd /d "%~dp0"

echo ============================================
echo   One Mission - demarrage du site + API
echo   Site  : http://localhost:5173
echo   API   : http://localhost:4000
echo   Laisse cette fenetre OUVERTE pendant
echo   que tu utilises le site.
echo ============================================
echo.

npm run dev

echo.
echo Le serveur s'est arrete. Lis le message ci-dessus pour la raison.
pause
