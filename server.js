const express = require('express');
const cors = require('cors');
const { URLSearchParams } = require('url');
const fs = require('fs');
const path = require('path');

// Importazione di node-fetch
const fetch = require('node-fetch');

const app = express();
const PORT = 3002;

// Funzioni per salvare e caricare le credenziali Shopify
const CREDENTIALS_FILE = path.join(__dirname, 'shopify_credentials.json');

const saveCredentials = (credentials) => {
  try {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
    console.log('Credenziali Shopify salvate');
  } catch (error) {
    console.error('Errore nel salvataggio credenziali:', error);
  }
};

const loadCredentials = () => {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      const credentials = JSON.parse(data);
      console.log('Credenziali Shopify caricate da file');
      return credentials;
    }
  } catch (error) {
    console.error('Errore nel caricamento credenziali:', error);
  }
  return null;
};

app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Expose-Headers', 'link');
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint per salvare le credenziali Shopify
app.post('/api/shopify/save-credentials', (req, res) => {
  try {
    const { shop, apiKey, apiPassword, apiVersion } = req.body;
    
    if (!shop || !apiKey || !apiPassword || !apiVersion) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }
    
    const credentials = { shop, apiKey, apiPassword, apiVersion };
    saveCredentials(credentials);
    
    res.json({ success: true, message: 'Credenziali salvate' });
  } catch (error) {
    console.error('Errore nel salvataggio credenziali:', error);
    res.status(500).json({ error: 'Errore nel salvataggio credenziali' });
  }
});

// Endpoint per caricare le credenziali Shopify
app.get('/api/shopify/load-credentials', (req, res) => {
  try {
    const credentials = loadCredentials();
    if (credentials) {
      res.json({ success: true, credentials });
    } else {
      res.json({ success: false, message: 'Nessuna credenziale salvata' });
    }
  } catch (error) {
    console.error('Errore nel caricamento credenziali:', error);
    res.status(500).json({ error: 'Errore nel caricamento credenziali' });
  }
});

// Endpoint per testare la connessione Shopify
app.post('/api/shopify/test', async (req, res) => {
  try {
    const { shopDomain, accessToken, apiVersion, testType } = req.body;
    
    if (!shopDomain || !accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dominio shop e access token sono richiesti' 
      });
    }

    // Validazione formato dominio
    const domainRegex = /^[a-zA-Z0-9-]+\.myshopify\.com$/;
    if (!domainRegex.test(shopDomain)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato dominio non valido. Deve essere: nome-shop.myshopify.com' 
      });
    }

    // Validazione formato access token
    if (!accessToken.startsWith('shpat_')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Access token non valido. Deve iniziare con "shpat_"' 
      });
    }

    let apiUrl;
    let responseData;

    switch (testType) {
      case 'shop':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/shop.json`;
        break;
      case 'products':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/products.json?limit=5`;
        break;
      case 'orders':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/orders.json?limit=5&status=any`;
        break;
      default:
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/shop.json`;
    }

    console.log(`🔄 Testando Shopify API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Access token non valido o scaduto');
      } else if (response.status === 404) {
        throw new Error('Dominio shop non trovato');
      } else {
        throw new Error(`Errore API Shopify: ${response.status} ${response.statusText}`);
      }
    }

    responseData = await response.json();
    console.log(`✅ Test Shopify riuscito per: ${testType}`);

    res.json({
      success: true,
      data: responseData,
      testType: testType
    });

  } catch (error) {
    console.error(`❌ Errore test Shopify:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint per sincronizzare prodotti da Shopify
app.post('/api/shopify/sync-products', async (req, res) => {
  try {
    const { shopDomain, accessToken, apiVersion } = req.body;
    
    if (!shopDomain || !accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Credenziali Shopify richieste' 
      });
    }

    const apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/products.json?limit=250`;
    
    console.log(`🔄 Sincronizzando prodotti da Shopify: ${shopDomain}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore API Shopify: ${response.status}`);
    }

    const data = await response.json();
    const products = data.products || [];
    
    console.log(`✅ Sincronizzati ${products.length} prodotti da Shopify`);

    res.json({
      success: true,
      products: products,
      count: products.length
    });

  } catch (error) {
    console.error(`❌ Errore sincronizzazione Shopify:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint per sincronizzare ordini da Shopify
app.post('/api/shopify/sync-orders', async (req, res) => {
  try {
    const { shopDomain, accessToken, apiVersion } = req.body;
    
    if (!shopDomain || !accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Credenziali Shopify richieste' 
      });
    }

    const apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/orders.json?limit=250&status=any`;
    
    console.log(`🔄 Sincronizzando ordini da Shopify: ${shopDomain}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore API Shopify: ${response.status}`);
    }

    const data = await response.json();
    const orders = data.orders || [];
    
    console.log(`✅ Sincronizzati ${orders.length} ordini da Shopify`);

    res.json({
      success: true,
      orders: orders,
      count: orders.length
    });

  } catch (error) {
    console.error(`❌ Errore sincronizzazione Shopify:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Proxy per le API Shopify
app.get('/api/shopify/orders', async (req, res) => {
  try {
    // Aspetta che fetch sia caricato
    if (!fetch) {
      try {
        const { default: fetchModule } = await import('node-fetch');
        fetch = fetchModule;
      } catch (error) {
        console.error('Errore nel caricamento di node-fetch:', error);
        return res.status(500).json({ error: 'Errore nel caricamento di node-fetch' });
      }
    }

    let { shop, apiKey, apiPassword, apiVersion, page_info } = req.query;
    
    // Se non ci sono parametri, prova a caricare le credenziali salvate
    if (!shop || !apiKey || !apiPassword || !apiVersion) {
      const savedCredentials = loadCredentials();
      if (savedCredentials) {
        shop = savedCredentials.shop;
        apiKey = savedCredentials.apiKey;
        apiPassword = savedCredentials.apiPassword;
        apiVersion = savedCredentials.apiVersion;
        console.log('=== DEBUG SHOPIFY API (credenziali salvate) ===');
      } else {
        console.log('=== DEBUG SHOPIFY API ===');
        console.log('Shop:', shop);
        console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
        console.log('API Password:', apiPassword ? `${apiPassword.substring(0, 10)}...` : 'MISSING');
        console.log('API Version:', apiVersion);
        if (page_info) console.log('Page Info:', page_info);
        return res.status(400).json({ error: 'Parametri mancanti' });
      }
    } else {
      console.log('=== DEBUG SHOPIFY API ===');
    }
    
    console.log('Shop:', shop);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('API Password:', apiPassword ? `${apiPassword.substring(0, 10)}...` : 'MISSING');
    console.log('API Version:', apiVersion);
    if (page_info) console.log('Page Info:', page_info);

    // Validazione formato shop
    if (!shop.includes('.myshopify.com')) {
      return res.status(400).json({ error: 'Formato dominio non valido. Deve essere: nome-negozio.myshopify.com' });
    }

    const baseURL = `https://${shop}/admin/api/${apiVersion}`;
    const credentials = Buffer.from(`${apiKey}:${apiPassword}`).toString('base64');
    
    // Definiamo sempre i campi necessari con tutti i dettagli dell'indirizzo
    const requiredFields = 'id,order_number,name,created_at,financial_status,fulfillment_status,total_price,currency,line_items,shipping_address,billing_address,shipping_lines,total_shipping_price_set,total_tax_set,customer,note,shipping_address.name,shipping_address.email,shipping_address.phone,shipping_address.address1,shipping_address.address2,shipping_address.city,shipping_address.province,shipping_address.zip,shipping_address.country,billing_address.name,billing_address.email,billing_address.phone,billing_address.address1,billing_address.address2,billing_address.city,billing_address.province,billing_address.zip,billing_address.country,customer.email,customer.first_name,customer.last_name,customer.phone';
    
    let params;
    if (page_info) {
      // Per le pagine successive, dobbiamo includere i campi nel page_info
      // Shopify ignora altri parametri quando si usa page_info, quindi dobbiamo
      // modificare l'URL per includere i campi necessari
      const baseParams = new URLSearchParams({
        page_info: page_info,
        fields: requiredFields
      });
      params = baseParams;
    } else {
      params = new URLSearchParams({
        limit: req.query.limit || '50',
        status: req.query.status || 'any',
        fields: requiredFields
      });
      
      // Aggiungi filtro per data se specificato
      if (req.query.created_at_min) {
        params.append('created_at_min', req.query.created_at_min);
        console.log('Aggiunto filtro data:', req.query.created_at_min);
      }
    }

    const fullURL = `${baseURL}/orders.json?${params}`;
    console.log('Request URL:', fullURL);
    console.log('Authorization header:', `Basic ${credentials.substring(0, 20)}...`);

    const response = await fetch(fullURL, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Shopify API Error (${response.status}):`, errorText);
      
      let errorMessage = `Shopify API Error: ${response.status} ${response.statusText}`;
      
      // Aggiungi dettagli specifici per errori comuni
      if (response.status === 401) {
        errorMessage = 'Credenziali non valide. Verifica API Key e Password.';
      } else if (response.status === 403) {
        errorMessage = 'Permessi insufficienti. Verifica che l\'app abbia i permessi per leggere gli ordini.';
        console.log('=== 403 DEBUG INFO ===');
        console.log('Possibili cause:');
        console.log('1. App non ha permesso read_orders');
        console.log('2. App in modalità test/development');
        console.log('3. Store non ha ordini');
        console.log('4. Versione API non supportata');
      } else if (response.status === 404) {
        errorMessage = 'Store non trovato. Verifica il dominio.';
      } else if (response.status === 429) {
        errorMessage = 'Limite di richieste API raggiunto. Riprova tra qualche minuto.';
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        details: errorText,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('Shopify API Success:', { orderCount: data.orders?.length || 0 });
    
    // Debug: mostra i primi dati per verificare i campi
    if (data.orders && data.orders.length > 0) {
      const firstOrder = data.orders[0];
      console.log('=== DEBUG FIRST ORDER ===');
      console.log('Order ID:', firstOrder.id);
      console.log('Order Number:', firstOrder.order_number);
      console.log('Has shipping_lines:', !!firstOrder.shipping_lines);
      console.log('Has shipping_address:', !!firstOrder.shipping_address);
      console.log('Has total_shipping_price_set:', !!firstOrder.total_shipping_price_set);
      console.log('Has customer:', !!firstOrder.customer);
      if (firstOrder.shipping_lines) {
        console.log('Shipping lines count:', firstOrder.shipping_lines.length);
        firstOrder.shipping_lines.forEach((line, index) => {
          console.log(`Shipping line ${index}:`, {
            title: line.title,
            price: line.price,
            carrier_identifier: line.carrier_identifier,
            code: line.code
          });
        });
      }
      if (firstOrder.shipping_address) {
        console.log('Shipping address:', {
          name: firstOrder.shipping_address.name,
          email: firstOrder.shipping_address.email,
          phone: firstOrder.shipping_address.phone,
          address1: firstOrder.shipping_address.address1,
          city: firstOrder.shipping_address.city
        });
      }
      if (firstOrder.customer) {
        console.log('Customer:', {
          email: firstOrder.customer.email,
          first_name: firstOrder.customer.first_name,
          last_name: firstOrder.customer.last_name
        });
      }
    }
    
    // Inoltra l'header link di Shopify per la paginazione
    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      res.set('link', linkHeader);
      console.log('Link header inoltrato:', linkHeader);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Errore interno del server',
      details: error.message 
    });
  }
});

// === GOOGLE ADS API ENDPOINTS ===
const GOOGLE_ADS_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_API_BASE = 'https://googleads.googleapis.com/v14';

app.post('/api/google-ads/auth', async (req, res) => {
  const { code } = req.body;
  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.REACT_APP_GOOGLE_ADS_CLIENT_ID);
    params.append('client_secret', process.env.REACT_APP_GOOGLE_ADS_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', `${req.protocol}://${req.get('host')}/auth/google-ads/callback`);

    const response = await fetch(GOOGLE_ADS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Errore autenticazione Google Ads', details: error.message });
  }
});

app.post('/api/google-ads/campaigns', async (req, res) => {
  const { customerId, dateRange } = req.body;
  const accessToken = req.headers['authorization']?.replace('Bearer ', '');
  try {
    // Esempio: recupera campagne
    const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `SELECT campaign.id, campaign.name, campaign.status, campaign.budget_amount_micros, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date DURING ${dateRange || 'LAST_30_DAYS'}`
      })
    });
    const data = await response.json();
    res.json(data.results || []);
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento campagne Google Ads', details: error.message });
  }
});

app.post('/api/google-ads/daily', async (req, res) => {
  const { customerId, dateRange } = req.body;
  const accessToken = req.headers['authorization']?.replace('Bearer ', '');
  try {
    // Esempio: recupera dati giornalieri
    const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date DURING ${dateRange || 'LAST_30_DAYS'}`
      })
    });
    const data = await response.json();
    res.json(data.results || []);
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento dati giornalieri Google Ads', details: error.message });
  }
});

// === META API ENDPOINTS ===
const META_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const META_API_BASE = 'https://graph.facebook.com/v18.0';

app.post('/api/meta/auth', async (req, res) => {
  const { code } = req.body;
  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.REACT_APP_META_CLIENT_ID);
    params.append('client_secret', process.env.REACT_APP_META_CLIENT_SECRET);
    params.append('code', code);
    params.append('redirect_uri', `${req.protocol}://${req.get('host')}/auth/meta/callback`);

    const response = await fetch(META_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Errore autenticazione Meta', details: error.message });
  }
});

app.get('/api/meta/ad-accounts', async (req, res) => {
  const accessToken = req.headers['authorization']?.replace('Bearer ', '');
  try {
    const response = await fetch(`${META_API_BASE}/me/adaccounts?fields=id,name&access_token=${accessToken}`);
    const data = await response.json();
    res.json({ adAccounts: data.data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento ad accounts Meta', details: error.message });
  }
});

app.post('/api/meta/campaigns', async (req, res) => {
  const { adAccountId, dateRange } = req.body;
  const accessToken = req.headers['authorization']?.replace('Bearer ', '');
  try {
    const response = await fetch(`${META_API_BASE}/act_${adAccountId}/campaigns?fields=id,name,status,lifetime_budget,daily_budget,spend,impressions,clicks,actions,value&date_preset=${dateRange || 'last_30d'}&access_token=${accessToken}`);
    const data = await response.json();
    res.json(data.data || []);
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento campagne Meta', details: error.message });
  }
});

app.post('/api/meta/daily', async (req, res) => {
  const { adAccountId, dateRange } = req.body;
  const accessToken = req.headers['authorization']?.replace('Bearer ', '');
  try {
    const response = await fetch(`${META_API_BASE}/act_${adAccountId}/insights?fields=date_start,spend,impressions,clicks,actions,value&date_preset=${dateRange || 'last_30d'}&access_token=${accessToken}`);
    const data = await response.json();
    res.json(data.data || []);
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento dati giornalieri Meta', details: error.message });
  }
});



// Endpoint di health check per il deploy
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 