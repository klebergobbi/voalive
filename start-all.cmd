@echo off
echo ========================================
echo  VoaLive - Inicialização Completa
echo ========================================
echo.

REM Verificar se Docker está rodando
docker ps >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker Desktop não está rodando!
    echo.
    echo Por favor:
    echo 1. Inicie o Docker Desktop
    echo 2. Aguarde até estar totalmente inicializado
    echo 3. Execute este script novamente
    echo.
    pause
    exit /b 1
)

echo [1/4] Docker Desktop detectado ✓
echo.

echo [2/4] Iniciando PostgreSQL e Redis...
docker-compose up -d postgres redis
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro ao iniciar containers!
    pause
    exit /b 1
)

echo Aguardando containers iniciarem...
timeout /t 15 /nobreak >nul
echo PostgreSQL e Redis iniciados ✓
echo.

echo [3/4] Iniciando API Backend...
start "VoaLive API" cmd /k "cd apps\api && npm run dev"
timeout /t 5 /nobreak >nul
echo API iniciada ✓
echo.

echo [4/4] Iniciando Web Frontend...
start "VoaLive Web" cmd /k "cd apps\web && npm run dev"
timeout /t 3 /nobreak >nul
echo Web iniciado ✓
echo.

echo ========================================
echo  ✅ TUDO PRONTO!
echo ========================================
echo.
echo 📦 Containers:
echo    - PostgreSQL: localhost:5432
echo    - Redis: localhost:6379
echo.
echo 🚀 Serviços:
echo    - API: http://localhost:4000
echo    - Web: http://localhost:3011
echo.
echo 🔑 Próximos passos:
echo.
echo 1. Criar usuário admin:
echo    node create-admin.js --api
echo.
echo 2. Acessar:
echo    http://localhost:3011/login
echo.
echo ========================================
echo.
echo Pressione qualquer tecla para sair...
pause >nul
