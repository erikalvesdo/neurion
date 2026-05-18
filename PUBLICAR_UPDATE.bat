@echo off
chcp 65001 > nul
echo.
echo ====================================
echo  NEURION OS - Publicar Atualizacao
echo ====================================
echo.

:: Pega a versao do package.json
for /f "tokens=2 delims=:," %%a in ('findstr "version" package.json ^| findstr /v "devDep\|dep\|peer\|engine"') do (
    set VERSION=%%~a
    set VERSION=!VERSION: =!
    set VERSION=!VERSION:"=!
    goto :found
)
:found
setlocal enabledelayedexpansion
for /f "tokens=2 delims=:," %%a in ('findstr "  ..version" package.json') do (
    set RAW=%%~a
    set RAW=!RAW: =!
    set RAW=!RAW:"=!
    set VERSION=!RAW!
)

echo  Versao detectada: %VERSION%
echo.
echo  [..] Adicionando arquivos ao Git...
call git add .

echo  [..] Fazendo commit...
call git commit -m "update v%VERSION%"

echo  [..] Criando tag v%VERSION%...
call git tag v%VERSION%

echo  [..] Enviando para o GitHub...
call git push origin main
call git push origin v%VERSION%

echo.
echo  ====================================
echo  [OK] Codigo enviado ao GitHub!
echo  O GitHub vai compilar e publicar automaticamente.
echo  Acompanhe em: github.com/erikalvesdo/neurion-os/actions
echo  ====================================
echo.
pause
