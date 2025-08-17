import React, { useState, useEffect } from 'react';
import { fetchShopifyOrders } from '../lib/shopifyAPI';
import { saveLargeData, loadLargeData, cleanupOldData } from '../lib/dataManager';
import { Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';

const OrdiniPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ active: false, count: 0, page: 1 });

  useEffect(() => {
    const loadOrders = async () => {
      try {
        // Prima carica da localStorage per mostrare subito qualcosa
        const parsedOrders = await loadLargeData('shopify_orders');
        setOrders(parsedOrders);
        console.log(`✅ Caricati ${parsedOrders.length} ordini da localStorage`);
        
        // Poi sincronizza automaticamente con Shopify per avere i dati più recenti
        if (parsedOrders.length === 0) {
          console.log('🔄 Nessun ordine in locale, avvio sincronizzazione automatica...');
          await handleSyncOrders(true); // Forza sincronizzazione completa
        } else {
          console.log('🔄 Ordini presenti in locale, sincronizzazione incrementale...');
          await handleSyncOrders(false); // Sincronizzazione incrementale (ultimi 7 giorni)
        }
        
        // Pulisci dati vecchi (più di 30 giorni)
        await cleanupOldData('shopify_orders', 30);
      } catch (error) {
        console.error('Errore nel caricare ordini:', error);
        setOrders([]);
        
        // Se c'è un errore, prova comunque a sincronizzare
        try {
          console.log('🔄 Tentativo di sincronizzazione dopo errore...');
          await handleSyncOrders(true);
        } catch (syncError) {
          console.error('Errore anche nella sincronizzazione:', syncError);
          setError('Errore nel caricamento ordini. Verifica la configurazione Shopify.');
        }
      }
    };
    loadOrders();
  }, []);

  const handleSyncOrders = async (fullSync = false) => {
    try {
      setIsLoading(true);
      setError('');
      setMessage('');
      setProgress({ active: true, count: 0, page: 1 });

      console.log(`🔄 Avvio sincronizzazione ${fullSync ? 'completa' : 'incrementale'}...`);
      
      // Per sincronizzazione completa, non usare limiti
      // Per sincronizzazione incrementale, usa solo ultimi 7 giorni
      const daysBack = fullSync ? null : 7;
      const limit = fullSync ? 250 : 50; // Aumento il limite per sincronizzazioni complete
      
      const newOrders = await fetchShopifyOrders(
        limit, 
        'any', 
        (count, page) => {
          setProgress({ active: true, count, page });
        },
        daysBack
      );

      if (newOrders && newOrders.length > 0) {
        // Se è sincronizzazione completa, sostituisci tutti gli ordini
        if (fullSync) {
          await saveLargeData('shopify_orders', newOrders);
          setOrders(newOrders);
          setMessage(`✅ Sincronizzazione completa completata! Scaricati ${newOrders.length} ordini totali.`);
        } else {
          // Se è incrementale, unisci con quelli esistenti
          const existingOrders = await loadLargeData('shopify_orders') || [];
          const existingIds = new Set(existingOrders.map(o => o.id));
          const uniqueNewOrders = newOrders.filter(order => !existingIds.has(order.id));
          
          if (uniqueNewOrders.length > 0) {
            const allOrders = [...existingOrders, ...uniqueNewOrders];
            await saveLargeData('shopify_orders', allOrders);
            setOrders(allOrders);
            setMessage(`✅ Sincronizzazione incrementale completata! Aggiunti ${uniqueNewOrders.length} nuovi ordini. Totale: ${allOrders.length}`);
          } else {
            setMessage('✅ Nessun nuovo ordine trovato. Tutto aggiornato!');
          }
        }
        
        console.log(`✅ Sincronizzazione completata: ${newOrders.length} ordini scaricati`);
      } else {
        setMessage('ℹ️ Nessun ordine trovato da Shopify');
      }
    } catch (error) {
      console.error('❌ Errore durante la sincronizzazione:', error);
      setError(`Errore durante la sincronizzazione: ${error.message}`);
    } finally {
      setIsLoading(false);
      setProgress({ active: false, count: 0, page: 1 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ordini</h1>
          <p className="text-gray-600">
            {orders.length > 0 
              ? `${orders.length} ordini caricati` 
              : 'Nessun ordine trovato'
            }
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={() => handleSyncOrders(false)}
            disabled={isLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizza Incrementale</span>
          </Button>
          
          <Button
            onClick={() => handleSyncOrders(true)}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Sincronizza Completa</span>
          </Button>
        </div>
      </div>

      {/* Indicatori di stato */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-blue-800 font-medium">Sincronizzazione in corso...</p>
              {progress.active && (
                <p className="text-blue-600 text-sm">
                  Pagina {progress.page} - {progress.count} ordini scaricati
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800">{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Lista ordini semplificata */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Ordini</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 20).map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Ordine #{order.order_number}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('it-IT')} - {order.financial_status}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items?.length || 0} prodotti - Totale: €{parseFloat(order.total_price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {orders.length > 20 && (
                <p className="text-center text-gray-600">
                  Mostrando i primi 20 ordini su {orders.length} totali
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-600">
              Nessun ordine caricato. Usa i pulsanti di sincronizzazione per scaricare gli ordini da Shopify.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdiniPage; 