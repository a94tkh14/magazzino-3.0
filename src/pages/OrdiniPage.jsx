import React, { useState, useEffect, useRef, useMemo } from 'react';
import { loadShopifyOrdersData, saveShopifyOrdersData, saveSingleShopifyOrder, saveToLocalStorage, loadFromLocalStorage, loadMagazzinoData, saveModifiedProducts } from '../lib/magazzinoStorage';
import { safeIncludes } from '../lib/utils';
import { convertShopifyOrder, getShopifyCredentials, downloadAllShopifyOrders } from '../lib/shopifyAPI';
import { 
  RefreshCw, AlertCircle, Database, TrendingUp, Clock, Archive, Eye, Download, 
  StopCircle, CheckCircle, Search, Filter, Calendar, Package, Truck, CreditCard,
  User, Mail, Phone, MapPin, Hash, ArrowUpDown, ArrowUp, ArrowDown, X, Printer,
  FileText, ShoppingCart, ChevronDown, ChevronRight, ExternalLink, Copy, Tag,
  DollarSign, BarChart3, PieChart, Activity, Zap, Box, Globe
} from 'lucide-react';

// Componenti UI
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>{children}</div>
);
const CardContent = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>
);

const OrdiniPage = () => {
  // Stati principali
  const [ordini, setOrdini] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState(null);
  const abortControllerRef = useRef(null);
  
  // Stati filtri avanzati
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Stati ordinamento
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Stati dettaglio ordine
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // Stati stampa
  const [printingOrder, setPrintingOrder] = useState(null);
  
  // Stati modal evasione ordine
  const [showEvasioneModal, setShowEvasioneModal] = useState(false);
  const [evasioneOrder, setEvasioneOrder] = useState(null);
  const [evasioneProdotti, setEvasioneProdotti] = useState([]);
  const [scannerInput, setScannerInput] = useState('');
  const scannerInputRef = useRef(null);
  
  // Stati sincronizzazione automatica
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('ordini_auto_sync') !== 'false';
  });
  const [lastAutoSync, setLastAutoSync] = useState(() => {
    return localStorage.getItem('ordini_last_auto_sync') || null;
  });
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const autoSyncIntervalRef = useRef(null);

  // Carica ordini al mount e avvia sync automatico
  useEffect(() => {
    loadOrdini();
    
    // Sync automatico all'avvio se abilitato
    if (autoSyncEnabled) {
      // Controlla se è passato abbastanza tempo dall'ultimo sync (5 minuti)
      const lastSync = localStorage.getItem('ordini_last_auto_sync');
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      if (!lastSync || new Date(lastSync).getTime() < fiveMinutesAgo) {
        // Esegui sync automatico dopo 2 secondi (per non bloccare il caricamento iniziale)
        setTimeout(() => {
          handleAutoSync();
        }, 2000);
      }
    }
    
    // Imposta intervallo per sync automatico ogni 10 minuti
    if (autoSyncEnabled) {
      autoSyncIntervalRef.current = setInterval(() => {
        handleAutoSync();
      }, 10 * 60 * 1000); // 10 minuti
    }
    
    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, []);

  // Gestisci cambio auto sync
  useEffect(() => {
    localStorage.setItem('ordini_auto_sync', autoSyncEnabled.toString());
    
    if (autoSyncEnabled && !autoSyncIntervalRef.current) {
      autoSyncIntervalRef.current = setInterval(() => {
        handleAutoSync();
      }, 10 * 60 * 1000);
    } else if (!autoSyncEnabled && autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
    }
  }, [autoSyncEnabled]);

  // Sync automatico in background
  const handleAutoSync = async () => {
    if (isAutoSyncing || isSyncingAll || isLoading) return;
    
    try {
      setIsAutoSyncing(true);
      console.log('🔄 Sync automatico ordini...');
      
      // Verifica credenziali
      let credentials;
      try {
        credentials = getShopifyCredentials();
      } catch (e) {
        console.log('Credenziali Shopify non configurate, skip sync automatico');
        return;
      }
      
      const existingOrders = await loadShopifyOrdersData() || [];
      const existingOrderIds = new Set(existingOrders.map(o => o.id.toString()));

      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: credentials.shopDomain,
          accessToken: credentials.accessToken,
          limit: 50,
          status: 'any',
          daysBack: 3
        })
      });

      // Verifica se la risposta è JSON valido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Sync automatico: Netlify Functions non disponibili (ambiente locale?)');
        return;
      }

      const data = await response.json();
      if (!data.success) {
        console.warn('Sync automatico fallito:', data.error);
        return;
      }

      const newOrders = (data.orders || []).filter(order => 
        !existingOrderIds.has(order.id.toString())
      );

      if (newOrders.length > 0) {
        const convertedOrders = newOrders.map(convertShopifyOrder);
        const allOrders = [...existingOrders, ...convertedOrders];
        await saveShopifyOrdersData(allOrders);
        setOrdini(allOrders);
        setMessage(`🔄 Sync automatico: ${newOrders.length} nuovi ordini`);
        console.log(`✅ Sync automatico: ${newOrders.length} nuovi ordini`);
      } else {
        console.log('✅ Sync automatico: nessun nuovo ordine');
      }
      
      // Salva timestamp ultimo sync
      const now = new Date().toISOString();
      localStorage.setItem('ordini_last_auto_sync', now);
      setLastAutoSync(now);
      
    } catch (err) {
      console.error('Errore sync automatico:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  const loadOrdini = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Caricando ordini Shopify...');
      const data = await loadShopifyOrdersData();
      if (data && data.length > 0) {
        console.log(`✅ Caricati ${data.length} ordini`);
        setOrdini(data);
      }
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
      setError('Errore nel caricamento degli ordini');
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per sincronizzare TUTTI gli ordini
  const handleSyncAllOrders = async () => {
    if (!window.confirm('Sincronizzare TUTTI gli ordini da Shopify? Potrebbe richiedere alcuni minuti.')) return;

    setIsSyncingAll(true);
    setError('');
    setMessage('');
    setSyncProgress({ currentPage: 0, ordersDownloaded: 0, currentStatus: 'Inizializzazione...' });
    abortControllerRef.current = new AbortController();

    try {
      getShopifyCredentials();
      const allOrders = await downloadAllShopifyOrders(
        (progress) => setSyncProgress(progress),
        abortControllerRef.current
      );

      if (allOrders.length === 0) {
        setMessage('Nessun ordine trovato su Shopify');
        return;
      }

      const convertedOrders = allOrders.map(convertShopifyOrder);
      await saveShopifyOrdersData(convertedOrders);
      setOrdini(convertedOrders);
      setMessage(`✅ ${convertedOrders.length} ordini sincronizzati!`);
    } catch (err) {
      if (err.message.includes('annullato')) {
        setMessage('Sincronizzazione annullata');
      } else {
        setError(`Errore: ${err.message}`);
      }
    } finally {
      setIsSyncingAll(false);
      setSyncProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Sincronizza ordini recenti
  const handleSyncRecentOrders = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const credentials = getShopifyCredentials();
      const existingOrders = await loadShopifyOrdersData() || [];
      const existingOrderIds = new Set(existingOrders.map(o => o.id.toString()));

      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: credentials.shopDomain,
          accessToken: credentials.accessToken,
          limit: 100,
          status: 'any',
          daysBack: 7
        })
      });

      // Verifica se la risposta è JSON valido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Netlify Functions non disponibili. Verifica di essere su Netlify o usa "netlify dev" in locale.');
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      const newOrders = (data.orders || []).filter(order => 
        !existingOrderIds.has(order.id.toString())
      );

      if (newOrders.length > 0) {
        const convertedOrders = newOrders.map(convertShopifyOrder);
        const allOrders = [...existingOrders, ...convertedOrders];
        await saveShopifyOrdersData(allOrders);
        setOrdini(allOrders);
        setMessage(`✅ ${newOrders.length} nuovi ordini aggiunti`);
      } else {
        setMessage('Nessun nuovo ordine trovato');
      }
    } catch (err) {
      setError(`Errore: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtri e ordinamento
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...ordini];
    
    // Filtro ricerca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(o => {
        const orderNum = (o.order_number || o.orderNumber || o.name || '').toString().toLowerCase();
        const email = (o.email || o.customerEmail || '').toLowerCase();
        const name = (o.customerName || `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`).toLowerCase();
        const phone = (o.phone || o.customer?.phone || '').toLowerCase();
        return orderNum.includes(search) || email.includes(search) || name.includes(search) || phone.includes(search);
      });
    }
    
    // Filtro status pagamento
    if (statusFilter !== 'all') {
      result = result.filter(o => (o.financial_status || o.financialStatus || o.status) === statusFilter);
    }
    
    // Filtro fulfillment
    if (fulfillmentFilter !== 'all') {
      result = result.filter(o => {
        const status = o.fulfillment_status || o.fulfillmentStatus;
        if (fulfillmentFilter === 'fulfilled') return status === 'fulfilled';
        if (fulfillmentFilter === 'unfulfilled') return !status || status === 'unfulfilled' || status === null;
        if (fulfillmentFilter === 'partial') return status === 'partial';
        return true;
      });
    }
    
    // Filtro data
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(o => new Date(o.created_at || o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      result = result.filter(o => new Date(o.created_at || o.createdAt) <= to);
    }
    
    // Filtro importo
    if (minAmount) {
      result = result.filter(o => parseFloat(o.total_price || o.totalPrice || 0) >= parseFloat(minAmount));
    }
    if (maxAmount) {
      result = result.filter(o => parseFloat(o.total_price || o.totalPrice || 0) <= parseFloat(maxAmount));
    }
    
    // Ordinamento
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'order_number':
          aVal = parseInt(a.order_number || a.orderNumber || 0);
          bVal = parseInt(b.order_number || b.orderNumber || 0);
          break;
        case 'total_price':
          aVal = parseFloat(a.total_price || a.totalPrice || 0);
          bVal = parseFloat(b.total_price || b.totalPrice || 0);
          break;
        case 'customer':
          aVal = (a.customerName || `${a.customer?.first_name || ''} ${a.customer?.last_name || ''}`).toLowerCase();
          bVal = (b.customerName || `${b.customer?.first_name || ''} ${b.customer?.last_name || ''}`).toLowerCase();
          break;
        case 'created_at':
        default:
          aVal = new Date(a.created_at || a.createdAt || 0).getTime();
          bVal = new Date(b.created_at || b.createdAt || 0).getTime();
          break;
      }
      
      if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    
    return result;
  }, [ordini, searchTerm, statusFilter, fulfillmentFilter, dateFrom, dateTo, minAmount, maxAmount, sortField, sortDirection]);

  // Statistiche
  const stats = useMemo(() => {
    const totalValue = filteredAndSortedOrders.reduce((sum, o) => sum + parseFloat(o.total_price || o.totalPrice || 0), 0);
    const paid = filteredAndSortedOrders.filter(o => (o.financial_status || o.financialStatus) === 'paid').length;
    const pending = filteredAndSortedOrders.filter(o => (o.financial_status || o.financialStatus) === 'pending').length;
    const fulfilled = filteredAndSortedOrders.filter(o => (o.fulfillment_status || o.fulfillmentStatus) === 'fulfilled').length;
    const avgOrder = filteredAndSortedOrders.length > 0 ? totalValue / filteredAndSortedOrders.length : 0;
    
    return { total: filteredAndSortedOrders.length, totalValue, paid, pending, fulfilled, avgOrder };
  }, [filteredAndSortedOrders]);

  // Funzione ordinamento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Reset filtri
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFulfillmentFilter('all');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Numero Ordine', 'Data', 'Cliente', 'Email', 'Telefono', 'Status Pagamento', 'Status Spedizione', 'Metodo Spedizione', 'Costo Spedizione', 'Subtotale', 'Sconto', 'Tasse', 'Totale', 'Prodotti', 'Indirizzo', 'Città', 'CAP', 'Provincia', 'Paese'];
    
    const rows = filteredAndSortedOrders.map(o => {
      const shipping = o.shipping || {};
      const products = (o.products || o.line_items || []).map(p => `${p.name || p.title} x${p.quantity}`).join('; ');
      
      return [
        o.order_number || o.orderNumber || o.name,
        new Date(o.created_at || o.createdAt).toLocaleDateString('it-IT'),
        o.customerName || `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim(),
        o.email || o.customerEmail || '',
        o.phone || o.customer?.phone || '',
        o.financial_status || o.financialStatus || '',
        o.fulfillment_status || o.fulfillmentStatus || 'unfulfilled',
        o.shipping_method || '',
        o.shipping_cost || o.shippingPrice || 0,
        o.subtotal || o.subtotal_price || 0,
        o.discount_amount || o.total_discounts || 0,
        o.taxes || o.total_tax || 0,
        o.total_price || o.totalPrice || 0,
        products,
        shipping.address || '',
        shipping.city || '',
        shipping.zip || '',
        shipping.province || '',
        shipping.country || ''
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordini_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Funzione per scalare quantità dal magazzino
  const scalaQuantitaMagazzino = async (order) => {
    try {
      console.log('🔄 Inizio scala quantità per ordine:', order.order_number || order.orderNumber);
      
      // Carica magazzino usando la funzione corretta di magazzinoStorage
      let magazzino = await loadMagazzinoData();
      
      // Se vuoto, prova localStorage come fallback
      if (!magazzino || magazzino.length === 0) {
        magazzino = loadFromLocalStorage('magazzino_data', []);
      }
      
      console.log('📦 Magazzino caricato:', magazzino?.length || 0, 'prodotti');
      
      // Debug: mostra primi 3 prodotti del magazzino per vedere la struttura
      if (magazzino && magazzino.length > 0) {
        console.log('📦 Esempio struttura magazzino:', magazzino.slice(0, 3).map(p => ({
          sku: p.sku,
          barcode: p.barcode,
          nome: p.nome,
          quantita: p.quantita
        })));
      }
      
      // Se il magazzino è ancora vuoto, crea un array vuoto ma continua
      if (!magazzino) {
        magazzino = [];
      }
      
      const products = order.products || order.line_items || [];
      console.log('📦 Prodotti da scalare:', products.length);
      
      const updates = [];
      const notFound = [];
      
      for (const item of products) {
        // L'SKU di Shopify può essere nel campo sku, variant_sku, o barcode
        const sku = (item.sku || item.variant_sku || '').toString().trim();
        const qty = parseInt(item.quantity || 1);
        const productName = item.name || item.title || 'Prodotto senza nome';
        
        console.log(`  → Prodotto: ${productName}`);
        console.log(`    SKU ordine: "${sku}"`);
        
        // Funzione per trovare il prodotto nel magazzino
        // Cerca per: sku, SKU, barcode, Barcode (case-insensitive e con trim)
        const findProductIndex = (searchValue) => {
          if (!searchValue) return -1;
          const searchLower = searchValue.toLowerCase().trim();
          
          return magazzino.findIndex(p => {
            // Cerca in tutti i campi possibili
            const skuMatch = (p.sku || '').toString().toLowerCase().trim() === searchLower;
            const SKUMatch = (p.SKU || '').toString().toLowerCase().trim() === searchLower;
            const barcodeMatch = (p.barcode || '').toString().toLowerCase().trim() === searchLower;
            const BarcodeMatch = (p.Barcode || '').toString().toLowerCase().trim() === searchLower;
            const eanMatch = (p.ean || '').toString().toLowerCase().trim() === searchLower;
            const EANMatch = (p.EAN || '').toString().toLowerCase().trim() === searchLower;
            
            if (skuMatch || SKUMatch || barcodeMatch || BarcodeMatch || eanMatch || EANMatch) {
              console.log(`    ✓ TROVATO nel magazzino: ${p.nome || p.sku}`);
              return true;
            }
            return false;
          });
        };
        
        let prodIndex = -1;
        
        // Prima cerca per SKU
        if (sku) {
          prodIndex = findProductIndex(sku);
        }
        
        // Se non trovato, prova a cercare per nome (parziale)
        if (prodIndex === -1 && productName) {
          const nameLower = productName.toLowerCase().trim();
          prodIndex = magazzino.findIndex(p => {
            const pName = (p.nome || p.name || p.title || '').toLowerCase().trim();
            // Match esatto o contenuto
            return pName === nameLower || pName.includes(nameLower) || nameLower.includes(pName);
          });
          if (prodIndex !== -1) {
            console.log(`    ✓ TROVATO per nome: ${magazzino[prodIndex].nome}`);
          }
        }
        
        if (prodIndex === -1) {
          // Prodotto non trovato - lo aggiungiamo con quantità negativa
          console.log(`    ✗ NON TROVATO - creo nuovo con quantità negativa`);
          const newProduct = {
            sku: sku || `AUTO_${Date.now()}`,
            barcode: sku,
            nome: productName,
            quantita: -qty,
            quantity: -qty,
            prezzo: parseFloat(item.price || 0)
          };
          magazzino.push(newProduct);
          updates.push({ sku: newProduct.sku, name: productName, oldQty: 0, newQty: -qty, created: true, product: newProduct });
        } else {
          // Scala la quantità (può andare in negativo)
          const oldQty = parseInt(magazzino[prodIndex].quantita || magazzino[prodIndex].quantity || 0);
          const newQty = oldQty - qty;
          magazzino[prodIndex].quantita = newQty;
          magazzino[prodIndex].quantity = newQty;
          updates.push({ 
            sku: magazzino[prodIndex].sku || magazzino[prodIndex].barcode || 'N/A', 
            name: productName, 
            oldQty, 
            newQty, 
            created: false,
            product: magazzino[prodIndex]
          });
          console.log(`    ✓ SCALATO: ${oldQty} → ${newQty}`);
        }
      }
      
      // SALVA SOLO I PRODOTTI MODIFICATI (più efficiente, evita rate limiting Firebase)
      const prodottiModificati = updates.map(u => u.product).filter(Boolean);
      console.log(`💾 Salvando ${prodottiModificati.length} prodotti modificati...`);
      
      const saveResult = await saveModifiedProducts(prodottiModificati);
      if (saveResult.success) {
        console.log('💾 Prodotti salvati su Firebase e localStorage');
      } else {
        console.warn('⚠️ Errore salvataggio Firebase');
      }
      
      console.log('✅ Quantità scalate:', updates.length, 'prodotti aggiornati');
      console.log('📊 Riepilogo aggiornamenti:', updates);
      
      return { success: true, updates, notFound, magazzinoSize: magazzino.length };
    } catch (error) {
      console.error('❌ Errore scala quantità:', error);
      return { success: false, message: error.message };
    }
  };

  // Stampa ricevuta - MARCA COME SPEDITO E SCALA QUANTITÀ
  // Apre il modal di evasione ordine
  const handlePrintReceipt = (order) => {
    const products = order.products || order.line_items || [];
    
    // Inizializza prodotti con stato evasione
    const prodottiConStato = products.map((p, idx) => ({
      ...p,
      id: p.id || idx,
      sku: p.sku || p.variant_sku || '',
      name: p.name || p.title || 'Prodotto',
      quantity: parseInt(p.quantity || 1),
      evaso: order.receiptPrinted ? parseInt(p.quantity || 1) : 0, // Se già stampato, tutto evaso
      price: parseFloat(p.price || 0),
      scanned: false
    }));
    
    setEvasioneOrder(order);
    setEvasioneProdotti(prodottiConStato);
    setShowEvasioneModal(true);
    setScannerInput('');
    
    // Focus su input scanner dopo apertura modal
    setTimeout(() => {
      if (scannerInputRef.current) {
        scannerInputRef.current.focus();
      }
    }, 100);
  };

  // Gestisce scansione SKU
  const handleScanSku = (e) => {
    if (e.key === 'Enter' && scannerInput.trim()) {
      const scannedSku = scannerInput.trim().toLowerCase();
      
      // Cerca il prodotto con questo SKU
      const prodIdx = evasioneProdotti.findIndex(p => {
        const pSku = (p.sku || '').toLowerCase().trim();
        const pBarcode = (p.barcode || '').toLowerCase().trim();
        return pSku === scannedSku || pBarcode === scannedSku || 
               pSku.includes(scannedSku) || scannedSku.includes(pSku);
      });
      
      if (prodIdx !== -1) {
        const prod = evasioneProdotti[prodIdx];
        if (prod.evaso < prod.quantity) {
          // Incrementa quantità evasa
          const updated = [...evasioneProdotti];
          updated[prodIdx] = {
            ...prod,
            evaso: prod.evaso + 1,
            scanned: true
          };
          setEvasioneProdotti(updated);
          setMessage(`✓ Scansionato: ${prod.name} (${prod.evaso + 1}/${prod.quantity})`);
        } else {
          setMessage(`⚠️ ${prod.name} già completamente evaso`);
        }
      } else {
        setMessage(`❌ SKU "${scannerInput}" non trovato in questo ordine`);
      }
      
      setScannerInput('');
    }
  };

  // Toggle evasione prodotto manuale
  const toggleEvasioneProdotto = (prodId, increment = true) => {
    const updated = evasioneProdotti.map(p => {
      if (p.id === prodId) {
        const newEvaso = increment 
          ? Math.min(p.evaso + 1, p.quantity)
          : Math.max(p.evaso - 1, 0);
        return { ...p, evaso: newEvaso };
      }
      return p;
    });
    setEvasioneProdotti(updated);
  };

  // Evadi tutto
  const evadiTutto = () => {
    const updated = evasioneProdotti.map(p => ({ ...p, evaso: p.quantity }));
    setEvasioneProdotti(updated);
  };

  // Reset evasione
  const resetEvasione = () => {
    const updated = evasioneProdotti.map(p => ({ ...p, evaso: 0, scanned: false }));
    setEvasioneProdotti(updated);
  };

  // Conferma evasione e stampa
  const confermaEvasione = async () => {
    const order = evasioneOrder;
    const orderNum = order.order_number || order.orderNumber || order.name;
    
    // Calcola stato evasione
    const totaleOrdinato = evasioneProdotti.reduce((sum, p) => sum + p.quantity, 0);
    const totaleEvaso = evasioneProdotti.reduce((sum, p) => sum + p.evaso, 0);
    const isCompleta = totaleEvaso === totaleOrdinato;
    const isParziale = totaleEvaso > 0 && totaleEvaso < totaleOrdinato;
    
    if (totaleEvaso === 0) {
      setMessage('❌ Seleziona almeno un prodotto da evadere');
      return;
    }
    
    // Prepara prodotti da scalare (solo quelli evasi)
    const prodottiDaScalare = evasioneProdotti
      .filter(p => p.evaso > 0)
      .map(p => ({ ...p, quantity: p.evaso }));
    
    // Scala quantità dal magazzino
    const orderPerScala = { ...order, products: prodottiDaScalare };
    const scalaResult = await scalaQuantitaMagazzino(orderPerScala);
    
    let stockMessage = '';
    if (scalaResult.success) {
      const negativeProducts = scalaResult.updates.filter(u => u.newQty < 0);
      if (negativeProducts.length > 0) {
        const negList = negativeProducts.map(n => `${n.sku}: ${n.newQty}`).join(', ');
        stockMessage = ` | ⚠️ IN NEGATIVO: ${negList}`;
      }
    }
    
    // Aggiorna ordine
    const updatedOrder = {
      ...order,
      fulfillment_status: isCompleta ? 'fulfilled' : 'partial',
      fulfillmentStatus: isCompleta ? 'fulfilled' : 'partial',
      is_shipped: isCompleta,
      shipped_at: isCompleta ? new Date().toISOString() : order.shipped_at,
      receiptPrinted: true,
      receiptPrintedAt: new Date().toISOString(),
      stockUpdates: scalaResult.success ? scalaResult.updates : [],
      evasioneDetails: {
        totaleOrdinato,
        totaleEvaso,
        isCompleta,
        isParziale,
        prodottiEvasi: evasioneProdotti.map(p => ({
          sku: p.sku,
          name: p.name,
          ordinato: p.quantity,
          evaso: p.evaso
        })),
        dataEvasione: new Date().toISOString()
      }
    };
    
    // Aggiorna stato locale
    const updatedOrdini = ordini.map(o => o.id === order.id ? updatedOrder : o);
    setOrdini(updatedOrdini);
    
    // Salva SOLO l'ordine modificato (non tutti gli 8948!)
    await saveSingleShopifyOrder(updatedOrder);
    
    // Chiudi modal
    setShowEvasioneModal(false);
    
    // Messaggio
    const tipoEvasione = isCompleta ? 'COMPLETA' : 'PARZIALE';
    setMessage(`✅ Evasione ${tipoEvasione} - Ordine #${orderNum} | ${totaleEvaso}/${totaleOrdinato} prodotti${stockMessage}`);
    
    // Stampa documento
    proceedWithPrint(updatedOrder, evasioneProdotti);
  };
  
  // Funzione separata per la stampa - Design premium con logo Maison Victorio
  const proceedWithPrint = (order, prodottiEvasi = null) => {
    setPrintingOrder(order);
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Abilita i popup per stampare');
        return;
      }
      
      const orderNum = order.order_number || order.orderNumber || order.name;
      const customerName = order.customerName || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
      const shipping = order.shipping || order.shipping_address || {};
      const shippingAddr = shipping.address1 || shipping.address || '';
      const shippingCity = shipping.city || '';
      const shippingZip = shipping.zip || shipping.postal_code || '';
      const shippingProvince = shipping.province || shipping.province_code || '';
      const shippingCountry = shipping.country || '';
      const shippingName = shipping.name || `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() || customerName;
      
      // Usa prodotti evasi se disponibili, altrimenti tutti i prodotti
      const products = prodottiEvasi || order.products || order.line_items || [];
      const totalPrice = parseFloat(order.total_price || order.totalPrice || 0);
      const subtotal = parseFloat(order.subtotal || order.subtotal_price || 0);
      const shippingCost = parseFloat(order.shipping_cost || order.shippingPrice || 0);
      const discount = parseFloat(order.discount_amount || order.total_discounts || 0);
      const taxes = parseFloat(order.taxes || order.total_tax || 0);
      
      // Calcola stato evasione
      const evasione = order.evasioneDetails || null;
      const isEvasioneParziale = evasione?.isParziale || false;
      const logoUrl = 'https://maisonvictorio.com/cdn/shop/files/profumi_maison_victorio_logo.png?v=1730933628&width=400';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ordine #${orderNum} - Maison Victorio</title>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 210mm;
              min-height: 297mm;
              font-family: 'Inter', -apple-system, sans-serif;
              font-size: 11px;
              color: #2d2d2d;
              background: #fff;
              line-height: 1.4;
            }
            body {
              padding: 8mm;
            }
            .page {
              width: 100%;
              max-height: 277mm;
              overflow: hidden;
            }
            
            /* Header compatto */
            .header { 
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-bottom: 12px; 
              margin-bottom: 12px;
              border-bottom: 2px solid #c68776;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo {
              height: 40px;
              width: auto;
            }
            .header-info {
              text-align: left;
            }
            .document-title {
              font-family: 'Playfair Display', serif;
              font-size: 9px;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #c68776;
            }
            .order-number {
              font-family: 'Playfair Display', serif;
              font-size: 18px;
              font-weight: 600;
              color: #2d2d2d;
            }
            .header-right {
              text-align: right;
            }
            .order-date {
              font-size: 10px;
              color: #666;
            }
            .evasione-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 9px;
              font-weight: 600;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              margin-top: 5px;
            }
            .evasione-completa {
              background: #059669;
              color: white;
            }
            .evasione-parziale {
              background: #f59e0b;
              color: white;
            }
            
            /* Info grid compatto */
            .info-section {
              display: flex;
              gap: 15px;
              margin-bottom: 12px;
            }
            .info-box {
              flex: 1;
              background: #f9f7f6;
              padding: 10px 12px;
              border-radius: 6px;
              border-left: 3px solid #c68776;
            }
            .info-box h4 {
              font-size: 8px;
              color: #c68776;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            .info-box p {
              font-size: 10px;
              color: #2d2d2d;
              margin: 0;
              line-height: 1.3;
            }
            .info-box .name {
              font-weight: 600;
              font-size: 11px;
            }
            
            /* Tabella prodotti compatta */
            .products-section {
              margin-bottom: 12px;
            }
            .section-title { 
              font-size: 9px;
              font-weight: 600;
              color: #c68776;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px solid #e8e0dc;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
            }
            th { 
              background: #c68776;
              color: white;
              padding: 6px 8px; 
              text-align: left; 
              font-size: 8px;
              font-weight: 600;
              text-transform: uppercase;
            }
            th:first-child { border-radius: 4px 0 0 0; }
            th:last-child { border-radius: 0 4px 0 0; }
            td { 
              padding: 6px 8px; 
              border-bottom: 1px solid #eee;
              font-size: 10px;
              vertical-align: middle;
            }
            .product-name {
              font-weight: 500;
            }
            .product-variant {
              font-size: 9px;
              color: #888;
            }
            .sku-badge {
              font-family: monospace;
              font-size: 9px;
              color: #666;
              background: #f0f0f0;
              padding: 1px 4px;
              border-radius: 3px;
            }
            .qty-cell {
              text-align: center;
              font-weight: 600;
            }
            .price-cell {
              text-align: right;
              font-weight: 500;
            }
            
            /* Totali e Footer in una riga */
            .bottom-section {
              display: flex;
              gap: 15px;
              margin-top: 12px;
            }
            .totals {
              flex: 1;
              background: #f9f7f6;
              padding: 10px 12px;
              border-radius: 6px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 10px;
              color: #555;
            }
            .total-row.final {
              border-top: 2px solid #c68776;
              margin-top: 6px;
              padding-top: 8px;
              font-size: 14px;
              font-weight: 700;
              color: #c68776;
            }
            .free-shipping { color: #059669; }
            .discount { color: #059669; }
            
            .footer-box {
              flex: 1;
              text-align: center;
              padding: 10px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .footer-logo {
              height: 30px;
              opacity: 0.5;
              margin-bottom: 6px;
            }
            .footer-text {
              font-family: 'Playfair Display', serif;
              font-size: 11px;
              color: #c68776;
            }
            .footer-subtext {
              font-size: 8px;
              color: #999;
              margin-top: 2px;
            }
            
            /* Note compatta */
            .note-box {
              background: #fffbeb;
              border: 1px solid #fcd34d;
              border-radius: 4px;
              padding: 6px 10px;
              margin-top: 10px;
              font-size: 9px;
              color: #92400e;
            }
            
            @media print {
              html, body { 
                width: 210mm;
                height: 297mm;
              }
              .page { 
                page-break-after: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="header-left">
                <img src="${logoUrl}" alt="Maison Victorio" class="logo">
                <div class="header-info">
                  <div class="document-title">Documento di Trasporto</div>
                  <div class="order-number">Ordine #${orderNum}</div>
                </div>
              </div>
              <div class="header-right">
                <div class="order-date">${new Date(order.created_at || order.createdAt).toLocaleDateString('it-IT', { 
                  day: '2-digit', month: 'long', year: 'numeric'
                })}</div>
                ${isEvasioneParziale ? 
                  `<span class="evasione-badge evasione-parziale">⚠ Parziale ${evasione.totaleEvaso}/${evasione.totaleOrdinato}</span>` :
                  `<span class="evasione-badge evasione-completa">✓ Completa</span>`
                }
              </div>
            </div>

            <div class="info-section">
              <div class="info-box">
                <h4>Cliente</h4>
                <p class="name">${customerName || 'N/A'}</p>
                <p>${order.email || order.customerEmail || ''}</p>
                ${(order.phone || order.customer?.phone) ? `<p>${order.phone || order.customer?.phone}</p>` : ''}
              </div>
              <div class="info-box">
                <h4>Spedire a</h4>
                <p class="name">${shippingName}</p>
                <p>${shippingAddr}</p>
                <p>${shippingZip} ${shippingCity} ${shippingProvince}</p>
                <p>${shippingCountry}</p>
              </div>
            </div>

            <div class="products-section">
              <div class="section-title">Prodotti</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40%">Prodotto</th>
                    <th style="width: 22%">SKU</th>
                    <th style="width: 8%">Qtà</th>
                    <th style="width: 15%">Prezzo</th>
                    <th style="width: 15%">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  ${products.map(p => {
                    const price = parseFloat(p.price || 0);
                    const qtyOrdinata = parseInt(p.quantity || 0);
                    const qtyEvasa = p.evaso !== undefined ? parseInt(p.evaso) : qtyOrdinata;
                    const isParziale = qtyEvasa < qtyOrdinata;
                    return `
                      <tr>
                        <td>
                          <div class="product-name">${p.name || p.title}</div>
                          ${p.variant_title ? `<div class="product-variant">${p.variant_title}</div>` : ''}
                        </td>
                        <td><span class="sku-badge">${p.sku || '-'}</span></td>
                        <td class="qty-cell">${qtyEvasa}${isParziale ? `<span style="color:#888;font-size:8px">/${qtyOrdinata}</span>` : ''}</td>
                        <td class="price-cell">€${price.toFixed(2)}</td>
                        <td class="price-cell"><strong>€${(price * qtyEvasa).toFixed(2)}</strong></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="bottom-section">
              <div class="totals">
                <div class="total-row">
                  <span>Subtotale</span>
                  <span>€${subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Spedizione</span>
                  ${shippingCost > 0 ? 
                    `<span>€${shippingCost.toFixed(2)}</span>` : 
                    `<span class="free-shipping">Gratuita</span>`
                  }
                </div>
                ${discount > 0 ? `
                <div class="total-row discount">
                  <span>Sconto</span>
                  <span>-€${discount.toFixed(2)}</span>
                </div>
                ` : ''}
                ${taxes > 0 ? `
                <div class="total-row">
                  <span>IVA</span>
                  <span>€${taxes.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row final">
                  <span>TOTALE</span>
                  <span>€${totalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              <div class="footer-box">
                <img src="${logoUrl}" alt="Maison Victorio" class="footer-logo">
                <div class="footer-text">Grazie per aver scelto Maison Victorio</div>
                <div class="footer-subtext">L'arte della profumeria di nicchia</div>
              </div>
            </div>

            ${isEvasioneParziale ? `
            <div class="note-box">
              ⚠️ <strong>Evasione Parziale:</strong> I prodotti rimanenti verranno spediti appena disponibili.
            </div>
            ` : ''}
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.write(html);
      printWindow.document.close();
      setPrintingOrder(null);
    }, 100);
  };

  // Format helpers
  const formatPrice = (price) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(parseFloat(price || 0));
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
  const formatDateTime = (date) => date ? new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  // Status badge component
  const StatusBadge = ({ status, type = 'payment' }) => {
    let bgColor, textColor, label;
    
    if (type === 'payment') {
      switch (status) {
        case 'paid': bgColor = 'bg-green-100'; textColor = 'text-green-700'; label = 'Pagato'; break;
        case 'pending': bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; label = 'In Attesa'; break;
        case 'refunded': bgColor = 'bg-purple-100'; textColor = 'text-purple-700'; label = 'Rimborsato'; break;
        case 'partially_refunded': bgColor = 'bg-orange-100'; textColor = 'text-orange-700'; label = 'Parz. Rimborsato'; break;
        case 'cancelled': bgColor = 'bg-red-100'; textColor = 'text-red-700'; label = 'Cancellato'; break;
        default: bgColor = 'bg-gray-100'; textColor = 'text-gray-700'; label = status || 'N/A';
      }
    } else {
      switch (status) {
        case 'fulfilled': bgColor = 'bg-green-100'; textColor = 'text-green-700'; label = '✓ Spedito'; break;
        case 'partial': bgColor = 'bg-blue-100'; textColor = 'text-blue-700'; label = 'Parziale'; break;
        default: bgColor = 'bg-orange-100'; textColor = 'text-orange-700'; label = '○ Non Spedito';
      }
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-7 h-7 text-blue-600" />
                Gestione Ordini
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {stats.total} ordini • {formatPrice(stats.totalValue)} totale
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {!isSyncingAll ? (
                <>
                  <button
                    onClick={handleSyncRecentOrders}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Sincronizza Recenti
                  </button>
                  <button
                    onClick={handleSyncAllOrders}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Scarica Tutti
                  </button>
                </>
              ) : (
                <button
                  onClick={() => abortControllerRef.current?.abort()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <StopCircle className="w-4 h-4" />
                  Annulla
                </button>
              )}
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Esporta CSV
              </button>
            </div>
          </div>
          
          {/* Barra stato sync automatico */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Sync Automatico</span>
              </label>
              
              {autoSyncEnabled && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  {isAutoSyncing ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                      Sincronizzazione in corso...
                    </>
                  ) : lastAutoSync ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Ultimo sync: {new Date(lastAutoSync).toLocaleTimeString('it-IT')}
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-gray-400" />
                      In attesa del primo sync...
                    </>
                  )}
                </span>
              )}
            </div>
            
            {autoSyncEnabled && (
              <button
                onClick={handleAutoSync}
                disabled={isAutoSyncing}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isAutoSyncing ? 'animate-spin' : ''}`} />
                Sync Ora
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress sync */}
      {syncProgress && (
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-800 font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sincronizzazione in corso...
            </span>
            <span className="text-blue-600 text-sm">{syncProgress.ordersDownloaded} ordini</span>
          </div>
          <div className="text-sm text-blue-700 mb-2">{syncProgress.currentStatus}</div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${Math.min((syncProgress.currentPage || 0) * 5, 100)}%` }}></div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {message && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-700">{message}</span>
          <button onClick={() => setMessage('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-100 text-xs">Totale Ordini</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <Database className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-100 text-xs">Valore Totale</p>
                  <p className="text-2xl font-bold mt-1">{formatPrice(stats.totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-emerald-100 text-xs">Pagati</p>
                  <p className="text-2xl font-bold mt-1">{stats.paid}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-yellow-100 text-xs">In Attesa</p>
                  <p className="text-2xl font-bold mt-1">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-purple-100 text-xs">Spediti</p>
                  <p className="text-2xl font-bold mt-1">{stats.fulfilled}</p>
                </div>
                <Truck className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-indigo-100 text-xs">Media Ordine</p>
                  <p className="text-2xl font-bold mt-1">{formatPrice(stats.avgOrder)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtri */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Ricerca */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cerca per numero ordine, email, nome, telefono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Status Pagamento */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti gli status</option>
                <option value="paid">Pagato</option>
                <option value="pending">In Attesa</option>
                <option value="refunded">Rimborsato</option>
                <option value="cancelled">Cancellato</option>
              </select>
              
              {/* Fulfillment */}
              <select
                value={fulfillmentFilter}
                onChange={(e) => setFulfillmentFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutte le spedizioni</option>
                <option value="fulfilled">Spedito</option>
                <option value="unfulfilled">Non Spedito</option>
                <option value="partial">Parziale</option>
              </select>
              
              {/* Toggle filtri avanzati */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 border rounded-lg flex items-center gap-2 ${showFilters ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                <Filter className="w-4 h-4" />
                Filtri Avanzati
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Reset */}
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
            </div>
            
            {/* Filtri avanzati */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data a</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo min (€)</label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo max (€)</label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="9999"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabella Ordini */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Ordini ({filteredAndSortedOrders.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && ordini.length === 0 ? (
              <div className="flex justify-center items-center py-16">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Caricamento ordini...</span>
              </div>
            ) : filteredAndSortedOrders.length === 0 ? (
              <div className="text-center py-16">
                <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nessun ordine trovato</p>
                <p className="text-gray-400 text-sm mt-1">Prova a modificare i filtri</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => handleSort('order_number')} className="flex items-center gap-1 font-medium text-xs text-gray-500 uppercase">
                          Ordine <SortIcon field="order_number" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => handleSort('customer')} className="flex items-center gap-1 font-medium text-xs text-gray-500 uppercase">
                          Cliente <SortIcon field="customer" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 font-medium text-xs text-gray-500 uppercase">
                          Data <SortIcon field="created_at" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-xs text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-xs text-gray-500 uppercase">Spedizione</th>
                      <th className="px-4 py-3 text-right">
                        <button onClick={() => handleSort('total_price')} className="flex items-center gap-1 font-medium text-xs text-gray-500 uppercase ml-auto">
                          Totale <SortIcon field="total_price" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-xs text-gray-500 uppercase">Prodotti</th>
                      <th className="px-4 py-3 text-center font-medium text-xs text-gray-500 uppercase">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAndSortedOrders.map((order) => {
                      const orderNumber = order.order_number || order.orderNumber || order.name;
                      const customerName = order.customerName || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'N/A';
                      const email = order.email || order.customerEmail || '';
                      const status = order.financial_status || order.financialStatus || order.status;
                      const fulfillment = order.fulfillment_status || order.fulfillmentStatus;
                      const totalPrice = order.total_price || order.totalPrice || 0;
                      const shippingCost = order.shipping_cost || order.shippingPrice || 0;
                      const productsCount = (order.products || order.line_items || []).length;
                      
                      return (
                        <tr 
                          key={order.id} 
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-blue-600">#{orderNumber}</div>
                            <div className="text-xs text-gray-400">ID: {order.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{customerName}</div>
                            <div className="text-xs text-gray-500">{email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{formatDate(order.created_at || order.createdAt)}</div>
                            <div className="text-xs text-gray-400">{new Date(order.created_at || order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={status} type="payment" />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={fulfillment} type="fulfillment" />
                            <div className="text-xs text-gray-500 mt-1">
                              {parseFloat(shippingCost) === 0 ? '🎁 Gratuita' : formatPrice(shippingCost)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-lg font-bold text-gray-900">{formatPrice(totalPrice)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-gray-100 px-2 py-1 rounded text-sm">{productsCount}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1 items-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setShowOrderModal(true); }}
                                className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                                title="Dettagli"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePrintReceipt(order); }}
                                className={`p-2 rounded-lg flex items-center gap-1 ${
                                  order.receiptPrinted 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'hover:bg-gray-100 text-gray-600'
                                }`}
                                title={order.receiptPrinted 
                                  ? `Stampato il ${new Date(order.receiptPrintedAt).toLocaleDateString('it-IT')}` 
                                  : 'Stampa Ricevuta (scala quantità)'
                                }
                              >
                                <Printer className="w-4 h-4" />
                                {order.receiptPrinted && <CheckCircle className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Dettaglio Ordine */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Package className="w-7 h-7" />
                    Ordine #{selectedOrder.order_number || selectedOrder.orderNumber || selectedOrder.name}
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {formatDateTime(selectedOrder.created_at || selectedOrder.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePrintReceipt(selectedOrder)}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Stampa Ricevuta
                  </button>
                  <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <StatusBadge status={selectedOrder.financial_status || selectedOrder.financialStatus} type="payment" />
                <StatusBadge status={selectedOrder.fulfillment_status || selectedOrder.fulfillmentStatus} type="fulfillment" />
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonna 1: Cliente e Info */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="bg-purple-50">
                      <CardTitle className="flex items-center gap-2 text-purple-800">
                        <User className="w-5 h-5" /> Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {selectedOrder.customerName || `${selectedOrder.customer?.first_name || ''} ${selectedOrder.customer?.last_name || ''}`.trim() || 'N/A'}
                        </span>
                      </div>
                      {(selectedOrder.email || selectedOrder.customerEmail) && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a href={`mailto:${selectedOrder.email || selectedOrder.customerEmail}`} className="text-blue-600 hover:underline">
                            {selectedOrder.email || selectedOrder.customerEmail}
                          </a>
                        </div>
                      )}
                      {(selectedOrder.phone || selectedOrder.customer?.phone) && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a href={`tel:${selectedOrder.phone || selectedOrder.customer?.phone}`} className="text-blue-600 hover:underline">
                            {selectedOrder.phone || selectedOrder.customer?.phone}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="bg-green-50">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Truck className="w-5 h-5" /> Spedizione
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedOrder.shipping?.name && <p className="font-semibold">{selectedOrder.shipping.name}</p>}
                      {selectedOrder.shipping?.address && <p>{selectedOrder.shipping.address}</p>}
                      <p>{[selectedOrder.shipping?.zip, selectedOrder.shipping?.city, selectedOrder.shipping?.province].filter(Boolean).join(' ')}</p>
                      {selectedOrder.shipping?.country && <p className="text-gray-600">{selectedOrder.shipping.country}</p>}
                      
                      <div className="pt-3 border-t mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Metodo:</span>
                          <span className="font-medium">{selectedOrder.shipping_method || 'Standard'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Costo:</span>
                          <span className={`font-medium ${parseFloat(selectedOrder.shipping_cost || selectedOrder.shippingPrice || 0) === 0 ? 'text-green-600' : ''}`}>
                            {parseFloat(selectedOrder.shipping_cost || selectedOrder.shippingPrice || 0) === 0 ? '🎁 Gratuita' : formatPrice(selectedOrder.shipping_cost || selectedOrder.shippingPrice)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Colonna 2: Prodotti */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="bg-indigo-50">
                      <CardTitle className="flex items-center gap-2 text-indigo-800">
                        <Box className="w-5 h-5" /> Prodotti ({(selectedOrder.products || selectedOrder.line_items || []).length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {(selectedOrder.products || selectedOrder.line_items || []).map((item, idx) => {
                          const price = parseFloat(item.price || 0);
                          const qty = parseInt(item.quantity || 1);
                          return (
                            <div key={item.id || idx} className="p-4 hover:bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{item.name || item.title}</h4>
                                  {item.variant_title && <p className="text-sm text-gray-500">Variante: {item.variant_title}</p>}
                                  <div className="flex gap-4 mt-2 text-sm">
                                    <span className="text-gray-500">SKU: <code className="bg-gray-100 px-1 rounded">{item.sku || 'N/A'}</code></span>
                                    <span className="text-gray-500">Qtà: <strong>{qty}</strong></span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">{formatPrice(price * qty)}</div>
                                  <div className="text-sm text-gray-500">{qty} × {formatPrice(price)}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Totali */}
                      <div className="bg-gray-50 p-4 border-t">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotale:</span>
                            <span>{formatPrice(selectedOrder.subtotal || selectedOrder.subtotal_price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Spedizione:</span>
                            <span>{parseFloat(selectedOrder.shipping_cost || selectedOrder.shippingPrice || 0) === 0 ? 'Gratuita' : formatPrice(selectedOrder.shipping_cost || selectedOrder.shippingPrice)}</span>
                          </div>
                          {parseFloat(selectedOrder.discount_amount || selectedOrder.total_discounts || 0) > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Sconto:</span>
                              <span>-{formatPrice(selectedOrder.discount_amount || selectedOrder.total_discounts)}</span>
                            </div>
                          )}
                          {parseFloat(selectedOrder.taxes || selectedOrder.total_tax || 0) > 0 && (
                            <div className="flex justify-between">
                              <span>IVA:</span>
                              <span>{formatPrice(selectedOrder.taxes || selectedOrder.total_tax)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-3 border-t text-lg font-bold">
                            <span>TOTALE:</span>
                            <span className="text-blue-600">{formatPrice(selectedOrder.total_price || selectedOrder.totalPrice)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Evasione Ordine */}
      {showEvasioneModal && evasioneOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#c68776] to-[#b07567] px-6 py-5 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">Evasione Ordine</h2>
                  <p className="text-white/80 text-sm mt-1">
                    #{evasioneOrder.order_number || evasioneOrder.orderNumber || evasioneOrder.name}
                  </p>
                </div>
                <button 
                  onClick={() => setShowEvasioneModal(false)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Scanner Input */}
              <div className="mt-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c68776]" />
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      onKeyDown={handleScanSku}
                      placeholder="Scansiona o digita SKU/Barcode e premi INVIO..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                      autoFocus
                    />
                  </div>
                </div>
                <p className="text-white/60 text-xs mt-2">
                  Scansiona i prodotti per aggiungerli automaticamente all'evasione
                </p>
              </div>
            </div>

            {/* Contenuto */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Azioni Rapide */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={evadiTutto}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Evadi Tutto
                </button>
                <button
                  onClick={resetEvasione}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              {/* Lista Prodotti */}
              <div className="space-y-3">
                {evasioneProdotti.map((prod, idx) => {
                  const isComplete = prod.evaso === prod.quantity;
                  const isParziale = prod.evaso > 0 && prod.evaso < prod.quantity;
                  
                  return (
                    <div 
                      key={prod.id || idx}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isComplete 
                          ? 'bg-green-50 border-green-300' 
                          : isParziale 
                            ? 'bg-yellow-50 border-yellow-300'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isComplete && <CheckCircle className="w-5 h-5 text-green-600" />}
                            {isParziale && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                            <h4 className="font-semibold text-gray-900">{prod.name}</h4>
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-gray-500">
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{prod.sku || 'N/A'}</span>
                            {prod.variant_title && <span>{prod.variant_title}</span>}
                            <span>€{prod.price.toFixed(2)} cad.</span>
                          </div>
                          {prod.scanned && (
                            <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              <Zap className="w-3 h-3" /> Scansionato
                            </span>
                          )}
                        </div>
                        
                        {/* Controlli Quantità */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleEvasioneProdotto(prod.id, false)}
                            disabled={prod.evaso === 0}
                            className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-40 flex items-center justify-center font-bold text-xl"
                          >
                            −
                          </button>
                          <div className="text-center min-w-[80px]">
                            <div className="text-2xl font-bold text-gray-900">
                              {prod.evaso}<span className="text-gray-400">/{prod.quantity}</span>
                            </div>
                            <div className="text-xs text-gray-500">evasi</div>
                          </div>
                          <button
                            onClick={() => toggleEvasioneProdotto(prod.id, true)}
                            disabled={prod.evaso >= prod.quantity}
                            className="w-10 h-10 rounded-full bg-[#c68776] hover:bg-[#b07567] disabled:opacity-40 text-white flex items-center justify-center font-bold text-xl"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  {(() => {
                    const totOrd = evasioneProdotti.reduce((s, p) => s + p.quantity, 0);
                    const totEva = evasioneProdotti.reduce((s, p) => s + p.evaso, 0);
                    const perc = totOrd > 0 ? Math.round((totEva / totOrd) * 100) : 0;
                    return (
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${perc === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: `${perc}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          <strong>{totEva}</strong> / {totOrd} prodotti ({perc}%)
                        </span>
                        {perc < 100 && perc > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium">
                            EVASIONE PARZIALE
                          </span>
                        )}
                        {perc === 100 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                            EVASIONE COMPLETA
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEvasioneModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confermaEvasione}
                    disabled={evasioneProdotti.reduce((s, p) => s + p.evaso, 0) === 0}
                    className="px-6 py-2 bg-[#c68776] text-white rounded-lg hover:bg-[#b07567] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    <Printer className="w-4 h-4" />
                    Conferma e Stampa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdiniPage;
