import React, { useState, useEffect } from 'react';
import { fetchShopifyOrders, convertShopifyOrder, getShopifyCredentials } from '../lib/shopifyAPI';
import { loadMagazzino, saveMagazzino } from '../lib/firebase';
import { saveLargeData, loadLargeData, cleanupOldData } from '../lib/dataManager';
import { safeIncludes } from '../lib/utils';
import { getOrdersLimit } from '../config/shopify';
import { Download, RefreshCw, AlertCircle, Filter, TrendingUp, Clock, Database, Archive } from 'lucide-react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { addDays, startOfDay, endOfDay, setHours, setMinutes, setSeconds } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';

const OrdiniPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ count: 0, page: 1, active: false });
  
  // Nuovi stati per sincronizzazione avanzata
  const [syncProgress, setSyncProgress] = useState({
    isRunning: false,
    currentPage: 0,
    totalPages: 0,
    ordersDownloaded: 0,
    totalOrders: 0,
    currentStatus: ''
  });
  
  const [abortController, setAbortController] = useState(null);
  
  const [sortBy, setSortBy] = useState('date');
  const [range, setRange] = useState({
    startDate: startOfDay(addDays(new Date(), -30)),
    endDate: endOfDay(new Date()),
    key: 'selection',
  });
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [syncAll, setSyncAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipologia, setFilterTipologia] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPerfume, setFilterPerfume] = useState('all');
  const [availableTipologie, setAvailableTipologie] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        // Prima carica da localStorage per mostrare subito qualcosa
        const parsedOrders = await loadLargeData('shopify_orders');
        setOrders(parsedOrders);
        console.log(`✅ Caricati ${parsedOrders.length} ordini da localStorage`);
        
        // Poi sincronizza automaticamente con Shopify per avere i dati più recenti
        if (parsedOrders.length === 0) {
          console.log('🔄 Nessun ordine in locale, avvio sincronizzazione automatica...');
          await handleSyncOrdersComplete(); // Sincronizzazione completa
        } else {
          console.log('🔄 Ordini presenti in locale, sincronizzazione incrementale...');
          await handleSyncOrdersIncremental(); // Sincronizzazione incrementale (ultimi 7 giorni)
        }
        
        // Pulisci dati vecchi (più di 30 giorni)
        await cleanupOldData('shopify_orders', 30);
      } catch (error) {
        console.error('Errore nel caricare ordini:', error);
        setOrders([]);
        
        // Se c'è un errore, prova comunque a sincronizzare
        try {
          console.log('🔄 Tentativo di sincronizzazione dopo errore...');
          await handleSyncOrdersComplete();
        } catch (syncError) {
          console.error('Errore anche nella sincronizzazione:', syncError);
          setError('Errore nel caricamento ordini. Verifica la configurazione Shopify.');
        }
      }
    };
    loadOrders();
  }, []);

  // Carica le tipologie disponibili
  useEffect(() => {
    const loadTipologie = async () => {
      try {
        const tipologie = await getAvailableTipologie();
        setAvailableTipologie(tipologie);
      } catch (error) {
        console.error('Errore nel caricare tipologie:', error);
        setAvailableTipologie([]);
      }
    };
    
    loadTipologie();
  }, []);

  const saveOrders = async (newOrders) => {
    try {
      await saveLargeData('shopify_orders', newOrders, 500);
    } catch (error) {
      console.error('Errore nel salvare ordini nel database:', error);
    }
    setOrders(newOrders);
    window.dispatchEvent(new CustomEvent('dashboard-update'));
  };

  // Nuova funzione per sincronizzazione completa senza limiti temporali
  const handleSyncOrdersComplete = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    // Crea un nuovo abort controller
    const controller = new AbortController();
    setAbortController(controller);

    setSyncProgress({
      isRunning: true,
      currentPage: 0,
      totalPages: 0,
      ordersDownloaded: 0,
      totalOrders: 0,
      currentStatus: 'Inizializzazione sincronizzazione completa...'
    });

    try {
      console.log('🚀 INIZIO SINCRONIZZAZIONE COMPLETA SHOPIFY...');
      
      // Sincronizzazione completa senza limiti temporali
      const allOrders = await downloadAllOrdersComplete(controller);
      
      if (allOrders && allOrders.length > 0) {
        setMessage(`✅ SINCRONIZZAZIONE COMPLETATA! Scaricati ${allOrders.length} ordini totali`);
        
        // Salva gli ordini trovati
        const convertedOrders = allOrders.map(convertShopifyOrder);
        await saveOrders(convertedOrders);
        
      } else {
        setMessage('⚠️ SINCRONIZZAZIONE COMPLETATA ma nessun ordine trovato');
      }
      
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessage('❌ Sincronizzazione annullata dall\'utente');
      } else {
        console.error('❌ ERRORE SINCRONIZZAZIONE COMPLETA:', err);
        setError(`Errore sincronizzazione completa: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
      setSyncProgress({
        isRunning: false,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: ''
      });
      setAbortController(null);
    }
  };

  // Nuova funzione per sincronizzazione incrementale (ultimi 7 giorni)
  const handleSyncOrdersIncremental = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    const controller = new AbortController();
    setAbortController(controller);

    setSyncProgress({
      isRunning: true,
      currentPage: 0,
      totalPages: 0,
      ordersDownloaded: 0,
      totalOrders: 0,
      currentStatus: 'Sincronizzazione incrementale (ultimi 7 giorni)...'
    });

    try {
      console.log('🔄 SINCRONIZZAZIONE INCREMENTALE (ultimi 7 giorni)...');
      
      // Sincronizzazione solo ultimi 7 giorni
      const recentOrders = await downloadOrdersWithPeriod(7, controller);
      
      if (recentOrders && recentOrders.length > 0) {
        setMessage(`✅ SINCRONIZZAZIONE INCREMENTALE COMPLETATA! Scaricati ${recentOrders.length} ordini recenti`);
        
        // Unisci con ordini esistenti (evita duplicati)
        const existingOrders = orders || [];
        const newOrders = recentOrders.filter(newOrder => 
          !existingOrders.some(existingOrder => existingOrder.id === newOrder.id)
        );
        
        if (newOrders.length > 0) {
          const allOrders = [...existingOrders, ...newOrders];
          const convertedOrders = allOrders.map(convertShopifyOrder);
          await saveOrders(convertedOrders);
        }
        
      } else {
        setMessage('✅ SINCRONIZZAZIONE INCREMENTALE: nessun ordine nuovo trovato');
      }
      
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessage('❌ Sincronizzazione incrementale annullata');
      } else {
        console.error('❌ ERRORE SINCRONIZZAZIONE INCREMENTALE:', err);
        setError(`Errore sincronizzazione incrementale: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
      setSyncProgress({
        isRunning: false,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: ''
      });
      setAbortController(null);
    }
  };

  // Funzione per scaricare tutti gli ordini senza limiti temporali
  const downloadAllOrdersComplete = async (controller) => {
    const allOrders = [];

    // Ottieni le credenziali Shopify
    const credentials = getShopifyCredentials();

    setSyncProgress(prev => ({
      ...prev,
      currentStatus: 'Scaricamento ordini per status separati...'
    }));

    // SOLUZIONE SEMPLICE: Scarica ordini per status separati
    // Questo evita problemi di paginazione e filtri
    const statusesToDownload = [
      { status: 'open', description: 'ordini aperti' },
      { status: 'closed', description: 'ordini chiusi' },
      { status: 'fulfilled', description: 'ordini evasi' },
      { status: 'cancelled', description: 'ordini cancellati' },
      { status: 'refunded', description: 'ordini rimborsati' }
    ];

    for (const { status, description } of statusesToDownload) {
      // Controlla se la sincronizzazione è stata annullata
      if (controller.signal.aborted) {
        throw new Error('Sincronizzazione annullata');
      }

      console.log(`🔄 Scaricamento ${description} (status: ${status})...`);
      
      setSyncProgress(prev => ({
        ...prev,
        currentStatus: `Scaricamento ${description}...`
      }));

      try {
        // Scarica ordini per questo status specifico
        const response = await fetch('/.netlify/functions/shopify-sync-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shopDomain: credentials.shopDomain,
            accessToken: credentials.accessToken,
            apiVersion: credentials.apiVersion,
            limit: 1000, // Limite alto per questo status
            status: status, // Status specifico
            pageInfo: null, // Nessuna paginazione
            useChunking: false,
            daysBack: null // NO filtro temporale
          })
        });

        if (!response.ok) {
          throw new Error(`Errore HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📥 Status ${status}:`, {
          success: data.success,
          ordersCount: data.orders?.length || 0,
          method: data.method
        });
        
        if (data.success && data.orders && data.orders.length > 0) {
          console.log(`✅ Status ${status}: ${data.orders.length} ordini scaricati`);
          
          // Aggiungi ordini alla lista
          allOrders.push(...data.orders);
          
          setSyncProgress(prev => ({
            ...prev,
            ordersDownloaded: allOrders.length,
            currentStatus: `Scaricati ${allOrders.length} ordini totali (inclusi ${description})...`
          }));

          // Salva progressivamente per evitare problemi di quota
          if (allOrders.length > 1000) {
            try {
              const convertedOrders = allOrders.map(convertShopifyOrder);
              await saveOrders(convertedOrders);
              setSyncProgress(prev => ({
                ...prev,
                currentStatus: `Scaricati ${allOrders.length} ordini totali... (salvati progressivamente)`
              }));
            } catch (saveError) {
              console.warn('⚠️ Errore nel salvataggio progressivo:', saveError);
              // Continua comunque la sincronizzazione
            }
          }
        } else {
          console.log(`⚠️ Status ${status}: Nessun ordine trovato`);
        }

        // Pausa tra i status per evitare rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        console.error(`❌ Errore per status ${status}:`, error);
        // Continua con il prossimo status
      }
    }

    console.log(`✅ Sincronizzazione completa terminata: ${allOrders.length} ordini totali`);
    return allOrders;
  };

  // Funzione per scaricare ordini con periodo specifico
  const downloadOrdersWithPeriod = async (daysBack, controller) => {
    const allOrders = [];
    let pageCount = 0;
    const maxPages = 100;

    // Ottieni le credenziali Shopify
    const credentials = getShopifyCredentials();

    setSyncProgress(prev => ({
      ...prev,
      currentStatus: `Scaricamento ordini ultimi ${daysBack} giorni...`
    }));

    while (pageCount < maxPages) {
      if (controller.signal.aborted) {
        throw new Error('Sincronizzazione annullata');
      }

      pageCount++;
      setSyncProgress(prev => ({
        ...prev,
        currentPage: pageCount,
        currentStatus: `Scaricamento pagina ${pageCount} (ultimi ${daysBack} giorni)...`
      }));

      try {
        const response = await fetch('/.netlify/functions/shopify-sync-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shopDomain: credentials.shopDomain,
            accessToken: credentials.accessToken,
            apiVersion: credentials.apiVersion,
            limit: 250,
            status: 'any',
            pageInfo: null, // Reset per ogni chiamata
            useChunking: false,
            daysBack: daysBack // Filtro temporale specifico
          })
        });

        if (!response.ok) {
          throw new Error(`Errore HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.orders) {
          console.log(`⚠️ Pagina ${pageCount} - Response non valida:`, data);
          break; // Nessuna pagina successiva
        }

        const shopifyOrders = data.orders;
        
        if (shopifyOrders.length === 0) {
          console.log(`✅ Pagina ${pageCount} - Nessun ordine, fine sincronizzazione`);
          break; // Nessuna pagina successiva
        }

        // Aggiungi ordini alla lista
        allOrders.push(...shopifyOrders);
        
        setSyncProgress(prev => ({
          ...prev,
          ordersDownloaded: allOrders.length,
          currentStatus: `Scaricati ${allOrders.length} ordini (ultimi ${daysBack} giorni)...`
        }));

        // Pausa per evitare rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        console.error(`❌ Errore pagina ${pageCount}:`, error);
        throw new Error(`Errore pagina ${pageCount}: ${error.message}`);
      }
    }

    console.log(`✅ Sincronizzazione periodo ${daysBack} giorni terminata: ${allOrders.length} ordini`);
    return allOrders;
  };

  // Funzione per annullare la sincronizzazione
  const cancelSync = () => {
    if (abortController) {
      abortController.abort();
      setSyncProgress(prev => ({
        ...prev,
        currentStatus: 'Sincronizzazione annullata...'
      }));
    }
  };

  // Funzione per pulire la cache
  const clearOrdersCache = () => {
    if (confirm('Sei sicuro di voler pulire la cache degli ordini? Questo eliminerà tutti gli ordini scaricati e archiviati dal tuo browser. Questa azione non può essere annullata.')) {
      localStorage.removeItem('shopify_orders');
      localStorage.removeItem('shopify_orders_compressed');
      localStorage.removeItem('shopify_orders_count');
      localStorage.removeItem('shopify_orders_compressed_date');
      localStorage.removeItem('shopify_orders_recent');
      localStorage.removeItem('shopify_orders_total_count');
      localStorage.removeItem('shopify_orders_partial_save');
      setOrders([]);
      setMessage('✅ Cache pulita con successo!');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Funzione legacy per compatibilità
  const handleSyncOrders = async (forceAll = false) => {
    if (forceAll) {
      await handleSyncOrdersComplete();
    } else {
      await handleSyncOrdersIncremental();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Funzione per formattare i prezzi con punto per le migliaia (formato italiano)
  const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Funzione per creare date con orario specifico
  const createDateTime = (date, time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return setSeconds(setMinutes(setHours(date, hours), minutes), 0);
  };

  // Filtra e ordina gli ordini in base a status, data e range
  const getFilteredOrders = async () => {
    let filtered = orders;
    
    // Filtro per status
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        // Ordini attivi (non archiviati)
        filtered = filtered.filter(order => 
          order.status !== 'cancelled' && order.status !== 'refunded'
        );
      } else if (filterStatus === 'archived') {
        // Ordini archiviati (cancellati + rimborsati)
        filtered = filtered.filter(order => 
          order.status === 'cancelled' || order.status === 'refunded'
        );
      } else {
        // Status specifico
        filtered = filtered.filter(order => order.status === filterStatus);
      }
    }
    
    // Filtro per data con orario
    const startDateTime = createDateTime(range.startDate, startTime);
    const endDateTime = createDateTime(range.endDate, endTime);
    
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDateTime && orderDate <= endDateTime;
    });
    
    // Filtro per ricerca (numero ordine o SKU)
    if (searchTerm) {
      filtered = filtered.filter(order => {
        // Cerca nel numero ordine
        if (safeIncludes(order.orderNumber?.toString(), searchTerm)) {
          return true;
        }
        // Cerca negli SKU dei prodotti
        return order.items.some(item => 
          item.sku && safeIncludes(item.sku, searchTerm)
        );
      });
    }
    
    // Filtro per tipologia (dal magazzino)
    if (filterTipologia !== 'all') {
      try {
        const magazzino = await loadMagazzino();
        filtered = filtered.filter(order => 
          order.items.some(item => {
            const magazzinoItem = magazzino.find(m => m.sku === item.sku);
            if (!magazzinoItem) return false;
            const tipologia = localStorage.getItem(`tipologia_${item.sku}`) || '';
            return tipologia === filterTipologia;
          })
        );
      } catch (error) {
        console.error('Errore nel caricare magazzino per filtri:', error);
      }
    }
    
    // Filtro per profumo (dal nome del prodotto)
    if (filterPerfume !== 'all') {
      filtered = filtered.filter(order => 
        order.items.some(item => 
          safeIncludes(item.name, filterPerfume)
        )
      );
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'amount':
          return b.totalPrice - a.totalPrice;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const [filteredOrders, setFilteredOrders] = useState([]);

  useEffect(() => {
    const loadFilteredOrders = async () => {
      const orders = await getFilteredOrders();
      setFilteredOrders(orders);
    };
    loadFilteredOrders();
  }, [orders, filterStatus, range, startTime, endTime, searchTerm, filterTipologia, filterPerfume, sortBy]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Pagato';
      case 'pending': return 'In attesa';
      case 'refunded': return 'Rimborsato';
      case 'cancelled': return 'Cancellato';
      default: return status;
    }
  };

  // Funzione per ottenere le tipologie disponibili dal magazzino
  const getAvailableTipologie = async () => {
    const tipi = new Set();
    try {
      const magazzino = await loadMagazzino();
      (Array.isArray(magazzino) ? magazzino : []).forEach(item => {
        const tipologia = localStorage.getItem(`tipologia_${item.sku}`);
        if (tipologia) tipi.add(tipologia);
      });
    } catch (error) {
      console.error('Errore nel caricare magazzino per tipologie:', error);
    }
    return Array.from(tipi).sort();
  };

  // Funzione per calcolare le statistiche filtrate per prodotto specifico
  const getFilteredStats = () => {
    if (!searchTerm) {
      // Se non c'è ricerca, usa le statistiche normali
      const paidShippingOrders = filteredOrders.filter(order => order.shippingPrice > 0);
      const shippingRevenue = paidShippingOrders.reduce((sum, order) => sum + order.shippingPrice, 0);
      
      // Nuove statistiche per ordini archiviati e attivi
      const archivedOrders = filteredOrders.filter(order => 
        order.status === 'cancelled' || order.status === 'refunded'
      );
      const activeOrders = filteredOrders.filter(order => 
        order.status !== 'cancelled' && order.status !== 'refunded'
      );
      
      return {
        totalOrders: filteredOrders.length,
        totalValue: filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0),
        totalProducts: filteredOrders.reduce((total, order) => 
          total + order.items.reduce((sum, item) => sum + item.quantity, 0), 0
        ),
        totalInvoices: filteredOrders.length,
        paidOrders: filteredOrders.filter(order => order.status === 'paid').length,
        pendingOrders: filteredOrders.filter(order => order.status === 'pending').length,
        archivedOrders: archivedOrders.length,
        activeOrders: activeOrders.length,
        paidShippingOrders: paidShippingOrders.length,
        shippingRevenue: shippingRevenue,
        freeShippingOrders: filteredOrders.filter(order => order.shippingPrice === 0).length,
        avgShippingCost: paidShippingOrders.length > 0 ? shippingRevenue / paidShippingOrders.length : 0
      };
    }

    // Se c'è una ricerca, filtra solo i prodotti che corrispondono
    const matchingItems = (Array.isArray(filteredOrders) ? filteredOrders : []).flatMap(order => 
      order.items.filter(item => {
        // Cerca nel numero ordine
        if (safeIncludes(order.orderNumber?.toString(), searchTerm)) {
          return true;
        }
        // Cerca negli SKU dei prodotti
        return item.sku && safeIncludes(item.sku, searchTerm);
      }).map(item => ({
        ...item,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        orderStatus: order.status
      }))
    );

    // Raggruppa per SKU per evitare duplicati
    const groupedItems = {};
    (Array.isArray(matchingItems) ? matchingItems : []).forEach(item => {
      if (!groupedItems[item.sku]) {
        groupedItems[item.sku] = {
          sku: item.sku,
          name: item.name,
          totalQuantity: 0,
          totalValue: 0,
          orders: new Set(),
          orderStatuses: new Set()
        };
      }
      groupedItems[item.sku].totalQuantity += item.quantity;
      groupedItems[item.sku].totalValue += (item.price * item.quantity);
      groupedItems[item.sku].orders.add(item.orderNumber);
      groupedItems[item.sku].orderStatuses.add(item.orderStatus);
    });

    const uniqueProducts = Object.values(groupedItems);
    const totalOrders = new Set((Array.isArray(matchingItems) ? matchingItems : []).map(item => item.orderNumber)).size;
    const totalValue = uniqueProducts.reduce((sum, product) => sum + product.totalValue, 0);
    const totalProducts = uniqueProducts.reduce((sum, product) => sum + product.totalQuantity, 0);
    const paidOrders = (Array.isArray(matchingItems) ? matchingItems : []).filter(item => item.orderStatus === 'paid').length;
    const pendingOrders = (Array.isArray(matchingItems) ? matchingItems : []).filter(item => item.orderStatus === 'pending').length;
    
    // Calcola statistiche spedizione per ricerca
    const matchingOrders = (Array.isArray(filteredOrders) ? filteredOrders : []).filter(order => 
      safeIncludes(order.orderNumber?.toString(), searchTerm) ||
      order.items.some(item => item.sku && safeIncludes(item.sku, searchTerm))
    );
    const paidShippingOrders = matchingOrders.filter(order => order.shippingPrice > 0);
    const shippingRevenue = paidShippingOrders.reduce((sum, order) => sum + order.shippingPrice, 0);

    // Nuove statistiche per ricerca
    const archivedOrders = matchingOrders.filter(order => 
      order.status === 'cancelled' || order.status === 'refunded'
    );
    const activeOrders = matchingOrders.filter(order => 
      order.status !== 'cancelled' && order.status !== 'refunded'
    );

    return {
      totalOrders,
      totalValue,
      totalProducts,
      totalInvoices: totalOrders,
      paidOrders,
      pendingOrders,
      archivedOrders: archivedOrders.length,
      activeOrders: activeOrders.length,
      paidShippingOrders: paidShippingOrders.length,
      shippingRevenue: shippingRevenue,
      freeShippingOrders: matchingOrders.filter(order => order.shippingPrice === 0).length,
      avgShippingCost: paidShippingOrders.length > 0 ? shippingRevenue / paidShippingOrders.length : 0
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordini</h1>
          <p className="text-muted-foreground">
            Gestisci e visualizza tutti gli ordini da Shopify
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleSyncOrdersComplete()} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'SINCRONIZZAZIONE...' : '🚀 SINCRONIZZA TUTTO'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sincronizzazione Shopify Avanzata</CardTitle>
          <CardDescription>
            Importa automaticamente tutti gli ordini dal tuo store Shopify, inclusi quelli archiviati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pulsanti principali */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSyncOrdersIncremental()}
                disabled={isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isLoading ? 'Sincronizzazione...' : '🔄 Sincronizza Recenti (7 giorni)'}
              </button>
              
              <button
                onClick={() => handleSyncOrdersComplete()}
                disabled={isLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                🚀 Sincronizza TUTTI gli Ordini
              </button>

              <button
                onClick={() => downloadOrdersWithPeriod(30, new AbortController())}
                disabled={isLoading}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                📅 Ultimi 30 Giorni
              </button>

              <button
                onClick={() => downloadOrdersWithPeriod(90, new AbortController())}
                disabled={isLoading}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                📅 Ultimi 90 Giorni
              </button>
            </div>

            {/* Progresso sincronizzazione */}
            {syncProgress.isRunning && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-800">🔄 Sincronizzazione in corso...</h4>
                  <button
                    onClick={cancelSync}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                  >
                    ❌ Annulla
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-blue-700">
                    <strong>Stato:</strong> {syncProgress.currentStatus}
                  </div>
                  <div className="text-sm text-blue-700">
                    <strong>Pagina corrente:</strong> {syncProgress.currentPage}
                  </div>
                  <div className="text-sm text-blue-700">
                    <strong>Ordini scaricati:</strong> {syncProgress.ordersDownloaded}
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: syncProgress.currentPage > 0 
                          ? `${Math.min((syncProgress.currentPage / 100) * 100, 100)}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Messaggi e errori */}
            {message && (
              <div className="mt-2 text-green-600 font-medium">{message}</div>
            )}
            {error && (
              <div className="mt-2 flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Gestione dati e spazio */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Gestione Dati e Spazio
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={clearOrdersCache}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                >
                  <Archive className="h-4 w-4" />
                  Pulisci Cache
                </button>
                <div className="text-sm text-gray-600">
                  <strong>Ordini in cache:</strong> {orders.length} | 
                  <strong> Spazio utilizzato:</strong> {Math.round(JSON.stringify(orders).length / 1024)} KB
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 La cache viene pulita automaticamente ogni 30 giorni. Usa "Pulisci Cache" solo se necessario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtri moderni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtri
          </CardTitle>
          <CardDescription>
            Filtra ordini per data, status, tipologia e profumo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div>
              <label className="block text-sm font-medium mb-2">Intervallo date:</label>
              <button
                className="px-3 py-2 border rounded bg-white hover:bg-gray-50"
                onClick={() => setShowPicker(!showPicker)}
              >
                {range.startDate.toLocaleDateString('it-IT')} → {range.endDate.toLocaleDateString('it-IT')}
              </button>
              {showPicker && (
                <div className="absolute z-50 mt-2 shadow-lg bg-white border rounded-lg p-4">
                  <DateRange
                    editableDateInputs={true}
                    onChange={item => setRange(item.selection)}
                    moveRangeOnFirstSelection={false}
                    ranges={[range]}
                    maxDate={new Date()}
                    locale={it}
                    months={1}
                    direction="horizontal"
                  />
                  <div className="flex gap-2 mt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <label className="text-sm">Ora inizio:</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Ora fine:</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                  <button
                    className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
                    onClick={() => setShowPicker(false)}
                  >Applica</button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status:</label>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="all">Tutti</option>
                <option value="paid">Pagati</option>
                <option value="pending">In attesa</option>
                <option value="refunded">Rimborsati</option>
                <option value="cancelled">Cancellati</option>
                <option value="active">Attivi (non archiviati)</option>
                <option value="archived">Archiviati (cancellati + rimborsati)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tipologia:</label>
              <select 
                value={filterTipologia} 
                onChange={e => setFilterTipologia(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="all">Tutte</option>
                {availableTipologie.map(tipologia => (
                  <option key={tipologia} value={tipologia}>{tipologia}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Profumo:</label>
              <select 
                value={filterPerfume} 
                onChange={e => setFilterPerfume(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="all">Tutti</option>
                <option value="vanilla">Vanilla</option>
                <option value="rose">Rose</option>
                <option value="lavender">Lavender</option>
                <option value="musk">Musk</option>
                <option value="citrus">Citrus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ordina per:</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="date">Data</option>
                <option value="amount">Importo</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
          
          {/* Ricerca avanzata */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Ricerca:</label>
            <input
              type="text"
              placeholder="Cerca per numero ordine o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cerca per numero ordine (es: #1001) o codice SKU del prodotto
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche generali */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistiche Generali
              {searchTerm && (
                <span className="text-sm font-normal text-muted-foreground">
                  (filtrate per: "{searchTerm}")
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{getFilteredStats().totalOrders}</div>
                <div className="text-sm text-muted-foreground">Totale Ordini</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(getFilteredStats().totalValue)}
                </div>
                <div className="text-sm text-muted-foreground">Valore Totale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {getFilteredStats().totalProducts}
                </div>
                <div className="text-sm text-muted-foreground">Totale Prodotti</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {getFilteredStats().paidOrders}
                </div>
                <div className="text-sm text-muted-foreground">Pagati</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {getFilteredStats().pendingOrders}
                </div>
                <div className="text-sm text-muted-foreground">In Attesa</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {getFilteredStats().activeOrders}
                </div>
                <div className="text-sm text-muted-foreground">Attivi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {getFilteredStats().archivedOrders}
                </div>
                <div className="text-sm text-muted-foreground">Archiviati</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {getFilteredStats().paidShippingOrders}
                </div>
                <div className="text-sm text-muted-foreground">Con Spedizione</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {getFilteredStats().freeShippingOrders}
                </div>
                <div className="text-sm text-muted-foreground">Spedizione Gratuita</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-700">
                  {formatPrice(getFilteredStats().shippingRevenue)}
                </div>
                <div className="text-sm text-muted-foreground">Incasso Spedizioni</div>
              </div>
            </div>
            
            {/* Riepilogo ordini archiviati e attivi */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-800 mb-1">📊 Riepilogo Ordini:</div>
              <div className="text-xs text-gray-700">
                {getFilteredStats().totalOrders > 0 && (
                  <>
                    <span className="font-medium">{getFilteredStats().activeOrders}</span> ordini attivi 
                    ({((getFilteredStats().activeOrders / getFilteredStats().totalOrders) * 100).toFixed(1)}%) e 
                    <span className="font-medium"> {getFilteredStats().archivedOrders}</span> ordini archiviati 
                    ({((getFilteredStats().archivedOrders / getFilteredStats().totalOrders) * 100).toFixed(1)}%).
                    {getFilteredStats().archivedOrders > 0 && (
                      <> Gli ordini archiviati includono cancellati e rimborsati.</>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Riepilogo spedizioni */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">📦 Riepilogo Spedizioni:</div>
              <div className="text-xs text-blue-700">
                {getFilteredStats().totalOrders > 0 && (
                  <>
                    {getFilteredStats().paidShippingOrders > 0 ? (
                      <>
                        <span className="font-medium">{((getFilteredStats().paidShippingOrders / getFilteredStats().totalOrders) * 100).toFixed(1)}%</span> degli ordini ha una spedizione a pagamento, 
                        generando <span className="font-medium">{formatPrice(getFilteredStats().shippingRevenue)}</span> di ricavi aggiuntivi 
                        ({getFilteredStats().totalValue > 0 ? ((getFilteredStats().shippingRevenue / getFilteredStats().totalValue) * 100).toFixed(1) : 0}% del valore totale).
                        {getFilteredStats().paidShippingOrders > 0 && (
                          <> Media costo spedizione: <span className="font-medium">{formatPrice(getFilteredStats().avgShippingCost)}</span></>
                        )}
                      </>
                    ) : (
                      <>
                        Tutti gli ordini hanno spedizione gratuita. Considera di implementare costi di spedizione per aumentare i ricavi.
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista ordini filtrati */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Ordini</CardTitle>
          <CardDescription>
            {filteredOrders.length} ordini trovati tra {range.startDate.toLocaleDateString('it-IT')} {startTime} e {range.endDate.toLocaleDateString('it-IT')} {endTime}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun ordine trovato per il periodo selezionato.
            </div>
          ) : (
            <div className="space-y-4">
              {(Array.isArray(filteredOrders) ? filteredOrders : []).map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 
                        className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/ordini/${order.id}`}
                        title="Clicca per vedere i dettagli dell'ordine"
                      >
                        Ordine #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {order.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(order.totalPrice)}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        {(order.status === 'cancelled' || order.status === 'refunded') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            📁 Archiviati
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Data: {formatDate(order.createdAt)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                      Spedizione: {order.shippingType || 'Standard'}
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      order.shippingPrice > 0 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {order.shippingPrice > 0 
                        ? `💰 ${order.shippingPrice.toFixed(2)} ${order.currency}`
                        : '🆓 Gratuita'
                      }
                    </div>
                  </div>
                  {(Array.isArray(order.items) ? order.items : []).length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="font-medium mb-2">Prodotti:</h4>
                      <div className="space-y-1">
                        {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.name} (SKU: {item.sku || 'N/A'})</span>
                            <span>{item.quantity}x {formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sezione prodotti venduti quando si fa una ricerca */}
      {searchTerm && filteredOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prodotti Venduti</CardTitle>
            <CardDescription>
              Prodotti trovati per la ricerca: "{searchTerm}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                // Raggruppa i prodotti per SKU per evitare duplicati
                const groupedItems = {};
                (Array.isArray(filteredOrders) ? filteredOrders : []).flatMap(order => 
                  order.items.filter(item => {
                    // Cerca nel numero ordine
                    if (safeIncludes(order.orderNumber?.toString(), searchTerm)) {
                      return true;
                    }
                    // Cerca negli SKU dei prodotti
                    return item.sku && safeIncludes(item.sku, searchTerm);
                  }).map(item => ({
                    ...item,
                    orderNumber: order.orderNumber,
                    orderDate: order.createdAt,
                    orderStatus: order.status
                  }))
                ).forEach(item => {
                  if (!groupedItems[item.sku]) {
                    groupedItems[item.sku] = {
                      sku: item.sku,
                      name: item.name,
                      totalQuantity: 0,
                      totalValue: 0,
                      orders: new Set(),
                      orderStatuses: new Set()
                    };
                  }
                  groupedItems[item.sku].totalQuantity += item.quantity;
                  groupedItems[item.sku].totalValue += (item.price * item.quantity);
                  groupedItems[item.sku].orders.add(item.orderNumber);
                  groupedItems[item.sku].orderStatuses.add(item.orderStatus);
                });

                return Object.values(groupedItems).map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {product.sku} | {product.orders.size} ordini
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{product.totalQuantity}x {formatPrice(product.totalValue / product.totalQuantity)}</p>
                      <p className="text-sm text-muted-foreground">
                        Totale: {formatPrice(product.totalValue)}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrdiniPage; 