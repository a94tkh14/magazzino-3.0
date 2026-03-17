import React, { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

function SimpleFirebaseTest() {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testFirebase = async () => {
    setIsLoading(true);
    setTestResult('Testando...');
    
    try {
      // Test 1: Prova a scrivere un documento
      console.log('🔍 Iniziando test Firebase...');
      console.log('📁 Database:', db);
      
      const testData = {
        message: 'Test Firebase',
        timestamp: new Date().toISOString(),
        test: true
      };
      
      console.log('📝 Dati da scrivere:', testData);
      
      const docRef = await addDoc(collection(db, 'test'), testData);
      console.log('✅ Documento scritto con ID:', docRef.id);
      
      // Test 2: Prova a leggere i documenti
      const querySnapshot = await getDocs(collection(db, 'test'));
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('📖 Documenti letti:', documents);
      
      setTestResult(`✅ SUCCESSO! 
        - Scritto documento con ID: ${docRef.id}
        - Letti ${documents.length} documenti
        - Firebase funziona correttamente!`);
        
    } catch (error) {
      console.error('❌ Errore Firebase:', error);
      setTestResult(`❌ ERRORE: ${error.message}
        
        🔍 Dettagli:
        - Codice: ${error.code}
        - Messaggio: ${error.message}
        
        💡 Possibili cause:
        - Database Firestore non creato
        - Regole di sicurezza troppo restrittive
        - Configurazione Firebase errata`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🔥 Test Semplice Firebase
      </h3>
      
      <button
        onClick={testFirebase}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Testando...' : 'Testa Firebase'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-4 rounded-lg bg-gray-50 border">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {testResult}
          </pre>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>📋 Questo test:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Prova a scrivere un documento nella collezione 'test'</li>
          <li>Prova a leggere tutti i documenti dalla collezione 'test'</li>
          <li>Mostra errori dettagliati se qualcosa non funziona</li>
        </ul>
      </div>
    </div>
  );
}

export default SimpleFirebaseTest; 