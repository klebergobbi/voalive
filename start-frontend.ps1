# Script robusto para iniciar o frontend ReservaSegura no PowerShell
# Compativel com Windows
param(
    [switch]$Force
)

Write-Host "Iniciando ReservaSegura Frontend na porta 3007..." -ForegroundColor Green

# Definir diretorio do projeto
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebAppPath = Join-Path $ProjectRoot "apps\web"

# Verificar se estamos no diretorio correto
if (-not (Test-Path $WebAppPath)) {
    Write-Host "Diretorio apps\web nao encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de estar executando o script na raiz do projeto ReservaSegura" -ForegroundColor Yellow
    exit 1
}

Set-Location $WebAppPath

# Limpeza de cache
Write-Host "Limpando cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

# Verificar se a porta esta livre
Write-Host "Verificando porta 3007..." -ForegroundColor Cyan
$PortCheck = netstat -an | Select-String "3007"
if ($PortCheck) {
    Write-Host "Porta 3007 pode estar em uso." -ForegroundColor Yellow
    if ($Force) {
        Write-Host "Tentando encerrar processos na porta 3007..." -ForegroundColor Yellow
        taskkill /F /IM node.exe 2>$null
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Use o parametro -Force para encerrar processos automaticamente" -ForegroundColor Yellow
    }
}

# Configuracoes otimizadas para Windows
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:WATCHPACK_POLLING = "true"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:NODE_ENV = "development"

Write-Host "Configuracoes aplicadas:" -ForegroundColor Green
Write-Host "   - Telemetria desabilitada" -ForegroundColor Gray
Write-Host "   - Polling habilitado para compatibilidade" -ForegroundColor Gray
Write-Host "   - Memoria aumentada para 4GB" -ForegroundColor Gray
Write-Host "   - Ambiente de desenvolvimento configurado" -ForegroundColor Gray

# Verificar dependencias
if (-not (Test-Path "node_modules") -or -not (Test-Path "node_modules\.bin\next.cmd")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow

    # Limpeza completa antes de reinstalar
    if (Test-Path "node_modules") {
        Write-Host "Removendo node_modules antigo..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    }

    if (Test-Path "package-lock.json") {
        Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
    }

    # Instalar dependencias
    Write-Host "Limpando cache do npm..." -ForegroundColor Yellow
    npm cache clean --force

    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao instalar dependencias! Tentando com --legacy-peer-deps..." -ForegroundColor Yellow
        npm install --legacy-peer-deps

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Erro ao instalar dependencias!" -ForegroundColor Red
            exit 1
        }
    }

    # Verificar novamente se Next.js foi instalado
    if (-not (Test-Path "node_modules\.bin\next.cmd")) {
        Write-Host "Next.js ainda nao encontrado apos instalacao!" -ForegroundColor Red
        Write-Host "Tentando instalacao forcada do Next.js..." -ForegroundColor Yellow
        npm install next@14.1.3 --save-dev --force

        if (-not (Test-Path "node_modules\.bin\next.cmd")) {
            Write-Host "Falha critica: Next.js nao pode ser instalado!" -ForegroundColor Red
            Write-Host "Tentando usar npx como alternativa..." -ForegroundColor Yellow
        }
    }
}

Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Cyan
Write-Host "Frontend estara disponivel em: http://localhost:3007" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar o servidor usando caminho direto do Next.js
if (Test-Path "node_modules\.bin\next.cmd") {
    Write-Host "Usando Next.js direto do node_modules..." -ForegroundColor Green
    .\node_modules\.bin\next.cmd dev -p 3007
} else {
    Write-Host "Next.js nao encontrado no node_modules, usando npx..." -ForegroundColor Yellow
    # Tentar com npx primeiro
    $npxResult = npx next dev -p 3007 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro com npx, tentando npm run dev..." -ForegroundColor Yellow
        npm run dev
    } else {
        $npxResult
    }
}