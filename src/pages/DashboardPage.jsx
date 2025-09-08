import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { loadMagazzinoData } from '../lib/magazzinoStorage';
import { loadLargeData } from '../lib/dataManager';
import { TrendingUp, Package, ShoppingCart, AlertTriangle, Calendar, BarChart3, TruckIcon, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatPrice } from '../lib/utils';
import { addDays, startOfDay, endOfDay, subDays, subMonths, subYears, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { getSupplierOrders, ORDER_STATUS } from '../lib/supplierOrders';

const DashboardPage = () => {
  const [csvOrders, setCsvOrders] = useState([]);
  const [magazzinoData, setMagazzinoData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topProducts, setTopProducts] = useState([]);
  const [stats, setStats] = useState({
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
  
  // Dati per il grafico
  const [chartData, setChartData] = useState([]);
  const [comparisonChartData, setComparisonChartData] = useState([]);
  
  // Periodo principale
  const [startDate, setStartDate] = useState(startOfDay(addDays(new Date(), -30)));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [quickFilter, setQuickFilter] = useState('ultimi30');
  const [tipologia, setTipologia] = useState('');
  const [tipologie, setTipologie] = useState([]);
  
  // Stato per il range data principale
  const [mainDateRange, setMainDateRange] = useState({
    startDate: startOfDay(addDays(new Date(), -30)),
    endDate: endOfDay(new Date()),
    key: 'selection',
  });
  
  // Periodo di confronto
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonStartDate, setComparisonStartDate] = useState(startOfDay(subDays(new Date(), 14)));
  const [comparisonEndDate, setComparisonEndDate] = useState(endOfDay(subDays(new Date(), 7)));
  const [comparisonQuickFilter, setComparisonQuickFilter] = useState('periodoPrecedente');
  const [comparisonTipologia, setComparisonTipologia] = useState('');
  
  // Stato per il range data confronto
  const [comparisonDateRange, setComparisonDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 14)),
    endDate: endOfDay(subDays(new Date(), 7)),
    key: 'selection',
  });

  // Funzione per filtrare ordini per data
  const filterOrdersByDateRange = (orders, startDate, endDate) => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

  // Funzione per calcolare dati del grafico
  const calculateChartData = (orders, startDate, endDate, comparisonOrders = null, comparisonStartDate = null, comparisonEndDate = null) => {
    if (!orders || orders.length === 0) return [];

    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayKey = format(currentDate, 'yyyy-MM-dd');
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return format(orderDate, 'yyyy-MM-dd') === dayKey;
      });

      const dayStats = {
        date: format(currentDate, 'dd/MM'),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + (order.total_price || 0), 0),
        products: dayOrders.reduce((sum, order) => {
          if (order.products && order.products.length > 0) {
            return sum + order.products.reduce((prodSum, product) => prodSum + (product.quantity || 0), 0);
          }
          return sum;
        }, 0)
      };

      // Aggiungi dati di confronto se disponibili
      if (comparisonOrders && comparisonStartDate && comparisonEndDate) {
        const comparisonDayKey = format(currentDate, 'yyyy-MM-dd');
        const comparisonDayOrders = comparisonOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return format(orderDate, 'yyyy-MM-dd') === comparisonDayKey;
        });

        dayStats.comparisonOrders = comparisonDayOrders.length;
        dayStats.comparisonRevenue = comparisonDayOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        dayStats.comparisonProducts = comparisonDayOrders.reduce((sum, order) => {
          if (order.products && order.products.length > 0) {
            return sum + order.products.reduce((prodSum, product) => prodSum + (product.quantity || 0), 0);
          }
          return sum;
        }, 0);
      }

      days.push(dayStats);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // Carica gli ordini CSV
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
          
          // Calcola dati per il grafico
          const chartData = calculateChartData(filteredCsvOrders, mainDateRange.startDate, mainDateRange.endDate);
          setChartData(chartData);
        }
      } catch (error) {
        console.error('Errore nel caricare ordini CSV:', error);
        setCsvOrders([]);
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
        
        // Calcola statistiche magazzino
        const totalProducts = magazzinoArray.length;
        const lowStockCount = magazzinoArray.filter(item => item.quantita <= 10).length;
        
        setStats({
          totalProducts,
          lowStockCount
        });
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
      
      // Calcola dati di confronto se abilitato
      let comparisonOrders = null;
      if (showComparison) {
        comparisonOrders = filterOrdersByDateRange(csvOrders, comparisonDateRange.startDate, comparisonDateRange.endDate);
      }
      
      // Aggiorna dati del grafico con confronto
      const chartData = calculateChartData(
        filteredCsvOrders, 
        mainDateRange.startDate, 
        mainDateRange.endDate,
        comparisonOrders,
        comparisonDateRange.startDate,
        comparisonDateRange.endDate
      );
      setChartData(chartData);
    }
  }, [csvOrders, mainDateRange, showComparison, comparisonDateRange]);

  // Gestione filtri rapidi per periodo principale
  useEffect(() => {
    const now = new Date();
    let newStartDate, newEndDate;
    
    switch (quickFilter) {
      case 'oggi':
        newStartDate = startOfDay(now);
        newEndDate = endOfDay(now);
        break;
      case 'ultimi7':
        newStartDate = startOfDay(subDays(now, 6));
        newEndDate = endOfDay(now);
        break;
      case 'ultimi30':
        newStartDate = startOfDay(subDays(now, 29));
        newEndDate = endOfDay(now);
        break;
      case 'questoMese':
        newStartDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        newEndDate = endOfDay(now);
        break;
      case 'meseScorso':
        newStartDate = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        newEndDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'primoTrimestre':
        newStartDate = startOfDay(new Date(now.getFullYear(), 0, 1));
        newEndDate = endOfDay(new Date(now.getFullYear(), 2, 31));
        break;
      case 'secondoTrimestre':
        newStartDate = startOfDay(new Date(now.getFullYear(), 3, 1));
        newEndDate = endOfDay(new Date(now.getFullYear(), 5, 30));
        break;
      case 'terzoTrimestre':
        newStartDate = startOfDay(new Date(now.getFullYear(), 6, 1));
        newEndDate = endOfDay(new Date(now.getFullYear(), 8, 30));
        break;
      case 'quartoTrimestre':
        newStartDate = startOfDay(new Date(now.getFullYear(), 9, 1));
        newEndDate = endOfDay(new Date(now.getFullYear(), 11, 31));
        break;
      default:
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
  const handleComparisonQuickFilter = (filter) => {
    const now = new Date();
    let newStartDate, newEndDate;
    
    switch (filter) {
      case 'periodoPrecedente':
        const diffDays = Math.ceil((mainDateRange.endDate - mainDateRange.startDate) / (1000 * 60 * 60 * 24));
        newStartDate = startOfDay(subDays(mainDateRange.startDate, diffDays));
        newEndDate = endOfDay(subDays(mainDateRange.startDate, 1));
        break;
      case 'stessoPeriodoAnnoScorso':
        newStartDate = startOfDay(subYears(mainDateRange.startDate, 1));
        newEndDate = endOfDay(subYears(mainDateRange.endDate, 1));
        break;
      case 'stessoPeriodoMeseScorso':
        newStartDate = startOfDay(subMonths(mainDateRange.startDate, 1));
        newEndDate = endOfDay(subMonths(mainDateRange.endDate, 1));
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

  // Funzione per ottenere prodotti con scorte basse
  const getLowStockProducts = () => {
    try {
      const lowStockProducts = magazzinoData.filter(product => product.quantita <= 10);
      
      // Crea una mappa per tracciare le vendite per SKU
      const productSalesMap = new Map();
      
      // TODO: Implementare calcolo vendite quando avremo i dati degli ordini
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

  // Statistiche ordini fornitore
  const [supplierStats, setSupplierStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    toPay: 0,
    paid: 0,
    inTransit: 0,
    partial: 0,
    received: 0
  });

  useEffect(() => {
    const loadSupplierStats = async () => {
      try {
        const orders = await getSupplierOrders();
        const stats = {
          totalOrders: orders.length,
          totalValue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
          toPay: orders.filter(order => order.status === ORDER_STATUS.PENDING).length,
          paid: orders.filter(order => order.status === ORDER_STATUS.PAID).length,
          inTransit: orders.filter(order => order.status === ORDER_STATUS.IN_TRANSIT).length,
          partial: orders.filter(order => order.status === ORDER_STATUS.PARTIAL).length,
          received: orders.filter(order => order.status === ORDER_STATUS.RECEIVED).length
        };
        setSupplierStats(stats);
      } catch (error) {
        console.error('Errore nel caricare statistiche fornitore:', error);
      }
    };
    loadSupplierStats();
  }, []);

  // Configurazione soglia scorte basse
  const [lowStockThreshold, setLowStockThreshold] = useState(() => {
    const saved = localStorage.getItem('lowStockThreshold');
    return saved ? parseInt(saved) : 5;
  });

  // Salva la soglia quando cambia
  useEffect(() => {
    localStorage.setItem('lowStockThreshold', lowStockThreshold.toString());
  }, [lowStockThreshold]);

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
            </select>

            {/* Filtro tipologia */}
            <select
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={tipologia}
              onChange={e => setTipologia(e.target.value)}
            >
              <option value="">Tutte le tipologie</option>
              {tipologie.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>

            {/* Pulsante aggiorna */}
            <button
              onClick={() => window.__dashboardLoadOrders && window.__dashboardLoadOrders()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Aggiorna
            </button>
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
              Periodo confronto: {format(comparisonStartDate, 'dd/MM/yyyy', { locale: it })} - {format(comparisonEndDate, 'dd/MM/yyyy', { locale: it })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <select
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={comparisonQuickFilter}
                onChange={e => {
                  setComparisonQuickFilter(e.target.value);
                  handleComparisonQuickFilter(e.target.value);
                }}
              >
                <option value="periodoPrecedente">Periodo precedente</option>
                <option value="stessoPeriodoAnnoScorso">Stesso periodo anno scorso</option>
                <option value="stessoPeriodoMeseScorso">Stesso periodo mese scorso</option>
                <option value="ultimi7Giorni">Ultimi 7 giorni</option>
                <option value="meseScorso">Mese scorso</option>
                <option value="trimestreScorso">Trimestre scorso</option>
              </select>

              <select
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={comparisonTipologia}
                onChange={e => setComparisonTipologia(e.target.value)}
              >
                <option value="">Tutte le tipologie</option>
                {tipologie.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grafico Vendite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Grafico Vendite
          </CardTitle>
          <CardDescription>
            Andamento vendite per periodo selezionato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'revenue') {
                        return [new Intl.NumberFormat('it-IT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(value), 'Fatturato'];
                      }
                      return [value, name === 'orders' ? 'Ordini' : 'Prodotti'];
                    }}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="Fatturato"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Ordini"
                  />
                  {showComparison && comparisonChartData.length > 0 && (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="comparisonRevenue" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                        name="Fatturato (Confronto)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="comparisonOrders" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                        name="Ordini (Confronto)"
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 mb-2">
                    {csvStats.totalOrders} Ordini
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    Nel periodo selezionato
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {new Intl.NumberFormat('it-IT', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(csvStats.totalValue)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Fatturato totale
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Principali */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantità Ordini</CardTitle>
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
            <CardTitle className="text-sm font-medium">Valore Ordini</CardTitle>
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
              Fatturato totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Ordine</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Intl.NumberFormat('it-IT', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(csvStats.totalOrders > 0 ? csvStats.totalValue / csvStats.totalOrders : 0)}</div>
            <p className="text-xs text-muted-foreground">
              Per ordine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spese Marketing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{new Intl.NumberFormat('it-IT', {
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
            <CardTitle className="text-sm font-medium">Numero Ordini</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{csvStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Totale ordini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statistiche Magazzino */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Prodotti</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Prodotti in magazzino
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scorte Basse</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Prodotti ≤ 10 pezzi
            </p>
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

      {/* Grafico Prodotti Più Venduti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Prodotti
            </CardTitle>
            <CardDescription>
              Prodotti più venduti nel periodo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {csvOrders.length > 0 ? (() => {
                // Calcola prodotti più venduti dai dati CSV
                const productSales = {};
                csvOrders.forEach(order => {
                  if (order.products && order.products.length > 0) {
                    order.products.forEach(product => {
                      if (product.name) {
                        if (productSales[product.name]) {
                          productSales[product.name] += product.quantity || 0;
                        } else {
                          productSales[product.name] = product.quantity || 0;
                        }
                      }
                    });
                  }
                });
                
                const topProductsArray = Object.entries(productSales)
                  .map(([name, quantity]) => ({ name, quantity }))
                  .sort((a, b) => b.quantity - a.quantity)
                  .slice(0, 10);
                
                return topProductsArray.length > 0 ? topProductsArray.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{product.quantity} pz</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(product.revenue || 0)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessun prodotto venduto nel periodo
                  </div>
                );
              })() : (
                <div className="text-center py-8 text-muted-foreground">
                  Carica i dati CSV per vedere i prodotti più venduti
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafico Confronto Periodi */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Confronto Periodi
            </CardTitle>
            <CardDescription>
              Confronto tra periodo principale e periodo di confronto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Periodo Principale */}
              <div>
                <h4 className="font-semibold text-lg mb-4 text-blue-600">
                  Periodo Principale
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Ordini:</span>
                    <span className="font-bold text-blue-600">{csvStats.totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Valore:</span>
                    <span className="font-bold text-blue-600">
                      {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(csvStats.totalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Spedizioni:</span>
                    <span className="font-bold text-blue-600">
                      {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(csvStats.totalShippingPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Sconti:</span>
                    <span className="font-bold text-green-600">
                      {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(csvStats.totalDiscounts)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Periodo Confronto */}
              <div>
                <h4 className="font-semibold text-lg mb-4 text-orange-600">
                  Periodo Confronto
                </h4>
                <div className="space-y-3">
                  {(() => {
                    const comparisonOrders = filterOrdersByDateRange(csvOrders, comparisonDateRange.startDate, comparisonDateRange.endDate);
                    const comparisonStats = {
                      totalOrders: comparisonOrders.length,
                      totalValue: comparisonOrders.reduce((sum, order) => sum + (order.total_price || 0), 0),
                      totalShippingPaid: comparisonOrders.reduce((sum, order) => sum + (order.shipping_cost || 0), 0),
                      totalDiscounts: comparisonOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0),
                    };

                    return (
                      <>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                          <span className="text-sm font-medium">Ordini:</span>
                          <span className="font-bold text-orange-600">{comparisonStats.totalOrders}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                          <span className="text-sm font-medium">Valore:</span>
                          <span className="font-bold text-orange-600">
                            {new Intl.NumberFormat('it-IT', {
                              style: 'currency',
                              currency: 'EUR',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(comparisonStats.totalValue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                          <span className="text-sm font-medium">Spedizioni:</span>
                          <span className="font-bold text-orange-600">
                            {new Intl.NumberFormat('it-IT', {
                              style: 'currency',
                              currency: 'EUR',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(comparisonStats.totalShippingPaid)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                          <span className="text-sm font-medium">Sconti:</span>
                          <span className="font-bold text-green-600">
                            {new Intl.NumberFormat('it-IT', {
                              style: 'currency',
                              currency: 'EUR',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(comparisonStats.totalDiscounts)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <div className="text-center py-8 text-muted-foreground">
                  Nessun prodotto con scorte basse
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prodotti Più Venduti */}
        <Card>
          <CardHeader>
            <CardTitle>Prodotti Più Venduti</CardTitle>
            <CardDescription>
              Top prodotti per quantità venduta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.length > 0 ? topProducts.map((product, index) => (
                <div key={product.sku} className="flex justify-between items-center p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.nome}</div>
                      <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{product.quantita} pz</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPrice(product.revenue)}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun prodotto venduto ancora
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