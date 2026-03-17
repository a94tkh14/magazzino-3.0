import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Calendar, Target, Calculator } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import DateRangePicker from '../components/DateRangePicker';
import { safeToLowerCase } from '../lib/utils';

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
  const [viewMode, setViewMode] = useState('month'); // week, month, quarter
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [costs, setCosts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [manualMetrics, setManualMetrics] = useState([]);
  const [costCategories, setCostCategories] = useState([]);

  // Carica dati all'avvio
  useEffect(() => {
    const allCosts = JSON.parse(localStorage.getItem('costs') || '[]');
    const allOrders = JSON.parse(localStorage.getItem('shopify_orders') || '[]');
    const allMetrics = JSON.parse(localStorage.getItem('manualMetrics') || '[]');
    
    setCosts(allCosts);
    setOrders(allOrders);
    setManualMetrics(allMetrics);

    // Carica categorie costi
    const saved = localStorage.getItem('costCategories');
    if (saved) {
      setCostCategories(JSON.parse(saved));
    }
  }, []);

  // Calcola costi di acquisto per periodo basato su SKU venduti
  const calculatePurchaseCosts = (startDate, endDate) => {
    // Carica dati magazzino
    const magazzinoData = JSON.parse(localStorage.getItem('magazzino_data') || '[]');
    
    // Filtra ordini per questo periodo
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    // Calcola costi di acquisto basato sui prodotti venduti
    let totalPurchaseCosts = 0;
    
    periodOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          // Cerca il prodotto nel magazzino per SKU
          const magazzinoItem = magazzinoData.find(magItem => 
            magItem.sku === item.sku || 
            magItem.sku === item.sku?.toString() ||
            magItem.sku === item.variant_id?.toString()
          );
          
          if (magazzinoItem && magazzinoItem.prezzo > 0) {
            // Calcola costo di acquisto per questo item
            const itemPurchaseCost = magazzinoItem.prezzo * item.quantity;
            totalPurchaseCosts += itemPurchaseCost;
          }
        });
      }
    });
    
    return totalPurchaseCosts;
  };

  // Calcola costi di acquisto per periodo
  const calculateEconomicDataByPeriod = () => {
    const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
    const periods = [];
    
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    // Per le settimane, calcola tutte le settimane dall'inizio dell'anno selezionato fino ad oggi
    if (viewMode === 'week') {
      // Trova il primo gennaio dell'anno selezionato
      const firstDayOfYear = new Date(selectedYear, 0, 1); // 1 gennaio
      
      // Trova il lunedì della prima settimana dell'anno
      const dayOfWeek = firstDayOfYear.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = domenica
      const firstMondayOfYear = new Date(selectedYear, 0, 1 + daysToMonday);
      
      // Inizia dal primo lunedì dell'anno
      currentDate = new Date(firstMondayOfYear);
      
      // Calcola tutte le settimane dall'inizio dell'anno fino ad oggi (o fine anno se anno passato)
      const endDate = selectedYear === new Date().getFullYear() ? new Date() : new Date(selectedYear, 11, 31);
      while (currentDate <= endDate) {
        const periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + 6);
        
        // Verifica se ci sono ordini in questa settimana
        const periodOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= currentDate && orderDate <= periodEnd;
        });
        
        // Calcola il numero della settimana dell'anno
        const weekOfYear = Math.floor((currentDate - firstMondayOfYear) / (7 * 24 * 60 * 60 * 1000)) + 1;
        const periodLabel = `Week ${weekOfYear}`;
        
        // Calcola tutti i dati per questa settimana
        const totalRevenue = periodOrders.reduce((sum, order) => {
          return sum + (parseFloat(order.totalPrice) || 0);
        }, 0);

        const shippingRevenue = periodOrders.reduce((sum, order) => {
          return sum + (parseFloat(order.shippingPrice) || 0);
        }, 0);

        const shippingCosts = periodOrders.reduce((sum, order) => {
          const shippingType = safeToLowerCase(order.shippingType, '');
          if (shippingType.includes('express a domicilio')) {
            return sum + COSTO_EXPRESS;
          } else if (shippingType.includes('punto di ritiro')) {
            return sum + COSTO_PUNTO_RITIRO;
          } else {
            return sum + COSTO_EXPRESS;
          }
        }, 0);

        const periodMetrics = manualMetrics.filter(metric => {
          const metricStartDate = new Date(metric.weekStart);
          const metricEndDate = new Date(metric.weekStart);
          metricEndDate.setDate(metricEndDate.getDate() + 6);
          return metricStartDate <= periodEnd && metricEndDate >= currentDate;
        });
        
        const marketingCosts = periodMetrics.reduce((sum, metric) =>
          sum + (metric.googleAds?.spent || 0) + (metric.meta?.spent || 0) + (metric.tiktok?.spent || 0), 0
        );

        const periodCosts = costs.filter(cost => {
          const costDate = new Date(cost.date);
          return costDate >= currentDate && costDate <= periodEnd;
        });
        
        const otherCosts = periodCosts.reduce((sum, cost) => {
          return sum + (parseFloat(cost.amount) || 0);
        }, 0);

        const purchaseCosts = calculatePurchaseCosts(currentDate, periodEnd);

        const productRevenue = totalRevenue - shippingRevenue;
        const productCosts = purchaseCosts;
        const productProfit = productRevenue - productCosts;
        const productMargin = productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0;

        const totalCosts = marketingCosts + otherCosts + shippingCosts + purchaseCosts;
        const grossProfit = totalRevenue - totalCosts;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const shippingProfit = shippingRevenue - shippingCosts;
        const shippingMargin = shippingRevenue > 0 ? (shippingProfit / shippingRevenue) * 100 : 0;

        periods.push({
          period: periodLabel,
          startDate: currentDate,
          endDate: periodEnd,
          totalRevenue,
          shippingRevenue,
          shippingCosts,
          shippingProfit,
          shippingMargin,
          marketingCosts,
          otherCosts,
          purchaseCosts,
          productRevenue,
          productCosts,
          productProfit,
          productMargin,
          totalCosts,
          grossProfit,
          grossMargin,
          orderCount: periodOrders.length,
          avgOrderValue: periodOrders.length > 0 ? totalRevenue / periodOrders.length : 0
        });

        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      return periods;
    }
    
    // Per mesi e trimestri, usa la logica originale
    while (currentDate <= end) {
      let periodEnd;
      let periodLabel;
      
      switch (viewMode) {
        case 'month':
          periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          periodLabel = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
          break;
        case 'quarter':
          const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
          periodEnd = new Date(currentDate.getFullYear(), quarter * 3, 0);
          periodLabel = `Q${quarter} ${currentDate.getFullYear()}`;
          break;
        default:
          periodEnd = new Date(currentDate);
          periodEnd.setDate(periodEnd.getDate() + 6);
          const defaultWeekNumber = periods.length + 1;
          periodLabel = `Week ${defaultWeekNumber}`;
      }
      
      // Filtra ordini per questo periodo
      const periodOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= currentDate && orderDate <= periodEnd;
      });

      // Calcola ricavi
      const totalRevenue = periodOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.totalPrice) || 0);
      }, 0);

      // Calcola ricavi spedizione
      const shippingRevenue = periodOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.shippingPrice) || 0);
      }, 0);

      // Calcola costi spedizione
      const shippingCosts = periodOrders.reduce((sum, order) => {
        const shippingType = safeToLowerCase(order.shippingType, '');
        if (shippingType.includes('express a domicilio')) {
          return sum + COSTO_EXPRESS;
        } else if (shippingType.includes('punto di ritiro')) {
          return sum + COSTO_PUNTO_RITIRO;
        } else {
          return sum + COSTO_EXPRESS;
        }
      }, 0);

      // Calcola costi marketing
      const periodMetrics = manualMetrics.filter(metric => {
        const metricStartDate = new Date(metric.weekStart);
        const metricEndDate = new Date(metric.weekStart);
        metricEndDate.setDate(metricEndDate.getDate() + 6);
        return metricStartDate <= periodEnd && metricEndDate >= currentDate;
      });
      
      const marketingCosts = periodMetrics.reduce((sum, metric) =>
        sum + (metric.googleAds?.spent || 0) + (metric.meta?.spent || 0) + (metric.tiktok?.spent || 0), 0
      );

      // Calcola altri costi
      const periodCosts = costs.filter(cost => {
        const costDate = new Date(cost.date);
        return costDate >= currentDate && costDate <= periodEnd;
      });
      
      const otherCosts = periodCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);

      // Calcola costi di acquisto
      const purchaseCosts = calculatePurchaseCosts(currentDate, periodEnd);

      // Calcola margine di profitto sui prodotti (escludendo spedizione e marketing)
      const productRevenue = totalRevenue - shippingRevenue;
      const productCosts = purchaseCosts;
      const productProfit = productRevenue - productCosts;
      const productMargin = productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0;

      // Calcola totali
      const totalCosts = marketingCosts + otherCosts + shippingCosts + purchaseCosts;
      const grossProfit = totalRevenue - totalCosts;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const shippingProfit = shippingRevenue - shippingCosts;
      const shippingMargin = shippingRevenue > 0 ? (shippingProfit / shippingRevenue) * 100 : 0;

      periods.push({
        period: periodLabel,
        startDate: currentDate,
        endDate: periodEnd,
        totalRevenue,
        shippingRevenue,
        shippingCosts,
        shippingProfit,
        shippingMargin,
        marketingCosts,
        otherCosts,
        purchaseCosts,
        productRevenue,
        productCosts,
        productProfit,
        productMargin,
        totalCosts,
        grossProfit,
        grossMargin,
        orderCount: periodOrders.length,
        avgOrderValue: periodOrders.length > 0 ? totalRevenue / periodOrders.length : 0
      });

      // Passa al periodo successivo
      switch (viewMode) {
        case 'month':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarter':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    return periods;
  };

  // Calcola totali cumulativi
  const calculateCumulativeData = (periods) => {
    let cumulativeRevenue = 0;
    let cumulativeCosts = 0;
    let cumulativeProfit = 0;
    let cumulativeOrders = 0;
    
    return periods.map(period => {
      cumulativeRevenue += period.totalRevenue;
      cumulativeCosts += period.totalCosts;
      cumulativeProfit += period.grossProfit;
      cumulativeOrders += period.orderCount;
      
      return {
        ...period,
        cumulativeRevenue,
        cumulativeCosts,
        cumulativeProfit,
        cumulativeOrders,
        cumulativeMargin: cumulativeRevenue > 0 ? (cumulativeProfit / cumulativeRevenue) * 100 : 0
      };
    });
  };

  // Calcola dati periodo precedente per confronto
  const calculatePreviousPeriodData = () => {
    const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    // Filtra ordini periodo precedente
    const previousOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= previousStartDate && orderDate <= previousEndDate;
    });

    const previousRevenue = previousOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.totalPrice) || 0);
    }, 0);

    const previousCosts = costs.filter(cost => {
      const costDate = new Date(cost.date);
      return costDate >= previousStartDate && costDate <= previousEndDate;
    }).reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);

    return {
      revenue: previousRevenue,
      costs: previousCosts,
      profit: previousRevenue - previousCosts,
      orderCount: previousOrders.length
    };
  };

  // Calcola proiezioni future
  const calculateProjections = () => {
    const periods = calculateEconomicDataByPeriod();
    const currentPeriod = periods[periods.length - 1] || {
      totalRevenue: 0,
      totalCosts: 0,
      grossProfit: 0
    };
    const previousData = calculatePreviousPeriodData();
    
    // Calcola trend di crescita
    const revenueGrowth = previousData.revenue > 0 ? 
      ((currentPeriod.totalRevenue - previousData.revenue) / previousData.revenue) * 100 : 0;
    
    const costGrowth = previousData.costs > 0 ? 
      ((currentPeriod.totalCosts - previousData.costs) / previousData.costs) * 100 : 0;

    // Proiezioni per i prossimi 3 mesi
    const projectedRevenue = currentPeriod.totalRevenue * (1 + (revenueGrowth / 100));
    const projectedCosts = currentPeriod.totalCosts * (1 + (costGrowth / 100));
    const projectedProfit = projectedRevenue - projectedCosts;

    return {
      revenueGrowth,
      costGrowth,
      projectedRevenue,
      projectedCosts,
      projectedProfit
    };
  };

  // Calcola break-even
  const calculateBreakEven = () => {
    const periods = calculateEconomicDataByPeriod();
    const currentPeriod = periods[periods.length - 1] || {
      avgOrderValue: 0,
      marketingCosts: 0,
      otherCosts: 0,
      shippingCosts: 0,
      orderCount: 0
    };
    const avgOrderValue = currentPeriod.avgOrderValue;
    const fixedCosts = currentPeriod.marketingCosts + currentPeriod.otherCosts;
    const variableCostsPerOrder = currentPeriod.shippingCosts / currentPeriod.orderCount || 0;
    
    if (avgOrderValue > variableCostsPerOrder) {
      const breakEvenOrders = fixedCosts / (avgOrderValue - variableCostsPerOrder);
      const breakEvenRevenue = breakEvenOrders * avgOrderValue;
      return {
        breakEvenOrders: Math.ceil(breakEvenOrders),
        breakEvenRevenue: Math.ceil(breakEvenRevenue),
        avgOrderValue,
        fixedCosts,
        variableCostsPerOrder
      };
    }
    
    return null;
  };

  const periods = calculateEconomicDataByPeriod();
  const periodsWithCumulative = calculateCumulativeData(periods);
  const previousData = calculatePreviousPeriodData();
  const projections = calculateProjections();
  const breakEven = calculateBreakEven();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conto Economico</h1>
          <p className="text-muted-foreground">
            Analisi completa ricavi, costi e profittabilità
          </p>
        </div>
      </div>

      {/* Controlli periodo e vista */}
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

      {/* Dashboard di Monitoraggio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Dashboard di Monitoraggio - Vista {viewMode === 'week' ? 'Settimanale' : viewMode === 'month' ? 'Mensile' : 'Trimestrale'}
          </CardTitle>
          <CardDescription>
            Sintesi per periodo con indicatori chiave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold min-w-[200px]">Indicatore</th>
                  {periodsWithCumulative.map((period, index) => (
                    <th key={index} className="text-right p-3 font-semibold min-w-[120px]">
                      {period.period}
                    </th>
                  ))}
                  <th className="text-right p-3 font-semibold min-w-[120px] bg-blue-50">
                    TOTALE
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Sezione Sintesi */}
                <tr className="border-b bg-gray-100">
                  <td className="p-3 font-bold text-gray-700">📈 SINTESI</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right"></td>
                  ))}
                  <td className="p-3 text-right bg-blue-50"></td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Totale Ricavi</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right font-bold text-green-600">
                      {period.totalRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right font-bold text-green-600 bg-blue-50">
                    {periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) || '€0,00'}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Costi di Acquisto</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right text-red-600">
                      {period.purchaseCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.purchaseCosts, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Totale Costi</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right font-bold text-red-600">
                      {period.totalCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right font-bold text-red-600 bg-blue-50">
                    {periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) || '€0,00'}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">EBITDA</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className={`p-3 text-right font-bold ${period.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {period.grossProfit.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className={`p-3 text-right font-bold bg-blue-50 ${periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeProfit.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) || '€0,00'}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Perc. di Margine</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className={`p-3 text-right ${period.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {period.grossMargin.toFixed(1)}%
                    </td>
                  ))}
                  <td className={`p-3 text-right bg-blue-50 ${periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeMargin.toFixed(1) || '0.0'}%
                  </td>
                </tr>
                
                {/* Sezione Costi ADV */}
                <tr className="border-b bg-gray-100">
                  <td className="p-3 font-bold text-gray-700">💰 COSTI ADV</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right"></td>
                  ))}
                  <td className="p-3 text-right bg-blue-50"></td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Totale Costi ADV</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right font-bold text-red-600">
                      {period.marketingCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right font-bold text-red-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.marketingCosts, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">CPA ADV</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right">
                      {period.orderCount > 0 ? (period.marketingCosts / period.orderCount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '€0,00'}
                    </td>
                  ))}
                  <td className="p-3 text-right bg-blue-50">
                    {(() => {
                      const totalOrders = periodsWithCumulative.reduce((sum, period) => sum + period.orderCount, 0);
                      const totalMarketingCosts = periodsWithCumulative.reduce((sum, period) => sum + period.marketingCosts, 0);
                      return totalOrders > 0 ? (totalMarketingCosts / totalOrders).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '€0,00';
                    })()}
                  </td>
                </tr>
                
                {/* Sezione Dettaglio Vendite */}
                <tr className="border-b bg-gray-100">
                  <td className="p-3 font-bold text-gray-700">🛒 DETTAGLIO VENDITE</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right"></td>
                  ))}
                  <td className="p-3 text-right bg-blue-50"></td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Prodotti Venduti</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right">
                      {period.orderCount}
                    </td>
                  ))}
                  <td className="p-3 text-right bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.orderCount, 0)}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Quantità Venduta</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right">
                      {period.orderCount}
                    </td>
                  ))}
                  <td className="p-3 text-right bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.orderCount, 0)}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Ordini Ricevuti</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right">
                      {period.orderCount}
                    </td>
                  ))}
                  <td className="p-3 text-right bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.orderCount, 0)}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Quantità Acquistata</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right">
                      {period.orderCount}
                    </td>
                  ))}
                  <td className="p-3 text-right bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.orderCount, 0)}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Gross Profit %</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className={`p-3 text-right ${period.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {period.grossMargin.toFixed(1)}%
                    </td>
                  ))}
                  <td className={`p-3 text-right bg-blue-50 ${periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodsWithCumulative[periodsWithCumulative.length - 1]?.cumulativeMargin.toFixed(1) || '0.0'}%
                  </td>
                </tr>
                
                {/* Sezione Margini Prodotti */}
                <tr className="border-b bg-gray-100">
                  <td className="p-3 font-bold text-gray-700">📦 MARGINI PRODOTTI</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right"></td>
                  ))}
                  <td className="p-3 text-right bg-blue-50"></td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Ricavi Prodotti</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right font-bold text-green-600">
                      {period.productRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right font-bold text-green-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.productRevenue, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Costi Prodotti</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right font-bold text-red-600">
                      {period.productCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right font-bold text-red-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.productCosts, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Profitto Prodotti</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className={`p-3 text-right font-bold ${period.productProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {period.productProfit.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className={`p-3 text-right font-bold bg-blue-50 ${periodsWithCumulative.reduce((sum, period) => sum + period.productProfit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodsWithCumulative.reduce((sum, period) => sum + period.productProfit, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Margine Prodotti %</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className={`p-3 text-right ${period.productMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {period.productMargin.toFixed(1)}%
                    </td>
                  ))}
                  <td className={`p-3 text-right bg-blue-50 ${(() => {
                    const totalProductRevenue = periodsWithCumulative.reduce((sum, period) => sum + period.productRevenue, 0);
                    const totalProductProfit = periodsWithCumulative.reduce((sum, period) => sum + period.productProfit, 0);
                    const totalProductMargin = totalProductRevenue > 0 ? (totalProductProfit / totalProductRevenue) * 100 : 0;
                    return totalProductMargin >= 0 ? 'text-green-600' : 'text-red-600';
                  })()}`}>
                    {(() => {
                      const totalProductRevenue = periodsWithCumulative.reduce((sum, period) => sum + period.productRevenue, 0);
                      const totalProductProfit = periodsWithCumulative.reduce((sum, period) => sum + period.productProfit, 0);
                      const totalProductMargin = totalProductRevenue > 0 ? (totalProductProfit / totalProductRevenue) * 100 : 0;
                      return totalProductMargin.toFixed(1);
                    })()}%
                  </td>
                </tr>
                
                {/* Sezione Costi Dettagliati */}
                <tr className="border-b bg-gray-100">
                  <td className="p-3 font-bold text-gray-700">💸 COSTI DETTAGLIATI</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right"></td>
                  ))}
                  <td className="p-3 text-right bg-blue-50"></td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Costi di Acquisto</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right text-red-600">
                      {period.purchaseCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.purchaseCosts, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Costi ADV</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right text-red-600">
                      {period.marketingCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.marketingCosts, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Google</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right text-red-600">
                      €0,00
                    </td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">
                    €0,00
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Meta</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right text-red-600">
                      €0,00
                    </td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">
                    €0,00
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Costi di Spedizione</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right text-red-600">
                      {period.shippingCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right text-red-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.shippingCosts, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="p-3 font-medium">Totale Costi</td>
                  {periodsWithCumulative.map((period, index) => (
                    <td key={index} className="p-3 text-right font-bold text-red-600">
                      {period.totalCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  ))}
                  <td className="p-3 text-right font-bold text-red-600 bg-blue-50">
                    {periodsWithCumulative.reduce((sum, period) => sum + period.totalCosts, 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
              </tbody>
            </table>
            
            {periodsWithCumulative.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">Nessun dato disponibile per questo periodo</p>
                <p className="text-sm">Prova a cambiare il periodo o la vista</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContoEconomicoPage; 