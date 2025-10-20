# ReservaSegura - Guia Rápido de Deploy

Este é um guia resumido para fazer o deploy rápido do ReservaSegura na Digital Ocean.

## 🚀 Deploy em 5 Passos

### 1️⃣ Criar Droplet na Digital Ocean

1. Acesse https://cloud.digitalocean.com
2. Clique em **"Create" > "Droplets"**
3. Configure:
   - **Imagem:** Ubuntu 22.04 LTS
   - **Plano:** Basic - 4GB RAM / 2 vCPUs ($24/mês)
   - **Região:** New York ou San Francisco
   - **Autenticação:** SSH Key (adicione sua chave pública)
   - **Nome:** reservasegura-prod
4. Clique em **"Create Droplet"**
5. **Anote o IP do servidor** (ex: 159.89.123.456)

### 2️⃣ Executar Script de Deploy

**No Windows (PowerShell):**
```powershell
cd C:\Projetos\ReservaSegura
.\deploy-digitalocean.ps1
```

**No Linux/Mac/WSL:**
```bash
cd /c/Projetos/ReservaSegura
chmod +x deploy-digitalocean.sh
./deploy-digitalocean.sh
```

### 3️⃣ Fornecer Informações

O script solicitará:
- IP do servidor (ex: 159.89.123.456)
- Usuário SSH (padrão: root)
- Domínio (ex: reservasegura.com)
- Email para SSL (ex: seu@email.com)

### 4️⃣ Aguardar Deploy

O script irá automaticamente:
- ✅ Instalar Docker e Docker Compose
- ✅ Configurar firewall
- ✅ Copiar arquivos
- ✅ Build das imagens
- ✅ Iniciar todos os serviços

**Tempo estimado: 10-15 minutos**

### 5️⃣ Configurar DNS

Configure os seguintes registros DNS no seu provedor de domínio:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | SEU_IP_DO_SERVIDOR |
| CNAME | www | reservasegura.com |
| A | api | SEU_IP_DO_SERVIDOR |
| A | monitor | SEU_IP_DO_SERVIDOR |
| A | traefik | SEU_IP_DO_SERVIDOR |
| A | metrics | SEU_IP_DO_SERVIDOR |
| A | status | SEU_IP_DO_SERVIDOR |

**Aguarde 30 minutos a 2 horas para propagação do DNS**

---

## 🎉 Pronto!

Após a propagação do DNS, acesse:

- **Frontend:** https://reservasegura.com
- **API:** https://api.reservasegura.com
- **Grafana:** https://monitor.reservasegura.com
  - Usuário: `admin`
  - Senha: `reservasegura_grafana_admin_2024`

---

## 📋 Checklist Pós-Deploy

- [ ] Frontend acessível via HTTPS
- [ ] API respondendo em https://api.reservasegura.com
- [ ] Certificado SSL válido (Let's Encrypt)
- [ ] Grafana acessível e funcionando
- [ ] Logs sem erros críticos
- [ ] Alterar senhas padrão do Grafana
- [ ] Configurar backup automático

---

## 🔧 Comandos Úteis

### Conectar ao Servidor
```bash
ssh root@SEU_IP
```

### Ver Logs
```bash
cd /opt/reservasegura
docker-compose -f docker-compose.prod.yml logs -f
```

### Ver Status
```bash
cd /opt/reservasegura
docker-compose -f docker-compose.prod.yml ps
```

### Reiniciar Aplicação
```bash
cd /opt/reservasegura
docker-compose -f docker-compose.prod.yml restart
```

### Parar Aplicação
```bash
cd /opt/reservasegura
docker-compose -f docker-compose.prod.yml down
```

### Iniciar Aplicação
```bash
cd /opt/reservasegura
docker-compose -f docker-compose.prod.yml up -d
```

---

## ❌ Troubleshooting

### Problema: Containers não iniciam
```bash
docker-compose -f docker-compose.prod.yml logs
docker-compose -f docker-compose.prod.yml restart
```

### Problema: DNS não propaga
```bash
# Verificar DNS
nslookup reservasegura.com
nslookup api.reservasegura.com

# Aguarde mais tempo ou verifique configuração DNS
```

### Problema: Certificado SSL não gerado
```bash
# Ver logs do Traefik
docker-compose -f docker-compose.prod.yml logs traefik

# Reiniciar Traefik
docker-compose -f docker-compose.prod.yml restart traefik
```

### Problema: Aplicação lenta
```bash
# Ver uso de recursos
docker stats

# Considere fazer upgrade do Droplet para 8GB RAM
```

---

## 📚 Documentação Completa

Para instruções detalhadas, consulte:
- **[DEPLOY.md](./DEPLOY.md)** - Guia completo de deploy
- **[PRODUCTION.md](./PRODUCTION.md)** - Documentação de produção
- **[setup.md](./setup.md)** - Setup de desenvolvimento

---

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Consulte o [DEPLOY.md](./DEPLOY.md) para troubleshooting detalhado
3. Verifique a documentação da Digital Ocean: https://docs.digitalocean.com

---

## 💰 Custos Estimados

| Serviço | Especificação | Custo Mensal |
|---------|---------------|--------------|
| **Droplet Básico** | 2 vCPUs, 4GB RAM | $24/mês |
| **Droplet Recomendado** | 4 vCPUs, 8GB RAM | $48/mês |
| **Backup** | Opcional | +20% |
| **Domínio** | .com | ~$12/ano |

**Total (básico):** ~$26/mês + domínio

---

**Boa sorte com seu deploy! 🚀**
