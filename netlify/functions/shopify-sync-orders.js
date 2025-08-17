exports.handler = async (event, context) => {
  console.log('🚀 Shopify Sync Orders Function avviata');
  
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

    // Verifica parametri obbligatori
    if (!body.shopDomain || !body.accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'shopDomain e accessToken sono richiesti' })
      };
    }

    console.log('✅ Parametri verificati');

    // Parametri opzionali con valori di default
    const {
      shopDomain,
      accessToken,
      apiVersion = '2024-01',
      limit = 50,
      status = 'any',
      pageInfo = null,
      daysBack = null,
      fulfillmentStatus = null,
      financialStatus = null
    } = body;

    // Costruisci URL base
    let apiUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=${limit}`;
    
    // Aggiungi filtri se specificati (ma NON quando c'è paginazione)
    // Shopify non permette di usare status + page_info contemporaneamente
    if (!pageInfo) {
      // Solo per la prima chiamata, aggiungi filtri di status
      if (status && status !== 'any') {
        apiUrl += `&status=${status}`;
      }
      
      if (fulfillmentStatus) {
        apiUrl += `&fulfillment_status=${fulfillmentStatus}`;
      }
      
      if (financialStatus) {
        apiUrl += `&financial_status=${financialStatus}`;
      }
      
      // Aggiungi filtro per data se specificato
      if (daysBack) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        const isoDate = cutoffDate.toISOString().split('T')[0];
        apiUrl += `&created_at_min=${isoDate}`;
      }
    } else {
      // Per le chiamate di paginazione, usa SOLO page_info
      // I filtri sono già applicati dalla prima chiamata
      console.log('📄 Paginazione: uso solo page_info, filtri già applicati');
    }
    
    // Aggiungi paginazione se specificata
    if (pageInfo) {
      apiUrl += `&page_info=${pageInfo}`;
    }

    console.log('🔗 URL costruito:', apiUrl);

    // Chiamata a Shopify
    console.log('📡 Chiamata a Shopify...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Risposta Shopify:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore Shopify:', response.status, errorText);
      
      // Gestisci errori specifici
      let errorMessage = `Errore Shopify ${response.status}`;
      if (response.status === 401) {
        errorMessage = 'Token di accesso non valido o scaduto';
      } else if (response.status === 403) {
        errorMessage = 'Permessi insufficienti per accedere agli ordini';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit raggiunto, riprova tra qualche minuto';
      } else if (response.status >= 500) {
        errorMessage = 'Errore del server Shopify, riprova più tardi';
      }
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: errorText
        })
      };
    }

    // Parsa risposta
    const data = await response.json();
    console.log('✅ Risposta parsata');

    // Prepara risposta
    const result = {
      success: true,
      orders: data.orders || [],
      totalCount: data.orders ? data.orders.length : 0
    };

    // Aggiungi informazioni di paginazione se disponibili
    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      result.linkHeader = linkHeader;
      result.pagination = parseLinkHeader(linkHeader);
      console.log('🔗 Link header aggiunto');
    }

    // Aggiungi metadati utili
    result.metadata = {
      apiVersion,
      limit,
      status: pageInfo ? 'filtered_from_first_call' : status, // Status applicato solo alla prima chiamata
      daysBack: pageInfo ? 'filtered_from_first_call' : daysBack,
      fulfillmentStatus: pageInfo ? 'filtered_from_first_call' : fulfillmentStatus,
      financialStatus: pageInfo ? 'filtered_from_first_call' : financialStatus,
      isPaginationCall: !!pageInfo,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Invio risposta finale');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('💥 Errore generale:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: `Errore interno: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

// Funzione per parsare l'header Link di Shopify
function parseLinkHeader(linkHeader) {
  const links = {};
  
  if (!linkHeader) return links;
  
  // Esempio: <https://shop.myshopify.com/admin/api/2024-01/orders.json?limit=50&page_info=eyJsYXN0X2lkIjo...>; rel="next"
  const linkRegex = /<([^>]+)>;\s*rel="([^"]+)"/g;
  let match;
  
  while ((match = linkRegex.exec(linkHeader)) !== null) {
    const url = match[1];
    const rel = match[2];
    
    try {
      const urlObj = new URL(url);
      const pageInfo = urlObj.searchParams.get('page_info');
      
      links[rel] = {
        url,
        pageInfo
      };
    } catch (urlError) {
      console.warn('⚠️ Errore nel parsing URL:', url, urlError);
      links[rel] = { url };
    }
  }
  
  return links;
} 