# Setup AirLabs API Key
# Este script facilita a configuração da API key do AirLabs no projeto

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   ✈️ Setup AirLabs API Key - VoaLive/ReservaSegura" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo .env existe
$envFile = Join-Path $PSScriptRoot ".env"

if (-Not (Test-Path $envFile)) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "📋 Copiando .env.example para .env..." -ForegroundColor Yellow

    $envExample = Join-Path $PSScriptRoot ".env.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "✅ Arquivo .env criado!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro: .env.example não encontrado!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "   📚 Por que usar o AirLabs?" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "O AirLabs é a API PRIORITÁRIA do sistema porque oferece:" -ForegroundColor White
Write-Host "  📍 GPS em tempo real (lat, long, altitude, velocidade)" -ForegroundColor Green
Write-Host "  🚪 Portões e terminais atualizados" -ForegroundColor Green
Write-Host "  ✈️ Informações completas de aeronaves" -ForegroundColor Green
Write-Host "  ⏰ Horários reais e estimados precisos" -ForegroundColor Green
Write-Host "  🌍 Cobertura global de voos" -ForegroundColor Green
Write-Host "  🆓 Free tier: 100+ requests/dia GRÁTIS!" -ForegroundColor Green
Write-Host ""
Write-Host "Atualmente você está usando apenas Aviationstack (limitado)" -ForegroundColor Yellow
Write-Host ""

# Verificar se já existe uma key
$envContent = Get-Content $envFile -Raw
if ($envContent -match 'AIRLABS_API_KEY=([^\s]+)' -and $Matches[1] -ne '' -and $Matches[1] -ne 'your_airlabs_api_key_here') {
    Write-Host "✅ AirLabs API Key já configurada: $($Matches[1])" -ForegroundColor Green
    Write-Host ""
    $replace = Read-Host "Deseja substituir? (S/N)"
    if ($replace -ne 'S' -and $replace -ne 's') {
        Write-Host "✅ Mantendo configuração atual." -ForegroundColor Green
        exit 0
    }
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   🔑 Obter API Key do AirLabs (GRÁTIS)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siga os passos abaixo:" -ForegroundColor White
Write-Host ""
Write-Host "1. Abra o navegador em: https://airlabs.co/" -ForegroundColor Yellow
Write-Host "2. Clique em 'Get API Key' ou 'Sign Up'" -ForegroundColor Yellow
Write-Host "3. Crie sua conta gratuita" -ForegroundColor Yellow
Write-Host "4. Acesse o Dashboard e copie sua API Key" -ForegroundColor Yellow
Write-Host ""

# Perguntar se quer abrir o site
$openBrowser = Read-Host "Deseja abrir o site do AirLabs agora? (S/N)"
if ($openBrowser -eq 'S' -or $openBrowser -eq 's') {
    Start-Process "https://airlabs.co/"
    Write-Host "🌐 Navegador aberto!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Solicitar a API key
$apiKey = Read-Host "Cole sua API Key do AirLabs aqui"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "❌ API Key vazia. Abortando." -ForegroundColor Red
    exit 1
}

# Validar formato básico (geralmente são alfanuméricas)
if ($apiKey.Length -lt 10) {
    Write-Host "⚠️  Atenção: API Key parece muito curta. Tem certeza?" -ForegroundColor Yellow
    $confirm = Read-Host "Continuar mesmo assim? (S/N)"
    if ($confirm -ne 'S' -and $confirm -ne 's') {
        Write-Host "❌ Abortado." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "💾 Salvando no arquivo .env..." -ForegroundColor Yellow

# Atualizar o .env
if ($envContent -match 'AIRLABS_API_KEY=') {
    # Substituir linha existente
    $envContent = $envContent -replace 'AIRLABS_API_KEY=.*', "AIRLABS_API_KEY=$apiKey"
} else {
    # Adicionar nova linha
    $envContent += "`nAIRLABS_API_KEY=$apiKey`n"
}

Set-Content -Path $envFile -Value $envContent -NoNewline

Write-Host "✅ API Key salva com sucesso!" -ForegroundColor Green
Write-Host ""

# Testar a API key
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   🧪 Testando API Key..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    $testUrl = "https://airlabs.co/api/v9/flights?api_key=$apiKey&limit=1"
    $response = Invoke-RestMethod -Uri $testUrl -Method Get -TimeoutSec 10

    if ($response) {
        Write-Host "✅ API Key VÁLIDA e funcionando!" -ForegroundColor Green
        Write-Host "🎉 Configuração concluída com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  API respondeu mas sem dados. Verifique a key." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao testar API Key: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "⚠️  Verifique se a key está correta em: https://airlabs.co/dashboard" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   ✅ Próximos Passos" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Inicie a API:" -ForegroundColor Yellow
Write-Host "   cd apps\api" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "2. Inicie o Frontend:" -ForegroundColor Yellow
Write-Host "   cd apps\web" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. Acesse: http://localhost:3011/dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Clique em '✈️ Buscar Vôo'" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Digite um número de vôo (ex: LA3789, G31234)" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "   🚀 Agora você terá dados GPS em tempo real!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

# Perguntar se quer iniciar a API agora
$startApi = Read-Host "Deseja iniciar a API agora? (S/N)"
if ($startApi -eq 'S' -or $startApi -eq 's') {
    Write-Host ""
    Write-Host "🚀 Iniciando API..." -ForegroundColor Cyan
    Set-Location (Join-Path $PSScriptRoot "apps\api")
    npm run dev
}
