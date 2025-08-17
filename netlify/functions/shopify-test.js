exports.handler = async (event, context) => {
  console.log('🚀 Nuova Netlify Function avviata');
  
  // Abilita CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Gestisci preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('📝 Metodo:', event.httpMethod);
    
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ success: false, error: 'Solo POST consentito' })
      };
    }

    console.log('✅ Metodo POST verificato');

    // Parsa il body
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('✅ Body parsato:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('❌ Errore parsing body:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Body JSON non valido' })
      };
    }

    // Verifica parametri
    if (!body.shopDomain || !body.accessToken || !body.testType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Parametri mancanti' })
      };
    }

    console.log('✅ Parametri verificati');

    // Costruisci URL
    let apiUrl;
    if (body.testType === 'orders') {
      apiUrl = `https://${body.shopDomain}/admin/api/${body.apiVersion || '2023-10'}/orders.json?limit=50`;
      
      if (body.status && body.status !== 'any') {
        apiUrl += `&status=${body.status}`;
      }
      
      if (body.pageInfo) {
        apiUrl += `&page_info=${body.pageInfo}`;
      }
    } else if (body.testType === 'shop') {
      apiUrl = `https://${body.shopDomain}/admin/api/${body.apiVersion || '2023-10'}/shop.json`;
    } else if (body.testType === 'products') {
      apiUrl = `https://${body.shopDomain}/admin/api/${body.apiVersion || '2023-10'}/products.json?limit=10`;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Tipo test non valido' })
      };
    }

    console.log('🔗 URL costruito:', apiUrl);

    // Chiamata a Shopify
    console.log('📡 Chiamata a Shopify...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': body.accessToken,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Risposta Shopify:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore Shopify:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: `Errore Shopify ${response.status}: ${errorText}` 
        })
      };
    }

    // Parsa risposta
    const data = await response.json();
    console.log('✅ Risposta parsata');

    // Aggiungi link header per orders
    if (body.testType === 'orders') {
      const linkHeader = response.headers.get('link');
      if (linkHeader) {
        data.linkHeader = linkHeader;
        console.log('🔗 Link header aggiunto');
      }
    }

    console.log('🎉 Invio risposta finale');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data })
    };

  } catch (error) {
    console.error('💥 Errore generale:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: `Errore interno: ${error.message}` 
      })
    };
  }
}; 