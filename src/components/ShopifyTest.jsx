import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Button from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ShoppingCart, CheckCircle, XCircle, Loader } from 'lucide-react';

const ShopifyTest = () => {
  const [shopifyConfig, setShopifyConfig] = useState({
    shopDomain: '',
    accessToken: '',
    apiVersion: '2023-10'
  });

  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Carica configurazione salvata
  React.useEffect(() => {
    const saved = localStorage.getItem('shopify_config');
    if (saved) {
      try {
        setShopifyConfig(JSON.parse(saved));
      } catch (error) {
        console.error('Errore nel caricamento configurazione Shopify:', error);
      }
    }
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('shopify_config', JSON.stringify(shopifyConfig));
    alert('Configurazione Shopify salvata!');
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

      // Test 3: Chiamata API tramite nostro proxy
      const response = await fetch('/api/shopify/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: shopifyConfig.shopDomain,
          accessToken: shopifyConfig.accessToken,
          apiVersion: shopifyConfig.apiVersion,
          testType: 'shop'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.shop) {
        setTestResult({
          success: true,
          data: {
            shopName: data.data.shop.name,
            shopEmail: data.data.shop.email,
            shopDomain: data.data.shop.domain,
            currency: data.data.shop.currency,
            timezone: data.data.shop.iana_timezone
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

  const testProductsAPI = async () => {
    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      alert('Configura prima la connessione Shopify');
      return;
    }

    try {
      const response = await fetch('/api/shopify/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: shopifyConfig.shopDomain,
          accessToken: shopifyConfig.accessToken,
          apiVersion: shopifyConfig.apiVersion,
          testType: 'products'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.products) {
        const productCount = data.data.products.length;
        alert(`✅ Connessione prodotti riuscita!\n\nTrovati ${productCount} prodotti\n\nPrimi prodotti:\n${data.data.products.slice(0, 3).map(p => `- ${p.title}`).join('\n') || 'Nessun prodotto'}`);
      } else {
        throw new Error('Risposta API prodotti non valida');
      }

    } catch (error) {
      alert(`❌ Errore nel test prodotti: ${error.message}`);
    }
  };

  const testOrdersAPI = async () => {
    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      alert('Configura prima la connessione Shopify');
      return;
    }

    try {
      const response = await fetch('/api/shopify/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: shopifyConfig.shopDomain,
          accessToken: shopifyConfig.accessToken,
          apiVersion: shopifyConfig.apiVersion,
          testType: 'orders'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.orders) {
        const orderCount = data.data.orders.length;
        alert(`✅ Connessione ordini riuscita!\n\nTrovati ${orderCount} ordini\n\nPrimi ordini:\n${data.data.orders.slice(0, 3).map(o => `- #${o.order_number} - ${o.total_price} ${o.currency}`).join('\n') || 'Nessun ordine'}`);
      } else {
        throw new Error('Risposta API ordini non valida');
      }

    } catch (error) {
      alert(`❌ Errore nel test ordini: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5" />
          <span>Test Integrazione Shopify</span>
        </CardTitle>
        <CardDescription>
          Testa la connessione e le API di Shopify per verificare che tutto funzioni
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configurazione */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="testShopDomain">Dominio Shop</Label>
            <Input
              id="testShopDomain"
              placeholder="mio-shop.myshopify.com"
              value={shopifyConfig.shopDomain}
              onChange={(e) => setShopifyConfig({...shopifyConfig, shopDomain: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="testAccessToken">Access Token</Label>
            <Input
              id="testAccessToken"
              type="password"
              placeholder="shpat_..."
              value={shopifyConfig.accessToken}
              onChange={(e) => setShopifyConfig({...shopifyConfig, accessToken: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="testApiVersion">Versione API</Label>
            <Input
              id="testApiVersion"
              placeholder="2023-10"
              value={shopifyConfig.apiVersion}
              onChange={(e) => setShopifyConfig({...shopifyConfig, apiVersion: e.target.value})}
            />
          </div>
        </div>

        {/* Pulsanti di test */}
        <div className="flex space-x-2">
          <Button onClick={handleSaveConfig} variant="outline" className="flex-1">
            💾 Salva Config
          </Button>
          <Button 
            onClick={testShopifyConnection} 
            disabled={isTesting}
            className="flex-1"
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
        </div>

        {/* Test API specifiche */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={testProductsAPI} variant="outline" size="sm">
            📦 Test Prodotti
          </Button>
          <Button onClick={testOrdersAPI} variant="outline" size="sm">
            📋 Test Ordini
          </Button>
        </div>

        {/* Risultato test */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div className="text-sm">
                {testResult.success ? (
                  <div>
                    <p className="text-green-800 font-medium">✅ Connessione Shopify riuscita!</p>
                    {testResult.data && (
                      <div className="mt-2 text-green-700">
                        <p><strong>Nome Shop:</strong> {testResult.data.shopName}</p>
                        <p><strong>Email:</strong> {testResult.data.shopEmail}</p>
                        <p><strong>Dominio:</strong> {testResult.data.shopDomain}</p>
                        <p><strong>Valuta:</strong> {testResult.data.currency}</p>
                        <p><strong>Timezone:</strong> {testResult.data.timezone}</p>
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
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-2">📋 Come ottenere le credenziali Shopify:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Vai su <strong>Shopify Admin</strong> → <strong>App</strong></li>
            <li>Crea una <strong>App privata</strong></li>
            <li>Configura i <strong>permessi</strong> per prodotti e ordini</li>
            <li>Copia <strong>Access Token</strong> e <strong>Shop Domain</strong></li>
            <li>Incolla qui e testa la connessione</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopifyTest; 