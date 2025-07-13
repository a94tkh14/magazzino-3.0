import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Button from './ui/button';
import { formatPrice } from '../lib/utils';
import { format, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay, subDays, isSameDay, isSameHour } from 'date-fns';
import { it } from 'date-fns/locale';

const SalesChart = ({ 
  orders, 
  startDate, 
  endDate, 
  comparisonOrders = null,
  comparisonStartDate = null,
  comparisonEndDate = null
}) => {
  const [chartData, setChartData] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['products', 'revenue']);
  const [showComparison, setShowComparison] = useState(true);
  const [isSingleDay, setIsSingleDay] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgProductsPerDay: 0,
    avgRevenuePerDay: 0,
    avgProductsPerOrder: 0,
    activeDays: 0,
    activeDaysPercentage: 0
  });

  // Opzioni metriche disponibili
  const metricOptions = [
    { key: 'products', label: 'Quantità Prodotti', color: '#3b82f6' },
    { key: 'revenue', label: 'Fatturato', color: '#10b981' },
    { key: 'orders', label: 'Numero Ordini', color: '#8b5cf6' },
    { key: 'avgProductsPerOrder', label: 'Media Articoli/Carrello', color: '#f59e0b' }
  ];

  // Toggle metrica
  const toggleMetric = (metricKey) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  // Calcola i dati per il grafico basati sui filtri del calendario
  useEffect(() => {
    if (!orders || orders.length === 0 || !startDate || !endDate) {
      setChartData([]);
      setStats({
        totalProducts: 0,
        totalRevenue: 0,
        totalOrders: 0,
        avgProductsPerDay: 0,
        avgRevenuePerDay: 0,
        avgProductsPerOrder: 0,
        activeDays: 0,
        activeDaysPercentage: 0
      });
      return;
    }

    // Controlla se è un giorno singolo
    const singleDay = isSameDay(startDate, endDate);
    setIsSingleDay(singleDay);

    if (singleDay) {
      // Visualizzazione per ore per un giorno singolo
      const hours = eachHourOfInterval({ 
        start: startOfDay(startDate), 
        end: endOfDay(startDate) 
      });
      
      // Raggruppa gli ordini per ora
      const ordersByHour = {};
      hours.forEach(hour => {
        const hourKey = format(hour, 'yyyy-MM-dd-HH');
        ordersByHour[hourKey] = {
          date: hourKey,
          hour: format(hour, 'HH:00'),
          products: 0,
          revenue: 0,
          orders: 0,
          avgProductsPerOrder: 0,
          // Dati di confronto
          comparisonProducts: 0,
          comparisonRevenue: 0,
          comparisonOrders: 0,
          comparisonAvgProductsPerOrder: 0
        };
      });

      // Popola i dati degli ordini principali per ora
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const hourKey = format(orderDate, 'yyyy-MM-dd-HH');
        
        if (ordersByHour[hourKey]) {
          const orderProducts = order.items.reduce((sum, item) => sum + item.quantity, 0);
          ordersByHour[hourKey].products += orderProducts;
          ordersByHour[hourKey].revenue += order.totalPrice;
          ordersByHour[hourKey].orders += 1;
        }
      });

      // Popola i dati degli ordini di confronto per ora
      if (comparisonOrders && comparisonStartDate && comparisonEndDate) {
        const comparisonHours = eachHourOfInterval({ 
          start: startOfDay(comparisonStartDate), 
          end: endOfDay(comparisonStartDate) 
        });
        
        // Mappa le ore di confronto alle ore principali
        const hourMapping = {};
        const mainHoursCount = hours.length;
        const comparisonHoursCount = comparisonHours.length;
        
        comparisonHours.forEach((comparisonHour, index) => {
          const mainHourIndex = Math.floor((index / comparisonHoursCount) * mainHoursCount);
          if (mainHourIndex < mainHoursCount) {
            const mainHour = hours[mainHourIndex];
            const mainHourKey = format(mainHour, 'yyyy-MM-dd-HH');
            const comparisonHourKey = format(comparisonHour, 'yyyy-MM-dd-HH');
            hourMapping[comparisonHourKey] = mainHourKey;
          }
        });

        comparisonOrders.forEach(order => {
          const orderDate = new Date(order.createdAt);
          const comparisonHourKey = format(orderDate, 'yyyy-MM-dd-HH');
          const mainHourKey = hourMapping[comparisonHourKey];
          
          if (mainHourKey && ordersByHour[mainHourKey]) {
            const orderProducts = order.items.reduce((sum, item) => sum + item.quantity, 0);
            ordersByHour[mainHourKey].comparisonProducts += orderProducts;
            ordersByHour[mainHourKey].comparisonRevenue += order.totalPrice;
            ordersByHour[mainHourKey].comparisonOrders += 1;
          }
        });
      }

      // Calcola la media articoli per carrello per ogni ora
      Object.keys(ordersByHour).forEach(hourKey => {
        const hour = ordersByHour[hourKey];
        if (hour.orders > 0) {
          hour.avgProductsPerOrder = hour.products / hour.orders;
        }
        if (hour.comparisonOrders > 0) {
          hour.comparisonAvgProductsPerOrder = hour.comparisonProducts / hour.comparisonOrders;
        }
      });

      // Converti in array per il grafico
      const data = Object.values(ordersByHour).map(hour => ({
        ...hour,
        date: hour.hour
      }));

      setChartData(data);

      // Calcola statistiche per il giorno
      const totalProducts = data.reduce((sum, hour) => sum + hour.products, 0);
      const totalRevenue = data.reduce((sum, hour) => sum + hour.revenue, 0);
      const totalOrders = data.reduce((sum, hour) => sum + hour.orders, 0);
      const activeHours = data.filter(hour => hour.products > 0 || hour.revenue > 0).length;
      const totalHours = data.length;
      const avgProductsPerOrder = totalOrders > 0 ? totalProducts / totalOrders : 0;

      setStats({
        totalProducts,
        totalRevenue,
        totalOrders,
        avgProductsPerDay: totalHours > 0 ? totalProducts / totalHours : 0,
        avgRevenuePerDay: totalHours > 0 ? totalRevenue / totalHours : 0,
        avgProductsPerOrder,
        activeDays: activeHours,
        activeDaysPercentage: totalHours > 0 ? (activeHours / totalHours) * 100 : 0
      });

    } else {
      // Visualizzazione per giorni per periodo multiplo
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Raggruppa gli ordini per giorno
      const ordersByDay = {};
      days.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        ordersByDay[dayKey] = {
          date: dayKey,
          products: 0,
          revenue: 0,
          orders: 0,
          avgProductsPerOrder: 0,
          // Dati di confronto
          comparisonProducts: 0,
          comparisonRevenue: 0,
          comparisonOrders: 0,
          comparisonAvgProductsPerOrder: 0
        };
      });

      // Popola i dati degli ordini principali
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const dayKey = format(orderDate, 'yyyy-MM-dd');
        
        if (ordersByDay[dayKey]) {
          const orderProducts = order.items.reduce((sum, item) => sum + item.quantity, 0);
          ordersByDay[dayKey].products += orderProducts;
          ordersByDay[dayKey].revenue += order.totalPrice;
          ordersByDay[dayKey].orders += 1;
        }
      });

      // Popola i dati degli ordini di confronto se disponibili
      if (comparisonOrders && comparisonStartDate && comparisonEndDate) {
        const comparisonDays = eachDayOfInterval({ start: comparisonStartDate, end: comparisonEndDate });
        
        // Mappa i giorni di confronto ai giorni principali per allineamento
        const dayMapping = {};
        const mainDaysCount = days.length;
        const comparisonDaysCount = comparisonDays.length;
        
        comparisonDays.forEach((comparisonDay, index) => {
          const mainDayIndex = Math.floor((index / comparisonDaysCount) * mainDaysCount);
          if (mainDayIndex < mainDaysCount) {
            const mainDay = days[mainDayIndex];
            const mainDayKey = format(mainDay, 'yyyy-MM-dd');
            const comparisonDayKey = format(comparisonDay, 'yyyy-MM-dd');
            dayMapping[comparisonDayKey] = mainDayKey;
          }
        });

        comparisonOrders.forEach(order => {
          const orderDate = new Date(order.createdAt);
          const comparisonDayKey = format(orderDate, 'yyyy-MM-dd');
          const mainDayKey = dayMapping[comparisonDayKey];
          
          if (mainDayKey && ordersByDay[mainDayKey]) {
            const orderProducts = order.items.reduce((sum, item) => sum + item.quantity, 0);
            ordersByDay[mainDayKey].comparisonProducts += orderProducts;
            ordersByDay[mainDayKey].comparisonRevenue += order.totalPrice;
            ordersByDay[mainDayKey].comparisonOrders += 1;
          }
        });
      }

      // Calcola la media articoli per carrello per ogni giorno
      Object.keys(ordersByDay).forEach(dayKey => {
        const day = ordersByDay[dayKey];
        if (day.orders > 0) {
          day.avgProductsPerOrder = day.products / day.orders;
        }
        if (day.comparisonOrders > 0) {
          day.comparisonAvgProductsPerOrder = day.comparisonProducts / day.comparisonOrders;
        }
      });

      // Converti in array per il grafico
      const data = Object.values(ordersByDay).map(day => ({
        ...day,
        date: format(new Date(day.date), 'dd/MM', { locale: it })
      }));

      setChartData(data);

      // Calcola statistiche
      const totalProducts = data.reduce((sum, day) => sum + day.products, 0);
      const totalRevenue = data.reduce((sum, day) => sum + day.revenue, 0);
      const totalOrders = data.reduce((sum, day) => sum + day.orders, 0);
      const activeDays = data.filter(day => day.products > 0 || day.revenue > 0).length;
      const totalDays = data.length;
      const avgProductsPerOrder = totalOrders > 0 ? totalProducts / totalOrders : 0;

      setStats({
        totalProducts,
        totalRevenue,
        totalOrders,
        avgProductsPerDay: totalDays > 0 ? totalProducts / totalDays : 0,
        avgRevenuePerDay: totalDays > 0 ? totalRevenue / totalDays : 0,
        avgProductsPerOrder,
        activeDays,
        activeDaysPercentage: totalDays > 0 ? (activeDays / totalDays) * 100 : 0
      });
    }
  }, [orders, startDate, endDate, comparisonOrders, comparisonStartDate, comparisonEndDate]);

  // Calcola statistiche per il periodo di confronto
  const comparisonStats = React.useMemo(() => {
    if (!comparisonOrders || !comparisonStartDate || !comparisonEndDate) {
      return null;
    }

    const isComparisonSingleDay = isSameDay(comparisonStartDate, comparisonEndDate);
    
    if (isComparisonSingleDay) {
      // Statistiche per ora per confronto
      const hours = eachHourOfInterval({ 
        start: startOfDay(comparisonStartDate), 
        end: endOfDay(comparisonStartDate) 
      });
      
      const ordersByHour = {};
      hours.forEach(hour => {
        const hourKey = format(hour, 'yyyy-MM-dd-HH');
        ordersByHour[hourKey] = {
          products: 0,
          revenue: 0,
          orders: 0,
          avgProductsPerOrder: 0
        };
      });

      comparisonOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const hourKey = format(orderDate, 'yyyy-MM-dd-HH');
        
        if (ordersByHour[hourKey]) {
          const orderProducts = order.items.reduce((sum, item) => sum + item.quantity, 0);
          ordersByHour[hourKey].products += orderProducts;
          ordersByHour[hourKey].revenue += order.totalPrice;
          ordersByHour[hourKey].orders += 1;
        }
      });

      const data = Object.values(ordersByHour);
      const totalProducts = data.reduce((sum, hour) => sum + hour.products, 0);
      const totalRevenue = data.reduce((sum, hour) => sum + hour.revenue, 0);
      const totalOrders = data.reduce((sum, hour) => sum + hour.orders, 0);
      const avgProductsPerOrder = totalOrders > 0 ? totalProducts / totalOrders : 0;

      return {
        totalProducts,
        totalRevenue,
        totalOrders,
        avgProductsPerOrder
      };
    } else {
      // Statistiche per giorno per confronto
      const days = eachDayOfInterval({ start: comparisonStartDate, end: comparisonEndDate });
      const ordersByDay = {};
      
      days.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        ordersByDay[dayKey] = {
          products: 0,
          revenue: 0,
          orders: 0,
          avgProductsPerOrder: 0
        };
      });

      comparisonOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const dayKey = format(orderDate, 'yyyy-MM-dd');
        
        if (ordersByDay[dayKey]) {
          const orderProducts = order.items.reduce((sum, item) => sum + item.quantity, 0);
          ordersByDay[dayKey].products += orderProducts;
          ordersByDay[dayKey].revenue += order.totalPrice;
          ordersByDay[dayKey].orders += 1;
        }
      });

      const data = Object.values(ordersByDay);
      const totalProducts = data.reduce((sum, day) => sum + day.products, 0);
      const totalRevenue = data.reduce((sum, day) => sum + day.revenue, 0);
      const totalOrders = data.reduce((sum, day) => sum + day.orders, 0);
      const avgProductsPerOrder = totalOrders > 0 ? totalProducts / totalOrders : 0;

      return {
        totalProducts,
        totalRevenue,
        totalOrders,
        avgProductsPerOrder
      };
    }
  }, [comparisonOrders, comparisonStartDate, comparisonEndDate]);

  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{isSingleDay ? `Ora: ${label}` : `Data: ${label}`}</p>
          {(Array.isArray(payload) ? payload : []).map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'revenue' || entry.dataKey === 'comparisonRevenue' 
                ? formatPrice(entry.value) 
                : entry.value.toFixed(entry.dataKey === 'avgProductsPerOrder' || entry.dataKey === 'comparisonAvgProductsPerOrder' ? 1 : 0)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const generateChartLines = () => {
    const lines = [];
    
    // Linee principali
    selectedMetrics.forEach(metric => {
      const option = metricOptions.find(opt => opt.key === metric);
      if (option) {
        lines.push(
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={option.color}
            strokeWidth={2}
            dot={{ fill: option.color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: option.color, strokeWidth: 2 }}
            name={option.label}
          />
        );
      }
    });

    // Linee di confronto se abilitate
    if (showComparison && comparisonOrders) {
      selectedMetrics.forEach(metric => {
        const option = metricOptions.find(opt => opt.key === metric);
        if (option) {
          lines.push(
            <Line
              key={`comparison-${metric}`}
              type="monotone"
              dataKey={`comparison${metric.charAt(0).toUpperCase() + metric.slice(1)}`}
              stroke={option.color}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: option.color, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: option.color, strokeWidth: 2 }}
              name={`${option.label} (Confronto)`}
            />
          );
        }
      });
    }

    return lines;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Grafico Vendite {isSingleDay ? '(Per Ore)' : '(Per Giorni)'}</span>
          <div className="flex items-center gap-2">
            {comparisonOrders && (
              <Button
                variant={showComparison ? "default" : "outline"}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? "Nascondi" : "Mostra"} Confronto
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          {isSingleDay 
            ? `Dettaglio vendite per ora del ${format(startDate, 'dd/MM/yyyy', { locale: it })}`
            : `Andamento vendite dal ${format(startDate, 'dd/MM/yyyy', { locale: it })} al ${format(endDate, 'dd/MM/yyyy', { locale: it })}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Controlli metriche */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(Array.isArray(metricOptions) ? metricOptions : []).map(option => (
            <Button
              key={option.key}
              variant={selectedMetrics.includes(option.key) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleMetric(option.key)}
              style={{ 
                backgroundColor: selectedMetrics.includes(option.key) ? option.color : 'transparent',
                borderColor: option.color,
                color: selectedMetrics.includes(option.key) ? 'white' : option.color
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Grafico */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval={isSingleDay ? 2 : 0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {generateChartLines()}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalProducts.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Prodotti Totali</div>
            {comparisonStats && (
              <div className="text-xs text-gray-500">
                vs {comparisonStats.totalProducts.toFixed(0)} ({calculateChange(stats.totalProducts, comparisonStats.totalProducts).toFixed(1)}%)
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(stats.totalRevenue)}
            </div>
            <div className="text-sm text-gray-600">Fatturato Totale</div>
            {comparisonStats && (
              <div className="text-xs text-gray-500">
                vs {formatPrice(comparisonStats.totalRevenue)} ({calculateChange(stats.totalRevenue, comparisonStats.totalRevenue).toFixed(1)}%)
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalOrders}
            </div>
            <div className="text-sm text-gray-600">Ordini Totali</div>
            {comparisonStats && (
              <div className="text-xs text-gray-500">
                vs {comparisonStats.totalOrders} ({calculateChange(stats.totalOrders, comparisonStats.totalOrders).toFixed(1)}%)
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.avgProductsPerOrder.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Media Articoli/Ordine</div>
            {comparisonStats && (
              <div className="text-xs text-gray-500">
                vs {comparisonStats.avgProductsPerOrder.toFixed(1)} ({calculateChange(stats.avgProductsPerOrder, comparisonStats.avgProductsPerOrder).toFixed(1)}%)
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesChart; 