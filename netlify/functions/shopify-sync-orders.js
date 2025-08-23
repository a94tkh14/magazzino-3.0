// Funzione per gestire ordini molto grandi con chunking
async function fetchOrdersInChunks(shopDomain, accessToken, apiVersion, totalLimit, status, daysBack, fulfillmentStatus, financialStatus) {
  const chunkSize = 250; // Massimo consentito da Shopify
  const chunks = [];
  
  for (let offset = 0; offset < totalLimit; offset += chunkSize) {
    const currentChunkSize = Math.min(chunkSize, totalLimit - offset);
    console.log(`📦 Chunk ${Math.floor(offset / chunkSize) + 1}: ${currentChunkSize} ordini`);
    
    // Costruisci URL per questo chunk
    let apiUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=${currentChunkSize}`;
    
    if (status && status !== 'any') {
      apiUrl += `&status=${status}`;
    }
    
    if (fulfillmentStatus) {
      apiUrl += `&fulfillment_status=${fulfillmentStatus}`;
    }
    
    if (financialStatus) {
      apiUrl += `&financial_status=${financialStatus}`;
    }
    
    if (daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const isoDate = cutoffDate.toISOString().split('T')[0];
      apiUrl += `&created_at_min=${isoDate}`;
    }
    
    // Aggiungi offset per paginazione
    if (offset > 0) {
      apiUrl += `&since_id=${offset}`;
    }
    
    console.log(`🔗 URL chunk: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Errore Shopify ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      chunks.push(data.orders || []);
      
      // Pausa tra i chunk per evitare rate limit
      if (offset + chunkSize < totalLimit) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`❌ Errore nel chunk ${Math.floor(offset / chunkSize) + 1}:`, error);
      throw error;
    }
  }
  
  // Unisci tutti i chunk
  const allOrders = chunks.flat();
  console.log(`✅ Chunking completato: ${allOrders.length} ordini totali`);
  return allOrders;
}

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
      daysBack = null, // RIMOSSO il valore di default per permettere scaricamento completo
      fulfillmentStatus = null,
      financialStatus = null,
      useChunking = false // Nuovo parametro per abilitare il chunking
    } = body;

    // Se richiesto il chunking e non c'è paginazione, usa il metodo alternativo
    if (useChunking && !pageInfo && limit > 250) {
      console.log('🔄 Utilizzo metodo chunking per ordini molto grandi');
      try {
        const orders = await fetchOrdersInChunks(
          shopDomain, 
          accessToken, 
          apiVersion, 
          limit, 
          status, 
          daysBack, 
          fulfillmentStatus, 
          financialStatus
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            orders: orders,
            totalCount: orders.length,
            method: 'chunking',
            metadata: {
              apiVersion,
              limit,
              status,
              daysBack,
              fulfillmentStatus,
              financialStatus,
              method: 'chunking',
              timestamp: new Date().toISOString()
            }
          })
        };
      } catch (chunkError) {
        console.error('❌ Errore nel chunking:', chunkError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: `Errore nel chunking: ${chunkError.message}` 
          })
        };
      }
    }

    // Ottimizzazione: usa limit più alto per ridurre il numero di chiamate
    // RIMOSSO il limite forzato per permettere download completo
    let optimizedLimit = limit; // Usa il limite richiesto dall'utente
    
    // Se il limite è molto alto, usa chunking automatico
    if (limit > 250) {
      console.log(`🔄 Limite alto richiesto (${limit}), uso chunking automatico`);
      try {
        const orders = await fetchOrdersInChunks(
          shopDomain, 
          accessToken, 
          apiVersion, 
          limit, 
          status, 
          daysBack, 
          fulfillmentStatus, 
          financialStatus
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            orders: orders,
            totalCount: orders.length,
            method: 'auto_chunking',
            metadata: {
              apiVersion,
              limit,
              status,
              daysBack,
              fulfillmentStatus,
              financialStatus,
              method: 'auto_chunking',
              timestamp: new Date().toISOString()
            }
          })
        };
      } catch (chunkError) {
        console.error('❌ Errore nel chunking automatico:', chunkError);
        // Fallback: usa limite massimo di Shopify
        optimizedLimit = 250;
        console.log(`⚠️ Fallback a limite Shopify standard: ${optimizedLimit}`);
      }
    }
    
    // Costruisci URL base
    let apiUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=${optimizedLimit}`;
    
    // Aggiungi filtri se specificati (ma NON quando c'è paginazione)
    // Shopify non permette di usare status + page_info contemporaneamente
    if (!pageInfo) {
      // Solo per la prima chiamata, aggiungi filtri di status
      if (status && status !== 'any') {
        // Gestisci status speciali per ordini archiviati
        if (status === 'cancelled' || status === 'refunded') {
          apiUrl += `&status=${status}`;
          console.log(`📦 Filtro per ordini archiviati: ${status}`);
        } else if (status === 'active') {
          // Per ordini attivi, escludi quelli cancellati e rimborsati
          apiUrl += `&status=open&status=closed&status=fulfilled`;
          console.log('📦 Filtro per ordini attivi (escludendo archiviati)');
        } else {
          apiUrl += `&status=${status}`;
        }
      }
      
      if (fulfillmentStatus) {
        apiUrl += `&fulfillment_status=${fulfillmentStatus}`;
      }
      
      if (financialStatus) {
        apiUrl += `&financial_status=${financialStatus}`;
      }
      
      // Aggiungi filtro per data se specificato
      if (daysBack && daysBack > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        const isoDate = cutoffDate.toISOString().split('T')[0];
        apiUrl += `&created_at_min=${isoDate}`;
        console.log(`📅 Filtro temporale applicato: ultimi ${daysBack} giorni (${isoDate})`);
      } else {
        console.log('📅 Nessun filtro temporale: scaricamento di TUTTI gli ordini disponibili');
      }
    } else {
      // Per le chiamate di paginazione, usa SOLO page_info
      // I filtri sono già applicati dalla prima chiamata
      console.log('📄 Paginazione: uso solo page_info, filtri già applicati');
    }
    
    // Aggiungi paginazione se specificata
    if (pageInfo) {
      if (pageInfo.startsWith('manual_')) {
        // Paginazione manuale - usa since_id per la prossima pagina
        const lastOrderId = pageInfo.replace('manual_', '');
        console.log(`🔧 Paginazione manuale con since_id: ${lastOrderId}`);
        apiUrl += `&since_id=${lastOrderId}`;
      } else {
        // Paginazione standard di Shopify
        apiUrl += `&page_info=${pageInfo}`;
      }
    }

    console.log('🔗 URL costruito:', apiUrl);
    console.log(`📊 Limit utilizzato: ${optimizedLimit} (richiesto: ${limit})`);

    // Chiamata a Shopify con timeout più lungo
    console.log('📡 Chiamata a Shopify...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 secondi di timeout
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
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

      // Normalizza i dati degli ordini per compatibilità
      const normalizedOrders = (data.orders || []).map(order => {
        return {
          ...order,
          // Assicurati che i campi principali siano sempre presenti
          id: order.id,
          orderNumber: order.order_number || order.id,
          customerName: order.customer?.first_name && order.customer?.last_name 
            ? `${order.customer.first_name} ${order.customer.last_name}` 
            : order.customer?.first_name || order.customer?.last_name || 'Cliente non specificato',
          customerEmail: order.customer?.email || 'Email non disponibile',
          totalPrice: order.total_price || order.totalPrice || 0,
          currency: order.currency || 'EUR',
          createdAt: order.created_at || order.createdAt,
          financialStatus: order.financial_status || order.financialStatus || 'unknown',
          fulfillmentStatus: order.fulfillment_status || order.fulfillmentStatus || 'unknown',
          // Marca ordini archiviati
          archived: ['cancelled', 'refunded'].includes(order.financial_status || order.financialStatus),
          archiveReason: ['cancelled', 'refunded'].includes(order.financial_status || order.financialStatus) 
            ? (order.financial_status || order.financialStatus) 
            : null,
          // Normalizza line items
          lineItems: order.line_items || order.lineItems || [],
          items: order.line_items || order.lineItems || [] // Per compatibilità
        };
      });

      // Prepara risposta
      const result = {
        success: true,
        orders: normalizedOrders,
        totalCount: normalizedOrders.length,
        optimizedLimit: optimizedLimit,
        originalLimit: limit
      };
      
      // Log informazioni sulla risposta
      console.log(`📦 Ordini ricevuti: ${result.totalCount}`);
      console.log(`📊 Headers risposta:`, Object.fromEntries(response.headers.entries()));
      
      // Controlla se ci sono informazioni sui totali
      if (response.headers.get('x-shopify-api-version-left')) {
        console.log('📈 API calls rimanenti:', response.headers.get('x-shopify-api-version-left'));
      }

      // Aggiungi informazioni di paginazione se disponibili
      const linkHeader = response.headers.get('link');
      console.log('🔗 Link header ricevuto:', linkHeader);
      
      if (linkHeader) {
        result.linkHeader = linkHeader;
        result.pagination = parseLinkHeader(linkHeader);
        console.log('📊 Paginazione parsata:', JSON.stringify(result.pagination, null, 2));
        
        // Log dettagliato per debug
        if (result.pagination.next) {
          console.log('➡️ Prossima pagina disponibile:', result.pagination.next.pageInfo);
        } else {
          console.log('⚠️ Nessuna prossima pagina trovata nel link header');
        }
      } else {
        console.log('⚠️ Nessun link header ricevuto da Shopify');
        // Se non c'è link header, prova a creare una paginazione manuale
        if (normalizedOrders.length === optimizedLimit) {
          console.log('🔧 Tentativo di creare paginazione manuale...');
          // Shopify potrebbe non inviare link header se non ci sono più pagine
          // Ma se abbiamo esattamente optimizedLimit ordini, probabilmente ce ne sono altri
          if (normalizedOrders.length > 0) {
            const lastOrder = normalizedOrders[normalizedOrders.length - 1];
            console.log(`🔧 Ultimo ordine ID: ${lastOrder.id}`);
            
            result.pagination = {
              hasMore: true,
              next: {
                pageInfo: `manual_${lastOrder.id}`,
                message: 'Paginazione manuale creata. Prova a chiamare di nuovo con questo pageInfo.',
                lastOrderId: lastOrder.id,
                method: 'manual'
              }
            };
          }
        }
      }

      // Aggiungi metadati utili
      result.metadata = {
        apiVersion,
        limit: optimizedLimit,
        originalLimit: limit,
        status: pageInfo ? 'filtered_from_first_call' : status, // Status applicato solo alla prima chiamata
        daysBack: pageInfo ? 'filtered_from_first_call' : daysBack,
        fulfillmentStatus: pageInfo ? 'filtered_from_first_call' : fulfillmentStatus,
        financialStatus: pageInfo ? 'filtered_from_first_call' : financialStatus,
        isPaginationCall: !!pageInfo,
        timestamp: new Date().toISOString(),
        functionTimeout: 30,
        functionMemory: 1024,
        method: 'standard_pagination',
        hasLinkHeader: !!linkHeader,
        ordersCount: normalizedOrders.length,
        isFullPage: normalizedOrders.length === optimizedLimit,
        paginationMethod: linkHeader ? 'shopify_link_header' : 'manual_created',
        // Informazioni sui tipi di ordini
        orderTypes: {
          active: normalizedOrders.filter(o => !o.archived).length,
          archived: normalizedOrders.filter(o => o.archived).length,
          cancelled: normalizedOrders.filter(o => o.financialStatus === 'cancelled').length,
          refunded: normalizedOrders.filter(o => o.financialStatus === 'refunded').length
        }
      };

      console.log('🎉 Invio risposta finale');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('⏰ Timeout della chiamata a Shopify');
        return {
          statusCode: 408,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Timeout della chiamata a Shopify. Prova con un limit più basso o filtri più specifici.',
            suggestion: 'Prova ad abilitare il chunking con useChunking: true per ordini molto grandi'
          })
        };
      }
      throw fetchError;
    }

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
  
  console.log('🔍 Parsing link header:', linkHeader);
  
  // Esempio: <https://shop.myshopify.com/admin/api/2024-01/orders.json?limit=50&page_info=eyJsYXN0X2lkIjo...>; rel="next"
  const linkRegex = /<([^>]+)>;\s*rel="([^"]+)"/g;
  let match;
  
  while ((match = linkRegex.exec(linkHeader)) !== null) {
    const url = match[1];
    const rel = match[2];
    
    console.log(`🔗 Trovato link: ${rel} -> ${url}`);
    
    try {
      const urlObj = new URL(url);
      const pageInfo = urlObj.searchParams.get('page_info');
      
      links[rel] = {
        url,
        pageInfo
      };
      
      console.log(`✅ Link ${rel} parsato con pageInfo: ${pageInfo ? pageInfo.substring(0, 20) + '...' : 'null'}`);
    } catch (urlError) {
      console.warn('⚠️ Errore nel parsing URL:', url, urlError);
      links[rel] = { url };
    }
  }
  
  console.log('📋 Risultato parsing:', JSON.stringify(links, null, 2));
  return links;
} 