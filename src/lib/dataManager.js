import { 
  saveMagazzino, 
  loadMagazzino, 
  saveStock, 
  loadStock, 
  saveOrdine, 
  loadOrdini, 
  saveStorico, 
  loadStorico,
  saveSettings,
  loadSettings,
  saveSupplierOrder,
  loadSupplierOrders
} from './supabase';

// Sistema di gestione dati con storico completo
class DataManager {
  constructor() {
    this.isInitialized = false;
  }

  // Inizializza il sistema
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Carica le impostazioni di default se non esistono
      const settings = await loadSettings();
      if (!settings || Object.keys(settings).length === 0) {
        await saveSettings({
          low_stock_threshold: 10,
          currency: 'EUR',
          date_format: 'DD/MM/YYYY',
          company_name: 'La Tua Azienda'
        });
      }
      
      this.isInitialized = true;
      console.log('✅ DataManager inizializzato');
    } catch (error) {
      console.error('❌ Errore nell\'inizializzazione del DataManager:', error);
    }
  }

  // Salva un prodotto nel magazzino con storico
  async saveProduct(product, action = 'modifica') {
    try {
      await this.initialize();
      
      // Carica i dati esistenti
      const existingData = await loadMagazzino();
      const data = Array.isArray(existingData) ? existingData : [];
      
      // Trova se il prodotto esiste già
      const existingIndex = data.findIndex(p => p.sku === product.sku);
      let oldProduct = null;
      
      if (existingIndex >= 0) {
        oldProduct = { ...data[existingIndex] };
        data[existingIndex] = product;
        action = 'modifica';
      } else {
        data.push(product);
        action = 'aggiunta';
      }
      
      // Salva nel database
      await saveMagazzino(data);
      
      // Registra nel storico
      await this.addToStorico({
        tipo_azione: action === 'aggiunta' ? 'aggiunta_prodotto' : 'modifica_prodotto',
        descrizione: `${action === 'aggiunta' ? 'Aggiunto' : 'Modificato'} prodotto ${product.sku} - ${product.nome}`,
        dati_azione: {
          sku: product.sku,
          nome: product.nome,
          quantita: product.quantita,
          prezzo: product.prezzo,
          azione: action,
          prodotto_precedente: oldProduct,
          prodotto_nuovo: product
        }
      });
      
      console.log(`✅ Prodotto ${action === 'aggiunta' ? 'aggiunto' : 'modificato'}:`, product.sku);
      return data;
      
    } catch (error) {
      console.error('❌ Errore nel salvare prodotto:', error);
      throw error;
    }
  }

  // Elimina un prodotto con storico
  async deleteProduct(sku) {
    try {
      await this.initialize();
      
      // Carica i dati esistenti
      const existingData = await loadMagazzino();
      const data = Array.isArray(existingData) ? existingData : [];
      
      // Trova il prodotto da eliminare
      const productToDelete = data.find(p => p.sku === sku);
      if (!productToDelete) {
        throw new Error(`Prodotto con SKU ${sku} non trovato`);
      }
      
      // Rimuovi il prodotto
      const updatedData = data.filter(p => p.sku !== sku);
      
      // Salva nel database
      await saveMagazzino(updatedData);
      
      // Registra nel storico
      await this.addToStorico({
        tipo_azione: 'eliminazione_prodotto',
        descrizione: `Eliminato prodotto ${sku} - ${productToDelete.nome}`,
        dati_azione: {
          sku: sku,
          nome: productToDelete.nome,
          prodotto_eliminato: productToDelete
        }
      });
      
      console.log(`✅ Prodotto eliminato:`, sku);
      return updatedData;
      
    } catch (error) {
      console.error('❌ Errore nell\'eliminare prodotto:', error);
      throw error;
    }
  }

  // Aggiorna quantità di un prodotto con storico
  async updateProductQuantity(sku, newQuantity, motivo = 'aggiornamento manuale') {
    try {
      await this.initialize();
      
      // Carica i dati esistenti
      const existingData = await loadMagazzino();
      const data = Array.isArray(existingData) ? existingData : [];
      
      // Trova il prodotto
      const productIndex = data.findIndex(p => p.sku === sku);
      if (productIndex === -1) {
        throw new Error(`Prodotto con SKU ${sku} non trovato`);
      }
      
      const oldProduct = { ...data[productIndex] };
      const oldQuantity = oldProduct.quantita;
      
      // Aggiorna la quantità
      data[productIndex].quantita = newQuantity;
      
      // Salva nel database
      await saveMagazzino(data);
      
      // Registra movimento di stock
      await this.addStockMovement({
        sku: sku,
        tipo_movimento: newQuantity > oldQuantity ? 'entrata' : 'uscita',
        quantita: Math.abs(newQuantity - oldQuantity),
        quantita_precedente: oldQuantity,
        quantita_attuale: newQuantity,
        motivo: motivo
      });
      
      // Registra nel storico
      await this.addToStorico({
        tipo_azione: 'aggiornamento_quantita',
        descrizione: `Aggiornata quantità prodotto ${sku} da ${oldQuantity} a ${newQuantity}`,
        dati_azione: {
          sku: sku,
          quantita_precedente: oldQuantity,
          quantita_nuova: newQuantity,
          differenza: newQuantity - oldQuantity,
          motivo: motivo
        }
      });
      
      console.log(`✅ Quantità aggiornata per ${sku}: ${oldQuantity} → ${newQuantity}`);
      return data;
      
    } catch (error) {
      console.error('❌ Errore nell\'aggiornare quantità:', error);
      throw error;
    }
  }

  // Aggiunge un movimento di stock
  async addStockMovement(movement) {
    try {
      await this.initialize();
      
      // Carica i movimenti esistenti
      const existingMovements = await loadStock();
      const movements = Array.isArray(existingMovements) ? existingMovements : [];
      
      // Aggiungi il nuovo movimento
      const newMovement = {
        ...movement,
        data_aggiornamento: new Date().toISOString()
      };
      
      movements.push(newMovement);
      
      // Salva nel database
      await saveStock(movements);
      
      console.log(`✅ Movimento stock registrato:`, movement.sku);
      return movements;
      
    } catch (error) {
      console.error('❌ Errore nel registrare movimento stock:', error);
      throw error;
    }
  }

  // Aggiunge una voce al storico
  async addToStorico(storicoEntry) {
    try {
      await this.initialize();
      
      // Carica lo storico esistente
      const existingStorico = await loadStorico();
      const storico = Array.isArray(existingStorico) ? existingStorico : [];
      
      // Aggiungi la nuova voce
      const newEntry = {
        ...storicoEntry,
        data: new Date().toISOString(),
        utente: 'sistema' // In futuro potrà essere l'utente loggato
      };
      
      storico.push(newEntry);
      
      // Salva nel database
      await saveStorico(storico);
      
      console.log(`✅ Voce storico registrata:`, storicoEntry.tipo_azione);
      return storico;
      
    } catch (error) {
      console.error('❌ Errore nel registrare storico:', error);
      throw error;
    }
  }

  // Salva un ordine con storico
  async saveOrder(order) {
    try {
      await this.initialize();
      
      // Carica gli ordini esistenti
      const existingOrders = await loadOrdini();
      const orders = Array.isArray(existingOrders) ? existingOrders : [];
      
      // Trova se l'ordine esiste già
      const existingIndex = orders.findIndex(o => o.numero_ordine === order.numero_ordine);
      let oldOrder = null;
      
      if (existingIndex >= 0) {
        oldOrder = { ...orders[existingIndex] };
        orders[existingIndex] = order;
      } else {
        orders.push(order);
      }
      
      // Salva nel database
      await saveOrdine(order);
      
      // Registra nel storico
      await this.addToStorico({
        tipo_azione: existingIndex >= 0 ? 'modifica_ordine' : 'nuovo_ordine',
        descrizione: `${existingIndex >= 0 ? 'Modificato' : 'Creato'} ordine ${order.numero_ordine}`,
        dati_azione: {
          numero_ordine: order.numero_ordine,
          cliente: order.cliente,
          totale: order.totale,
          ordine_precedente: oldOrder,
          ordine_nuovo: order
        }
      });
      
      console.log(`✅ Ordine ${existingIndex >= 0 ? 'modificato' : 'creato'}:`, order.numero_ordine);
      return orders;
      
    } catch (error) {
      console.error('❌ Errore nel salvare ordine:', error);
      throw error;
    }
  }

  // Salva un ordine fornitore con storico
  async saveSupplierOrder(order) {
    try {
      await this.initialize();
      
      // Carica gli ordini fornitori esistenti
      const existingOrders = await loadSupplierOrders();
      const orders = Array.isArray(existingOrders) ? existingOrders : [];
      
      // Trova se l'ordine esiste già
      const existingIndex = orders.findIndex(o => o.numero_ordine === order.numero_ordine);
      let oldOrder = null;
      
      if (existingIndex >= 0) {
        oldOrder = { ...orders[existingIndex] };
        orders[existingIndex] = order;
      } else {
        orders.push(order);
      }
      
      // Salva nel database
      await saveSupplierOrder(order);
      
      // Registra nel storico
      await this.addToStorico({
        tipo_azione: existingIndex >= 0 ? 'modifica_ordine_fornitore' : 'nuovo_ordine_fornitore',
        descrizione: `${existingIndex >= 0 ? 'Modificato' : 'Creato'} ordine fornitore ${order.numero_ordine}`,
        dati_azione: {
          numero_ordine: order.numero_ordine,
          fornitore: order.fornitore,
          totale: order.totale,
          ordine_precedente: oldOrder,
          ordine_nuovo: order
        }
      });
      
      console.log(`✅ Ordine fornitore ${existingIndex >= 0 ? 'modificato' : 'creato'}:`, order.numero_ordine);
      return orders;
      
    } catch (error) {
      console.error('❌ Errore nel salvare ordine fornitore:', error);
      throw error;
    }
  }

  // Carica tutti i dati necessari
  async loadAllData() {
    try {
      await this.initialize();
      
      const [magazzino, stock, ordini, storico, settings, supplierOrders] = await Promise.all([
        loadMagazzino(),
        loadStock(),
        loadOrdini(),
        loadStorico(),
        loadSettings(),
        loadSupplierOrders()
      ]);
      
      return {
        magazzino: Array.isArray(magazzino) ? magazzino : [],
        stock: Array.isArray(stock) ? stock : [],
        ordini: Array.isArray(ordini) ? ordini : [],
        storico: Array.isArray(storico) ? storico : [],
        settings: settings || {},
        supplierOrders: Array.isArray(supplierOrders) ? supplierOrders : []
      };
      
    } catch (error) {
      console.error('❌ Errore nel caricare tutti i dati:', error);
      throw error;
    }
  }

  // Ottiene le statistiche del sistema
  async getSystemStats() {
    try {
      const data = await this.loadAllData();
      
      const totalProducts = data.magazzino.length;
      const totalValue = data.magazzino.reduce((sum, item) => sum + (item.prezzo * item.quantita), 0);
      const totalQuantity = data.magazzino.reduce((sum, item) => sum + item.quantita, 0);
      const lowStockItems = data.magazzino.filter(item => item.quantita <= (data.settings.low_stock_threshold || 10)).length;
      const outOfStockItems = data.magazzino.filter(item => item.quantita === 0).length;
      const totalOrders = data.ordini.length;
      const totalSupplierOrders = data.supplierOrders.length;
      const totalMovements = data.stock.length;
      const totalHistoryEntries = data.storico.length;
      
      return {
        totalProducts,
        totalValue,
        totalQuantity,
        lowStockItems,
        outOfStockItems,
        totalOrders,
        totalSupplierOrders,
        totalMovements,
        totalHistoryEntries
      };
      
    } catch (error) {
      console.error('❌ Errore nel calcolare statistiche:', error);
      throw error;
    }
  }

  // Gestione dati di grandi dimensioni con chunking
  async saveLargeData(key, data, chunkSize = 1000) {
    try {
      await this.initialize();
      
      // Se i dati sono piccoli, salvali normalmente
      const dataString = JSON.stringify(data);
      if (dataString.length < 5000000) { // 5MB limit
        localStorage.setItem(key, dataString);
        return;
      }
      
      // Per dati grandi, usa il chunking
      const chunks = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }
      
      // Salva i chunk
      localStorage.setItem(`${key}_chunks`, JSON.stringify(chunks.length));
      chunks.forEach((chunk, index) => {
        localStorage.setItem(`${key}_chunk_${index}`, JSON.stringify(chunk));
      });
      
      // Salva metadata
      localStorage.setItem(`${key}_metadata`, JSON.stringify({
        totalItems: data.length,
        chunkCount: chunks.length,
        chunkSize: chunkSize,
        lastUpdated: new Date().toISOString()
      }));
      
      console.log(`✅ Dati salvati in ${chunks.length} chunk per ${key}`);
    } catch (error) {
      console.error('❌ Errore nel salvare dati grandi:', error);
      throw error;
    }
  }

  // Carica dati di grandi dimensioni
  async loadLargeData(key) {
    try {
      await this.initialize();
      
      // Prova prima il metodo normale
      const normalData = localStorage.getItem(key);
      if (normalData) {
        return JSON.parse(normalData);
      }
      
      // Se non esiste, prova il chunking
      const metadata = localStorage.getItem(`${key}_metadata`);
      if (!metadata) {
        return [];
      }
      
      const meta = JSON.parse(metadata);
      const chunkCount = meta.chunkCount;
      
      // Carica tutti i chunk
      const allData = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunkData = localStorage.getItem(`${key}_chunk_${i}`);
        if (chunkData) {
          const chunk = JSON.parse(chunkData);
          allData.push(...chunk);
        }
      }
      
      console.log(`✅ Dati caricati da ${chunkCount} chunk per ${key}`);
      return allData;
    } catch (error) {
      console.error('❌ Errore nel caricare dati grandi:', error);
      return [];
    }
  }

  // Pulisce i dati vecchi per liberare spazio
  async cleanupOldData(key, maxAge = 30) { // 30 giorni di default
    try {
      await this.initialize();
      
      const metadata = localStorage.getItem(`${key}_metadata`);
      if (!metadata) return;
      
      const meta = JSON.parse(metadata);
      const lastUpdated = new Date(meta.lastUpdated);
      const daysSinceUpdate = (new Date() - lastUpdated) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > maxAge) {
        // Rimuovi tutti i chunk
        for (let i = 0; i < meta.chunkCount; i++) {
          localStorage.removeItem(`${key}_chunk_${i}`);
        }
        localStorage.removeItem(`${key}_chunks`);
        localStorage.removeItem(`${key}_metadata`);
        console.log(`✅ Dati vecchi rimossi per ${key}`);
      }
    } catch (error) {
      console.error('❌ Errore nella pulizia dati:', error);
    }
  }
}

// Esporta un'istanza singleton
export const dataManager = new DataManager();

// Funzioni di utilità per compatibilità
export const saveProductWithHistory = (product, action) => dataManager.saveProduct(product, action);
export const deleteProductWithHistory = (sku) => dataManager.deleteProduct(sku);
export const updateQuantityWithHistory = (sku, quantity, motivo) => dataManager.updateProductQuantity(sku, quantity, motivo);
export const saveOrderWithHistory = (order) => dataManager.saveOrder(order);
export const saveSupplierOrderWithHistory = (order) => dataManager.saveSupplierOrder(order);
export const loadAllData = () => dataManager.loadAllData();
export const getSystemStats = () => dataManager.getSystemStats();
export const saveLargeData = (key, data, chunkSize) => dataManager.saveLargeData(key, data, chunkSize);
export const loadLargeData = (key) => dataManager.loadLargeData(key);
export const cleanupOldData = (key, maxAge) => dataManager.cleanupOldData(key, maxAge); 