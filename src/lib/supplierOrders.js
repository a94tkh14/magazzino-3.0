// Gestione ordini fornitori - Sincronizzato con Firebase
import { 
  loadSupplierOrdersData, 
  saveSupplierOrderData,
  loadMagazzinoData,
  saveSingleProduct,
  addPrezzoToStoricoData
} from './magazzinoStorage';

const SUPPLIER_ORDERS_KEY = 'supplier_orders';

// Cache locale per operazioni sincrone
let ordersCache = null;

// Stati degli ordini
export const ORDER_STATUS = {
  DRAFT: 'bozza',
  CONFIRMED: 'confermato',
  IN_TRANSIT: 'in_transito',
  RECEIVED: 'ricevuto',
  PARTIAL: 'parziale',
  PAID: 'pagato'
};

// Carica ordini (prima da cache, poi da Firebase)
export const getSupplierOrders = () => {
  try {
    // Se abbiamo cache, usa quella
    if (ordersCache) return ordersCache;
    // Fallback a localStorage per compatibilità sincrona
    const orders = localStorage.getItem(SUPPLIER_ORDERS_KEY);
    return orders ? JSON.parse(orders) : [];
  } catch (error) {
    console.error('Errore nel caricare ordini fornitori:', error);
    return [];
  }
};

// Carica ordini da Firebase (asincrono)
export const getSupplierOrdersAsync = async () => {
  try {
    const orders = await loadSupplierOrdersData();
    ordersCache = orders;
    // Sync con localStorage
    localStorage.setItem(SUPPLIER_ORDERS_KEY, JSON.stringify(orders));
    return orders;
  } catch (error) {
    console.error('Errore nel caricare ordini fornitori da Firebase:', error);
    return getSupplierOrders();
  }
};

// Salva tutti gli ordini (locale + Firebase)
const saveAllOrders = async (orders) => {
  ordersCache = orders;
  localStorage.setItem(SUPPLIER_ORDERS_KEY, JSON.stringify(orders));
  // Salva su Firebase (ogni ordine)
  for (const order of orders) {
    try {
      await saveSupplierOrderData(order);
    } catch (err) {
      console.error('Errore salvataggio ordine su Firebase:', err);
    }
  }
};

// Salva un nuovo ordine
export const saveSupplierOrder = async (order) => {
  try {
    const existingOrders = await getSupplierOrdersAsync();
    const newOrder = {
      ...order,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: ORDER_STATUS.DRAFT,
      receivedItems: [],
      totalReceived: 0,
      totalSpent: 0
    };
    
    existingOrders.push(newOrder);
    await saveAllOrders(existingOrders);
    return newOrder;
  } catch (error) {
    console.error('Errore nel salvare ordine fornitore:', error);
    throw error;
  }
};

// Aggiorna un ordine esistente
export const updateSupplierOrder = async (orderId, updates) => {
  try {
    const orders = await getSupplierOrdersAsync();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      throw new Error('Ordine non trovato');
    }
    
    orders[orderIndex] = { ...orders[orderIndex], ...updates };
    await saveAllOrders(orders);
    return orders[orderIndex];
  } catch (error) {
    console.error('Errore nell\'aggiornare ordine:', error);
    throw error;
  }
};

// Trova un ordine specifico
export const getSupplierOrder = (orderId) => {
  try {
    const orders = getSupplierOrders();
    return orders.find(order => order.id === orderId);
  } catch (error) {
    console.error('Errore nel trovare ordine:', error);
    return null;
  }
};

// Aggiorna prezzo fornitore nel magazzino (ora usa Firebase)
const updateMagazzinoPrezzoFornitore = async (sku, newPrice, fornitore) => {
  try {
    const magazzino = await loadMagazzinoData();
    const product = magazzino.find(p => p.sku === sku);
    
    if (product) {
      // Aggiorna il prodotto
      product.prezzo = newPrice;
      product.prezzoFornitore = newPrice;
      product.ultimoAggiornamentoPrezzo = new Date().toISOString();
      if (fornitore) {
        product.fornitore = fornitore;
      }
      
      // Salva su Firebase
      await saveSingleProduct(product);
      
      // Salva nello storico prezzi (Firebase)
      await addPrezzoToStoricoData(sku, {
        prezzo: newPrice,
        fornitore: fornitore,
        data: new Date().toISOString()
      });
      
      console.log(`✅ Aggiornato prezzo fornitore per ${sku}: ${newPrice}€`);
    }
  } catch (error) {
    console.error('Errore aggiornamento prezzo magazzino:', error);
  }
};

// Registra ricezione di un prodotto
export const receiveProduct = async (orderId, sku, quantity) => {
  try {
    const order = getSupplierOrder(orderId);
    if (!order) throw new Error('Ordine non trovato');
    
    const product = order.products.find(p => p.sku === sku);
    if (!product) throw new Error('Prodotto non trovato nell\'ordine');
    
    const receivedQuantity = (order.receivedItems.find(item => item.sku === sku)?.quantity || 0) + quantity;
    
    // Aggiorna o aggiunge l'item ricevuto
    const updatedReceivedItems = order.receivedItems.filter(item => item.sku !== sku);
    if (receivedQuantity > 0) {
      updatedReceivedItems.push({
        sku,
        quantity: receivedQuantity,
        receivedAt: new Date().toISOString()
      });
      
      // AGGIORNA PREZZO FORNITORE NEL MAGAZZINO (Firebase)
      await updateMagazzinoPrezzoFornitore(sku, product.price, order.supplier);
    }
    
    // Calcola totali
    const totalReceived = updatedReceivedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSpent = updatedReceivedItems.reduce((sum, item) => {
      const prod = order.products.find(p => p.sku === item.sku);
      return sum + (item.quantity * prod.price);
    }, 0);
    
    // Determina nuovo stato
    let newStatus = order.status;
    if (totalReceived === order.products.reduce((sum, p) => sum + p.quantity, 0)) {
      newStatus = ORDER_STATUS.RECEIVED;
    } else if (totalReceived > 0) {
      newStatus = ORDER_STATUS.PARTIAL;
    }
    
    return await updateSupplierOrder(orderId, {
      receivedItems: updatedReceivedItems,
      totalReceived,
      totalSpent,
      status: newStatus,
      lastReceivedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nella ricezione prodotto:', error);
    throw error;
  }
};

// Chiudi ordine parziale
export const closePartialOrder = async (orderId) => {
  try {
    const order = getSupplierOrder(orderId);
    if (!order) throw new Error('Ordine non trovato');
    
    return await updateSupplierOrder(orderId, {
      status: ORDER_STATUS.RECEIVED,
      closedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nella chiusura ordine parziale:', error);
    throw error;
  }
};

// Marca ordine come pagato
export const markOrderAsPaid = async (orderId, paymentDate) => {
  try {
    return await updateSupplierOrder(orderId, {
      status: ORDER_STATUS.PAID,
      paidAt: paymentDate || new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nel marcare ordine come pagato:', error);
    throw error;
  }
};

// Genera numero ordine univoco
export const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
  
  return `ORD-${year}${month}${day}-${time}`;
};

// Elimina un ordine fornitore
export const deleteSupplierOrder = async (orderId) => {
  try {
    const order = getSupplierOrder(orderId);
    if (!order) throw new Error('Ordine non trovato');
    
    // Verifica che l'ordine possa essere eliminato (non ricevuto e non pagato)
    if (order.status === ORDER_STATUS.RECEIVED || order.status === ORDER_STATUS.PAID) {
      throw new Error('Non è possibile eliminare ordini ricevuti o pagati');
    }
    
    const orders = await getSupplierOrdersAsync();
    const filteredOrders = orders.filter(o => o.id !== orderId);
    await saveAllOrders(filteredOrders);
    
    return true;
  } catch (error) {
    console.error('Errore nell\'eliminare ordine:', error);
    throw error;
  }
};

// Inizializza cache al primo accesso
export const initSupplierOrdersCache = async () => {
  await getSupplierOrdersAsync();
};
