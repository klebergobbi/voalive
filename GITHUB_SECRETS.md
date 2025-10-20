# GitHub Secrets - Configuração Necessária

Este documento lista todos os secrets que precisam ser configurados no GitHub para o CI/CD funcionar corretamente.

## 📋 Como Configurar

Acesse: `https://github.com/klebergobbi/voalive/settings/secrets/actions`

Ou via GitHub CLI:
```bash
gh secret set SECRET_NAME --body "secret_value"
```

---

## 🔑 Secrets Obrigatórios

### 1. SSH e Servidor Digital Ocean

```bash
# Chave SSH privada para acesso ao servidor
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa

# IP ou hostname do droplet
gh secret set SERVER_HOST --body "159.89.123.456"

# Usuário SSH (geralmente 'root')
gh secret set SERVER_USER --body "root"
```

### 2. Database (PostgreSQL)

```bash
# URL completa de conexão do PostgreSQL
gh secret set DATABASE_URL --body "postgresql://reservasegura_user:SENHA_FORTE_AQUI@postgres:5432/reservasegura"
```

**Formato da DATABASE_URL:**
```
postgresql://[usuario]:[senha]@[host]:[porta]/[database]
```

### 3. Firecrawl API

```bash
# API Key do Firecrawl para web scraping
gh secret set FIRECRAWL_API_KEY --body "fc-xxxxxxxxxxxxxxxxxxxxx"
```

**Como obter:**
1. Acesse https://firecrawl.dev
2. Crie uma conta
3. Acesse Dashboard → API Keys
4. Copie sua API key

### 4. JWT Authentication

```bash
# Secret para assinatura de tokens JWT (mínimo 32 caracteres)
gh secret set JWT_SECRET --body "$(openssl rand -base64 32)"
```

### 5. NextAuth.js

```bash
# Secret para NextAuth (mínimo 32 caracteres)
gh secret set NEXTAUTH_SECRET --body "$(openssl rand -base64 32)"

# URL pública da aplicação
gh secret set NEXTAUTH_URL --body "https://reservasegura.com"
```

### 6. API URL

```bash
# URL pública da API
gh secret set NEXT_PUBLIC_API_URL --body "https://api.reservasegura.com"
```

---

## 🔔 Secrets Opcionais

### Slack Notifications

```bash
# Webhook URL do Slack para notificações de deploy
gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
```

**Como obter:**
1. Acesse https://api.slack.com/apps
2. Crie um novo app ou selecione um existente
3. Ative "Incoming Webhooks"
4. Adicione um novo Webhook para o canal desejado
5. Copie a Webhook URL

---

## ✅ Verificar Secrets Configurados

```bash
# Listar todos os secrets (não mostra os valores)
gh secret list

# Verificar se um secret específico existe
gh secret list | grep JWT_SECRET
```

---

## 🔒 Boas Práticas de Segurança

1. **Nunca commite secrets no código**
   - Use sempre variáveis de ambiente
   - Adicione `.env` no `.gitignore`

2. **Use senhas fortes**
   - Mínimo 16 caracteres
   - Combine letras, números e símbolos
   - Use geradores de senha: `openssl rand -base64 32`

3. **Rotacione secrets regularmente**
   - Troque senhas a cada 90 dias
   - Atualize tokens de API periodicamente

4. **Limite o acesso**
   - Apenas repositórios necessários
   - Use secrets de ambiente quando possível
   - Configure branch protection rules

5. **Monitore o uso**
   - Revise logs de deploy
   - Ative alertas de segurança do GitHub
   - Use Dependabot para vulnerabilidades

---

## 🚨 Troubleshooting

### Secret não está sendo usado no workflow

Verifique se o secret está referenciado corretamente:
```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

### Deploy falha com "secret not found"

1. Confirme que o secret existe:
   ```bash
   gh secret list
   ```

2. Verifique se o nome está correto (case-sensitive)

3. Reexecute o workflow:
   ```bash
   gh run rerun WORKFLOW_ID
   ```

### Como remover um secret

```bash
gh secret remove SECRET_NAME
```

---

## 📝 Checklist de Configuração

Antes de fazer o primeiro deploy, confirme:

- [ ] SSH_PRIVATE_KEY configurado
- [ ] SERVER_HOST configurado
- [ ] SERVER_USER configurado
- [ ] DATABASE_URL configurado
- [ ] FIRECRAWL_API_KEY configurado
- [ ] JWT_SECRET gerado e configurado
- [ ] NEXTAUTH_SECRET gerado e configurado
- [ ] NEXTAUTH_URL configurado
- [ ] NEXT_PUBLIC_API_URL configurado
- [ ] SLACK_WEBHOOK configurado (opcional)
- [ ] Testou conexão SSH com o servidor
- [ ] Verificou que Docker está instalado no servidor
- [ ] Configurou DNS apontando para o servidor

---

## 🔗 Links Úteis

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub CLI Secrets Commands](https://cli.github.com/manual/gh_secret)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [Firecrawl Documentation](https://docs.firecrawl.dev)

---

**Última atualização:** 2025-10-20  
**Versão:** 1.0.0
