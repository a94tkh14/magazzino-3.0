const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
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
    const { 
      shopDomain, 
      accessToken, 
      apiVersion = '2024-01',
      limit = 250,
      status = 'any',
      pageInfo = null,
      since_id = null,
      daysBack = null
    } = JSON.parse(event.body);

    if (!shopDomain || !accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Shop domain and access token are required' 
        })
      };
    }

    // Costruisci URL Shopify
    let url;
    
    if (pageInfo) {
      // IMPORTANTE: Quando si usa page_info, NON si possono usare altri parametri tranne limit
      // Il page_info contiene già tutti i filtri della query originale
      url = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=${Math.min(limit, 250)}&page_info=${pageInfo}`;
      console.log(`📄 Using pageInfo for pagination`);
    } else {
      // Prima richiesta: costruisci URL con tutti i parametri
      url = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=${Math.min(limit, 250)}`;
      
      // Aggiungi status (Shopify usa 'any' per tutti gli ordini)
      if (status && status !== 'any') {
        url += `&status=${status}`;
      } else {
        // Per ottenere TUTTI gli ordini inclusi archiviati
        url += `&status=any`;
      }
      
      if (since_id) {
        url += `&since_id=${since_id}`;
      }
      
      if (daysBack) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysBack);
        url += `&created_at_min=${sinceDate.toISOString()}`;
      }
    }

    console.log(`🔄 Fetching Shopify orders from: ${url.replace(accessToken, '***')}`);
    console.log(`📊 Parameters: limit=${limit}, status=${status}, pageInfo=${pageInfo ? 'YES' : 'NO'}, since_id=${since_id || 'none'}`);

    // Timeout di 30 secondi per chiamate lunghe
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Shopify API Error: ${response.status} - ${errorText}`);
      
      // Rate limiting - suggerisci retry
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Rate limit raggiunto. Riprova tra qualche secondo.',
            retryAfter: response.headers.get('Retry-After') || 2
          })
        };
      }
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Shopify API Error: ${response.status}`,
          details: errorText
        })
      };
    }

    const data = await response.json();
    const orders = data.orders || [];
    
    // Estrai pageInfo per paginazione dal Link header
    const linkHeader = response.headers.get('link');
    let nextPageInfo = null;
    let prevPageInfo = null;
    
    if (linkHeader) {
      // Parse Link header per estrarre page_info
      // Formato: <URL>; rel="next", <URL>; rel="previous"
      const links = linkHeader.split(',');
      
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match) {
          const linkUrl = match[1];
          const rel = match[2];
          
          try {
            const parsedUrl = new URL(linkUrl);
            const pageInfoParam = parsedUrl.searchParams.get('page_info');
            
            if (rel === 'next' && pageInfoParam) {
              nextPageInfo = pageInfoParam;
              console.log(`✅ Found next page_info: ${pageInfoParam.substring(0, 20)}...`);
            } else if (rel === 'previous' && pageInfoParam) {
              prevPageInfo = pageInfoParam;
            }
          } catch (error) {
            console.error(`❌ Error parsing link URL: ${error.message}`);
          }
        }
      }
    }

    console.log(`✅ Fetched ${orders.length} orders | hasNext: ${!!nextPageInfo} | hasPrev: ${!!prevPageInfo}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orders: orders,
        pagination: {
          nextPageInfo,
          prevPageInfo,
          hasNext: !!nextPageInfo,
          hasPrev: !!prevPageInfo
        },
        totalCount: orders.length,
        metadata: {
          apiVersion,
          timestamp: new Date().toISOString(),
          shopDomain
        }
      })
    };

  } catch (error) {
    console.error('❌ Error in shopify-sync-orders:', error);
    
    // Gestisci errore di abort (timeout)
    if (error.name === 'AbortError') {
      return {
        statusCode: 504,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Timeout: la richiesta ha impiegato troppo tempo',
          type: 'timeout'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        type: error.name
      })
    };
  }
};
