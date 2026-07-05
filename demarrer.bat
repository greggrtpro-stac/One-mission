@echo off
setlocal enabledelayedexpansion
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

rem --- Verification des ports avant de lancer quoi que ce soit --------------
rem Un ancien processus (fenetre fermee de travers, PC pas redemarre, etc.)
rem peut rester accroche au port. Dans ce cas Vite/l'API demarrent sur un
rem autre port ou refusent de demarrer, et le site parait "casse" ou blanc
rem sans qu'on comprenne pourquoi. On le detecte ici, tout de suite.
set "PORT_PROBLEM=0"

for %%P in (4000 5173) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
        echo [ATTENTION] Le port %%P est deja utilise par le processus PID %%A.
        echo             Cela peut venir d'un ancien lancement du site pas
        echo             completement ferme. Ferme-le avec :
        echo                 taskkill /PID %%A /F
        echo             puis relance ce script.
        echo.
        set "PORT_PROBLEM=1"
    )
)

if "!PORT_PROBLEM!"=="1" (
    echo Des ports sont deja occupes ^(voir ci-dessus^). Le site risque de ne
    echo pas demarrer correctement tant qu'ils ne sont pas liberes.
    echo.
    pause
)

rem --- Verification de la base de donnees (Docker) ---------------------------
docker info >nul 2>&1
if errorlevel 1 (
    echo [ATTENTION] Docker Desktop ne semble pas demarre.
    echo             La base de donnees ne pourra pas demarrer et l'API
    echo             plantera au lancement. Demarre Docker Desktop, attends
    echo             qu'il soit pret, puis relance ce script.
    echo.
    pause
    exit /b 1
)

echo Demarrage de la base de donnees...
call npm run db:up
echo.

rem --- Ouverture automatique du navigateur -----------------------------------
rem Le piege le plus courant : ouvrir client/index.html directement depuis
rem l'explorateur de fichiers (file://) au lieu du serveur. Ca ne fonctionne
rem JAMAIS (page blanche + erreurs CORS illisibles). On attend que le site
rem reponde puis on ouvre nous-memes la bonne adresse, pour ne jamais laisser
rem l'utilisateur chercher comment y acceder.
start "" powershell -NoProfile -WindowStyle Hidden -Command ^
    "for ($i=0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { Start-Process 'http://localhost:5173'; exit } } catch {}; Start-Sleep -Seconds 1 }"

npm run dev

echo.
echo ============================================
echo Le serveur s'est arrete.
echo Lis attentivement le message ci-dessus : c'est lui qui explique
echo pourquoi ^(port occupe, erreur de compilation, base de donnees
echo injoignable, etc.^).
echo ============================================
pause
