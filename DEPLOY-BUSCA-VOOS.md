# 🚀 Deploy - Busca Automática de Voos Reais

## ✅ O que foi implementado

Foi implementado o **preenchimento automático completo** ao buscar voos reais. Agora quando você:

1. Clica em **"Buscar Vôo"** no Dashboard
2. Digita o número do vôo (ex: LA3789, G31234, AD4567)
3. Sistema busca dados REAIS via APIs profissionais

**TODOS os campos são preenchidos automaticamente**:

- ✅ **Status do voo** (Programado, Em voo, Atrasado, Cancelado)
- ✅ **Horários reais** (Partida/Chegada real e estimada)
- ✅ **Portões e terminais** (Partida e Chegada)
- ✅ **Posição GPS** do avião em tempo real (Latitude, Longitude, Altitude, Velocidade, Direção)
- ✅ **Atrasos** em minutos
- ✅ **Informações da aeronave** (Modelo, Registro)

## 📋 Alterações Realizadas

### Arquivo Modificado:
- `apps/web/src/components/dashboard/auto-fill-flight-form.tsx`

### O que mudou:
1. **Detecção inteligente**: Sistema detecta automaticamente se os dados são de VOO REAL (APIs) ou RESERVA (localizador)
2. **Conversão de status**: Mapeamento inteligente de status em português e inglês
3. **Exibição visual**: Card com todas as informações em tempo real
4. **Status de check-in**: Determinação automática baseada no status do voo

## 🔄 Como fazer o Deploy na Digital Ocean

### Opção 1: Deploy Automático via SSH

Se você tem acesso SSH ao servidor:

```bash
# 1. Conectar ao servidor (substitua pelo IP correto)
ssh root@SEU_IP_AQUI

# 2. Ir para o diretório do projeto
cd /opt/voalive

# 3. Baixar as últimas alterações
git pull origin master

# 4. Reconstruir o container do frontend
docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-web

# 5. Reiniciar os serviços
docker-compose -f docker-compose.prod.yml up -d

# 6. Verificar logs
docker-compose -f docker-compose.prod.yml logs -f reservasegura-web
```

### Opção 2: Deploy Manual (Via Console Web)

Se você usa o Console Web da Digital Ocean:

1. **Acessar o Console**:
   - Vá para https://cloud.digitalocean.com/droplets
   - Clique no seu droplet
   - Clique em "Access" → "Launch Droplet Console"

2. **Executar os comandos**:
   ```bash
   # Login como root
   # Senha: verifique seu email da Digital Ocean

   # Navegar para o diretório
   cd /opt/voalive

   # Baixar alterações
   git pull origin master

   # Reconstruir e reiniciar
   docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-web
   docker-compose -f docker-compose.prod.yml up -d

   # Ver logs
   docker-compose -f docker-compose.prod.yml logs -f reservasegura-web
   ```

### Opção 3: Rebuild Completo (Se houver problemas)

```bash
# 1. Parar todos os containers
docker-compose -f docker-compose.prod.yml down

# 2. Limpar cache (opcional, se necessário)
docker system prune -a --volumes -f

# 3. Baixar alterações
git pull origin master

# 4. Rebuild completo
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# 6. Verificar status
docker-compose -f docker-compose.prod.yml ps

# 7. Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🧪 Como Testar

### 1. Acessar o Dashboard
```
https://www.reservasegura.pro
```
ou
```
https://SEU_DOMINIO
```

### 2. Fazer Login

### 3. Testar Busca de Voo

1. Clique em **"Buscar Vôo"** (botão verde no topo)
2. Digite um número de voo REAL que está operando hoje:
   - **GOL**: G31234, G31456
   - **LATAM**: LA3789, LA4567, JJ8011
   - **AZUL**: AD4567, AD2789

3. Clique em **"Buscar"**

4. **Resultado Esperado**:
   - Modal mostra voo encontrado com TODAS as informações
   - Modal fecha automaticamente após 1.5 segundos
   - Formulário abre com TODOS os campos preenchidos automaticamente
   - Card azul mostra informações em tempo real:
     - ⏰ Horários reais
     - 🚪 Portões
     - 🏢 Terminais
     - 📍 GPS (se voo em tempo real)
     - ⚠️ Atrasos (se houver)
     - ✈️ Aeronave

5. Revise os dados e clique em **"Cadastrar Voo"**

## ✅ Checklist Pós-Deploy

- [ ] Git pull realizado com sucesso
- [ ] Container do frontend reconstruído
- [ ] Serviços reiniciados sem erros
- [ ] Site acessível via HTTPS
- [ ] Login funcionando
- [ ] Botão "Buscar Vôo" visível
- [ ] Modal de busca abre corretamente
- [ ] Busca de voo retorna dados reais
- [ ] Formulário é preenchido automaticamente
- [ ] Todos os campos exibem informações corretas
- [ ] Card de informações em tempo real aparece
- [ ] Voo pode ser salvo no sistema

## 🔍 Troubleshooting

### Problema: "Vôo não encontrado"
**Causa**: Voo pode não estar operando hoje ou número incorreto
**Solução**: Tente outros números de voos que operam hoje

### Problema: Campos não preenchem automaticamente
**Causa**: Cache do navegador
**Solução**:
```bash
# Limpar cache do Docker
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-web
docker-compose -f docker-compose.prod.yml up -d

# No navegador: Ctrl+Shift+R (hard refresh)
```

### Problema: Erro 500 ao buscar voo
**Causa**: APIs não configuradas ou erro no backend
**Solução**:
```bash
# Verificar logs da API
docker-compose -f docker-compose.prod.yml logs -f reservasegura-api

# Verificar variáveis de ambiente
docker-compose -f docker-compose.prod.yml exec reservasegura-api env | grep API_KEY
```

### Problema: Site não carrega após deploy
**Causa**: Erro no build ou container não iniciou
**Solução**:
```bash
# Ver status dos containers
docker-compose -f docker-compose.prod.yml ps

# Ver logs completos
docker-compose -f docker-compose.prod.yml logs

# Reiniciar serviço específico
docker-compose -f docker-compose.prod.yml restart reservasegura-web
```

## 📊 Logs e Monitoramento

### Ver logs em tempo real:
```bash
# Frontend
docker-compose -f docker-compose.prod.yml logs -f reservasegura-web

# Backend
docker-compose -f docker-compose.prod.yml logs -f reservasegura-api

# Todos os serviços
docker-compose -f docker-compose.prod.yml logs -f
```

### Verificar status:
```bash
# Status dos containers
docker-compose -f docker-compose.prod.yml ps

# Uso de recursos
docker stats

# Espaço em disco
df -h
```

## 🎯 Próximos Passos (Opcional)

Para melhorar ainda mais o sistema:

1. **Configurar API Keys** (se ainda não configurado):
   ```bash
   # Editar .env no servidor
   nano /opt/voalive/.env

   # Adicionar:
   AIRLABS_API_KEY=sua_key_aqui
   AVIATIONSTACK_API_KEY=sua_key_aqui
   ```

2. **Habilitar HTTPS** (se ainda não configurado):
   ```bash
   # Instalar Certbot
   apt-get install certbot python3-certbot-nginx

   # Obter certificado
   certbot --nginx -d seu-dominio.com
   ```

3. **Configurar Backup Automático**:
   ```bash
   # Backup do banco de dados
   docker-compose -f docker-compose.prod.yml exec postgres \
     pg_dump -U reservasegura_user reservasegura > backup_$(date +%Y%m%d).sql
   ```

## 📝 Commit Realizado

```
commit cb90471

Implementar preenchimento automático completo para busca de voos reais

✨ Melhorias no AutoFillFlightForm:
- Detecta automaticamente se dados são de VOO REAL (APIs) ou RESERVA
- Preenche TODOS os campos automaticamente
- Conversão inteligente de status (PT/EN)
- Exibição de informações em tempo real (GPS, atrasos, portões)
```

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verifique o status: `docker-compose -f docker-compose.prod.yml ps`
3. Tente rebuild: `docker-compose -f docker-compose.prod.yml build --no-cache`
4. Reinicie: `docker-compose -f docker-compose.prod.yml restart`

---

**Data**: 2025-10-23
**Versão**: 1.0
**Commit**: cb90471
