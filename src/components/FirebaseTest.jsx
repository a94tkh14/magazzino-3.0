import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

const FirebaseTest = () => {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testFirebaseConnection = async () => {
    setIsLoading(true);
    setTestResult('🔄 Testando connessione Firebase...');
    
    try {
      // Test 1: Prova a scrivere un documento di test
      const testDoc = await addDoc(collection(db, 'test'), {
        message: 'Test connessione Firebase',
        timestamp: serverTimestamp(),
        test: true
      });
      
      setTestResult(`✅ Scrittura riuscita! ID: ${testDoc.id}`);
      
      // Test 2: Prova a leggere i documenti
      const querySnapshot = await getDocs(collection(db, 'test'));
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      
      setTestResult(prev => `${prev}\n✅ Lettura riuscita! Documenti: ${docs.length}`);
      
      // Test 3: Pulisci i documenti di test
      // (opzionale, per non riempire il database)
      
    } catch (error) {
      console.error('❌ Errore test Firebase:', error);
      setTestResult(`❌ Errore: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Test Connessione Firebase</h2>
      
      <button
        onClick={testFirebaseConnection}
        disabled={isLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Testando...' : 'Testa Firebase'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Questo test verifica:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Connessione a Firebase</li>
          <li>Permessi di scrittura</li>
          <li>Permessi di lettura</li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseTest; 