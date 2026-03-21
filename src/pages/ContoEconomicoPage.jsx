import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Calendar, Target, Calculator, Package, ShoppingCart, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import DateRangePicker from '../components/DateRangePicker';
import { safeToLowerCase } from '../lib/utils';
import { loadShopifyOrdersData, loadMagazzinoData, loadCostiData } from '../lib/magazzinoStorage';

const COSTO_EXPRESS = 4.5;
const COSTO_PUNTO_RITIRO = 3.6;

function getDateRangeFromState(selectedDateRange, customStartDate, customEndDate) {
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
    case 'last_90_days':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { startDate, endDate };
}

const ContoEconomicoPage = () => {
  const [selectedDateRange, setSelectedDateRange] = useState('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [costs, setCosts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [manualMetrics, setManualMetrics] = useState([]);
  const [magazzinoData, setMagazzinoData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper per ottenere valore con fallback
  const getVal = (obj, ...keys) => {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  };

  // Carica dati all'avvio
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        // Carica ordini da Firebase (fonte principale)
        const loadedOrders = await loadShopifyOrdersData() || [];
        setOrders(loadedOrders);
        console.log(`📦 Cruscotto: Caricati ${loadedOrders.length} ordini da Firebase`);

        // Carica costi da Firebase
        const allCosts = await loadCostiData() || [];
        setCosts(allCosts);
        console.log(`💰 Cruscotto: Caricati ${allCosts.length} costi`);

        // Carica metriche marketing
        const allMetrics = JSON.parse(localStorage.getItem('manualMetrics') || '[]');
        setManualMetrics(allMetrics);

        // Carica dati magazzino da Firebase
        const magData = await loadMagazzinoData() || [];
        setMagazzinoData(magData);
        console.log(`📊 Cruscotto: Caricati ${magData.length} prodotti magazzino`);

      } catch (error) {
        console.error('Errore caricamento dati:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Ottieni data ordine con fallback
  const getOrderDate = (order) => {
    const dateStr = getVal(order, 'created_at', 'createdAt', 'date');
    return dateStr ? new Date(dateStr) : null;
  };

  // Ottieni prezzo totale ordine
  const getOrderTotal = (order) => {
    return parseFloat(getVal(order, 'total_price', 'totalPrice') || 0);
  };

  // Ottieni costo spedizione pagato dal cliente
  const getShippingRevenue = (order) => {
    return parseFloat(getVal(order, 'shipping_cost', 'shippingPrice', 'shipping_price') || 0);
  };

  // Ottieni prodotti dell'ordine
  const getOrderProducts = (order) => {
    return getVal(order, 'products', 'line_items', 'items') || [];
  };

  // Calcola costo spedizione effettivo
  const getShippingCost = (order) => {
    const shippingType = safeToLowerCase(getVal(order, 'shippingType', 'shipping_method') || '', '');
    if (shippingType.includes('express') || shippingType.includes('domicilio')) {
      return COSTO_EXPRESS;
    } else if (shippingType.includes('punto') || shippingType.includes('ritiro')) {
      return COSTO_PUNTO_RITIRO;
    }
    return COSTO_EXPRESS; // Default
  };

  // Calcola costi di acquisto e quantità vendute per periodo
  const calculateProductMetrics = (periodOrders) => {
    let totalPurchaseCosts = 0;
    let totalQuantitySold = 0;
    let totalProductsSold = 0;
    const productsSoldMap = new Map();

    periodOrders.forEach(order => {
      const products = getOrderProducts(order);
      
      products.forEach(item => {
        const sku = item.sku || item.variant_id?.toString() || '';
        const quantity = parseInt(item.quantity || 1);
        const itemPrice = parseFloat(item.price || 0);
        
        totalQuantitySold += quantity;
        
        // Traccia prodotti unici venduti
        if (sku && !productsSoldMap.has(sku)) {
          productsSoldMap.set(sku, true);
          totalProductsSold++;
        }
        
        // Cerca il prodotto nel magazzino per calcolare costo acquisto
        if (sku) {
          const magazzinoItem = magazzinoData.find(magItem => 
            magItem.sku === sku || 
            magItem.sku === item.variant_id?.toString() ||
            magItem.codice === sku
          );
          
          if (magazzinoItem) {
            const costPrice = parseFloat(magazzinoItem.prezzo || magazzinoItem.costo || 0);
            if (costPrice > 0) {
              totalPurchaseCosts += costPrice * quantity;
            }
          }
        }
      });
    });

    return {
      purchaseCosts: totalPurchaseCosts,
      quantitySold: totalQuantitySold,
      productsSold: totalProductsSold
    };
  };

  // Calcola dati economici per periodo
  const calculateEconomicDataByPeriod = () => {
    const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
    const periods = [];
    
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    // Per le settimane dell'anno
    if (viewMode === 'week') {
      const firstDayOfYear = new Date(selectedYear, 0, 1);
      const dayOfWeek = firstDayOfYear.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const firstMondayOfYear = new Date(selectedYear, 0, 1 - daysToMonday + (dayOfWeek === 0 ? -6 : 1));
      
      currentDate = new Date(firstMondayOfYear);
      const endDate = selectedYear === new Date().getFullYear() ? new Date() : new Date(selectedYear, 11, 31);
      
      let weekNumber = 1;
      while (currentDate <= endDate) {
        const periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        
        const periodData = calculatePeriodData(currentDate, periodEnd, `Sett. ${weekNumber}`);
        if (periodData.orderCount > 0 || periodData.totalCosts > 0) {
          periods.push(periodData);
        }
        
        currentDate.setDate(currentDate.getDate() + 7);
        weekNumber++;
      }
      
      return periods;
    }
    
    // Per mesi e trimestri
    while (currentDate <= end) {
      let periodEnd;
      let periodLabel;
      
      if (viewMode === 'month') {
        periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
        periodLabel = currentDate.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
      } else if (viewMode === 'quarter') {
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        periodEnd = new Date(currentDate.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
        periodLabel = `Q${quarter} ${currentDate.getFullYear()}`;
      } else {
        periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        periodLabel = `Sett. ${periods.length + 1}`;
      }
      
      const periodData = calculatePeriodData(currentDate, periodEnd, periodLabel);
      periods.push(periodData);
      
      if (viewMode === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
      } else if (viewMode === 'quarter') {
        currentDate.setMonth(currentDate.getMonth() + 3);
        currentDate.setDate(1);
      } else {
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    return periods;
  };

  // Calcola dati per un singolo periodo
  const calculatePeriodData = (startDate, endDate, periodLabel) => {
    // Filtra ordini per questo periodo
    const periodOrders = orders.filter(order => {
      const orderDate = getOrderDate(order);
      return orderDate && orderDate >= startDate && orderDate <= endDate;
    });

    // Ricavi
    const totalRevenue = periodOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
    const shippingRevenue = periodOrders.reduce((sum, order) => sum + getShippingRevenue(order), 0);
    const productRevenue = totalRevenue - shippingRevenue;

    // Costi spedizione
    const shippingCosts = periodOrders.reduce((sum, order) => sum + getShippingCost(order), 0);

    // Metriche prodotti (costi acquisto e quantità)
    const productMetrics = calculateProductMetrics(periodOrders);

    // Costi marketing
    const periodMetrics = manualMetrics.filter(metric => {
      const metricStartDate = new Date(metric.weekStart);
      const metricEndDate = new Date(metric.weekStart);
      metricEndDate.setDate(metricEndDate.getDate() + 6);
      return metricStartDate <= endDate && metricEndDate >= startDate;
    });
    
    const googleCosts = periodMetrics.reduce((sum, metric) => sum + (metric.googleAds?.spent || 0), 0);
    const metaCosts = periodMetrics.reduce((sum, metric) => sum + (metric.meta?.spent || 0), 0);
    const tiktokCosts = periodMetrics.reduce((sum, metric) => sum + (metric.tiktok?.spent || 0), 0);
    const marketingCosts = googleCosts + metaCosts + tiktokCosts;

    // Altri costi
    const periodCosts = costs.filter(cost => {
      const costDate = new Date(cost.date);
      return costDate >= startDate && costDate <= endDate;
    });
    const otherCosts = periodCosts.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);

    // Calcoli finali
    const purchaseCosts = productMetrics.purchaseCosts;
    const totalCosts = marketingCosts + otherCosts + shippingCosts + purchaseCosts;
    const grossProfit = totalRevenue - totalCosts;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    const productProfit = productRevenue - purchaseCosts;
    const productMargin = productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0;
    
    const shippingProfit = shippingRevenue - shippingCosts;
    const shippingMargin = shippingRevenue > 0 ? (shippingProfit / shippingRevenue) * 100 : 0;

    return {
      period: periodLabel,
      startDate,
      endDate,
      // Ricavi
      totalRevenue,
      productRevenue,
      shippingRevenue,
      // Costi
      purchaseCosts,
      marketingCosts,
      googleCosts,
      metaCosts,
      tiktokCosts,
      shippingCosts,
      otherCosts,
      totalCosts,
      // Profitti
      grossProfit,
      grossMargin,
      productProfit,
      productMargin,
      shippingProfit,
      shippingMargin,
      // Metriche
      orderCount: periodOrders.length,
      quantitySold: productMetrics.quantitySold,
      productsSold: productMetrics.productsSold,
      avgOrderValue: periodOrders.length > 0 ? totalRevenue / periodOrders.length : 0,
      cpaAdv: periodOrders.length > 0 ? marketingCosts / periodOrders.length : 0
    };
  };

  // Calcola totali cumulativi
  const calculateCumulativeData = (periods) => {
    let cumulativeRevenue = 0;
    let cumulativeCosts = 0;
    let cumulativeProfit = 0;
    let cumulativeOrders = 0;
    let cumulativeQuantity = 0;
    
    return periods.map(period => {
      cumulativeRevenue += period.totalRevenue;
      cumulativeCosts += period.totalCosts;
      cumulativeProfit += period.grossProfit;
      cumulativeOrders += period.orderCount;
      cumulativeQuantity += period.quantitySold;
      
      return {
        ...period,
        cumulativeRevenue,
        cumulativeCosts,
        cumulativeProfit,
        cumulativeOrders,
        cumulativeQuantity,
        cumulativeMargin: cumulativeRevenue > 0 ? (cumulativeProfit / cumulativeRevenue) * 100 : 0
      };
    });
  };

  // Memoizza calcoli pesanti
  const periodsWithCumulative = useMemo(() => {
    if (isLoading || orders.length === 0) return [];
    const periods = calculateEconomicDataByPeriod();
    return calculateCumulativeData(periods);
  }, [orders, costs, manualMetrics, magazzinoData, selectedDateRange, customStartDate, customEndDate, viewMode, selectedYear, isLoading]);
  
  // Calcola totali (memoizzato)
  const totals = useMemo(() => {
    if (periodsWithCumulative.length === 0) return {};
    const lastPeriod = periodsWithCumulative[periodsWithCumulative.length - 1];
    return {
      revenue: lastPeriod?.cumulativeRevenue || 0,
      costs: lastPeriod?.cumulativeCosts || 0,
      profit: lastPeriod?.cumulativeProfit || 0,
      orders: lastPeriod?.cumulativeOrders || 0,
      quantity: lastPeriod?.cumulativeQuantity || 0,
      margin: lastPeriod?.cumulativeMargin || 0,
      purchaseCosts: periodsWithCumulative.reduce((sum, p) => sum + p.purchaseCosts, 0),
      marketingCosts: periodsWithCumulative.reduce((sum, p) => sum + p.marketingCosts, 0),
      googleCosts: periodsWithCumulative.reduce((sum, p) => sum + p.googleCosts, 0),
      metaCosts: periodsWithCumulative.reduce((sum, p) => sum + p.metaCosts, 0),
      shippingCosts: periodsWithCumulative.reduce((sum, p) => sum + p.shippingCosts, 0),
      shippingRevenue: periodsWithCumulative.reduce((sum, p) => sum + p.shippingRevenue, 0),
      productRevenue: periodsWithCumulative.reduce((sum, p) => sum + p.productRevenue, 0),
      productProfit: periodsWithCumulative.reduce((sum, p) => sum + p.productProfit, 0)
    };
  }, [periodsWithCumulative]);

  // Calcola periodo precedente per confronto
  const getPreviousPeriodData = useMemo(() => {
    const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

    const prevOrders = orders.filter(order => {
      const orderDate = getOrderDate(order);
      return orderDate && orderDate >= prevStartDate && orderDate <= prevEndDate;
    });

    let prevRevenue = 0, prevCosts = 0, prevOrderCount = 0, prevQuantity = 0;

    prevOrders.forEach(order => {
      prevRevenue += getOrderTotal(order);
      prevCosts += getShippingCost(order);
      prevOrderCount++;
      const products = getOrderProducts(order);
      products.forEach(item => {
        prevQuantity += parseInt(item.quantity || 1);
      });
    });

    // Aggiungi costi marketing del periodo precedente
    const prevMarketing = manualMetrics
      .filter(m => {
        const d = new Date(m.date);
        return d >= prevStartDate && d <= prevEndDate;
      })
      .reduce((sum, m) => sum + (parseFloat(m.googleCost || 0) + parseFloat(m.metaCost || 0)), 0);

    prevCosts += prevMarketing;
    const prevProfit = prevRevenue - prevCosts;
    const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

    return {
      revenue: prevRevenue,
      costs: prevCosts,
      profit: prevProfit,
      orders: prevOrderCount,
      quantity: prevQuantity,
      margin: prevMargin
    };
  }, [orders, selectedDateRange, customStartDate, customEndDate, manualMetrics]);

  // Calcola variazioni percentuali
  const calcVariazione = (attuale, precedente) => {
    if (precedente === 0) return attuale > 0 ? 100 : 0;
    return ((attuale - precedente) / precedente) * 100;
  };

  const variazioni = {
    revenue: calcVariazione(totals.revenue || 0, getPreviousPeriodData.revenue),
    costs: calcVariazione(totals.costs || 0, getPreviousPeriodData.costs),
    profit: calcVariazione(totals.profit || 0, getPreviousPeriodData.profit),
    orders: calcVariazione(totals.orders || 0, getPreviousPeriodData.orders),
    quantity: calcVariazione(totals.quantity || 0, getPreviousPeriodData.quantity),
    margin: (totals.margin || 0) - (getPreviousPeriodData.margin || 0)
  };

  const formatCurrency = (value) => {
    return (value || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-4 text-gray-600">Caricamento dati...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cruscotto di Monitoraggio</h1>
          <p className="text-muted-foreground">
            Analisi completa ricavi, costi e profittabilità • {orders.length} ordini caricati
          </p>
        </div>
      </div>

      {/* Controlli */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Periodo:</label>
              <select
                value={selectedDateRange}
                onChange={e => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="last_7_days">Ultimi 7 giorni</option>
                <option value="last_30_days">Ultimi 30 giorni</option>
                <option value="last_90_days">Ultimi 90 giorni</option>
                <option value="this_year">Anno corrente</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Vista:</label>
              <select
                value={viewMode}
                onChange={e => setViewMode(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="week">Settimanale</option>
                <option value="month">Mensile</option>
                <option value="quarter">Trimestrale</option>
              </select>
            </div>

            {viewMode === 'week' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Anno:</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-md"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedDateRange === 'custom' && (
              <DateRangePicker
                startDate={customStartDate ? new Date(customStartDate) : null}
                endDate={customEndDate ? new Date(customEndDate) : null}
                onDateChange={([start, end]) => {
                  setCustomStartDate(start ? start.toISOString().slice(0, 10) : '');
                  setCustomEndDate(end ? end.toISOString().slice(0, 10) : '');
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confronto Periodo Precedente */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Confronto con Periodo Precedente</h3>
            <span className="text-sm text-blue-600 ml-2">
              ({selectedDateRange === 'last_7_days' ? 'vs 7 gg prima' : 
                selectedDateRange === 'last_30_days' ? 'vs 30 gg prima' : 
                selectedDateRange === 'last_90_days' ? 'vs 90 gg prima' : 
                selectedDateRange === 'this_year' ? 'vs anno scorso' : 'vs periodo prec.'})
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Ricavi */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-xs text-green-700 mb-1">Ricavi</p>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totals.revenue)}</p>
              <div className="flex items-center gap-1 mt-1">
                {variazioni.revenue >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${variazioni.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {variazioni.revenue >= 0 ? '+' : ''}{variazioni.revenue.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Costi */}
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <p className="text-xs text-red-700 mb-1">Costi</p>
              <p className="text-lg font-bold text-red-800">{formatCurrency(totals.costs)}</p>
              <div className="flex items-center gap-1 mt-1">
                {variazioni.costs <= 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${variazioni.costs <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {variazioni.costs >= 0 ? '+' : ''}{variazioni.costs.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Profitto */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-700 mb-1">Profitto</p>
              <p className={`text-lg font-bold ${totals.profit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                {formatCurrency(totals.profit)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {variazioni.profit >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${variazioni.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {variazioni.profit >= 0 ? '+' : ''}{variazioni.profit.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Ordini */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-700 mb-1">Ordini</p>
              <p className="text-lg font-bold text-gray-800">{totals.orders || 0}</p>
              <div className="flex items-center gap-1 mt-1">
                {variazioni.orders >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${variazioni.orders >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {variazioni.orders >= 0 ? '+' : ''}{variazioni.orders.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Pezzi */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-700 mb-1">Pezzi</p>
              <p className="text-lg font-bold text-gray-800">{totals.quantity || 0}</p>
              <div className="flex items-center gap-1 mt-1">
                {variazioni.quantity >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${variazioni.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {variazioni.quantity >= 0 ? '+' : ''}{variazioni.quantity.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Margine */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <p className="text-xs text-purple-700 mb-1">Margine</p>
              <p className="text-lg font-bold text-purple-800">{(totals.margin || 0).toFixed(1)}%</p>
              <div className="flex items-center gap-1 mt-1">
                {variazioni.margin >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${variazioni.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {variazioni.margin >= 0 ? '+' : ''}{variazioni.margin.toFixed(1)}pp
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Ricavi Totali</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(totals.revenue)}</p>
                <p className="text-xs text-green-600 mt-1">Prec: {formatCurrency(getPreviousPeriodData.revenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Costi Totali</p>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(totals.costs)}</p>
                <p className="text-xs text-red-600 mt-1">Prec: {formatCurrency(getPreviousPeriodData.costs)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${totals.profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${totals.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Profitto (EBITDA)</p>
                <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  {formatCurrency(totals.profit)}
                </p>
                <p className={`text-xs mt-1 ${totals.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Prec: {formatCurrency(getPreviousPeriodData.profit)}
                </p>
              </div>
              <DollarSign className={`w-8 h-8 ${totals.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Margine %</p>
                <p className="text-2xl font-bold text-purple-800">{(totals.margin || 0).toFixed(1)}%</p>
                <p className="text-xs text-purple-600 mt-1">Prec: {(getPreviousPeriodData.margin || 0).toFixed(1)}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metriche Vendite */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Ordini</p>
                <p className="text-xl font-bold">{totals.orders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Pezzi Venduti</p>
                <p className="text-xl font-bold">{totals.quantity || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calculator className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">AOV (Scontrino Medio)</p>
                <p className="text-xl font-bold">{formatCurrency(totals.orders > 0 ? totals.revenue / totals.orders : 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">CPA Marketing</p>
                <p className="text-xl font-bold">{formatCurrency(totals.orders > 0 ? totals.marketingCosts / totals.orders : 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabella Dettagliata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Cruscotto di Monitoraggio - Vista {viewMode === 'week' ? 'Settimanale' : viewMode === 'month' ? 'Mensile' : 'Trimestrale'}
          </CardTitle>
          <CardDescription>
            Analisi dettagliata per periodo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold sticky left-0 bg-gray-50 min-w-[180px]">Indicatore</th>
                  {periodsWithCumulative.map((period, index) => (
                    <th key={index} className="text-right p-3 font-semibold min-w-[100px]">
                      {period.period}
                    </th>
                  ))}
                  <th className="text-right p-3 font-semibold min-w-[110px] bg-blue-50">
                    TOTALE
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* SINTESI */}
                <tr className="bg-gray-100">
                  <td colSpan={periodsWithCumulative.length + 2} className="p-3 font-bold text-gray-700">📈 SINTESI</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Ricavi Totali</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right font-bold text-green-600">{formatCurrency(p.totalRevenue)}</td>
                  ))}
                  <td className="p-3 text-right font-bold text-green-600 bg-blue-50">{formatCurrency(totals.revenue)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Costi Totali</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right font-bold text-red-600">{formatCurrency(p.totalCosts)}</td>
                  ))}
                  <td className="p-3 text-right font-bold text-red-600 bg-blue-50">{formatCurrency(totals.costs)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">EBITDA (Profitto)</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className={`p-3 text-right font-bold ${p.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(p.grossProfit)}
                    </td>
                  ))}
                  <td className={`p-3 text-right font-bold bg-blue-50 ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totals.profit)}
                  </td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Margine %</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className={`p-3 text-right ${p.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {p.grossMargin.toFixed(1)}%
                    </td>
                  ))}
                  <td className={`p-3 text-right bg-blue-50 font-bold ${totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(totals.margin || 0).toFixed(1)}%
                  </td>
                </tr>

                {/* VENDITE */}
                <tr className="bg-gray-100">
                  <td colSpan={periodsWithCumulative.length + 2} className="p-3 font-bold text-gray-700">🛒 VENDITE</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Ordini</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right">{p.orderCount}</td>
                  ))}
                  <td className="p-3 text-right font-bold bg-blue-50">{totals.orders}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Pezzi Venduti</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right">{p.quantitySold}</td>
                  ))}
                  <td className="p-3 text-right font-bold bg-blue-50">{totals.quantity}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Scontrino Medio (AOV)</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right">{formatCurrency(p.avgOrderValue)}</td>
                  ))}
                  <td className="p-3 text-right bg-blue-50">{formatCurrency(totals.orders > 0 ? totals.revenue / totals.orders : 0)}</td>
                </tr>

                {/* MARGINI PRODOTTI */}
                <tr className="bg-gray-100">
                  <td colSpan={periodsWithCumulative.length + 2} className="p-3 font-bold text-gray-700">📦 MARGINI PRODOTTI</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Ricavi Prodotti</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right text-green-600">{formatCurrency(p.productRevenue)}</td>
                  ))}
                  <td className="p-3 text-right text-green-600 bg-blue-50">{formatCurrency(totals.productRevenue)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Costi Acquisto Prodotti</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right text-red-600">{formatCurrency(p.purchaseCosts)}</td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">{formatCurrency(totals.purchaseCosts)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Margine Prodotti</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className={`p-3 text-right font-bold ${p.productProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(p.productProfit)}
                    </td>
                  ))}
                  <td className={`p-3 text-right font-bold bg-blue-50 ${totals.productProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totals.productProfit)}
                  </td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Margine Prodotti %</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className={`p-3 text-right ${p.productMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {p.productMargin.toFixed(1)}%
                    </td>
                  ))}
                  <td className={`p-3 text-right bg-blue-50 ${totals.productRevenue > 0 && (totals.productProfit / totals.productRevenue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totals.productRevenue > 0 ? (totals.productProfit / totals.productRevenue * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* COSTI MARKETING */}
                <tr className="bg-gray-100">
                  <td colSpan={periodsWithCumulative.length + 2} className="p-3 font-bold text-gray-700">💰 COSTI MARKETING</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Google Ads</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right text-red-600">{formatCurrency(p.googleCosts)}</td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">{formatCurrency(totals.googleCosts)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Meta (Facebook/Instagram)</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right text-red-600">{formatCurrency(p.metaCosts)}</td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">{formatCurrency(totals.metaCosts)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Totale Marketing</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right font-bold text-red-600">{formatCurrency(p.marketingCosts)}</td>
                  ))}
                  <td className="p-3 text-right font-bold text-red-600 bg-blue-50">{formatCurrency(totals.marketingCosts)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">CPA (Costo per Ordine)</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right">{formatCurrency(p.cpaAdv)}</td>
                  ))}
                  <td className="p-3 text-right bg-blue-50">{formatCurrency(totals.orders > 0 ? totals.marketingCosts / totals.orders : 0)}</td>
                </tr>

                {/* SPEDIZIONI */}
                <tr className="bg-gray-100">
                  <td colSpan={periodsWithCumulative.length + 2} className="p-3 font-bold text-gray-700">🚚 SPEDIZIONI</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Ricavi Spedizione</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right text-green-600">{formatCurrency(p.shippingRevenue)}</td>
                  ))}
                  <td className="p-3 text-right text-green-600 bg-blue-50">{formatCurrency(totals.shippingRevenue)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Costi Spedizione</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className="p-3 text-right text-red-600">{formatCurrency(p.shippingCosts)}</td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">{formatCurrency(totals.shippingCosts)}</td>
                </tr>
                
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium sticky left-0 bg-white">Margine Spedizioni</td>
                  {periodsWithCumulative.map((p, i) => (
                    <td key={i} className={`p-3 text-right ${p.shippingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(p.shippingProfit)}
                    </td>
                  ))}
                  <td className={`p-3 text-right bg-blue-50 ${(totals.shippingRevenue - totals.shippingCosts) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totals.shippingRevenue - totals.shippingCosts)}
                  </td>
                </tr>
              </tbody>
            </table>
            
            {periodsWithCumulative.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Nessun dato disponibile</p>
                <p className="text-sm">Sincronizza gli ordini da Shopify nelle Impostazioni</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContoEconomicoPage;
