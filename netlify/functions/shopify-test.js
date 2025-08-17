const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Abilita CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Gestisci preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🔍 DEBUG - Inizio handler Netlify Function');
    
    // Verifica che sia una richiesta POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ success: false, error: 'Metodo non consentito. Usa POST.' })
      };
    }

    console.log('🔍 DEBUG - Metodo POST verificato');

    // Parsa il body della richiesta
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('🔍 DEBUG - Body parsato con successo');
    } catch (parseError) {
      console.error('❌ Errore nel parsing del body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Body JSON non valido' })
      };
    }

    // Verifica i parametri richiesti
    if (!body.shopDomain || !body.accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'shopDomain e accessToken sono richiesti' })
      };
    }

    console.log('🔍 DEBUG - Parametri base verificati');

    // Valida il formato del dominio
    if (!body.shopDomain.includes('.myshopify.com')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Formato dominio non valido. Deve essere .myshopify.com' })
      };
    }

    // Valida il formato del token
    if (!body.accessToken.startsWith('shpat_')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Formato token non valido. Deve iniziare con shpat_' })
      };
    }

    console.log('🔍 DEBUG - Validazione formato completata');

    const { shopDomain, accessToken, apiVersion, testType } = body;

    // Determina l'URL dell'API in base al tipo di test
    let apiUrl;
    
    switch (testType) {
      case 'shop':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/shop.json`;
        break;
      case 'products':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/products.json?limit=10`;
        break;
      case 'orders':
        console.log('🔍 DEBUG - Gestione orders iniziata');
        
        // Costruisci URL SEMPLIFICATO per orders
        let ordersUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/orders.json?limit=50`;
        
        // Aggiungi status se specificato
        if (body.status && body.status !== 'any') {
          ordersUrl += `&status=${body.status}`;
        }
        
        // Aggiungi page_info se presente (SEMPLIFICATO)
        if (body.pageInfo) {
          console.log('🔍 DEBUG - Aggiungendo pageInfo semplificato');
          ordersUrl += `&page_info=${body.pageInfo}`;
        }
        
        console.log('🔍 DEBUG - URL orders costruito:', ordersUrl);
        apiUrl = ordersUrl;
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Tipo di test non valido. Usa: shop, products, orders' })
        };
    }

    console.log(`🔄 Chiamata API Shopify: ${apiUrl}`);

    // Fai la richiesta a Shopify
    console.log('🔍 DEBUG - Prima della chiamata fetch...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log(`🔍 DEBUG - Dopo la chiamata fetch, status: ${response.status}`);

    if (!response.ok) {
      console.log(`❌ Errore Shopify API: ${response.status} ${response.statusText}`);
      console.log(`🔗 URL chiamato: ${apiUrl}`);
      
      if (response.status === 401) {
        throw new Error('Access token non valido o scaduto');
      } else if (response.status === 404) {
        throw new Error('Dominio shop non trovato');
      } else if (response.status === 400) {
        try {
          const errorBody = await response.text();
          console.log(`📄 Body errore 400: ${errorBody}`);
          throw new Error(`Errore API Shopify 400: ${errorBody}`);
        } catch (readError) {
          throw new Error(`Errore API Shopify: ${response.status} ${response.statusText}`);
        }
      } else {
        throw new Error(`Errore API Shopify: ${response.status} ${response.statusText}`);
      }
    }

    console.log('🔍 DEBUG - Risposta Shopify OK, parsando...');

    // Parsa la risposta
    const responseData = await response.json();
    console.log('🔍 DEBUG - Risposta parsata con successo');
    
    // Aggiungi link header per orders se presente
    if (testType === 'orders') {
      const linkHeader = response.headers.get('link');
      if (linkHeader) {
        responseData.linkHeader = linkHeader;
        console.log(`📄 Link header per paginazione: ${linkHeader}`);
      }
    }

    console.log('🔍 DEBUG - Preparando risposta finale...');

    // Restituisci la risposta
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData
      })
    };

  } catch (error) {
    console.error('❌ Errore generale nella Netlify Function:', error);
    console.error('❌ Stack trace:', error.stack);
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