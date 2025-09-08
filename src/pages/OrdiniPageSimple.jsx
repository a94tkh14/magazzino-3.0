import React, { useState, useEffect } from 'react';
import { loadLargeData, saveLargeData } from '../lib/dataManager';
import { safeIncludes } from '../lib/utils';
import { convertShopifyOrder, getShopifyCredentials } from '../lib/shopifyAPI';
import { RefreshCw, AlertCircle, Database, TrendingUp, Clock, Archive } from 'lucide-react';

// Componenti UI semplificati
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">
    {children}
  </div>
);

const CardContent = ({ children }) => (
  <div className="px-6 py-4">
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-900">
    {children}
  </h3>
);

const Button = ({ children, onClick, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Input = ({ type = 'text', placeholder = '', value, onChange, className = '' }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  />
);

const OrdiniPage = () => {
  const [ordini, setOrdini] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Carica ordini al mount
  useEffect(() => {
    loadOrdini();
  }, []);

  const loadOrdini = async () => {
    try {
      const data = await loadLargeData('shopify_orders');
      if (data) {
        setOrdini(data);
      }
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
      setError('Errore nel caricamento degli ordini');
    }
  };

  const saveOrders = async (orders) => {
    try {
      await saveLargeData('shopify_orders', orders);
      setOrdini(orders);
    } catch (error) {
      console.error('Errore salvataggio ordini:', error);
      throw error;
    }
  };

  // Funzione per sincronizzare solo gli ultimi ordini (leggera)
  const handleSyncRecentOrders = async () => {
    if (!window.confirm('Vuoi sincronizzare gli ultimi ordini? Questo scaricherà solo gli ordini più recenti.')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('🔄 SINCRONIZZAZIONE ORDINI RECENTI...');
      
      // Verifica credenziali
      try {
        getShopifyCredentials();
      } catch (credError) {
        throw new Error('Credenziali Shopify non configurate. Vai nelle Impostazioni per configurarle.');
      }

      // Carica ordini esistenti
      const existingOrders = await loadLargeData('shopify_orders') || [];
      const existingOrderIds = new Set(existingOrders.map(o => o.id.toString()));

      // Scarica solo gli ultimi ordini (ultimi 3 giorni)
      const response = await fetchShopifyOrders({
        limit: 100,
        status: 'any',
        daysBack: 3
      });

      if (!response.success) {
        throw new Error(response.error || 'Errore nella risposta API');
      }

      const newOrders = response.orders || [];
      
      // Filtra solo ordini nuovi
      const trulyNewOrders = newOrders.filter(order => 
        !existingOrderIds.has(order.id.toString())
      );

      console.log(`📊 Ordini ricevuti: ${newOrders.length}, Nuovi: ${trulyNewOrders.length}`);

      if (trulyNewOrders.length > 0) {
        // Converti e salva solo gli ordini nuovi
        const convertedOrders = trulyNewOrders.map(convertShopifyOrder);
        const allOrders = [...existingOrders, ...convertedOrders];
        
        await saveOrders(allOrders);
        
        setMessage(`✅ Sincronizzazione completata! ${trulyNewOrders.length} ordini nuovi aggiunti`);
      } else {
        setMessage('ℹ️ Nessun ordine nuovo trovato');
      }

    } catch (err) {
      console.error('❌ ERRORE SINCRONIZZAZIONE:', err);
      setError(`Errore sincronizzazione: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per chiamare l'API Shopify
  const fetchShopifyOrders = async (params) => {
    try {
      const credentials = getShopifyCredentials();
      
      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain: credentials.shopDomain,
          accessToken: credentials.accessToken,
          ...params
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Errore chiamata API Shopify:', error);
      return { success: false, error: error.message };
    }
  };

  // Filtri
  const filteredOrdini = ordini.filter(ordine => {
    const matchesSearch = safeIncludes(ordine.order_number?.toString(), searchTerm) ||
                         safeIncludes(ordine.email, searchTerm) ||
                         safeIncludes(ordine.customer?.first_name, searchTerm) ||
                         safeIncludes(ordine.customer?.last_name, searchTerm);
    
    const matchesStatus = statusFilter === 'all' || ordine.financial_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Statistiche
  const totalValue = filteredOrdini.reduce((sum, ordine) => sum + parseFloat(ordine.total_price || 0), 0);
  const totalOrders = filteredOrdini.length;
  const paidOrders = filteredOrdini.filter(o => o.financial_status === 'paid').length;
  const pendingOrders = filteredOrdini.filter(o => o.financial_status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Ordini</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleSyncRecentOrders}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizza Recenti
          </Button>
        </div>
      </div>

      {/* Messaggi */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-700">{message}</span>
          </div>
        </div>
      )}

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center">
              <Database className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totale Ordini</p>
                <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valore Totale</p>
                <p className="text-2xl font-bold text-gray-900">€{totalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pagati</p>
                <p className="text-2xl font-bold text-gray-900">{paidOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Attesa</p>
                <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cerca
              </label>
              <Input
                type="text"
                placeholder="Numero ordine, email, nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tutti</option>
                <option value="paid">Pagati</option>
                <option value="pending">In Attesa</option>
                <option value="refunded">Rimborsati</option>
                <option value="cancelled">Cancellati</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Ordini */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Ordini ({filteredOrdini.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Caricamento...</span>
            </div>
          ) : filteredOrdini.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nessun ordine trovato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordine
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Totale
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prodotti
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrdini.map((ordine) => (
                    <tr key={ordine.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{ordine.order_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ordine.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ordine.customer?.first_name} {ordine.customer?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ordine.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(ordine.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ordine.financial_status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : ordine.financial_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {ordine.financial_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        €{parseFloat(ordine.total_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ordine.line_items?.length || 0} prodotti
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdiniPage;
