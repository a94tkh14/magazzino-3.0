import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import SyncProgress from '../components/SyncProgress';
import { 
  Download, 
  RefreshCw, 
  Filter, 
  Eye, 
  ShoppingCart,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Archive,
  Database
} from 'lucide-react';

const ShopifyOrdersPage = () => {
  // Stati principali
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Stati per filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Stati per sincronizzazione
  const [syncProgress, setSyncProgress] = useState({
    isRunning: false,
    currentPage: 0,
    totalPages: 0,
    ordersDownloaded: 0,
    totalOrders: 0,
    currentStatus: '',
    startTime: null,
    estimatedTimeRemaining: null,
    errorsCount: 0,
    retriesCount: 0,
    memoryUsage: 0,
    averageSpeed: 0
  });

  // Abort controller per annullare la sincronizzazione
  const [abortController, setAbortController] = useState(null);

  // Stati per statistiche
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    paidOrders: 0,
    pendingOrders: 0,
    avgOrderValue: 0,
    archivedOrders: 0,
    activeOrders: 0
  });

  // Carica ordini all'avvio
  useEffect(() => {
    loadOrders();
  }, []);

  const calculateStats = (ordersList) => {
    if (!ordersList || ordersList.length === 0) {
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        paidOrders: 0,
        pendingOrders: 0,
        avgOrderValue: 0,
        archivedOrders: 0,
        activeOrders: 0
      });
      return;
    }

    const totalRevenue = ordersList.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const paidOrders = ordersList.filter(order => order.financialStatus === 'paid').length;
    const pendingOrders = ordersList.filter(order => order.financialStatus === 'pending').length;
    const archivedOrders = ordersList.filter(order => order.archived === true).length;
    const activeOrders = ordersList.filter(order => order.archived !== true).length;

    setStats({
      totalOrders: ordersList.length,
      totalRevenue,
      paidOrders,
      pendingOrders,
      avgOrderValue: totalRevenue / ordersList.length,
      archivedOrders,
      activeOrders
    });
  };

  // Funzione per calcolare statistiche di performance
  const calculatePerformanceStats = (startTime, ordersDownloaded, currentPage) => {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const averageSpeed = ordersDownloaded > 0 ? Math.round(ordersDownloaded / (elapsed / 1000)) : 0;
    const estimatedTimeRemaining = averageSpeed > 0 && currentPage > 0 ? 
      Math.round((1000 - currentPage) * (elapsed / currentPage)) : null;
    
    return {
      elapsed: `${minutes}m ${seconds}s`,
      averageSpeed,
      estimatedTimeRemaining: estimatedTimeRemaining ? 
        `${Math.floor(estimatedTimeRemaining / 60000)}m ${Math.floor((estimatedTimeRemaining % 60000) / 1000)}s` : null
    };
  };

  const handleSyncOrders = async () => {
    const shopifyConfig = localStorage.getItem('shopify_config');
    if (!shopifyConfig) {
      setError('Configura prima la connessione Shopify');
      return;
    }

    try {
      const config = JSON.parse(shopifyConfig);
      if (!config.shopDomain || !config.accessToken) {
        setError('Configurazione Shopify incompleta');
        return;
      }

      // Crea un nuovo abort controller
      const controller = new AbortController();
      setAbortController(controller);

      const startTime = Date.now();
      setSyncProgress({
        isRunning: true,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: '🚀 Inizializzazione caricamento massivo...',
        startTime,
        estimatedTimeRemaining: null,
        errorsCount: 0,
        retriesCount: 0,
        memoryUsage: 0,
        averageSpeed: 0
      });

      setError('');
      setMessage('🔄 Sincronizzazione ordini in corso...');

      // Scarica tutti gli ordini con paginazione completa
      const allOrders = await downloadAllOrders(config, controller);
      
      // Salva nel localStorage con gestione intelligente della quota
      try {
        await saveOrdersToStorage(allOrders, 'final');
        setMessage(`✅ Sincronizzazione completata! Scaricati ${allOrders.length} ordini`);
      } catch (saveError) {
        console.warn('⚠️ Errore nel salvataggio finale:', saveError);
        setMessage(`⚠️ Sincronizzazione completata (${allOrders.length} ordini) ma salvataggio parziale a causa di limiti di spazio`);
      }
      
      // Aggiorna lo stato
      setOrders(allOrders);
      calculateStats(allOrders);
      
      setSyncProgress({
        isRunning: false,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: ''
      });

      // Pulisci il messaggio dopo 8 secondi (più tempo per messaggi di warning)
      setTimeout(() => setMessage(''), 8000);

    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('❌ Sincronizzazione annullata dall\'utente');
      } else {
        console.error('Errore sincronizzazione:', error);
        setError(`Errore sincronizzazione: ${error.message}`);
      }
      setSyncProgress({
        isRunning: false,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: ''
      });
    } finally {
      setAbortController(null);
    }
  };

  const handleSyncOrdersWithPeriod = async (daysBack) => {
    const shopifyConfig = localStorage.getItem('shopify_config');
    if (!shopifyConfig) {
      setError('Configura prima la connessione Shopify');
      return;
    }

    try {
      const config = JSON.parse(shopifyConfig);
      if (!config.shopDomain || !config.accessToken) {
        setError('Configurazione Shopify incompleta');
        return;
      }

      // Crea un nuovo abort controller
      const controller = new AbortController();
      setAbortController(controller);

      setSyncProgress({
        isRunning: true,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: 'Inizializzazione sincronizzazione...'
      });

      setError('');
      setMessage('🔄 Sincronizzazione ordini in corso...');

      // Scarica tutti gli ordini con paginazione completa
      const allOrders = await downloadAllOrders(config, controller, daysBack);
      
      // Salva nel localStorage con gestione intelligente della quota
      try {
        await saveOrdersToStorage(allOrders, 'final');
        setMessage(`✅ Sincronizzazione completata! Scaricati ${allOrders.length} ordini`);
      } catch (saveError) {
        console.warn('⚠️ Errore nel salvataggio finale:', saveError);
        setMessage(`⚠️ Sincronizzazione completata (${allOrders.length} ordini) ma salvataggio parziale a causa di limiti di spazio`);
      }
      
      // Aggiorna lo stato
      setOrders(allOrders);
      calculateStats(allOrders);
      
      setSyncProgress({
        isRunning: false,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: ''
      });

      // Pulisci il messaggio dopo 8 secondi (più tempo per messaggi di warning)
      setTimeout(() => setMessage(''), 8000);

    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('❌ Sincronizzazione annullata dall\'utente');
      } else {
        console.error('Errore sincronizzazione:', error);
        setError(`Errore sincronizzazione: ${error.message}`);
      }
      setSyncProgress({
        isRunning: false,
        currentPage: 0,
        totalPages: 0,
        ordersDownloaded: 0,
        totalOrders: 0,
        currentStatus: ''
      });
    } finally {
      setAbortController(null);
    }
  };

  const cancelSync = () => {
    if (abortController) {
      abortController.abort();
      setSyncProgress(prev => ({
        ...prev,
        currentStatus: 'Sincronizzazione annullata...'
      }));
    }
  };

  const downloadAllOrders = async (config, controller, daysBack = null) => {
    const allOrders = [];
    let pageInfo = null;
    let pageCount = 0;
    const maxPages = 1000; // Aumentato per store molto grandi
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    let retryDelay = 1000; // Delay iniziale per retry

    setSyncProgress(prev => ({
      ...prev,
      currentStatus: '🚀 Inizializzazione caricamento massivo...'
    }));

    // Prima scarica tutti gli ordini attivi (senza filtro temporale)
    while (pageCount < maxPages) {
      // Controlla se la sincronizzazione è stata annullata
      if (controller.signal.aborted) {
        throw new Error('Sincronizzazione annullata');
      }

      pageCount++;
      setSyncProgress(prev => ({
        ...prev,
        currentPage: pageCount,
        totalPages: Math.min(maxPages, pageCount + 50), // Stima dinamica
        currentStatus: `📦 Pagina ${pageCount} - Scaricamento ordini attivi...`
      }));

      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!success && attempts < maxAttempts) {
        attempts++;
        
        try {
          setSyncProgress(prev => ({
            ...prev,
            currentStatus: `📦 Pagina ${pageCount} - Tentativo ${attempts}/${maxAttempts}...`
          }));

          const response = await fetch('/.netlify/functions/shopify-sync-orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              shopDomain: config.shopDomain,
              accessToken: config.accessToken,
              apiVersion: config.apiVersion,
              limit: 250, // Massimo consentito da Shopify
              status: 'any', // Tutti gli status attivi
              pageInfo: pageInfo,
              useChunking: false,
              // Applica filtro temporale solo se specificato
              ...(daysBack && { daysBack: daysBack })
            }),
            signal: controller.signal
          });

          if (!response.ok) {
            const errorData = await response.json();
            
            // Gestione errori specifici
            if (response.status === 429) {
              // Rate limit - aspetta più a lungo
              const waitTime = Math.min(retryDelay * Math.pow(2, attempts), 30000);
              setSyncProgress(prev => ({
                ...prev,
                currentStatus: `⏳ Rate limit raggiunto - Attesa ${Math.round(waitTime/1000)}s...`
              }));
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retryDelay *= 2;
              continue;
            }
            
            throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
          }

          const data = await response.json();
          
          if (!data.success || !data.orders) {
            throw new Error('Risposta API non valida');
          }

          // Aggiungi ordini alla lista
          allOrders.push(...data.orders);
          consecutiveErrors = 0; // Reset errori consecutivi
          retryDelay = 1000; // Reset delay
          success = true;
          
          // Calcola statistiche di performance
          const perfStats = calculatePerformanceStats(syncProgress.startTime, allOrders.length, pageCount);
          
          setSyncProgress(prev => ({
            ...prev,
            ordersDownloaded: allOrders.length,
            currentStatus: `✅ Pagina ${pageCount} completata - ${allOrders.length} ordini totali`,
            averageSpeed: perfStats.averageSpeed,
            estimatedTimeRemaining: perfStats.estimatedTimeRemaining,
            memoryUsage: Math.round(JSON.stringify(allOrders).length / 1024) // KB
          }));

          // Salvataggio incrementale intelligente
          if (allOrders.length % 500 === 0) {
            try {
              await saveOrdersToStorage(allOrders, 'progressivo');
              setSyncProgress(prev => ({
                ...prev,
                currentStatus: `💾 Salvataggio incrementale - ${allOrders.length} ordini salvati`
              }));
            } catch (saveError) {
              console.warn('⚠️ Errore nel salvataggio progressivo:', saveError);
              // Continua comunque la sincronizzazione
            }
          }

          // Controlla se ci sono più pagine
          if (data.pagination && data.pagination.next && data.pagination.next.pageInfo) {
            pageInfo = data.pagination.next.pageInfo;
          } else {
            // Nessuna pagina successiva
            console.log(`✅ Scaricamento ordini attivi completato: ${allOrders.length} ordini`);
            break;
          }

          // Pausa intelligente basata sul numero di ordini scaricati
          const pauseTime = Math.min(1000 + (allOrders.length * 0.1), 5000);
          setSyncProgress(prev => ({
            ...prev,
            currentStatus: `⏳ Pausa intelligente ${Math.round(pauseTime/1000)}s per evitare rate limit...`
          }));
          await new Promise(resolve => setTimeout(resolve, pauseTime));

        } catch (error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          
          consecutiveErrors++;
          console.error(`Errore pagina ${pageCount}, tentativo ${attempts}:`, error);
          
          // Aggiorna contatori errori e retry
          setSyncProgress(prev => ({
            ...prev,
            errorsCount: prev.errorsCount + 1,
            retriesCount: prev.retriesCount + 1
          }));
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Troppi errori consecutivi (${consecutiveErrors}). Interrompo la sincronizzazione.`);
          }
          
          if (attempts < maxAttempts) {
            const waitTime = retryDelay * Math.pow(2, attempts - 1);
            setSyncProgress(prev => ({
              ...prev,
              currentStatus: `⚠️ Errore pagina ${pageCount} - Retry ${attempts}/${maxAttempts} in ${Math.round(waitTime/1000)}s...`
            }));
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw new Error(`Errore pagina ${pageCount} dopo ${maxAttempts} tentativi: ${error.message}`);
          }
        }
      }
      
      if (!success) {
        throw new Error(`Impossibile scaricare pagina ${pageCount} dopo ${maxAttempts} tentativi`);
      }
    }

    // Ora scarica gli ordini archiviati (cancelled e refunded)
    setSyncProgress(prev => ({
      ...prev,
      currentStatus: 'Scaricamento ordini archiviati (cancelled e refunded)...'
    }));

    // Reset paginazione per ordini archiviati
    pageInfo = null;
    pageCount = 0;

    // Scarica ordini archiviati (status = 'cancelled' o 'refunded')
    const archivedStatuses = ['cancelled', 'refunded'];
    
    for (const status of archivedStatuses) {
      // Controlla se la sincronizzazione è stata annullata
      if (controller.signal.aborted) {
        throw new Error('Sincronizzazione annullata');
      }

      pageInfo = null;
      pageCount = 0;

      while (pageCount < maxPages) {
        // Controlla se la sincronizzazione è stata annullata
        if (controller.signal.aborted) {
          throw new Error('Sincronizzazione annullata');
        }

        pageCount++;
        setSyncProgress(prev => ({
          ...prev,
          currentPage: pageCount,
          currentStatus: `Scaricamento pagina ${pageCount} (ordini ${status}, archiviati)...`
        }));

        try {
          const response = await fetch('/.netlify/functions/shopify-sync-orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              shopDomain: config.shopDomain,
              accessToken: config.accessToken,
              apiVersion: config.apiVersion,
              limit: 250,
              status: status,
              pageInfo: pageInfo,
              useChunking: false,
              // RIMUOVI il filtro temporale per scaricare TUTTI gli ordini archiviati
            }),
            signal: controller.signal
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
          }

          const data = await response.json();
          
          if (!data.success || !data.orders) {
            throw new Error('Risposta API non valida');
          }

          // Marca questi ordini come archiviati
          const archivedOrders = data.orders.map(order => ({
            ...order,
            archived: true,
            archiveReason: status
          }));

          // Aggiungi ordini archiviati alla lista
          allOrders.push(...archivedOrders);
          
          setSyncProgress(prev => ({
            ...prev,
            ordersDownloaded: allOrders.length,
            currentStatus: `Scaricati ${allOrders.length} ordini totali (inclusi ${status}, archiviati)...`
          }));

          // Salva progressivamente per evitare problemi di quota
          if (allOrders.length % 1000 === 0) {
            try {
              await saveOrdersToStorage(allOrders, 'progressivo');
              setSyncProgress(prev => ({
                ...prev,
                currentStatus: `Scaricati ${allOrders.length} ordini totali... (salvati progressivamente)`
              }));
            } catch (saveError) {
              console.warn('⚠️ Errore nel salvataggio progressivo:', saveError);
              // Continua comunque la sincronizzazione
            }
          }

          // Controlla se ci sono più pagine
          if (data.pagination && data.pagination.next && data.pagination.next.pageInfo) {
            pageInfo = data.pagination.next.pageInfo;
          } else {
            // Nessuna pagina successiva per questo status
            console.log(`✅ Scaricamento ordini ${status} completato`);
            break;
          }

          // Pausa per evitare rate limit
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          console.error(`Errore pagina ${pageCount} per status ${status}:`, error);
          // Continua con il prossimo status invece di fermarsi
          break;
        }
      }
    }

    // Prova anche a scaricare ordini con status specifici che potrebbero essere mancanti
    setSyncProgress(prev => ({
      ...prev,
      currentStatus: 'Scaricamento ordini con status speciali...'
    }));

    const specialStatuses = ['open', 'closed', 'fulfilled', 'partial'];
    
    for (const status of specialStatuses) {
      if (controller.signal.aborted) {
        throw new Error('Sincronizzazione annullata');
      }

      pageInfo = null;
      pageCount = 0;

      while (pageCount < 50) { // Limite più basso per status speciali
        if (controller.signal.aborted) {
          throw new Error('Sincronizzazione annullata');
        }

        pageCount++;
        setSyncProgress(prev => ({
          ...prev,
          currentPage: pageCount,
          currentStatus: `Scaricamento pagina ${pageCount} (status: ${status})...`
        }));

        try {
          const response = await fetch('/.netlify/functions/shopify-sync-orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              shopDomain: config.shopDomain,
              accessToken: config.accessToken,
              apiVersion: config.apiVersion,
              limit: 250,
              status: status,
              pageInfo: pageInfo,
              useChunking: false,
            }),
            signal: controller.signal
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
          }

          const data = await response.json();
          
          if (!data.success || !data.orders) {
            break; // Passa al prossimo status
          }

          // Aggiungi ordini alla lista (evita duplicati)
          const newOrders = data.orders.filter(newOrder => 
            !allOrders.some(existingOrder => existingOrder.id === newOrder.id)
          );
          
          allOrders.push(...newOrders);
          
          setSyncProgress(prev => ({
            ...prev,
            ordersDownloaded: allOrders.length,
            currentStatus: `Scaricati ${allOrders.length} ordini totali (inclusi status speciali)...`
          }));

          // Controlla se ci sono più pagine
          if (data.pagination && data.pagination.next && data.pagination.next.pageInfo) {
            pageInfo = data.pagination.next.pageInfo;
          } else {
            break;
          }

          // Pausa per evitare rate limit
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          console.error(`Errore per status ${status}:`, error);
          break; // Passa al prossimo status
        }
      }
    }

    console.log(`✅ Sincronizzazione completata: ${allOrders.length} ordini totali`);
    return allOrders;
  };

  // Funzione per salvare gli ordini con gestione intelligente della quota
  const saveOrdersToStorage = async (orders, mode = 'final') => {
    try {
      // Prova prima con il salvataggio normale
      localStorage.setItem('shopify_orders', JSON.stringify(orders));
      console.log(`✅ Ordini salvati in localStorage: ${orders.length}`);
      return true;
    } catch (quotaError) {
      if (quotaError.name === 'QuotaExceededError' || quotaError.message.includes('quota')) {
        console.warn('⚠️ Quota localStorage superata, provo con compressione...');
        
        try {
          // Prova con compressione dei dati
          const compressedOrders = await compressOrders(orders);
          localStorage.setItem('shopify_orders_compressed', compressedOrders);
          localStorage.setItem('shopify_orders_count', orders.length.toString());
          localStorage.setItem('shopify_orders_compressed_date', new Date().toISOString());
          console.log(`✅ Ordini compressi salvati: ${orders.length}`);
          return true;
        } catch (compressError) {
          console.error('❌ Errore anche con compressione:', compressError);
          
          // Prova con salvataggio parziale (ultimi 1000 ordini)
          if (orders.length > 1000) {
            try {
              const recentOrders = orders.slice(-1000);
              localStorage.setItem('shopify_orders_recent', JSON.stringify(recentOrders));
              localStorage.setItem('shopify_orders_total_count', orders.length.toString());
              localStorage.setItem('shopify_orders_partial_save', 'true');
              console.log(`✅ Salvati ultimi 1000 ordini su ${orders.length} totali`);
              return true;
            } catch (partialError) {
              console.error('❌ Errore anche con salvataggio parziale:', partialError);
              throw new Error('Impossibile salvare ordini: quota localStorage esaurita e compressione fallita');
            }
          } else {
            throw new Error('Impossibile salvare ordini: quota localStorage esaurita');
          }
        }
      } else {
        throw quotaError;
      }
    }
  };

  // Funzione per comprimere gli ordini (rimuove campi non essenziali)
  const compressOrders = async (orders) => {
    const compressed = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      totalPrice: order.totalPrice,
      currency: order.currency,
      createdAt: order.createdAt,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      archived: order.archived,
      archiveReason: order.archiveReason,
      // Rimuovi campi pesanti come lineItems dettagliati
      lineItemsCount: order.lineItems?.length || 0,
      // Mantieni solo i nomi dei prodotti principali
      mainProducts: order.lineItems?.slice(0, 3).map(item => item.name).join(', ') || 'N/A'
    }));
    
    return JSON.stringify(compressed);
  };

  // Funzione per caricare ordini dal localStorage (gestisce tutti i formati)
  const loadOrdersFromStorage = () => {
    try {
      // Prova prima con ordini normali
      const normalOrders = localStorage.getItem('shopify_orders');
      if (normalOrders) {
        return JSON.parse(normalOrders);
      }

      // Prova con ordini compressi
      const compressedOrders = localStorage.getItem('shopify_orders_compressed');
      if (compressedOrders) {
        const orders = JSON.parse(compressedOrders);
        console.log(`📦 Caricati ${orders.length} ordini compressi`);
        return orders;
      }

      // Prova con ordini parziali
      const partialOrders = localStorage.getItem('shopify_orders_recent');
      if (partialOrders) {
        const orders = JSON.parse(partialOrders);
        const totalCount = localStorage.getItem('shopify_orders_total_count');
        console.log(`�� Caricati ${orders.length} ordini recenti su ${totalCount} totali`);
        return orders;
      }

      return [];
    } catch (error) {
      console.error('❌ Errore nel caricare ordini da localStorage:', error);
      return [];
    }
  };

  const loadOrders = async () => {
    try {
      // Carica da localStorage con gestione intelligente
      const savedOrders = loadOrdersFromStorage();
      if (savedOrders && savedOrders.length > 0) {
        setOrders(savedOrders);
        calculateStats(savedOrders);
        
        // Mostra avviso se sono ordini parziali
        const isPartial = localStorage.getItem('shopify_orders_partial_save') === 'true';
        if (isPartial) {
          setMessage('⚠️ Caricati solo gli ultimi 1000 ordini a causa di limiti di spazio. Considera di esportare i dati o pulire la cache.');
        }
      }
    } catch (error) {
      console.error('Errore nel caricare ordini:', error);
      setError('Errore nel caricamento ordini');
    }
  };

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
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        paidOrders: 0,
        pendingOrders: 0,
        avgOrderValue: 0,
        archivedOrders: 0,
        activeOrders: 0
      });
      setMessage('✅ Cache pulita con successo!');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Pagato';
      case 'pending': return 'In attesa';
      case 'refunded': return 'Rimborsato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };

  const formatPrice = (price) => {
    if (!price) return '€0.00';
    return `€${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return 'Data non valida';
    }
  };

  // Filtra ordini in base ai criteri
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      (order.orderNumber && order.orderNumber.toString().includes(searchTerm)) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerEmail && order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'archived' && order.archived) ||
      (statusFilter === 'active' && !order.archived) ||
      (order.financialStatus === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            Ordini Shopify
          </h1>
          <p className="text-muted-foreground">
            Gestisci e sincronizza gli ordini dal tuo store Shopify
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSyncOrders} 
            disabled={syncProgress.isRunning}
            className="bg-blue-600 hover:bg-blue-700"
            title="Caricamento massivo di TUTTI gli ordini con gestione intelligente degli errori e retry automatico"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncProgress.isRunning ? 'animate-spin' : ''}`} />
            {syncProgress.isRunning ? 'Caricamento Massivo...' : '🚀 Caricamento Massivo'}
          </Button>
          
          <Button 
            onClick={() => handleSyncOrdersWithPeriod(30)}
            disabled={syncProgress.isRunning}
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
            title="Sincronizza ordini degli ultimi 30 giorni"
          >
            📅 Ultimi 30 giorni
          </Button>
          
          <Button 
            onClick={() => handleSyncOrdersWithPeriod(90)}
            disabled={syncProgress.isRunning}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
            title="Sincronizza ordini degli ultimi 90 giorni"
          >
            📅 Ultimi 90 giorni
          </Button>
          
          <Button 
            onClick={clearOrdersCache}
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
            title="Pulisce la cache degli ordini per liberare spazio"
          >
            🗑️ Pulisci Cache
          </Button>
        </div>
      </div>

      {/* Progresso sincronizzazione */}
      <SyncProgress 
        syncProgress={syncProgress} 
        onCancel={syncProgress.isRunning ? cancelSync : null}
      />

      {/* Informazioni caricamento massivo */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  🚀 Caricamento Massivo Ottimizzato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-blue-700 mb-1">✨ Nuove Funzionalità:</p>
                    <ul className="text-blue-600 space-y-1 text-xs">
                      <li>• Retry automatico con backoff intelligente</li>
                      <li>• Gestione rate limit avanzata</li>
                      <li>• Salvataggio incrementale ogni 500 ordini</li>
                      <li>• Statistiche di performance in tempo reale</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-blue-700 mb-1">📊 Monitoraggio:</p>
                    <ul className="text-blue-600 space-y-1 text-xs">
                      <li>• Velocità di scaricamento (ordini/sec)</li>
                      <li>• Tempo stimato rimanente</li>
                      <li>• Utilizzo memoria in tempo reale</li>
                      <li>• Contatore errori e retry</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Stato Attuale</p>
                <p className="text-sm font-bold text-blue-800">
                  {orders.length > 0 ? `${orders.length.toLocaleString()} ordini` : 'Nessun ordine'}
                </p>
                <p className="text-xs text-blue-500">
                  {localStorage.getItem('shopify_orders_compressed') ? 'Formato compresso' : 'Formato completo'}
                </p>
                <p className="text-xs text-blue-500">
                  Spazio: ~{orders.length > 0 ? Math.round(JSON.stringify(orders).length / 1024) : 0} KB
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informazioni spazio e cache */}
      {orders.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Gestione Dati e Spazio
                  </p>
                  <p className="text-xs text-blue-600">
                    {orders.length} ordini caricati • 
                    {localStorage.getItem('shopify_orders_compressed') ? ' Formato compresso' : ' Formato completo'} • 
                    {localStorage.getItem('shopify_orders_partial_save') === 'true' ? ' Salvataggio parziale' : ' Salvataggio completo'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600">
                  Spazio utilizzato: ~{Math.round(JSON.stringify(orders).length / 1024)} KB
                </p>
                <p className="text-xs text-blue-500">
                  {localStorage.getItem('shopify_orders_partial_save') === 'true' && 
                    `⚠️ Solo ultimi ${orders.length} ordini su ${localStorage.getItem('shopify_orders_total_count')} totali`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totale Ordini</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fatturato Totale</p>
                <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ordini Attivi</p>
                <p className="text-2xl font-bold">{stats.activeOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Archive className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ordini Archiviati</p>
                <p className="text-2xl font-bold">{stats.archivedOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messaggi e errori */}
      {message && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtri e Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ricerca */}
            <div>
              <Label htmlFor="search">Ricerca</Label>
              <Input
                id="search"
                placeholder="Numero ordine, cliente, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Filtro status */}
            <div>
              <Label htmlFor="status">Filtro</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti gli ordini</option>
                <option value="active">Solo attivi</option>
                <option value="archived">Solo archiviati</option>
                <option value="paid">Pagati</option>
                <option value="pending">In attesa</option>
                <option value="refunded">Rimborsati</option>
                <option value="cancelled">Annullati</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista ordini */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Ordini</CardTitle>
          <CardDescription>
            {filteredOrders.length} ordini trovati su {orders.length} totali
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nessun ordine trovato</p>
              <p className="text-sm">Configura Shopify e sincronizza gli ordini per iniziare</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nessun ordine corrisponde ai filtri</p>
              <p className="text-sm">Prova a modificare i criteri di ricerca</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.slice(0, 20).map((order) => (
                <Card key={order.id || order.orderNumber} className={`hover:shadow-md transition-shadow ${
                  order.archived ? 'bg-gray-50 border-gray-200' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            #{order.orderNumber || order.id}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.financialStatus || order.status)}`}>
                            {getStatusLabel(order.financialStatus || order.status)}
                          </span>
                          {order.archived && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Archive className="w-3 h-3 inline mr-1" />
                              Archiviati
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                            <p className="font-medium">{order.customerName || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{order.customerEmail || 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Prodotti</p>
                            <p className="font-medium">{order.lineItems?.length || order.items?.length || 0} articoli</p>
                            <p className="text-sm text-muted-foreground">
                              {order.lineItems?.map(item => item.name).join(', ') || 
                               order.items?.map(item => item.name).join(', ') || 'N/A'}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Totale</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatPrice(order.totalPrice)} {order.currency || '€'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredOrders.length > 20 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Mostrando i primi 20 ordini su {filteredOrders.length}</p>
                  <p className="text-xs">Usa i filtri per trovare ordini specifici</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifyOrdersPage; 