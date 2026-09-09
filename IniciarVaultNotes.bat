@echo off
setlocal EnableExtensions
title VAULTNOTES - Iniciando

REM =====================================================================
REM  VAULTNOTES - INICIADOR AUTOMATICO 100% (WINDOWS)
REM =====================================================================
REM
REM  >>> ARCHIVO PARTE DEL REPOSITORIO - NO BORRAR <<<
REM
REM  Doble clic y la app se abre sola, SIN pasos manuales ni re-ejecutar:
REM    1. Si falta Bun      -> lo instala sola con PowerShell - 1 sola vez
REM    2. Si faltan deps    -> las instala sola - solo la primera vez
REM    3. Modo desarrolladores de Windows -> lo activa sola con 1 clic
REM       de permiso - es lo que el compilador Turbopack necesita para
REM       crear symlinks en Windows; sin el falla con panics
REM       "Failed to write app endpoint" y "Failed to benchmark"
REM    4. Arranca servidor  -> produccion si hay build, si no desarrollo
REM    5. Espera respuesta  -> y abre tu navegador en localhost:3000
REM
REM  Nunca pide "volver a ejecutar este archivo". Si no activas el Modo
REM  de desarrolladores cuando lo pide, arranca igual con el compilador
REM  webpack - estable pero la 1a compilacion tarda mas.
REM
REM  Como DETENER la app: cierra la ventana minimizada
REM  "VaultNotes (servidor)" de la barra de tareas.
REM  Si algo falla: la ventana del servidor NO se cierra sola - queda
REM  abierta mostrando el error exacto para poder leerlo.
REM
REM  MANTENIMIENTO: intencionalmente simple y robusto. Solo actualizalo
REM  si cambia el puerto -3000- o la forma de arranque -bun-. No lo
REM  elimines: es el punto de entrada de un clic para Windows.
REM =====================================================================

cd /d "%~dp0"
set "URL=http://localhost:3000"
set "DEVMODE=0"
set "JUSTENABLED=0"

REM --- 1) Ya estaba corriendo? -> solo abrir el navegador --------------
call :check_up
if not errorlevel 1 (
    echo La app ya estaba corriendo. Abriendo el navegador...
    start "" "%URL%"
    timeout /t 2 /nobreak >nul
    exit /b 0
)

REM --- 2) Resolver Bun: PATH + carpeta estandar del instalador ---------
set "PATH=%PATH%;%USERPROFILE%\.bun\bin"
where bun >nul 2>&1
if not errorlevel 1 goto have_bun

echo Bun no esta instalado. Instalando automaticamente desde bun.sh...
echo Puede tardar 1-2 minutos. No cierres esta ventana.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; irm bun.sh/install.ps1 | iex"
echo.
where bun >nul 2>&1
if not errorlevel 1 goto have_bun

echo.
echo [ERROR] No se pudo instalar Bun automaticamente.
echo Revisa tu conexion a internet, o instala Bun a mano desde:
echo https://bun.sh
echo y luego vuelve a hacer doble clic en este archivo.
pause
exit /b 1

:have_bun
REM --- 3) Dependencias: solo si falta o quedo a medias ------------------
if exist "node_modules\next" goto have_deps
echo Instalando dependencias del proyecto. Solo la primera vez, ~1 minuto...
bun install
if errorlevel 1 (
    echo [ERROR] Fallo bun install. Revisa tu conexion y vuelve a intentarlo.
    pause
    exit /b 1
)
:have_deps

REM --- 4) Modo de desarrolladores de Windows ----------------------------
REM  Turbopack -el compilador de Next 16- crea symlinks dentro de .next;
REM  en Windows eso exige Modo de desarrolladores o permisos de admin.
REM  Sin el: "Failed to benchmark file I/O" + panics "Failed to write
REM  app endpoint /page" en cada peticion. Fix oficial documentado por
REM  Vercel: activar Developer Mode.
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /v AllowDevelopmentWithoutDevLicense 2>nul | findstr /i /c:"0x1" >nul
if not errorlevel 1 set "DEVMODE=1"
if "%DEVMODE%"=="1" goto dev_ok

echo El compilador necesita el Modo de desarrolladores de Windows
echo -1 sola vez, para poder crear symlinks-. Sin el, Next 16 falla con
echo panics de Turbopack en cada peticion.
echo.
echo Se abrira ahora una ventana de permiso de Windows: pulsa SI.
echo.
set "JUSTENABLED=1"
powershell -NoProfile -Command "try { Start-Process cmd -Verb RunAs -Wait -ArgumentList '/c reg add HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock /t REG_DWORD /f /v AllowDevelopmentWithoutDevLicense /d 1'; exit 0 } catch { exit 1 }"
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /v AllowDevelopmentWithoutDevLicense 2>nul | findstr /i /c:"0x1" >nul
if not errorlevel 1 set "DEVMODE=1"

:dev_ok
REM --- 5) Arrancar servidor: ventana minimizada que NO se cierra sola --
if exist ".next\standalone\server.js" goto prod_start
goto dev_start

:prod_start
echo Build de produccion encontrado. Arrancando en modo PRODUCCION...
start "VaultNotes (servidor) - NO CERRAR" /min cmd /k "set NODE_ENV=production&& bun run start"
goto wait_up

:dev_start
echo Arrancando en modo DESARROLLO...
REM Cache limpia solo si: recien activado el Modo desarrolladores o
REM caemos a webpack - el .next anterior puede tener symlinks rotos.
if "%DEVMODE%"=="1" if not "%JUSTENABLED%"=="1" goto dev_turbo
if exist ".next" rd /s /q ".next"
echo Cache del compilador limpiada para partir de cero.
if "%DEVMODE%"=="1" goto dev_turbo
echo.
echo Usando compilador WEBPACK estable: no activaste el Modo de
echo desarrolladores. La app funciona igual - solo la 1a compilacion
echo tarda un poco mas.
start "VaultNotes (servidor) - NO CERRAR" /min cmd /k "bun run dev --webpack"
goto wait_up

:dev_turbo
start "VaultNotes (servidor) - NO CERRAR" /min cmd /k "bun run dev"

:wait_up
REM --- 6) Esperar a que la app responda - hasta ~4 minutos -------------
echo Esperando a que la app este lista...
set /a tries=0
:waitloop
set /a tries+=1
if %tries% gtr 80 goto timeout_err
timeout /t 3 /nobreak >nul
call :check_up
if errorlevel 1 goto waitloop

REM --- 7) Listo: abrir el navegador -------------------------------------
start "" "%URL%"
echo.
echo  ===============================================
echo   VAULTNOTES LISTA. Se abrio tu navegador.
echo   URL:  %URL%
echo  ===============================================
echo  Para DETENER la app: cierra la ventana minimizada
echo  "VaultNotes (servidor) - NO CERRAR" de la barra de tareas.
echo.
timeout /t 5 /nobreak >nul
exit /b 0

:timeout_err
echo.
echo [ERROR] La app no respondio a tiempo.
echo Abre la ventana del servidor en la barra de tareas -icono VaultNotes-
echo y mira el error exacto: esa ventana no se cierra sola.
pause
exit /b 1

REM --- Subrutina: el puerto responde HTTP? ------------------------------
:check_up
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%
