import React, { useState } from 'react';
import { safeToFixed, formatPrice, formatPercentage, isValidNumber, safeParseFloat, safeParseInt } from '../lib/utils';

function SafeNumberTest() {
  const [testResults, setTestResults] = useState([]);

  const runTests = () => {
    const results = [];

    // Test 1: safeToFixed con valori validi
    try {
      const result1 = safeToFixed(123.456, 2);
      results.push({ test: 'safeToFixed(123.456, 2)', result: result1, expected: '123.46', status: result1 === '123.46' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeToFixed(123.456, 2)', result: 'ERROR', expected: '123.46', status: '❌', error: error.message });
    }

    // Test 2: safeToFixed con undefined
    try {
      const result2 = safeToFixed(undefined, 2);
      results.push({ test: 'safeToFixed(undefined, 2)', result: result2, expected: '0.00', status: result2 === '0.00' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeToFixed(undefined, 2)', result: 'ERROR', expected: '0.00', status: '❌', error: error.message });
    }

    // Test 3: safeToFixed con null
    try {
      const result3 = safeToFixed(null, 2);
      results.push({ test: 'safeToFixed(null, 2)', result: result3, expected: '0.00', status: result3 === '0.00' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeToFixed(null, 2)', result: 'ERROR', expected: '0.00', status: '❌', error: error.message });
    }

    // Test 4: safeToFixed con stringa non numerica
    try {
      const result4 = safeToFixed('abc', 2);
      results.push({ test: 'safeToFixed("abc", 2)', result: result4, expected: '0.00', status: result4 === '0.00' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'safeToFixed("abc", 2)', result: 'ERROR', expected: '0.00', status: '❌', error: error.message });
    }

    // Test 5: formatPrice con valore valido
    try {
      const result5 = formatPrice(99.99);
      results.push({ test: 'formatPrice(99.99)', result: result5, expected: '€99.99', status: result5 === '€99.99' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'formatPrice(99.99)', result: 'ERROR', expected: '€99.99', status: '❌', error: error.message });
    }

    // Test 6: formatPrice con undefined
    try {
      const result6 = formatPrice(undefined);
      results.push({ test: 'formatPrice(undefined)', result: result6, expected: '€0.00', status: result6 === '€0.00' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'formatPrice(undefined)', result: 'ERROR', expected: '€0.00', status: '❌', error: error.message });
    }

    // Test 7: formatPercentage con valore valido
    try {
      const result7 = formatPercentage(25.5);
      results.push({ test: 'formatPercentage(25.5)', result: result7, expected: '25.5%', status: result7 === '25.5%' ? '✅' : '❌' });
    } catch (error) {
      results.push({ test: 'formatPercentage(25.5)', result: 'ERROR', expected: '25.5%', status: '❌', error: error.message });
    }

    // Test 8: isValidNumber con valori validi
    try {
      const result8a = isValidNumber(123);
      const result8b = isValidNumber('456.78');
      const result8c = isValidNumber(undefined);
      const result8d = isValidNumber('abc');
      
      results.push({ 
        test: 'isValidNumber tests', 
        result: `${result8a}, ${result8b}, ${result8c}, ${result8d}`, 
        expected: 'true, true, false, false', 
        status: (result8a && result8b && !result8c && !result8d) ? '✅' : '❌' 
      });
    } catch (error) {
      results.push({ test: 'isValidNumber tests', result: 'ERROR', expected: 'true, true, false, false', status: '❌', error: error.message });
    }

    // Test 9: safeParseFloat con valori validi
    try {
      const result9a = safeParseFloat('123.45');
      const result9b = safeParseFloat(undefined, 999);
      const result9c = safeParseFloat('abc', 888);
      
      results.push({ 
        test: 'safeParseFloat tests', 
        result: `${result9a}, ${result9b}, ${result9c}`, 
        expected: '123.45, 999, 888', 
        status: (result9a === 123.45 && result9b === 999 && result9c === 888) ? '✅' : '❌' 
      });
    } catch (error) {
      results.push({ test: 'safeParseFloat tests', result: 'ERROR', expected: '123.45, 999, 888', status: '❌', error: error.message });
    }

    // Test 10: safeParseInt con valori validi
    try {
      const result10a = safeParseInt('123');
      const result10b = safeParseInt(undefined, 777);
      const result10c = safeParseInt('abc', 666);
      
      results.push({ 
        test: 'safeParseInt tests', 
        result: `${result10a}, ${result10b}, ${result10c}`, 
        expected: '123, 777, 666', 
        status: (result10a === 123 && result10b === 777 && result10c === 666) ? '✅' : '❌' 
      });
    } catch (error) {
      results.push({ test: 'safeParseInt tests', result: 'ERROR', expected: '123, 777, 666', status: '❌', error: error.message });
    }

    setTestResults(results);
  };

  const clearTests = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🔢 Test Funzioni Sicure per Numeri
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
        <p>📋 Questo test verifica che le funzioni sicure per i numeri:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Gestiscano correttamente i valori undefined/null</li>
          <li>Convertano stringhe in numeri in modo sicuro</li>
          <li>Forniscano valori di fallback appropriati</li>
          <li>Prevenghino errori toFixed()</li>
        </ul>
      </div>
    </div>
  );
}

export default SafeNumberTest; 