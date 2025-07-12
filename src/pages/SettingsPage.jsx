import React, { useState, useEffect } from 'react';
import LogoUpload from '../components/LogoUpload';

export default function SettingsPage() {
  const [shop, setShop] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [apiVersion, setApiVersion] = useState('2023-04');
  const [message, setMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('shopify_settings');
    if (saved) {
      const { shop, apiKey, apiPassword, apiVersion } = JSON.parse(saved);
      setShop(shop || '');
      setApiKey(apiKey || '');
      setApiPassword(apiPassword || '');
      setApiVersion(apiVersion || '2023-04');
    }
  }, []);

  const saveSettings = () => {
    const settings = {
      shop,
      apiKey,
      apiPassword,
      apiVersion
    };
    localStorage.setItem('shopify_settings', JSON.stringify(settings));
    setMessage('Impostazioni salvate con successo!');
    setTimeout(() => setMessage(''), 3000);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult('');
    
    try {
      const response = await fetch(`http://localhost:3002/api/shopify/test?shop=${encodeURIComponent(shop)}&apiKey=${encodeURIComponent(apiKey)}&apiPassword=${encodeURIComponent(apiPassword)}&apiVersion=${encodeURIComponent(apiVersion)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult(`✅ Connessione riuscita! Ordini trovati: ${result.orderCount}`);
      } else {
        setTestResult(`❌ Errore: ${result.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Errore di connessione: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogoChange = (logoData) => {
    console.log('Logo cambiato:', logoData);
  };

  const handleNameChange = (newName) => {
    console.log('Nome cambiato:', newName);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Impostazioni</h1>
          <p className="text-gray-600">
            Configura le impostazioni dell'applicazione e la connessione Shopify
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personalizzazione Brand */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Personalizzazione Brand</h2>
            <LogoUpload 
              onLogoChange={handleLogoChange}
              onNameChange={handleNameChange}
            />
          </div>

          {/* Impostazioni Shopify */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Impostazioni Shopify</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Domain
                </label>
                <input
                  type="text"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  placeholder="tuo-shop.myshopify.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Inserisci la tua API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Password
                </label>
                <input
                  type="password"
                  value={apiPassword}
                  onChange={(e) => setApiPassword(e.target.value)}
                  placeholder="Inserisci la tua API Password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Version
                </label>
                <select
                  value={apiVersion}
                  onChange={(e) => setApiVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2023-04">2023-04</option>
                  <option value="2023-07">2023-07</option>
                  <option value="2023-10">2023-10</option>
                  <option value="2024-01">2024-01</option>
                  <option value="2024-04">2024-04</option>
                  <option value="2024-07">2024-07</option>
                  <option value="2024-10">2024-10</option>
                  <option value="2025-01">2025-01</option>
                  <option value="2025-04">2025-04</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Salva Impostazioni
                </button>
                <button
                  onClick={testConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isTesting ? 'Testando...' : 'Testa Connessione'}
                </button>
              </div>

              {message && (
                <div className="p-3 bg-green-100 text-green-700 rounded-md">
                  {message}
                </div>
              )}

              {testResult && (
                <div className={`p-3 rounded-md ${
                  testResult.includes('✅') 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {testResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 