// Storage centralizzato con Firebase come source of truth
import { 
  loadMagazzinoItems, 
  saveMagazzinoItem, 
  saveMagazzinoAll,
  deleteMagazzinoItem,
  clearMagazzino,
  loadShopifyOrders as loadShopifyOrdersFromFirebase,
  saveShopifyOrdersBatch,
  loadSupplierOrders as loadSupplierOrdersFromFirebase,
  saveSupplierOrder as saveSupplierOrderToFirebase,
  loadPrimaNota as loadPrimaNotaFromFirebase,
  savePrimaNotaItem,
  savePrimaNotaBatch,
  loadContiBancari as loadContiBancariFromFirebase,
  saveContoBancario,
  loadSettings as loadSettingsFromFirebase,
  saveSettings as saveSettingsToFirebase,
  migrateFromLocalStorage
} from './firebaseSync';

// Cache locale per performance
let magazzinoCache = null;
let shopifyOrdersCache = null;
let supplierOrdersCache = null;
let primaNotaCache = null;
let contiBancariCache = null;
let settingsCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 secondi

// ============ MAGAZZINO ============

export const loadMagazzinoData = async () => {
  try {
    // Usa cache se recente
    if (magazzinoCache && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      return magazzinoCache;
    }
    
    console.log('🔄 Caricando magazzino da Firebase...');
    const data = await loadMagazzinoItems();
    magazzinoCache = data;
    lastCacheUpdate = Date.now();
    console.log(`✅ Magazzino caricato: ${data.length} prodotti`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento magazzino:', error);
    // Fallback a localStorage
    const localData = localStorage.getItem('magazzino_data');
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveMagazzinoData = async (data) => {
  try {
    console.log('🔄 Salvando magazzino su Firebase...');
    await saveMagazzinoAll(data);
    magazzinoCache = data;
    lastCacheUpdate = Date.now();
    // Backup locale
    localStorage.setItem('magazzino_data', JSON.stringify(data));
    console.log('✅ Magazzino salvato');
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio magazzino:', error);
    // Fallback locale
    localStorage.setItem('magazzino_data', JSON.stringify(data));
    return { success: false, error: error.message };
  }
};

export const saveSingleProduct = async (product) => {
  try {
    await saveMagazzinoItem(product);
    // Aggiorna cache
    if (magazzinoCache) {
      const idx = magazzinoCache.findIndex(p => p.sku === product.sku);
      if (idx >= 0) {
        magazzinoCache[idx] = product;
      } else {
        magazzinoCache.push(product);
      }
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio prodotto:', error);
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (sku) => {
  try {
    await deleteMagazzinoItem(sku);
    if (magazzinoCache) {
      magazzinoCache = magazzinoCache.filter(p => p.sku !== sku);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Errore eliminazione prodotto:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllMagazzino = async () => {
  try {
    await clearMagazzino();
    magazzinoCache = [];
    localStorage.removeItem('magazzino_data');
    return { success: true };
  } catch (error) {
    console.error('❌ Errore svuotamento magazzino:', error);
    return { success: false, error: error.message };
  }
};

// Invalida cache per forzare ricaricamento
export const invalidateCache = () => {
  magazzinoCache = null;
  shopifyOrdersCache = null;
  supplierOrdersCache = null;
  primaNotaCache = null;
  contiBancariCache = null;
  settingsCache = null;
  lastCacheUpdate = 0;
};

// ============ ORDINI SHOPIFY ============

export const loadShopifyOrdersData = async () => {
  try {
    if (shopifyOrdersCache && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      return shopifyOrdersCache;
    }
    
    console.log('🔄 Caricando ordini Shopify da Firebase...');
    const data = await loadShopifyOrdersFromFirebase();
    shopifyOrdersCache = data;
    console.log(`✅ Ordini Shopify caricati: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento ordini Shopify:', error);
    const localData = localStorage.getItem('shopify_orders');
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveShopifyOrdersData = async (orders) => {
  try {
    console.log(`🔄 Salvando ${orders.length} ordini Shopify su Firebase...`);
    await saveShopifyOrdersBatch(orders);
    shopifyOrdersCache = orders;
    localStorage.setItem('shopify_orders', JSON.stringify(orders));
    console.log('✅ Ordini Shopify salvati');
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio ordini Shopify:', error);
    localStorage.setItem('shopify_orders', JSON.stringify(orders));
    return { success: false, error: error.message };
  }
};

// ============ ORDINI FORNITORI ============

export const loadSupplierOrdersData = async () => {
  try {
    if (supplierOrdersCache && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      return supplierOrdersCache;
    }
    
    console.log('🔄 Caricando ordini fornitori da Firebase...');
    const data = await loadSupplierOrdersFromFirebase();
    supplierOrdersCache = data;
    console.log(`✅ Ordini fornitori caricati: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento ordini fornitori:', error);
    const localData = localStorage.getItem('supplier_orders');
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveSupplierOrderData = async (order) => {
  try {
    await saveSupplierOrderToFirebase(order);
    if (supplierOrdersCache) {
      const idx = supplierOrdersCache.findIndex(o => o.id === order.id);
      if (idx >= 0) {
        supplierOrdersCache[idx] = order;
      } else {
        supplierOrdersCache.push(order);
      }
    }
    // Backup locale
    const localOrders = JSON.parse(localStorage.getItem('supplier_orders') || '[]');
    const localIdx = localOrders.findIndex(o => o.id === order.id);
    if (localIdx >= 0) {
      localOrders[localIdx] = order;
    } else {
      localOrders.push(order);
    }
    localStorage.setItem('supplier_orders', JSON.stringify(localOrders));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio ordine fornitore:', error);
    return { success: false, error: error.message };
  }
};

// ============ PRIMA NOTA / CONTO ECONOMICO ============

export const loadPrimaNotaData = async () => {
  try {
    if (primaNotaCache && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      return primaNotaCache;
    }
    
    console.log('🔄 Caricando prima nota da Firebase...');
    const data = await loadPrimaNotaFromFirebase();
    primaNotaCache = data;
    console.log(`✅ Prima nota caricata: ${data.length} movimenti`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento prima nota:', error);
    const localData = localStorage.getItem('conto_economico_movimenti');
    return localData ? JSON.parse(localData) : [];
  }
};

export const savePrimaNotaData = async (items) => {
  try {
    console.log(`🔄 Salvando ${items.length} movimenti prima nota...`);
    await savePrimaNotaBatch(items);
    primaNotaCache = items;
    localStorage.setItem('conto_economico_movimenti', JSON.stringify(items));
    console.log('✅ Prima nota salvata');
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio prima nota:', error);
    localStorage.setItem('conto_economico_movimenti', JSON.stringify(items));
    return { success: false, error: error.message };
  }
};

export const saveSinglePrimaNotaItem = async (item) => {
  try {
    await savePrimaNotaItem(item);
    if (primaNotaCache) {
      const idx = primaNotaCache.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        primaNotaCache[idx] = item;
      } else {
        primaNotaCache.push(item);
      }
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio movimento:', error);
    return { success: false, error: error.message };
  }
};

// ============ CONTI BANCARI ============

export const loadContiBancariData = async () => {
  try {
    if (contiBancariCache && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      return contiBancariCache;
    }
    
    console.log('🔄 Caricando conti bancari da Firebase...');
    const data = await loadContiBancariFromFirebase();
    contiBancariCache = data;
    console.log(`✅ Conti bancari caricati: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento conti bancari:', error);
    const localData = localStorage.getItem('conti_bancari');
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveContoBancarioData = async (conto) => {
  try {
    await saveContoBancario(conto);
    if (contiBancariCache) {
      const idx = contiBancariCache.findIndex(c => c.id === conto.id);
      if (idx >= 0) {
        contiBancariCache[idx] = conto;
      } else {
        contiBancariCache.push(conto);
      }
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio conto bancario:', error);
    return { success: false, error: error.message };
  }
};

// ============ SETTINGS ============

export const loadSettingsData = async () => {
  try {
    if (settingsCache) {
      return settingsCache;
    }
    
    const data = await loadSettingsFromFirebase();
    settingsCache = data || {};
    return settingsCache;
  } catch (error) {
    console.error('❌ Errore caricamento settings:', error);
    return {};
  }
};

export const saveSettingsData = async (settings) => {
  try {
    await saveSettingsToFirebase(settings);
    settingsCache = settings;
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio settings:', error);
    return { success: false, error: error.message };
  }
};

// ============ MIGRAZIONE ============

export const migrateLocalDataToFirebase = async () => {
  try {
    console.log('🔄 Avvio migrazione dati locali a Firebase...');
    const results = await migrateFromLocalStorage();
    console.log('✅ Migrazione completata:', results);
    return results;
  } catch (error) {
    console.error('❌ Errore migrazione:', error);
    throw error;
  }
};

// ============ FUNZIONI LEGACY PER COMPATIBILITÀ ============

export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`❌ Errore localStorage: ${key}`, error);
  }
};

export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`❌ Errore localStorage: ${key}`, error);
    return defaultValue;
  }
};

// Export delle funzioni di storico per compatibilità
export const saveStoricoData = saveToLocalStorage;
export const loadStoricoData = loadFromLocalStorage;
export const saveStockData = saveToLocalStorage;
export const loadStockData = loadFromLocalStorage;
