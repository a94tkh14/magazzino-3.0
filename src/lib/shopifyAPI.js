// Funzione per ottenere le credenziali Shopify salvate
export const getShopifyCredentials = () => {
  const saved = localStorage.getItem('shopify_config');
  if (!saved) {
    throw new Error('Credenziali Shopify non configurate. Vai su Impostazioni per configurarle.');
  }
  return JSON.parse(saved);
};

// Funzione per recuperare tutti gli ordini da Shopify tramite Netlify Functions, gestendo la paginazione
export const fetchShopifyOrders = async (limit = 50, status = 'any', onProgress, daysBack = null, fulfillmentStatus = null, financialStatus = null) => {
  try {
    const credentials = getShopifyCredentials();
    let allOrders = [];
    let pageInfo = null;
    let keepGoing = true;
    let page = 1;
    
    // Ottimizzazione: usa un limit più alto per ridurre il numero di chiamate
    const optimizedLimit = Math.min(limit, 250); // Shopify supporta fino a 250 per pagina
    
    console.log(`🔄 Inizio scaricamento ordini Shopify`);
    console.log(`📊 Parametri: limit=${limit}, optimizedLimit=${optimizedLimit}, status=${status}, daysBack=${daysBack}`);
    console.log(`🔧 fulfillmentStatus=${fulfillmentStatus}, financialStatus=${financialStatus}`);

    // Se il limite è molto alto, prova prima il metodo di chunking
    if (limit > 1000) {
      console.log('🚀 Tentativo di scaricamento con metodo chunking per ordini molto grandi...');
      try {
        const response = await fetch('/.netlify/functions/shopify-sync-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopDomain: credentials.shopDomain,
            accessToken: credentials.accessToken,
            apiVersion: credentials.apiVersion || '2024-01',
            limit: limit,
            status: status,
            daysBack: daysBack,
            fulfillmentStatus: fulfillmentStatus,
            financialStatus: financialStatus,
            useChunking: true // Abilita il chunking
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Errore API Shopify: ${errorData || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.orders) {
          console.log(`✅ Chunking completato con successo: ${data.orders.length} ordini`);
          if (onProgress) onProgress(data.orders.length, 1);
          return data.orders;
        } else {
          console.log('⚠️ Chunking fallito, uso metodo standard');
        }
      } catch (chunkError) {
        console.log('⚠️ Errore nel chunking, uso metodo standard:', chunkError.message);
      }
    }

    // Metodo standard con paginazione
    console.log('📄 Utilizzo metodo standard con paginazione...');
    
    while (keepGoing) {
      console.log(`\n📄 === PAGINA ${page} ===`);
      console.log(`📄 pageInfo: ${pageInfo || 'null'}`);
      console.log(`📄 keepGoing: ${keepGoing}`);
      console.log(`📄 allOrders.length: ${allOrders.length}`);
      console.log(`📄 limit richiesto: ${limit}`);
      
      // Chiamata tramite Netlify Functions - usa la nuova funzione dedicata
      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain: credentials.shopDomain,
          accessToken: credentials.accessToken,
          apiVersion: credentials.apiVersion || '2024-01',
          limit: optimizedLimit,
          status: status,
          pageInfo: pageInfo,
          daysBack: daysBack,
          fulfillmentStatus: fulfillmentStatus,
          financialStatus: financialStatus,
          useChunking: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Errore API Shopify: ${errorData || response.statusText}`);
      }

      const data = await response.json();
      console.log(`📡 Risposta ricevuta:`, {
        success: data.success,
        ordersLength: data.orders?.length || 0,
        pagination: data.pagination,
        linkHeader: data.linkHeader
      });
      
      if (data.success && data.orders && data.orders.length > 0) {
        const existingIds = new Set(allOrders.map(o => o.id));
        const newOrders = data.orders.filter(order => !existingIds.has(order.id));
        allOrders = allOrders.concat(newOrders);
        
        if (onProgress) onProgress(allOrders.length, page);
        console.log(`[SYNC] Scaricati ${allOrders.length} ordini totali dopo pagina ${page}`);
        console.log(`📊 Ordini in questa pagina: ${data.orders.length}/${optimizedLimit}`);
        console.log(`📈 Totale ordini scaricati finora: ${allOrders.length}`);

        // Controlla se abbiamo raggiunto il limite richiesto
        if (limit && allOrders.length >= limit) {
          console.log(`✅ Raggiunto il limite richiesto di ${limit} ordini`);
          allOrders = allOrders.slice(0, limit);
          keepGoing = false;
        } else if (data.orders.length < optimizedLimit) {
          console.log(`✅ Ultima pagina raggiunta (${data.orders.length} ordini < ${optimizedLimit})`);
          keepGoing = false;
        } else {
          // Usa la nuova struttura di paginazione
          if (data.pagination && data.pagination.next && data.pagination.next.pageInfo) {
            pageInfo = data.pagination.next.pageInfo;
            console.log(`📄 Prossima pagina trovata: ${pageInfo.substring(0, 50)}...`);
            page++;
          } else {
            console.log('⚠️ Nessuna prossima pagina trovata - controlla pagination:', data.pagination);
            console.log('⚠️ Link header:', data.linkHeader);
            keepGoing = false;
          }
        }
      } else {
        console.log(`⚠️ Pagina ${page} non ha ordini o errore`);
        if (data.error) {
          console.error('❌ Errore dalla funzione:', data.error);
        }
        keepGoing = false;
      }
      
      // Limite di sicurezza per evitare loop infiniti
      if (page > 100) { // Ridotto da 200 a 100 per maggiore sicurezza
        console.log('⚠️ Raggiunto limite massimo di pagine (100) - potrebbe esserci un problema di paginazione');
        keepGoing = false;
      }
      
      // Pausa intelligente per evitare rate limit
      if (keepGoing) {
        const pauseTime = page === 1 ? 300 : 500; // Ridotte le pause per maggiore velocità
        console.log(`⏳ Pausa di ${pauseTime}ms prima della prossima richiesta...`);
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
    }
    console.log(`🎉 Scaricamento completato! Totale ordini: ${allOrders.length}`);
    return allOrders;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Errore di connessione a Shopify. Verifica la connessione internet e le credenziali.');
    }
    throw error;
  }
};

// Funzione per convertire un ordine Shopify nel formato dell'app
export const convertShopifyOrder = (shopifyOrder) => {
  // Calcola il costo di spedizione dai shipping_lines
  let shippingCost = 0;
  let shippingType = 'Standard';
  let shippingCarrier = 'N/A';
  
  if (shopifyOrder.shipping_lines && shopifyOrder.shipping_lines.length > 0) {
    shippingCost = shopifyOrder.shipping_lines.reduce((total, line) => {
      return total + parseFloat(line.price || 0);
    }, 0);
    
    // Determina il tipo di spedizione dal primo shipping line
    const firstShipping = shopifyOrder.shipping_lines[0];
    if (firstShipping) {
      shippingType = firstShipping.title || 'Standard';
      shippingCarrier = firstShipping.carrier_identifier || firstShipping.code || 'N/A';
    }
  }

  // Se non ci sono shipping_lines, prova con total_shipping_price_set
  if (shippingCost === 0 && shopifyOrder.total_shipping_price_set) {
    shippingCost = parseFloat(shopifyOrder.total_shipping_price_set.shop_money?.amount || '0');
  }

  // Ottieni i dati del cliente con fallback
  const customerEmail = shopifyOrder.customer?.email || 
                       shopifyOrder.shipping_address?.email || 
                       shopifyOrder.billing_address?.email;
  
  // Costruisci il nome completo del cliente
  const customerFirstName = shopifyOrder.customer?.first_name || shopifyOrder.shipping_address?.first_name || '';
  const customerLastName = shopifyOrder.customer?.last_name || shopifyOrder.shipping_address?.last_name || '';
  const customerFullName = shopifyOrder.shipping_address?.name || 
                          (customerFirstName && customerLastName ? `${customerFirstName} ${customerLastName}`.trim() : '') ||
                          shopifyOrder.name;

  // Ottieni il telefono del cliente
  const customerPhone = shopifyOrder.customer?.phone || 
                       shopifyOrder.shipping_address?.phone || 
                       shopifyOrder.billing_address?.phone;

  // Assicurati che l'indirizzo di spedizione abbia tutti i campi necessari
  const shippingAddress = shopifyOrder.shipping_address ? {
    name: shopifyOrder.shipping_address.name || customerFullName,
    first_name: shopifyOrder.shipping_address.first_name || customerFirstName,
    last_name: shopifyOrder.shipping_address.last_name || customerLastName,
    email: shopifyOrder.shipping_address.email || customerEmail,
    phone: shopifyOrder.shipping_address.phone || customerPhone,
    address1: shopifyOrder.shipping_address.address1 || '',
    address2: shopifyOrder.shipping_address.address2 || '',
    city: shopifyOrder.shipping_address.city || '',
    province: shopifyOrder.shipping_address.province || '',
    zip: shopifyOrder.shipping_address.zip || '',
    country: shopifyOrder.shipping_address.country || ''
  } : null;

  // Assicurati che l'indirizzo di fatturazione abbia tutti i campi necessari
  const billingAddress = shopifyOrder.billing_address ? {
    name: shopifyOrder.billing_address.name || customerFullName,
    first_name: shopifyOrder.billing_address.first_name || customerFirstName,
    last_name: shopifyOrder.billing_address.last_name || customerLastName,
    email: shopifyOrder.billing_address.email || customerEmail,
    phone: shopifyOrder.billing_address.phone || customerPhone,
    address1: shopifyOrder.billing_address.address1 || '',
    address2: shopifyOrder.billing_address.address2 || '',
    city: shopifyOrder.billing_address.city || '',
    province: shopifyOrder.billing_address.province || '',
    zip: shopifyOrder.billing_address.zip || '',
    country: shopifyOrder.billing_address.country || ''
  } : null;

  return {
    id: shopifyOrder.id,
    orderNumber: shopifyOrder.order_number,
    customerName: customerFullName,
    customerEmail: customerEmail,
    customerPhone: customerPhone,
    customerFirstName: customerFirstName,
    customerLastName: customerLastName,
    createdAt: shopifyOrder.created_at,
    status: shopifyOrder.financial_status,
    fulfillmentStatus: shopifyOrder.fulfillment_status,
    totalPrice: parseFloat(shopifyOrder.total_price),
    currency: shopifyOrder.currency,
    shippingPrice: shippingCost,
    shippingType: shippingType,
    shippingCarrier: shippingCarrier,
    taxPrice: parseFloat(shopifyOrder.total_tax_set?.shop_money?.amount || '0'),
    shippingAddress: shippingAddress,
    billingAddress: billingAddress,
    shippingLines: shopifyOrder.shipping_lines,
    note: shopifyOrder.note,
    items: shopifyOrder.line_items?.map(item => ({
      sku: item.sku || item.variant_id?.toString(),
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price)
    })) || []
  };
}; 