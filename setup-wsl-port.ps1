# Script para configurar port forwarding do WSL2 para Windows
# Execute este script no PowerShell como Administrador

$wslIP = (wsl hostname -I).Trim()
$port = 3007

Write-Host "IP do WSL: $wslIP" -ForegroundColor Green
Write-Host "Porta: $port" -ForegroundColor Green

# Remove regras antigas se existirem
netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0

# Adiciona nova regra de port forwarding
netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIP

# Adiciona regra no firewall
New-NetFirewallRule -DisplayName "WSL ReservaSegura Port $port" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

Write-Host "`nPort forwarding configurado com sucesso!" -ForegroundColor Green
Write-Host "Acesse: http://localhost:$port" -ForegroundColor Cyan

# Mostra as regras ativas
Write-Host "`nRegras de port forwarding ativas:" -ForegroundColor Yellow
netsh interface portproxy show v4tov4
