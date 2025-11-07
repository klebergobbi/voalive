@echo off
echo ========================================
echo  VoaLive - Iniciando ambiente de DEV
echo ========================================
echo.

REM Verificar se estamos no diretório correto
if not exist "apps\api" (
    echo ERRO: Execute este script na raiz do projeto VoaLive!
    pause
    exit /b 1
)

echo [1/3] Iniciando API na porta 4000...
start "VoaLive API" cmd /k "cd apps\api && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo [2/3] Iniciando Web App na porta 3011...
start "VoaLive Web" cmd /k "cd apps\web && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Ambiente iniciado com sucesso!
echo.
echo ========================================
echo  Serviços rodando:
echo ========================================
echo  API:     http://localhost:4000
echo  Web:     http://localhost:3011
echo  Login:   http://localhost:3011/login
echo ========================================
echo.
echo Pressione qualquer tecla para sair...
pause >nul
