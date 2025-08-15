import React, { useState, useEffect } from 'react';
import { loadMagazzino, loadStock, loadOrdini, loadStorico, loadSettings, loadSupplierOrders } from '../lib/firebase';

const DatabaseDebug = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [tableCounts, setTableCounts] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testDatabaseConnection();
  }, []);

  const testDatabaseConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test connessione base
      const { data, error: connectionError } = await supabase
        .from('magazzino')
        .select('count', { count: 'exact', head: true });

      if (connectionError) {
        throw new Error(`Errore connessione: ${connectionError.message}`);
      }

      setConnectionStatus('connected');

      // Test caricamento dati da tutte le tabelle
      const counts = {};
      
      try {
        const magazzino = await loadMagazzino();
        counts.magazzino = magazzino.length;
      } catch (e) {
        counts.magazzino = 'Errore: ' + e.message;
      }

      try {
        const stock = await loadStock();
        counts.stock = stock.length;
      } catch (e) {
        counts.stock = 'Errore: ' + e.message;
      }

      try {
        const ordini = await loadOrdini();
        counts.ordini = ordini.length;
      } catch (e) {
        counts.ordini = 'Errore: ' + e.message;
      }

      try {
        const storico = await loadStorico();
        counts.storico = storico.length;
      } catch (e) {
        counts.storico = 'Errore: ' + e.message;
      }

      try {
        const settings = await loadSettings();
        counts.settings = settings ? 1 : 0;
      } catch (e) {
        counts.settings = 'Errore: ' + e.message;
      }

      try {
        const supplierOrders = await loadSupplierOrders();
        counts.supplier_orders = supplierOrders.length;
      } catch (e) {
        counts.supplier_orders = 'Errore: ' + e.message;
      }

      setTableCounts(counts);

    } catch (err) {
      setConnectionStatus('error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    try {
      setLoading(true);
      
      // Crea dati di esempio
      const sampleMagazzino = [
        {
          sku: 'SAMPLE001',
          nome: 'Prodotto di Test 1',
          categoria: 'Test',
          prezzo_vendita: 25.00,
          prezzo_acquisto: 15.00,
          quantita_disponibile: 100,
          quantita_minima: 10,
          fornitore: 'Fornitore Test'
        },
        {
          sku: 'SAMPLE002',
          nome: 'Prodotto di Test 2',
          categoria: 'Test',
          prezzo_vendita: 35.00,
          prezzo_acquisto: 20.00,
          quantita_disponibile: 50,
          quantita_minima: 5,
          fornitore: 'Fornitore Test'
        }
      ];

      // Salva i dati di esempio
      for (const prodotto of sampleMagazzino) {
        await supabase
          .from('magazzino')
          .upsert(prodotto, { onConflict: 'sku' });
      }

      // Ricarica i conteggi
      await testDatabaseConnection();
      
    } catch (err) {
      setError('Errore nel creare dati di esempio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Sei sicuro di voler cancellare tutti i dati? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Cancella tutti i dati
      await supabase.from('storico').delete().neq('id', 0);
      await supabase.from('stock').delete().neq('id', 0);
      await supabase.from('ordini').delete().neq('id', 0);
      await supabase.from('supplier_orders').delete().neq('id', 0);
      await supabase.from('magazzino').delete().neq('id', 0);
      
      // Ricarica i conteggi
      await testDatabaseConnection();
      
    } catch (err) {
      setError('Errore nel cancellare i dati: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">🔍 Debug Database</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">🔍 Debug Database</h2>
      
      {/* Status connessione */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">Stato Connessione:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus === 'connected' ? '✅ Connesso' :
             connectionStatus === 'error' ? '❌ Errore' : '⏳ Testando...'}
          </span>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Conteggi tabelle */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Conteggi Tabelle:</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(tableCounts).map(([table, count]) => (
            <div key={table} className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-sm">{table}</div>
              <div className="text-lg font-bold">
                {typeof count === 'number' ? count : count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Azioni */}
      <div className="space-y-3">
        <button
          onClick={testDatabaseConnection}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          🔄 Ricarica Dati
        </button>
        
        <button
          onClick={createSampleData}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          ➕ Crea Dati di Esempio
        </button>
        
        <button
          onClick={clearAllData}
          className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          🗑️ Cancella Tutti i Dati
        </button>
      </div>

      {/* Informazioni ambiente */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold mb-2">Informazioni Ambiente:</h4>
        <div className="text-sm space-y-1">
          <div>URL Supabase: {process.env.REACT_APP_SUPABASE_URL || 'Non configurato'}</div>
          <div>Chiave Anon: {process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Configurata' : 'Non configurata'}</div>
          <div>Ambiente: {process.env.NODE_ENV}</div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseDebug; 