import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import MagazzinoReset from '../components/MagazzinoReset';
import ShopifyTest from '../components/ShopifyTest';
import { 
  Settings, 
  Database, 
  Cloud, 
  Key, 
  Globe, 
  ShoppingCart,
  BarChart3,
  FileText,
  Upload,
  Download,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
  const [shopifyConfig, setShopifyConfig] = useState({
    shopDomain: '',
    accessToken: '',
    apiVersion: '2023-10'
  });

  const [googleAdsConfig, setGoogleAdsConfig] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    customerId: ''
  });

  const [metaConfig, setMetaConfig] = useState({
    accessToken: '',
    pixelId: ''
  });

  const [databaseConfig, setDatabaseConfig] = useState({
    backupEnabled: true,
    autoBackup: true,
    backupInterval: '24'
  });

  // Stato per tracciare le modifiche non salvate
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({
    shopify: false,
    googleAds: false,
    meta: false,
    database: false
  });

  // Funzione per aggiornare lo stato delle modifiche
  const updateChangeStatus = (configType, hasChanges) => {
    setHasUnsavedChanges(prev => ({
      ...prev,
      [configType]: hasChanges
    }));
  };

  // Carica le configurazioni salvate quando la pagina si apre
  useEffect(() => {
    // Carica configurazione Shopify
    const savedShopify = localStorage.getItem('shopify_config');
    if (savedShopify) {
      try {
        const parsed = JSON.parse(savedShopify);
        setShopifyConfig(parsed);
        console.log('✅ Configurazione Shopify caricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel caricare configurazione Shopify:', error);
      }
    }

    // Carica configurazione Google Ads
    const savedGoogleAds = localStorage.getItem('google_ads_config');
    if (savedGoogleAds) {
      try {
        const parsed = JSON.parse(savedGoogleAds);
        setGoogleAdsConfig(parsed);
        console.log('✅ Configurazione Google Ads caricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel caricare configurazione Google Ads:', error);
      }
    }

    // Carica configurazione Meta
    const savedMeta = localStorage.getItem('meta_config');
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        setMetaConfig(parsed);
        console.log('✅ Configurazione Meta caricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel caricare configurazione Meta:', error);
      }
    }

    // Carica configurazione Database
    const savedDatabase = localStorage.getItem('database_config');
    if (savedDatabase) {
      try {
        const parsed = JSON.parse(savedDatabase);
        setDatabaseConfig(parsed);
        console.log('✅ Configurazione Database caricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel caricare configurazione Database:', error);
      }
    }
  }, []);

  const handleShopifySave = () => {
    localStorage.setItem('shopify_config', JSON.stringify(shopifyConfig));
    updateChangeStatus('shopify', false);
    console.log('💾 Configurazione Shopify salvata:', shopifyConfig);
    alert('✅ Configurazione Shopify salvata con successo!');
  };

  const handleGoogleAdsSave = () => {
    localStorage.setItem('google_ads_config', JSON.stringify(googleAdsConfig));
    updateChangeStatus('googleAds', false);
    console.log('💾 Configurazione Google Ads salvata:', googleAdsConfig);
    alert('✅ Configurazione Google Ads salvata con successo!');
  };

  const handleMetaSave = () => {
    localStorage.setItem('meta_config', JSON.stringify(metaConfig));
    updateChangeStatus('meta', false);
    console.log('💾 Configurazione Meta salvata:', metaConfig);
    alert('✅ Configurazione Meta salvata con successo!');
  };

  const handleDatabaseSave = () => {
    localStorage.setItem('database_config', JSON.stringify(databaseConfig));
    updateChangeStatus('database', false);
    console.log('💾 Configurazione Database salvata:', databaseConfig);
    alert('✅ Configurazione Database salvata con successo!');
  };

  // Ricarica manualmente tutte le configurazioni
  const handleReloadConfigs = () => {
    // Ricarica configurazione Shopify
    const savedShopify = localStorage.getItem('shopify_config');
    if (savedShopify) {
      try {
        const parsed = JSON.parse(savedShopify);
        setShopifyConfig(parsed);
        console.log('🔄 Configurazione Shopify ricaricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel ricaricare configurazione Shopify:', error);
      }
    }

    // Ricarica configurazione Google Ads
    const savedGoogleAds = localStorage.getItem('google_ads_config');
    if (savedGoogleAds) {
      try {
        const parsed = JSON.parse(savedGoogleAds);
        setGoogleAdsConfig(parsed);
        console.log('🔄 Configurazione Google Ads ricaricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel ricaricare configurazione Google Ads:', error);
      }
    }

    // Ricarica configurazione Meta
    const savedMeta = localStorage.getItem('meta_config');
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        setMetaConfig(parsed);
        console.log('🔄 Configurazione Meta ricaricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel ricaricare configurazione Meta:', error);
      }
    }

    // Ricarica configurazione Database
    const savedDatabase = localStorage.getItem('database_config');
    if (savedDatabase) {
      try {
        const parsed = JSON.parse(savedDatabase);
        setDatabaseConfig(parsed);
        console.log('🔄 Configurazione Database ricaricata:', parsed);
      } catch (error) {
        console.error('❌ Errore nel ricaricare configurazione Database:', error);
      }
    }

    alert('🔄 Tutte le configurazioni sono state ricaricate!');
  };

  const handleBackup = () => {
    alert('Backup avviato...');
  };

  const handleRestore = () => {
    alert('Restore avviato...');
  };

  // Reset tutte le impostazioni ai valori predefiniti
  const handleResetSettings = () => {
    if (confirm('⚠️ Sei sicuro di voler resettare tutte le impostazioni? Questa azione non può essere annullata.')) {
      // Reset configurazione Shopify
      setShopifyConfig({
        shopDomain: '',
        accessToken: '',
        apiVersion: '2023-10'
      });
      localStorage.removeItem('shopify_config');

      // Reset configurazione Google Ads
      setGoogleAdsConfig({
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        customerId: ''
      });
      localStorage.removeItem('google_ads_config');

      // Reset configurazione Meta
      setMetaConfig({
        accessToken: '',
        pixelId: ''
      });
      localStorage.removeItem('meta_config');

      // Reset configurazione Database
      setDatabaseConfig({
        backupEnabled: true,
        autoBackup: true,
        backupInterval: '24'
      });
      localStorage.removeItem('database_config');

      console.log('🗑️ Tutte le impostazioni sono state resettate');
      alert('🗑️ Tutte le impostazioni sono state resettate ai valori predefiniti!');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-600">Gestisci le configurazioni dell'applicazione</p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Integrazioni</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Database</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Backup</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Avanzate</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Test Integrazione Shopify */}
          <ShopifyTest />

          {/* Configurazione Shopify */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Configurazione Shopify</span>
              </CardTitle>
              <CardDescription>
                Configura l'integrazione con Shopify per sincronizzare ordini e prodotti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shopDomain">Dominio Shop</Label>
                  <Input
                    id="shopDomain"
                    placeholder="mio-shop.myshopify.com"
                    value={shopifyConfig.shopDomain}
                    onChange={(e) => {
                      setShopifyConfig({...shopifyConfig, shopDomain: e.target.value});
                      updateChangeStatus('shopify', true);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="shpat_..."
                    value={shopifyConfig.accessToken}
                    onChange={(e) => {
                      setShopifyConfig({...shopifyConfig, accessToken: e.target.value});
                      updateChangeStatus('shopify', true);
                    }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="apiVersion">Versione API</Label>
                <Input
                  id="apiVersion"
                  placeholder="2023-10"
                  value={shopifyConfig.apiVersion}
                  onChange={(e) => {
                    setShopifyConfig({...shopifyConfig, apiVersion: e.target.value});
                    updateChangeStatus('shopify', true);
                  }}
                />
              </div>
              <Button 
                onClick={handleShopifySave} 
                className={`w-full ${hasUnsavedChanges.shopify ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                disabled={!hasUnsavedChanges.shopify}
              >
                <Save className="h-4 w-4 mr-2" />
                {hasUnsavedChanges.shopify ? '⚠️ Salva Modifiche Shopify' : '✅ Configurazione Salvata'}
              </Button>
            </CardContent>
          </Card>

          {/* Configurazione Google Ads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Google Ads</span>
              </CardTitle>
              <CardDescription>
                Configura l'integrazione con Google Ads per il tracking delle campagne
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    placeholder="123456789-..."
                    value={googleAdsConfig.clientId}
                    onChange={(e) => setGoogleAdsConfig({...googleAdsConfig, clientId: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="GOCSPX-..."
                    value={googleAdsConfig.clientSecret}
                    onChange={(e) => setGoogleAdsConfig({...googleAdsConfig, clientSecret: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="refreshToken">Refresh Token</Label>
                  <Input
                    id="refreshToken"
                    type="password"
                    placeholder="1//..."
                    value={googleAdsConfig.refreshToken}
                    onChange={(e) => setGoogleAdsConfig({...googleAdsConfig, refreshToken: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="customerId">Customer ID</Label>
                  <Input
                    id="customerId"
                    placeholder="123-456-7890"
                    value={googleAdsConfig.customerId}
                    onChange={(e) => setGoogleAdsConfig({...googleAdsConfig, customerId: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleGoogleAdsSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salva Configurazione Google Ads
              </Button>
            </CardContent>
          </Card>

          {/* Configurazione Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Meta (Facebook/Instagram)</span>
              </CardTitle>
              <CardDescription>
                Configura l'integrazione con Meta per il tracking delle campagne pubblicitarie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="metaAccessToken">Access Token</Label>
                  <Input
                    id="metaAccessToken"
                    type="password"
                    placeholder="EAAG..."
                    value={metaConfig.accessToken}
                    onChange={(e) => setMetaConfig({...metaConfig, accessToken: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="pixelId">Pixel ID</Label>
                  <Input
                    id="pixelId"
                    placeholder="123456789"
                    value={metaConfig.pixelId}
                    onChange={(e) => setMetaConfig({...metaConfig, pixelId: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleMetaSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salva Configurazione Meta
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          {/* Configurazione Database */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Configurazione Database</span>
              </CardTitle>
              <CardDescription>
                Gestisci le impostazioni del database e le operazioni di backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="backupEnabled"
                    checked={databaseConfig.backupEnabled}
                    onChange={(e) => setDatabaseConfig({...databaseConfig, backupEnabled: e.target.checked})}
                  />
                  <Label htmlFor="backupEnabled">Abilita backup automatici</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoBackup"
                    checked={databaseConfig.autoBackup}
                    onChange={(e) => setDatabaseConfig({...databaseConfig, autoBackup: e.target.checked})}
                  />
                  <Label htmlFor="autoBackup">Backup automatico</Label>
                </div>
                <div>
                  <Label htmlFor="backupInterval">Intervallo backup (ore)</Label>
                  <Input
                    id="backupInterval"
                    type="number"
                    min="1"
                    max="168"
                    value={databaseConfig.backupInterval}
                    onChange={(e) => setDatabaseConfig({...databaseConfig, backupInterval: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleDatabaseSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salva Configurazione Database
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          {/* Operazioni di Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Operazioni di Backup</span>
              </CardTitle>
              <CardDescription>
                Gestisci i backup e il ripristino dei dati
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={handleBackup} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Crea Backup
                </Button>
                <Button onClick={handleRestore} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Ripristina Backup
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <p>• Backup completi: Tutti i dati dell'applicazione</p>
                <p>• Backup incrementali: Solo le modifiche recenti</p>
                <p>• Ripristino: Sostituisce completamente i dati esistenti</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Impostazioni Avanzate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Impostazioni Avanzate</span>
              </CardTitle>
              <CardDescription>
                Configurazioni avanzate e strumenti di debug
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={handleReloadConfigs} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ricarica Configurazioni
                </Button>
                <Button variant="outline" onClick={handleResetSettings} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Impostazioni
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <p>• Ricarica: Rilegge tutte le configurazioni</p>
                <p>• Reset: Ripristina le impostazioni predefinite</p>
                <p>• Debug: Abilita log dettagliati</p>
              </div>
            </CardContent>
          </Card>

          {/* Reset Completo Magazzino */}
          <MagazzinoReset />
        </TabsContent>
      </Tabs>
    </div>
  );
} 