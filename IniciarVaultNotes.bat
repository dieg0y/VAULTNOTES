@echo off
setlocal EnableExtensions
title VAULTNOTES - Iniciando

REM =====================================================================
REM  VAULTNOTES - INICIADOR AUTOMATICO 100% (WINDOWS) - PORTABLE/USB
REM =====================================================================
REM
REM  >>> ARCHIVO PARTE DEL REPOSITORIO - NO BORRAR <<<
REM
REM  Doble clic y la app se abre sola, SIN pasos manuales:
REM    1. Puerto 3000    -> si VaultNotes ya corre, solo abre el navegador
REM    2. Bun            -> 1) el de esta carpeta (tools\bun) 2) el del
REM                         sistema 3) se instala EN ESTA CARPETA (1 vez)
REM    3. Dependencias   -> las instala sola - solo la primera vez
REM    4. Carpeta movida -> se detecta sola y se regenera la cache de
REM                         desarrollo (la produccion NO se toca)
REM    5. Produccion     -> si hay build arranca directo; si no, lo
REM                         CONSTRUYE (1 sola vez, ~1-3 min) y a partir
REM                         de ahi arranca en segundos para siempre
REM    6. Espera respuesta y abre tu navegador en localhost:3000
REM
REM  PORTABILIDAD TOTAL: puedes MOVER o COPIAR esta carpeta completa a
REM  donde quieras (otra unidad, otra letra de USB, renombrarla, otro PC).
REM  El arranque detecta el movimiento, limpia lo que haga falta y sigue.
REM  Para llevarla en una memoria USB: copia la carpeta COMPLETA (con
REM  node_modules) y ejecuta este archivo desde la USB.
REM
REM  Opcion de reparacion (desde cmd, dentro de la carpeta):
REM     IniciarVaultNotes.bat limpiar
REM  -> borra la cache de desarrollo y arranca de cero (fix de panics).
REM
REM  Como DETENER la app: cierra la ventana minimizada
REM  "VaultNotes (servidor) - NO CERRAR" de la barra de tareas.
REM  Si algo falla: la ventana del servidor NO se cierra sola - queda
REM  abierta mostrando el error exacto para poder leerlo.
REM =====================================================================

cd /d "%~dp0"
set "URL=http://localhost:3000"
set "MARKER=.vaultnotes-folder.txt"

REM --- 0) Modo "limpiar": borrar cache de desarrollo y partir de cero ----
if /i not "%~1"=="limpiar" goto no_clean
if exist ".next-dev" rd /s /q ".next-dev"
if exist "%MARKER%" del "%MARKER%" >nul 2>&1
echo Cache de desarrollo limpiada a peticion.
echo.
:no_clean

REM --- 1) Ya estaba corriendo? -> solo abrir el navegador ----------------
call :check_up
if %errorlevel%==0 (
    echo La app ya estaba corriendo. Abriendo el navegador...
    start "" "%URL%"
    timeout /t 2 /nobreak >nul
    exit /b 0
)
if %errorlevel%==2 goto port_busy

REM --- 2) Resolver Bun: 1) esta carpeta  2) sistema  3) instalar aqui -----
set "BUN="

if exist "tools\bun\bin\bun.exe" set "BUN=%~dp0tools\bun\bin\bun.exe"
if defined BUN goto bun_ok

where bun >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%I in ('where bun') do (
        set "BUN=%%I"
        goto bun_ok
    )
)
if exist "%USERPROFILE%\.bun\bin\bun.exe" set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
if defined BUN goto bun_ok

echo Bun no esta instalado. Instalandolo DENTRO de esta carpeta
echo ^(tools\bun^) - una sola vez: luego tu carpeta/USB lo lleva consigo
echo y ninguna maquina vuelve a descargarlo.
echo Puede tardar 1-2 minutos. No cierres esta ventana.
echo.
set "BUN_INSTALL=%~dp0tools\bun"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; irm bun.sh/install.ps1 | iex"
if exist "tools\bun\bin\bun.exe" set "BUN=%~dp0tools\bun\bin\bun.exe"
if defined BUN goto bun_ok
REM Ultima oportunidad: algunos instaladores lo dejan en el perfil igual.
if exist "%USERPROFILE%\.bun\bin\bun.exe" set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
if defined BUN goto bun_ok

echo.
echo [ERROR] No se pudo instalar Bun automaticamente.
echo Revisa tu conexion a internet, o instala Bun a mano desde:
echo https://bun.sh
echo y luego vuelve a hacer doble clic en este archivo.
pause
exit /b 1

:bun_ok
REM Que TODO proceso hijo (incluido el boton Pull de la app) encuentre bun.
for %%I in ("%BUN%") do set "BUN_DIR=%%~dpI"
set "PATH=%BUN_DIR%;%PATH%"

REM --- 3) Dependencias: solo si falta o quedo a medias --------------------
if exist "node_modules\next\package.json" goto have_deps
echo Instalando dependencias del proyecto. Solo la primera vez, ~1 minuto...
"%BUN%" install
if errorlevel 1 (
    echo [ERROR] Fallo bun install. Revisa tu conexion y vuelve a intentarlo.
    pause
    exit /b 1
)
:have_deps

REM --- 4) Carpeta movida / copiada / otra letra de unidad? ----------------
REM  La cache de desarrollo (Turbopack) guarda rutas absolutas: al mover
REM  la carpeta hay que regenerarla. El build de produccion (.next) es
REM  portable y NO se toca: el server standalone resuelve sus rutas
REM  relativo a si mismo y arranca desde cualquier ubicacion.
REM  (findstr /l /c: compara la ruta literalmente dentro del marker;
REM  el redirect VA PRIMERO para que una ruta terminada en digito no
REM  se interprete como "2>" - redireccion de stderr.)
set "MOVED=0"
if exist "%MARKER%" (
    findstr /i /l /c:"%CD%" "%MARKER%" >nul 2>&1
    if errorlevel 1 set "MOVED=1"
)
if "%MOVED%"=="0" goto move_ok
echo.
echo Carpeta movida o copiada detectada. Regenerando la cache de
echo desarrollo. Tu build de produccion, dependencias y DATOS no se tocan.
if exist ".next-dev" rd /s /q ".next-dev"
echo Listo.
:move_ok

REM --- 5) Arrancar: produccion si existe; si no, CONSTRUIRLA (1 vez) ------
if exist ".next\standalone\server.js" goto prod_start

echo.
echo Primera vez en esta carpeta: generando el build de produccion.
echo 1 sola vez (~1-3 min). Despues de hoy la app arranca en segundos
echo y NO necesita compilador de desarrollo ni Modo de desarrolladores.
echo.
echo Compilando...
"%BUN%" run build
if errorlevel 1 (
    echo.
    echo Turbopack no pudo compilar aqui - reintentando con webpack...
    "%BUN%" run build:webpack
    if errorlevel 1 goto build_failed
)
goto prod_start

:build_failed
echo.
echo [AVISO] El build de produccion fallo. Arrancando en modo DESARROLLO
echo (mas lento cada arranque). Mira el error en la ventana del servidor.
goto dev_start

:prod_start
echo.
echo Build de produccion encontrado. Arrancando...
set "PORT=3000"
set "NODE_ENV=production"
start "VaultNotes (servidor) - NO CERRAR" /min cmd /k ""%BUN%" .next\standalone\server.js"
goto wait_up

REM --- 5b) Modo desarrollo (solo si el build no fue posible) --------------
:dev_start
set "DEVMODE=0"
set "JUSTENABLED=0"
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /v AllowDevelopmentWithoutDevLicense 2>nul | findstr /i /c:"0x1" >nul
if not errorlevel 1 set "DEVMODE=1"
if "%DEVMODE%"=="1" goto dev_turbo

echo El compilador de desarrollo prefiere el Modo de desarrolladores de
echo Windows ^(1 sola vez, para crear symlinks^). Se abrira una ventana de
echo permiso: pulsa SI. Si lo rechazas o no tienes permisos de admin,
echo seguira igual con el compilador webpack - estable.
echo.
set "JUSTENABLED=1"
powershell -NoProfile -Command "try { Start-Process cmd -Verb RunAs -Wait -ArgumentList '/c reg add HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock /t REG_DWORD /f /v AllowDevelopmentWithoutDevLicense /d 1'; exit 0 } catch { exit 1 }"
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /v AllowDevelopmentWithoutDevLicense 2>nul | findstr /i /c:"0x1" >nul
if not errorlevel 1 set "DEVMODE=1"
if "%JUSTENABLED%"=="1" if exist ".next-dev" rd /s /q ".next-dev"

:dev_turbo
if "%DEVMODE%"=="1" (
    start "VaultNotes (servidor) - NO CERRAR" /min cmd /k ""%BUN%" run dev"
) else (
    echo.
    echo Usando compilador WEBPACK estable.
    start "VaultNotes (servidor) - NO CERRAR" /min cmd /k ""%BUN%" run dev --webpack"
)

:wait_up
REM --- 6) Esperar a que la app responda - hasta ~4 minutos ----------------
echo Esperando a que la app este lista...
set /a tries=0
:waitloop
set /a tries+=1
if %tries% gtr 80 goto timeout_err
timeout /t 3 /nobreak >nul
call :check_up
if %errorlevel%==1 goto waitloop
if %errorlevel%==2 goto port_busy

REM --- 7) Listo: registrar la ruta (deteccion de movimiento) + navegador --
REM  (redirect primero y ruta entrecomillada: seguro incluso si la carpeta
REM  termina en digito o contiene "&"; findstr compara por contenido)
>"%MARKER%" echo "%CD%"
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

:port_busy
echo.
echo [ERROR] El puerto 3000 esta ocupado por OTRA aplicacion
echo ^(responde, pero NO es VaultNotes^).
echo Cierra esa aplicacion -o reinicia el PC- y vuelve a ejecutar
echo este archivo.
pause
exit /b 1

:timeout_err
echo.
echo [ERROR] La app no respondio a tiempo.
echo Abre la ventana del servidor en la barra de tareas -icono VaultNotes-
echo y mira el error exacto: esa ventana no se cierra sola.
echo Si el error menciona Turbopack, prueba:
echo    IniciarVaultNotes.bat limpiar
pause
exit /b 1

REM --- Subrutina: 0 = VaultNotes arriba · 1 = sin respuesta · 2 = otra app
:check_up
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 3; if ($r.Content -match 'VaultNotes') { exit 0 } else { exit 2 } } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%
