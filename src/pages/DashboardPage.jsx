import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { loadMagazzinoData, loadOrdersData } from '../lib/magazzinoStorage';
import { loadLargeData } from '../lib/dataManager';
import { TrendingUp, Package, ShoppingCart, AlertTriangle, Calendar, BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight, ArrowRight, TruckIcon } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import DateTimeRangePicker from '../components/DateTimeRangePicker';
import SalesChart from '../components/SalesChart';
import { addDays, startOfDay, endOfDay, setHours, setMinutes, setSeconds, subDays, subMonths, subYears, isSameDay, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { getSupplierOrders, ORDER_STATUS } from '../lib/supplierOrders';

const DashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [csvOrders, setCsvOrders] = useState([]);
  const [magazzinoData, setMagazzinoData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topProducts, setTopProducts] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockCount: 0
  });
  
  // Statistiche ordini CSV
  const [csvStats, setCsvStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    totalShippingPaid: 0,
    totalDiscounts: 0,
    totalGeneral: 0
  });
  
  // Periodo principale
  const [startDate, setStartDate] = useState(startOfDay(addDays(new Date(), -30)));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [quickFilter, setQuickFilter] = useState('ultimi30');
  const [tipologia, setTipologia] = useState('');
  const [tipologie, setTipologie] = useState([]);
  
  // Stato per il range data/orario principale
  const [mainDateRange, setMainDateRange] = useState({
    startDate: startOfDay(addDays(new Date(), -30)),
    endDate: endOfDay(new Date()),
    key: 'selection',
  });
  const [mainStartTime, setMainStartTime] = useState('00:00');
  const [mainEndTime, setMainEndTime] = useState('23:59');
  
  // Periodo di confronto
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonStartDate, setComparisonStartDate] = useState(startOfDay(subDays(new Date(), 14)));
  const [comparisonEndDate, setComparisonEndDate] = useState(endOfDay(subDays(new Date(), 7)));
  const [comparisonQuickFilter, setComparisonQuickFilter] = useState('periodoPrecedente');
  const [comparisonTipologia, setComparisonTipologia] = useState('');
  
  // Stato per il range data/orario confronto
  const [comparisonDateRange, setComparisonDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 14)),
    endDate: endOfDay(subDays(new Date(), 7)),
    key: 'selection',
  });
  const [comparisonStartTime, setComparisonStartTime] = useState('00:00');
  const [comparisonEndTime, setComparisonEndTime] = useState('23:59');

  // Funzioni rapide per selezione mese
  const setThisMonth = () => {
    const now = new Date();
    setStartDate(startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)));
    setEndDate(endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  };
  const setLastMonth = () => {
    const now = new Date();
    setStartDate(startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
    setEndDate(endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)));
  };

  const handleDateChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Funzioni per il periodo di confronto
  const setComparisonPeriod = (type) => {
    const now = new Date();
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    let newStartDate, newEndDate;
    
    switch (type) {
      case 'periodoPrecedente':
        newStartDate = startOfDay(subDays(startDate, daysDiff));
        newEndDate = endOfDay(subDays(startDate, 1));
        break;
      case 'stessoPeriodoAnnoScorso':
        newStartDate = startOfDay(subYears(startDate, 1));
        newEndDate = endOfDay(subYears(endDate, 1));
        break;
      case 'stessoPeriodoMeseScorso':
        newStartDate = startOfDay(subMonths(startDate, 1));
        newEndDate = endOfDay(subMonths(endDate, 1));
        break;
      case 'ultimi7Giorni':
        newStartDate = startOfDay(subDays(now, 14));
        newEndDate = endOfDay(subDays(now, 7));
        break;
      case 'meseScorso':
        newStartDate = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        newEndDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'trimestreScorso':
        const currentMonth = now.getMonth();
        const startQuarter = currentMonth - (currentMonth % 3);
        newStartDate = startOfDay(new Date(now.getFullYear(), startQuarter - 3, 1));
        newEndDate = endOfDay(new Date(now.getFullYear(), startQuarter, 0));
        break;
      default:
        return;
    }
    
    setComparisonStartDate(newStartDate);
    setComparisonEndDate(newEndDate);
    setComparisonDateRange({
      startDate: newStartDate,
      endDate: newEndDate,
      key: 'selection',
    });
  };

  // Funzione per filtrare ordini per data
  const filterOrdersByDateRange = (orders, startDate, endDate) => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

  // Carica gli ordini dal database
  useEffect(() => {
    const loadOrders = async () => {
      try {
        // Carica ordini CSV
        const csvOrdersData = await loadLargeData('shopify_orders');
        setCsvOrders(csvOrdersData || []);
        
        // Calcola statistiche ordini CSV
        if (csvOrdersData && csvOrdersData.length > 0) {
          const filteredCsvOrders = filterOrdersByDateRange(csvOrdersData, mainDateRange.startDate, mainDateRange.endDate);
          
          const csvStatsData = {
            totalOrders: filteredCsvOrders.length,
            totalValue: filteredCsvOrders.reduce((sum, order) => sum + (order.total_price || 0), 0),
            totalShippingPaid: filteredCsvOrders.reduce((sum, order) => sum + (order.shipping_cost || 0), 0),
            totalDiscounts: filteredCsvOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0),
            totalGeneral: 0
          };
          
          csvStatsData.totalGeneral = csvStatsData.totalValue + csvStatsData.totalShippingPaid - csvStatsData.totalDiscounts;
          setCsvStats(csvStatsData);
        }
        
        // Carica dal database
        // const dbOrders = await loadOrdersData();
        // if (dbOrders && dbOrders.length > 0) {
        //   setOrders(dbOrders);
        //   await calculateStats(dbOrders);
        //   calculateTopProducts(dbOrders);
        // } else {
          // Fallback al localStorage
          const savedOrders = localStorage.getItem('shopify_orders');
          if (savedOrders) {
            const parsedOrders = JSON.parse(savedOrders);
            // Assicura che sia un array
            const ordersArray = Array.isArray(parsedOrders) ? parsedOrders : [];
            setOrders(ordersArray);
            // await calculateStats(ordersArray);
            // calculateTopProducts(ordersArray);
          } else {
            setOrders([]);
          }
        // }
      } catch (error) {
        console.error('Errore nel caricare ordini:', error);
        // Fallback al localStorage
        const savedOrders = localStorage.getItem('shopify_orders');
        if (savedOrders) {
          const parsedOrders = JSON.parse(savedOrders);
          // Assicura che sia un array
          const ordersArray = Array.isArray(parsedOrders) ? parsedOrders : [];
          setOrders(ordersArray);
          // await calculateStats(ordersArray);
          // calculateTopProducts(ordersArray);
        } else {
          setOrders([]);
        }
      }
    };
    
    // Espongo la funzione per il pulsante Aggiorna
    window.__dashboardLoadOrders = loadOrders;
    
    // Carica inizialmente
    loadOrders();
    
    // Listener per aggiornamento da altre tab o da OrdiniPage
    const handleStorage = (e) => {
      if (e.key === 'shopify_orders') {
        loadOrders();
      }
    };
    
    // Listener per aggiornamento nella stessa tab
    const handleCustomEvent = () => {
      loadOrders();
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('dashboard-update', handleCustomEvent);
    
    // Aggiorna ogni 30 secondi per sicurezza
    const interval = setInterval(loadOrders, 30000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dashboard-update', handleCustomEvent);
      clearInterval(interval);
      delete window.__dashboardLoadOrders;
    };
  }, []);

  useEffect(() => {
    // Estrai tutte le tipologie uniche dal magazzino
    const loadTipologie = async () => {
      try {
        const magazzino = await loadMagazzinoData();
        // Assicura che magazzino sia un array
        const magazzinoArray = Array.isArray(magazzino) ? magazzino : [];
        setMagazzinoData(magazzinoArray);
        const tipi = Array.from(new Set(magazzinoArray.map(item => item.tipologia).filter(Boolean)));
        setTipologie(tipi);
      } catch (error) {
        console.error('Errore nel caricare tipologie:', error);
        setMagazzinoData([]);
        setTipologie([]);
      }
    };
    loadTipologie();
  }, []);

  // Aggiorna statistiche CSV quando cambia il periodo
  useEffect(() => {
    if (csvOrders.length > 0) {
      const filteredCsvOrders = filterOrdersByDateRange(csvOrders, mainDateRange.startDate, mainDateRange.endDate);
      
      const csvStatsData = {
        totalOrders: filteredCsvOrders.length,
        totalValue: filteredCsvOrders.reduce((sum, order) => sum + (order.total_price || 0), 0),
        totalShippingPaid: filteredCsvOrders.reduce((sum, order) => sum + (order.shipping_cost || 0), 0),
        totalDiscounts: filteredCsvOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0),
        totalGeneral: 0
      };
      
      csvStatsData.totalGeneral = csvStatsData.totalValue + csvStatsData.totalShippingPaid - csvStatsData.totalDiscounts;
      setCsvStats(csvStatsData);
    }
  }, [csvOrders, mainDateRange]);

  // Gestione filtri rapidi per periodo principale
  useEffect(() => {
    const now = new Date();
    let newStartDate, newEndDate;
    
    if (quickFilter === 'oggi') {
      newStartDate = startOfDay(now);
      newEndDate = endOfDay(now);
    } else if (quickFilter === 'ultimi7') {
      newStartDate = startOfDay(addDays(now, -7));
      newEndDate = endOfDay(now);
    } else if (quickFilter === 'ultimi30') {
      newStartDate = startOfDay(addDays(now, -30));
      newEndDate = endOfDay(now);
    } else if (quickFilter === 'questoMese') {
      newStartDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (quickFilter === 'meseScorso') {
      newStartDate = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (quickFilter === 'primoTrimestre') {
      newStartDate = startOfDay(new Date(now.getFullYear(), 0, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), 2, 31));
    } else if (quickFilter === 'secondoTrimestre') {
      newStartDate = startOfDay(new Date(now.getFullYear(), 3, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), 5, 30));
    } else if (quickFilter === 'terzoTrimestre') {
      newStartDate = startOfDay(new Date(now.getFullYear(), 6, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), 8, 30));
    } else if (quickFilter === 'quartoTrimestre') {
      newStartDate = startOfDay(new Date(now.getFullYear(), 9, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), 11, 31));
    } else if (quickFilter === 'ultimoTrimestre') {
      const currentMonth = now.getMonth();
      const startQuarter = currentMonth - (currentMonth % 3);
      newStartDate = startOfDay(new Date(now.getFullYear(), startQuarter, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), startQuarter + 3, 0));
    } else if (quickFilter === 'tuttiTrimestri') {
      newStartDate = startOfDay(new Date(now.getFullYear(), 0, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), 11, 31));
    } else if (quickFilter === 'questAnno') {
      newStartDate = startOfDay(new Date(now.getFullYear(), 0, 1));
      newEndDate = endOfDay(new Date(now.getFullYear(), 11, 31));
    } else {
      // Se personalizzato, non cambiare nulla
      return;
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setMainDateRange({
      startDate: newStartDate,
      endDate: newEndDate,
      key: 'selection',
    });
  }, [quickFilter]);

  // Gestione filtri rapidi per periodo di confronto
  useEffect(() => {
    if (showComparison) {
      setComparisonPeriod(comparisonQuickFilter);
    }
  }, [comparisonQuickFilter, showComparison]);

  // Sincronizza mainDateRange con startDate e endDate
  useEffect(() => {
    setMainDateRange({
      startDate: startDate,
      endDate: endDate,
      key: 'selection',
    });
  }, [startDate, endDate]);

  const calculateStats = async (ordersList) => {
    const totalRevenue = ordersList.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalProducts = ordersList.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    
    try {
      // Conta prodotti con scorte basse
      const magazzino = await loadMagazzinoData();
      const lowStockCount = magazzino.filter(item => item.quantita <= lowStockThreshold).length;

      setStats({
        totalOrders: ordersList.length,
        totalRevenue,
        totalProducts,
        lowStockCount
      });
    } catch (error) {
      console.error('Errore nel caricare magazzino per statistiche:', error);
      setStats({
        totalOrders: ordersList.length,
        totalRevenue,
        totalProducts,
        lowStockCount: 0
      });
    }
  };

  const calculateTopProducts = (ordersList) => {
    const productMap = new Map();

    ordersList.forEach(order => {
      order.items.forEach(item => {
        if (item.sku) {
          const existing = productMap.get(item.sku) || {
            sku: item.sku,
            name: item.name,
            quantity: 0,
            revenue: 0,
            orders: new Set()
          };
          
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
          existing.orders.add(order.orderNumber);
          
          productMap.set(item.sku, existing);
        }
      });
    });

    // Converti in array e ordina per quantità
    const topProductsArray = Array.from(productMap.values())
      .map(product => ({
        ...product,
        orders: Array.from(product.orders).length
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    setTopProducts(topProductsArray);
  };

  const syncOrders = async (recentOnly = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shopify/orders?recent=${recentOnly}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        // await calculateStats(data.orders);
        // calculateTopProducts(data.orders);
      }
    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLowStockProducts = () => {
    try {
      // Usa i dati già caricati dal magazzino
      const magazzino = Array.isArray(magazzinoData) ? magazzinoData : [];
      
      // Filtra prodotti con scorte basse usando la soglia configurabile
      const lowStockProducts = magazzino.filter(item => item.quantita <= lowStockThreshold);
      
      // Calcola i prodotti più venduti per dare priorità
      const productSalesMap = new Map();
      // filteredOrders.forEach(order => {
      //   order.items.forEach(item => {
      //     if (item.sku) {
      //       const existing = productSalesMap.get(item.sku) || { sku: item.sku, totalSold: 0 };
      //       existing.totalSold += item.quantity;
      //       productSalesMap.set(item.sku, existing);
      //     }
      //   });
      // });
      
      // Ordina i prodotti con scorte basse: prima i più venduti, poi per quantità crescente
      return lowStockProducts
        .map(product => ({
          ...product,
          totalSold: productSalesMap.get(product.sku)?.totalSold || 0
        }))
        .sort((a, b) => {
          // Prima ordina per vendite totali (decrescente)
          if (b.totalSold !== a.totalSold) {
            return b.totalSold - a.totalSold;
          }
          // Poi per quantità crescente (più critici prima)
          return a.quantita - b.quantita;
        })
        .slice(0, 5);
    } catch (error) {
      console.error('Errore nel caricare prodotti scorte basse:', error);
      return [];
    }
  };

  const getRecentOrders = () => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    return ordersArray
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  };

  // Funzione per creare date con orario specifico
  const createDateTime = (date, time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return setSeconds(setMinutes(setHours(date, hours), minutes), 0);
  };

  // Filtra gli ordini per data e orario (nuova logica)
  const getFilteredOrders = () => {
    const startDateTime = createDateTime(startDate, mainStartTime);
    const endDateTime = createDateTime(endDate, mainEndTime);
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const inDate = orderDate >= startDateTime && orderDate <= endDateTime;
      if (!inDate) return false;
      if (!tipologia) return true;
      // Almeno un prodotto dell'ordine deve avere la tipologia selezionata
      return order.items.some(item => item.tipologia === tipologia);
    });
  };

  // Filtra gli ordini per il periodo di confronto
  const getComparisonFilteredOrders = () => {
    if (!showComparison) return [];
    const startDateTime = createDateTime(comparisonStartDate, comparisonStartTime);
    const endDateTime = createDateTime(comparisonEndDate, comparisonEndTime);
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const inDate = orderDate >= startDateTime && orderDate <= endDateTime;
      if (!inDate) return false;
      if (!comparisonTipologia) return true;
      // Almeno un prodotto dell'ordine deve avere la tipologia selezionata
      return order.items.some(item => item.tipologia === comparisonTipologia);
    });
  };

  const filteredOrders = getFilteredOrders();
  const comparisonFilteredOrders = getComparisonFilteredOrders();

  // Calcola le statistiche per entrambi i periodi
  const mainStats = {
    orders: filteredOrders.length,
    revenue: filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0),
    products: filteredOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    avgOrderValue: filteredOrders.length > 0 ? filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0) / filteredOrders.length : 0,
    paidShipping: filteredOrders.filter(order => order.shippingPrice > 0).length,
    shippingRevenue: filteredOrders.filter(order => order.shippingPrice > 0).reduce((sum, order) => sum + order.shippingPrice, 0)
  };

  const comparisonStats = {
    orders: comparisonFilteredOrders.length,
    revenue: comparisonFilteredOrders.reduce((sum, order) => sum + order.totalPrice, 0),
    products: comparisonFilteredOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    avgOrderValue: comparisonFilteredOrders.length > 0 ? comparisonFilteredOrders.reduce((sum, order) => sum + order.totalPrice, 0) / comparisonFilteredOrders.length : 0,
    paidShipping: comparisonFilteredOrders.filter(order => order.shippingPrice > 0).length,
    shippingRevenue: comparisonFilteredOrders.filter(order => order.shippingPrice > 0).reduce((sum, order) => sum + order.shippingPrice, 0)
  };

  // Calcola le variazioni percentuali
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Funzione per determinare il colore basato sul confronto
  const getComparisonColor = (current, previous) => {
    if (previous === 0) return current > 0 ? 'green' : 'red';
    const percentage = ((current - previous) / previous) * 100;
    if (Math.abs(percentage) < 1) return 'orange'; // Se la differenza è meno dell'1%, considera uguale
    return percentage > 0 ? 'green' : 'red';
  };

  const percentageChanges = {
    orders: calculatePercentageChange(mainStats.orders, comparisonStats.orders),
    revenue: calculatePercentageChange(mainStats.revenue, comparisonStats.revenue),
    products: calculatePercentageChange(mainStats.products, comparisonStats.products),
    avgOrderValue: calculatePercentageChange(mainStats.avgOrderValue, comparisonStats.avgOrderValue),
    paidShipping: calculatePercentageChange(mainStats.paidShipping, comparisonStats.paidShipping),
    shippingRevenue: calculatePercentageChange(mainStats.shippingRevenue, comparisonStats.shippingRevenue)
  };

  // Colori per ogni statistica
  const comparisonColors = {
    orders: getComparisonColor(mainStats.orders, comparisonStats.orders),
    revenue: getComparisonColor(mainStats.revenue, comparisonStats.revenue),
    products: getComparisonColor(mainStats.products, comparisonStats.products),
    avgOrderValue: getComparisonColor(mainStats.avgOrderValue, comparisonStats.avgOrderValue),
    paidShipping: getComparisonColor(mainStats.paidShipping, comparisonStats.paidShipping),
    shippingRevenue: getComparisonColor(mainStats.shippingRevenue, comparisonStats.shippingRevenue)
  };

  // Statistiche ordini fornitori
  const [supplierStats, setSupplierStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    toPay: 0,
    paid: 0,
    inTransit: 0,
    partial: 0,
    received: 0
  });

  // Configurazione soglia scorte basse
  const [lowStockThreshold, setLowStockThreshold] = useState(() => {
    const saved = localStorage.getItem('lowStockThreshold');
    return saved ? parseInt(saved) : 5;
  });

  // Salva la soglia quando cambia
  useEffect(() => {
    localStorage.setItem('lowStockThreshold', lowStockThreshold.toString());
  }, [lowStockThreshold]);

  // Configurazione categorie prodotti più venduti
  const [productCategories, setProductCategories] = useState(() => {
    const saved = localStorage.getItem('productCategories');
    return saved ? JSON.parse(saved) : ['Skincare', 'Profumo', 'Premium', 'Lusso', 'Eco-friendly'];
  });

  // Salva le categorie quando cambiano
  useEffect(() => {
    localStorage.setItem('productCategories', JSON.stringify(productCategories));
  }, [productCategories]);

  // Categoria selezionata per i prodotti più venduti
  const [selectedCategory, setSelectedCategory] = useState('tutte');
  
  // Ordine per i prodotti più venduti
  const [sortOrder, setSortOrder] = useState('decrescente'); // 'crescente' o 'decrescente'

  useEffect(() => {
    // Calcola statistiche ordini fornitori
    const supplierOrders = getSupplierOrders();
    const totalOrders = supplierOrders.length;
    const totalValue = supplierOrders.reduce((sum, o) => sum + o.totalValue, 0);
    const paid = supplierOrders.filter(o => o.status === ORDER_STATUS.PAID).length;
    const toPay = supplierOrders.filter(o => o.status === ORDER_STATUS.PARTIAL || o.status === ORDER_STATUS.RECEIVED).length;
    const inTransit = supplierOrders.filter(o => o.status === ORDER_STATUS.IN_TRANSIT).length;
    const partial = supplierOrders.filter(o => o.status === ORDER_STATUS.PARTIAL).length;
    const received = supplierOrders.filter(o => o.status === ORDER_STATUS.RECEIVED).length;
    setSupplierStats({ totalOrders, totalValue, toPay, paid, inTransit, partial, received });
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        
        {/* Controllo confronto */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="rounded"
            />
                            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Confronto Periodi</span>
          </label>
        </div>
      </div>

      {/* Filtri Periodo Principale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Periodo Principale
          </CardTitle>
          <CardDescription>
            Periodo selezionato: {format(startDate, 'dd/MM/yyyy', { locale: it })} - {format(endDate, 'dd/MM/yyyy', { locale: it })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Filtri rapidi */}
            <select
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={quickFilter}
              onChange={e => setQuickFilter(e.target.value)}
            >
              <option value="oggi">Oggi</option>
              <option value="ultimi7">Ultimi 7 giorni</option>
              <option value="ultimi30">Ultimi 30 giorni</option>
              <option value="questoMese">Questo mese</option>
              <option value="meseScorso">Mese scorso</option>
              <option value="primoTrimestre">Primo trimestre</option>
              <option value="secondoTrimestre">Secondo trimestre</option>
              <option value="terzoTrimestre">Terzo trimestre</option>
              <option value="quartoTrimestre">Quarto trimestre</option>
              <option value="ultimoTrimestre">Ultimo trimestre</option>
              <option value="tuttiTrimestri">Tutti i trimestri</option>
              <option value="questAnno">Quest'anno</option>
            </select>

            {/* Filtro tipologia */}
            <select
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={tipologia}
              onChange={e => setTipologia(e.target.value)}
            >
              <option value="">Tutte le tipologie</option>
              {(Array.isArray(tipologie) ? tipologie : []).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Calendario range + orario (nuovo componente) */}
            <DateTimeRangePicker
              range={mainDateRange}
              onRangeChange={range => {
                setMainDateRange(range);
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
              startTime={mainStartTime}
              endTime={mainEndTime}
              onStartTimeChange={setMainStartTime}
              onEndTimeChange={setMainEndTime}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtri Periodo di Confronto */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Periodo di Confronto
            </CardTitle>
            <CardDescription>
              Confronto con: {format(comparisonStartDate, 'dd/MM/yyyy', { locale: it })} - {format(comparisonEndDate, 'dd/MM/yyyy', { locale: it })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Filtri rapidi confronto */}
              <select
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                value={comparisonQuickFilter}
                onChange={e => setComparisonQuickFilter(e.target.value)}
              >
                <option value="periodoPrecedente">Periodo precedente</option>
                <option value="stessoPeriodoAnnoScorso">Stesso periodo anno scorso</option>
                <option value="stessoPeriodoMeseScorso">Stesso periodo mese scorso</option>
                <option value="ultimi7Giorni">Ultimi 7 giorni</option>
                <option value="meseScorso">Mese scorso</option>
                <option value="trimestreScorso">Trimestre scorso</option>
              </select>

              {/* Filtro tipologia confronto */}
              <select
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                value={comparisonTipologia}
                onChange={e => setComparisonTipologia(e.target.value)}
              >
                <option value="">Tutte le tipologie</option>
                {(Array.isArray(tipologie) ? tipologie : []).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Calendario range confronto */}
              <DateTimeRangePicker
                range={comparisonDateRange}
                onRangeChange={range => {
                  setComparisonDateRange(range);
                  setComparisonStartDate(range.startDate);
                  setComparisonEndDate(range.endDate);
                }}
                startTime={comparisonStartTime}
                endTime={comparisonEndTime}
                onStartTimeChange={setComparisonStartTime}
                onEndTimeChange={setComparisonEndTime}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grafico Prodotti Venduti */}
      <SalesChart 
        orders={filteredOrders} 
        startDate={startDate} 
        endDate={endDate}
        comparisonOrders={showComparison ? comparisonFilteredOrders : null}
        comparisonStartDate={showComparison ? comparisonStartDate : null}
        comparisonEndDate={showComparison ? comparisonEndDate : null}
      />

      {/* Statistiche Rapide */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Ordini</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mainStats.orders}</div>
            {showComparison && (
              <div className="flex items-center gap-1 text-xs">
                {comparisonColors.orders === 'green' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : comparisonColors.orders === 'red' ? (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                ) : (
                  <ArrowRight className="h-3 w-3 text-orange-600" />
                )}
                <span className={
                  comparisonColors.orders === 'green' ? 'text-green-600' : 
                  comparisonColors.orders === 'red' ? 'text-red-600' : 
                  'text-orange-600'
                }>
                  {Math.abs(percentageChanges.orders).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">
                  vs {comparisonStats.orders} ordini
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fatturato Totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(mainStats.revenue)}</div>
            {showComparison && (
              <div className="flex items-center gap-1 text-xs">
                {comparisonColors.revenue === 'green' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : comparisonColors.revenue === 'red' ? (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                ) : (
                  <ArrowRight className="h-3 w-3 text-orange-600" />
                )}
                <span className={
                  comparisonColors.revenue === 'green' ? 'text-green-600' : 
                  comparisonColors.revenue === 'red' ? 'text-red-600' : 
                  'text-orange-600'
                }>
                  {Math.abs(percentageChanges.revenue).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">
                  vs {formatPrice(comparisonStats.revenue)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prodotti Venduti</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mainStats.products}</div>
            {showComparison && (
              <div className="flex items-center gap-1 text-xs">
                {comparisonColors.products === 'green' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : comparisonColors.products === 'red' ? (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                ) : (
                  <ArrowRight className="h-3 w-3 text-orange-600" />
                )}
                <span className={
                  comparisonColors.products === 'green' ? 'text-green-600' : 
                  comparisonColors.products === 'red' ? 'text-red-600' : 
                  'text-orange-600'
                }>
                  {Math.abs(percentageChanges.products).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">
                  vs {comparisonStats.products} prodotti
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valore Medio Ordine</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(mainStats.avgOrderValue)}</div>
            {showComparison && (
              <div className="flex items-center gap-1 text-xs">
                {comparisonColors.avgOrderValue === 'green' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : comparisonColors.avgOrderValue === 'red' ? (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                ) : (
                  <ArrowRight className="h-3 w-3 text-orange-600" />
                )}
                <span className={
                  comparisonColors.avgOrderValue === 'green' ? 'text-green-600' : 
                  comparisonColors.avgOrderValue === 'red' ? 'text-red-600' : 
                  'text-orange-600'
                }>
                  {Math.abs(percentageChanges.avgOrderValue).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">
                  vs {formatPrice(comparisonStats.avgOrderValue)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Card: Spedizioni Pagate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spedizioni Pagate</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mainStats.paidShipping}</div>
            <div className="text-xs text-muted-foreground mb-1">ordini con spedizione a pagamento</div>
            {showComparison && (
              <div className="flex items-center gap-1 text-xs mb-2">
                {comparisonColors.paidShipping === 'green' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : comparisonColors.paidShipping === 'red' ? (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                ) : (
                  <ArrowRight className="h-3 w-3 text-orange-600" />
                )}
                <span className={
                  comparisonColors.paidShipping === 'green' ? 'text-green-600' : 
                  comparisonColors.paidShipping === 'red' ? 'text-red-600' : 
                  'text-orange-600'
                }>
                  {Math.abs(percentageChanges.paidShipping).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">
                  vs {comparisonStats.paidShipping} ordini
                </span>
              </div>
            )}
            <div className="text-lg font-semibold text-blue-700">
              {formatPrice(mainStats.shippingRevenue)}
            </div>
            <div className="text-xs text-muted-foreground">totale incassato spedizioni</div>
            {showComparison && (
              <div className="flex items-center gap-1 text-xs mt-1">
                {comparisonColors.shippingRevenue === 'green' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : comparisonColors.shippingRevenue === 'red' ? (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                ) : (
                  <ArrowRight className="h-3 w-3 text-orange-600" />
                )}
                <span className={
                  comparisonColors.shippingRevenue === 'green' ? 'text-green-600' : 
                  comparisonColors.shippingRevenue === 'red' ? 'text-red-600' : 
                  'text-orange-600'
                }>
                  {Math.abs(percentageChanges.shippingRevenue).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">
                  vs {formatPrice(comparisonStats.shippingRevenue)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sezione Statistiche Ordini CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Statistiche Ordini CSV
          </CardTitle>
          <CardDescription>
            Dati degli ordini importati dal CSV per il periodo selezionato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totale Ordini</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{csvStats.totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Ordini nel periodo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valore Totale</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(csvStats.totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Somma ordini
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Spedizioni Pagate</CardTitle>
                <TruckIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(csvStats.totalShippingPaid)}</div>
                <p className="text-xs text-muted-foreground">
                  Costi spedizione
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sconti Eseguiti</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(csvStats.totalDiscounts)}</div>
                <p className="text-xs text-muted-foreground">
                  Sconti applicati
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totale Generale</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(csvStats.totalGeneral)}</div>
                <p className="text-xs text-muted-foreground">
                  Valore + Spedizione - Sconti
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche Ordini Fornitori */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Ordini Fornitori
          </CardTitle>
          <CardDescription>
            Totale valore ordini, pagati, da pagare, in transito, parziali, ricevuti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Totale ordini</div>
              <div className="text-lg font-bold">{supplierStats.totalOrders}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Valore totale</div>
              <div className="text-lg font-bold text-green-700">{formatPrice(supplierStats.totalValue)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Da pagare</div>
              <div className="text-lg font-bold text-yellow-700">{supplierStats.toPay}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Pagati</div>
              <div className="text-lg font-bold text-green-700">{supplierStats.paid}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">In transito</div>
              <div className="text-lg font-bold text-blue-700">{supplierStats.inTransit}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Parziali</div>
              <div className="text-lg font-bold text-orange-700">{supplierStats.partial}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ricevuti</div>
              <div className="text-lg font-bold text-green-600">{supplierStats.received}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche Dettagliate Spedizioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            Statistiche Spedizioni
          </CardTitle>
          <CardDescription>
            Analisi dettagliata delle spedizioni e dei costi associati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Ordini con spedizione</div>
              <div className="text-lg font-bold text-blue-700">{mainStats.paidShipping}</div>
              <div className="text-xs text-gray-500">
                {mainStats.orders > 0 ? ((mainStats.paidShipping / mainStats.orders) * 100).toFixed(1) : 0}% del totale
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ordini spedizione gratuita</div>
              <div className="text-lg font-bold text-green-700">{mainStats.orders - mainStats.paidShipping}</div>
              <div className="text-xs text-gray-500">
                {mainStats.orders > 0 ? (((mainStats.orders - mainStats.paidShipping) / mainStats.orders) * 100).toFixed(1) : 0}% del totale
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Incasso spedizioni</div>
              <div className="text-lg font-bold text-blue-700">{formatPrice(mainStats.shippingRevenue)}</div>
              <div className="text-xs text-gray-500">
                {mainStats.revenue > 0 ? ((mainStats.shippingRevenue / mainStats.revenue) * 100).toFixed(1) : 0}% del fatturato
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Media costo spedizione</div>
              <div className="text-lg font-bold text-orange-700">
                {mainStats.paidShipping > 0 ? formatPrice(mainStats.shippingRevenue / mainStats.paidShipping) : formatPrice(0)}
              </div>
              <div className="text-xs text-gray-500">per ordine con spedizione</div>
            </div>
          </div>
          
          {/* Riepilogo rapido */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">💡 Insight Spedizioni:</div>
            <div className="text-xs text-blue-700">
              {mainStats.orders > 0 && (
                <>
                  {mainStats.paidShipping > 0 ? (
                    <>
                      <span className="font-medium">{((mainStats.paidShipping / mainStats.orders) * 100).toFixed(1)}%</span> degli ordini ha una spedizione a pagamento, 
                      generando <span className="font-medium">{formatPrice(mainStats.shippingRevenue)}</span> di ricavi aggiuntivi 
                      ({mainStats.revenue > 0 ? ((mainStats.shippingRevenue / mainStats.revenue) * 100).toFixed(1) : 0}% del fatturato totale).
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
          
          {showComparison && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium text-gray-700 mb-2">Confronto con periodo precedente:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-gray-500">Ordini con spedizione</div>
                  <div className={`font-medium ${
                    comparisonColors.paidShipping === 'green' ? 'text-green-600' : 
                    comparisonColors.paidShipping === 'red' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {mainStats.paidShipping} vs {comparisonStats.paidShipping} ({percentageChanges.paidShipping > 0 ? '+' : ''}{percentageChanges.paidShipping.toFixed(1)}%)
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Incasso spedizioni</div>
                  <div className={`font-medium ${
                    comparisonColors.shippingRevenue === 'green' ? 'text-green-600' : 
                    comparisonColors.shippingRevenue === 'red' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {formatPrice(mainStats.shippingRevenue)} vs {formatPrice(comparisonStats.shippingRevenue)} ({percentageChanges.shippingRevenue > 0 ? '+' : ''}{percentageChanges.shippingRevenue.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prodotti Più Venduti */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <div>
                <CardTitle>Prodotti Più Venduti</CardTitle>
                <CardDescription>
                  Top 10 prodotti per quantità venduta 
                  {sortOrder === 'decrescente' ? ' (più venduti prima)' : ' (meno venduti prima)'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Categoria:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="tutte">Tutte le categorie</option>
                {(Array.isArray(productCategories) ? productCategories : []).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const newCategory = prompt('Inserisci il nome della nuova categoria:');
                  if (newCategory && !productCategories.includes(newCategory)) {
                    setProductCategories([...productCategories, newCategory]);
                  }
                }}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                + Categoria
              </button>
              <div className="flex items-center gap-1 ml-2">
                <label className="text-sm font-medium">Ordine:</label>
                <button
                  onClick={() => setSortOrder('decrescente')}
                  className={`text-xs px-2 py-1 rounded ${
                    sortOrder === 'decrescente' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ↓ Decrescente
                </button>
                <button
                  onClick={() => setSortOrder('crescente')}
                  className={`text-xs px-2 py-1 rounded ${
                    sortOrder === 'crescente' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ↑ Crescente
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              // Raggruppa e ordina i prodotti più venduti solo tra gli ordini filtrati
              const productMap = new Map();
              filteredOrders.forEach(order => {
                order.items.forEach(item => {
                  if (item.sku) {
                    const existing = productMap.get(item.sku) || {
                      sku: item.sku,
                      name: item.name,
                      quantity: 0,
                      revenue: 0,
                      orders: new Set(),
                      category: localStorage.getItem(`category_${item.sku}`) || 'Skincare'
                    };
                    existing.quantity += item.quantity;
                    existing.revenue += item.price * item.quantity;
                    existing.orders.add(order.orderNumber);
                    productMap.set(item.sku, existing);
                  }
                });
              });
              
              // Filtra per categoria selezionata
              let filteredProducts = Array.from(productMap.values())
                .map(product => ({
                  ...product,
                  orders: Array.from(product.orders).length
                }));
              
              if (selectedCategory !== 'tutte') {
                filteredProducts = filteredProducts.filter(product => product.category === selectedCategory);
              }
              
              const topProductsArray = filteredProducts
                .sort((a, b) => {
                  if (sortOrder === 'decrescente') {
                    return b.quantity - a.quantity;
                  } else {
                    return a.quantity - b.quantity;
                  }
                })
                .slice(0, 10);
              return topProductsArray.length > 0 ? topProductsArray.map((product, index) => (
                <div key={product.sku} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {sortOrder === 'decrescente' ? index + 1 : topProductsArray.length - index}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                          {product.category}
                        </span>
                        <button
                          onClick={() => {
                            const newCategory = prompt(
                              `Cambia categoria per ${product.name}:\n\nCategorie disponibili: ${productCategories.join(', ')}`,
                              product.category
                            );
                            if (newCategory && productCategories.includes(newCategory)) {
                              localStorage.setItem(`category_${product.sku}`, newCategory);
                              // Forza il re-render
                              window.dispatchEvent(new Event('dashboard-update'));
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Cambia
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{product.quantity} pz</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPrice(product.revenue)} • {product.orders} ordini
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun prodotto venduto ancora
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Sezione Inferiore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scorte Basse */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <CardTitle>Scorte Basse</CardTitle>
                  <CardDescription>
                    Prodotti con quantità ≤ {lowStockThreshold} pezzi
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Soglia:</label>
                <select
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={3}>≤ 3</option>
                  <option value={5}>≤ 5</option>
                  <option value={10}>≤ 10</option>
                  <option value={15}>≤ 15</option>
                  <option value={20}>≤ 20</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(Array.isArray(getLowStockProducts()) ? getLowStockProducts() : []).map((product) => (
                <div key={product.sku} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{product.nome}</div>
                    <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                    {product.totalSold > 0 && (
                      <div className="text-xs text-blue-600 font-medium">
                        Venduti: {product.totalSold} pz
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${product.quantita <= 2 ? 'text-red-600' : 'text-orange-600'}`}>
                      {product.quantita} pz
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatPrice(product.prezzo)}
                    </div>
                  </div>
                </div>
              ))}
              {(Array.isArray(getLowStockProducts()) ? getLowStockProducts() : []).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nessun prodotto con scorte basse
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ultimi Ordini */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ultimi Ordini
            </CardTitle>
            <CardDescription>
              Gli ultimi 5 ordini ricevuti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(Array.isArray(getRecentOrders()) ? getRecentOrders() : []).map((order) => (
                <div key={order.orderNumber} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">#{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(order.totalPrice)}</div>
                    <div className={`text-sm px-2 py-1 rounded ${
                      order.status === 'paid' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'paid' ? 'Pagato' : 
                       order.status === 'pending' ? 'In attesa' : order.status}
                    </div>
                  </div>
                </div>
              ))}
              {(Array.isArray(getRecentOrders()) ? getRecentOrders() : []).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nessun ordine ancora
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage; 