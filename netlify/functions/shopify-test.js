const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('🔍 DEBUG - Inizio handler Netlify Function');
  
  // Abilita CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Gestisci preflight request
  if (event.httpMethod === 'OPTIONS') {
    console.log('🔍 DEBUG - OPTIONS request gestita');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🔍 DEBUG - Metodo HTTP:', event.httpMethod);
    
    // Verifica che sia una richiesta POST
    if (event.httpMethod !== 'POST') {
      console.log('🔍 DEBUG - Metodo non consentito');
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
      console.log('🔍 DEBUG - Body parsato con successo:', JSON.stringify(body, null, 2));
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
      console.log('🔍 DEBUG - Parametri mancanti');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'shopDomain e accessToken sono richiesti' })
      };
    }

    console.log('🔍 DEBUG - Parametri base verificati');

    // Valida il formato del dominio
    if (!body.shopDomain.includes('.myshopify.com')) {
      console.log('🔍 DEBUG - Formato dominio non valido');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Formato dominio non valido. Deve essere .myshopify.com' })
      };
    }

    // Valida il formato del token
    if (!body.accessToken.startsWith('shpat_')) {
      console.log('🔍 DEBUG - Formato token non valido');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Formato token non valido. Deve iniziare con shpat_' })
      };
    }

    console.log('🔍 DEBUG - Validazione formato completata');

    const { shopDomain, accessToken, apiVersion, testType } = body;
    console.log('🔍 DEBUG - Parametri estratti:', { shopDomain, apiVersion, testType });

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
        console.log('🔍 DEBUG - Tipo test non valido:', testType);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Tipo di test non valido. Usa: shop, products, orders' })
        };
    }

    console.log(`🔄 Chiamata API Shopify: ${apiUrl}`);

    // Fai la richiesta a Shopify
    console.log('🔍 DEBUG - Prima della chiamata fetch...');
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
      console.log(`🔍 DEBUG - Dopo la chiamata fetch, status: ${response.status}`);
    } catch (fetchError) {
      console.error('❌ Errore nella chiamata fetch:', fetchError);
      throw new Error(`Errore di rete: ${fetchError.message}`);
    }

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
    let responseData;
    try {
      responseData = await response.json();
      console.log('🔍 DEBUG - Risposta parsata con successo');
    } catch (parseResponseError) {
      console.error('❌ Errore nel parsing della risposta:', parseResponseError);
      throw new Error(`Errore nel parsing della risposta: ${parseResponseError.message}`);
    }
    
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
    const finalResponse = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData
      })
    };
    
    console.log('🔍 DEBUG - Risposta finale preparata, inviando...');
    return finalResponse;

  } catch (error) {
    console.error('❌ Errore generale nella Netlify Function:', error);
    console.error('❌ Stack trace:', error.stack);
    
    const errorResponse = {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Errore interno: ${error.message}`
      })
    };
    
    console.log('🔍 DEBUG - Risposta errore preparata, inviando...');
    return errorResponse;
  }
};