import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import MagazzinoReset from '../components/MagazzinoReset';
import ShopifyConfig from '../components/ShopifyConfig';
import ShopifyDebug from '../components/ShopifyDebug';
import CSVUpload from '../components/CSVUpload';
import { saveLargeData, loadLargeData } from '../lib/dataManager';
import { downloadAllShopifyOrders, convertShopifyOrder, getShopifyCredentials } from '../lib/shopifyAPI';
import { migrateLocalDataToFirebase, invalidateCache } from '../lib/magazzinoStorage';
import { 
  Settings, 
  Database, 
  Globe, 
  BarChart3,
  FileText,
  Upload,
  Download,
  Trash2,
  Save,
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  StopCircle,
  CloudUpload,
  Loader2
} from 'lucide-react';

export default function SettingsPage() {
  // Stati per sincronizzazione Shopify
  const [isSyncingShopify, setIsSyncingShopify] = useState(false);
  const [shopifySyncProgress, setShopifySyncProgress] = useState(null);
  const [shopifySyncMessage, setShopifySyncMessage] = useState('');
  const [shopifySyncError, setShopifySyncError] = useState('');
  const [ordersCount, setOrdersCount] = useState(0);
  const abortControllerRef = useRef(null);

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

  // Stati per migrazione Firebase
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);



  // Carica le configurazioni salvate quando la pagina si apre
  useEffect(() => {
    // Carica conteggio ordini salvati
    const loadOrdersCount = async () => {
      try {
        const orders = await loadLargeData('shopify_orders');
        if (orders) {
          setOrdersCount(orders.length);
        }
      } catch (error) {
        console.error('Errore caricamento ordini:', error);
      }
    };
    loadOrdersCount();

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

  

  const handleGoogleAdsSave = () => {
    localStorage.setItem('google_ads_config', JSON.stringify(googleAdsConfig));
    console.log('💾 Configurazione Google Ads salvata:', googleAdsConfig);
    window.alert('✅ Configurazione Google Ads salvata con successo!');
  };

  const handleMetaSave = () => {
    localStorage.setItem('meta_config', JSON.stringify(metaConfig));
    console.log('💾 Configurazione Meta salvata:', metaConfig);
    window.alert('✅ Configurazione Meta salvata con successo!');
  };

  const handleDatabaseSave = () => {
    localStorage.setItem('database_config', JSON.stringify(databaseConfig));
    console.log('💾 Configurazione Database salvata:', databaseConfig);
    window.alert('✅ Configurazione Database salvata con successo!');
  };

  // Ricarica manualmente tutte le configurazioni
  const handleReloadConfigs = () => {


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

    window.alert('🔄 Tutte le configurazioni sono state ricaricate!');
  };

  const handleBackup = () => {
    window.alert('Backup avviato...');
  };

  const handleRestore = () => {
    window.alert('Restore avviato...');
  };

  // Funzione per migrare dati locali a Firebase
  const handleMigrateToFirebase = async () => {
    if (!window.confirm('Vuoi migrare tutti i dati locali su Firebase?\n\nQuesto sincronizzerà:\n- Magazzino\n- Ordini Shopify\n- Ordini Fornitori\n- Prima Nota\n- Conti Bancari\n\nI dati saranno accessibili da qualsiasi dispositivo.')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await migrateLocalDataToFirebase();
      setMigrationResult(result);
      invalidateCache();
      window.alert(`✅ Migrazione completata!\n\n📦 Magazzino: ${result.magazzino} prodotti\n🛒 Ordini Shopify: ${result.shopifyOrders}\n🚚 Ordini Fornitori: ${result.supplierOrders}\n📝 Prima Nota: ${result.primaNota} movimenti\n🏦 Conti Bancari: ${result.contiBancari}`);
    } catch (error) {
      console.error('Errore migrazione:', error);
      window.alert('❌ Errore durante la migrazione: ' + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  // Funzione per sincronizzare TUTTI gli ordini Shopify
  const handleSyncAllShopifyOrders = async () => {
    if (!window.confirm('Vuoi sincronizzare TUTTI gli ordini da Shopify?\n\nQuesto scaricherà tutti gli ordini disponibili e potrebbe richiedere diversi minuti.')) {
      return;
    }

    setIsSyncingShopify(true);
    setShopifySyncError('');
    setShopifySyncMessage('');
    setShopifySyncProgress({ currentPage: 0, ordersDownloaded: 0, currentStatus: 'Inizializzazione...' });

    abortControllerRef.current = new AbortController();

    try {
      // Verifica credenziali
      try {
        getShopifyCredentials();
      } catch (credError) {
        throw new Error('Credenziali Shopify non configurate. Configura prima la connessione Shopify sopra.');
      }

      // Scarica tutti gli ordini
      const allOrders = await downloadAllShopifyOrders(
        (progress) => {
          setShopifySyncProgress(progress);
        },
        abortControllerRef.current
      );

      if (allOrders.length === 0) {
        setShopifySyncMessage('Nessun ordine trovato su Shopify');
        return;
      }

      // Converti e salva
      const convertedOrders = allOrders.map(convertShopifyOrder);
      await saveLargeData('shopify_orders', convertedOrders);
      
      setOrdersCount(convertedOrders.length);
      setShopifySyncMessage(`Sincronizzazione completata! ${convertedOrders.length} ordini scaricati e salvati.`);

    } catch (err) {
      if (err.message.includes('annullato')) {
        setShopifySyncMessage('Sincronizzazione annullata');
      } else {
        setShopifySyncError(`Errore: ${err.message}`);
      }
    } finally {
      setIsSyncingShopify(false);
      setShopifySyncProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Annulla sincronizzazione
  const handleCancelShopifySync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setShopifySyncMessage('Annullamento in corso...');
    }
  };

  // Elimina tutti gli ordini salvati
  const handleClearShopifyOrders = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare TUTTI gli ordini salvati?\n\nQuesta azione non può essere annullata.')) {
      return;
    }

    try {
      await saveLargeData('shopify_orders', []);
      setOrdersCount(0);
      setShopifySyncMessage('Tutti gli ordini sono stati eliminati');
    } catch (error) {
      setShopifySyncError('Errore durante l\'eliminazione degli ordini');
    }
  };

  // Reset tutte le impostazioni ai valori predefiniti
  const handleResetSettings = () => {
    if (window.confirm('⚠️ Sei sicuro di voler resettare tutte le impostazioni? Questa azione non può essere annullata.')) {
      // Reset configurazione Shopify
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
      window.alert('🗑️ Tutte le impostazioni sono state resettate ai valori predefiniti!');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-600">Gestisci le configurazioni dell'applicazione</p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Integrazioni</span>
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>CSV Ordini</span>
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
          <ShopifyConfig />
          
          {/* Sezione Sincronizzazione Ordini Shopify */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Sincronizzazione Ordini Shopify</span>
              </CardTitle>
              <CardDescription>
                Scarica e sincronizza tutti gli ordini dal tuo store Shopify
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistiche ordini */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ordini attualmente salvati</p>
                    <p className="text-2xl font-bold text-gray-900">{ordersCount.toLocaleString()}</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              {/* Progress durante sincronizzazione */}
              {shopifySyncProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-800 font-medium">
                      <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                      Sincronizzazione in corso...
                    </span>
                    <span className="text-blue-600 text-sm font-bold">
                      {shopifySyncProgress.ordersDownloaded} ordini
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">{shopifySyncProgress.currentStatus}</p>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((shopifySyncProgress.currentPage || 0) * 5, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Messaggi di successo/errore */}
              {shopifySyncMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800">{shopifySyncMessage}</span>
                </div>
              )}

              {shopifySyncError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800">{shopifySyncError}</span>
                </div>
              )}

              {/* Pulsanti azione */}
              <div className="flex flex-wrap gap-2">
                {!isSyncingShopify ? (
                  <Button 
                    onClick={handleSyncAllShopifyOrders}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica TUTTI gli Ordini
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCancelShopifySync}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Annulla Sincronizzazione
                  </Button>
                )}

                <Button 
                  onClick={handleClearShopifyOrders}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  disabled={isSyncingShopify || ordersCount === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina Ordini Salvati
                </Button>
              </div>

              {/* Info importante */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium mb-1">⚠️ Importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>La sincronizzazione scarica TUTTI gli ordini disponibili su Shopify</li>
                  <li>Potrebbero essere necessari diversi minuti per store con molti ordini</li>
                  <li>Gli ordini esistenti verranno sostituiti con quelli nuovi</li>
                  <li>Assicurati di avere configurato correttamente le credenziali Shopify sopra</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <ShopifyDebug />



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

        <TabsContent value="csv" className="space-y-6">
          <CSVUpload />
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          {/* Sincronizzazione Firebase Cloud */}
          <Card className="border-2 border-[#c68776]">
            <CardHeader className="bg-gradient-to-r from-[#c68776] to-[#d4a097] text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <CloudUpload className="h-5 w-5" />
                <span>Sincronizzazione Cloud (Firebase)</span>
              </CardTitle>
              <CardDescription className="text-white/80">
                Sincronizza i dati su Firebase per accedervi da qualsiasi dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Perché sincronizzare?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Accedi ai tuoi dati da qualsiasi PC o dispositivo</li>
                  <li>• I dati sono salvati nel cloud, mai più persi</li>
                  <li>• Sincronizzazione automatica in tempo reale</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button 
                  onClick={handleMigrateToFirebase} 
                  disabled={isMigrating}
                  className="w-full bg-[#c68776] hover:bg-[#b07567] h-12 text-lg"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Migrazione in corso...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="h-5 w-5 mr-2" />
                      Migra Dati Locali su Firebase
                    </>
                  )}
                </Button>
              </div>

              {migrationResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Migrazione Completata
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                    <div>📦 Magazzino: <strong>{migrationResult.magazzino}</strong></div>
                    <div>🛒 Ordini Shopify: <strong>{migrationResult.shopifyOrders}</strong></div>
                    <div>🚚 Ordini Fornitori: <strong>{migrationResult.supplierOrders}</strong></div>
                    <div>📝 Prima Nota: <strong>{migrationResult.primaNota}</strong></div>
                    <div>🏦 Conti Bancari: <strong>{migrationResult.contiBancari}</strong></div>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 mt-2">
                <p><strong>Nota:</strong> Dopo la migrazione, i dati saranno automaticamente sincronizzati con Firebase. Puoi eliminare i dati locali in sicurezza.</p>
              </div>
            </CardContent>
          </Card>

          {/* Configurazione Database */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Configurazione Database Locale</span>
              </CardTitle>
              <CardDescription>
                Gestisci le impostazioni del database locale e le operazioni di backup
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