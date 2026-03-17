// Gestione ordini fornitori
const SUPPLIER_ORDERS_KEY = 'supplier_orders';

// Stati degli ordini
export const ORDER_STATUS = {
  DRAFT: 'bozza',
  CONFIRMED: 'confermato',
  IN_TRANSIT: 'in_transito',
  RECEIVED: 'ricevuto',
  PARTIAL: 'parziale',
  PAID: 'pagato'
};

// Salva un nuovo ordine
export const saveSupplierOrder = (order) => {
  try {
    const existingOrders = getSupplierOrders();
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
    localStorage.setItem(SUPPLIER_ORDERS_KEY, JSON.stringify(existingOrders));
    return newOrder;
  } catch (error) {
    console.error('Errore nel salvare ordine fornitore:', error);
    throw error;
  }
};

// Carica tutti gli ordini
export const getSupplierOrders = () => {
  try {
    const orders = localStorage.getItem(SUPPLIER_ORDERS_KEY);
    return orders ? JSON.parse(orders) : [];
  } catch (error) {
    console.error('Errore nel caricare ordini fornitori:', error);
    return [];
  }
};

// Aggiorna un ordine esistente
export const updateSupplierOrder = (orderId, updates) => {
  try {
    const orders = getSupplierOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      throw new Error('Ordine non trovato');
    }
    
    orders[orderIndex] = { ...orders[orderIndex], ...updates };
    localStorage.setItem(SUPPLIER_ORDERS_KEY, JSON.stringify(orders));
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

// Registra ricezione di un prodotto
export const receiveProduct = (orderId, sku, quantity) => {
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
    }
    
    // Calcola totali
    const totalReceived = updatedReceivedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSpent = updatedReceivedItems.reduce((sum, item) => {
      const product = order.products.find(p => p.sku === item.sku);
      return sum + (item.quantity * product.price);
    }, 0);
    
    // Determina nuovo stato
    let newStatus = order.status;
    if (totalReceived === order.products.reduce((sum, p) => sum + p.quantity, 0)) {
      newStatus = ORDER_STATUS.RECEIVED;
    } else if (totalReceived > 0) {
      newStatus = ORDER_STATUS.PARTIAL;
    }
    
    return updateSupplierOrder(orderId, {
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
export const closePartialOrder = (orderId) => {
  try {
    const order = getSupplierOrder(orderId);
    if (!order) throw new Error('Ordine non trovato');
    
    return updateSupplierOrder(orderId, {
      status: ORDER_STATUS.RECEIVED,
      closedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nella chiusura ordine parziale:', error);
    throw error;
  }
};

// Marca ordine come pagato
export const markOrderAsPaid = (orderId, paymentDate) => {
  try {
    return updateSupplierOrder(orderId, {
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
export const deleteSupplierOrder = (orderId) => {
  try {
    const order = getSupplierOrder(orderId);
    if (!order) throw new Error('Ordine non trovato');
    
    // Verifica che l'ordine possa essere eliminato (non ricevuto e non pagato)
    if (order.status === ORDER_STATUS.RECEIVED || order.status === ORDER_STATUS.PAID) {
      throw new Error('Non è possibile eliminare ordini ricevuti o pagati');
    }
    
    const orders = getSupplierOrders();
    const filteredOrders = orders.filter(order => order.id !== orderId);
    localStorage.setItem(SUPPLIER_ORDERS_KEY, JSON.stringify(filteredOrders));
    
    return true;
  } catch (error) {
    console.error('Errore nell\'eliminare ordine:', error);
    throw error;
  }
}; 