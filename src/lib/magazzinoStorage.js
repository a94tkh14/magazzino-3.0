// Storage centralizzato con Firebase come source of truth
import { 
  loadMagazzinoItems, 
  saveMagazzinoItem, 
  saveMagazzinoAll,
  deleteMagazzinoItem,
  clearMagazzino,
  loadShopifyOrders as loadShopifyOrdersFromFirebase,
  saveShopifyOrder,
  saveShopifyOrdersBatch,
  loadSupplierOrders as loadSupplierOrdersFromFirebase,
  saveSupplierOrder as saveSupplierOrderToFirebase,
  saveSupplierOrdersBatch as saveSupplierOrdersBatchToFirebase,
  loadPrimaNota as loadPrimaNotaFromFirebase,
  savePrimaNotaItem,
  savePrimaNotaBatch,
  loadContiBancari as loadContiBancariFromFirebase,
  saveContoBancario,
  loadSettings as loadSettingsFromFirebase,
  saveSettings as saveSettingsToFirebase,
  migrateFromLocalStorage,
  // Nuove funzioni
  saveFotoProdotto as saveFotoToFirebase,
  loadFotoProdotto as loadFotoFromFirebase,
  loadAllFotoProdotti,
  saveStoricoPrezzi as saveStoricoPrezziToFirebase,
  loadStoricoPrezzi as loadStoricoPrezziFromFirebase,
  addPrezzoToStorico,
  saveMagazzinoStorico as saveMagazzinoStoricoToFirebase,
  loadMagazzinoStorico as loadMagazzinoStoricoFromFirebase,
  addMagazzinoStoricoEntry,
  saveMovimentiBanca as saveMovimentiBancaToFirebase,
  loadMovimentiBanca as loadMovimentiBancaFromFirebase,
  saveMovimentoBanca as saveMovimentoBancaToFirebase,
  deleteMovimentoBanca as deleteMovimentoBancaFromFirebase,
  saveCosti as saveCostiToFirebase,
  loadCosti as loadCostiFromFirebase,
  saveCosto as saveCostoToFirebase,
  deleteCosto as deleteCostoFromFirebase,
  saveMetricheMarketing as saveMetricheToFirebase,
  loadMetricheMarketing as loadMetricheFromFirebase,
  saveMetricaMarketing as saveMetricaToFirebase,
  saveAppConfig,
  loadAppConfig,
  loadAllAppConfig
} from './firebaseSync';

// Cache locale per performance
let magazzinoCache = null;
let shopifyOrdersCache = null;
let supplierOrdersCache = null;
let primaNotaCache = null;
let contiBancariCache = null;
let settingsCache = null;
let costiCache = null;
let lastCacheUpdate = 0;
let lastShopifyCacheUpdate = 0;
let lastCostiCacheUpdate = 0;
const CACHE_TTL = 60000; // 60 secondi (aumentato per performance)
const ORDERS_CACHE_TTL = 120000; // 2 minuti per ordini (dato grande)

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
      const idx = magazzinoCache.findIndex(p => p.sku === product.sku || p.id === product.id);
      if (idx >= 0) {
        magazzinoCache[idx] = product;
      } else {
        magazzinoCache.push(product);
      }
    }
    // Aggiorna anche localStorage
    const localData = loadFromLocalStorage('magazzino_data', []);
    const localIdx = localData.findIndex(p => p.sku === product.sku || p.id === product.id);
    if (localIdx >= 0) {
      localData[localIdx] = product;
    } else {
      localData.push(product);
    }
    saveToLocalStorage('magazzino_data', localData);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio prodotto:', error);
    return { success: false, error: error.message };
  }
};

// Salva solo i prodotti modificati (più efficiente di saveMagazzinoData)
export const saveModifiedProducts = async (products) => {
  try {
    if (!products || products.length === 0) return { success: true };
    
    console.log(`🔄 Salvando ${products.length} prodotti modificati...`);
    
    // Salva su Firebase uno alla volta (per pochi prodotti è più efficiente)
    for (const product of products) {
      await saveMagazzinoItem(product);
    }
    
    // Aggiorna cache
    if (magazzinoCache) {
      products.forEach(product => {
        const idx = magazzinoCache.findIndex(p => p.sku === product.sku || p.id === product.id);
        if (idx >= 0) {
          magazzinoCache[idx] = product;
        } else {
          magazzinoCache.push(product);
        }
      });
    }
    
    // Aggiorna localStorage
    const localData = loadFromLocalStorage('magazzino_data', []);
    products.forEach(product => {
      const localIdx = localData.findIndex(p => p.sku === product.sku || p.id === product.id);
      if (localIdx >= 0) {
        localData[localIdx] = product;
      } else {
        localData.push(product);
      }
    });
    saveToLocalStorage('magazzino_data', localData);
    
    console.log(`✅ ${products.length} prodotti salvati`);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio prodotti:', error);
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

export const loadShopifyOrdersData = async (forceReload = false) => {
  try {
    // Cache più lunga per ordini (2 minuti) perché sono tanti
    if (!forceReload && shopifyOrdersCache && shopifyOrdersCache.length > 0 && (Date.now() - lastShopifyCacheUpdate) < ORDERS_CACHE_TTL) {
      return shopifyOrdersCache;
    }
    
    console.log('🔄 Caricando ordini Shopify da Firebase...');
    const data = await loadShopifyOrdersFromFirebase();
    shopifyOrdersCache = data;
    lastShopifyCacheUpdate = Date.now();
    console.log(`✅ Ordini Shopify caricati: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento ordini Shopify:', error);
    // Fallback a cache se disponibile
    if (shopifyOrdersCache && shopifyOrdersCache.length > 0) {
      console.log(`⚠️ Usando cache esistente: ${shopifyOrdersCache.length} ordini`);
      return shopifyOrdersCache;
    }
    const localData = localStorage.getItem('shopify_orders');
    if (localData) {
      const parsed = JSON.parse(localData);
      shopifyOrdersCache = parsed;
      return parsed;
    }
    return [];
  }
};

export const saveShopifyOrdersData = async (orders) => {
  try {
    console.log(`🔄 Salvando ${orders.length} ordini Shopify su Firebase...`);
    await saveShopifyOrdersBatch(orders);
    shopifyOrdersCache = orders;
    
    // Prova a salvare in localStorage, ma non fallire se quota exceeded
    try {
      // Se ci sono troppi ordini, salva solo gli ultimi 1000 in localStorage
      const ordersForLocalStorage = orders.length > 1000 
        ? orders.slice(-1000) 
        : orders;
      localStorage.setItem('shopify_orders', JSON.stringify(ordersForLocalStorage));
    } catch (storageError) {
      console.warn('⚠️ localStorage pieno, ordini salvati solo su Firebase');
    }
    
    console.log('✅ Ordini Shopify salvati');
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio ordini Shopify:', error);
    // Non provare localStorage se Firebase ha fallito - potrebbe essere troppo grande
    return { success: false, error: error.message };
  }
};

// Salva un singolo ordine (più efficiente per aggiornamenti singoli)
export const saveSingleShopifyOrder = async (order) => {
  try {
    await saveShopifyOrder(order);
    
    // Aggiorna cache
    if (shopifyOrdersCache) {
      const idx = shopifyOrdersCache.findIndex(o => o.id === order.id);
      if (idx >= 0) {
        shopifyOrdersCache[idx] = order;
      } else {
        shopifyOrdersCache.push(order);
      }
    }
    
    console.log(`✅ Ordine ${order.order_number || order.id} salvato`);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio ordine:', error);
    return { success: false, error: error.message };
  }
};

// ============ ORDINI FORNITORI ============

export const loadSupplierOrdersData = async (forceReload = false) => {
  try {
    if (!forceReload && supplierOrdersCache && supplierOrdersCache.length > 0 && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      console.log(`📦 Usando cache ordini fornitori (${supplierOrdersCache.length} ordini)`);
      return supplierOrdersCache;
    }
    
    console.log('🔄 Caricando ordini fornitori da Firebase...');
    const data = await loadSupplierOrdersFromFirebase();
    supplierOrdersCache = data;
    lastCacheUpdate = Date.now();
    console.log(`✅ Ordini fornitori caricati da Firebase: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento ordini fornitori:', error);
    const localData = localStorage.getItem('supplier_orders');
    if (localData) {
      const parsed = JSON.parse(localData);
      console.log(`⚠️ Fallback a localStorage: ${parsed.length} ordini`);
      return parsed;
    }
    return [];
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

// ============ FOTO PRODOTTI ============

let fotoCache = {};

export const saveFotoProdottoData = async (sku, fotoBase64) => {
  try {
    await saveFotoToFirebase(sku, fotoBase64);
    fotoCache[sku] = fotoBase64;
    localStorage.setItem(`foto_${sku}`, fotoBase64); // backup
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio foto:', error);
    localStorage.setItem(`foto_${sku}`, fotoBase64);
    return { success: false, error: error.message };
  }
};

export const loadFotoProdottoData = async (sku) => {
  try {
    if (fotoCache[sku]) return fotoCache[sku];
    const foto = await loadFotoFromFirebase(sku);
    if (foto) {
      fotoCache[sku] = foto;
      return foto;
    }
    // Fallback localStorage
    return localStorage.getItem(`foto_${sku}`);
  } catch (error) {
    console.error('❌ Errore caricamento foto:', error);
    return localStorage.getItem(`foto_${sku}`);
  }
};

export const preloadAllFoto = async () => {
  try {
    const allFoto = await loadAllFotoProdotti();
    allFoto.forEach(item => {
      if (item.sku && item.foto) {
        fotoCache[item.sku] = item.foto;
      }
    });
    return fotoCache;
  } catch (error) {
    console.error('❌ Errore preload foto:', error);
    return {};
  }
};

// ============ STORICO PREZZI ============

export const loadStoricoPrezziData = async (sku) => {
  try {
    const prezzi = await loadStoricoPrezziFromFirebase(sku);
    if (prezzi && prezzi.length > 0) return prezzi;
    // Fallback localStorage
    const local = localStorage.getItem(`storico_prezzi_${sku}`);
    return local ? JSON.parse(local) : [];
  } catch (error) {
    console.error('❌ Errore caricamento storico prezzi:', error);
    const local = localStorage.getItem(`storico_prezzi_${sku}`);
    return local ? JSON.parse(local) : [];
  }
};

export const addPrezzoToStoricoData = async (sku, prezzoEntry) => {
  try {
    await addPrezzoToStorico(sku, prezzoEntry);
    // Backup locale
    const local = JSON.parse(localStorage.getItem(`storico_prezzi_${sku}`) || '[]');
    local.push(prezzoEntry);
    localStorage.setItem(`storico_prezzi_${sku}`, JSON.stringify(local));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore aggiunta prezzo storico:', error);
    const local = JSON.parse(localStorage.getItem(`storico_prezzi_${sku}`) || '[]');
    local.push(prezzoEntry);
    localStorage.setItem(`storico_prezzi_${sku}`, JSON.stringify(local));
    return { success: false };
  }
};

// ============ MAGAZZINO STORICO (carichi) ============

let magazzinoStoricoCache = null;

export const loadMagazzinoStoricoData = async () => {
  try {
    if (magazzinoStoricoCache) return magazzinoStoricoCache;
    const storico = await loadMagazzinoStoricoFromFirebase();
    if (storico && Object.keys(storico).length > 0) {
      magazzinoStoricoCache = storico;
      return storico;
    }
    // Fallback localStorage
    const local = localStorage.getItem('magazzino_storico');
    return local ? JSON.parse(local) : {};
  } catch (error) {
    console.error('❌ Errore caricamento magazzino storico:', error);
    const local = localStorage.getItem('magazzino_storico');
    return local ? JSON.parse(local) : {};
  }
};

export const saveMagazzinoStoricoData = async (storicoObj) => {
  try {
    await saveMagazzinoStoricoToFirebase(storicoObj);
    magazzinoStoricoCache = storicoObj;
    localStorage.setItem('magazzino_storico', JSON.stringify(storicoObj));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio magazzino storico:', error);
    localStorage.setItem('magazzino_storico', JSON.stringify(storicoObj));
    return { success: false };
  }
};

export const addMagazzinoStoricoData = async (sku, entry) => {
  try {
    await addMagazzinoStoricoEntry(sku, entry);
    // Aggiorna cache
    if (!magazzinoStoricoCache) magazzinoStoricoCache = {};
    if (!magazzinoStoricoCache[sku]) magazzinoStoricoCache[sku] = [];
    magazzinoStoricoCache[sku].push(entry);
    // Backup locale
    const local = JSON.parse(localStorage.getItem('magazzino_storico') || '{}');
    if (!local[sku]) local[sku] = [];
    local[sku].push(entry);
    localStorage.setItem('magazzino_storico', JSON.stringify(local));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore aggiunta storico magazzino:', error);
    return { success: false };
  }
};

// ============ MOVIMENTI BANCA ============

let movimentiBancaCache = null;

export const loadMovimentiBancaData = async () => {
  try {
    if (movimentiBancaCache) return movimentiBancaCache;
    console.log('🔄 Caricando movimenti banca da Firebase...');
    const data = await loadMovimentiBancaFromFirebase();
    movimentiBancaCache = data;
    console.log(`✅ Movimenti banca caricati: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento movimenti banca:', error);
    const local = localStorage.getItem('movimenti_banca');
    return local ? JSON.parse(local) : [];
  }
};

export const saveMovimentiBancaData = async (movimenti) => {
  try {
    await saveMovimentiBancaToFirebase(movimenti);
    movimentiBancaCache = movimenti;
    localStorage.setItem('movimenti_banca', JSON.stringify(movimenti));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio movimenti banca:', error);
    localStorage.setItem('movimenti_banca', JSON.stringify(movimenti));
    return { success: false };
  }
};

export const saveMovimentoBancaData = async (movimento) => {
  try {
    await saveMovimentoBancaToFirebase(movimento);
    if (movimentiBancaCache) {
      const idx = movimentiBancaCache.findIndex(m => m.id === movimento.id);
      if (idx >= 0) movimentiBancaCache[idx] = movimento;
      else movimentiBancaCache.push(movimento);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio movimento:', error);
    return { success: false };
  }
};

// ============ COSTI ============

export const loadCostiData = async (forceReload = false) => {
  try {
    // Usa cache se recente
    if (!forceReload && costiCache && (Date.now() - lastCostiCacheUpdate) < CACHE_TTL) {
      return costiCache;
    }
    console.log('🔄 Caricando costi da Firebase...');
    const data = await loadCostiFromFirebase();
    costiCache = data;
    lastCostiCacheUpdate = Date.now();
    console.log(`✅ Costi caricati: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento costi:', error);
    if (costiCache) return costiCache;
    const local = localStorage.getItem('costs');
    return local ? JSON.parse(local) : [];
  }
};

export const saveCostiData = async (costi) => {
  try {
    await saveCostiToFirebase(costi);
    costiCache = costi;
    localStorage.setItem('costs', JSON.stringify(costi));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio costi:', error);
    localStorage.setItem('costs', JSON.stringify(costi));
    return { success: false };
  }
};

export const saveCostoData = async (costo) => {
  try {
    await saveCostoToFirebase(costo);
    if (costiCache) {
      const idx = costiCache.findIndex(c => c.id === costo.id);
      if (idx >= 0) costiCache[idx] = costo;
      else costiCache.push(costo);
    }
    // Backup locale
    const local = JSON.parse(localStorage.getItem('costs') || '[]');
    const localIdx = local.findIndex(c => c.id === costo.id);
    if (localIdx >= 0) local[localIdx] = costo;
    else local.push(costo);
    localStorage.setItem('costs', JSON.stringify(local));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio costo:', error);
    return { success: false };
  }
};

export const deleteCostoData = async (costoId) => {
  try {
    await deleteCostoFromFirebase(costoId);
    if (costiCache) {
      costiCache = costiCache.filter(c => c.id !== costoId);
    }
    const local = JSON.parse(localStorage.getItem('costs') || '[]');
    localStorage.setItem('costs', JSON.stringify(local.filter(c => c.id !== costoId)));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore eliminazione costo:', error);
    return { success: false };
  }
};

// ============ METRICHE MARKETING ============

let metricheCache = null;

export const loadMetricheMarketingData = async () => {
  try {
    if (metricheCache) return metricheCache;
    console.log('🔄 Caricando metriche marketing da Firebase...');
    const data = await loadMetricheFromFirebase();
    metricheCache = data;
    console.log(`✅ Metriche caricate: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Errore caricamento metriche:', error);
    const local = localStorage.getItem('manualMetrics');
    return local ? JSON.parse(local) : [];
  }
};

export const saveMetricheMarketingData = async (metriche) => {
  try {
    await saveMetricheToFirebase(metriche);
    metricheCache = metriche;
    localStorage.setItem('manualMetrics', JSON.stringify(metriche));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio metriche:', error);
    localStorage.setItem('manualMetrics', JSON.stringify(metriche));
    return { success: false };
  }
};

export const saveMetricaMarketingData = async (metrica) => {
  try {
    await saveMetricaToFirebase(metrica);
    if (metricheCache) {
      const idx = metricheCache.findIndex(m => m.id === metrica.id);
      if (idx >= 0) metricheCache[idx] = metrica;
      else metricheCache.push(metrica);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Errore salvataggio metrica:', error);
    return { success: false };
  }
};

// ============ APP CONFIG ============

let appConfigCache = {};

export const loadAppConfigData = async (configKey) => {
  try {
    if (appConfigCache[configKey]) return appConfigCache[configKey];
    const config = await loadAppConfig(configKey);
    if (config?.value) {
      appConfigCache[configKey] = config.value;
      return config.value;
    }
    return null;
  } catch (error) {
    console.error(`❌ Errore caricamento config ${configKey}:`, error);
    return null;
  }
};

export const saveAppConfigData = async (configKey, value) => {
  try {
    await saveAppConfig(configKey, { value });
    appConfigCache[configKey] = value;
    return { success: true };
  } catch (error) {
    console.error(`❌ Errore salvataggio config ${configKey}:`, error);
    return { success: false };
  }
};

export const loadAllAppConfigData = async () => {
  try {
    const all = await loadAllAppConfig();
    all.forEach(item => {
      if (item.id && item.value !== undefined) {
        appConfigCache[item.id] = item.value;
      }
    });
    return appConfigCache;
  } catch (error) {
    console.error('❌ Errore caricamento config:', error);
    return {};
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
