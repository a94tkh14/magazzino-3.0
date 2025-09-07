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

// Funzione di test per contare TUTTI gli ordini disponibili
export const testAllOrdersCount = async () => {
  console.log('🔢 TEST CONTO TUTTI GLI ORDINI...');
  
  try {
    let totalOrders = 0;
    let pageCount = 0;
    let nextPageInfo = null;
    const maxPages = 50; // Limite di sicurezza per il test
    
    while (pageCount < maxPages) {
      pageCount++;
      
      console.log(`📄 Test pagina ${pageCount}...`);
      
      const response = await fetchShopifyOrders({
        limit: 250,
        status: 'any',
        pageInfo: nextPageInfo
      });

      if (!response.success || !response.orders) {
        console.log(`❌ Errore pagina ${pageCount}:`, response);
        break;
      }

      const ordersCount = response.orders.length;
      totalOrders += ordersCount;
      
      console.log(`✅ Pagina ${pageCount}: ${ordersCount} ordini (totale: ${totalOrders})`);
      
      nextPageInfo = response.pagination?.nextPageInfo;
      
      if (!nextPageInfo) {
        console.log(`✅ Fine paginazione dopo ${pageCount} pagine`);
        break;
      }
      
      // Pausa tra le pagine
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  console.log(`🎯 TOTALE ORDINI DISPONIBILI: ${totalOrders}`);
  return { totalOrders, pageCount };
  
} catch (error) {
  console.error('❌ Errore test conteggio:', error);
  throw error;
}
};

// Funzione di test per verificare ordini archiviati specifici
export const testArchivedOrders = async () => {
  console.log('📦 TEST ORDINI ARCHIVIATI...');
  
  const archivedStatuses = ['closed', 'cancelled', 'refunded', 'voided'];
  const results = {};
  
  for (const status of archivedStatuses) {
    try {
      console.log(`🔍 Testando status: ${status}`);
      
      const response = await fetchShopifyOrders({
        limit: 10, // Solo 10 per test
        status: status,
        pageInfo: null
      });

      if (response.success && response.orders) {
        results[status] = {
          count: response.orders.length,
          hasNext: response.pagination?.hasNext,
          orders: response.orders.map(o => ({ id: o.id, order_number: o.order_number, financial_status: o.financial_status }))
        };
        console.log(`✅ Status ${status}: ${response.orders.length} ordini trovati`);
      } else {
        results[status] = { count: 0, error: 'Nessun ordine trovato' };
        console.log(`❌ Status ${status}: Nessun ordine trovato`);
      }
      
      // Pausa tra i test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Errore test status ${status}:`, error);
      results[status] = { count: 0, error: error.message };
    }
  }
  
  console.log('📊 RISULTATI TEST ORDINI ARCHIVIATI:', results);
  return results;
};

// Funzione di debug dettagliata per capire dove si ferma
export const debugPaginationDetailed = async () => {
  console.log('🔍 DEBUG PAGINAZIONE DETTAGLIATA...');
  
  try {
    let totalOrders = 0;
    let pageCount = 0;
    let nextPageInfo = null;
    const maxPages = 20; // Limite per debug
    const results = [];
    
    while (pageCount < maxPages) {
      pageCount++;
      
      console.log(`\n📄 === PAGINA ${pageCount} ===`);
      
      const response = await fetchShopifyOrders({
        limit: 250,
        status: 'any',
        pageInfo: nextPageInfo
      });

      if (!response.success) {
        console.error(`❌ Errore pagina ${pageCount}:`, response);
        break;
      }

      const ordersCount = response.orders?.length || 0;
      totalOrders += ordersCount;
      
      const pageResult = {
        page: pageCount,
        ordersCount,
        totalOrders,
        hasNext: response.pagination?.hasNext,
        nextPageInfo: response.pagination?.nextPageInfo ? 'presente' : 'assente',
        firstOrderId: response.orders?.[0]?.id,
        lastOrderId: response.orders?.[response.orders.length - 1]?.id,
        firstOrderNumber: response.orders?.[0]?.order_number,
        lastOrderNumber: response.orders?.[response.orders.length - 1]?.order_number
      };
      
      results.push(pageResult);
      
      console.log(`✅ Pagina ${pageCount}: ${ordersCount} ordini (totale: ${totalOrders})`);
      console.log(`📊 hasNext: ${pageResult.hasNext}, nextPageInfo: ${pageResult.nextPageInfo}`);
      console.log(`🆔 Primo ordine: ${pageResult.firstOrderId} (#${pageResult.firstOrderNumber})`);
      console.log(`🆔 Ultimo ordine: ${pageResult.lastOrderId} (#${pageResult.lastOrderNumber})`);
      
      nextPageInfo = response.pagination?.nextPageInfo;
      
      if (!nextPageInfo) {
        console.log(`✅ Fine paginazione dopo ${pageCount} pagine`);
        break;
      }
      
      // Pausa tra le pagine
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  console.log(`\n🎯 RISULTATO FINALE: ${totalOrders} ordini in ${pageCount} pagine`);
  console.log('📊 DETTAGLI PAGINE:', results);
  
  return { totalOrders, pageCount, results };
  
} catch (error) {
  console.error('❌ Errore debug paginazione:', error);
  throw error;
}
};

// Funzione di test per verificare il pageInfo
export const testPageInfo = async () => {
  console.log('🔍 TEST PAGEINFO...');
  
  try {
    // Prima pagina
    console.log('📄 Test prima pagina...');
    const response1 = await fetchShopifyOrders({
      limit: 10,
      status: 'closed',
      pageInfo: null
    });

    if (!response1.success) {
      throw new Error('Errore prima pagina');
    }

    console.log('✅ Prima pagina OK:', {
      ordersCount: response1.orders?.length || 0,
      hasNext: response1.pagination?.hasNext,
      nextPageInfo: response1.pagination?.nextPageInfo
    });

    if (response1.pagination?.nextPageInfo) {
      console.log('📄 Test seconda pagina con pageInfo...');
      console.log('🔍 pageInfo value:', response1.pagination.nextPageInfo);
      console.log('🔍 pageInfo type:', typeof response1.pagination.nextPageInfo);
      console.log('🔍 pageInfo starts with http:', response1.pagination.nextPageInfo.startsWith('http'));
      
      const response2 = await fetchShopifyOrders({
        limit: 10,
        status: 'closed',
        pageInfo: response1.pagination.nextPageInfo
      });

      if (response2.success) {
        console.log('✅ Seconda pagina OK:', {
          ordersCount: response2.orders?.length || 0,
          hasNext: response2.pagination?.hasNext,
          nextPageInfo: response2.pagination?.nextPageInfo
        });
      } else {
        console.error('❌ Errore seconda pagina:', response2);
      }
    } else {
      console.log('ℹ️ Nessuna seconda pagina disponibile');
    }

    return { success: true, message: 'Test pageInfo completato' };
    
  } catch (error) {
    console.error('❌ Errore test pageInfo:', error);
    throw error;
  }
};

// Funzione per scaricare senza filtri di status (approccio alternativo)
export const downloadAllOrdersNoStatus = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  let pageCount = 0;
  const maxPages = 1000;
  const ordersPerPage = 250;
  let nextPageInfo = null;
  
  console.log('🚀 INIZIO DOWNLOAD SENZA FILTRI STATUS...');
  
  try {
    while (pageCount < maxPages) {
      if (abortController?.signal?.aborted) {
        throw new Error('Download annullato dall\'utente');
      }

      pageCount++;
      
      if (onProgress) {
        onProgress({
          currentPage: pageCount,
          totalPages: '?',
          ordersDownloaded: allOrders.length,
          currentStatus: `Scaricamento pagina ${pageCount} (senza filtri)...`
        });
      }

      console.log(`📄 Scaricamento pagina ${pageCount} (senza filtri)...`);

      try {
        const response = await fetchShopifyOrders({
          limit: ordersPerPage,
          status: null, // Non specificare status
          pageInfo: nextPageInfo
        });

        if (!response.success) {
          console.error(`❌ Errore pagina ${pageCount}:`, response);
          throw new Error(response.error || 'Errore nella risposta API');
        }

        const orders = response.orders || [];
        
        if (orders.length === 0) {
          console.log(`✅ Pagina ${pageCount} - Nessun ordine, fine download`);
          break;
        }

        let newOrdersCount = 0;
        for (const order of orders) {
          if (order.id && !uniqueOrderIds.has(order.id.toString())) {
            allOrders.push(order);
            uniqueOrderIds.add(order.id.toString());
            newOrdersCount++;
          }
        }

        console.log(`✅ Pagina ${pageCount}: ${newOrdersCount} ordini nuovi, ${orders.length - newOrdersCount} duplicati saltati`);

        if (onProgress) {
          onProgress({
            currentPage: pageCount,
            totalPages: '?',
            ordersDownloaded: allOrders.length,
            currentStatus: `Scaricati ${allOrders.length} ordini unici (pagina ${pageCount})...`
          });
        }

        nextPageInfo = response.pagination?.nextPageInfo;
        
        if (!nextPageInfo) {
          console.log(`✅ Pagina ${pageCount} - Ultima pagina raggiunta`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        console.error(`❌ Errore pagina ${pageCount}:`, error);
        
        if (error.message.includes('fetch') || error.message.includes('network')) {
          console.log(`🔄 Retry pagina ${pageCount} dopo 5 secondi...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          pageCount--;
          continue;
        }
        
        throw error;
      }
    }

    console.log(`🎉 DOWNLOAD SENZA FILTRI COMPLETATO: ${allOrders.length} ordini totali scaricati`);
    
    return allOrders;

  } catch (error) {
    console.error('❌ ERRORE DOWNLOAD SENZA FILTRI:', error);
    throw error;
  }
};

// Funzione per scaricare TUTTI gli ordini senza filtri (forzata)
export const downloadAllOrdersForced = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  let pageCount = 0;
  const maxPages = 1000; // Limite di sicurezza
  const ordersPerPage = 250;
  let nextPageInfo = null;
  
  console.log('🚀 INIZIO DOWNLOAD FORZATO TUTTI GLI ORDINI...');
  
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
          currentStatus: `Scaricamento pagina ${pageCount} (forzato)...`
        });
      }

      console.log(`📄 Scaricamento pagina ${pageCount} (forzato)...`);

      try {
        const response = await fetchShopifyOrders({
          limit: ordersPerPage,
          status: 'any', // Forza 'any' per tutti gli ordini
          pageInfo: nextPageInfo
        });

        if (!response.success) {
          console.error(`❌ Errore pagina ${pageCount}:`, response);
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

    console.log(`🎉 DOWNLOAD FORZATO COMPLETATO: ${allOrders.length} ordini totali scaricati`);
    
    return allOrders;

  } catch (error) {
    console.error('❌ ERRORE DOWNLOAD FORZATO:', error);
    throw error;
  }
};