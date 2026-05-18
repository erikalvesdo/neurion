@echo off
chcp 65001 > nul
echo.
echo ====================================
echo  NEURION OS v26 - Gerar instalador
echo ====================================
echo.

set CSC_IDENTITY_AUTO_DISCOVERY=false
set WINCOSIGN_DIR=%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0

if not exist "%WINCOSIGN_DIR%" (
    echo  [..] Preparando cache...
    mkdir "%WINCOSIGN_DIR%\darwin\10.12\lib" 2>nul
    mkdir "%WINCOSIGN_DIR%\win" 2>nul
    echo. > "%WINCOSIGN_DIR%\darwin\10.12\lib\libcrypto.dylib"
    echo. > "%WINCOSIGN_DIR%\darwin\10.12\lib\libssl.dylib"
    echo  [OK] Cache preparado!
)

if not exist "%WINCOSIGN_DIR%\rcedit-x64.exe" (
    echo  [..] Baixando rcedit...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe' -OutFile '%WINCOSIGN_DIR%\rcedit-x64.exe'"
    echo  [OK] rcedit pronto!
)

echo  [..] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo  [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo  [OK] Instalado!

echo  [..] Compilando...
call npm run build
if %errorlevel% neq 0 (
    echo  [ERRO] Build falhou!
    pause
    exit /b 1
)
echo  [OK] Compilado!

echo  [..] Gerando instalador (.exe)...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo  [ERRO] Falha ao gerar instalador!
    pause
    exit /b 1
)
echo.
echo  ====================================
echo  [OK] Instalador gerado com sucesso!
echo  Arquivo: release\NEURION OS Setup.exe
echo  ====================================
echo.
pause
