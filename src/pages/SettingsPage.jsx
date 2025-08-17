import React, { useState } from 'react';
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

  const handleShopifySave = () => {
    localStorage.setItem('shopify_config', JSON.stringify(shopifyConfig));
    alert('Configurazione Shopify salvata!');
  };

  const handleGoogleAdsSave = () => {
    localStorage.setItem('google_ads_config', JSON.stringify(googleAdsConfig));
    alert('Configurazione Google Ads salvata!');
  };

  const handleMetaSave = () => {
    localStorage.setItem('meta_config', JSON.stringify(metaConfig));
    alert('Configurazione Meta salvata!');
  };

  const handleDatabaseSave = () => {
    localStorage.setItem('database_config', JSON.stringify(databaseConfig));
    alert('Configurazione database salvata!');
  };

  const handleBackup = () => {
    alert('Backup avviato...');
  };

  const handleRestore = () => {
    alert('Restore avviato...');
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
                    onChange={(e) => setShopifyConfig({...shopifyConfig, shopDomain: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="shpat_..."
                    value={shopifyConfig.accessToken}
                    onChange={(e) => setShopifyConfig({...shopifyConfig, accessToken: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="apiVersion">Versione API</Label>
                <Input
                  id="apiVersion"
                  placeholder="2023-10"
                  value={shopifyConfig.apiVersion}
                  onChange={(e) => setShopifyConfig({...shopifyConfig, apiVersion: e.target.value})}
                />
              </div>
              <Button onClick={handleShopifySave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salva Configurazione Shopify
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
                <Button variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ricarica Configurazioni
                </Button>
                <Button variant="outline" className="w-full">
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