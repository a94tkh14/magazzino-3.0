const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { shopDomain, accessToken, apiVersion } = JSON.parse(event.body);
    
    if (!shopDomain || !accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Credenziali Shopify richieste' 
        })
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        products: products,
        count: products.length
      })
    };

  } catch (error) {
    console.error(`❌ Errore sincronizzazione Shopify:`, error);
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