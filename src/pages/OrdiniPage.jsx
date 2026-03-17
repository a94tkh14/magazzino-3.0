import React, { useState, useEffect, useRef } from 'react';
import { loadShopifyOrdersData, saveShopifyOrdersData } from '../lib/magazzinoStorage';
import { safeIncludes } from '../lib/utils';
import { convertShopifyOrder, getShopifyCredentials, downloadAllShopifyOrders } from '../lib/shopifyAPI';
import { RefreshCw, AlertCircle, Database, TrendingUp, Clock, Archive, Eye, Download, StopCircle, CheckCircle } from 'lucide-react';
import OrderDetailPage from './OrderDetailPage';

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
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);
  const abortControllerRef = useRef(null);

  // Carica ordini al mount
  useEffect(() => {
    loadOrdini();
  }, []);

  const loadOrdini = async () => {
    try {
      console.log('🔄 Caricando ordini Shopify da Firebase...');
      const data = await loadShopifyOrdersData();
      if (data && data.length > 0) {
        console.log(`✅ Caricati ${data.length} ordini Shopify`);
        setOrdini(data);
      }
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
      setError('Errore nel caricamento degli ordini');
    }
  };

  const saveOrders = async (orders) => {
    try {
      await saveShopifyOrdersData(orders);
      setOrdini(orders);
    } catch (error) {
      console.error('Errore salvataggio ordini:', error);
      throw error;
    }
  };

  // Funzione per sincronizzare TUTTI gli ordini da Shopify
  const handleSyncAllOrders = async () => {
    if (!window.confirm('Vuoi sincronizzare TUTTI gli ordini da Shopify? Questo potrebbe richiedere diversi minuti.')) {
      return;
    }

    setIsSyncingAll(true);
    setError('');
    setMessage('');
    setSyncProgress({ currentPage: 0, ordersDownloaded: 0, currentStatus: 'Inizializzazione...' });

    // Crea AbortController per permettere l'annullamento
    abortControllerRef.current = new AbortController();

    try {
      console.log('🚀 INIZIO SINCRONIZZAZIONE COMPLETA ORDINI SHOPIFY...');
      
      // Verifica credenziali
      try {
        getShopifyCredentials();
      } catch (credError) {
        throw new Error('Credenziali Shopify non configurate. Vai nelle Impostazioni per configurarle.');
      }

      // Scarica tutti gli ordini con progresso
      const allOrders = await downloadAllShopifyOrders(
        (progress) => {
          setSyncProgress(progress);
        },
        abortControllerRef.current
      );

      if (allOrders.length === 0) {
        setMessage('ℹ️ Nessun ordine trovato su Shopify');
        return;
      }

      // Converti e salva tutti gli ordini
      const convertedOrders = allOrders.map(convertShopifyOrder);
      await saveOrders(convertedOrders);
      
      setMessage(`✅ Sincronizzazione completata! ${convertedOrders.length} ordini totali scaricati e salvati.`);
      console.log(`🎉 Sincronizzazione completata: ${convertedOrders.length} ordini`);

    } catch (err) {
      if (err.message.includes('annullato')) {
        setMessage('⚠️ Sincronizzazione annullata dall\'utente');
      } else {
        console.error('❌ ERRORE SINCRONIZZAZIONE:', err);
        setError(`Errore sincronizzazione: ${err.message}`);
      }
    } finally {
      setIsSyncingAll(false);
      setSyncProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Funzione per annullare la sincronizzazione
  const handleCancelSync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setMessage('⏳ Annullamento in corso...');
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
      const existingOrders = await loadShopifyOrdersData() || [];
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
    const orderNumber = ordine.order_number || ordine.orderNumber || '';
    const email = ordine.email || ordine.customerEmail || '';
    const firstName = ordine.customer?.first_name || ordine.customerName || '';
    const lastName = ordine.customer?.last_name || '';
    
    const matchesSearch = safeIncludes(orderNumber.toString(), searchTerm) ||
                         safeIncludes(email, searchTerm) ||
                         safeIncludes(firstName, searchTerm) ||
                         safeIncludes(lastName, searchTerm);
    
    const status = ordine.financial_status || ordine.financialStatus || ordine.status || '';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Funzioni per gestire la visualizzazione dei dettagli
  const handleViewOrder = (orderId) => {
    setSelectedOrderId(orderId);
  };

  const handleBackToList = () => {
    setSelectedOrderId(null);
  };

  // Statistiche
  const totalValue = filteredOrdini.reduce((sum, ordine) => {
    const price = ordine.total_price || ordine.totalPrice || 0;
    return sum + parseFloat(price);
  }, 0);
  const totalOrders = filteredOrdini.length;
  const paidOrders = filteredOrdini.filter(o => {
    const status = o.financial_status || o.financialStatus || o.status || '';
    return status === 'paid';
  }).length;
  const pendingOrders = filteredOrdini.filter(o => {
    const status = o.financial_status || o.financialStatus || o.status || '';
    return status === 'pending';
  }).length;

  // Se è selezionato un ordine, mostra la pagina di dettaglio
  if (selectedOrderId) {
    return <OrderDetailPage orderId={selectedOrderId} onBack={handleBackToList} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Ordini</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleSyncRecentOrders}
            disabled={isLoading || isSyncingAll}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizza Recenti
          </Button>
          
          {!isSyncingAll ? (
            <Button
              onClick={handleSyncAllOrders}
              disabled={isLoading || isSyncingAll}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Scarica TUTTI gli Ordini
            </Button>
          ) : (
            <Button
              onClick={handleCancelSync}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Annulla
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress Bar durante sincronizzazione */}
      {syncProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-800 font-medium">
              <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
              Sincronizzazione in corso...
            </span>
            <span className="text-blue-600 text-sm">
              {syncProgress.ordersDownloaded} ordini scaricati
            </span>
          </div>
          <div className="text-sm text-blue-700 mb-2">
            {syncProgress.currentStatus}
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((syncProgress.currentPage || 0) * 5, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

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
           <p className="text-sm text-gray-600 mt-1">
             Clicca su una riga o sul pulsante "Dettagli" per vedere tutte le informazioni dell'ordine
           </p>
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
                       Spedizione
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Totale
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Prodotti
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Azioni
                     </th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {filteredOrdini.map((ordine) => {
                     const orderNumber = ordine.order_number || ordine.orderNumber || ordine.name || 'N/A';
                     const customerName = ordine.customerName || 
                       (ordine.customer ? `${ordine.customer.first_name || ''} ${ordine.customer.last_name || ''}`.trim() : 'N/A');
                     const email = ordine.email || ordine.customerEmail || '';
                     const createdAt = ordine.created_at || ordine.createdAt;
                     const status = ordine.financial_status || ordine.financialStatus || ordine.status || 'pending';
                     const totalPrice = ordine.total_price || ordine.totalPrice || 0;
                     const shippingCost = ordine.shipping_cost || ordine.shippingPrice || 0;
                     const isShipped = ordine.is_shipped || ordine.fulfillment_status === 'fulfilled';
                     const isFreeShipping = ordine.is_free_shipping || shippingCost === 0;
                     const productsCount = ordine.products?.length || ordine.line_items?.length || ordine.items?.length || 0;
                     
                     return (
                       <tr key={ordine.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewOrder(ordine.id)}>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm font-medium text-gray-900">
                             #{orderNumber}
                           </div>
                           <div className="text-xs text-gray-500">
                             ID: {ordine.id}
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm font-medium text-gray-900">
                             {customerName}
                           </div>
                           <div className="text-sm text-gray-500">
                             {email}
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {createdAt ? new Date(createdAt).toLocaleDateString('it-IT', {
                             day: '2-digit',
                             month: '2-digit',
                             year: 'numeric'
                           }) : 'N/A'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                             status === 'paid' 
                               ? 'bg-green-100 text-green-800'
                               : status === 'pending'
                               ? 'bg-yellow-100 text-yellow-800'
                               : status === 'refunded'
                               ? 'bg-purple-100 text-purple-800'
                               : 'bg-red-100 text-red-800'
                           }`}>
                             {status === 'paid' ? 'Pagato' : 
                              status === 'pending' ? 'In attesa' : 
                              status === 'refunded' ? 'Rimborsato' :
                              status === 'cancelled' ? 'Cancellato' : status}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm">
                             <div className={`font-medium ${
                               isShipped ? 'text-green-600' : 'text-orange-600'
                             }`}>
                               {isShipped ? '✓ SPEDITO' : '○ NON SPEDITO'}
                             </div>
                             <div className="text-xs text-gray-500">
                               {isFreeShipping ? '🎁 Gratuita' : 
                                 new Intl.NumberFormat('it-IT', {
                                   style: 'currency',
                                   currency: 'EUR'
                                 }).format(parseFloat(shippingCost))}
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm font-bold text-gray-900">
                             {new Intl.NumberFormat('it-IT', {
                               style: 'currency',
                               currency: 'EUR'
                             }).format(parseFloat(totalPrice))}
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           <span className="bg-gray-100 px-2 py-1 rounded">
                             {productsCount} {productsCount === 1 ? 'prodotto' : 'prodotti'}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleViewOrder(ordine.id);
                             }}
                             className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
                           >
                             <Eye className="w-4 h-4 mr-1" />
                             Dettagli
                           </button>
                         </td>
                       </tr>
                     );
                   })}
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
