// Funzione per ottenere le credenziali Shopify salvate
export const getShopifyCredentials = () => {
  const saved = localStorage.getItem('shopify_settings');
  if (!saved) {
    throw new Error('Credenziali Shopify non configurate. Vai su Impostazioni per configurarle.');
  }
  return JSON.parse(saved);
};

// Funzione per recuperare tutti gli ordini da Shopify tramite proxy, gestendo la paginazione
export const fetchShopifyOrders = async (limit = 50, status = 'any', onProgress, daysBack = null) => {
  try {
    const credentials = getShopifyCredentials();
    let allOrders = [];
    let pageInfo = null;
    let keepGoing = true;
    let page = 1;

    while (keepGoing) {
      const params = new URLSearchParams({
        shop: credentials.shop,
        apiKey: credentials.apiKey,
        apiPassword: credentials.apiPassword,
        apiVersion: credentials.apiVersion,
        limit: limit.toString(),
        status: status
      });
      
      // Aggiungi filtro per data se specificato
      if (daysBack) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        params.append('created_at_min', cutoffDate.toISOString());
        console.log(`[SYNC] Filtro per ordini degli ultimi ${daysBack} giorni (da ${cutoffDate.toISOString()})`);
      }
      
      if (pageInfo) {
        params.append('page_info', pageInfo);
        console.log(`[SYNC] Aggiungendo page_info alla richiesta:`, pageInfo);
      } else {
        console.log(`[SYNC] Prima richiesta senza page_info`);
      }
      const url = `http://localhost:3002/api/shopify/orders?${params}`;
      console.log(`[SYNC] Richiesta pagina ${page}... URL:`, url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore API Shopify: ${errorData.error || response.statusText}`);
      }
      const data = await response.json();
      if (data.orders && data.orders.length > 0) {
        // Filtro anti-duplicati
        const existingIds = new Set(allOrders.map(o => o.id));
        const newOrders = data.orders.filter(order => !existingIds.has(order.id));
        allOrders = allOrders.concat(newOrders);
        if (onProgress) onProgress(allOrders.length, page);
        console.log(`[SYNC] Scaricati ${allOrders.length} ordini totali dopo pagina ${page}`);
      }
      
      // Parsing del link header per la paginazione
      const linkHeader = response.headers.get('link');
      let nextPageInfo = null;
      if (linkHeader) {
        // Cerca solo il rel="next"
        const match = linkHeader.match(/<([^>]+)>; rel="next"/);
        if (match) {
          const nextUrl = match[1];
          const urlObj = new URL(nextUrl);
          nextPageInfo = urlObj.searchParams.get('page_info');
          console.log(`[SYNC] Estratto nextPageInfo:`, nextPageInfo);
        } else {
          console.log('[SYNC] Nessun rel="next" trovato nel link header. Fine paginazione.');
        }
      } else {
        console.log('[SYNC] Nessun link header presente. Fine paginazione.');
      }
      if (nextPageInfo) {
        pageInfo = nextPageInfo;
        keepGoing = true;
      } else {
        keepGoing = false;
      }
      page++;
      await new Promise(resolve => setTimeout(resolve, 1200)); // Pausa per evitare rate limit Shopify
    }
    console.log(`[SYNC] FINE: Scaricati ${allOrders.length} ordini totali!`);
    return allOrders;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Errore di connessione al proxy server. Verifica che il server sia avviato con "npm run server"');
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