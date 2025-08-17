const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Abilita CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Gestisci preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { shopDomain, accessToken, apiVersion, testType } = body;
    
    if (!shopDomain || !accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Dominio shop e access token sono richiesti' 
        })
      };
    }

    // Validazione formato dominio
    const domainRegex = /^[a-zA-Z0-9-]+\.myshopify\.com$/;
    if (!domainRegex.test(shopDomain)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Formato dominio non valido. Deve essere: nome-shop.myshopify.com' 
        })
      };
    }

    // Validazione formato access token
    if (!accessToken.startsWith('shpat_')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Access token non valido. Deve iniziare con "shpat_"' 
        })
      };
    }

    let apiUrl;

    switch (testType) {
      case 'shop':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/shop.json`;
        break;
      case 'products':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/products.json?limit=5`;
        break;
      case 'orders':
        // Estrai tutti i parametri dal body già parsato
        const { limit = 250, status = 'open', pageInfo, daysBack } = body;
        
        // Shopify accetta solo questi status: open, closed, cancelled, pending, any
        // 'any' significa tutti gli status, ma dobbiamo gestirlo diversamente
        let ordersUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/orders.json?limit=${limit}`;
        
        // Aggiungi status solo se non è 'any'
        if (status && status !== 'any') {
          ordersUrl += `&status=${status}`;
        }

        if (daysBack) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysBack);
          ordersUrl += `&created_at_min=${cutoffDate.toISOString()}`;
        }

        if (pageInfo) {
          ordersUrl += `&page_info=${pageInfo}`;
        }
        
        console.log(`🔄 Chiamata API Shopify: ${ordersUrl}`);
        apiUrl = ordersUrl;
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

    const responseData = await response.json();
    
    // Per gli ordini, aggiungi il link header per la paginazione
    if (testType === 'orders') {
      const linkHeader = response.headers.get('link');
      if (linkHeader) {
        responseData.linkHeader = linkHeader;
        console.log(`📄 Link header per paginazione: ${linkHeader}`);
      }
    }
    
    console.log(`✅ Test Shopify riuscito per: ${testType}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData,
        testType: testType
      })
    };

  } catch (error) {
    console.error(`❌ Errore test Shopify:`, error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};