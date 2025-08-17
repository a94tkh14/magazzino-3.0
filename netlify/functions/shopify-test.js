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
    const { shopDomain, accessToken, apiVersion, testType } = JSON.parse(event.body);
    
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
        const { limit = 50, status = 'any', pageInfo, daysBack } = JSON.parse(event.body);
        let ordersUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/orders.json?limit=${limit}&status=${status}`;
        
        // Aggiungi filtro per data se specificato
        if (daysBack) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysBack);
          ordersUrl += `&created_at_min=${cutoffDate.toISOString()}`;
        }
        
        // Aggiungi page_info per paginazione
        if (pageInfo) {
          ordersUrl += `&page_info=${pageInfo}`;
        }
        
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