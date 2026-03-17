import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const ManualMetricsForm = ({ onSave, orders = [] }) => {
  const [formData, setFormData] = useState({
    weekStart: '',
    weekEnd: '',
    googleAds: {
      spent: '',
      impressions: '',
      clicks: '',
      conversions: ''
    },
    meta: {
      spent: '',
      impressions: '',
      clicks: '',
      conversions: ''
    },
    tiktok: {
      spent: '',
      impressions: '',
      clicks: '',
      conversions: ''
    }
  });

  const [savedMetrics, setSavedMetrics] = useState([]);
  const [calculatedMetrics, setCalculatedMetrics] = useState({
    shopifyConversions: 0,
    shopifyRevenue: 0,
    googleAds: { cpa: 0, roas: 0 },
    meta: { cpa: 0, roas: 0 },
    tiktok: { cpa: 0, roas: 0 },
    overall: { cpa: 0, roas: 0 }
  });

  // Stati per la modifica
  const [editingMetric, setEditingMetric] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Stati per i filtri
  const [filterType, setFilterType] = useState('all'); // 'all', 'week', 'month'
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Carica dati salvati
  useEffect(() => {
    const saved = localStorage.getItem('manualMetrics');
    if (saved) {
      setSavedMetrics(JSON.parse(saved));
    }
  }, []);

  // Calcola metriche in tempo reale quando cambiano i dati
  useEffect(() => {
    if (formData.weekStart && formData.weekEnd) {
      // Calcola conversioni e revenue Shopify per il periodo
      const relevantOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= new Date(formData.weekStart) && orderDate <= new Date(formData.weekEnd);
      });

      const shopifyConversions = relevantOrders.length;
      const shopifyRevenue = relevantOrders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

      // Calcola spese e conversioni manuali
      const googleSpent = parseFloat(formData.googleAds.spent) || 0;
      const googleConversions = parseInt(formData.googleAds.conversions) || 0;
      
      const metaSpent = parseFloat(formData.meta.spent) || 0;
      const metaConversions = parseInt(formData.meta.conversions) || 0;
      
      const tiktokSpent = parseFloat(formData.tiktok.spent) || 0;
      const tiktokConversions = parseInt(formData.tiktok.conversions) || 0;

      const totalSpent = googleSpent + metaSpent + tiktokSpent;

      // Calcola CPA e ROAS per ogni piattaforma (usando conversioni manuali)
      const googleCpa = googleConversions > 0 ? googleSpent / googleConversions : 0;
      const googleRoas = googleSpent > 0 ? (googleSpent / totalSpent) * shopifyRevenue / googleSpent : 0;

      const metaCpa = metaConversions > 0 ? metaSpent / metaConversions : 0;
      const metaRoas = metaSpent > 0 ? (metaSpent / totalSpent) * shopifyRevenue / metaSpent : 0;

      const tiktokCpa = tiktokConversions > 0 ? tiktokSpent / tiktokConversions : 0;
      const tiktokRoas = tiktokSpent > 0 ? (tiktokSpent / totalSpent) * shopifyRevenue / tiktokSpent : 0;

      // Calcola CPA e ROAS complessivi (usando conversioni Shopify)
      const overallCpa = shopifyConversions > 0 ? totalSpent / shopifyConversions : 0;
      const overallRoas = totalSpent > 0 ? shopifyRevenue / totalSpent : 0;

      setCalculatedMetrics({
        shopifyConversions,
        shopifyRevenue,
        googleAds: { cpa: googleCpa || 0, roas: googleRoas || 0 },
        meta: { cpa: metaCpa || 0, roas: metaRoas || 0 },
        tiktok: { cpa: tiktokCpa || 0, roas: tiktokRoas || 0 },
        overall: { cpa: overallCpa || 0, roas: overallRoas || 0 }
      });
    }
  }, [formData, orders]);

  const handleInputChange = (platform, field, value) => {
    setFormData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Controlla se almeno una piattaforma ha dei dati
    const hasGoogleData = parseFloat(formData.googleAds.spent) > 0 || parseInt(formData.googleAds.conversions) > 0;
    const hasMetaData = parseFloat(formData.meta.spent) > 0 || parseInt(formData.meta.conversions) > 0;
    const hasTiktokData = parseFloat(formData.tiktok.spent) > 0 || parseInt(formData.tiktok.conversions) > 0;
    
    if (!hasGoogleData && !hasMetaData && !hasTiktokData) {
      alert('Inserisci almeno i dati per una piattaforma (spesa o conversioni)');
      return;
    }
    
    const newMetric = {
      id: Date.now(),
      weekStart: formData.weekStart,
      weekEnd: formData.weekEnd,
      shopifyConversions: calculatedMetrics.shopifyConversions,
      shopifyRevenue: calculatedMetrics.shopifyRevenue,
      overallCpa: calculatedMetrics.overall.cpa,
      overallRoas: calculatedMetrics.overall.roas,
      googleAds: {
        spent: parseFloat(formData.googleAds.spent) || 0,
        impressions: parseInt(formData.googleAds.impressions) || 0,
        clicks: parseInt(formData.googleAds.clicks) || 0,
        conversions: parseInt(formData.googleAds.conversions) || 0,
        cpa: calculatedMetrics.googleAds.cpa,
        roas: calculatedMetrics.googleAds.roas
      },
      meta: {
        spent: parseFloat(formData.meta.spent) || 0,
        impressions: parseInt(formData.meta.impressions) || 0,
        clicks: parseInt(formData.meta.clicks) || 0,
        conversions: parseInt(formData.meta.conversions) || 0,
        cpa: calculatedMetrics.meta.cpa,
        roas: calculatedMetrics.meta.roas
      },
      tiktok: {
        spent: parseFloat(formData.tiktok.spent) || 0,
        impressions: parseInt(formData.tiktok.impressions) || 0,
        clicks: parseInt(formData.tiktok.clicks) || 0,
        conversions: parseInt(formData.tiktok.conversions) || 0,
        cpa: calculatedMetrics.tiktok.cpa,
        roas: calculatedMetrics.tiktok.roas
      }
    };

    const updatedMetrics = [...savedMetrics, newMetric];
    setSavedMetrics(updatedMetrics);
    localStorage.setItem('manualMetrics', JSON.stringify(updatedMetrics));
    
    if (onSave) {
      onSave(updatedMetrics);
    }

    // Reset form
    setFormData({
      weekStart: '',
      weekEnd: '',
      googleAds: { spent: '', impressions: '', clicks: '', conversions: '' },
      meta: { spent: '', impressions: '', clicks: '', conversions: '' },
      tiktok: { spent: '', impressions: '', clicks: '', conversions: '' }
    });
  };

  const deleteMetric = (id) => {
    const updated = savedMetrics.filter(metric => metric.id !== id);
    setSavedMetrics(updated);
    localStorage.setItem('manualMetrics', JSON.stringify(updated));
    
    if (onSave) {
      onSave(updated);
    }
  };

  const startEdit = (metric) => {
    setEditingMetric(metric);
    setFormData({
      weekStart: metric.weekStart,
      weekEnd: metric.weekEnd,
      googleAds: {
        spent: (metric.googleAds?.spent || 0).toString(),
        impressions: (metric.googleAds?.impressions || 0).toString(),
        clicks: (metric.googleAds?.clicks || 0).toString(),
        conversions: (metric.googleAds?.conversions || 0).toString()
      },
      meta: {
        spent: (metric.meta?.spent || 0).toString(),
        impressions: (metric.meta?.impressions || 0).toString(),
        clicks: (metric.meta?.clicks || 0).toString(),
        conversions: (metric.meta?.conversions || 0).toString()
      },
      tiktok: {
        spent: (metric.tiktok?.spent || 0).toString(),
        impressions: (metric.tiktok?.impressions || 0).toString(),
        clicks: (metric.tiktok?.clicks || 0).toString(),
        conversions: (metric.tiktok?.conversions || 0).toString()
      }
    });
    setShowEditForm(true);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    
    // Controlla se almeno una piattaforma ha dei dati
    const hasGoogleData = parseFloat(formData.googleAds.spent) > 0 || parseInt(formData.googleAds.conversions) > 0;
    const hasMetaData = parseFloat(formData.meta.spent) > 0 || parseInt(formData.meta.conversions) > 0;
    const hasTiktokData = parseFloat(formData.tiktok.spent) > 0 || parseInt(formData.tiktok.conversions) > 0;
    
    if (!hasGoogleData && !hasMetaData && !hasTiktokData) {
      alert('Inserisci almeno i dati per una piattaforma (spesa o conversioni)');
      return;
    }
    
    const updatedMetric = {
      ...editingMetric,
      weekStart: formData.weekStart,
      weekEnd: formData.weekEnd,
      shopifyConversions: calculatedMetrics.shopifyConversions,
      shopifyRevenue: calculatedMetrics.shopifyRevenue,
      overallCpa: calculatedMetrics.overall.cpa,
      overallRoas: calculatedMetrics.overall.roas,
      googleAds: {
        spent: parseFloat(formData.googleAds.spent) || 0,
        impressions: parseInt(formData.googleAds.impressions) || 0,
        clicks: parseInt(formData.googleAds.clicks) || 0,
        conversions: parseInt(formData.googleAds.conversions) || 0,
        cpa: calculatedMetrics.googleAds.cpa,
        roas: calculatedMetrics.googleAds.roas
      },
      meta: {
        spent: parseFloat(formData.meta.spent) || 0,
        impressions: parseInt(formData.meta.impressions) || 0,
        clicks: parseInt(formData.meta.clicks) || 0,
        conversions: parseInt(formData.meta.conversions) || 0,
        cpa: calculatedMetrics.meta.cpa,
        roas: calculatedMetrics.meta.roas
      },
      tiktok: {
        spent: parseFloat(formData.tiktok.spent) || 0,
        impressions: parseInt(formData.tiktok.impressions) || 0,
        clicks: parseInt(formData.tiktok.clicks) || 0,
        conversions: parseInt(formData.tiktok.conversions) || 0,
        cpa: calculatedMetrics.tiktok.cpa,
        roas: calculatedMetrics.tiktok.roas
      }
    };

    const updatedMetrics = savedMetrics.map(metric => 
      metric.id === editingMetric.id ? updatedMetric : metric
    );
    
    setSavedMetrics(updatedMetrics);
    localStorage.setItem('manualMetrics', JSON.stringify(updatedMetrics));
    
    if (onSave) {
      onSave(updatedMetrics);
    }

    // Reset edit mode
    setEditingMetric(null);
    setShowEditForm(false);
    setFormData({
      weekStart: '',
      weekEnd: '',
      googleAds: { spent: '', impressions: '', clicks: '', conversions: '' },
      meta: { spent: '', impressions: '', clicks: '', conversions: '' },
      tiktok: { spent: '', impressions: '', clicks: '', conversions: '' }
    });
  };

  const cancelEdit = () => {
    setEditingMetric(null);
    setShowEditForm(false);
    setFormData({
      weekStart: '',
      weekEnd: '',
      googleAds: { spent: '', impressions: '', clicks: '', conversions: '' },
      meta: { spent: '', impressions: '', clicks: '', conversions: '' },
      tiktok: { spent: '', impressions: '', clicks: '', conversions: '' }
    });
  };

  // Filtra le metriche salvate
  const getFilteredMetrics = () => {
    let filtered = savedMetrics;

    if (filterType === 'week' && selectedPeriod) {
      const [year, week] = selectedPeriod.split('-W');
      filtered = savedMetrics.filter(metric => {
        const metricDate = new Date(metric.weekStart);
        const metricYear = metricDate.getFullYear();
        const metricWeek = getWeekNumber(metricDate);
        return metricYear === parseInt(year) && metricWeek === parseInt(week);
      });
    } else if (filterType === 'month' && selectedPeriod) {
      const [year, month] = selectedPeriod.split('-');
      filtered = savedMetrics.filter(metric => {
        const metricDate = new Date(metric.weekStart);
        return metricDate.getFullYear() === parseInt(year) && 
               metricDate.getMonth() === parseInt(month) - 1;
      });
    }

    return filtered.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
  };

  // Funzione per ottenere il numero della settimana
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Genera opzioni per i filtri
  const getFilterOptions = () => {
    const options = [];
    
    if (filterType === 'week') {
      const weeks = new Set();
      savedMetrics.forEach(metric => {
        const date = new Date(metric.weekStart);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        weeks.add(`${year}-W${week.toString().padStart(2, '0')}`);
      });
      options.push(...Array.from(weeks).sort().reverse());
    } else if (filterType === 'month') {
      const months = new Set();
      savedMetrics.forEach(metric => {
        const date = new Date(metric.weekStart);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        months.add(`${year}-${month.toString().padStart(2, '0')}`);
      });
      options.push(...Array.from(months).sort().reverse());
    }
    
    return options;
  };

  const renderPlatformForm = (platform, data, platformName) => {
    const metrics = calculatedMetrics[platform];
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{platformName}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spesa (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={data.spent}
              onChange={(e) => handleInputChange(platform, 'spent', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impressioni
            </label>
            <input
              type="number"
              value={data.impressions}
              onChange={(e) => handleInputChange(platform, 'impressions', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Click
            </label>
            <input
              type="number"
              value={data.clicks}
              onChange={(e) => handleInputChange(platform, 'clicks', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conversioni
            </label>
            <input
              type="number"
              value={data.conversions}
              onChange={(e) => handleInputChange(platform, 'conversions', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>
        
        {/* Metriche calcolate in tempo reale */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Metriche Calcolate:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">CPA:</span>
              <span className="font-medium">€{(metrics?.cpa || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ROAS:</span>
              <span className="font-medium">{(metrics?.roas || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredMetrics = getFilteredMetrics();

  // Calcola la paginazione
  const totalPages = Math.ceil(filteredMetrics.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMetrics = filteredMetrics.slice(startIndex, endIndex);

  // Reset alla prima pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedPeriod]);

  return (
    <div className="space-y-6">
      {/* Form per nuovo inserimento */}
      {!showEditForm && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Inserimento Dati Marketing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">ℹ️ Come funziona</h4>
              <p className="text-sm text-blue-700">
                Inserisci spesa, impressioni, click e conversioni per ogni piattaforma. 
                CPA e ROAS vengono calcolati automaticamente. Per le metriche complessive 
                vengono usate le conversioni Shopify del periodo.
              </p>
              <p className="text-sm text-blue-600 mt-2">
                💡 <strong>Nota:</strong> Tutte le piattaforme sono opzionali. Puoi inserire dati solo per le piattaforme che usi.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inizio Settimana
                  </label>
                  <input
                    type="date"
                    value={formData.weekStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekStart: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fine Settimana
                  </label>
                  <input
                    type="date"
                    value={formData.weekEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekEnd: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Metriche calcolate dal periodo */}
              {formData.weekStart && formData.weekEnd && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">📈 Metriche Shopify dal Periodo Selezionato</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Conversioni Shopify:</span>
                      <div className="font-medium text-lg">{calculatedMetrics.shopifyConversions || 0}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Revenue Shopify:</span>
                      <div className="font-medium text-lg">€{(calculatedMetrics.shopifyRevenue || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">CPA Complessivo:</span>
                      <div className="font-medium text-lg">€{(calculatedMetrics.overall?.cpa || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">ROAS Complessivo:</span>
                      <div className="font-medium text-lg">{(calculatedMetrics.overall?.roas || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Google Ads */}
              {renderPlatformForm('googleAds', formData.googleAds, 'Google Ads')}

              {/* Meta */}
              {renderPlatformForm('meta', formData.meta, 'Meta (Facebook/Instagram)')}

              {/* TikTok */}
              {renderPlatformForm('tiktok', formData.tiktok, 'TikTok Ads')}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Salva Dati
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Form per modifica */}
      {showEditForm && editingMetric && (
        <Card>
          <CardHeader>
            <CardTitle>✏️ Modifica Dati Marketing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Modifica in Corso</h4>
              <p className="text-sm text-yellow-700">
                Stai modificando i dati per la settimana: {new Date(editingMetric.weekStart).toLocaleDateString('it-IT')} - {new Date(editingMetric.weekEnd).toLocaleDateString('it-IT')}
              </p>
              <p className="text-sm text-yellow-600 mt-2">
                💡 <strong>Nota:</strong> Tutte le piattaforme sono opzionali. Puoi inserire dati solo per le piattaforme che usi.
              </p>
            </div>

            <form onSubmit={saveEdit} className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inizio Settimana
                  </label>
                  <input
                    type="date"
                    value={formData.weekStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekStart: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fine Settimana
                  </label>
                  <input
                    type="date"
                    value={formData.weekEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekEnd: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Metriche calcolate dal periodo */}
              {formData.weekStart && formData.weekEnd && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">📈 Metriche Shopify dal Periodo Selezionato</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Conversioni Shopify:</span>
                      <div className="font-medium text-lg">{calculatedMetrics.shopifyConversions || 0}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Revenue Shopify:</span>
                      <div className="font-medium text-lg">€{(calculatedMetrics.shopifyRevenue || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">CPA Complessivo:</span>
                      <div className="font-medium text-lg">€{(calculatedMetrics.overall?.cpa || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">ROAS Complessivo:</span>
                      <div className="font-medium text-lg">{(calculatedMetrics.overall?.roas || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Google Ads */}
              {renderPlatformForm('googleAds', formData.googleAds, 'Google Ads')}

              {/* Meta */}
              {renderPlatformForm('meta', formData.meta, 'Meta (Facebook/Instagram)')}

              {/* TikTok */}
              {renderPlatformForm('tiktok', formData.tiktok, 'TikTok Ads')}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Dati Salvati con Filtri */}
      {savedMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              📋 Dati Salvati ({filteredMetrics.length} di {savedMetrics.length} settimane)
              {totalPages > 1 && ` • Pagina ${currentPage}/${totalPages}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtri */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Filtro
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setSelectedPeriod('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tutte le Settimane</option>
                    <option value="week">Per Settimana</option>
                    <option value="month">Per Mese</option>
                  </select>
                </div>

                {(filterType === 'week' || filterType === 'month') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {filterType === 'week' ? 'Settimana' : 'Mese'}
                    </label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      {getFilterOptions().map(option => (
                        <option key={option} value={option}>
                          {filterType === 'week' 
                            ? `Settimana ${option.split('-W')[1]} del ${option.split('-W')[0]}`
                            : `${new Date(option + '-01').toLocaleDateString('it-IT', { year: 'numeric', month: 'long' })}`
                          }
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Lista compatta delle metriche */}
            <div className="space-y-3">
              {currentMetrics.map((metric) => (
                <div key={metric.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {new Date(metric.weekStart).toLocaleDateString('it-IT')} - {new Date(metric.weekEnd).toLocaleDateString('it-IT')}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {metric.shopifyConversions || 0} conversioni Shopify • €{(metric.shopifyRevenue || 0).toFixed(2)} revenue Shopify
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        {expandedMetric === metric.id ? '📖 Nascondi' : '👁️ Dettagli'}
                      </button>
                      <button
                        onClick={() => startEdit(metric)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        ✏️ Modifica
                      </button>
                      <button
                        onClick={() => deleteMetric(metric.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                      >
                        🗑️ Elimina
                      </button>
                    </div>
                  </div>

                  {/* Riepilogo compatto */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-medium text-blue-800">Google Ads</div>
                      <div className="text-xs text-gray-600">
                        €{(metric.googleAds?.spent || 0).toFixed(0)} • {(metric.googleAds?.conversions || 0)} conv.
                      </div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-medium text-blue-800">Meta</div>
                      <div className="text-xs text-gray-600">
                        €{(metric.meta?.spent || 0).toFixed(0)} • {(metric.meta?.conversions || 0)} conv.
                      </div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-medium text-blue-800">TikTok</div>
                      <div className="text-xs text-gray-600">
                        €{(metric.tiktok?.spent || 0).toFixed(0)} • {(metric.tiktok?.conversions || 0)} conv.
                      </div>
                    </div>
                  </div>

                  {/* Dettagli espandibili */}
                  {expandedMetric === metric.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Google Ads */}
                        <div className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-blue-600 mb-2">Google Ads</h5>
                          <div className="text-sm space-y-1">
                            <div>Spesa: €{(metric.googleAds?.spent || 0).toFixed(2)}</div>
                            <div>Conversioni: {metric.googleAds?.conversions || 0}</div>
                            <div>CPA: €{(metric.googleAds?.cpa || 0).toFixed(2)}</div>
                            <div>ROAS: {(metric.googleAds?.roas || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-blue-600 mb-2">Meta</h5>
                          <div className="text-sm space-y-1">
                            <div>Spesa: €{(metric.meta?.spent || 0).toFixed(2)}</div>
                            <div>Conversioni: {metric.meta?.conversions || 0}</div>
                            <div>CPA: €{(metric.meta?.cpa || 0).toFixed(2)}</div>
                            <div>ROAS: {(metric.meta?.roas || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        {/* TikTok */}
                        <div className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-blue-600 mb-2">TikTok</h5>
                          <div className="text-sm space-y-1">
                            <div>Spesa: €{(metric.tiktok?.spent || 0).toFixed(2)}</div>
                            <div>Conversioni: {metric.tiktok?.conversions || 0}</div>
                            <div>CPA: €{(metric.tiktok?.cpa || 0).toFixed(2)}</div>
                            <div>ROAS: {(metric.tiktok?.roas || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Metriche complessive */}
                      <div className="mt-3 p-3 bg-green-50 rounded border">
                        <h6 className="font-medium text-green-800 mb-1">Metriche Complessive (usando conversioni Shopify)</h6>
                        <div className="text-sm space-y-1">
                          <div>CPA Totale: €{(metric.overallCpa || 0).toFixed(2)}</div>
                          <div>ROAS Totale: {(metric.overallRoas || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Controlli di paginazione */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Precedente
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm border rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Successiva →
                  </button>
                </div>
              )}

              {/* Informazioni sulla paginazione */}
              {totalPages > 1 && (
                <div className="mt-2 text-center text-sm text-gray-600">
                  Pagina {currentPage} di {totalPages} • 
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredMetrics.length)} di {filteredMetrics.length} settimane
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManualMetricsForm; 