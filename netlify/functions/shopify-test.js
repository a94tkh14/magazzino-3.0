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
    // Verifica che sia una richiesta POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ success: false, error: 'Metodo non consentito. Usa POST.' })
      };
    }

    // Parsa il body della richiesta
    let body;
    try {
      body = JSON.parse(event.body);
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

    let apiUrl;
    const { shopDomain, accessToken, apiVersion, testType } = body;

    // Determina l'URL dell'API in base al tipo di test
    switch (testType) {
      case 'shop':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/shop.json`;
        break;
      case 'products':
        apiUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/products.json?limit=10`;
        break;
      case 'orders':
        try {
          // Estrai tutti i parametri dal body già parsato
          const { limit = 50, status = 'open', pageInfo, daysBack } = body;
          
          console.log(`🔍 DEBUG - Body ricevuto:`, JSON.stringify(body, null, 2));
          console.log(`🔍 DEBUG - Parametri estratti:`, { limit, status, pageInfo, daysBack });
          
          // Validazione rigorosa dei parametri
          if (limit && (limit < 1 || limit > 250)) {
            throw new Error('Il limite deve essere tra 1 e 250');
          }
          
          if (status && !['open', 'closed', 'cancelled', 'pending', 'any'].includes(status)) {
            throw new Error('Status non valido. Usa: open, closed, cancelled, pending, any');
          }
          
          // Costruisci URL base SEMPLIFICATO - solo parametri essenziali
          let ordersUrl = `https://${shopDomain}/admin/api/${apiVersion || '2023-10'}/orders.json`;
          
          // Aggiungi SOLO il limite per ora - rimuoviamo altri parametri che potrebbero causare problemi
          if (limit && limit > 0) {
            ordersUrl += `?limit=${limit}`;
          }
          
          // Aggiungi status solo se specificato e valido
          if (status && status !== 'any' && ['open', 'closed', 'cancelled', 'pending'].includes(status)) {
            ordersUrl += ordersUrl.includes('?') ? `&status=${status}` : `?status=${status}`;
          }

          // Aggiungi page_info se presente
          if (pageInfo) {
            ordersUrl += ordersUrl.includes('?') ? `&page_info=${pageInfo}` : `?page_info=${pageInfo}`;
          }
          
          // Rimuoviamo temporaneamente daysBack per test
          // if (daysBack && daysBack > 0) {
          //   const cutoffDate = new Date();
          //   cutoffDate.setDate(cutoffDate.getDate() - daysBack);
          //   ordersUrl += ordersUrl.includes('?') ? `&created_at_min=${cutoffDate.toISOString()}` : `?created_at_min=${cutoffDate.toISOString()}`;
          // }
          
          console.log(`🔍 DEBUG - URL costruito: ${ordersUrl}`);
          console.log(`🔍 DEBUG - Parametri finali:`, { limit, status, pageInfo, daysBack });
          apiUrl = ordersUrl;
        } catch (ordersError) {
          console.error('❌ Errore nella costruzione URL orders:', ordersError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: `Errore configurazione orders: ${ordersError.message}` })
          };
        }
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
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ Errore Shopify API: ${response.status} ${response.statusText}`);
      console.log(`🔗 URL chiamato: ${apiUrl}`);
      console.log(`📊 Headers risposta:`, Object.fromEntries(response.headers.entries()));
      
      if (response.status === 401) {
        throw new Error('Access token non valido o scaduto');
      } else if (response.status === 404) {
        throw new Error('Dominio shop non trovato');
      } else if (response.status === 400) {
        // Per errori 400, prova a leggere il body per capire il problema
        try {
          const errorBody = await response.text();
          console.log(`📄 Body errore 400: ${errorBody}`);
          
          // Prova a parsare come JSON per errori più dettagliati
          try {
            const errorJson = JSON.parse(errorBody);
            console.log(`🔍 Errore JSON:`, errorJson);
            if (errorJson.errors) {
              throw new Error(`Errore API Shopify 400: ${JSON.stringify(errorJson.errors)}`);
            } else {
              throw new Error(`Errore API Shopify 400: ${errorBody}`);
            }
          } catch (parseError) {
            throw new Error(`Errore API Shopify 400: ${errorBody}`);
          }
        } catch (readError) {
          throw new Error(`Errore API Shopify: ${response.status} ${response.statusText}`);
        }
      } else {
        throw new Error(`Errore API Shopify: ${response.status} ${response.statusText}`);
      }
    }

    // Parsa la risposta
    const responseData = await response.json();
    
    // Aggiungi link header per orders se presente
    if (testType === 'orders') {
      const linkHeader = response.headers.get('link');
      if (linkHeader) {
        responseData.linkHeader = linkHeader;
        console.log(`📄 Link header per paginazione: ${linkHeader}`);
        // Added logging for next link presence
        if (linkHeader.includes('rel="next"')) {
          console.log(`✅ Link "next" trovato - ci sono più pagine disponibili`);
        } else {
          console.log(`ℹ️ Nessun link "next" - questa è l'ultima pagina`);
        }
      } else {
        console.log(`⚠️ Nessun link header ricevuto - potrebbe essere l'ultima pagina`);
      }
    }

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