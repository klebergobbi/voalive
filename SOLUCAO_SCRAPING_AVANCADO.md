# 🔧 Técnicas Avançadas de Evasão de WAF

## 1. Usar Residential Proxies (IPs Residenciais)

**Problema atual:** IPs de datacenter são facilmente detectados
**Solução:** Usar IPs de usuários reais

```typescript
// Exemplo com Bright Data
import playwright from 'playwright';

const browser = await playwright.chromium.launch({
  proxy: {
    server: 'http://brd.superproxy.io:22225',
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD'
  }
});
```

**Provedores:**
- Bright Data: https://brightdata.com/proxy-types/residential-proxies
- Smartproxy: https://smartproxy.com/
- IPRoyal: https://iproyal.com/

---

## 2. Stealth Mode (Playwright + puppeteer-extra-plugin-stealth)

**Problema:** Sites detectam Playwright/Puppeteer via browser fingerprinting
**Solução:** Mascarar sinais de automação

```typescript
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

// Adicionar plugin de stealth
chromium.use(stealth());

const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-site-isolation-trials'
  ]
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  permissions: ['geolocation'],
  geolocation: { longitude: -46.6333, latitude: -23.5505 }, // São Paulo
  extraHTTPHeaders: {
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Referer': 'https://www.google.com/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1'
  }
});

// Mascarar webdriver
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });
  
  // Adicionar plugins falsos
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
  });
  
  // Fingir WebGL
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Intel Inc.';
    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
    return getParameter.apply(this, [parameter]);
  };
});
```

**Instalar:**
```bash
npm install playwright-extra puppeteer-extra-plugin-stealth
```

---

## 3. Delays Humanos (Simular Comportamento Real)

```typescript
// Delays aleatórios entre ações
const randomDelay = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1) + min);

await page.goto(url);
await page.waitForTimeout(randomDelay(1000, 3000));

// Movimento natural do mouse
await page.mouse.move(
  randomDelay(0, 1920), 
  randomDelay(0, 1080),
  { steps: randomDelay(10, 30) }
);

await page.click('input[name="pnr"]');
await page.waitForTimeout(randomDelay(200, 800));

// Digitar como humano (com delays entre teclas)
for (const char of pnrCode) {
  await page.keyboard.type(char);
  await page.waitForTimeout(randomDelay(50, 200));
}
```

---

## 4. Resolver CAPTCHAs Automaticamente

**Opção A: 2Captcha** (Recomendado)
```typescript
import fetch from 'node-fetch';

async function solve2Captcha(siteKey: string, pageUrl: string): Promise<string> {
  const API_KEY = 'YOUR_2CAPTCHA_KEY';
  
  // 1. Enviar CAPTCHA para resolução
  const response = await fetch(`http://2captcha.com/in.php?key=${API_KEY}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${pageUrl}&json=1`);
  const data = await response.json();
  const captchaId = data.request;
  
  // 2. Aguardar resolução (15-30 segundos)
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // 3. Obter resposta
  const resultResponse = await fetch(`http://2captcha.com/res.php?key=${API_KEY}&action=get&id=${captchaId}&json=1`);
  const result = await resultResponse.json();
  
  return result.request; // Token do CAPTCHA resolvido
}

// Usar no Playwright
const captchaToken = await solve2Captcha('SITE_KEY', 'https://www.latam.com/...');
await page.evaluate((token) => {
  document.getElementById('g-recaptcha-response').innerHTML = token;
}, captchaToken);
```

**Custo:** $2.99 por 1.000 CAPTCHAs resolvidos

---

## 5. Rotação de User-Agents

```typescript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0'
];

const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
const context = await browser.newContext({ userAgent: randomUA });
```

---

## 6. Usar Browsers Reais (Undetected Chromedriver)

```bash
npm install undetected-chromedriver
```

```typescript
import { chromium } from 'undetected-chromedriver';

const browser = await chromium({
  headless: false, // Usar headed (mais difícil de detectar)
  args: ['--start-maximized']
});
```

---

## 7. Pool de Sessões (Session Management)

```typescript
class SessionPool {
  private sessions: Map<string, BrowserContext> = new Map();
  
  async getSession(userId: string): Promise<BrowserContext> {
    if (!this.sessions.has(userId)) {
      // Criar nova sessão com cookies persistentes
      const context = await browser.newContext({
        storageState: `./sessions/${userId}.json`
      });
      this.sessions.set(userId, context);
    }
    return this.sessions.get(userId)!;
  }
  
  async warmupSession(context: BrowserContext) {
    // "Aquecer" sessão navegando por páginas normais primeiro
    const page = await context.newPage();
    await page.goto('https://www.google.com');
    await page.waitForTimeout(2000);
    await page.goto('https://www.latam.com');
    await page.waitForTimeout(3000);
    // Agora usar a sessão "quente" para scraping
  }
}
```

