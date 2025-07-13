import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target,
  Facebook,
  Chrome,
  Calendar,
  Filter,
  Download,
  Eye,
  MousePointer,
  ShoppingCart,
  Globe,
  MapPin,
  Link,
  Unlink
} from 'lucide-react';
import GoogleAdsAPI from '../lib/googleAdsAPI';
import MetaAPI from '../lib/metaAPI';

const MarketingPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketingData, setMarketingData] = useState({
    totalRevenue: 0,
    totalConversions: 0,
    averageOrderValue: 0,
    totalSpent: 0,
    cpa: 0,
    roas: 0
  });

  // API instances
  const [googleAdsAPI] = useState(new GoogleAdsAPI());
  const [metaAPI] = useState(new MetaAPI());

  // Connection status
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  // Carica gli ordini Shopify
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetch('/api/shopify/orders');
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Errore nel caricamento ordini:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Verifica connessioni esistenti
  useEffect(() => {
    const checkConnections = () => {
      const googleConnected = googleAdsAPI.loadStoredToken();
      const metaConnected = metaAPI.loadStoredToken();
      
      setGoogleAdsConnected(googleConnected);
      setMetaConnected(metaConnected);
    };

    checkConnections();
  }, [googleAdsAPI, metaAPI]);

  // Calcola i dati di marketing basati sugli ordini reali
  useEffect(() => {
    if (orders.length > 0) {
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      const totalConversions = orders.length;
      const averageOrderValue = totalRevenue / totalConversions;
      
      // Stima della spesa marketing (può essere configurata)
      const estimatedSpent = totalRevenue * 0.15;
      
      const cpa = estimatedSpent / totalConversions;
      const roas = totalRevenue / estimatedSpent;

      setMarketingData({
        totalRevenue,
        totalConversions,
        averageOrderValue,
        totalSpent: estimatedSpent,
        cpa,
        roas
      });
    }
  }, [orders]);

  // Carica dati dalle API connesse
  useEffect(() => {
    const loadAPIData = async () => {
      const allCampaigns = [];
      const allDailyData = [];

      try {
        // Carica dati Google Ads
        if (googleAdsConnected) {
          try {
            const googleCampaigns = await googleAdsAPI.getCampaigns();
            allCampaigns.push(...googleCampaigns);
            
            const googleDaily = await googleAdsAPI.getDailyData();
            allDailyData.push(...googleDaily);
          } catch (error) {
            console.error('Errore caricamento Google Ads:', error);
          }
        }

        // Carica dati Meta
        if (metaConnected) {
          try {
            const metaCampaigns = await metaAPI.getCampaigns();
            allCampaigns.push(...metaCampaigns);
            
            const metaDaily = await metaAPI.getDailyData();
            allDailyData.push(...metaDaily);
          } catch (error) {
            console.error('Errore caricamento Meta:', error);
          }
        }

        setCampaigns(allCampaigns);
        setDailyData(allDailyData);
      } catch (error) {
        console.error('Errore caricamento dati API:', error);
      }
    };

    if (googleAdsConnected || metaConnected) {
      loadAPIData();
    }
  }, [googleAdsConnected, metaConnected, googleAdsAPI, metaAPI]);

  // Gestisce connessione Google Ads
  const handleGoogleAdsConnect = async () => {
    try {
      if (!googleAdsAPI.clientId) {
        alert('Google Ads API non configurata. Configura REACT_APP_GOOGLE_ADS_CLIENT_ID nel file .env');
        return;
      }
      await googleAdsAPI.authenticate();
    } catch (error) {
      console.error('Errore connessione Google Ads:', error);
      alert('Errore durante la connessione a Google Ads. Verifica le credenziali OAuth.');
    }
  };

  // Gestisce connessione Meta
  const handleMetaConnect = async () => {
    try {
      if (!metaAPI.clientId) {
        alert('Meta API non configurata. Configura REACT_APP_META_CLIENT_ID nel file .env');
        return;
      }
      await metaAPI.authenticate();
    } catch (error) {
      console.error('Errore connessione Meta:', error);
      alert('Errore durante la connessione a Meta. Verifica le credenziali OAuth.');
    }
  };

  // Gestisce disconnessione
  const handleDisconnect = (platform) => {
    if (platform === 'google') {
      localStorage.removeItem('googleAdsAccessToken');
      localStorage.removeItem('googleAdsRefreshToken');
      setGoogleAdsConnected(false);
    } else if (platform === 'meta') {
      localStorage.removeItem('metaAccessToken');
      localStorage.removeItem('metaAdAccountId');
      setMetaConnected(false);
    }
  };

  // Analizza le fonti degli ordini
  const analyzeOrderSources = () => {
    const sources = {};
    
    orders.forEach(order => {
      let source = 'Diretto';
      
      if (order.customerName && order.customerName.includes('#')) {
        source = 'Campagna';
      } else if (order.shippingAddress?.province) {
        source = `Regione: ${order.shippingAddress.province}`;
      } else {
        source = 'Diretto';
      }
      
      sources[source] = (sources[source] || 0) + 1;
    });
    
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  };

  // Dati giornalieri basati sugli ordini reali
  const getDailyData = () => {
    const dailyStats = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { date, revenue: 0, conversions: 0, spend: 0 };
      }
      dailyStats[date].revenue += order.totalPrice;
      dailyStats[date].conversions += 1;
      dailyStats[date].spend += order.totalPrice * 0.15;
    });
    
    return Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Analizza le regioni di provenienza
  const getRegionalData = () => {
    const regions = {};
    
    orders.forEach(order => {
      const region = order.shippingAddress?.province || 'Non specificato';
      if (!regions[region]) {
        regions[region] = { revenue: 0, orders: 0 };
      }
      regions[region].revenue += order.totalPrice;
      regions[region].orders += 1;
    });
    
    return Object.entries(regions).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      orders: data.orders
    }));
  };

  const orderSources = analyzeOrderSources();
  const shopifyDailyData = getDailyData();
  const regionalData = getRegionalData();

  // Combina dati Shopify con dati API
  const combinedDailyData = dailyData.length > 0 ? dailyData : shopifyDailyData;
  const combinedCampaigns = campaigns.length > 0 ? campaigns : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento dati marketing...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Marketing Dashboard</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Esporta
          </button>
        </div>
      </div>

      {/* Info Banner */}
      {(!googleAdsAPI.clientId || !metaAPI.clientId) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <h3 className="font-medium text-orange-800 mb-1">Configurazione API Richiesta</h3>
                <p className="text-sm text-orange-700">
                  Per utilizzare i dati reali di Google Ads e Meta, configura le credenziali OAuth nel file <code className="bg-orange-100 px-1 rounded">.env</code>. 
                  Attualmente vengono mostrati dati stimati basati sugli ordini Shopify.
                </p>
                <div className="mt-2 text-xs text-orange-600">
                  <p>• Google Ads: {!googleAdsAPI.clientId ? 'Non configurato' : 'Configurato'}</p>
                  <p>• Meta API: {!metaAPI.clientId ? 'Non configurato' : 'Configurato'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connessioni API */}
      <Card>
        <CardHeader>
          <CardTitle>Connessioni API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Ads */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Chrome className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-medium">Google Ads</h3>
                  <p className="text-sm text-gray-500">
                    {!googleAdsAPI.clientId ? 'Non configurato' : 
                     googleAdsConnected ? 'Connesso' : 'Non connesso'}
                  </p>
                  {!googleAdsAPI.clientId && (
                    <p className="text-xs text-orange-600 mt-1">
                      Configura REACT_APP_GOOGLE_ADS_CLIENT_ID
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={googleAdsConnected ? 
                  () => handleDisconnect('google') : 
                  handleGoogleAdsConnect
                }
                disabled={!googleAdsAPI.clientId}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  !googleAdsAPI.clientId
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : googleAdsConnected
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {!googleAdsAPI.clientId ? (
                  <>
                    <Link className="w-4 h-4" />
                    Configura
                  </>
                ) : googleAdsConnected ? (
                  <>
                    <Unlink className="w-4 h-4" />
                    Disconnetti
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Connetti
                  </>
                )}
              </button>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Facebook className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-medium">Meta (Facebook/Instagram)</h3>
                  <p className="text-sm text-gray-500">
                    {!metaAPI.clientId ? 'Non configurato' : 
                     metaConnected ? 'Connesso' : 'Non connesso'}
                  </p>
                  {!metaAPI.clientId && (
                    <p className="text-xs text-orange-600 mt-1">
                      Configura REACT_APP_META_CLIENT_ID
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={metaConnected ? 
                  () => handleDisconnect('meta') : 
                  handleMetaConnect
                }
                disabled={!metaAPI.clientId}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  !metaAPI.clientId
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : metaConnected
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {!metaAPI.clientId ? (
                  <>
                    <Link className="w-4 h-4" />
                    Configura
                  </>
                ) : metaConnected ? (
                  <>
                    <Unlink className="w-4 h-4" />
                    Disconnetti
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Connetti
                  </>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtri */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="7d">Ultimi 7 giorni</option>
            <option value="30d">Ultimi 30 giorni</option>
            <option value="90d">Ultimi 90 giorni</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={selectedPlatform} 
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="all">Tutte le fonti</option>
            <option value="campaign">Campagne</option>
            <option value="direct">Diretto</option>
            <option value="region">Per Regione</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{marketingData.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Basato su {marketingData.totalConversions} ordini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversioni</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketingData.totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              Ordini completati
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPA Stimato</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{marketingData.cpa.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Basato su spesa stimata del 15%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS Stimato</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketingData.roas.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">
              Return on Ad Spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico Revenue e Conversioni */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue e Conversioni Giornaliere</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={combinedDailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue (€)" />
                <Bar yAxisId="right" dataKey="conversions" fill="#82ca9d" name="Conversioni" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grafico Revenue vs Spesa Stimata */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Spesa Stimata</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={combinedDailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (€)" />
                <Line type="monotone" dataKey="spend" stroke="#82ca9d" name="Spesa Stimata (€)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribuzione per Fonte Ordini */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione Ordini per Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="50%" height={300}>
              <PieChart>
                <Pie
                  data={orderSources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(Array.isArray(COLORS) ? COLORS : []).map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabella Campagne API (se connesse) */}
      {(Array.isArray(combinedCampaigns) ? combinedCampaigns : []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campagne API Connesse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Campagna</th>
                    <th className="text-left py-3 px-2">Piattaforma</th>
                    <th className="text-right py-3 px-2">Spesa (€)</th>
                    <th className="text-right py-3 px-2">Conversioni</th>
                    <th className="text-right py-3 px-2">Revenue (€)</th>
                    <th className="text-right py-3 px-2">CPA (€)</th>
                    <th className="text-right py-3 px-2">ROAS</th>
                    <th className="text-right py-3 px-2">CTR (%)</th>
                    <th className="text-right py-3 px-2">CPC (€)</th>
                    <th className="text-center py-3 px-2">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(combinedCampaigns) ? combinedCampaigns : []).map((campaign) => (
                    <tr key={campaign.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{campaign.name}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {campaign.platform === 'Meta' ? (
                            <Facebook className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Chrome className="w-4 h-4 text-red-600" />
                          )}
                          {campaign.platform}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">{campaign.spent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-2 text-right">{campaign.conversions}</td>
                      <td className="py-3 px-2 text-right">{campaign.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-2 text-right">{campaign.cpa.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right">{campaign.roas.toFixed(2)}x</td>
                      <td className="py-3 px-2 text-right">{campaign.ctr.toFixed(1)}</td>
                      <td className="py-3 px-2 text-right">{campaign.cpc.toFixed(2)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          campaign.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {campaign.status === 'active' ? 'Attiva' : 'In Pausa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabella Dettaglio Ordini */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Ordini e Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Ordine</th>
                  <th className="text-left py-3 px-2">Cliente</th>
                  <th className="text-left py-3 px-2">Regione</th>
                  <th className="text-right py-3 px-2">Revenue (€)</th>
                  <th className="text-right py-3 px-2">Data</th>
                  <th className="text-center py-3 px-2">Fonte Stimata</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((order) => {
                  const source = order.customerName?.includes('#') ? 'Campagna' : 'Diretto';
                  const region = order.shippingAddress?.province || 'Non specificato';
                  
                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">#{order.orderNumber}</td>
                      <td className="py-3 px-2">{order.customerName}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {region}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">{order.totalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-2 text-right">
                        {new Date(order.createdAt).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          source === 'Campagna' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {source}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Analisi Regionale */}
      <Card>
        <CardHeader>
          <CardTitle>Analisi per Regione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Regione</th>
                  <th className="text-right py-3 px-2">Ordini</th>
                  <th className="text-right py-3 px-2">Revenue (€)</th>
                  <th className="text-right py-3 px-2">Revenue Medio (€)</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(regionalData) ? regionalData : []).map((region) => (
                  <tr key={region.name} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{region.name}</td>
                    <td className="py-3 px-2 text-right">{region.orders}</td>
                    <td className="py-3 px-2 text-right">{region.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-2 text-right">{(region.revenue / region.orders).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingPage; 