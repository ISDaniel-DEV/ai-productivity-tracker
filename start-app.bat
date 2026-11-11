@echo off
setlocal
if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"
cd /d "%~dp0frontend"

where pnpm >nul 2>nul
if not errorlevel 1 goto use_pnpm

where corepack >nul 2>nul
if errorlevel 1 goto check_npm
goto use_corepack

:check_npm
where npm >nul 2>nul
if errorlevel 1 (
  echo No se encuentra Node.js con npm. Instala la version LTS desde https://nodejs.org/ y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
goto use_npx

:use_pnpm
if not exist "node_modules" (
  echo Instalando dependencias del frontend...
  call pnpm install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)
goto run_pnpm

:use_corepack
if not exist "node_modules" (
  echo Instalando dependencias del frontend con Corepack...
  call corepack pnpm install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)
call corepack pnpm dev -- --open
goto finish

:use_npx
if not exist "node_modules" (
  echo Instalando dependencias del frontend con pnpm via npx...
  call npx --yes pnpm install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)
echo Iniciando Cuaderno. Para detener el servidor, pulsa Ctrl+C.
call npx --yes pnpm dev -- --open
goto finish

:run_pnpm
echo Iniciando Cuaderno. Para detener el servidor, pulsa Ctrl+C.
call pnpm dev -- --open

:finish
if errorlevel 1 (
  echo El servidor termino con un error.
  pause
)
endlocal
