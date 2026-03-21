import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart 
} from 'recharts';
import { 
  RefreshCw, Upload, Download, TrendingUp, TrendingDown, DollarSign, Target, 
  Users, ShoppingCart, Percent, Calendar, Filter, Search, Plus, Trash2, Edit2,
  FileSpreadsheet, CheckCircle, AlertCircle, X, Eye, EyeOff, BarChart3,
  Activity, Zap, Globe, Smartphone, Monitor, ChevronDown, ChevronRight,
  ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import Button from '../components/ui/button';
import DateRangePicker from '../components/DateRangePicker';
import { saveMetricheMarketingData, loadMetricheMarketingData } from '../lib/magazzinoStorage';

const PIATTAFORME = {
  google_ads: { 
    name: 'Google Ads', 
    color: '#4285F4', 
    icon: Globe,
    gradient: 'from-blue-500 to-blue-600'
  },
  meta: { 
    name: 'Meta Ads', 
    color: '#1877F2', 
    icon: Smartphone,
    gradient: 'from-indigo-500 to-purple-600'
  },
  tiktok: { 
    name: 'TikTok Ads', 
    color: '#000000', 
    icon: Monitor,
    gradient: 'from-gray-800 to-black'
  }
};

const MESI_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const MarketingPage = () => {
  // === STATI PRINCIPALI ===
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualMetrics, setManualMetrics] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // === STATI FILTRI ===
  const [selectedDateRange, setSelectedDateRange] = useState('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  
  // === STATI IMPORT CSV ===
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPlatform, setImportPlatform] = useState('google_ads');
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvMapping, setCsvMapping] = useState({});
  const [importStep, setImportStep] = useState(1);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const fileInputRef = useRef(null);
  
  // === STATI FORM MANUALE ===
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [manualFormData, setManualFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    platform: 'google_ads',
    spent: '',
    impressions: '',
    clicks: '',
    conversions: '',
    revenue: '',
    campaignName: ''
  });

  // === CARICAMENTO DATI ===
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carica ordini
      const savedOrders = localStorage.getItem('shopify_orders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
      
      // Carica metriche marketing
      const savedMetrics = localStorage.getItem('marketing_metrics');
      if (savedMetrics) {
        setManualMetrics(JSON.parse(savedMetrics));
      } else {
        // Fallback al vecchio formato
        const oldMetrics = localStorage.getItem('manualMetrics');
        if (oldMetrics) {
          const parsed = JSON.parse(oldMetrics);
          // Converti vecchio formato in nuovo
          const converted = convertOldMetrics(parsed);
          setManualMetrics(converted);
          localStorage.setItem('marketing_metrics', JSON.stringify(converted));
        }
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  // Converti vecchio formato metriche
  const convertOldMetrics = (oldMetrics) => {
    const newMetrics = [];
    oldMetrics.forEach(week => {
      const weekStart = new Date(week.weekStart);
      
      // Crea una metrica per ogni piattaforma per ogni giorno della settimana
      ['googleAds', 'meta', 'tiktok'].forEach(platform => {
        const platformKey = platform === 'googleAds' ? 'google_ads' : platform;
        if (week[platform] && week[platform].spent > 0) {
          newMetrics.push({
            id: `${week.weekStart}_${platformKey}`,
            date: week.weekStart,
            platform: platformKey,
            spent: week[platform].spent,
            impressions: week[platform].impressions || 0,
            clicks: week[platform].clicks || 0,
            conversions: week[platform].conversions || 0,
            revenue: week.shopifyRevenue ? week.shopifyRevenue / 3 : 0,
            cpa: week[platform].cpa || 0,
            roas: week[platform].roas || 0,
            campaignName: 'Importato da vecchio formato'
          });
        }
      });
    });
    return newMetrics;
  };

  // === CALCOLO DATE ===
  const getDateRange = useMemo(() => {
    const now = new Date();
    let startDate, endDate = new Date(now);
    
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
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = customEndDate ? new Date(customEndDate) : now;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { startDate, endDate };
  }, [selectedDateRange, customStartDate, customEndDate]);

  // === METRICHE FILTRATE ===
  const filteredMetrics = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    return manualMetrics.filter(m => {
      const date = new Date(m.date);
      const inRange = date >= startDate && date <= endDate;
      const platformMatch = selectedPlatform === 'all' || m.platform === selectedPlatform;
      return inRange && platformMatch;
    });
  }, [manualMetrics, getDateRange, selectedPlatform]);

  // === METRICHE PERIODO PRECEDENTE ===
  const previousPeriodMetrics = useMemo(() => {
    if (!comparisonEnabled) return [];
    
    const { startDate, endDate } = getDateRange;
    const duration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - duration);
    const prevEnd = new Date(startDate.getTime());
    
    return manualMetrics.filter(m => {
      const date = new Date(m.date);
      const inRange = date >= prevStart && date < prevEnd;
      const platformMatch = selectedPlatform === 'all' || m.platform === selectedPlatform;
      return inRange && platformMatch;
    });
  }, [manualMetrics, getDateRange, selectedPlatform, comparisonEnabled]);

  // === CALCOLO KPI ===
  const kpiData = useMemo(() => {
    const current = {
      spent: filteredMetrics.reduce((sum, m) => sum + (parseFloat(m.spent) || 0), 0),
      impressions: filteredMetrics.reduce((sum, m) => sum + (parseFloat(m.impressions) || 0), 0),
      clicks: filteredMetrics.reduce((sum, m) => sum + (parseFloat(m.clicks) || 0), 0),
      conversions: filteredMetrics.reduce((sum, m) => sum + (parseFloat(m.conversions) || 0), 0),
      revenue: filteredMetrics.reduce((sum, m) => sum + (parseFloat(m.revenue) || 0), 0)
    };
    
    current.ctr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;
    current.cpc = current.clicks > 0 ? current.spent / current.clicks : 0;
    current.cpa = current.conversions > 0 ? current.spent / current.conversions : 0;
    current.roas = current.spent > 0 ? current.revenue / current.spent : 0;
    current.conversionRate = current.clicks > 0 ? (current.conversions / current.clicks) * 100 : 0;
    
    const previous = {
      spent: previousPeriodMetrics.reduce((sum, m) => sum + (parseFloat(m.spent) || 0), 0),
      impressions: previousPeriodMetrics.reduce((sum, m) => sum + (parseFloat(m.impressions) || 0), 0),
      clicks: previousPeriodMetrics.reduce((sum, m) => sum + (parseFloat(m.clicks) || 0), 0),
      conversions: previousPeriodMetrics.reduce((sum, m) => sum + (parseFloat(m.conversions) || 0), 0),
      revenue: previousPeriodMetrics.reduce((sum, m) => sum + (parseFloat(m.revenue) || 0), 0)
    };
    
    previous.ctr = previous.impressions > 0 ? (previous.clicks / previous.impressions) * 100 : 0;
    previous.cpc = previous.clicks > 0 ? previous.spent / previous.clicks : 0;
    previous.cpa = previous.conversions > 0 ? previous.spent / previous.conversions : 0;
    previous.roas = previous.spent > 0 ? previous.revenue / previous.spent : 0;
    
    const calcChange = (curr, prev) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    
    return {
      current,
      previous,
      changes: {
        spent: calcChange(current.spent, previous.spent),
        impressions: calcChange(current.impressions, previous.impressions),
        clicks: calcChange(current.clicks, previous.clicks),
        conversions: calcChange(current.conversions, previous.conversions),
        revenue: calcChange(current.revenue, previous.revenue),
        ctr: calcChange(current.ctr, previous.ctr),
        cpc: calcChange(current.cpc, previous.cpc),
        cpa: calcChange(current.cpa, previous.cpa),
        roas: calcChange(current.roas, previous.roas)
      }
    };
  }, [filteredMetrics, previousPeriodMetrics]);

  // === KPI PER PIATTAFORMA ===
  const platformKpis = useMemo(() => {
    const platforms = {};
    
    Object.keys(PIATTAFORME).forEach(platform => {
      const metrics = filteredMetrics.filter(m => m.platform === platform);
      const spent = metrics.reduce((sum, m) => sum + (parseFloat(m.spent) || 0), 0);
      const impressions = metrics.reduce((sum, m) => sum + (parseFloat(m.impressions) || 0), 0);
      const clicks = metrics.reduce((sum, m) => sum + (parseFloat(m.clicks) || 0), 0);
      const conversions = metrics.reduce((sum, m) => sum + (parseFloat(m.conversions) || 0), 0);
      const revenue = metrics.reduce((sum, m) => sum + (parseFloat(m.revenue) || 0), 0);
      
      platforms[platform] = {
        spent,
        impressions,
        clicks,
        conversions,
        revenue,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spent / clicks : 0,
        cpa: conversions > 0 ? spent / conversions : 0,
        roas: spent > 0 ? revenue / spent : 0,
        count: metrics.length
      };
    });
    
    return platforms;
  }, [filteredMetrics]);

  // === DATI GRAFICI ===
  const chartData = useMemo(() => {
    // Raggruppa per data
    const byDate = {};
    
    filteredMetrics.forEach(m => {
      const dateKey = m.date;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          dateLabel: new Date(dateKey).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
          spent: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          google_ads: 0,
          meta: 0,
          tiktok: 0
        };
      }
      byDate[dateKey].spent += parseFloat(m.spent) || 0;
      byDate[dateKey].impressions += parseFloat(m.impressions) || 0;
      byDate[dateKey].clicks += parseFloat(m.clicks) || 0;
      byDate[dateKey].conversions += parseFloat(m.conversions) || 0;
      byDate[dateKey].revenue += parseFloat(m.revenue) || 0;
      byDate[dateKey][m.platform] += parseFloat(m.spent) || 0;
    });
    
    return Object.values(byDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        ...d,
        cpa: d.conversions > 0 ? d.spent / d.conversions : 0,
        roas: d.spent > 0 ? d.revenue / d.spent : 0,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0
      }));
  }, [filteredMetrics]);

  // === DATI PIE CHART ===
  const pieData = useMemo(() => {
    return Object.entries(platformKpis)
      .filter(([_, data]) => data.spent > 0)
      .map(([platform, data]) => ({
        name: PIATTAFORME[platform].name,
        value: data.spent,
        color: PIATTAFORME[platform].color,
        conversions: data.conversions,
        revenue: data.revenue
      }));
  }, [platformKpis]);

  // === FUNZIONI IMPORT CSV ===
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      alert('Il file CSV deve contenere almeno un header e una riga di dati');
      return;
    }
    
    // Parse header - gestisce sia virgole che punto e virgola
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = parseCSVLine(lines[0], delimiter);
    
    // Parse data
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], delimiter);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });
        data.push(row);
      }
    }
    
    setCsvHeaders(headers);
    setCsvData(data);
    
    // Auto-mapping intelligente
    const mapping = autoMapColumns(headers, importPlatform);
    setCsvMapping(mapping);
    setImportStep(2);
  };

  const parseCSVLine = (line, delimiter = ',') => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  const autoMapColumns = (headers, platform) => {
    const mapping = {
      date: null,
      spent: null,
      impressions: null,
      clicks: null,
      conversions: null,
      revenue: null,
      campaignName: null
    };
    
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Pattern di mapping per ogni campo
    const patterns = {
      date: ['date', 'data', 'day', 'giorno', 'periodo', 'period', 'reporting date'],
      spent: ['cost', 'costo', 'spend', 'spesa', 'amount spent', 'importo speso', 'budget', 'cost (eur)', 'costo (eur)'],
      impressions: ['impressions', 'impressioni', 'impr', 'views', 'visualizzazioni'],
      clicks: ['clicks', 'click', 'clic', 'link clicks', 'link click'],
      conversions: ['conversions', 'conversioni', 'conv', 'purchase', 'purchases', 'acquisti', 'results', 'risultati'],
      revenue: ['revenue', 'ricavi', 'fatturato', 'conversion value', 'valore conversioni', 'purchase value', 'sales'],
      campaignName: ['campaign', 'campagna', 'campaign name', 'nome campagna', 'ad name', 'nome annuncio']
    };
    
    // Trova match per ogni campo
    Object.entries(patterns).forEach(([field, fieldPatterns]) => {
      for (let i = 0; i < normalizedHeaders.length; i++) {
        const header = normalizedHeaders[i];
        if (fieldPatterns.some(p => header.includes(p))) {
          mapping[field] = headers[i];
          break;
        }
      }
    });
    
    return mapping;
  };

  const handleImportConfirm = async () => {
    setImportLoading(true);
    
    try {
      const newMetrics = csvData.map((row, idx) => {
        // Parse date
        let date = new Date().toISOString().slice(0, 10);
        if (csvMapping.date && row[csvMapping.date]) {
          const parsedDate = parseDate(row[csvMapping.date]);
          if (parsedDate) date = parsedDate;
        }
        
        // Parse numeric values
        const parseNum = (val) => {
          if (!val) return 0;
          const cleaned = val.toString().replace(/[€$,\s]/g, '').replace(',', '.');
          return parseFloat(cleaned) || 0;
        };
        
        return {
          id: `import_${Date.now()}_${idx}`,
          date,
          platform: importPlatform,
          spent: parseNum(row[csvMapping.spent]),
          impressions: parseNum(row[csvMapping.impressions]),
          clicks: parseNum(row[csvMapping.clicks]),
          conversions: parseNum(row[csvMapping.conversions]),
          revenue: parseNum(row[csvMapping.revenue]),
          campaignName: row[csvMapping.campaignName] || `Import ${PIATTAFORME[importPlatform].name}`,
          importedAt: new Date().toISOString()
        };
      });
      
      // Aggiungi alle metriche esistenti
      const updatedMetrics = [...manualMetrics, ...newMetrics];
      setManualMetrics(updatedMetrics);
      localStorage.setItem('marketing_metrics', JSON.stringify(updatedMetrics));
      
      // Reset modal
      setShowImportModal(false);
      setImportStep(1);
      setCsvData([]);
      setCsvHeaders([]);
      setCsvMapping({});
      
      alert(`Importate ${newMetrics.length} metriche da ${PIATTAFORME[importPlatform].name}`);
    } catch (error) {
      console.error('Errore import:', error);
      alert('Errore durante l\'importazione: ' + error.message);
    } finally {
      setImportLoading(false);
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Prova diversi formati
    const formats = [
      // ISO
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // DD/MM/YYYY
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      // MM/DD/YYYY
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/,
      // YYYY/MM/DD
      /^(\d{4})\/(\d{2})\/(\d{2})$/
    ];
    
    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.slice(0, 10);
    }
    
    // DD/MM/YYYY o DD-MM-YYYY
    const euMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (euMatch) {
      const day = euMatch[1].padStart(2, '0');
      const month = euMatch[2].padStart(2, '0');
      const year = euMatch[3];
      return `${year}-${month}-${day}`;
    }
    
    // Prova Date.parse
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    
    return null;
  };

  // === FUNZIONI FORM MANUALE ===
  const handleManualSave = () => {
    const metric = {
      id: editingMetric?.id || `manual_${Date.now()}`,
      ...manualFormData,
      spent: parseFloat(manualFormData.spent) || 0,
      impressions: parseFloat(manualFormData.impressions) || 0,
      clicks: parseFloat(manualFormData.clicks) || 0,
      conversions: parseFloat(manualFormData.conversions) || 0,
      revenue: parseFloat(manualFormData.revenue) || 0,
      createdAt: editingMetric?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    let updatedMetrics;
    if (editingMetric) {
      updatedMetrics = manualMetrics.map(m => m.id === editingMetric.id ? metric : m);
    } else {
      updatedMetrics = [...manualMetrics, metric];
    }
    
    setManualMetrics(updatedMetrics);
    localStorage.setItem('marketing_metrics', JSON.stringify(updatedMetrics));
    
    setShowManualForm(false);
    setEditingMetric(null);
    setManualFormData({
      date: new Date().toISOString().slice(0, 10),
      platform: 'google_ads',
      spent: '',
      impressions: '',
      clicks: '',
      conversions: '',
      revenue: '',
      campaignName: ''
    });
  };

  const handleDeleteMetric = (id) => {
    if (!window.confirm('Eliminare questa metrica?')) return;
    
    const updatedMetrics = manualMetrics.filter(m => m.id !== id);
    setManualMetrics(updatedMetrics);
    localStorage.setItem('marketing_metrics', JSON.stringify(updatedMetrics));
  };

  const handleEditMetric = (metric) => {
    setEditingMetric(metric);
    setManualFormData({
      date: metric.date,
      platform: metric.platform,
      spent: metric.spent.toString(),
      impressions: metric.impressions.toString(),
      clicks: metric.clicks.toString(),
      conversions: metric.conversions.toString(),
      revenue: metric.revenue.toString(),
      campaignName: metric.campaignName || ''
    });
    setShowManualForm(true);
  };

  // === EXPORT CSV ===
  const handleExport = () => {
    const headers = ['Data', 'Piattaforma', 'Campagna', 'Spesa', 'Impressioni', 'Click', 'CTR%', 'CPC', 'Conversioni', 'Ricavi', 'CPA', 'ROAS'];
    const rows = filteredMetrics.map(m => [
      m.date,
      PIATTAFORME[m.platform]?.name || m.platform,
      m.campaignName || '',
      m.spent.toFixed(2),
      m.impressions,
      m.clicks,
      m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : '0',
      m.clicks > 0 ? (m.spent / m.clicks).toFixed(2) : '0',
      m.conversions,
      m.revenue.toFixed(2),
      m.conversions > 0 ? (m.spent / m.conversions).toFixed(2) : '0',
      m.spent > 0 ? (m.revenue / m.spent).toFixed(2) : '0'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marketing_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // === RENDER ===
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento dati marketing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-blue-600" />
                Marketing Analytics
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {getDateRange.startDate.toLocaleDateString('it-IT')} - {getDateRange.endDate.toLocaleDateString('it-IT')}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowImportModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importa CSV
              </Button>
              <Button 
                onClick={() => setShowManualForm(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Manuale
              </Button>
              <Button 
                onClick={handleExport}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Esporta
              </Button>
              <Button 
                onClick={loadData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* TABS */}
          <div className="flex gap-1 border-b -mb-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'piattaforme', label: 'Per Piattaforma', icon: Globe },
              { id: 'storico', label: 'Storico Metriche', icon: Calendar },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* FILTRI */}
        <div className="px-6 py-3 bg-gray-50 border-t flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtri:</span>
          </div>
          
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="last_7_days">Ultimi 7 giorni</option>
            <option value="last_30_days">Ultimi 30 giorni</option>
            <option value="last_90_days">Ultimi 90 giorni</option>
            <option value="this_month">Questo mese</option>
            <option value="this_year">Quest'anno</option>
            <option value="custom">Personalizzato</option>
          </select>
          
          {selectedDateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              />
            </div>
          )}
          
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tutte le Piattaforme</option>
            {Object.entries(PIATTAFORME).map(([key, platform]) => (
              <option key={key} value={key}>{platform.name}</option>
            ))}
          </select>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={comparisonEnabled}
              onChange={(e) => setComparisonEnabled(e.target.checked)}
              className="rounded text-blue-600"
            />
            Confronta con periodo precedente
          </label>
        </div>
      </div>

      {/* CONTENUTO PRINCIPALE */}
      <div className="p-6">
        {/* TAB DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Spesa */}
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-blue-100 text-xs font-medium">Spesa Totale</p>
                      <p className="text-2xl font-bold mt-1">
                        €{kpiData.current.spent.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-200" />
                  </div>
                  {comparisonEnabled && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      kpiData.changes.spent >= 0 ? 'text-blue-200' : 'text-green-200'
                    }`}>
                      {kpiData.changes.spent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpiData.changes.spent).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Impressioni */}
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-purple-100 text-xs font-medium">Impressioni</p>
                      <p className="text-2xl font-bold mt-1">
                        {kpiData.current.impressions >= 1000000 
                          ? `${(kpiData.current.impressions / 1000000).toFixed(1)}M`
                          : kpiData.current.impressions >= 1000
                            ? `${(kpiData.current.impressions / 1000).toFixed(1)}K`
                            : kpiData.current.impressions.toLocaleString('it-IT')}
                      </p>
                    </div>
                    <Eye className="w-8 h-8 text-purple-200" />
                  </div>
                  {comparisonEnabled && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      kpiData.changes.impressions >= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {kpiData.changes.impressions >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpiData.changes.impressions).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Click */}
              <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-cyan-100 text-xs font-medium">Click</p>
                      <p className="text-2xl font-bold mt-1">
                        {kpiData.current.clicks.toLocaleString('it-IT')}
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-cyan-200" />
                  </div>
                  {comparisonEnabled && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      kpiData.changes.clicks >= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {kpiData.changes.clicks >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpiData.changes.clicks).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Conversioni */}
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-green-100 text-xs font-medium">Conversioni</p>
                      <p className="text-2xl font-bold mt-1">
                        {kpiData.current.conversions.toLocaleString('it-IT')}
                      </p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-green-200" />
                  </div>
                  {comparisonEnabled && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      kpiData.changes.conversions >= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {kpiData.changes.conversions >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpiData.changes.conversions).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* CPA */}
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-orange-100 text-xs font-medium">CPA</p>
                      <p className="text-2xl font-bold mt-1">
                        €{kpiData.current.cpa.toFixed(2)}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-orange-200" />
                  </div>
                  {comparisonEnabled && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      kpiData.changes.cpa <= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {kpiData.changes.cpa >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpiData.changes.cpa).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* ROAS */}
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-emerald-100 text-xs font-medium">ROAS</p>
                      <p className="text-2xl font-bold mt-1">
                        {kpiData.current.roas.toFixed(2)}x
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-200" />
                  </div>
                  {comparisonEnabled && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      kpiData.changes.roas >= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {kpiData.changes.roas >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpiData.changes.roas).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* GRAFICI PRINCIPALI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Andamento Spesa */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Andamento Spesa Marketing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} />
                        <Tooltip 
                          formatter={(v) => [`€${v.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`, 'Spesa']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="spent" 
                          stroke="#3B82F6" 
                          fillOpacity={1} 
                          fill="url(#colorSpent)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      Nessun dato disponibile per il periodo selezionato
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Distribuzione per Piattaforma */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-600" />
                    Distribuzione Spesa per Piattaforma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(v) => [`€${v.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`, 'Spesa']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Andamento ROAS e CPA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    ROAS e CPA nel Tempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={v => `${v}x`} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        />
                        <Legend />
                        <Bar yAxisId="right" dataKey="cpa" name="CPA (€)" fill="#F97316" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="left" type="monotone" dataKey="roas" name="ROAS (x)" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Spesa per Piattaforma nel Tempo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Spesa per Piattaforma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} />
                        <Tooltip 
                          formatter={(v) => [`€${v.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`, '']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        />
                        <Legend />
                        <Bar dataKey="google_ads" name="Google Ads" fill="#4285F4" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="meta" name="Meta" fill="#1877F2" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="tiktok" name="TikTok" fill="#000000" stackId="a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* METRICHE DETTAGLIATE */}
            <Card>
              <CardHeader>
                <CardTitle>Metriche Dettagliate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">CTR</p>
                    <p className="text-xl font-bold text-gray-900">{kpiData.current.ctr.toFixed(2)}%</p>
                    {comparisonEnabled && kpiData.previous.ctr > 0 && (
                      <p className={`text-xs ${kpiData.changes.ctr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpiData.changes.ctr >= 0 ? '+' : ''}{kpiData.changes.ctr.toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">CPC</p>
                    <p className="text-xl font-bold text-gray-900">€{kpiData.current.cpc.toFixed(2)}</p>
                    {comparisonEnabled && kpiData.previous.cpc > 0 && (
                      <p className={`text-xs ${kpiData.changes.cpc <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpiData.changes.cpc >= 0 ? '+' : ''}{kpiData.changes.cpc.toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">Conv. Rate</p>
                    <p className="text-xl font-bold text-gray-900">{kpiData.current.conversionRate.toFixed(2)}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">Ricavi Totali</p>
                    <p className="text-xl font-bold text-gray-900">€{kpiData.current.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</p>
                    {comparisonEnabled && kpiData.previous.revenue > 0 && (
                      <p className={`text-xs ${kpiData.changes.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpiData.changes.revenue >= 0 ? '+' : ''}{kpiData.changes.revenue.toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">Profitto Netto</p>
                    <p className={`text-xl font-bold ${(kpiData.current.revenue - kpiData.current.spent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{(kpiData.current.revenue - kpiData.current.spent).toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">N° Metriche</p>
                    <p className="text-xl font-bold text-gray-900">{filteredMetrics.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB PIATTAFORME */}
        {activeTab === 'piattaforme' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(PIATTAFORME).map(([key, platform]) => {
                const data = platformKpis[key];
                const Icon = platform.icon;
                
                return (
                  <Card key={key} className="overflow-hidden">
                    <div className={`bg-gradient-to-r ${platform.gradient} p-4 text-white`}>
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{platform.name}</h3>
                          <p className="text-sm opacity-80">{data.count} metriche</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Spesa</p>
                          <p className="text-lg font-bold">€{data.spent.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Ricavi</p>
                          <p className="text-lg font-bold">€{data.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Conversioni</p>
                          <p className="text-lg font-bold">{data.conversions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Click</p>
                          <p className="text-lg font-bold">{data.clicks.toLocaleString('it-IT')}</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-gray-500">ROAS</p>
                          <p className={`text-sm font-bold ${data.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.roas.toFixed(2)}x
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">CPA</p>
                          <p className="text-sm font-bold">€{data.cpa.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">CTR</p>
                          <p className="text-sm font-bold">{data.ctr.toFixed(2)}%</p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          setImportPlatform(key);
                          setShowImportModal(true);
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Importa CSV {platform.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB STORICO */}
        {activeTab === 'storico' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Storico Metriche Marketing</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Esporta
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Data</th>
                        <th className="text-left p-3 font-medium">Piattaforma</th>
                        <th className="text-left p-3 font-medium">Campagna</th>
                        <th className="text-right p-3 font-medium">Spesa</th>
                        <th className="text-right p-3 font-medium">Impressioni</th>
                        <th className="text-right p-3 font-medium">Click</th>
                        <th className="text-right p-3 font-medium">CTR</th>
                        <th className="text-right p-3 font-medium">Conv.</th>
                        <th className="text-right p-3 font-medium">CPA</th>
                        <th className="text-right p-3 font-medium">Ricavi</th>
                        <th className="text-right p-3 font-medium">ROAS</th>
                        <th className="text-center p-3 font-medium">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMetrics.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="text-center py-12 text-gray-500">
                            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Nessuna metrica trovata</p>
                            <p className="text-sm">Importa dati CSV o aggiungi metriche manualmente</p>
                          </td>
                        </tr>
                      ) : (
                        filteredMetrics
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((metric) => {
                            const ctr = metric.impressions > 0 ? (metric.clicks / metric.impressions) * 100 : 0;
                            const cpa = metric.conversions > 0 ? metric.spent / metric.conversions : 0;
                            const roas = metric.spent > 0 ? metric.revenue / metric.spent : 0;
                            
                            return (
                              <tr key={metric.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{new Date(metric.date).toLocaleDateString('it-IT')}</td>
                                <td className="p-3">
                                  <span 
                                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: PIATTAFORME[metric.platform]?.color || '#666' }}
                                  >
                                    {PIATTAFORME[metric.platform]?.name || metric.platform}
                                  </span>
                                </td>
                                <td className="p-3 max-w-[150px] truncate" title={metric.campaignName}>
                                  {metric.campaignName || '-'}
                                </td>
                                <td className="p-3 text-right font-medium">€{metric.spent.toFixed(2)}</td>
                                <td className="p-3 text-right">{metric.impressions.toLocaleString('it-IT')}</td>
                                <td className="p-3 text-right">{metric.clicks.toLocaleString('it-IT')}</td>
                                <td className="p-3 text-right">{ctr.toFixed(2)}%</td>
                                <td className="p-3 text-right">{metric.conversions}</td>
                                <td className="p-3 text-right">€{cpa.toFixed(2)}</td>
                                <td className="p-3 text-right font-medium">€{metric.revenue.toFixed(2)}</td>
                                <td className={`p-3 text-right font-bold ${roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                  {roas.toFixed(2)}x
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex justify-center gap-1">
                                    <button
                                      onClick={() => handleEditMetric(metric)}
                                      className="p-1 hover:bg-blue-100 rounded"
                                      title="Modifica"
                                    >
                                      <Edit2 className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMetric(metric.id)}
                                      className="p-1 hover:bg-red-100 rounded"
                                      title="Elimina"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {filteredMetrics.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-gray-600">
                    <span>Totale: {filteredMetrics.length} metriche</span>
                    <span>
                      Spesa totale: €{kpiData.current.spent.toLocaleString('it-IT', { maximumFractionDigits: 2 })} | 
                      Ricavi totali: €{kpiData.current.revenue.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL IMPORT CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${PIATTAFORME[importPlatform].gradient} text-white p-6`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Importa CSV {PIATTAFORME[importPlatform].name}</h2>
                    <p className="text-sm opacity-80">Step {importStep} di 3</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportStep(1);
                    setCsvData([]);
                    setCsvHeaders([]);
                    setCsvMapping({});
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Step 1: Selezione Piattaforma e Upload */}
              {importStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleziona Piattaforma
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(PIATTAFORME).map(([key, platform]) => {
                        const Icon = platform.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => setImportPlatform(key)}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              importPlatform === key 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="w-8 h-8 mx-auto mb-2" style={{ color: platform.color }} />
                            <p className="font-medium">{platform.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Carica File CSV
                    </label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        Clicca o trascina il file CSV qui
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Supporta CSV esportati da {PIATTAFORME[importPlatform].name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Colonne attese per {PIATTAFORME[importPlatform].name}:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>Data</strong>: Date, Day, Giorno, Periodo</li>
                      <li>• <strong>Spesa</strong>: Cost, Spend, Costo, Amount spent</li>
                      <li>• <strong>Impressioni</strong>: Impressions, Impressioni, Views</li>
                      <li>• <strong>Click</strong>: Clicks, Click, Link clicks</li>
                      <li>• <strong>Conversioni</strong>: Conversions, Purchases, Results</li>
                      <li>• <strong>Ricavi</strong>: Revenue, Conversion value, Purchase value</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Step 2: Mapping Colonne */}
              {importStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">File caricato con successo!</p>
                      <p className="text-sm text-green-700">{csvData.length} righe trovate, {csvHeaders.length} colonne</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Mappa le colonne del CSV</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'date', label: 'Data', required: true },
                        { key: 'spent', label: 'Spesa', required: true },
                        { key: 'impressions', label: 'Impressioni', required: false },
                        { key: 'clicks', label: 'Click', required: false },
                        { key: 'conversions', label: 'Conversioni', required: false },
                        { key: 'revenue', label: 'Ricavi', required: false },
                        { key: 'campaignName', label: 'Nome Campagna', required: false }
                      ].map(field => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={csvMapping[field.key] || ''}
                            onChange={(e) => setCsvMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              csvMapping[field.key] ? 'border-green-500 bg-green-50' : 'border-gray-300'
                            }`}
                          >
                            <option value="">-- Seleziona colonna --</option>
                            {csvHeaders.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Anteprima dati (prime 5 righe)</h4>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            {csvHeaders.slice(0, 8).map(header => (
                              <th key={header} className="p-2 text-left font-medium">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {csvHeaders.slice(0, 8).map(header => (
                                <td key={header} className="p-2">{row[header]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button 
                      onClick={() => setImportStep(1)}
                      variant="outline"
                    >
                      Indietro
                    </Button>
                    <Button 
                      onClick={() => setImportStep(3)}
                      disabled={!csvMapping.date || !csvMapping.spent}
                      className="bg-blue-600 text-white"
                    >
                      Continua
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Step 3: Conferma Import */}
              {importStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">Riepilogo Importazione</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Piattaforma:</span>
                        <span className="ml-2 font-medium">{PIATTAFORME[importPlatform].name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Righe da importare:</span>
                        <span className="ml-2 font-medium">{csvData.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Colonna Data:</span>
                        <span className="ml-2 font-medium">{csvMapping.date}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Colonna Spesa:</span>
                        <span className="ml-2 font-medium">{csvMapping.spent}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button 
                      onClick={() => setImportStep(2)}
                      variant="outline"
                    >
                      Indietro
                    </Button>
                    <Button 
                      onClick={handleImportConfirm}
                      disabled={importLoading}
                      className="bg-green-600 text-white"
                    >
                      {importLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importazione...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Conferma Importazione
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM MANUALE */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {editingMetric ? 'Modifica Metrica' : 'Aggiungi Metrica Manuale'}
                </h2>
                <button
                  onClick={() => {
                    setShowManualForm(false);
                    setEditingMetric(null);
                    setManualFormData({
                      date: new Date().toISOString().slice(0, 10),
                      platform: 'google_ads',
                      spent: '',
                      impressions: '',
                      clicks: '',
                      conversions: '',
                      revenue: '',
                      campaignName: ''
                    });
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={manualFormData.date}
                    onChange={(e) => setManualFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Piattaforma</label>
                  <select
                    value={manualFormData.platform}
                    onChange={(e) => setManualFormData(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {Object.entries(PIATTAFORME).map(([key, platform]) => (
                      <option key={key} value={key}>{platform.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Campagna</label>
                <input
                  type="text"
                  value={manualFormData.campaignName}
                  onChange={(e) => setManualFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                  placeholder="es. Brand Campaign Q1"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spesa (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualFormData.spent}
                    onChange={(e) => setManualFormData(prev => ({ ...prev, spent: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ricavi (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualFormData.revenue}
                    onChange={(e) => setManualFormData(prev => ({ ...prev, revenue: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impressioni</label>
                  <input
                    type="number"
                    value={manualFormData.impressions}
                    onChange={(e) => setManualFormData(prev => ({ ...prev, impressions: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Click</label>
                  <input
                    type="number"
                    value={manualFormData.clicks}
                    onChange={(e) => setManualFormData(prev => ({ ...prev, clicks: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conversioni</label>
                  <input
                    type="number"
                    value={manualFormData.conversions}
                    onChange={(e) => setManualFormData(prev => ({ ...prev, conversions: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  onClick={() => {
                    setShowManualForm(false);
                    setEditingMetric(null);
                  }}
                  variant="outline"
                >
                  Annulla
                </Button>
                <Button 
                  onClick={handleManualSave}
                  className="bg-blue-600 text-white"
                >
                  {editingMetric ? 'Salva Modifiche' : 'Aggiungi Metrica'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingPage;
