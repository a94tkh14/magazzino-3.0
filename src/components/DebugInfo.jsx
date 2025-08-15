import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';

const DebugInfo = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [magazzinoCount, setMagazzinoCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🧪 Testando connessione a Supabase...');
        
        // Test della connessione
        const { data, error } = await supabase
          .from('magazzino')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.error('❌ Errore connessione:', error);
          setConnectionStatus('error');
          setError(error.message);
        } else {
          console.log('✅ Connessione riuscita!');
          setConnectionStatus('connected');
          
          // Conta i prodotti nel magazzino
          const { count } = await supabase
            .from('magazzino')
            .select('*', { count: 'exact', head: true });
          
          setMagazzinoCount(count || 0);
        }
      } catch (err) {
        console.error('❌ Errore generale:', err);
        setConnectionStatus('error');
        setError(err.message);
      }
    };

    testConnection();
  }, []);

  if (connectionStatus === 'testing') {
    return (
      <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
          Testando connessione database...
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
        <div className="font-bold">❌ Errore Database</div>
        <div className="text-sm">{error}</div>
        <div className="text-xs mt-1">
          Verifica le variabili d'ambiente su Vercel
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
      <div className="font-bold">✅ Database Connesso</div>
      <div className="text-sm">
        Prodotti nel magazzino: {magazzinoCount}
      </div>
      <div className="text-xs mt-1">
        URL: {process.env.REACT_APP_SUPABASE_URL ? 'Configurato' : 'Non configurato'}
      </div>
    </div>
  );
};

export default DebugInfo; 