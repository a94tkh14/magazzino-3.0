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

    const responseData = await response.json();
    
    // Per gli ordini, aggiungi il link header per la paginazione
    if (testType === 'orders') {
      const linkHeader = response.headers.get('link');
      if (linkHeader) {
        responseData.linkHeader = linkHeader;
        console.log(`📄 Link header per paginazione: ${linkHeader}`);
        
        // Verifica se ci sono più pagine
        if (linkHeader.includes('rel="next"')) {
          console.log(`✅ Link "next" trovato - ci sono più pagine disponibili`);
        } else {
          console.log(`ℹ️ Nessun link "next" - questa è l'ultima pagina`);
        }
      } else {
        console.log(`⚠️ Nessun link header ricevuto - potrebbe essere l'ultima pagina`);
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