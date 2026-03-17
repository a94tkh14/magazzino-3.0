// Servizio centralizzato per sincronizzazione Firebase
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

// Collezioni Firebase
const COLLECTIONS = {
  MAGAZZINO: 'magazzino',
  SHOPIFY_ORDERS: 'shopify_orders',
  SUPPLIER_ORDERS: 'supplier_orders',
  PRIMA_NOTA: 'prima_nota',
  CONTI_BANCARI: 'conti_bancari',
  SETTINGS: 'settings',
  STORICO: 'storico'
};

// ============ FUNZIONI GENERICHE ============

// Salva un documento
export const saveDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`✅ Salvato ${collectionName}/${docId}`);
    return true;
  } catch (error) {
    console.error(`❌ Errore salvataggio ${collectionName}/${docId}:`, error);
    throw error;
  }
};

// Carica un documento
export const loadDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`❌ Errore caricamento ${collectionName}/${docId}:`, error);
    return null;
  }
};

// Carica tutti i documenti di una collezione
export const loadCollection = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    console.log(`✅ Caricati ${data.length} documenti da ${collectionName}`);
    return data;
  } catch (error) {
    console.error(`❌ Errore caricamento collezione ${collectionName}:`, error);
    return [];
  }
};

// Elimina un documento
export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    console.log(`✅ Eliminato ${collectionName}/${docId}`);
    return true;
  } catch (error) {
    console.error(`❌ Errore eliminazione ${collectionName}/${docId}:`, error);
    throw error;
  }
};

// Salva multipli documenti in batch
export const saveBatch = async (collectionName, documents) => {
  try {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();
    
    documents.forEach((document) => {
      const docId = document.id || document.sku || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docRef = doc(db, collectionName, docId);
      batch.set(docRef, {
        ...document,
        id: docId,
        updatedAt: timestamp
      }, { merge: true });
    });
    
    await batch.commit();
    console.log(`✅ Salvati ${documents.length} documenti in ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`❌ Errore batch save ${collectionName}:`, error);
    throw error;
  }
};

// Elimina tutti i documenti di una collezione
export const clearCollection = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });
    
    await batch.commit();
    console.log(`✅ Svuotata collezione ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`❌ Errore svuotamento ${collectionName}:`, error);
    throw error;
  }
};

// ============ MAGAZZINO ============

export const saveMagazzinoItem = async (item) => {
  const docId = item.sku || item.id;
  return saveDocument(COLLECTIONS.MAGAZZINO, docId, item);
};

export const loadMagazzinoItems = async () => {
  return loadCollection(COLLECTIONS.MAGAZZINO);
};

export const deleteMagazzinoItem = async (sku) => {
  return deleteDocument(COLLECTIONS.MAGAZZINO, sku);
};

export const saveMagazzinoAll = async (items) => {
  return saveBatch(COLLECTIONS.MAGAZZINO, items);
};

export const clearMagazzino = async () => {
  return clearCollection(COLLECTIONS.MAGAZZINO);
};

// ============ ORDINI SHOPIFY ============

export const saveShopifyOrder = async (order) => {
  const docId = order.id?.toString() || order.order_number?.toString() || `order_${Date.now()}`;
  return saveDocument(COLLECTIONS.SHOPIFY_ORDERS, docId, order);
};

export const loadShopifyOrders = async () => {
  return loadCollection(COLLECTIONS.SHOPIFY_ORDERS);
};

export const saveShopifyOrdersBatch = async (orders) => {
  // Salva in batch di 500 per evitare limiti Firebase
  const batchSize = 400;
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize).map(order => ({
      ...order,
      id: order.id?.toString() || order.order_number?.toString() || `order_${Date.now()}_${i}`
    }));
    await saveBatch(COLLECTIONS.SHOPIFY_ORDERS, batch);
  }
  return true;
};

export const clearShopifyOrders = async () => {
  return clearCollection(COLLECTIONS.SHOPIFY_ORDERS);
};

// ============ ORDINI FORNITORI ============

export const saveSupplierOrder = async (order) => {
  const docId = order.id || `supplier_${Date.now()}`;
  return saveDocument(COLLECTIONS.SUPPLIER_ORDERS, docId, order);
};

export const loadSupplierOrders = async () => {
  return loadCollection(COLLECTIONS.SUPPLIER_ORDERS);
};

export const deleteSupplierOrder = async (orderId) => {
  return deleteDocument(COLLECTIONS.SUPPLIER_ORDERS, orderId);
};

export const saveSupplierOrdersBatch = async (orders) => {
  return saveBatch(COLLECTIONS.SUPPLIER_ORDERS, orders);
};

// ============ PRIMA NOTA / CONTO ECONOMICO ============

export const savePrimaNotaItem = async (item) => {
  const docId = item.id || `movimento_${Date.now()}`;
  return saveDocument(COLLECTIONS.PRIMA_NOTA, docId, item);
};

export const loadPrimaNota = async () => {
  return loadCollection(COLLECTIONS.PRIMA_NOTA);
};

export const deletePrimaNotaItem = async (itemId) => {
  return deleteDocument(COLLECTIONS.PRIMA_NOTA, itemId);
};

export const savePrimaNotaBatch = async (items) => {
  return saveBatch(COLLECTIONS.PRIMA_NOTA, items);
};

// ============ CONTI BANCARI ============

export const saveContoBancario = async (conto) => {
  const docId = conto.id || `conto_${Date.now()}`;
  return saveDocument(COLLECTIONS.CONTI_BANCARI, docId, conto);
};

export const loadContiBancari = async () => {
  return loadCollection(COLLECTIONS.CONTI_BANCARI);
};

export const deleteContoBancario = async (contoId) => {
  return deleteDocument(COLLECTIONS.CONTI_BANCARI, contoId);
};

// ============ SETTINGS ============

export const saveSettings = async (settings) => {
  return saveDocument(COLLECTIONS.SETTINGS, 'app_settings', settings);
};

export const loadSettings = async () => {
  return loadDocument(COLLECTIONS.SETTINGS, 'app_settings');
};

// ============ STORICO ============

export const saveStoricoItem = async (item) => {
  const docId = `storico_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return saveDocument(COLLECTIONS.STORICO, docId, {
    ...item,
    createdAt: new Date().toISOString()
  });
};

export const loadStorico = async () => {
  return loadCollection(COLLECTIONS.STORICO);
};

// ============ MIGRAZIONE DA LOCALSTORAGE ============

export const migrateFromLocalStorage = async () => {
  const results = {
    magazzino: 0,
    shopifyOrders: 0,
    supplierOrders: 0,
    primaNota: 0,
    contiBancari: 0,
    errors: []
  };

  try {
    // Migra Magazzino
    const magazzinoData = localStorage.getItem('magazzino_data');
    if (magazzinoData) {
      const items = JSON.parse(magazzinoData);
      if (Array.isArray(items) && items.length > 0) {
        await saveMagazzinoAll(items);
        results.magazzino = items.length;
      }
    }

    // Migra Ordini Shopify
    const shopifyData = localStorage.getItem('shopify_orders');
    if (shopifyData) {
      const orders = JSON.parse(shopifyData);
      if (Array.isArray(orders) && orders.length > 0) {
        await saveShopifyOrdersBatch(orders);
        results.shopifyOrders = orders.length;
      }
    }

    // Migra Ordini Fornitori
    const supplierData = localStorage.getItem('supplier_orders');
    if (supplierData) {
      const orders = JSON.parse(supplierData);
      if (Array.isArray(orders) && orders.length > 0) {
        await saveSupplierOrdersBatch(orders);
        results.supplierOrders = orders.length;
      }
    }

    // Migra Prima Nota
    const primaNotaData = localStorage.getItem('conto_economico_movimenti');
    if (primaNotaData) {
      const items = JSON.parse(primaNotaData);
      if (Array.isArray(items) && items.length > 0) {
        await savePrimaNotaBatch(items);
        results.primaNota = items.length;
      }
    }

    // Migra Conti Bancari
    const contiBancariData = localStorage.getItem('conti_bancari');
    if (contiBancariData) {
      const conti = JSON.parse(contiBancariData);
      if (Array.isArray(conti) && conti.length > 0) {
        for (const conto of conti) {
          await saveContoBancario(conto);
        }
        results.contiBancari = conti.length;
      }
    }

    console.log('✅ Migrazione completata:', results);
    return results;
  } catch (error) {
    console.error('❌ Errore durante migrazione:', error);
    results.errors.push(error.message);
    return results;
  }
};

// ============ LISTENER REAL-TIME ============

export const subscribeToCollection = (collectionName, callback) => {
  const q = query(collection(db, collectionName));
  
  return onSnapshot(q, (querySnapshot) => {
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    callback(data);
  }, (error) => {
    console.error(`❌ Errore listener ${collectionName}:`, error);
  });
};

// ============ EXPORT COLLEZIONI ============
export { COLLECTIONS };
