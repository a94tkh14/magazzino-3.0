// Funzioni per gestire la sincronizzazione con Shopify
export const getShopifyCredentials = () => {
  const credentials = localStorage.getItem('shopify_config');
  if (!credentials) {
    throw new Error('Credenziali Shopify non configurate. Vai nelle Impostazioni per configurarle.');
  }
  return JSON.parse(credentials);
};

export const convertShopifyOrder = (shopifyOrder) => {
  return {
    id: shopifyOrder.id.toString(),
    orderNumber: shopifyOrder.order_number || shopifyOrder.name,
    customerName: shopifyOrder.customer ? 
      `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim() : 
      'Cliente sconosciuto',
    customerEmail: shopifyOrder.customer?.email || '',
    totalPrice: parseFloat(shopifyOrder.total_price || 0),
    currency: shopifyOrder.currency || 'EUR',
    status: shopifyOrder.financial_status || 'pending',
    createdAt: shopifyOrder.created_at,
    updatedAt: shopifyOrder.updated_at,
    shippingPrice: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || 0),
    shippingType: shopifyOrder.shipping_lines?.[0]?.title || 'Standard',
    items: (shopifyOrder.line_items || []).map(item => ({
      id: item.id.toString(),
      sku: item.sku || '',
      name: item.name || '',
      quantity: item.quantity || 0,
      price: parseFloat(item.price || 0),
      total: parseFloat(item.line_price || 0)
    })),
    // Dati aggiuntivi per compatibilità
    financialStatus: shopifyOrder.financial_status,
    fulfillmentStatus: shopifyOrder.fulfillment_status,
    tags: shopifyOrder.tags || '',
    note: shopifyOrder.note || ''
  };
};

export const fetchShopifyOrders = async (params = {}) => {
  const {
    limit = 250,
    status = 'any',
    pageInfo = null,
    daysBack = null
  } = params;

  const credentials = getShopifyCredentials();

  const response = await fetch('/.netlify/functions/shopify-sync-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      shopDomain: credentials.shopDomain,
      accessToken: credentials.accessToken,
      apiVersion: credentials.apiVersion || '2023-10',
      limit,
      status,
      pageInfo,
      daysBack
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Errore HTTP ${response.status}: ${errorData.error || 'Errore sconosciuto'}`);
  }

  return await response.json();
};

// Funzione per scaricare TUTTI gli ordini con paginazione corretta
export const downloadAllShopifyOrders = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  let pageCount = 0;
  const maxPages = 1000; // Limite di sicurezza
  const ordersPerPage = 250;
  let nextPageInfo = null;
  
  console.log('🚀 INIZIO DOWNLOAD MASSIVO ORDINI SHOPIFY...');
  
  try {
    while (pageCount < maxPages) {
      // Controlla se la sincronizzazione è stata annullata
      if (abortController?.signal?.aborted) {
        throw new Error('Download annullato dall\'utente');
      }

      pageCount++;
      
      // Aggiorna progresso
      if (onProgress) {
        onProgress({
          currentPage: pageCount,
          totalPages: '?',
          ordersDownloaded: allOrders.length,
          currentStatus: `Scaricamento pagina ${pageCount}...`
        });
      }

      console.log(`📄 Scaricamento pagina ${pageCount}...`);

      try {
        const response = await fetchShopifyOrders({
          limit: ordersPerPage,
          status: 'any',
          pageInfo: nextPageInfo // Usa il pageInfo della pagina precedente
        });

        if (!response.success) {
          throw new Error(response.error || 'Errore nella risposta API');
        }

        const orders = response.orders || [];
        
        if (orders.length === 0) {
          console.log(`✅ Pagina ${pageCount} - Nessun ordine, fine download`);
          break;
        }

        // Aggiungi ordini evitando duplicati
        let newOrdersCount = 0;
        for (const order of orders) {
          if (order.id && !uniqueOrderIds.has(order.id.toString())) {
            allOrders.push(order);
            uniqueOrderIds.add(order.id.toString());
            newOrdersCount++;
          }
        }

        console.log(`✅ Pagina ${pageCount}: ${newOrdersCount} ordini nuovi, ${orders.length - newOrdersCount} duplicati saltati`);

        // Aggiorna progresso
        if (onProgress) {
          onProgress({
            currentPage: pageCount,
            totalPages: '?',
            ordersDownloaded: allOrders.length,
            currentStatus: `Scaricati ${allOrders.length} ordini unici (pagina ${pageCount})...`
          });
        }

        // Aggiorna nextPageInfo per la prossima iterazione
        nextPageInfo = response.pagination?.nextPageInfo;
        
        // Controlla se c'è una pagina successiva
        if (!nextPageInfo) {
          console.log(`✅ Pagina ${pageCount} - Ultima pagina raggiunta`);
          break;
        }

        // Pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        console.error(`❌ Errore pagina ${pageCount}:`, error);
        
        // Se è un errore di rete, riprova dopo una pausa più lunga
        if (error.message.includes('fetch') || error.message.includes('network')) {
          console.log(`🔄 Retry pagina ${pageCount} dopo 5 secondi...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          pageCount--; // Riprova la stessa pagina
          continue;
        }
        
        throw error;
      }
    }

    console.log(`🎉 DOWNLOAD COMPLETATO: ${allOrders.length} ordini totali scaricati`);
    
    return allOrders;

  } catch (error) {
    console.error('❌ ERRORE DOWNLOAD MASSIVO:', error);
    throw error;
  }
};

// Funzione per scaricare ordini per status separati (più robusta)
export const downloadOrdersByStatus = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  
  // Lista completa di tutti i possibili status per essere sicuri di non perdere ordini
  const statuses = [
    { status: 'any', description: 'tutti gli ordini (completo)' },
    { status: 'open', description: 'ordini aperti' },
    { status: 'closed', description: 'ordini chiusi/archiviati' },
    { status: 'cancelled', description: 'ordini cancellati' },
    { status: 'refunded', description: 'ordini rimborsati' },
    { status: 'pending', description: 'ordini in attesa' },
    { status: 'authorized', description: 'ordini autorizzati' },
    { status: 'partially_paid', description: 'ordini parzialmente pagati' },
    { status: 'paid', description: 'ordini pagati' },
    { status: 'partially_refunded', description: 'ordini parzialmente rimborsati' },
    { status: 'voided', description: 'ordini annullati' }
  ];

  console.log('🚀 INIZIO DOWNLOAD PER STATUS...');

  for (let statusIndex = 0; statusIndex < statuses.length; statusIndex++) {
    const { status, description } = statuses[statusIndex];
    
    if (abortController?.signal?.aborted) {
      throw new Error('Download annullato dall\'utente');
    }

    console.log(`🔄 Scaricamento ${description}...`);
    
    if (onProgress) {
      onProgress({
        currentPage: statusIndex + 1,
        totalPages: statuses.length,
        ordersDownloaded: allOrders.length,
        currentStatus: `Scaricamento ${description}...`
      });
    }

    try {
      let pageCount = 0;
      const maxPages = 200; // Limite per status
      let nextPageInfo = null;
      
      while (pageCount < maxPages) {
        pageCount++;
        
        if (onProgress) {
          onProgress({
            currentPage: pageCount,
            totalPages: maxPages,
            ordersDownloaded: allOrders.length,
            currentStatus: `Scaricamento ${description} (pagina ${pageCount})...`
          });
        }

        const response = await fetchShopifyOrders({
          limit: 250,
          status: status,
          pageInfo: nextPageInfo
        });

        if (!response.success || !response.orders || response.orders.length === 0) {
          console.log(`✅ ${description}: nessun ordine trovato`);
          break;
        }

        // Aggiungi ordini evitando duplicati
        let newOrdersCount = 0;
        for (const order of response.orders) {
          if (order.id && !uniqueOrderIds.has(order.id.toString())) {
            allOrders.push(order);
            uniqueOrderIds.add(order.id.toString());
            newOrdersCount++;
          }
        }

        console.log(`✅ ${description} pagina ${pageCount}: ${newOrdersCount} ordini nuovi`);

        // Aggiorna nextPageInfo per la prossima pagina
        nextPageInfo = response.pagination?.nextPageInfo;
        
        if (!nextPageInfo) {
          break;
        }

        // Pausa tra le pagine
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Pausa tra i status
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Errore per status ${status}:`, error);
      // Continua con il prossimo status
    }
  }

  console.log(`✅ DOWNLOAD PER STATUS COMPLETATO: ${allOrders.length} ordini unici totali`);
  return allOrders;
};

// Funzione specifica per scaricare SOLO gli ordini archiviati/chiusi
export const downloadArchivedOrders = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  
  // Focus sugli ordini archiviati che potrebbero essere mancanti
  const archivedStatuses = [
    { status: 'closed', description: 'ordini chiusi/archiviati' },
    { status: 'cancelled', description: 'ordini cancellati' },
    { status: 'refunded', description: 'ordini rimborsati' },
    { status: 'voided', description: 'ordini annullati' }
  ];

  console.log('📦 INIZIO DOWNLOAD ORDINI ARCHIVIATI...');

  for (let statusIndex = 0; statusIndex < archivedStatuses.length; statusIndex++) {
    const { status, description } = archivedStatuses[statusIndex];
    
    if (abortController?.signal?.aborted) {
      throw new Error('Download annullato dall\'utente');
    }

    console.log(`🔄 Scaricamento ${description}...`);
    
    if (onProgress) {
      onProgress({
        currentPage: statusIndex + 1,
        totalPages: archivedStatuses.length,
        ordersDownloaded: allOrders.length,
        currentStatus: `Scaricamento ${description}...`
      });
    }

    try {
      let pageCount = 0;
      const maxPages = 200; // Limite per status
      let nextPageInfo = null;
      
      while (pageCount < maxPages) {
        pageCount++;
        
        if (onProgress) {
          onProgress({
            currentPage: pageCount,
            totalPages: maxPages,
            ordersDownloaded: allOrders.length,
            currentStatus: `Scaricamento ${description} (pagina ${pageCount})...`
          });
        }

        const response = await fetchShopifyOrders({
          limit: 250,
          status: status,
          pageInfo: nextPageInfo
        });

        if (!response.success || !response.orders || response.orders.length === 0) {
          console.log(`✅ ${description}: nessun ordine trovato`);
          break;
        }

        // Aggiungi ordini evitando duplicati
        let newOrdersCount = 0;
        for (const order of response.orders) {
          if (order.id && !uniqueOrderIds.has(order.id.toString())) {
            allOrders.push(order);
            uniqueOrderIds.add(order.id.toString());
            newOrdersCount++;
          }
        }

        console.log(`✅ ${description} pagina ${pageCount}: ${newOrdersCount} ordini nuovi`);

        // Aggiorna nextPageInfo per la prossima pagina
        nextPageInfo = response.pagination?.nextPageInfo;
        
        if (!nextPageInfo) {
          break;
        }

        // Pausa tra le pagine
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Pausa tra i status
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Errore per status ${status}:`, error);
      // Continua con il prossimo status
    }
  }

  console.log(`✅ DOWNLOAD ORDINI ARCHIVIATI COMPLETATO: ${allOrders.length} ordini unici totali`);
  return allOrders;
};

// Funzione di test per verificare la paginazione
export const testShopifyPagination = async () => {
  console.log('🧪 TEST PAGINAZIONE SHOPIFY...');
  
  try {
    const response = await fetchShopifyOrders({
      limit: 250,
      status: 'any',
      pageInfo: null
    });

    console.log('📊 Risposta prima pagina:', {
      success: response.success,
      ordersCount: response.orders?.length || 0,
      hasNext: response.pagination?.hasNext,
      nextPageInfo: response.pagination?.nextPageInfo ? 'presente' : 'assente'
    });

    if (response.pagination?.nextPageInfo) {
      console.log('🔄 Testando seconda pagina...');
      
      const response2 = await fetchShopifyOrders({
        limit: 250,
        status: 'any',
        pageInfo: response.pagination.nextPageInfo
      });

      console.log('📊 Risposta seconda pagina:', {
        success: response2.success,
        ordersCount: response2.orders?.length || 0,
        hasNext: response2.pagination?.hasNext,
        nextPageInfo: response2.pagination?.nextPageInfo ? 'presente' : 'assente'
      });
    }

    return response;
  } catch (error) {
    console.error('❌ Errore test paginazione:', error);
    throw error;
  }
};