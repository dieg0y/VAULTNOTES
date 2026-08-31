@echo off
REM =====================================================================
REM  VAULTNOTES - INICIADOR AUTOMATICO (WINDOWS)
REM =====================================================================
REM
REM  >>> ARCHIVO PARTE DEL REPOSITORIO - NO BORRAR <<<
REM  Doble clic y la app se abre sola: instala dependencias la primera
REM  vez, arranca el servidor (produccion si hay build, si no desarrollo)
REM  y abre tu navegador en http://localhost:3000 . No tienes que poner
REM  nada mas. Si la app ya estaba corriendo, solo abre el navegador.
REM
REM  MANTENIMIENTO: este archivo es intencionalmente simple y robusto.
REM  Solo actualizalo si cambia el puerto (3000) o la forma de arranque
REM  (bun). No lo elimines del repositorio: es el punto de entrada para
REM  Windows y quien lo borre rompe el arranque de un clic.
REM
REM  Como detener la app: cierra la ventana "VaultNotes (servidor)"
REM  que queda minimizada en la barra de tareas.
REM
REM  Requisito: Bun instalado (https://bun.sh) y navegador Chromium
REM  (Chrome/Edge recomendado para videos y backups).
REM =====================================================================

setlocal EnableExtensions
title VaultNotes - Iniciador

REM --- Trabajar siempre en la carpeta donde vive este .bat ---
cd /d "%~dp0"

set "PORT=3000"
set "URL=http://localhost:%PORT%"

REM --- 1) La app ya esta corriendo? -> solo abrir el navegador ---
call :check_up
if %errorlevel%==0 (
  echo La app ya estaba corriendo. Abriendo %URL% ...
  start "" "%URL%"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

REM --- 2) Bun instalado? ---
where bun >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Bun no esta instalado.
  echo Instalalo desde https://bun.sh  (PowerShell: irm bun.sh/install.ps1 ^| iex)
  echo y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

REM --- 3) Dependencias (solo la primera vez o tras un git pull con cambios) ---
if not exist "node_modules" (
  echo Primera ejecucion detectada: instalando dependencias ^(puede tardar un poco^)...
  bun install
  if errorlevel 1 (
    echo [ERROR] Fallo "bun install". Revisa tu conexion y vuelve a intentarlo.
    pause
    exit /b 1
  )
)

REM --- 4) Arrancar el servidor en una ventana minimizada ---
REM     Produccion si existe un build (mas rapido + PWA offline completa),
REM     desarrollo si no (se compila al vuelo la primera vez).
if exist ".next\standalone\server.js" (
  echo Build de produccion encontrado: arrancando servidor de PRODUCCION...
  start "VaultNotes (servidor) - NO CERRAR para detener la app" /min cmd /c "set NODE_ENV=production&& set PORT=%PORT%&& bun .next\standalone\server.js"
) else (
  echo Sin build de produccion: arrancando en modo DESARROLLO...
  start "VaultNotes (servidor) - NO CERRAR para detener la app" /min cmd /c "bun run dev"
)

REM --- 5) Esperar a que la app responda (hasta ~2 minutos) ---
echo Esperando a que la app este lista...
set /a tries=0
:waitloop
set /a tries+=1
if %tries% gtr 60 (
  echo [ERROR] La app no respondio a tiempo.
  echo Abre la ventana "VaultNotes ^(servidor^)" de la barra de tareas para ver el error.
  pause
  exit /b 1
)
timeout /t 2 /nobreak >nul
call :check_up
if errorlevel 1 goto waitloop

REM --- 6) Listo: abrir el navegador ---
start "" "%URL%"
echo.
echo  VAULTNOTES LISTA. Se abrio tu navegador en %URL%
echo  (Para detener la app: cierra la ventana "VaultNotes (servidor)" minimizada.)
echo.
timeout /t 4 /nobreak >nul
exit /b 0

REM --- Subrutina: comprueba si el puerto responde HTTP ---
:check_up
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%
