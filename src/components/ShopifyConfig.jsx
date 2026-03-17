import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Button from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  ShoppingCart, 
  CheckCircle, 
  XCircle, 
  Loader, 
  Eye, 
  EyeOff,
  Settings,
  TestTube,
  AlertTriangle,
  Info
} from 'lucide-react';

const ShopifyConfig = () => {
  const [shopifyConfig, setShopifyConfig] = useState({
    shopDomain: '',
    accessToken: '',
    apiVersion: '2024-01'
  });

  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carica configurazione salvata
  useEffect(() => {
    const saved = localStorage.getItem('shopify_config');
    if (saved) {
      try {
        setShopifyConfig(JSON.parse(saved));
      } catch (error) {
        console.error('Errore nel caricamento configurazione Shopify:', error);
      }
    }
  }, []);

  const handleSaveConfig = async () => {
    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      setTestResult({
        success: false,
        error: 'Dominio shop e access token sono richiesti'
      });
      return;
    }

    setIsSaving(true);
    try {
      localStorage.setItem('shopify_config', JSON.stringify(shopifyConfig));
      setTestResult({
        success: true,
        message: 'Configurazione Shopify salvata con successo!'
      });
      
      // Pulisci il messaggio dopo 3 secondi
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Errore nel salvare la configurazione'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testShopifyConnection = async () => {
    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      setTestResult({
        success: false,
        error: 'Dominio shop e access token sono richiesti'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test 1: Verifica formato dominio
      const domainRegex = /^[a-zA-Z0-9-]+\.myshopify\.com$/;
      if (!domainRegex.test(shopifyConfig.shopDomain)) {
        throw new Error('Formato dominio non valido. Deve essere: nome-shop.myshopify.com');
      }

      // Test 2: Verifica formato access token
      if (!shopifyConfig.accessToken.startsWith('shpat_')) {
        throw new Error('Access token non valido. Deve iniziare con "shpat_"');
      }

      // Test 3: Chiamata API tramite Netlify Function
      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: shopifyConfig.shopDomain,
          accessToken: shopifyConfig.accessToken,
          apiVersion: shopifyConfig.apiVersion,
          limit: 1,
          status: 'any'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTestResult({
          success: true,
          data: {
            message: 'Connessione Shopify riuscita!',
            ordersCount: data.totalCount || 0,
            apiVersion: data.metadata?.apiVersion,
            timestamp: data.metadata?.timestamp
          }
        });
      } else {
        throw new Error('Risposta API non valida');
      }

    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testOrdersSync = async () => {
    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      setTestResult({
        success: false,
        error: 'Configura prima la connessione Shopify'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: shopifyConfig.shopDomain,
          accessToken: shopifyConfig.accessToken,
          apiVersion: shopifyConfig.apiVersion,
          limit: 10,
          status: 'any',
          daysBack: 7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const orderCount = data.totalCount || 0;
        setTestResult({
          success: true,
          data: {
            message: `Test sincronizzazione ordini riuscito!`,
            ordersCount: orderCount,
            recentOrders: data.orders?.length || 0,
            apiVersion: data.metadata?.apiVersion
          }
        });
      } else {
        throw new Error('Risposta API ordini non valida');
      }

    } catch (error) {
      setTestResult({
        success: false,
        error: `Errore nel test ordini: ${error.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const clearConfig = () => {
    if (window.confirm('Sei sicuro di voler cancellare la configurazione Shopify? Questo rimuoverà tutte le credenziali salvate.')) {
      localStorage.removeItem('shopify_config');
      setShopifyConfig({
        shopDomain: '',
        accessToken: '',
        apiVersion: '2024-01'
      });
      setTestResult(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5" />
          <span>Configurazione Shopify</span>
        </CardTitle>
        <CardDescription>
          Configura le credenziali per connettere la tua app al tuo store Shopify
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configurazione */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="shopDomain">Dominio Shop *</Label>
            <Input
              id="shopDomain"
              placeholder="mio-shop.myshopify.com"
              value={shopifyConfig.shopDomain}
              onChange={(e) => setShopifyConfig({...shopifyConfig, shopDomain: e.target.value})}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Il dominio del tuo store Shopify (es: mio-shop.myshopify.com)
            </p>
          </div>
          
          <div>
            <Label htmlFor="accessToken">Access Token *</Label>
            <div className="relative mt-1">
              <Input
                id="accessToken"
                type={showToken ? 'text' : 'password'}
                placeholder="shpat_..."
                value={shopifyConfig.accessToken}
                onChange={(e) => setShopifyConfig({...shopifyConfig, accessToken: e.target.value})}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Il token di accesso privato della tua app Shopify
            </p>
          </div>
          
          <div>
            <Label htmlFor="apiVersion">Versione API</Label>
            <Input
              id="apiVersion"
              placeholder="2024-01"
              value={shopifyConfig.apiVersion}
              onChange={(e) => setShopifyConfig({...shopifyConfig, apiVersion: e.target.value})}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Versione dell'API Shopify (raccomandato: 2024-01)
            </p>
          </div>
        </div>

        {/* Pulsanti azioni */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSaveConfig} 
            disabled={isSaving || !shopifyConfig.shopDomain || !shopifyConfig.accessToken}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                💾 Salva Configurazione
              </>
            )}
          </Button>
          
          <Button 
            onClick={testShopifyConnection} 
            disabled={isTesting || !shopifyConfig.shopDomain || !shopifyConfig.accessToken}
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            {isTesting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                🔍 Test Connessione
              </>
            )}
          </Button>
          
          <Button 
            onClick={testOrdersSync} 
            disabled={isTesting || !shopifyConfig.shopDomain || !shopifyConfig.accessToken}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {isTesting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                📋 Test Ordini
              </>
            )}
          </Button>
          
          <Button 
            onClick={clearConfig} 
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            🗑️ Cancella Config
          </Button>
        </div>

        {/* Risultato test */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-3">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                {testResult.success ? (
                  <div>
                    <p className="text-green-800 font-medium">{testResult.data?.message || 'Test riuscito!'}</p>
                    {testResult.data && (
                      <div className="mt-2 text-green-700 text-sm">
                        {testResult.data.ordersCount !== undefined && (
                          <p><strong>Ordini disponibili:</strong> {testResult.data.ordersCount}</p>
                        )}
                        {testResult.data.recentOrders !== undefined && (
                          <p><strong>Ordini recenti (7 giorni):</strong> {testResult.data.recentOrders}</p>
                        )}
                        {testResult.data.apiVersion && (
                          <p><strong>Versione API:</strong> {testResult.data.apiVersion}</p>
                        )}
                        {testResult.data.timestamp && (
                          <p><strong>Timestamp:</strong> {new Date(testResult.data.timestamp).toLocaleString('it-IT')}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-red-800 font-medium">❌ Errore: {testResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Istruzioni */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">📋 Come ottenere le credenziali Shopify:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Vai su <strong>Shopify Admin</strong> → <strong>App</strong></li>
                <li>Crea una <strong>App privata</strong></li>
                <li>Configura i <strong>permessi</strong> per:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Ordini (read_orders)</li>
                    <li>Prodotti (read_products)</li>
                    <li>Clienti (read_customers)</li>
                  </ul>
                </li>
                <li>Copia <strong>Access Token</strong> e <strong>Shop Domain</strong></li>
                <li>Incolla qui e testa la connessione</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Avvertenze sicurezza */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">⚠️ Sicurezza:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>L'access token è salvato solo nel tuo browser (localStorage)</li>
                <li>Non condividerlo mai con altri</li>
                <li>Se compromesso, rigeneralo immediatamente da Shopify Admin</li>
                <li>L'app richiede solo permessi di lettura per la sicurezza</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopifyConfig; 