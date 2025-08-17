# 🚨 Risoluzione Problemi Sincronizzazione Shopify

## 🎯 **Problema Identificato**

**Shopify non sincronizza e va in errore sia in locale che in produzione**

## 🔍 **Diagnosi Step-by-Step**

### **Passo 1: Verifica Configurazione**

1. **Vai su Impostazioni → Integrazioni**
2. **Usa il componente "Debug Shopify"**
3. **Esegui "Test Completo"**
4. **Analizza i risultati per identificare il punto di blocco**

### **Passo 2: Test Netlify Functions**

1. **Apri la console del browser (F12)**
2. **Copia e incolla il contenuto di `test-netlify-function.js`**
3. **Esegui il test automatico**
4. **Verifica se le funzioni rispondono**

## 🚨 **Problemi Comuni e Soluzioni**

### **1. Netlify Functions Non Funzionano**

#### **Sintomi:**
- Errore 404 su `/.netlify/functions/shopify-sync-orders`
- Errore "Function not found"
- Timeout delle richieste

#### **Soluzioni:**

**A. Verifica Deploy Netlify**
```bash
# Controlla se le funzioni sono deployate
netlify functions:list

# Se non ci sono funzioni, fai un nuovo deploy
netlify deploy --prod
```

**B. Verifica Configurazione netlify.toml**
```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/.netlify/functions/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

**C. Test Locale con netlify-cli**
```bash
# Installa netlify-cli
npm install -g netlify-cli

# Avvia in modalità sviluppo
netlify dev

# Testa la funzione su http://localhost:8888/.netlify/functions/shopify-sync-orders
```

### **2. Credenziali Shopify Non Valide**

#### **Sintomi:**
- Errore 401 "Unauthorized"
- Errore 403 "Forbidden"
- "Token di accesso non valido"

#### **Soluzioni:**

**A. Rigenera Access Token**
1. Vai su Shopify Admin → App
2. Trova la tua app privata
3. Clicca "Disinstalla app"
4. Ricrea l'app con nuovi permessi
5. Copia il nuovo access token

**B. Verifica Permessi App**
```
✅ read_orders (lettura ordini)
✅ read_products (lettura prodotti)  
✅ read_customers (lettura clienti)
✅ read_shop (lettura informazioni shop)
```

**C. Verifica Formato Credenziali**
- **Dominio**: `nome-shop.myshopify.com` (senza https://)
- **Token**: Deve iniziare con `shpat_`
- **API Version**: Usa `2024-01` (raccomandato)

### **3. Problemi di Rete/CORS**

#### **Sintomi:**
- Errore "Failed to fetch"
- Errore CORS
- Timeout delle richieste

#### **Soluzioni:**

**A. Verifica Connessione Internet**
```bash
# Testa connessione a Shopify
curl -I "https://api.shopify.com"

# Testa connessione a Netlify
curl -I "https://netlify.com"
```

**B. Verifica Firewall/Proxy**
- Controlla se il firewall blocca le richieste
- Verifica configurazioni proxy aziendali
- Testa da rete diversa (es. hotspot mobile)

**C. Test Diretto API Shopify**
```javascript
// Test diretto senza Netlify Functions
const testDirect = async () => {
  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken
    }
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Shop:', data.shop?.name);
};
```

### **4. Rate Limiting Shopify**

#### **Sintomi:**
- Errore 429 "Too Many Requests"
- Sincronizzazione si blocca a metà
- Errori intermittenti

#### **Soluzioni:**

**A. Implementa Retry Logic**
```javascript
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        console.log(`Rate limit, aspetto ${retryAfter} secondi...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

**B. Riduci Frequenza Richieste**
```javascript
// Aumenta pause tra richieste
const pauseTime = page === 1 ? 1000 : 2000; // 1-2 secondi
await new Promise(resolve => setTimeout(resolve, pauseTime));
```

**C. Sincronizzazione Incrementale**
```javascript
// Sincronizza solo ordini recenti
const daysBack = 7; // Solo ultimi 7 giorni
const apiUrl = `...&created_at_min=${getDateDaysAgo(daysBack)}`;
```

### **5. Problemi di Parsing Dati**

#### **Sintomi:**
- Errore "Cannot read property of undefined"
- Dati mancanti o corrotti
- Crash durante la sincronizzazione

#### **Soluzioni:**

**A. Validazione Dati**
```javascript
const validateOrder = (order) => {
  if (!order.id || !order.order_number) {
    console.warn('Ordine non valido:', order);
    return false;
  }
  return true;
};

const validOrders = shopifyOrders.filter(validateOrder);
```

**B. Gestione Errori Robusta**
```javascript
try {
  const data = await response.json();
  if (!data || !data.orders) {
    throw new Error('Risposta API non valida');
  }
  return data.orders;
} catch (error) {
  console.error('Errore parsing risposta:', error);
  return [];
}
```

## 🛠️ **Strumenti di Debug**

### **1. Componente Debug Shopify**
- **Posizione**: Impostazioni → Integrazioni → Debug Shopify
- **Funzionalità**: Test automatico di tutti i componenti
- **Risultati**: Report dettagliato con errori specifici

### **2. Test Console Browser**
```javascript
// Carica e esegui il test
// Copia il contenuto di test-netlify-function.js nella console
```

### **3. Log Netlify Functions**
```bash
# In produzione, controlla i log
netlify functions:logs

# In locale
netlify dev
# I log appaiono nel terminale
```

## 🔧 **Ripristino Rapido**

### **Se Nulla Funziona:**

1. **Ripristina Configurazione Base**
```javascript
// Rimuovi configurazione corrotta
localStorage.removeItem('shopify_config');

// Ricrea app privata Shopify
// Inserisci nuove credenziali
```

2. **Testa API Diretta**
```javascript
// Test diretto senza intermediari
const testDirect = async (shopDomain, accessToken) => {
  const url = `https://${shopDomain}/admin/api/2024-01/orders.json?limit=1`;
  const response = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': accessToken }
  });
  return response.ok;
};
```

3. **Verifica Ambiente**
```bash
# Controlla versione Node.js
node --version

# Controlla dipendenze
npm list

# Reinstalla se necessario
rm -rf node_modules package-lock.json
npm install
```

## 📊 **Monitoraggio e Prevenzione**

### **1. Logging Avanzato**
```javascript
const logSyncProgress = (step, data) => {
  const log = {
    timestamp: new Date().toISOString(),
    step,
    data,
    environment: process.env.NODE_ENV
  };
  console.log('🔄 Sync Log:', log);
  // Salva in localStorage per debug
  localStorage.setItem('shopify_sync_log', JSON.stringify(log));
};
```

### **2. Metriche Performance**
```javascript
const measureSyncTime = async (syncFunction) => {
  const start = Date.now();
  try {
    const result = await syncFunction();
    const duration = Date.now() - start;
    console.log(`✅ Sincronizzazione completata in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Sincronizzazione fallita dopo ${duration}ms:`, error);
    throw error;
  }
};
```

### **3. Health Check Automatico**
```javascript
const healthCheck = async () => {
  try {
    const response = await fetch('/.netlify/functions/shopify-sync-orders', {
      method: 'POST',
      body: JSON.stringify({ test: true })
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Esegui ogni 5 minuti
setInterval(healthCheck, 5 * 60 * 1000);
```

## 🎯 **Riepilogo Azioni**

1. ✅ **Usa il componente Debug Shopify**
2. ✅ **Testa Netlify Functions**
3. ✅ **Verifica credenziali Shopify**
4. ✅ **Testa API diretta**
5. ✅ **Controlla log e errori**
6. ✅ **Implementa retry e validazione**
7. ✅ **Monitora performance**

---

## 🚀 **Prossimi Passi**

Dopo aver identificato il problema specifico:

1. **Applica la soluzione appropriata**
2. **Testa la sincronizzazione**
3. **Verifica che funzioni in produzione**
4. **Implementa monitoraggio preventivo**

Se il problema persiste, fornisci:
- **Risultati del debug**
- **Log degli errori**
- **Configurazione ambiente**
- **Passi per riprodurre il problema** 