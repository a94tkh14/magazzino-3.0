import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Button from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Bug, 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader,
  RefreshCw,
  Database,
  Globe,
  Key
} from 'lucide-react';

const ShopifyDebug = () => {
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [manualCredentials, setManualCredentials] = useState({
    shopDomain: '',
    accessToken: '',
    apiVersion: '2024-01'
  });

  const addTestResult = (test, status, message, details = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status, // 'success', 'error', 'warning'
      message,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testLocalStorage = () => {
    addTestResult('LocalStorage', 'info', 'Verifica configurazione salvata...');
    
    try {
      const saved = localStorage.getItem('shopify_config');
      if (!saved) {
        addTestResult('LocalStorage', 'error', 'Nessuna configurazione Shopify trovata');
        return false;
      }
      
      const config = JSON.parse(saved);
      addTestResult('LocalStorage', 'success', 'Configurazione trovata', config);
      
      setManualCredentials(config);
      return true;
    } catch (error) {
      addTestResult('LocalStorage', 'error', 'Errore nel parsing configurazione', error.message);
      return false;
    }
  };

  const testCredentials = () => {
    addTestResult('Credenziali', 'info', 'Verifica formato credenziali...');
    
    const { shopDomain, accessToken, apiVersion } = manualCredentials;
    
    if (!shopDomain || !accessToken) {
      addTestResult('Credenziali', 'error', 'Dominio e token mancanti');
      return false;
    }
    
    // Test formato dominio
    const domainRegex = /^[a-zA-Z0-9-]+\.myshopify\.com$/;
    if (!domainRegex.test(shopDomain)) {
      addTestResult('Credenziali', 'error', 'Formato dominio non valido', shopDomain);
      return false;
    }
    
    // Test formato token
    if (!accessToken.startsWith('shpat_')) {
      addTestResult('Credenziali', 'warning', 'Token non inizia con shpat_', accessToken.substring(0, 10) + '...');
    }
    
    addTestResult('Credenziali', 'success', 'Formato credenziali valido');
    return true;
  };

  const testNetlifyFunction = async () => {
    addTestResult('Netlify Function', 'info', 'Test connessione Netlify Function...');
    
    try {
      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: manualCredentials.shopDomain,
          accessToken: manualCredentials.accessToken,
          apiVersion: manualCredentials.apiVersion,
          limit: 1,
          status: 'any'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        addTestResult('Netlify Function', 'error', `Errore HTTP ${response.status}`, errorText);
        return false;
      }
      
      const data = await response.json();
      addTestResult('Netlify Function', 'success', 'Funzione risponde correttamente', data);
      return true;
      
    } catch (error) {
      addTestResult('Netlify Function', 'error', 'Errore di connessione', error.message);
      return false;
    }
  };

  const testShopifyAPI = async () => {
    addTestResult('Shopify API', 'info', 'Test connessione diretta a Shopify...');
    
    try {
      const apiUrl = `https://${manualCredentials.shopDomain}/admin/api/${manualCredentials.apiVersion}/shop.json`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': manualCredentials.accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        addTestResult('Shopify API', 'error', `Errore Shopify ${response.status}`, errorText);
        return false;
      }
      
      const data = await response.json();
      addTestResult('Shopify API', 'success', 'Connessione Shopify riuscita', {
        shopName: data.shop?.name,
        domain: data.shop?.domain,
        email: data.shop?.email
      });
      return true;
      
    } catch (error) {
      addTestResult('Shopify API', 'error', 'Errore di connessione', error.message);
      return false;
    }
  };

  const testOrdersAPI = async () => {
    addTestResult('Orders API', 'info', 'Test API ordini Shopify...');
    
    try {
      const apiUrl = `https://${manualCredentials.shopDomain}/admin/api/${manualCredentials.apiVersion}/orders.json?limit=1`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': manualCredentials.accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        addTestResult('Orders API', 'error', `Errore ordini ${response.status}`, errorText);
        return false;
      }
      
      const data = await response.json();
      addTestResult('Orders API', 'success', 'API ordini funzionante', {
        ordersCount: data.orders?.length || 0,
        hasOrders: data.orders && data.orders.length > 0
      });
      return true;
      
    } catch (error) {
      addTestResult('Orders API', 'error', 'Errore API ordini', error.message);
      return false;
    }
  };

  const runFullTest = async () => {
    setIsTesting(true);
    clearResults();
    
    addTestResult('Test Completo', 'info', 'Avvio test diagnostici...');
    
    // Test 1: LocalStorage
    const hasConfig = testLocalStorage();
    if (!hasConfig) {
      setIsTesting(false);
      return;
    }
    
    // Test 2: Credenziali
    const validCredentials = testCredentials();
    if (!validCredentials) {
      setIsTesting(false);
      return;
    }
    
    // Test 3: Netlify Function
    const netlifyWorks = await testNetlifyFunction();
    
    // Test 4: Shopify API diretta
    const shopifyWorks = await testShopifyAPI();
    
    // Test 5: Orders API
    const ordersWork = await testOrdersAPI();
    
    // Riepilogo
    if (netlifyWorks && shopifyWorks && ordersWork) {
      addTestResult('Riepilogo', 'success', 'Tutti i test sono passati! Shopify dovrebbe funzionare.');
    } else {
      addTestResult('Riepilogo', 'error', 'Alcuni test sono falliti. Controlla i dettagli sopra.');
    }
    
    setIsTesting(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Bug className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bug className="h-5 w-5" />
          <span>Debug Shopify - Diagnostica Completa</span>
        </CardTitle>
        <CardDescription>
          Testa ogni componente dell'integrazione Shopify per identificare dove si blocca
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credenziali manuali */}
        <div className="space-y-4">
          <h3 className="font-medium">🔑 Credenziali per Test</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="debugShopDomain">Dominio Shop</Label>
              <Input
                id="debugShopDomain"
                placeholder="mio-shop.myshopify.com"
                value={manualCredentials.shopDomain}
                onChange={(e) => setManualCredentials(prev => ({...prev, shopDomain: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="debugAccessToken">Access Token</Label>
              <Input
                id="debugAccessToken"
                type="password"
                placeholder="shpat_..."
                value={manualCredentials.accessToken}
                onChange={(e) => setManualCredentials(prev => ({...prev, accessToken: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="debugApiVersion">Versione API</Label>
              <Input
                id="debugApiVersion"
                placeholder="2024-01"
                value={manualCredentials.apiVersion}
                onChange={(e) => setManualCredentials(prev => ({...prev, apiVersion: e.target.value}))}
              />
            </div>
          </div>
        </div>

        {/* Pulsanti test */}
        <div className="flex gap-2">
          <Button 
            onClick={runFullTest} 
            disabled={isTesting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isTesting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Test in corso...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Esegui Test Completo
              </>
            )}
          </Button>
          
          <Button 
            onClick={clearResults} 
            variant="outline"
          >
            🗑️ Pulisci Risultati
          </Button>
        </div>

        {/* Risultati test */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">📊 Risultati Test</h3>
            {testResults.map((result) => (
              <div 
                key={result.id} 
                className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{result.test}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-600">
                          Dettagli
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                          {typeof result.details === 'string' 
                            ? result.details 
                            : JSON.stringify(result.details, null, 2)
                          }
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Istruzioni */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Bug className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">🔍 Come usare il debug:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Inserisci le credenziali Shopify (o carica da localStorage)</li>
                <li>Clicca "Esegui Test Completo"</li>
                <li>Analizza i risultati per identificare il problema</li>
                <li>Risolvi il problema specifico indicato</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopifyDebug; 