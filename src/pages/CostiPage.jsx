import React, { useState, useEffect } from 'react';
import { DollarSign, Truck, TrendingUp, Upload, FileText, Calendar, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import DateRangePicker from '../components/DateRangePicker';
import { safeToLowerCase, safeIncludes } from '../lib/utils';

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
}

const CostiPage = () => {
  const [selectedDateRange, setSelectedDateRange] = useState('last_7_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [marketingCost, setMarketingCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);
  
  // Stati per OCR
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [manualInvoice, setManualInvoice] = useState({
    date: '',
    amount: '',
    category: 'altro',
    description: '',
    linkedTo: '', // Nuovo campo per collegamento
    linkedType: 'none', // Tipo di collegamento
    nominativo: '' // Nuovo campo per il nominativo
  });

  // Stato per la lista dei costi
  const [costs, setCosts] = useState([]);

  // Categorie di costo dinamiche
  const [costCategories, setCostCategories] = useState([]);

  // Tipi di collegamento
  const linkTypes = [
    { value: 'none', label: 'Nessun collegamento' },
    { value: 'order', label: 'Ordine Shopify' },
    { value: 'supplier', label: 'Ordine Fornitore' },
    { value: 'product', label: 'Prodotto specifico' },
    { value: 'campaign', label: 'Campagna Marketing' }
  ];

  // Carica ordini Shopify per il dropdown
  const [shopifyOrders, setShopifyOrders] = useState([]);
  const [supplierOrders, setSupplierOrders] = useState([]);
  
  // Stati per i filtri
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterNominativo, setFilterNominativo] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // Nuovo stato per ordinamento

  // Carica i costi dal localStorage all'avvio
  useEffect(() => {
    const allCosts = JSON.parse(localStorage.getItem('costs') || '[]');
    setCosts(allCosts);
  }, []);

  // Carica le categorie di costo dalle impostazioni
  useEffect(() => {
    const loadCostCategories = () => {
      const saved = localStorage.getItem('costCategories');
      if (saved) {
        const categories = JSON.parse(saved);
        setCostCategories(categories);
        // Aggiorna la categoria predefinita nel form manuale
        if (categories.length > 0) {
          setManualInvoice(prev => ({ ...prev, category: categories[0].value }));
        }
      } else {
        // Categorie predefinite se non sono state configurate
        const defaultCategories = [
          { value: 'marketing', label: 'Marketing', color: '#3B82F6' },
          { value: 'logistica', label: 'Logistica/Spedizioni', color: '#10B981' },
          { value: 'personale', label: 'Personale', color: '#8B5CF6' },
          { value: 'affitti', label: 'Affitti/Spese fisse', color: '#F59E0B' },
          { value: 'utilities', label: 'Utilities', color: '#06B6D4' },
          { value: 'altro', label: 'Altro', color: '#6B7280' }
        ];
        setCostCategories(defaultCategories);
      }
    };

    loadCostCategories();
  }, []);

  useEffect(() => {
    // Carica metriche manuali (marketing)
    const savedMetrics = localStorage.getItem('manualMetrics');
    let manualMetrics = [];
    if (savedMetrics) {
      manualMetrics = JSON.parse(savedMetrics);
    }
    // Carica ordini Shopify
    const savedOrders = localStorage.getItem('shopify_orders');
    let orders = [];
    if (savedOrders) {
      orders = JSON.parse(savedOrders);
    }
    
    // Calcola periodo selezionato
    const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
    
    // Filtra metriche per periodo (come in MarketingPage)
    const filteredMetrics = manualMetrics.filter(metric => {
      const metricStartDate = new Date(metric.weekStart);
      const metricEndDate = new Date(metric.weekStart);
      metricEndDate.setDate(metricEndDate.getDate() + 6);
      return metricStartDate <= endDate && metricEndDate >= startDate;
    });
    
    // Somma spese marketing
    const totalMarketing = filteredMetrics.reduce((sum, metric) =>
      sum + (metric.googleAds?.spent || 0) + (metric.meta?.spent || 0) + (metric.tiktok?.spent || 0), 0
    );
    setMarketingCost(totalMarketing);
    
    // Filtra ordini per periodo
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    // Calcola costi spedizione - TUTTI gli ordini (inclusi quelli che hanno pagato la spedizione)
    let totalShipping = 0;
    let ordersWithShipping = 0;
    let ordersWithoutShipping = 0;
    
    filteredOrders.forEach(order => {
      const shippingPaid = order.shippingPrice || 0;
      const shippingType = safeToLowerCase(order.shippingType, '');
      
      // Calcola costo spedizione per TUTTI gli ordini
      if (shippingType.includes('express a domicilio')) {
        totalShipping += COSTO_EXPRESS;
        ordersWithShipping++;
      } else if (shippingType.includes('punto di ritiro')) {
        totalShipping += COSTO_PUNTO_RITIRO;
        ordersWithShipping++;
      } else {
        // Per ordini senza tipo spedizione specifico, usa costo standard
        totalShipping += COSTO_EXPRESS;
        ordersWithShipping++;
      }
    });
    
    setShippingCost(totalShipping);
    
    // Filtra costi manuali e OCR per periodo
    const filteredCosts = costs.filter(cost => {
      const costDate = new Date(cost.date);
      return costDate >= startDate && costDate <= endDate;
    });
    
    // Somma TUTTI i costi manuali e OCR nella sezione "Altri costi"
    const totalOtherCosts = filteredCosts.reduce((sum, cost) => {
      return sum + (parseFloat(cost.amount) || 0);
    }, 0);
    setOtherCosts(totalOtherCosts);
    
  }, [selectedDateRange, customStartDate, customEndDate, costs]);

  useEffect(() => {
    // Carica ordini Shopify per il dropdown
    const savedOrders = localStorage.getItem('shopify_orders');
    if (savedOrders) {
      const orders = JSON.parse(savedOrders);
      setShopifyOrders(orders.slice(0, 50)); // Primi 50 ordini per performance
    }

    // Carica ordini fornitori
    const savedSupplierOrders = localStorage.getItem('supplier_orders');
    if (savedSupplierOrders) {
      const orders = JSON.parse(savedSupplierOrders);
      setSupplierOrders(orders.slice(0, 50));
    }
  }, []);

  // Funzione per gestire il caricamento OCR
  const handleOcrUpload = (file) => {
    if (!file) return;
    
    setOcrLoading(true);
    
    // Simula OCR (versione originale)
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1];
      
      // Simula estrazione dati
      const fileName = safeToLowerCase(file.name, '');
      const fileSize = file.size;
      
      // Estrai data dal nome file o usa oggi
      let extractedDate = '';
      const dateMatch = fileName.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
      if (dateMatch) {
        extractedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      } else {
        const today = new Date();
        extractedDate = today.toISOString().slice(0, 10);
      }
      
      // Simula importo basato su dimensione file
      const baseAmount = Math.floor(fileSize / 1000) + 50;
      const amount = (baseAmount + Math.random() * 100).toFixed(2);
      
      // Simula intestazione
      const intestazioni = [
        'Fornitore ABC SRL',
        'Servizi Digitali Srl', 
        'Marketing Solutions',
        'Agenzia Pubblicitaria XYZ',
        'Google Ads',
        'Meta Advertising',
        'Spedizioni Express'
      ];
      const intestazione = intestazioni[Math.floor(Math.random() * intestazioni.length)];
      
      setOcrResult({
        date: extractedDate,
        amount: parseFloat(amount),
        intestazione,
        description: `Fattura ${file.name}`,
        confidence: 0.8,
        fileData: {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data
        }
      });
      setOcrLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Funzione per scaricare un file
  const downloadFile = (fileData) => {
    if (!fileData || !fileData.data) return;
    
    const link = document.createElement('a');
    link.href = fileData.data;
    link.download = fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Funzione per salvare un costo
  const saveCost = (costData) => {
    const newCost = {
      id: Date.now(),
      ...costData,
      createdAt: new Date().toISOString(),
      nominativo: costData.nominativo || 'Sistema',
      method: costData.method || 'manual',
      fileData: costData.fileData || null
    };

    const existingCosts = JSON.parse(localStorage.getItem('costs') || '[]');
    const updatedCosts = [...existingCosts, newCost];
    localStorage.setItem('costs', JSON.stringify(updatedCosts));
    setCosts(updatedCosts); // Aggiorna la lista nello stato

    // Reset OCR result
    setOcrResult(null);
    
    // Forza il ricalcolo dei costi
    const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
    const filteredCosts = updatedCosts.filter(cost => {
      const costDate = new Date(cost.date);
      return costDate >= startDate && costDate <= endDate;
    });
    
    const totalOtherCosts = filteredCosts.reduce((sum, cost) => {
      if (cost.category !== 'marketing') {
        return sum + (cost.amount || 0);
      }
      return sum;
    }, 0);
    setOtherCosts(totalOtherCosts);

    // Reset form manuale
    setManualInvoice({
      date: '',
      amount: '',
      category: costCategories.length > 0 ? costCategories[0].value : 'altro',
      description: '',
      linkedTo: '',
      linkedType: 'none',
      nominativo: ''
    });
  };

  // Funzione per salvare costo manuale
  const saveManualCost = () => {
    if (!manualInvoice.date || !manualInvoice.amount || !manualInvoice.nominativo) {
      alert('Compila data, importo e nominativo');
      return;
    }

    const costData = {
      date: manualInvoice.date,
      amount: parseFloat(manualInvoice.amount),
      category: manualInvoice.category,
      description: manualInvoice.description,
      linkedTo: manualInvoice.linkedTo,
      linkedType: manualInvoice.linkedType,
      nominativo: manualInvoice.nominativo,
      method: 'manual'
    };

    saveCost(costData);
    alert('Costo manuale salvato con successo!');
  };

  // Funzione per caricare i costi dal localStorage
  const loadCosts = () => {
    return JSON.parse(localStorage.getItem('costs') || '[]');
  };

  // Funzione per filtrare i costi per periodo
  const getFilteredCosts = () => {
    const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
    let filteredCosts = costs.filter(cost => {
      const costDate = new Date(cost.date);
      const dateInRange = costDate >= startDate && costDate <= endDate;
      
      // Filtri aggiuntivi
      const categoryMatch = !filterCategory || cost.category === filterCategory;
      const methodMatch = !filterMethod || cost.method === filterMethod;
      const nominativoMatch = !filterNominativo || 
        safeIncludes(cost.nominativo, filterNominativo);
      const amountMatch = !filterMinAmount || cost.amount >= parseFloat(filterMinAmount);
      
      return dateInRange && categoryMatch && methodMatch && nominativoMatch && amountMatch;
    });
    
    // Ordinamento
    filteredCosts.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.date) - new Date(a.date); // Più recenti prima
        case 'date_asc':
          return new Date(a.date) - new Date(b.date); // Più storici prima
        case 'amount_desc':
          return b.amount - a.amount; // Più costosi prima
        case 'amount_asc':
          return a.amount - b.amount; // Meno costosi prima
        case 'nominativo_asc':
          return a.nominativo.localeCompare(b.nominativo); // Nominativo A-Z
        case 'nominativo_desc':
          return b.nominativo.localeCompare(a.nominativo); // Nominativo Z-A
        case 'category_asc':
          return (a.category || '').localeCompare(b.category || ''); // Categoria A-Z
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });
    
    return filteredCosts;
  };

  // Funzione per calcolare i costi totali per categoria
  const calculateCostsByCategory = () => {
    const costs = getFilteredCosts();
    const totals = {};
    
    // Inizializza tutte le categorie con 0
    costCategories.forEach(cat => {
      totals[cat.value] = 0;
    });

    costs.forEach(cost => {
      if (totals.hasOwnProperty(cost.category)) {
        totals[cost.category] += parseFloat(cost.amount) || 0;
      }
    });

    return totals;
  };

  // Funzione per calcolare il totale generale
  const calculateTotalCosts = () => {
    const costs = getFilteredCosts();
    return costs.reduce((total, cost) => total + (parseFloat(cost.amount) || 0), 0);
  };

  // Ricarica i dati quando cambia il periodo
  useEffect(() => {
    // Forza il re-render quando cambiano i filtri
    const costs = getFilteredCosts();
    console.log('Costi filtrati:', costs.length, 'per il periodo selezionato');
  }, [selectedDateRange, customStartDate, customEndDate]);

  // Funzione per eliminare un costo
  const deleteCost = (costId) => {
    if (window.confirm('Sei sicuro di voler eliminare questo costo?')) {
      const existingCosts = JSON.parse(localStorage.getItem('costs') || '[]');
      const updatedCosts = existingCosts.filter(cost => cost.id !== costId);
      localStorage.setItem('costs', JSON.stringify(updatedCosts));
      setCosts(updatedCosts); // Aggiorna la lista nello stato
      
      // Forza il ricalcolo dei costi
      const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
      const filteredCosts = updatedCosts.filter(cost => {
        const costDate = new Date(cost.date);
        return costDate >= startDate && costDate <= endDate;
      });
      
      const totalOtherCosts = filteredCosts.reduce((sum, cost) => {
        if (cost.category !== 'marketing') {
          return sum + (cost.amount || 0);
        }
        return sum;
      }, 0);
      setOtherCosts(totalOtherCosts);
      
      alert('Costo eliminato con successo!');
    }
  };



  const { startDate, endDate } = getDateRangeFromState(selectedDateRange, customStartDate, customEndDate);
  const totalCosts = marketingCost + shippingCost + otherCosts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analisi Costi</h1>
          <p className="text-muted-foreground">
            Monitoraggio costi e analisi economiche
          </p>
        </div>
      </div>
      
      {/* Selettore periodo */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
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
          />
        )}
        <span className="text-gray-600 ml-4">
          {startDate.toLocaleDateString('it-IT')} – {endDate.toLocaleDateString('it-IT')}
        </span>
      </div>

      {/* Upload fattura OCR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Carica Fattura (OCR)
          </CardTitle>
          <CardDescription>
            Carica una fattura per riconoscimento automatico di data e importo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Carica Fattura (OCR)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleOcrUpload(file);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500">
              Supporta PDF, JPG, JPEG, PNG
            </p>
          </div>
          
          {ocrLoading && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">Analizzando il documento...</p>
            </div>
          )}
          
          {ocrResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Risultati OCR - Conferma Dati:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium mb-1">Data riconosciuta:</label>
                  <input
                    type="date"
                    value={ocrResult.date}
                    onChange={(e) => setOcrResult({...ocrResult, date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Importo riconosciuto (€):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ocrResult.amount}
                    onChange={(e) => setOcrResult({...ocrResult, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Intestazione:</label>
                  <input
                    type="text"
                    value={ocrResult.intestazione}
                    onChange={(e) => setOcrResult({...ocrResult, intestazione: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria:</label>
                  <select
                    value={ocrResult.category || (costCategories.length > 0 ? costCategories[0].value : 'altro')}
                    onChange={(e) => setOcrResult({...ocrResult, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {costCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Descrizione:</label>
                  <input
                    type="text"
                    value={ocrResult.description}
                    onChange={(e) => setOcrResult({...ocrResult, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    saveCost({
                      date: ocrResult.date,
                      amount: parseFloat(ocrResult.amount),
                      category: ocrResult.category || (costCategories.length > 0 ? costCategories[0].value : 'altro'),
                      description: ocrResult.description,
                      linkedTo: '',
                      linkedType: 'none',
                      nominativo: 'Sistema',
                      method: 'ocr',
                      fileData: ocrResult.fileData
                    });
                    alert('Costo OCR salvato con successo!');
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                >
                  ✅ Conferma e Salva
                </button>
                <button
                  onClick={() => setOcrResult(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
                >
                  ❌ Annulla
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form costo manuale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aggiungi Costo Manuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nominativo *</label>
              <input
                type="text"
                value={manualInvoice.nominativo}
                onChange={(e) => setManualInvoice({...manualInvoice, nominativo: e.target.value})}
                placeholder="Nome di chi carica il costo"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                value={manualInvoice.date}
                onChange={(e) => setManualInvoice({...manualInvoice, date: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo (€)</label>
              <input
                type="number"
                step="0.01"
                value={manualInvoice.amount}
                onChange={(e) => setManualInvoice({...manualInvoice, amount: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={manualInvoice.category}
                onChange={(e) => setManualInvoice({...manualInvoice, category: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                {costCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <input
                type="text"
                value={manualInvoice.description}
                onChange={(e) => setManualInvoice({...manualInvoice, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Descrizione costo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Collegamento</label>
              <select
                value={manualInvoice.linkedType}
                onChange={(e) => {
                  setManualInvoice({
                    ...manualInvoice, 
                    linkedType: e.target.value,
                    linkedTo: '' // Reset collegamento quando cambia tipo
                  });
                }}
                className="w-full px-3 py-2 border rounded-md"
              >
                {linkTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Collegamento</label>
              {manualInvoice.linkedType === 'order' && (
                <select
                  value={manualInvoice.linkedTo}
                  onChange={(e) => setManualInvoice({...manualInvoice, linkedTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleziona ordine...</option>
                  {shopifyOrders.map(order => (
                    <option key={order.id} value={order.id}>
                      #{order.orderNumber} - {order.customerName || 'Cliente'} - {order.totalPrice?.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </option>
                  ))}
                </select>
              )}
              {manualInvoice.linkedType === 'supplier' && (
                <select
                  value={manualInvoice.linkedTo}
                  onChange={(e) => setManualInvoice({...manualInvoice, linkedTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleziona ordine fornitore...</option>
                  {supplierOrders.map(order => (
                    <option key={order.id} value={order.id}>
                      #{order.numero_ordine} - {order.fornitore} - {order.importo_totale?.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </option>
                  ))}
                </select>
              )}
              {manualInvoice.linkedType === 'product' && (
                <input
                  type="text"
                  value={manualInvoice.linkedTo}
                  onChange={(e) => setManualInvoice({...manualInvoice, linkedTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="SKU o nome prodotto"
                />
              )}
              {manualInvoice.linkedType === 'campaign' && (
                <input
                  type="text"
                  value={manualInvoice.linkedTo}
                  onChange={(e) => setManualInvoice({...manualInvoice, linkedTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Nome campagna marketing"
                />
              )}
              {manualInvoice.linkedType === 'none' && (
                <input
                  type="text"
                  value={manualInvoice.linkedTo}
                  onChange={(e) => setManualInvoice({...manualInvoice, linkedTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Nessun collegamento"
                  disabled
                />
              )}
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={saveManualCost}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              disabled={!manualInvoice.date || !manualInvoice.amount || !manualInvoice.nominativo}
            >
              Salva Costo
            </button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spesa Marketing</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketingCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            <p className="text-xs text-muted-foreground">Costi marketing del periodo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spese Spedizione</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippingCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            <p className="text-xs text-muted-foreground">Spedizioni non pagate dal cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Altri Costi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{otherCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            <p className="text-xs text-muted-foreground">Costi manuali e OCR del periodo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Costi</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(marketingCost + shippingCost + otherCosts).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            <p className="text-xs text-muted-foreground">Tutti i costi del periodo</p>
          </CardContent>
        </Card>
      </div>

      {/* DASHBOARD ANALISI COSTI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grafico distribuzione costi per categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Distribuzione Costi per Categoria
            </CardTitle>
            <CardDescription>
              Analisi dei costi suddivisi per categoria nel periodo selezionato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const categoryTotals = {};
                getFilteredCosts().forEach(cost => {
                  const category = cost.category || 'altro';
                  categoryTotals[category] = (categoryTotals[category] || 0) + cost.amount;
                });
                
                const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
                
                return Object.entries(categoryTotals).map(([category, amount]) => {
                  const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
                  const categoryInfo = costCategories.find(cat => cat.value === category);
                  
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: categoryInfo?.color || '#6B7280' }}
                        ></div>
                        <span className="font-medium">
                          {categoryInfo?.label || category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  );
                });
              })()}
              
              {getFilteredCosts().length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  Nessun costo per questo periodo
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grafico andamento temporale */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 Andamento Temporale Costi
            </CardTitle>
            <CardDescription>
              Evoluzione dei costi nel periodo selezionato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Grafico a barre per andamento giornaliero */}
              <div className="h-64">
                {(() => {
                  // Raggruppa costi per data
                  const dailyCosts = {};
                  getFilteredCosts().forEach(cost => {
                    const date = cost.date;
                    dailyCosts[date] = (dailyCosts[date] || 0) + cost.amount;
                  });
                  
                  // Ordina per data
                  const sortedDates = Object.keys(dailyCosts).sort();
                  const maxCost = Math.max(...Object.values(dailyCosts), 0);
                  
                  if (sortedDates.length === 0) {
                    return (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        Nessun costo per questo periodo
                      </div>
                    );
                  }
                  
                  return (
                    <div className="h-full">
                      <div className="flex items-end justify-between h-48 gap-1">
                        {sortedDates.map((date, index) => {
                          const cost = dailyCosts[date];
                          const height = maxCost > 0 ? (cost / maxCost) * 100 : 0;
                          const isToday = new Date(date).toDateString() === new Date().toDateString();
                          
                          return (
                            <div key={date} className="flex-1 flex flex-col items-center">
                              <div className="relative w-full">
                                <div 
                                  className={`w-full rounded-t transition-all duration-300 ${
                                    isToday ? 'bg-blue-500' : 'bg-blue-300'
                                  }`}
                                  style={{ height: `${height}%` }}
                                ></div>
                                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                                  {new Date(date).toLocaleDateString('it-IT', { 
                                    day: '2-digit', 
                                    month: '2-digit' 
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Legenda valori */}
                      <div className="mt-8 flex justify-between text-xs text-gray-500">
                        <span>0€</span>
                        <span>{maxCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              {/* Statistiche rapide */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {getFilteredCosts().length}
                  </div>
                  <div className="text-sm text-blue-600">Costi Totali</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {getFilteredCosts().filter(cost => cost.method === 'ocr').length}
                  </div>
                  <div className="text-sm text-green-600">OCR Processati</div>
                </div>
              </div>
              
              {/* Top giorni per spesa */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Giorni con Maggiori Spese</h4>
                <div className="space-y-1">
                  {(() => {
                    const dailyCosts = {};
                    getFilteredCosts().forEach(cost => {
                      const date = cost.date;
                      dailyCosts[date] = (dailyCosts[date] || 0) + cost.amount;
                    });
                    
                    return Object.entries(dailyCosts)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([date, total]) => (
                        <div key={date} className="flex justify-between text-sm">
                          <span>{new Date(date).toLocaleDateString('it-IT', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: '2-digit' 
                          })}</span>
                          <span className="font-bold">{total.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LISTA COSTI CON TAG E FILTRI */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lista Costi</CardTitle>
              <CardDescription>
                {getFilteredCosts().length} costi trovati per il periodo selezionato
              </CardDescription>
            </div>
          </div>
          
          {/* FILTRI */}
          <div className="mt-4 flex flex-wrap gap-3">
            {/* Filtro Categoria */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Categoria:</label>
              <select 
                className="px-3 py-1 border rounded-md text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Tutte le categorie</option>
                {costCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            {/* Filtro Metodo */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Metodo:</label>
              <select 
                className="px-3 py-1 border rounded-md text-sm"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
              >
                <option value="">Tutti i metodi</option>
                <option value="manual">Manuale</option>
                <option value="ocr">OCR</option>
              </select>
            </div>
            
            {/* Filtro Nominativo */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Nominativo:</label>
              <input 
                type="text"
                placeholder="Cerca nominativo..."
                className="px-3 py-1 border rounded-md text-sm"
                value={filterNominativo}
                onChange={(e) => setFilterNominativo(e.target.value)}
              />
            </div>
            
            {/* Filtro Importo */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Importo min:</label>
              <input 
                type="number"
                placeholder="0"
                className="px-3 py-1 border rounded-md text-sm w-20"
                value={filterMinAmount}
                onChange={(e) => setFilterMinAmount(e.target.value)}
              />
            </div>
            
            {/* Filtro Ordinamento */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Ordina per:</label>
              <select 
                className="px-3 py-1 border rounded-md text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date_desc">📅 Più recenti</option>
                <option value="date_asc">📅 Più storici</option>
                <option value="amount_desc">💰 Più costosi</option>
                <option value="amount_asc">💰 Meno costosi</option>
                <option value="nominativo_asc">👤 Nominativo A-Z</option>
                <option value="nominativo_desc">👤 Nominativo Z-A</option>
                <option value="category_asc">🏷️ Categoria A-Z</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getFilteredCosts().map(cost => {
              const category = costCategories.find(cat => cat.value === cost.category);
              const isToday = new Date(cost.date).toDateString() === new Date().toDateString();
              
              return (
                <div key={cost.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-center justify-between">
                    {/* Colonna sinistra: Data e Nominativo */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          isToday ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {new Date(cost.date).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                        {isToday && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Oggi
                          </span>
                        )}
                      </div>
                      
                      <div className="font-medium text-gray-900 min-w-[120px]">
                        {cost.nominativo}
                      </div>
                      
                      {cost.description && (
                        <div className="text-sm text-gray-600 max-w-[200px] truncate">
                          {cost.description}
                        </div>
                      )}
                    </div>
                    
                    {/* Colonna centrale: Tags */}
                    <div className="flex items-center gap-2">
                      {/* Tag Categoria */}
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: category?.color + '20', 
                          color: category?.color 
                        }}
                      >
                        {category?.label || cost.category}
                      </span>
                      
                      {/* Tag Metodo */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        cost.method === 'ocr' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {cost.method === 'ocr' ? '📄 OCR' : '✏️ Manuale'}
                      </span>
                      
                      {/* Tag File se presente */}
                      {cost.fileData && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          📎 File
                        </span>
                      )}
                      
                      {/* Tag Collegamento se presente */}
                      {cost.linkedTo && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          🔗 {linkTypes.find(t => t.value === cost.linkedType)?.label}
                        </span>
                      )}
                    </div>
                    
                    {/* Colonna destra: Importo e Azioni */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {cost.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteCost(cost.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Elimina costo"
                        >
                          🗑️
                        </button>
                        {cost.fileData && (
                          <button
                            onClick={() => downloadFile(cost.fileData)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            title="Scarica file"
                          >
                            📥
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {getFilteredCosts().length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="mb-4">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg font-medium mb-2">Nessun costo trovato</p>
                <p className="text-sm text-gray-400">Per questo periodo non sono stati registrati costi</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm font-medium mb-2">💡 Suggerimenti:</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Cambia il periodo selezionato</li>
                  <li>• Aggiungi un nuovo costo manualmente</li>
                  <li>• Carica una fattura tramite OCR</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostiPage; 