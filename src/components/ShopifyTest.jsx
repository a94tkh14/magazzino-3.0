import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Button from './ui/button';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader, 
  Download,
  Archive,
  Package,
  TrendingUp
} from 'lucide-react';

const ShopifyTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testType, setTestType] = useState('');

  const testShopifyConnection = async () => {
    const shopifyConfig = localStorage.getItem('shopify_config');
    if (!shopifyConfig) {
      setTestResult({
        success: false,
        error: 'Configura prima la connessione Shopify'
      });
      return;
    }

    try {
      const config = JSON.parse(shopifyConfig);
      if (!config.shopDomain || !config.accessToken) {
        setTestResult({
          success: false,
          error: 'Configurazione Shopify incompleta'
        });
        return;
      }

      setIsTesting(true);
      setTestType('Connessione');
      setTestResult(null);

      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: config.shopDomain,
          accessToken: config.accessToken,
          apiVersion: config.apiVersion,
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
            message: '✅ Connessione Shopify riuscita!',
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
      setTestType('');
    }
  };

  const testOrdersSync = async () => {
    const shopifyConfig = localStorage.getItem('shopify_config');
    if (!shopifyConfig) {
      setTestResult({
        success: false,
        error: 'Configura prima la connessione Shopify'
      });
      return;
    }

    try {
      const config = JSON.parse(shopifyConfig);
      if (!config.shopDomain || !config.accessToken) {
        setTestResult({
          success: false,
          error: 'Configurazione Shopify incompleta'
        });
        return;
      }

      setIsTesting(true);
      setTestType('Sincronizzazione Ordini');
      setTestResult(null);

      const response = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: config.shopDomain,
          accessToken: config.accessToken,
          apiVersion: config.apiVersion,
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
        const orderTypes = data.metadata?.orderTypes || {};
        
        setTestResult({
          success: true,
          data: {
            message: `✅ Test sincronizzazione ordini riuscito!`,
            ordersCount: orderCount,
            recentOrders: data.orders?.length || 0,
            apiVersion: data.metadata?.apiVersion,
            orderTypes: orderTypes,
            hasPagination: !!data.pagination,
            paginationMethod: data.metadata?.paginationMethod
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
      setTestType('');
    }
  };

  const testArchivedOrders = async () => {
    const shopifyConfig = localStorage.getItem('shopify_config');
    if (!shopifyConfig) {
      setTestResult({
        success: false,
        error: 'Configura prima la connessione Shopify'
      });
      return;
    }

    try {
      const config = JSON.parse(shopifyConfig);
      if (!config.shopDomain || !config.accessToken) {
        setTestResult({
          success: false,
          error: 'Configurazione Shopify incompleta'
        });
        return;
      }

      setIsTesting(true);
      setTestType('Ordini Archiviati');
      setTestResult(null);

      // Test ordini cancellati
      const cancelledResponse = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: config.shopDomain,
          accessToken: config.accessToken,
          apiVersion: config.apiVersion,
          limit: 5,
          status: 'cancelled'
        })
      });

      if (!cancelledResponse.ok) {
        const errorData = await cancelledResponse.json();
        throw new Error(errorData.error || `Errore HTTP: ${cancelledResponse.status}`);
      }

      const cancelledData = await cancelledResponse.json();
      
      // Test ordini rimborsati
      const refundedResponse = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: config.shopDomain,
          accessToken: config.accessToken,
          apiVersion: config.apiVersion,
          limit: 5,
          status: 'refunded'
        })
      });

      if (!refundedResponse.ok) {
        const errorData = await refundedResponse.json();
        throw new Error(errorData.error || `Errore HTTP: ${refundedResponse.status}`);
      }

      const refundedData = await refundedResponse.json();

      if (cancelledData.success && refundedData.success) {
        const cancelledCount = cancelledData.totalCount || 0;
        const refundedCount = refundedData.totalCount || 0;
        const totalArchived = cancelledCount + refundedCount;
        
        setTestResult({
          success: true,
          data: {
            message: `✅ Test ordini archiviati riuscito!`,
            cancelledOrders: cancelledCount,
            refundedOrders: refundedCount,
            totalArchived: totalArchived,
            apiVersion: config.apiVersion,
            canAccessArchived: totalArchived > 0 || (cancelledData.orders?.length > 0 || refundedData.orders?.length > 0)
          }
        });
      } else {
        throw new Error('Risposta API ordini archiviati non valida');
      }

    } catch (error) {
      setTestResult({
        success: false,
        error: `Errore nel test ordini archiviati: ${error.message}`
      });
    } finally {
      setIsTesting(false);
      setTestType('');
    }
  };

  const testPagination = async () => {
    const shopifyConfig = localStorage.getItem('shopify_config');
    if (!shopifyConfig) {
      setTestResult({
        success: false,
        error: 'Configura prima la connessione Shopify'
      });
      return;
    }

    try {
      const config = JSON.parse(shopifyConfig);
      if (!config.shopDomain || !config.accessToken) {
        setTestResult({
          success: false,
          error: 'Configurazione Shopify incompleta'
        });
        return;
      }

      setIsTesting(true);
      setTestType('Paginazione');
      setTestResult(null);

      // Prima chiamata
      const firstResponse = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: config.shopDomain,
          accessToken: config.accessToken,
          apiVersion: config.apiVersion,
          limit: 3,
          status: 'any'
        })
      });

      if (!firstResponse.ok) {
        const errorData = await firstResponse.json();
        throw new Error(errorData.error || `Errore HTTP: ${firstResponse.status}`);
      }

      const firstData = await firstResponse.json();
      
      if (!firstData.success || !firstData.pagination) {
        setTestResult({
          success: true,
          data: {
            message: '✅ Test paginazione completato (nessuna paginazione necessaria)',
            ordersInFirstPage: firstData.totalCount || 0,
            hasPagination: false,
            reason: 'Numero ordini insufficiente per paginazione'
          }
        });
        return;
      }

      // Seconda chiamata con paginazione
      if (firstData.pagination.next && firstData.pagination.next.pageInfo) {
        const secondResponse = await fetch('/.netlify/functions/shopify-sync-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shopDomain: config.shopDomain,
            accessToken: config.accessToken,
            apiVersion: config.apiVersion,
            limit: 3,
            pageInfo: firstData.pagination.next.pageInfo
          })
        });

        if (!secondResponse.ok) {
          const errorData = await secondResponse.json();
          throw new Error(errorData.error || `Errore HTTP: ${secondResponse.status}`);
        }

        const secondData = await secondResponse.json();

        setTestResult({
          success: true,
          data: {
            message: '✅ Test paginazione riuscito!',
            ordersInFirstPage: firstData.totalCount || 0,
            ordersInSecondPage: secondData.totalCount || 0,
            hasPagination: true,
            paginationMethod: firstData.metadata?.paginationMethod || 'unknown',
            totalOrders: (firstData.totalCount || 0) + (secondData.totalCount || 0)
          }
        });
      } else {
        setTestResult({
          success: true,
          data: {
            message: '✅ Test paginazione completato',
            ordersInFirstPage: firstData.totalCount || 0,
            hasPagination: false,
            reason: 'Nessuna pagina successiva disponibile'
          }
        });
      }

    } catch (error) {
      setTestResult({
        success: false,
        error: `Errore nel test paginazione: ${error.message}`
      });
    } finally {
      setIsTesting(false);
      setTestType('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TestTube className="h-5 w-5" />
          <span>Test Shopify</span>
        </CardTitle>
        <CardDescription>
          Testa le diverse funzionalità della connessione Shopify
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pulsanti test */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={testShopifyConnection} 
            disabled={isTesting}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {isTesting && testType === 'Connessione' ? (
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
            disabled={isTesting}
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            {isTesting && testType === 'Sincronizzazione Ordini' ? (
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
            onClick={testArchivedOrders} 
            disabled={isTesting}
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {isTesting && testType === 'Ordini Archiviati' ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Test Archiviati
              </>
            )}
          </Button>
          
          <Button 
            onClick={testPagination} 
            disabled={isTesting}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            {isTesting && testType === 'Paginazione' ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Test Paginazione
              </>
            )}
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
                      <div className="mt-2 text-green-700 text-sm space-y-1">
                        {testResult.data.ordersCount !== undefined && (
                          <p><strong>Ordini disponibili:</strong> {testResult.data.ordersCount}</p>
                        )}
                        {testResult.data.recentOrders !== undefined && (
                          <p><strong>Ordini recenti (7 giorni):</strong> {testResult.data.recentOrders}</p>
                        )}
                        {testResult.data.apiVersion && (
                          <p><strong>Versione API:</strong> {testResult.data.apiVersion}</p>
                        )}
                        {testResult.data.orderTypes && (
                          <div>
                            <p><strong>Tipi ordini:</strong></p>
                            <ul className="ml-4 list-disc">
                              <li>Attivi: {testResult.data.orderTypes.active}</li>
                              <li>Archiviati: {testResult.data.orderTypes.archived}</li>
                              <li>Cancellati: {testResult.data.orderTypes.cancelled}</li>
                              <li>Rimborsati: {testResult.data.orderTypes.refunded}</li>
                            </ul>
                          </div>
                        )}
                        {testResult.data.hasPagination !== undefined && (
                          <p><strong>Paginazione:</strong> {testResult.data.hasPagination ? 'Sì' : 'No'}</p>
                        )}
                        {testResult.data.paginationMethod && (
                          <p><strong>Metodo paginazione:</strong> {testResult.data.paginationMethod}</p>
                        )}
                        {testResult.data.cancelledOrders !== undefined && (
                          <p><strong>Ordini cancellati:</strong> {testResult.data.cancelledOrders}</p>
                        )}
                        {testResult.data.refundedOrders !== undefined && (
                          <p><strong>Ordini rimborsati:</strong> {testResult.data.refundedOrders}</p>
                        )}
                        {testResult.data.totalArchived !== undefined && (
                          <p><strong>Totale archiviati:</strong> {testResult.data.totalArchived}</p>
                        )}
                        {testResult.data.canAccessArchived !== undefined && (
                          <p><strong>Accesso archiviati:</strong> {testResult.data.canAccessArchived ? '✅ Sì' : '❌ No'}</p>
                        )}
                        {testResult.data.ordersInFirstPage !== undefined && (
                          <p><strong>Ordini prima pagina:</strong> {testResult.data.ordersInFirstPage}</p>
                        )}
                        {testResult.data.ordersInSecondPage !== undefined && (
                          <p><strong>Ordini seconda pagina:</strong> {testResult.data.ordersInSecondPage}</p>
                        )}
                        {testResult.data.totalOrders !== undefined && (
                          <p><strong>Totale ordini:</strong> {testResult.data.totalOrders}</p>
                        )}
                        {testResult.data.reason && (
                          <p><strong>Motivo:</strong> {testResult.data.reason}</p>
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
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">🧪 Cosa testano questi pulsanti:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Test Connessione:</strong> Verifica che le credenziali Shopify siano valide</li>
              <li><strong>Test Ordini:</strong> Scarica un campione di ordini recenti</li>
              <li><strong>Test Archiviati:</strong> Verifica l'accesso agli ordini cancellati e rimborsati</li>
              <li><strong>Test Paginazione:</strong> Verifica che la paginazione funzioni correttamente</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopifyTest; 