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
      apiVersion = '2023-10',
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
      // Se pageInfo è fornito, assicurati che sia un URL assoluto
      if (pageInfo.startsWith('http')) {
        url = pageInfo;
      } else {
        // Se è relativo, costruisci l'URL completo
        url = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?${pageInfo}`;
      }
      console.log(`📄 Using pageInfo URL: ${url}`);
    } else {
      // Costruisci URL da zero
      url = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=${Math.min(limit, 250)}`;
      
      // Aggiungi parametri solo se non stiamo usando pageInfo
      if (status && status !== 'any') {
        url += `&status=${status}`;
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

    console.log(`🔄 Fetching Shopify orders from: ${url}`);
    console.log(`📊 Parameters: limit=${limit}, status=${status}, pageInfo=${pageInfo ? 'provided' : 'none'}, since_id=${since_id || 'none'}`);
    if (pageInfo) {
      console.log(`🔍 pageInfo value: ${pageInfo}`);
      console.log(`🔍 pageInfo type: ${typeof pageInfo}`);
      console.log(`🔍 pageInfo starts with http: ${pageInfo.startsWith('http')}`);
    }
    if (since_id) {
      console.log(`🔍 since_id value: ${since_id}`);
    }

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
    
    // Estrai pageInfo per paginazione
    const linkHeader = response.headers.get('link');
    let nextPageInfo = null;
    let prevPageInfo = null;
    
    console.log(`🔍 Link Header: ${linkHeader}`);
    
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      const prevMatch = linkHeader.match(/<([^>]+)>;\s*rel="previous"/);
      
      console.log(`🔍 Next Match: ${nextMatch ? nextMatch[1] : 'none'}`);
      console.log(`🔍 Prev Match: ${prevMatch ? prevMatch[1] : 'none'}`);
      
      if (nextMatch) {
        try {
          const nextUrl = new URL(nextMatch[1]);
          nextPageInfo = nextUrl.searchParams.get('page_info');
          console.log(`🔍 Next PageInfo: ${nextPageInfo}`);
        } catch (error) {
          console.error(`❌ Errore parsing next URL: ${error.message}`);
        }
      }
      
      if (prevMatch) {
        try {
          const prevUrl = new URL(prevMatch[1]);
          prevPageInfo = prevUrl.searchParams.get('page_info');
          console.log(`🔍 Prev PageInfo: ${prevPageInfo}`);
        } catch (error) {
          console.error(`❌ Errore parsing prev URL: ${error.message}`);
        }
      }
    } else {
      console.log(`⚠️ Nessun Link Header trovato`);
    }

    console.log(`✅ Successfully fetched ${orders.length} orders`);
    console.log(`📄 Pagination info: hasNext=${!!nextPageInfo}, hasPrev=${!!prevPageInfo}`);
    console.log(`📄 NextPageInfo value: ${nextPageInfo}`);
    console.log(`📄 PrevPageInfo value: ${prevPageInfo}`);

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
        method: 'shopify-api',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Error in shopify-sync-orders:', error);
    
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
