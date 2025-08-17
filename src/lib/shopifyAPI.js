// Funzione per ottenere le credenziali Shopify salvate
export const getShopifyCredentials = () => {
  const saved = localStorage.getItem('shopify_config');
  if (!saved) {
    throw new Error('Credenziali Shopify non configurate. Vai su Impostazioni per configurarle.');
  }
  return JSON.parse(saved);
};

// Funzione per recuperare tutti gli ordini da Shopify tramite Netlify Functions, gestendo la paginazione
export const fetchShopifyOrders = async (limit = 50, status = 'any', onProgress, daysBack = null) => {
  try {
    const credentials = getShopifyCredentials();
    let allOrders = [];
    let pageInfo = null;
    let keepGoing = true;
    let page = 1;
    
    console.log(`🔄 Inizio scaricamento ordini Shopify (limite: ${limit}, status: ${status}, daysBack: ${daysBack})`);

    while (keepGoing) {
      console.log(`📄 Scaricamento pagina ${page}...`);
      
      // Prepara il body della richiesta SEMPLIFICATO
      const requestBody = {
        shopDomain: credentials.shopDomain,
        accessToken: credentials.accessToken,
        apiVersion: credentials.apiVersion,
        testType: 'orders',
        limit: limit
      };
      
      // Aggiungi parametri opzionali solo se definiti
      if (status && status !== 'any') {
        requestBody.status = status;
      }
      if (pageInfo) {
        requestBody.pageInfo = pageInfo;
      }
      // Fallback: aggiungi lastOrderId per paginazione alternativa
      if (allOrders.length > 0) {
        const lastOrder = allOrders[allOrders.length - 1];
        if (lastOrder && lastOrder.id) {
          requestBody.lastOrderId = lastOrder.id;
          console.log(`🔍 DEBUG - Aggiunto lastOrderId come fallback: ${lastOrder.id}`);
        }
      }
      // Rimuoviamo temporaneamente daysBack per test
      // if (daysBack) {
      //   requestBody.daysBack = daysBack;
      // }
      
      console.log(`🔍 DEBUG - Request body inviato:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch('/.netlify/functions/shopify-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore API Shopify: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.orders && data.data.orders.length > 0) {
        const existingIds = new Set(allOrders.map(o => o.id));
        const newOrders = data.data.orders.filter(order => !existingIds.has(order.id));
        allOrders = allOrders.concat(newOrders);
        
        if (onProgress) onProgress(allOrders.length, page);
        console.log(`[SYNC] Scaricati ${allOrders.length} ordini totali dopo pagina ${page}`);
        console.log(`📊 Ordini in questa pagina: ${data.data.orders.length}/${limit}`);
        console.log(`📈 Totale ordini scaricati finora: ${allOrders.length}`);
        console.log(`🔍 Pagination info:`, data.data.paginationInfo);

        if (data.data.orders.length < limit) {
          console.log(`✅ Ultima pagina raggiunta (${data.data.orders.length} ordini < ${limit})`);
          keepGoing = false;
        } else {
          const linkHeader = data.data.linkHeader;
          console.log(`🔗 Link header ricevuto: ${linkHeader}`);
          if (linkHeader && linkHeader.includes('rel="next"')) {
            const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
            if (nextMatch) {
              pageInfo = nextMatch[1];
              console.log(`📄 Prossima pagina trovata: ${pageInfo}`);
              page++;
            } else {
              const altMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
              if (altMatch) {
                const url = altMatch[0].match(/<([^>]+)>/)[1];
                console.log(`🔗 URL estratto: ${url}`);
                try {
                  const urlObj = new URL(url);
                  pageInfo = urlObj.searchParams.get('page_info');
                  if (pageInfo) {
                    console.log(`📄 PageInfo estratto dall'URL: ${pageInfo}`);
                    page++;
                  } else {
                    console.log('⚠️ Nessun pageInfo trovato nell\'URL, uso fallback since_id');
                    // Fallback: usa since_id per la prossima pagina
                    if (data.data.orders.length > 0) {
                      const lastOrder = data.data.orders[data.data.orders.length - 1];
                      pageInfo = `fallback_${lastOrder.id}`;
                      console.log(`🔧 Fallback pageInfo creato: ${pageInfo}`);
                      page++;
                    } else {
                      keepGoing = false;
                    }
                  }
                } catch (urlError) {
                  console.error('❌ Errore nel parsing URL:', urlError);
                  // Fallback: usa since_id per la prossima pagina
                  if (data.data.orders.length > 0) {
                    const lastOrder = data.data.orders[data.data.orders.length - 1];
                    pageInfo = `fallback_${lastOrder.id}`;
                    console.log(`🔧 Fallback pageInfo creato dopo errore URL: ${pageInfo}`);
                    page++;
                  } else {
                    keepGoing = false;
                  }
                }
              } else {
                console.log('⚠️ Nessun pattern di link trovato, uso fallback since_id');
                // Fallback: usa since_id per la prossima pagina
                if (data.data.orders.length > 0) {
                  const lastOrder = data.data.orders[data.data.orders.length - 1];
                  pageInfo = `fallback_${lastOrder.id}`;
                  console.log(`🔧 Fallback pageInfo creato dopo pattern non trovato: ${pageInfo}`);
                  page++;
                } else {
                  keepGoing = false;
                }
              }
            }
          } else {
            console.log('⚠️ Nessun link header o link "next" trovato');
            // Fallback: prova a continuare con since_id
            if (data.data.orders.length > 0 && data.data.orders.length === limit) {
              console.log('🔧 Tentativo di continuare con fallback since_id...');
              const lastOrder = data.data.orders[data.data.orders.length - 1];
              pageInfo = `fallback_${lastOrder.id}`;
              console.log(`🔧 Fallback pageInfo creato: ${pageInfo}`);
              page++;
            } else {
              console.log('✅ Nessuna prossima pagina disponibile');
              console.log(`📊 Motivo: ordini in questa pagina (${data.data.orders.length}) < limite richiesto (${limit})`);
              console.log(`🔍 Questo potrebbe significare che abbiamo raggiunto tutti gli ordini disponibili`);
              keepGoing = false;
            }
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
      if (page > 50) { // Ridotto da 100 a 50 per maggiore sicurezza
        console.log('⚠️ Raggiunto limite massimo di pagine (50) - potrebbe esserci un problema di paginazione');
        console.log(`🔍 Ordini totali scaricati: ${allOrders.length}`);
        console.log(`🔍 Limite richiesto: ${limit}`);
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
    console.log(`📊 Limite richiesto: ${limit}`);
    console.log(`📈 Pagine processate: ${page}`);
    
    // Se abbiamo scaricato meno ordini del richiesto, potrebbe essere che non ce ne siano altri
    if (allOrders.length < limit) {
      console.log(`ℹ️ Nota: Scaricati ${allOrders.length} ordini su ${limit} richiesti`);
      console.log(`ℹ️ Questo potrebbe significare che il tuo store Shopify ha solo ${allOrders.length} ordini totali`);
    }
    
    return allOrders;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Errore di connessione alle Netlify Functions. Verifica la connessione internet.');
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