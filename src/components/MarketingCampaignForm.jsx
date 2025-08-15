import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const MarketingCampaignForm = ({ onSave, existingCampaigns = [] }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'google_ads', // google_ads, meta, tiktok
    weekStart: '',
    weekEnd: '',
    budget: 0,
    spent: 0,
    impressions: 0,
    clicks: 0,
    status: 'active'
  });

  const platforms = [
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'meta', label: 'Meta (Facebook/Instagram)' },
    { value: 'tiktok', label: 'TikTok Ads' }
  ];

  const statuses = [
    { value: 'active', label: 'Attiva' },
    { value: 'paused', label: 'In Pausa' },
    { value: 'completed', label: 'Completata' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' || name === 'spent' || name === 'impressions' || 
               name === 'clicks' 
               ? parseFloat(value) || 0 : value
    }));
  };

  const calculateMetrics = () => {
    const { spent, clicks, impressions } = formData;
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spent / clicks : 0;

    return { ctr, cpc };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const metrics = calculateMetrics();
    const newCampaign = {
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      conversions: 0, // Sarà calcolato dagli ordini
      revenue: 0,     // Sarà calcolato dagli ordini
      ...metrics
    };

    const updatedCampaigns = [...existingCampaigns, newCampaign];
    onSave(updatedCampaigns);
    
    // Reset form
    setFormData({
      name: '',
      platform: 'google_ads',
      weekStart: '',
      weekEnd: '',
      budget: 0,
      spent: 0,
      impressions: 0,
      clicks: 0,
      status: 'active'
    });
    setShowForm(false);
  };

  const handleDelete = (campaignId) => {
    const updatedCampaigns = existingCampaigns.filter(c => c.id !== campaignId);
    onSave(updatedCampaigns);
  };

  // Calcola metriche aggregate per settimana
  const getWeeklyStats = () => {
    if (existingCampaigns.length === 0) return null;

    const totalSpent = existingCampaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalImpressions = existingCampaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = existingCampaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalConversions = existingCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
    const totalRevenue = existingCampaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
    const avgCpa = totalConversions > 0 ? totalSpent / totalConversions : 0;
    const avgRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

    return {
      totalSpent,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      avgCtr,
      avgCpc,
      avgCpa,
      avgRoas
    };
  };

  const weeklyStats = getWeeklyStats();

  return (
    <div className="space-y-6">
      {/* Statistiche Settimanali */}
      {weeklyStats && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Report Settimanale Marketing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {weeklyStats.totalSpent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="text-sm text-gray-600">Spesa Totale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {weeklyStats.totalConversions}
                </div>
                <div className="text-sm text-gray-600">Conversioni</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {weeklyStats.avgRoas.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">ROAS Medio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {weeklyStats.avgCpa.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="text-sm text-gray-600">CPA Medio</div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Impressioni:</span> {weeklyStats.totalImpressions.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Click:</span> {weeklyStats.totalClicks.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">CTR Medio:</span> {weeklyStats.avgCtr.toFixed(2)}%
              </div>
              <div>
                <span className="font-medium">CPC Medio:</span> {weeklyStats.avgCpc.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form per nuova campagna */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>➕ Aggiungi Campagna Settimanale</CardTitle>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showForm ? 'Chiudi' : 'Nuova Campagna'}
            </button>
          </div>
        </CardHeader>
        
        {showForm && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Campagna
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="es. Campagna Natale 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Piattaforma
                  </label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {platforms.map(platform => (
                      <option key={platform.value} value={platform.value}>
                        {platform.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inizio Settimana
                  </label>
                  <input
                    type="date"
                    name="weekStart"
                    value={formData.weekStart}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fine Settimana
                  </label>
                  <input
                    type="date"
                    name="weekEnd"
                    value={formData.weekEnd}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget (€)
                  </label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spesa Effettiva (€)
                  </label>
                  <input
                    type="number"
                    name="spent"
                    value={formData.spent}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
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
                    name="impressions"
                    value={formData.impressions}
                    onChange={handleInputChange}
                    min="0"
                    required
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
                    name="clicks"
                    value={formData.clicks}
                    onChange={handleInputChange}
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview metriche calcolate */}
              {formData.spent > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Metriche Calcolate:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">CTR:</span> {calculateMetrics().ctr.toFixed(2)}%
                    </div>
                    <div>
                      <span className="font-medium">CPC:</span> {calculateMetrics().cpc.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <div>
                      <span className="font-medium">Conversioni:</span> Calcolate dagli ordini
                    </div>
                    <div>
                      <span className="font-medium">Revenue:</span> Calcolata dagli ordini
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">ℹ️ Informazioni</h4>
                <p className="text-sm text-blue-700">
                  <strong>Conversioni e Revenue</strong> vengono calcolate automaticamente dagli ordini Shopify 
                  nel periodo della campagna. Inserisci solo i dati di spesa, impressioni e click.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Salva Campagna
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Annulla
                </button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Lista campagne esistenti */}
      {existingCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Campagne Registrate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingCampaigns.map(campaign => (
                <div key={campaign.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{campaign.name}</h4>
                      <p className="text-sm text-gray-600">
                        {campaign.platform === 'google_ads' ? 'Google Ads' :
                         campaign.platform === 'meta' ? 'Meta (Facebook/Instagram)' :
                         campaign.platform === 'tiktok' ? 'TikTok Ads' : campaign.platform}
                      </p>
                      <p className="text-xs text-gray-500">
                        {campaign.weekStart} - {campaign.weekEnd}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Elimina
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Spesa:</span> {campaign.spent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <div>
                      <span className="font-medium">Click:</span> {campaign.clicks.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Conversioni:</span> {campaign.conversions || 0}
                    </div>
                    <div>
                      <span className="font-medium">ROAS:</span> {campaign.roas ? campaign.roas.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketingCampaignForm; 