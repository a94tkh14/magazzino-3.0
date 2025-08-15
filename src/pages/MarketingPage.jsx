import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import ManualMetricsForm from '../components/ManualMetricsForm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, AlertCircle } from 'lucide-react';
import Button from '../components/ui/button';
import DateRangePicker from '../components/DateRangePicker';

const MarketingPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualMetrics, setManualMetrics] = useState([]);
  const [marketingData, setMarketingData] = useState({
    totalRevenue: 0,
    totalConversions: 0,
    averageOrderValue: 0,
    totalSpent: 0,
    cpa: 0,
    roas: 0
  });

  // Filtri per i grafici
  const [selectedMetric, setSelectedMetric] = useState('cpa'); // 'cpa' o 'roas'
  const [selectedDataSource, setSelectedDataSource] = useState('internal'); // 'internal' o 'platform'
  const [selectedPlatform, setSelectedPlatform] = useState('all'); // 'all', 'google_ads', 'meta', 'tiktok'
  
  // Filtri per le date
  const [selectedDateRange, setSelectedDateRange] = useState('last_7_days'); // 'last_7_days', 'last_30_days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Stati per confronto personalizzato
  const [comparisonMode, setComparisonMode] = useState('previous_period'); // 'previous_period' o 'custom_period'
  const [comparisonStartDate, setComparisonStartDate] = useState('');
  const [comparisonEndDate, setComparisonEndDate] = useState('');
  const [comparisonEnabled, setComparisonEnabled] = useState(true); // Toggle per attivare/disattivare il confronto

  // === AGGIUNTA: Stati per selezione mese SOLO per i grafici ===
  // const [chartSelectedMonth, setChartSelectedMonth] = useState(() => {
  //   const now = new Date();
  //   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // });
  // const [chartComparisonMonth, setChartComparisonMonth] = useState(() => {
  //   const prev = new Date();
  //   prev.setMonth(prev.getMonth() - 1);
  //   return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  // });

  // Carica gli ordini dal localStorage (dove la pagina Ordini li salva)
  const loadOrders = () => {
    try {
      console.log('MarketingPage - Caricamento ordini da localStorage...');
      
      // Carica ordini dal localStorage (salvati dalla pagina Ordini)
      const savedOrders = localStorage.getItem('shopify_orders');
      const savedMetrics = localStorage.getItem('manualMetrics');
      
      console.log('MarketingPage - Dati trovati:');
      console.log('  - Ordini:', savedOrders ? JSON.parse(savedOrders).length : 0);
      console.log('  - Metriche manuali:', savedMetrics ? JSON.parse(savedMetrics).length : 0);
      
      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);
        console.log('MarketingPage - Ordini caricati da localStorage:', parsedOrders.length);
        setOrders(parsedOrders);
      } else {
        console.log('MarketingPage - Nessun ordine trovato in localStorage');
        // Carica ordini di esempio se non ci sono dati
        const exampleOrders = [
          {
            id: 'example_1',
            orderNumber: '1001',
            totalPrice: 150.00,
            createdAt: new Date().toISOString(),
            status: 'paid',
            fulfillmentStatus: 'fulfilled'
          },
          {
            id: 'example_2', 
            orderNumber: '1002',
            totalPrice: 89.99,
            createdAt: new Date(Date.now() - 24*60*60*1000).toISOString(),
            status: 'paid',
            fulfillmentStatus: 'fulfilled'
          }
        ];
        setOrders(exampleOrders);
      }
      
      // Carica metriche manuali
      if (savedMetrics) {
        const parsedMetrics = JSON.parse(savedMetrics);
        setManualMetrics(parsedMetrics);
      }
      
    } catch (error) {
      console.error('Errore nel caricamento ordini:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Carica i dati all'avvio
  useEffect(() => {
    loadOrders();
  }, []);

  // Ricarica i dati (pulsante refresh)
  const handleRefresh = () => {
    setLoading(true);
    loadOrders();
  };

  // Calcola i dati di marketing aggregati
  useEffect(() => {
    // Ottieni ordini e metriche filtrati per il periodo selezionato
    const filteredOrders = getFilteredOrders();
    const filteredMetrics = getFilteredManualMetrics();
    
    // Revenue totale dagli ordini filtrati
    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const price = order.totalPrice || 0;
      return sum + parseFloat(price);
    }, 0);
    const totalConversions = filteredOrders.length;
    const averageOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;
    
    // Spesa totale dalle metriche manuali filtrate per il periodo
    const totalSpent = filteredMetrics.reduce((sum, metric) => 
      sum + metric.googleAds.spent + metric.meta.spent + metric.tiktok.spent, 0
    );
    
    // Calcola CPA e ROAS totali per il periodo
    const cpa = totalConversions > 0 ? totalSpent / totalConversions : 0;
    const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

    const marketingDataCalculated = {
      totalRevenue,
      totalConversions,
      averageOrderValue,
      totalSpent,
      cpa,
      roas
    };
    
    console.log('MarketingPage - Dati marketing calcolati per periodo:', marketingDataCalculated);
    console.log('MarketingPage - Ordini filtrati:', filteredOrders.length);
    console.log('MarketingPage - Metriche manuali filtrate:', filteredMetrics.length);
    console.log('MarketingPage - Periodo selezionato:', selectedDateRange);
    setMarketingData(marketingDataCalculated);
  }, [orders, manualMetrics, selectedDateRange, customStartDate, customEndDate]);

  // Gestisce salvataggio metriche manuali
  const handleManualMetricsSave = (newMetrics) => {
    setManualMetrics(newMetrics);
  };

  // Calcola statistiche per piattaforma
  const getPlatformStats = () => {
    const filteredMetrics = getFilteredManualMetrics();
    const filteredOrders = getFilteredOrders();
    
    const stats = {
      google_ads: { spent: 0, conversions: 0, revenue: 0, cpa: 0, roas: 0 },
      meta: { spent: 0, conversions: 0, revenue: 0, cpa: 0, roas: 0 },
      tiktok: { spent: 0, conversions: 0, revenue: 0, cpa: 0, roas: 0 }
    };

    filteredMetrics.forEach(metric => {
      // Google Ads - usa conversioni manuali
      stats.google_ads.spent += metric.googleAds.spent;
      stats.google_ads.conversions += metric.googleAds.conversions;
      stats.google_ads.cpa = metric.googleAds.cpa;
      stats.google_ads.roas = metric.googleAds.roas;
      
      // Meta - usa conversioni manuali
      stats.meta.spent += metric.meta.spent;
      stats.meta.conversions += metric.meta.conversions;
      stats.meta.cpa = metric.meta.cpa;
      stats.meta.roas = metric.meta.roas;
      
      // TikTok - usa conversioni manuali
      stats.tiktok.spent += metric.tiktok.spent;
      stats.tiktok.conversions += metric.tiktok.conversions;
      stats.tiktok.cpa = metric.tiktok.cpa;
      stats.tiktok.roas = metric.tiktok.roas;
    });

    // Calcola revenue totali dagli ordini filtrati
    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const price = order.totalPrice || 0;
      return sum + parseFloat(price);
    }, 0);

    // Distribuisci revenue proporzionalmente alla spesa
    const totalSpent = stats.google_ads.spent + stats.meta.spent + stats.tiktok.spent;
    
    if (totalSpent > 0) {
      stats.google_ads.revenue = (stats.google_ads.spent / totalSpent) * totalRevenue;
      stats.meta.revenue = (stats.meta.spent / totalSpent) * totalRevenue;
      stats.tiktok.revenue = (stats.tiktok.spent / totalSpent) * totalRevenue;
    }

    return stats;
  };

  // Prepara dati per i grafici a righe
  const prepareLineChartData = () => {
    if (manualMetrics.length === 0) return [];

    return manualMetrics.map(metric => ({
      week: new Date(metric.weekStart).toLocaleDateString('it-IT', { 
        month: 'short', 
        day: 'numeric' 
      }),
      weekStart: metric.weekStart,
      // Dati complessivi (usando conversioni Shopify)
      overallCpa: parseFloat(metric.overallCpa) || 0,
      overallRoas: parseFloat(metric.overallRoas) || 0,
      shopifyConversions: metric.shopifyConversions || 0,
      shopifyRevenue: metric.shopifyRevenue || 0,
      totalSpent: metric.googleAds.spent + metric.meta.spent + metric.tiktok.spent,
      // Dati per piattaforma (usando conversioni manuali)
      google_ads_cpa: metric.googleAds.cpa,
      google_ads_roas: metric.googleAds.roas,
      google_ads_spent: metric.googleAds.spent,
      google_ads_conversions: metric.googleAds.conversions,
      meta_cpa: metric.meta.cpa,
      meta_roas: metric.meta.roas,
      meta_spent: metric.meta.spent,
      meta_conversions: metric.meta.conversions,
      tiktok_cpa: metric.tiktok.cpa,
      tiktok_roas: metric.tiktok.roas,
      tiktok_spent: metric.tiktok.spent,
      tiktok_conversions: metric.tiktok.conversions
    })).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
  };

  // Prepara dati per il grafico a torta delle piattaforme
  const preparePieData = () => {
    const platformStats = getPlatformStats();
    return [
      { name: 'Google Ads', value: platformStats.google_ads.spent, color: '#4285F4' },
      { name: 'Meta', value: platformStats.meta.spent, color: '#1877F2' },
      { name: 'TikTok', value: platformStats.tiktok.spent, color: '#000000' }
    ].filter(item => item.value > 0);
  };

  // Calcola cambiamenti settimanali
  const getWeeklyChanges = () => {
    const lineData = prepareLineChartData();
    if (lineData.length < 2) return null;

    const currentWeek = lineData[lineData.length - 1];
    const previousWeek = lineData[lineData.length - 2];

    const getMetricValue = (week, metric, platform) => {
      if (platform === 'all') {
        return metric === 'cpa' ? week.overallCpa : week.overallRoas;
      } else {
        const platformKey = `${platform}_${metric}`;
        return week[platformKey] || 0;
      }
    };

    const currentValue = getMetricValue(currentWeek, selectedMetric, selectedPlatform);
    const previousValue = getMetricValue(previousWeek, selectedMetric, selectedPlatform);
    const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

    return {
      current: currentValue,
      previous: previousValue,
      change: change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  };

  // Funzioni per calcolare i periodi
  const getDateRange = () => {
    const now = new Date();
    let endDate = new Date(now);
    
    let startDate;
    switch (selectedDateRange) {
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return { startDate, endDate };
  };

  // Filtra ordini per periodo selezionato
  const getFilteredOrders = () => {
    const { startDate, endDate } = getDateRange();
    console.log('Filtro ordini:', { startDate, endDate, totalOrders: orders.length });
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const isInRange = orderDate >= startDate && orderDate <= endDate;
      
      // Debug per i primi 3 ordini
      if (orders.indexOf(order) < 3) {
        console.log(`Ordine ${order.orderNumber || order.id}:`, {
          createdAt: order.createdAt,
          orderDate: orderDate,
          isInRange
        });
      }
      
      return isInRange;
    });
  };

  // Filtra metriche manuali per periodo selezionato
  const getFilteredManualMetrics = () => {
    const { startDate, endDate } = getDateRange();
    console.log('Filtro metriche manuali:', { startDate, endDate, totalMetrics: manualMetrics.length });
    
    return manualMetrics.filter(metric => {
      const metricStartDate = new Date(metric.weekStart);
      const metricEndDate = new Date(metric.weekStart);
      metricEndDate.setDate(metricEndDate.getDate() + 6); // Settimana = 7 giorni
      
      const isInRange = metricStartDate <= endDate && metricEndDate >= startDate;
      
      // Debug per le prime 3 metriche
      if (manualMetrics.indexOf(metric) < 3) {
        console.log(`Metrica ${metric.weekStart}:`, {
          metricStartDate: metricStartDate,
          metricEndDate: metricEndDate,
          isInRange
        });
      }
      
      return isInRange;
    });
  };

  // Calcola dati per il periodo precedente (stessa durata)
  const getPreviousPeriodData = () => {
    const { startDate, endDate } = getDateRange();
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());
    
    const previousOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= previousStartDate && orderDate <= previousEndDate;
    });
    
    const previousRevenue = previousOrders.reduce((sum, order) => {
      const price = order.totalPrice || 0;
      return sum + parseFloat(price);
    }, 0);
    
    return {
      orders: previousOrders,
      revenue: previousRevenue,
      conversions: previousOrders.length,
      averageOrderValue: previousOrders.length > 0 ? previousRevenue / previousOrders.length : 0
    };
  };

  // Calcola dati per il periodo di confronto personalizzato
  const getCustomComparisonData = () => {
    if (!comparisonStartDate || !comparisonEndDate) {
      return getPreviousPeriodData(); // Fallback al periodo precedente
    }
    
    const startDate = new Date(comparisonStartDate);
    const endDate = new Date(comparisonEndDate);
    
    const comparisonOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const comparisonRevenue = comparisonOrders.reduce((sum, order) => {
      const price = order.totalPrice || 0;
      return sum + parseFloat(price);
    }, 0);
    
    return {
      orders: comparisonOrders,
      revenue: comparisonRevenue,
      conversions: comparisonOrders.length,
      averageOrderValue: comparisonOrders.length > 0 ? comparisonRevenue / comparisonOrders.length : 0
    };
  };

  // Calcola confronti
  const getComparisons = () => {
    const currentOrders = getFilteredOrders();
    
    const currentRevenue = currentOrders.reduce((sum, order) => {
      const price = order.totalPrice || 0;
      return sum + parseFloat(price);
    }, 0);
    
    const currentConversions = currentOrders.length;
    const currentAverageOrderValue = currentConversions > 0 ? currentRevenue / currentConversions : 0;
    
    // Se il confronto è disabilitato, restituisci solo i dati correnti
    if (!comparisonEnabled) {
      return {
        current: {
          revenue: currentRevenue,
          conversions: currentConversions,
          averageOrderValue: currentAverageOrderValue
        },
        comparison: {
          revenue: 0,
          conversions: 0,
          averageOrderValue: 0
        },
        changes: {
          revenue: 0,
          conversions: 0,
          averageOrderValue: 0
        }
      };
    }
    
    // Se il confronto è abilitato, calcola i dati di confronto
    const comparisonData = comparisonMode === 'custom_period' ? 
      getCustomComparisonData() : getPreviousPeriodData();
    
    const revenueChange = comparisonData.revenue > 0 ? 
      ((currentRevenue - comparisonData.revenue) / comparisonData.revenue) * 100 : 0;
    const conversionsChange = comparisonData.conversions > 0 ? 
      ((currentConversions - comparisonData.conversions) / comparisonData.conversions) * 100 : 0;
    const averageOrderValueChange = comparisonData.averageOrderValue > 0 ? 
      ((currentAverageOrderValue - comparisonData.averageOrderValue) / comparisonData.averageOrderValue) * 100 : 0;
    
    return {
      current: {
        revenue: currentRevenue,
        conversions: currentConversions,
        averageOrderValue: currentAverageOrderValue
      },
      comparison: {
        revenue: comparisonData.revenue,
        conversions: comparisonData.conversions,
        averageOrderValue: comparisonData.averageOrderValue
      },
      changes: {
        revenue: revenueChange,
        conversions: conversionsChange,
        averageOrderValue: averageOrderValueChange
      }
    };
  };

  const platformStats = getPlatformStats();
  const lineChartData = prepareLineChartData();
  const pieData = preparePieData();
  const weeklyChanges = getWeeklyChanges();
  const comparisons = getComparisons();

  // === AGGIUNTA: Funzione per dati confronto settimanale ===
  function prepareComparisonLineChartData(metricType = 'cpa') {
    // Filtra metriche per periodo selezionato
    const filteredMetrics = getFilteredManualMetrics();
    // Filtra metriche per periodo di confronto
    let comparisonMetrics = [];
    if (comparisonEnabled) {
      let comparisonStart, comparisonEnd;
      if (comparisonMode === 'custom_period' && comparisonStartDate && comparisonEndDate) {
        comparisonStart = new Date(comparisonStartDate);
        comparisonEnd = new Date(comparisonEndDate);
      } else {
        // periodo precedente
        const { startDate, endDate } = getDateRange();
        const periodDuration = endDate.getTime() - startDate.getTime();
        comparisonStart = new Date(startDate.getTime() - periodDuration);
        comparisonEnd = new Date(startDate.getTime());
      }
      comparisonMetrics = manualMetrics.filter(metric => {
        const metricStartDate = new Date(metric.weekStart);
        const metricEndDate = new Date(metric.weekStart);
        metricEndDate.setDate(metricEndDate.getDate() + 6);
        return metricStartDate <= comparisonEnd && metricEndDate >= comparisonStart;
      });
    }

    // Ordina metriche per data
    const allMetrics = [...filteredMetrics].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    const allComparison = [...comparisonMetrics].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));

    // Calcolo cumulativo
    let cumCurrent = 0;
    let cumComparison = 0;
    const data = [];
    const maxLen = Math.max(allMetrics.length, allComparison.length);
    for (let i = 0; i < maxLen; i++) {
      const current = allMetrics[i];
      const comparison = allComparison[i];
      let valCurrent = 0;
      let valComparison = 0;
      if (current) {
        if (metricType === 'cpa') valCurrent = current.google_ads_cpa;
        else if (metricType === 'roas') valCurrent = current.google_ads_roas;
        else if (metricType === 'spent') valCurrent = current.google_ads_spent + current.meta_spent + current.tiktok_spent;
        else if (metricType === 'orders') valCurrent = current.shopifyConversions;
      }
      if (comparison) {
        if (metricType === 'cpa') valComparison = comparison.google_ads_cpa;
        else if (metricType === 'roas') valComparison = comparison.google_ads_roas;
        else if (metricType === 'spent') valComparison = comparison.google_ads_spent + comparison.meta_spent + comparison.tiktok_spent;
        else if (metricType === 'orders') valComparison = comparison.shopifyConversions;
      }
      // Cumulativo
      cumCurrent += valCurrent || 0;
      cumComparison += valComparison || 0;
      data.push({
        week: current ? new Date(current.weekStart).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }) :
              comparison ? new Date(comparison.weekStart).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }) : `Settimana ${i+1}`,
        current: cumCurrent,
        comparison: comparisonEnabled ? cumComparison : null
      });
    }
    return data;
  }

  // Rimuovo i selettori mese locali ai grafici e la funzione prepareChartComparisonLineChartData

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER DASHBOARD */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard Marketing</h1>
        <div className="text-gray-600 mb-4">
          Periodo selezionato: {getDateRange().startDate.toLocaleDateString('it-IT')} – {getDateRange().endDate.toLocaleDateString('it-IT')}
        </div>
        {/* Selettore periodo */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <label className="flex items-center gap-2">
            <span>Periodo:</span>
            <select
              value={selectedDateRange}
              onChange={e => setSelectedDateRange(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="last_7_days">Ultimi 7 giorni</option>
              <option value="last_30_days">Ultimi 30 giorni</option>
              <option value="custom">Personalizzato</option>
            </select>
          </label>
          {selectedDateRange === 'custom' && (
            <DateRangePicker
              startDate={customStartDate ? new Date(customStartDate) : null}
              endDate={customEndDate ? new Date(customEndDate) : null}
              onDateChange={([start, end]) => {
                setCustomStartDate(start ? start.toISOString().slice(0, 10) : '');
                setCustomEndDate(end ? end.toISOString().slice(0, 10) : '');
              }}
              className=""
            />
          )}
        </div>
        {/* Selettori mese per i grafici */}
        {/*
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <label className="flex items-center gap-2">
            Mese grafico:
            <input type="month" value={chartSelectedMonth} onChange={e => setChartSelectedMonth(e.target.value)} className="px-2 py-1 border rounded-md" />
          </label>
          <label className="flex items-center gap-2">
            Mese confronto grafico:
            <input type="month" value={chartComparisonMonth} onChange={e => setChartComparisonMonth(e.target.value)} className="px-2 py-1 border rounded-md" />
          </label>
        </div>
        */}
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={comparisonEnabled} onChange={e => setComparisonEnabled(e.target.checked)} />
            Abilita confronto
          </label>
          {comparisonEnabled && (
            <>
              <select value={comparisonMode} onChange={e => setComparisonMode(e.target.value)} className="px-3 py-2 border rounded-md">
                <option value="previous_period">Periodo Precedente</option>
                <option value="custom_period">Personalizzato</option>
              </select>
              {comparisonMode === 'custom_period' && (
                <>
                  <input type="date" value={comparisonStartDate} onChange={e => setComparisonStartDate(e.target.value)} className="px-2 py-1 border rounded-md" />
                  <span>–</span>
                  <input type="date" value={comparisonEndDate} onChange={e => setComparisonEndDate(e.target.value)} className="px-2 py-1 border rounded-md" />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Spesa Marketing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Spesa Marketing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{marketingData.totalSpent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            {comparisonEnabled && (
              <div className="text-xs text-gray-600 mt-1">
                {(() => {
                  const comp = getComparisons();
                  return comp.comparisonEnabled ? (
                    <span>
                      {comp.changes.totalSpent > 0 ? '↗' : comp.changes.totalSpent < 0 ? '↘' : '→'}
                      {Math.abs(comp.changes.totalSpent).toFixed(1)}% vs confronto
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
        {/* CPA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{marketingData.cpa.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            {comparisonEnabled && (
              <div className="text-xs text-gray-600 mt-1">
                {(() => {
                  const comp = getComparisons();
                  return comp.comparisonEnabled ? (
                    <span>
                      {comp.changes.cpa > 0 ? '↗' : comp.changes.cpa < 0 ? '↘' : '→'}
                      {Math.abs(comp.changes.cpa).toFixed(1)}% vs confronto
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
        {/* ROAS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{marketingData.roas.toFixed(2)}x</div>
            {comparisonEnabled && (
              <div className="text-xs text-gray-600 mt-1">
                {(() => {
                  const comp = getComparisons();
                  return comp.comparisonEnabled ? (
                    <span>
                      {comp.changes.roas > 0 ? '↗' : comp.changes.roas < 0 ? '↘' : '→'}
                      {Math.abs(comp.changes.roas).toFixed(1)}% vs confronto
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Ordini */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ordini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{marketingData.totalConversions}</div>
            {comparisonEnabled && (
              <div className="text-xs text-gray-600 mt-1">
                {(() => {
                  const comp = getComparisons();
                  return comp.comparisonEnabled ? (
                    <span>
                      {comp.changes.conversions > 0 ? '↗' : comp.changes.conversions < 0 ? '↘' : '→'}
                      {Math.abs(comp.changes.conversions).toFixed(1)}% vs confronto
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metriche Generali - Calcolate dagli ordini filtrati e metriche manuali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comparisons.current.revenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
            </div>
            {comparisonEnabled ? (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  comparisons.changes.revenue > 0 ? 'bg-green-100 text-green-800' : 
                  comparisons.changes.revenue < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {comparisons.changes.revenue > 0 ? '↗' : comparisons.changes.revenue < 0 ? '↘' : '→'}
                  {Math.abs(comparisons.changes.revenue).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-600">
                  vs periodo precedente
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">
                Confronto disabilitato
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comparisons.current.conversions}</div>
            {comparisonEnabled ? (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  comparisons.changes.conversions > 0 ? 'bg-green-100 text-green-800' : 
                  comparisons.changes.conversions < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {comparisons.changes.conversions > 0 ? '↗' : comparisons.changes.conversions < 0 ? '↘' : '→'}
                  {Math.abs(comparisons.changes.conversions).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-600">
                  vs periodo precedente
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">
                Confronto disabilitato
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media per Ordine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comparisons.current.averageOrderValue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
            </div>
            {comparisonEnabled ? (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  comparisons.changes.averageOrderValue > 0 ? 'bg-green-100 text-green-800' : 
                  comparisons.changes.averageOrderValue < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {comparisons.changes.averageOrderValue > 0 ? '↗' : comparisons.changes.averageOrderValue < 0 ? '↘' : '→'}
                  {Math.abs(comparisons.changes.averageOrderValue).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-600">
                  vs periodo precedente
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">
                Confronto disabilitato
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spesa Marketing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketingData.totalSpent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-600">
                {getFilteredManualMetrics().length} settimane nel periodo
              </span>
              <span className="text-xs text-gray-500">
                ({manualMetrics.length} totali)
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {getFilteredManualMetrics().length > 0 ? 
                `Media: ${(marketingData.totalSpent / getFilteredManualMetrics().length).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}/settimana` : 
                'Nessun dato per il periodo'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketingData.roas.toFixed(2)}x
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full ${
                marketingData.roas > 1 ? 'bg-green-100 text-green-800' : 
                marketingData.roas < 1 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {marketingData.roas > 1 ? '↗' : marketingData.roas < 1 ? '↘' : '→'}
                {marketingData.roas > 0 ? `${((marketingData.roas - 1) * 100).toFixed(1)}%` : 'N/A'}
              </span>
              <span className="text-xs text-gray-600">
                vs break-even (1x)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketingData.cpa.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {marketingData.totalConversions > 0 ? 'per conversione' : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metriche Performance Marketing */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Performance Marketing - Periodo Selezionato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">ROAS</h4>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {marketingData.roas.toFixed(2)}x
              </div>
              <div className="text-sm text-green-700">
                {marketingData.roas > 1 ? 
                  `Profitto: +${((marketingData.roas - 1) * 100).toFixed(1)}%` : 
                  marketingData.roas < 1 ? 
                  `Perdita: ${((1 - marketingData.roas) * 100).toFixed(1)}%` : 
                  'Break-even'
                }
              </div>
              <div className="text-xs text-green-600 mt-1">
                Revenue: {marketingData.totalRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} | 
                Spesa: {marketingData.totalSpent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">CPA</h4>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {marketingData.cpa.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </div>
              <div className="text-sm text-blue-700">
                {marketingData.cpa < 50 ? 'Ottimo' : 
                 marketingData.cpa < 100 ? 'Buono' : 
                 marketingData.cpa < 200 ? 'Accettabile' : 'Alto'}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {marketingData.totalConversions} conversioni | 
                Spesa totale: {marketingData.totalSpent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Margine di Profitto</h4>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {marketingData.totalSpent > 0 ? 
                  `${((marketingData.totalRevenue - marketingData.totalSpent) / marketingData.totalRevenue * 100).toFixed(1)}%` : 
                  'N/A'
                }
              </div>
              <div className="text-sm text-purple-700">
                {marketingData.totalSpent > 0 ? 
                  (marketingData.totalRevenue - marketingData.totalSpent).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : 
                  'N/A'
                } profitto netto
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Revenue: {marketingData.totalRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} | 
                Costi: {marketingData.totalSpent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">Efficienza Marketing</h4>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {marketingData.totalSpent > 0 ? 
                  `${((marketingData.totalRevenue / marketingData.totalSpent) * 100).toFixed(1)}%` : 
                  'N/A'
                }
              </div>
              <div className="text-sm text-orange-700">
                {marketingData.totalSpent > 0 ? 
                  `${marketingData.totalSpent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} → ${marketingData.totalRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}` : 
                  'N/A'
                }
              </div>
              <div className="text-xs text-orange-600 mt-1">
                ROI: {marketingData.totalSpent > 0 ? 
                  `${((marketingData.totalRevenue - marketingData.totalSpent) / marketingData.totalSpent * 100).toFixed(1)}%` : 
                  'N/A'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dettagli confronto periodo */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Confronto con {comparisonMode === 'custom_period' ? 'Periodo Personalizzato' : 'Periodo Precedente'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Periodo Attuale</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="font-medium">{comparisons.current.revenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conversioni:</span>
                  <span className="font-medium">{comparisons.current.conversions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Media per ordine:</span>
                  <span className="font-medium">{comparisons.current.averageOrderValue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ROAS:</span>
                  <span className="font-medium">{marketingData.roas.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CPA:</span>
                  <span className="font-medium">{marketingData.cpa.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {comparisonMode === 'custom_period' ? 'Periodo di Confronto' : 'Periodo Precedente'}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="font-medium">{comparisons.comparison.revenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conversioni:</span>
                  <span className="font-medium">{comparisons.comparison.conversions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Media per ordine:</span>
                  <span className="font-medium">{comparisons.comparison.averageOrderValue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ROAS:</span>
                  <span className="font-medium">N/A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CPA:</span>
                  <span className="font-medium">N/A</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2">Variazioni Percentuali</h5>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  comparisons.changes.revenue > 0 ? 'text-green-600' : 
                  comparisons.changes.revenue < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {comparisons.changes.revenue > 0 ? '+' : ''}{comparisons.changes.revenue.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Revenue</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  comparisons.changes.conversions > 0 ? 'text-green-600' : 
                  comparisons.changes.conversions < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {comparisons.changes.conversions > 0 ? '+' : ''}{comparisons.changes.conversions.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Conversioni</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  comparisons.changes.averageOrderValue > 0 ? 'text-green-600' : 
                  comparisons.changes.averageOrderValue < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {comparisons.changes.averageOrderValue > 0 ? '+' : ''}{comparisons.changes.averageOrderValue.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Media per ordine</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  marketingData.roas > 1 ? 'text-green-600' : 
                  marketingData.roas < 1 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {marketingData.roas.toFixed(2)}x
                </div>
                <div className="text-xs text-gray-600">ROAS Attuale</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  marketingData.cpa < 50 ? 'text-green-600' : 
                  marketingData.cpa > 100 ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {marketingData.cpa.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="text-xs text-gray-600">CPA Attuale</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form per inserimento dati manuali */}
      <ManualMetricsForm onSave={handleManualMetricsSave} orders={orders} />

      {/* Statistiche per Piattaforma */}
      {manualMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Statistiche per Piattaforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Google Ads */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Google Ads</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Spesa:</span>
                    <span className="font-medium">€{platformStats.google_ads.spent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Conversioni:</span>
                    <span className="font-medium">{platformStats.google_ads.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CPA:</span>
                    <span className="font-medium">€{platformStats.google_ads.cpa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ROAS:</span>
                    <span className="font-medium">{platformStats.google_ads.roas.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Meta</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Spesa:</span>
                    <span className="font-medium">€{platformStats.meta.spent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Conversioni:</span>
                    <span className="font-medium">{platformStats.meta.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CPA:</span>
                    <span className="font-medium">€{platformStats.meta.cpa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ROAS:</span>
                    <span className="font-medium">{platformStats.meta.roas.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* TikTok */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">TikTok</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Spesa:</span>
                    <span className="font-medium">€{platformStats.tiktok.spent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Conversioni:</span>
                    <span className="font-medium">{platformStats.tiktok.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CPA:</span>
                    <span className="font-medium">€{platformStats.tiktok.cpa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ROAS:</span>
                    <span className="font-medium">{platformStats.tiktok.roas.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controlli per i grafici */}
      {lineChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Controlli Grafici</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metrica
                </label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cpa">CPA (Costo per Acquisizione)</option>
                  <option value="roas">ROAS (Return on Ad Spend)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fonte Dati
                </label>
                <select
                  value={selectedDataSource}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="internal">Dati Complessivi (conversioni Shopify)</option>
                  <option value="platform">Dati per Piattaforma (conversioni manuali)</option>
                </select>
              </div>

              {selectedDataSource === 'platform' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Piattaforma
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tutte le Piattaforme</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="meta">Meta (Facebook/Instagram)</option>
                    <option value="tiktok">TikTok Ads</option>
                  </select>
                </div>
              )}
            </div>

            {/* Cambiamenti settimanali */}
            {weeklyChanges && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">📊 Cambiamenti Settimanali</h4>
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-bold">
                    {selectedMetric === 'cpa' ? '€' : ''}{weeklyChanges.current.toFixed(2)}
                  </div>
                  <div className={`flex items-center space-x-1 ${
                    weeklyChanges.trend === 'up' ? 'text-green-600' : 
                    weeklyChanges.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <span className="text-lg">
                      {weeklyChanges.trend === 'up' ? '↗' : weeklyChanges.trend === 'down' ? '↘' : '→'}
                    </span>
                    <span className="text-sm">
                      {weeklyChanges.change > 0 ? '+' : ''}{weeklyChanges.change.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    vs settimana precedente
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GRAFICI MARKETING CON CONFRONTO (per data/settimana, come prima) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
  {/* Grafico Spesa Marketing */}
  <Card>
    <CardHeader>
      <CardTitle>Andamento Spesa Marketing</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={prepareComparisonLineChartData('spent')}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip formatter={v => `€${v.toLocaleString('it-IT', {minimumFractionDigits:2})}`} />
          <Legend />
          <Line type="monotone" dataKey="current" name="Spesa Periodo Selezionato" stroke="#2563eb" />
          {comparisonEnabled && <Line type="monotone" dataKey="comparison" name="Spesa Periodo Confronto" stroke="#f59e42" />} 
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
  {/* Grafico CPA */}
  <Card>
    <CardHeader>
      <CardTitle>Andamento CPA</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={prepareComparisonLineChartData('cpa')}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip formatter={v => `€${v.toLocaleString('it-IT', {minimumFractionDigits:2})}`} />
          <Legend />
          <Line type="monotone" dataKey="current" name="CPA Periodo Selezionato" stroke="#f59e42" />
          {comparisonEnabled && <Line type="monotone" dataKey="comparison" name="CPA Periodo Confronto" stroke="#fbbf24" />} 
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
  {/* Grafico ROAS */}
  <Card>
    <CardHeader>
      <CardTitle>Andamento ROAS</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={prepareComparisonLineChartData('roas')}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip formatter={v => `${v.toFixed(2)}x`} />
          <Legend />
          <Line type="monotone" dataKey="current" name="ROAS Periodo Selezionato" stroke="#22c55e" />
          {comparisonEnabled && <Line type="monotone" dataKey="comparison" name="ROAS Periodo Confronto" stroke="#f59e42" />} 
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
  {/* Grafico Ordini */}
  <Card>
    <CardHeader>
      <CardTitle>Andamento Ordini</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={prepareComparisonLineChartData('orders')}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="current" name="Ordini Periodo Selezionato" stroke="#a21caf" />
          {comparisonEnabled && <Line type="monotone" dataKey="comparison" name="Ordini Periodo Confronto" stroke="#f59e42" />} 
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
</div>

      {/* Grafico a torta della distribuzione spesa */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🥧 Distribuzione Spesa per Piattaforma</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, 'Spesa']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketingPage; 