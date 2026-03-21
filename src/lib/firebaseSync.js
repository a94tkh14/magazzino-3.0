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
  STORICO: 'storico',
  // Nuove collezioni
  FOTO_PRODOTTI: 'foto_prodotti',
  STORICO_PREZZI: 'storico_prezzi',
  MAGAZZINO_STORICO: 'magazzino_storico',
  MOVIMENTI_BANCA: 'movimenti_banca',
  COSTI: 'costi',
  METRICHE_MARKETING: 'metriche_marketing',
  APP_CONFIG: 'app_config'
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

// Salva multipli documenti in batch (con chunking e delay per evitare rate limiting)
export const saveBatch = async (collectionName, documents, options = {}) => {
  const { chunkSize = 100, delayMs = 200, silent = false } = options;
  
  try {
    const timestamp = new Date().toISOString();
    const totalDocs = documents.length;
    
    // Se pochi documenti, salva direttamente
    if (totalDocs <= chunkSize) {
      const batch = writeBatch(db);
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
      if (!silent) console.log(`✅ Salvati ${totalDocs} documenti in ${collectionName}`);
      return true;
    }
    
    // Altrimenti, dividi in chunk con delay
    const chunks = [];
    for (let i = 0; i < totalDocs; i += chunkSize) {
      chunks.push(documents.slice(i, i + chunkSize));
    }
    
    if (!silent) console.log(`🔄 Salvando ${totalDocs} documenti in ${chunks.length} batch...`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const batch = writeBatch(db);
      
      chunk.forEach((document) => {
        const docId = document.id || document.sku || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(db, collectionName, docId);
        batch.set(docRef, {
          ...document,
          id: docId,
          updatedAt: timestamp
        }, { merge: true });
      });
      
      await batch.commit();
      
      // Delay tra i batch per evitare rate limiting
      if (i < chunks.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    if (!silent) console.log(`✅ Salvati ${totalDocs} documenti in ${collectionName}`);
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

// ============ FOTO PRODOTTI ============

export const saveFotoProdotto = async (sku, fotoBase64) => {
  return saveDocument(COLLECTIONS.FOTO_PRODOTTI, sku, { 
    sku, 
    foto: fotoBase64,
    updatedAt: new Date().toISOString()
  });
};

export const loadFotoProdotto = async (sku) => {
  const doc = await loadDocument(COLLECTIONS.FOTO_PRODOTTI, sku);
  return doc?.foto || null;
};

export const loadAllFotoProdotti = async () => {
  return loadCollection(COLLECTIONS.FOTO_PRODOTTI);
};

// ============ STORICO PREZZI (per SKU) ============

export const saveStoricoPrezzi = async (sku, prezziArray) => {
  return saveDocument(COLLECTIONS.STORICO_PREZZI, sku, { 
    sku, 
    prezzi: prezziArray,
    updatedAt: new Date().toISOString()
  });
};

export const loadStoricoPrezzi = async (sku) => {
  const doc = await loadDocument(COLLECTIONS.STORICO_PREZZI, sku);
  return doc?.prezzi || [];
};

export const addPrezzoToStorico = async (sku, prezzoEntry) => {
  const existing = await loadStoricoPrezzi(sku);
  existing.push(prezzoEntry);
  return saveStoricoPrezzi(sku, existing);
};

// ============ MAGAZZINO STORICO (carichi) ============

export const saveMagazzinoStorico = async (storicoObj) => {
  return saveDocument(COLLECTIONS.MAGAZZINO_STORICO, 'all_storico', { 
    data: storicoObj,
    updatedAt: new Date().toISOString()
  });
};

export const loadMagazzinoStorico = async () => {
  const doc = await loadDocument(COLLECTIONS.MAGAZZINO_STORICO, 'all_storico');
  return doc?.data || {};
};

export const addMagazzinoStoricoEntry = async (sku, entry) => {
  const existing = await loadMagazzinoStorico();
  if (!existing[sku]) existing[sku] = [];
  existing[sku].push(entry);
  return saveMagazzinoStorico(existing);
};

// ============ MOVIMENTI BANCA ============

export const saveMovimentiBanca = async (movimenti) => {
  return saveBatch(COLLECTIONS.MOVIMENTI_BANCA, movimenti.map((m, i) => ({
    ...m,
    id: m.id || `mov_${Date.now()}_${i}`
  })));
};

export const loadMovimentiBanca = async () => {
  return loadCollection(COLLECTIONS.MOVIMENTI_BANCA);
};

export const saveMovimentoBanca = async (movimento) => {
  const docId = movimento.id || `mov_${Date.now()}`;
  return saveDocument(COLLECTIONS.MOVIMENTI_BANCA, docId, { ...movimento, id: docId });
};

export const deleteMovimentoBanca = async (movimentoId) => {
  return deleteDocument(COLLECTIONS.MOVIMENTI_BANCA, movimentoId);
};

// ============ COSTI ============

export const saveCosti = async (costi) => {
  return saveBatch(COLLECTIONS.COSTI, costi.map((c, i) => ({
    ...c,
    id: c.id || `costo_${Date.now()}_${i}`
  })));
};

export const loadCosti = async () => {
  return loadCollection(COLLECTIONS.COSTI);
};

export const saveCosto = async (costo) => {
  const docId = costo.id || `costo_${Date.now()}`;
  return saveDocument(COLLECTIONS.COSTI, docId, { ...costo, id: docId });
};

export const deleteCosto = async (costoId) => {
  return deleteDocument(COLLECTIONS.COSTI, costoId);
};

// ============ METRICHE MARKETING ============

export const saveMetricheMarketing = async (metriche) => {
  return saveBatch(COLLECTIONS.METRICHE_MARKETING, metriche.map((m, i) => ({
    ...m,
    id: m.id || `metrica_${Date.now()}_${i}`
  })));
};

export const loadMetricheMarketing = async () => {
  return loadCollection(COLLECTIONS.METRICHE_MARKETING);
};

export const saveMetricaMarketing = async (metrica) => {
  const docId = metrica.id || `metrica_${Date.now()}`;
  return saveDocument(COLLECTIONS.METRICHE_MARKETING, docId, { ...metrica, id: docId });
};

// ============ APP CONFIG (Logo, Nome, Google Ads, Meta, etc.) ============

export const saveAppConfig = async (configKey, configData) => {
  return saveDocument(COLLECTIONS.APP_CONFIG, configKey, configData);
};

export const loadAppConfig = async (configKey) => {
  return loadDocument(COLLECTIONS.APP_CONFIG, configKey);
};

export const loadAllAppConfig = async () => {
  return loadCollection(COLLECTIONS.APP_CONFIG);
};

// ============ MIGRAZIONE DA LOCALSTORAGE ============

export const migrateFromLocalStorage = async () => {
  const results = {
    magazzino: 0,
    shopifyOrders: 0,
    supplierOrders: 0,
    primaNota: 0,
    contiBancari: 0,
    movimentiBanca: 0,
    costi: 0,
    metriche: 0,
    foto: 0,
    storicoPrezzi: 0,
    magazzinoStorico: 0,
    appConfig: 0,
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

    // Migra Movimenti Banca
    const movBancaData = localStorage.getItem('movimenti_banca');
    if (movBancaData) {
      const movimenti = JSON.parse(movBancaData);
      if (Array.isArray(movimenti) && movimenti.length > 0) {
        await saveMovimentiBanca(movimenti);
        results.movimentiBanca = movimenti.length;
      }
    }

    // Migra Costi
    const costiData = localStorage.getItem('costs');
    if (costiData) {
      const costi = JSON.parse(costiData);
      if (Array.isArray(costi) && costi.length > 0) {
        await saveCosti(costi);
        results.costi = costi.length;
      }
    }

    // Migra Metriche Marketing
    const metricheData = localStorage.getItem('manualMetrics');
    if (metricheData) {
      const metriche = JSON.parse(metricheData);
      if (Array.isArray(metriche) && metriche.length > 0) {
        await saveMetricheMarketing(metriche);
        results.metriche = metriche.length;
      }
    }

    // Migra Magazzino Storico
    const magazzinoStoricoData = localStorage.getItem('magazzino_storico');
    if (magazzinoStoricoData) {
      const storico = JSON.parse(magazzinoStoricoData);
      if (storico && Object.keys(storico).length > 0) {
        await saveMagazzinoStorico(storico);
        results.magazzinoStorico = Object.keys(storico).length;
      }
    }

    // Migra Foto Prodotti (cerca tutte le chiavi foto_*)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('foto_')) {
        const sku = key.replace('foto_', '');
        const foto = localStorage.getItem(key);
        if (foto) {
          await saveFotoProdotto(sku, foto);
          results.foto++;
        }
      }
    }

    // Migra Storico Prezzi (cerca tutte le chiavi storico_prezzi_*)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('storico_prezzi_')) {
        const sku = key.replace('storico_prezzi_', '');
        const prezzi = JSON.parse(localStorage.getItem(key) || '[]');
        if (prezzi.length > 0) {
          await saveStoricoPrezzi(sku, prezzi);
          results.storicoPrezzi++;
        }
      }
    }

    // Migra App Config (Logo, Nome, Google Ads, Meta, etc.)
    const appConfigs = [
      { key: 'appLogo', configKey: 'logo' },
      { key: 'appName', configKey: 'name' },
      { key: 'google_ads_config', configKey: 'google_ads' },
      { key: 'meta_config', configKey: 'meta' },
      { key: 'database_config', configKey: 'database' },
      { key: 'costCategories', configKey: 'cost_categories' },
      { key: 'lowStockThreshold', configKey: 'low_stock_threshold' }
    ];

    for (const { key, configKey } of appConfigs) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          await saveAppConfig(configKey, { value: parsed });
          results.appConfig++;
        } catch {
          // Se non è JSON, salva come stringa
          await saveAppConfig(configKey, { value: data });
          results.appConfig++;
        }
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
