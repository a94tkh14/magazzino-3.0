import React, { useState } from 'react';
import { saveMagazzino, loadMagazzino } from '../lib/firebase';

function FirebaseMagazzinoTest() {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magazzinoData, setMagazzinoData] = useState([]);

  const testSaveMagazzino = async () => {
    setIsLoading(true);
    setTestResult('Testando salvataggio magazzino...');
    
    try {
      // Test 1: Salva un prodotto di test
      console.log('🔍 Iniziando test salvataggio magazzino...');
      
      const testProduct = {
        sku: 'TEST-' + Date.now(),
        nome: 'Prodotto Test Firebase',
        quantita: 100,
        prezzo: 25.99,
        anagrafica: 'Test',
        tipologia: 'Test',
        marca: 'Test'
      };
      
      console.log('📝 Prodotto da salvare:', testProduct);
      
      const saveResult = await saveMagazzino(testProduct);
      console.log('✅ Risultato salvataggio:', saveResult);
      
      if (saveResult.success) {
        setTestResult(`✅ SALVATAGGIO RIUSCITO! 
          - Prodotto salvato con ID: ${saveResult.id}
          - SKU: ${testProduct.sku}
          - Firebase funziona correttamente!`);
      } else {
        throw new Error(saveResult.error);
      }
        
    } catch (error) {
      console.error('❌ Errore salvataggio magazzino:', error);
      setTestResult(`❌ ERRORE SALVATAGGIO: ${error.message}
        
        🔍 Dettagli:
        - Codice: ${error.code || 'N/A'}
        - Messaggio: ${error.message}
        
        💡 Possibili cause:
        - Database Firestore non creato
        - Regole di sicurezza troppo restrittive
        - Configurazione Firebase errata`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLoadMagazzino = async () => {
    setIsLoading(true);
    setTestResult('Caricando dati magazzino...');
    
    try {
      console.log('🔍 Caricando dati magazzino da Firebase...');
      
      const result = await loadMagazzino();
      console.log('✅ Risultato caricamento:', result);
      
      if (result.success) {
        setMagazzinoData(result.data);
        setTestResult(`✅ CARICAMENTO RIUSCITO! 
          - Caricati ${result.data.length} prodotti
          - Firebase funziona correttamente!`);
      } else {
        throw new Error(result.error);
      }
        
    } catch (error) {
      console.error('❌ Errore caricamento magazzino:', error);
      setTestResult(`❌ ERRORE CARICAMENTO: ${error.message}
        
        🔍 Dettagli:
        - Codice: ${error.code || 'N/A'}
        - Messaggio: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestData = async () => {
    setIsLoading(true);
    setTestResult('Pulendo dati di test...');
    
    try {
      // Per ora puliamo solo lo stato locale
      setMagazzinoData([]);
      setTestResult('✅ Dati di test puliti!');
    } catch (error) {
      setTestResult(`❌ Errore nella pulizia: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🗄️ Test Magazzino Firebase
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={testSaveMagazzino}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testando...' : 'Testa Salvataggio'}
        </button>
        
        <button
          onClick={testLoadMagazzino}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          {isLoading ? 'Caricando...' : 'Testa Caricamento'}
        </button>
        
        <button
          onClick={clearTestData}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          Pulisci Dati
        </button>
      </div>
      
      {testResult && (
        <div className="mt-4 p-4 rounded-lg bg-gray-50 border">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {testResult}
          </pre>
        </div>
      )}
      
      {magazzinoData.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700 mb-2">📊 Dati Magazzino ({magazzinoData.length} prodotti):</h4>
          <div className="max-h-60 overflow-y-auto">
            {magazzinoData.map((item, index) => (
              <div key={index} className="p-2 bg-gray-100 rounded mb-2 text-sm">
                <strong>SKU:</strong> {item.sku} | 
                <strong>Nome:</strong> {item.nome} | 
                <strong>Qty:</strong> {item.quantita} | 
                <strong>Prezzo:</strong> €{item.prezzo}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>📋 Questo test:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Prova a salvare un prodotto di test nel magazzino Firebase</li>
          <li>Prova a caricare tutti i prodotti dal magazzino Firebase</li>
          <li>Mostra i dati caricati in tempo reale</li>
          <li>Mostra errori dettagliati se qualcosa non funziona</li>
        </ul>
      </div>
    </div>
  );
}

export default FirebaseMagazzinoTest; 