// Funzioni per gestire la sincronizzazione con Shopify
export const getShopifyCredentials = () => {
  const credentials = localStorage.getItem('shopify_config');
  if (!credentials) {
    throw new Error('Credenziali Shopify non configurate. Vai nelle Impostazioni per configurarle.');
  }
  return JSON.parse(credentials);
};

export const convertShopifyOrder = (shopifyOrder) => {
  // Estrai informazioni spedizione
  const shippingLine = shopifyOrder.shipping_lines?.[0] || {};
  const shippingAddress = shopifyOrder.shipping_address || {};
  const billingAddress = shopifyOrder.billing_address || {};
  
  // Calcola subtotale dai line items
  const subtotal = (shopifyOrder.line_items || []).reduce((sum, item) => {
    return sum + (parseFloat(item.price || 0) * (item.quantity || 0));
  }, 0);
  
  // Calcola sconto totale
  const totalDiscount = parseFloat(shopifyOrder.total_discounts || 0);
  
  // Calcola tasse
  const totalTax = parseFloat(shopifyOrder.total_tax || 0);
  
  // Costo spedizione
  const shippingCost = parseFloat(
    shopifyOrder.total_shipping_price_set?.shop_money?.amount || 
    shippingLine.price || 
    0
  );
  
  return {
    // ID e numero ordine (mantieni entrambi i formati per compatibilità)
    id: shopifyOrder.id.toString(),
    order_number: shopifyOrder.order_number || shopifyOrder.name,
    orderNumber: shopifyOrder.order_number || shopifyOrder.name,
    name: shopifyOrder.name,
    
    // Cliente
    customer: shopifyOrder.customer || null,
    customerName: shopifyOrder.customer ? 
      `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim() : 
      'Cliente sconosciuto',
    customerEmail: shopifyOrder.customer?.email || shopifyOrder.email || '',
    email: shopifyOrder.email || shopifyOrder.customer?.email || '',
    phone: shopifyOrder.phone || shopifyOrder.customer?.phone || '',
    
    // Prezzi e totali (mantieni entrambi i formati)
    total_price: parseFloat(shopifyOrder.total_price || 0),
    totalPrice: parseFloat(shopifyOrder.total_price || 0),
    subtotal_price: parseFloat(shopifyOrder.subtotal_price || subtotal),
    subtotal: parseFloat(shopifyOrder.subtotal_price || subtotal),
    currency: shopifyOrder.currency || 'EUR',
    
    // Spedizione
    shipping_cost: shippingCost,
    shippingPrice: shippingCost,
    shippingType: shippingLine.title || 'Standard',
    shipping_method: shippingLine.title || shippingLine.code || 'Standard',
    is_free_shipping: shippingCost === 0,
    is_shipped: shopifyOrder.fulfillment_status === 'fulfilled',
    
    // Sconti
    discount_amount: totalDiscount,
    total_discounts: totalDiscount,
    discount_codes: shopifyOrder.discount_codes || [],
    discount_code: shopifyOrder.discount_codes?.[0]?.code || '',
    
    // Tasse
    taxes: totalTax,
    total_tax: totalTax,
    tax_lines: shopifyOrder.tax_lines || [],
    
    // Status
    financial_status: shopifyOrder.financial_status || 'pending',
    financialStatus: shopifyOrder.financial_status || 'pending',
    status: shopifyOrder.financial_status || 'pending',
    fulfillment_status: shopifyOrder.fulfillment_status || null,
    fulfillmentStatus: shopifyOrder.fulfillment_status || null,
    
    // Date
    created_at: shopifyOrder.created_at,
    createdAt: shopifyOrder.created_at,
    updated_at: shopifyOrder.updated_at,
    updatedAt: shopifyOrder.updated_at,
    processed_at: shopifyOrder.processed_at,
    closed_at: shopifyOrder.closed_at,
    cancelled_at: shopifyOrder.cancelled_at,
    
    // Indirizzi
    shipping_address: shippingAddress,
    shipping: {
      name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim(),
      address: `${shippingAddress.address1 || ''} ${shippingAddress.address2 || ''}`.trim(),
      city: shippingAddress.city || '',
      zip: shippingAddress.zip || '',
      province: shippingAddress.province || '',
      country: shippingAddress.country || '',
      phone: shippingAddress.phone || ''
    },
    billing_address: billingAddress,
    billing: {
      name: `${billingAddress.first_name || ''} ${billingAddress.last_name || ''}`.trim(),
      address: `${billingAddress.address1 || ''} ${billingAddress.address2 || ''}`.trim(),
      city: billingAddress.city || '',
      zip: billingAddress.zip || '',
      province: billingAddress.province || '',
      country: billingAddress.country || '',
      phone: billingAddress.phone || ''
    },
    
    // Prodotti - formato completo
    line_items: (shopifyOrder.line_items || []).map(item => ({
      id: item.id?.toString() || '',
      product_id: item.product_id?.toString() || '',
      variant_id: item.variant_id?.toString() || '',
      sku: item.sku || '',
      name: item.name || item.title || '',
      title: item.title || item.name || '',
      quantity: item.quantity || 0,
      price: parseFloat(item.price || 0),
      total: parseFloat(item.price || 0) * (item.quantity || 0),
      vendor: item.vendor || '',
      requires_shipping: item.requires_shipping !== false,
      taxable: item.taxable !== false,
      fulfillment_status: item.fulfillment_status || null,
      compare_at_price: parseFloat(item.compare_at_price || 0),
      discount: parseFloat(item.total_discount || 0),
      variant_title: item.variant_title || '',
      product_exists: item.product_exists !== false,
      grams: item.grams || 0
    })),
    
    // Prodotti - formato alternativo per compatibilità
    products: (shopifyOrder.line_items || []).map(item => ({
      id: item.id?.toString() || '',
      product_id: item.product_id?.toString() || '',
      variant_id: item.variant_id?.toString() || '',
      sku: item.sku || '',
      name: item.name || item.title || '',
      title: item.title || item.name || '',
      quantity: item.quantity || 0,
      price: parseFloat(item.price || 0),
      total: parseFloat(item.price || 0) * (item.quantity || 0),
      vendor: item.vendor || '',
      requires_shipping: item.requires_shipping !== false,
      taxable: item.taxable !== false,
      fulfillment_status: item.fulfillment_status || null,
      compare_at_price: parseFloat(item.compare_at_price || 0),
      discount: parseFloat(item.total_discount || 0),
      variant_title: item.variant_title || '',
      grams: item.grams || 0
    })),
    
    // Items - formato legacy
    items: (shopifyOrder.line_items || []).map(item => ({
      id: item.id?.toString() || '',
      sku: item.sku || '',
      name: item.name || item.title || '',
      quantity: item.quantity || 0,
      price: parseFloat(item.price || 0),
      total: parseFloat(item.price || 0) * (item.quantity || 0)
    })),
    
    // Metadati aggiuntivi
    tags: shopifyOrder.tags || '',
    note: shopifyOrder.note || '',
    note_attributes: shopifyOrder.note_attributes || [],
    source_name: shopifyOrder.source_name || 'web',
    source: shopifyOrder.source_name || 'Shopify',
    gateway: shopifyOrder.gateway || '',
    payment_method: shopifyOrder.gateway || shopifyOrder.payment_gateway_names?.[0] || '',
    payment_gateway_names: shopifyOrder.payment_gateway_names || [],
    referring_site: shopifyOrder.referring_site || '',
    landing_site: shopifyOrder.landing_site || '',
    
    // Fulfillment info
    fulfillments: shopifyOrder.fulfillments || [],
    refunds: shopifyOrder.refunds || [],
    
    // Tracking
    tracking_number: shopifyOrder.fulfillments?.[0]?.tracking_number || '',
    tracking_company: shopifyOrder.fulfillments?.[0]?.tracking_company || '',
    tracking_url: shopifyOrder.fulfillments?.[0]?.tracking_url || ''
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

// Funzione per scaricare TUTTI gli ordini con tutti i possibili status
export const downloadAllOrdersComplete = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  
  // Lista completa di TUTTI i possibili status per essere sicuri di non perdere ordini
  const allStatuses = [
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
    { status: 'voided', description: 'ordini annullati' },
    { status: 'fulfilled', description: 'ordini evasi' },
    { status: 'unfulfilled', description: 'ordini non evasi' },
    { status: 'partial', description: 'ordini parzialmente evasi' }
  ];

  console.log('🚀 INIZIO DOWNLOAD COMPLETO TUTTI GLI ORDINI...');

  for (let statusIndex = 0; statusIndex < allStatuses.length; statusIndex++) {
    const { status, description } = allStatuses[statusIndex];
    
    if (abortController?.signal?.aborted) {
      throw new Error('Download annullato dall\'utente');
    }

    console.log(`🔄 Scaricamento ${description}...`);
    
    if (onProgress) {
      onProgress({
        currentPage: statusIndex + 1,
        totalPages: allStatuses.length,
        ordersDownloaded: allOrders.length,
        currentStatus: `Scaricamento ${description}...`
      });
    }

    try {
      let pageCount = 0;
      const maxPages = 100; // Limite per status
      let nextPageInfo = null;
      let statusOrdersCount = 0;
      
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
            statusOrdersCount++;
          }
        }

        console.log(`✅ ${description} pagina ${pageCount}: ${newOrdersCount} ordini nuovi (totale status: ${statusOrdersCount})`);

        // Aggiorna nextPageInfo per la prossima pagina
        nextPageInfo = response.pagination?.nextPageInfo;
        
        if (!nextPageInfo) {
          console.log(`✅ ${description}: fine paginazione dopo ${pageCount} pagine (${statusOrdersCount} ordini totali)`);
          break;
        }

        // Pausa tra le pagine
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`📊 ${description}: ${statusOrdersCount} ordini scaricati`);

      // Pausa tra i status
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Errore per status ${status}:`, error);
      // Continua con il prossimo status
    }
  }

  console.log(`🎉 DOWNLOAD COMPLETO TERMINATO: ${allOrders.length} ordini unici totali`);
  return allOrders;
};

// Funzione per scaricare TUTTI gli ordini con un approccio più semplice e diretto
export const downloadAllOrdersSimple = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  let pageCount = 0;
  const maxPages = 50; // Limite di sicurezza
  let nextPageInfo = null;
  
  console.log('🚀 INIZIO DOWNLOAD SEMPLICE TUTTI GLI ORDINI...');
  console.log('📋 Usando status "any" per scaricare TUTTI gli ordini disponibili');

  try {
    while (pageCount < maxPages) {
      if (abortController?.signal?.aborted) {
        throw new Error('Download annullato dall\'utente');
      }

      pageCount++;
      
      if (onProgress) {
        onProgress({
          currentPage: pageCount,
          totalPages: maxPages,
          ordersDownloaded: allOrders.length,
          currentStatus: `Scaricamento pagina ${pageCount} (status: any)...`
        });
      }

      console.log(`📄 Scaricamento pagina ${pageCount}...`);

      const response = await fetchShopifyOrders({
        limit: 250,
        status: 'any',
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

      console.log(`✅ Pagina ${pageCount}: ${newOrdersCount} ordini nuovi, ${orders.length - newOrdersCount} duplicati saltati (totale: ${allOrders.length})`);

      if (onProgress) {
        onProgress({
          currentPage: pageCount,
          totalPages: maxPages,
          ordersDownloaded: allOrders.length,
          currentStatus: `Scaricati ${allOrders.length} ordini unici (pagina ${pageCount})...`
        });
      }

      // Aggiorna nextPageInfo per la prossima pagina
      nextPageInfo = response.pagination?.nextPageInfo;
      
      if (!nextPageInfo) {
        console.log(`✅ Pagina ${pageCount} - Ultima pagina raggiunta`);
        break;
      }

      // Pausa tra le pagine
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`🎉 DOWNLOAD SEMPLICE COMPLETATO: ${allOrders.length} ordini unici totali`);
    return allOrders;

  } catch (error) {
    console.error('❌ ERRORE DOWNLOAD SEMPLICE:', error);
    throw error;
  }
};

// Funzione per scaricare TUTTI gli ordini usando since_id (alternativa al pageInfo)
export const downloadAllOrdersWithSinceId = async (onProgress = null, abortController = null) => {
  const allOrders = [];
  const uniqueOrderIds = new Set();
  let pageCount = 0;
  const maxPages = 100; // Limite di sicurezza
  let lastOrderId = null;
  
  console.log('🚀 INIZIO DOWNLOAD CON SINCE_ID...');
  console.log('📋 Usando since_id per paginazione (alternativa al pageInfo)');

  try {
    while (pageCount < maxPages) {
      if (abortController?.signal?.aborted) {
        throw new Error('Download annullato dall\'utente');
      }

      pageCount++;
      
      if (onProgress) {
        onProgress({
          currentPage: pageCount,
          totalPages: maxPages,
          ordersDownloaded: allOrders.length,
          currentStatus: `Scaricamento pagina ${pageCount} (since_id: ${lastOrderId || 'nessuno'})...`
        });
      }

      console.log(`📄 Scaricamento pagina ${pageCount} (since_id: ${lastOrderId || 'nessuno'})...`);

      // Costruisci i parametri per la chiamata
      const params = {
        limit: 250,
        status: 'any'
      };
      
      if (lastOrderId) {
        params.since_id = lastOrderId;
      }

      const response = await fetchShopifyOrders(params);

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

      // Aggiorna lastOrderId con l'ID dell'ultimo ordine della pagina
      if (orders.length > 0) {
        lastOrderId = orders[orders.length - 1].id;
      }

      console.log(`✅ Pagina ${pageCount}: ${newOrdersCount} ordini nuovi, ${orders.length - newOrdersCount} duplicati saltati (totale: ${allOrders.length})`);
      console.log(`🔍 Last Order ID: ${lastOrderId}`);

      if (onProgress) {
        onProgress({
          currentPage: pageCount,
          totalPages: maxPages,
          ordersDownloaded: allOrders.length,
          currentStatus: `Scaricati ${allOrders.length} ordini unici (pagina ${pageCount})...`
        });
      }

      // Non fermarci se abbiamo meno di 250 ordini - potrebbero esserci più pagine
      // Continua fino a quando non riceviamo 0 ordini
      if (orders.length === 0) {
        console.log(`✅ Pagina ${pageCount} - Nessun ordine, fine download`);
        break;
      }

      // Pausa tra le pagine
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`🎉 DOWNLOAD CON SINCE_ID COMPLETATO: ${allOrders.length} ordini unici totali`);
    return allOrders;

  } catch (error) {
    console.error('❌ ERRORE DOWNLOAD CON SINCE_ID:', error);
    throw error;
  }
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

// Funzione di test per verificare la paginazione con status "any"
export const testPaginationAny = async () => {
  console.log('🔍 TEST PAGINAZIONE CON STATUS ANY...');
  
  try {
    let pageCount = 0;
    let totalOrders = 0;
    let nextPageInfo = null;
    const maxPages = 5; // Limite per test
    
    while (pageCount < maxPages) {
      pageCount++;
      
      console.log(`\n📄 === PAGINA ${pageCount} ===`);
      
      const response = await fetchShopifyOrders({
        limit: 50,
        status: 'any',
        pageInfo: nextPageInfo
      });

      if (!response.success) {
        console.error(`❌ Errore pagina ${pageCount}:`, response);
        break;
      }

      const ordersCount = response.orders?.length || 0;
      totalOrders += ordersCount;
      
      console.log(`✅ Pagina ${pageCount}: ${ordersCount} ordini (totale: ${totalOrders})`);
      console.log(`📊 hasNext: ${response.pagination?.hasNext}`);
      console.log(`📊 nextPageInfo: ${response.pagination?.nextPageInfo ? 'presente' : 'assente'}`);
      
      if (response.pagination?.nextPageInfo) {
        console.log(`🔍 nextPageInfo value: ${response.pagination.nextPageInfo}`);
        nextPageInfo = response.pagination.nextPageInfo;
      } else {
        console.log(`✅ Fine paginazione dopo ${pageCount} pagine`);
        break;
      }
      
      // Pausa tra le pagine
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎯 RISULTATO FINALE: ${totalOrders} ordini in ${pageCount} pagine`);
    return { totalOrders, pageCount, success: true };
    
  } catch (error) {
    console.error('❌ Errore test paginazione:', error);
    throw error;
  }
};

// Funzione di test per verificare la paginazione con since_id
export const testPaginationSinceId = async () => {
  console.log('🔍 TEST PAGINAZIONE CON SINCE_ID...');
  
  try {
    let pageCount = 0;
    let totalOrders = 0;
    let lastOrderId = null;
    const maxPages = 5; // Limite per test
    
    while (pageCount < maxPages) {
      pageCount++;
      
      console.log(`\n📄 === PAGINA ${pageCount} ===`);
      
      const params = {
        limit: 50,
        status: 'any'
      };
      
      if (lastOrderId) {
        params.since_id = lastOrderId;
      }
      
      console.log(`🔍 Parametri: ${JSON.stringify(params)}`);
      
      const response = await fetchShopifyOrders(params);

      if (!response.success) {
        console.error(`❌ Errore pagina ${pageCount}:`, response);
        break;
      }

      const ordersCount = response.orders?.length || 0;
      totalOrders += ordersCount;
      
      console.log(`✅ Pagina ${pageCount}: ${ordersCount} ordini (totale: ${totalOrders})`);
      
      if (ordersCount > 0) {
        const firstOrderId = response.orders[0].id;
        const lastOrderIdNew = response.orders[ordersCount - 1].id;
        console.log(`🔍 Primo Order ID: ${firstOrderId}`);
        console.log(`🔍 Ultimo Order ID: ${lastOrderIdNew}`);
        lastOrderId = lastOrderIdNew;
      } else {
        console.log(`✅ Nessun ordine, fine paginazione`);
        break;
      }
      
      // Pausa tra le pagine
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎯 RISULTATO FINALE: ${totalOrders} ordini in ${pageCount} pagine`);
    return { totalOrders, pageCount, success: true };
    
  } catch (error) {
    console.error('❌ Errore test paginazione since_id:', error);
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