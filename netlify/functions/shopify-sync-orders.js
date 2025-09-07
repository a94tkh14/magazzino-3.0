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
    let url = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=${Math.min(limit, 250)}`;
    
    // Aggiungi parametri
    if (status && status !== 'any') {
      url += `&status=${status}`;
    }
    
    if (pageInfo) {
      url += `&page_info=${encodeURIComponent(pageInfo)}`;
    }
    
    if (daysBack) {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysBack);
      url += `&created_at_min=${sinceDate.toISOString()}`;
    }

    console.log(`🔄 Fetching Shopify orders from: ${url}`);

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
    
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      const prevMatch = linkHeader.match(/<([^>]+)>;\s*rel="previous"/);
      
      if (nextMatch) {
        const nextUrl = new URL(nextMatch[1]);
        nextPageInfo = nextUrl.searchParams.get('page_info');
      }
      
      if (prevMatch) {
        const prevUrl = new URL(prevMatch[1]);
        prevPageInfo = prevUrl.searchParams.get('page_info');
      }
    }

    console.log(`✅ Successfully fetched ${orders.length} orders`);

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
