import React, { useState } from 'react';
import { safeString, safeToLowerCase, safeIncludes, normalizeString } from '../lib/utils';

function SafeStringTest() {
  const [testResults, setTestResults] = useState([]);

  const runTests = () => {
    const results = [];

    // Test 1: safeString con valori validi
    try {
      const result1 = safeString('Hello World');
      results.push({ test: 'safeString("Hello World")', result: result1, expected: 'Hello World', status: result1 === 'Hello World' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeString("Hello World")', result: 'ERROR', expected: 'Hello World', status: '❌', error: error.message });
    }

    // Test 2: safeString con undefined
    try {
      const result2 = safeString(undefined);
      results.push({ test: 'safeString(undefined)', result: result2, expected: '', status: result2 === '' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeString(undefined)', result: 'ERROR', expected: '', status: '❌', error: error.message });
    }

    // Test 3: safeString con null
    try {
      const result3 = safeString(null);
      results.push({ test: 'safeString(null)', result: result3, expected: '', status: result3 === '' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeString(null)', result: 'ERROR', expected: '', status: '❌', error: error.message });
    }

    // Test 4: safeString con numero
    try {
      const result4 = safeString(123);
      results.push({ test: 'safeString(123)', result: result4, expected: '', status: result4 === '' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeString(123)', result: 'ERROR', expected: '', status: '❌', error: error.message });
    }

    // Test 5: safeToLowerCase con valore valido
    try {
      const result5 = safeToLowerCase('HELLO WORLD');
      results.push({ test: 'safeToLowerCase("HELLO WORLD")', result: result5, expected: 'hello world', status: result5 === 'hello world' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeToLowerCase("HELLO WORLD")', result: 'ERROR', expected: 'hello world', status: '❌', error: error.message });
    }

    // Test 6: safeToLowerCase con undefined
    try {
      const result6 = safeToLowerCase(undefined);
      results.push({ test: 'safeToLowerCase(undefined)', result: result6, expected: '', status: result6 === '' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeToLowerCase(undefined)', result: 'ERROR', expected: '', status: '❌', error: error.message });
    }

    // Test 7: safeIncludes con valori validi
    try {
      const result7a = safeIncludes('Hello World', 'World');
      const result7b = safeIncludes('Hello World', 'world', false);
      const result7c = safeIncludes('Hello World', 'WORLD');
      
      results.push({ 
        test: 'safeIncludes tests', 
        result: `${result7a}, ${result7b}, ${result7c}`, 
        expected: 'true, false, true', 
        status: (result7a && !result7b && result7c) ? '✅' : '❌' 
      });
    } catch (error) {
      results.push({ test: 'safeIncludes tests', result: 'ERROR', expected: 'true, false, true', status: '❌', error: error.message });
    }

    // Test 8: safeIncludes con valori undefined
    try {
      const result8a = safeIncludes(undefined, 'test');
      const result8b = safeIncludes('test', undefined);
      const result8c = safeIncludes(undefined, undefined);
      
      results.push({ 
        test: 'safeIncludes with undefined', 
        result: `${result8a}, ${result8b}, ${result8c}`, 
        expected: 'false, true, true', 
        status: (!result8a && result8b && result8c) ? '✅' : '❌' 
      });
    } catch (error) {
      results.push({ test: 'safeIncludes with undefined', result: 'ERROR', expected: 'false, true, true', status: '❌', error: error.message });
    }

    // Test 9: normalizeString con valori validi
    try {
      const result9a = normalizeString('Café');
      const result9b = normalizeString('Beyoncé');
      const result9c = normalizeString('São Paulo');
      
      results.push({ 
        test: 'normalizeString tests', 
        result: `${result9a}, ${result9b}, ${result9c}`, 
        expected: 'cafe, beyonce, sao paulo', 
        status: (result9a === 'cafe' && result9b === 'beyonce' && result9c === 'sao paulo') ? '✅' : '❌' 
      });
    } catch (error) {
      results.push({ test: 'normalizeString tests', result: 'ERROR', expected: 'cafe, beyonce, sao paulo', status: '❌', error: error.message });
    }

    // Test 10: normalizeString con valori undefined
    try {
      const result10a = normalizeString(undefined);
      const result10b = normalizeString(null);
      const result10c = normalizeString('');
      
      results.push({ 
        test: 'normalizeString with undefined/null', 
        result: `${result10a}, ${result10b}, ${result10c}`, 
        expected: ', , ', 
        status: (result10a === '' && result10b === '' && result10c === '') ? '✅' : '❌' 
      });
    } catch (error) {
      results.push({ test: 'normalizeString with undefined/null', result: 'ERROR', expected: ', , ', status: '❌', error: error.message });
    }

    setTestResults(results);
  };

  const clearTests = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🔤 Test Funzioni Sicure per Stringhe
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={runTests}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Esegui Test
        </button>
        
        <button
          onClick={clearTests}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 ml-2"
        >
          Pulisci Risultati
        </button>
      </div>
      
      {testResults.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-700 mb-3">📊 Risultati Test:</h4>
          <div className="space-y-2">
            {testResults.map((test, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{test.test}</span>
                  <span className="text-lg">{test.status}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <div><strong>Risultato:</strong> {test.result}</div>
                  <div><strong>Atteso:</strong> {test.expected}</div>
                  {test.error && <div className="text-red-600"><strong>Errore:</strong> {test.error}</div>}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border">
            <div className="text-sm text-blue-700">
              <strong>Riepilogo:</strong> {testResults.filter(t => t.status === '✅').length} su {testResults.length} test superati
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>📋 Questo test verifica che le funzioni sicure per le stringhe:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Gestiscano correttamente i valori undefined/null</li>
          <li>Convertano stringhe in minuscolo in modo sicuro</li>
          <li>Eseguano ricerche case-insensitive in modo sicuro</li>
          <li>Normalizzino stringhe con accenti in modo sicuro</li>
          <li>Prevenghino errori toLowerCase()</li>
        </ul>
      </div>
    </div>
  );
}

export default SafeStringTest; 