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
REM    3. Arranca servidor  -> produccion si hay build, si no desarrollo
REM    4. Espera respuesta  -> y abre tu navegador en localhost:3000
REM
REM  Nunca pide "volver a ejecutar este archivo": tras instalar Bun
REM  sigue sola usando la carpeta estandar %USERPROFILE%\.bun\bin
REM  agregada al PATH de esta misma sesion.
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

REM --- 1) Ya estaba corriendo? -> solo abrir el navegador --------------
call :check_up
if not errorlevel 1 (
    echo La app ya estaba corriendo. Abriendo el navegador...
    start "" "%URL%"
    timeout /t 2 /nobreak >nul
    exit /b 0
)

REM --- 2) Resolver Bun: PATH + carpeta estandar del instalador ---------
REM  La carpeta se agrega ANTES de buscar: cubre un Bun recien instalado
REM  cuyo PATH todavia no se refresco en nuevas ventanas de cmd.
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

REM --- 4) Arrancar servidor: ventana minimizada que NO se cierra sola --
REM  cmd /k en vez de /c: si el servidor falla, la ventana queda abierta
REM  mostrando el error exacto en vez de desaparecer sin rastro.
if not exist ".next\standalone\server.js" goto dev_start
echo Build de produccion encontrado. Arrancando en modo PRODUCCION...
start "VaultNotes (servidor) - NO CERRAR" /min cmd /k "set NODE_ENV=production&& bun run start"
goto wait_up

:dev_start
echo Arrancando en modo DESARROLLO - compila la primera pagina que abras...
start "VaultNotes (servidor) - NO CERRAR" /min cmd /k "bun run dev"

:wait_up
REM --- 5) Esperar a que la app responda - hasta ~4 minutos -------------
echo Esperando a que la app este lista...
set /a tries=0
:waitloop
set /a tries+=1
if %tries% gtr 80 goto timeout_err
timeout /t 3 /nobreak >nul
call :check_up
if errorlevel 1 goto waitloop

REM --- 6) Listo: abrir el navegador -------------------------------------
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
