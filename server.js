const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3002;

app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Expose-Headers', 'link');
  next();
});
app.use(express.json());

// Endpoint di test per verificare la connessione base
app.get('/api/shopify/test', async (req, res) => {
  try {
    const { shop, apiKey, apiPassword, apiVersion } = req.query;
    
    console.log('=== TEST CONNECTION ===');
    console.log('Shop:', shop);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('API Version:', apiVersion);
    
    if (!shop || !apiKey || !apiPassword || !apiVersion) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }

    const baseURL = `https://${shop}/admin/api/${apiVersion}`;
    const credentials = Buffer.from(`${apiKey}:${apiPassword}`).toString('base64');
    
    // Test 1: Verifica connessione base (shop info)
    console.log('Test 1: Verifica shop info...');
    const shopResponse = await fetch(`${baseURL}/shop.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Shop Response Status:', shopResponse.status);
    
    if (!shopResponse.ok) {
      const errorText = await shopResponse.text();
      console.error('Shop API Error:', errorText);
      return res.status(shopResponse.status).json({ 
        error: `Errore connessione base: ${shopResponse.status}`,
        details: errorText
      });
    }

    const shopData = await shopResponse.json();
    console.log('Shop info ottenuta:', shopData.shop?.name);

    // Test 2: Verifica permessi ordini
    console.log('Test 2: Verifica permessi ordini...');
    const ordersResponse = await fetch(`${baseURL}/orders.json?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Orders Response Status:', ordersResponse.status);
    
    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Orders API Error:', errorText);
      return res.status(ordersResponse.status).json({ 
        error: `Errore permessi ordini: ${ordersResponse.status}`,
        details: errorText,
        shopInfo: shopData.shop
      });
    }

    const ordersData = await ordersResponse.json();
    console.log('Orders access OK, count:', ordersData.orders?.length || 0);

    res.json({ 
      success: true,
      message: 'Connessione e permessi OK',
      shop: shopData.shop,
      ordersCount: ordersData.orders?.length || 0
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      error: 'Errore test connessione',
      details: error.message 
    });
  }
});

// Proxy per le API Shopify
app.get('/api/shopify/orders', async (req, res) => {
  try {
    const { shop, apiKey, apiPassword, apiVersion, page_info } = req.query;
    
    console.log('=== DEBUG SHOPIFY API ===');
    console.log('Shop:', shop);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('API Password:', apiPassword ? `${apiPassword.substring(0, 10)}...` : 'MISSING');
    console.log('API Version:', apiVersion);
    if (page_info) console.log('Page Info:', page_info);
    
    if (!shop || !apiKey || !apiPassword || !apiVersion) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }

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

// Google Ads API endpoints
app.post('/api/google-ads/auth', async (req, res) => {
  try {
    const { code } = req.body;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}/auth/google-ads/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    res.json(tokenData);
  } catch (error) {
    console.error('Errore autenticazione Google Ads:', error);
    res.status(500).json({ error: 'Errore autenticazione' });
  }
});

app.post('/api/google-ads/campaigns', async (req, res) => {
  try {
    const { customerId, dateRange } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];

    // Query Google Ads API per le campagne
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.budget_amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING ${dateRange}
    `;

    const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    res.json(data.results || []);
  } catch (error) {
    console.error('Errore caricamento campagne Google Ads:', error);
    res.status(500).json({ error: 'Errore caricamento campagne' });
  }
});

app.post('/api/google-ads/daily', async (req, res) => {
  try {
    const { customerId, dateRange } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];

    // Query per dati giornalieri
    const query = `
      SELECT 
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING ${dateRange}
    `;

    const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    res.json(data.results || []);
  } catch (error) {
    console.error('Errore caricamento dati giornalieri Google Ads:', error);
    res.status(500).json({ error: 'Errore caricamento dati giornalieri' });
  }
});

// Meta API endpoints
app.post('/api/meta/auth', async (req, res) => {
  try {
    const { code } = req.body;
    
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.META_CLIENT_ID,
        client_secret: process.env.META_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}/auth/meta/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    res.json(tokenData);
  } catch (error) {
    console.error('Errore autenticazione Meta:', error);
    res.status(500).json({ error: 'Errore autenticazione' });
  }
});

app.get('/api/meta/ad-accounts', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    const response = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}`);
    const data = await response.json();
    
    res.json({ adAccounts: data.data || [] });
  } catch (error) {
    console.error('Errore caricamento ad accounts Meta:', error);
    res.status(500).json({ error: 'Errore caricamento ad accounts' });
  }
});

app.post('/api/meta/campaigns', async (req, res) => {
  try {
    const { adAccountId, dateRange } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];

    const fields = [
      'id', 'name', 'status', 'lifetime_budget', 'daily_budget',
      'spend', 'impressions', 'clicks', 'actions', 'value'
    ].join(',');

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?` +
      `fields=${fields}&` +
      `date_preset=${dateRange}&` +
      `access_token=${accessToken}`
    );

    const data = await response.json();
    res.json(data.data || []);
  } catch (error) {
    console.error('Errore caricamento campagne Meta:', error);
    res.status(500).json({ error: 'Errore caricamento campagne' });
  }
});

app.post('/api/meta/daily', async (req, res) => {
  try {
    const { adAccountId, dateRange } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];

    const fields = [
      'date_start', 'spend', 'impressions', 'clicks', 'actions', 'value'
    ].join(',');

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=${fields}&` +
      `date_preset=${dateRange}&` +
      `access_token=${accessToken}`
    );

    const data = await response.json();
    res.json(data.data || []);
  } catch (error) {
    console.error('Errore caricamento dati giornalieri Meta:', error);
    res.status(500).json({ error: 'Errore caricamento dati giornalieri' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
}); 