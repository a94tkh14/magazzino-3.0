import React, { useState, useEffect } from 'react';
import LogoUpload from '../components/LogoUpload';
import GoogleAdsAPI from '../lib/googleAdsAPI';
import MetaAPI from '../lib/metaAPI';
import FirebaseMagazzinoTest from '../components/FirebaseMagazzinoTest';
import SafeNumberTest from '../components/SafeNumberTest';
import SafeStringTest from '../components/SafeStringTest';

export default function SettingsPage() {
  const [shop, setShop] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [apiVersion, setApiVersion] = useState('2023-04');
  const [message, setMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  // API instances
  const [googleAdsAPI] = useState(new GoogleAdsAPI());
  const [metaAPI] = useState(new MetaAPI());

  // Connection status
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);

  // Gestione categorie di costo
  const [costCategories, setCostCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ value: '', label: '', color: '#6B7280' });
  const [editingCategory, setEditingCategory] = useState(null);

  // Colori predefiniti per le categorie
  const categoryColors = [
    { value: '#6B7280', label: 'Grigio' },
    { value: '#3B82F6', label: 'Blu' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Giallo' },
    { value: '#EF4444', label: 'Rosso' },
    { value: '#8B5CF6', label: 'Viola' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#06B6D4', label: 'Ciano' },
    { value: '#84CC16', label: 'Lime' },
    { value: '#F97316', label: 'Arancione' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('shopify_settings');
    if (saved) {
      const { shop, apiKey, apiPassword, apiVersion } = JSON.parse(saved);
      setShop(shop || '');
      setApiKey(apiKey || '');
      setApiPassword(apiPassword || '');
      setApiVersion(apiVersion || '2023-04');
    }

    // Carica categorie di costo
    loadCostCategories();

    // Verifica connessioni esistenti
    const checkConnections = () => {
      const googleConnected = googleAdsAPI.loadStoredToken();
      const metaConnected = metaAPI.loadStoredToken();
      
      setGoogleAdsConnected(googleConnected);
      setMetaConnected(metaConnected);
    };

    checkConnections();
  }, [googleAdsAPI, metaAPI]);

  // Carica le categorie di costo dal localStorage
  const loadCostCategories = () => {
    const saved = localStorage.getItem('costCategories');
    if (saved) {
      setCostCategories(JSON.parse(saved));
    } else {
      // Categorie predefinite
      const defaultCategories = [
        { value: 'marketing', label: 'Marketing', color: '#3B82F6' },
        { value: 'logistica', label: 'Logistica/Spedizioni', color: '#10B981' },
        { value: 'personale', label: 'Personale', color: '#8B5CF6' },
        { value: 'affitti', label: 'Affitti/Spese fisse', color: '#F59E0B' },
        { value: 'utilities', label: 'Utilities', color: '#06B6D4' },
        { value: 'altro', label: 'Altro', color: '#6B7280' }
      ];
      setCostCategories(defaultCategories);
      localStorage.setItem('costCategories', JSON.stringify(defaultCategories));
    }
  };

  // Salva le categorie di costo
  const saveCostCategories = (categories) => {
    localStorage.setItem('costCategories', JSON.stringify(categories));
    setCostCategories(categories);
  };

  // Aggiunge una nuova categoria
  const addCategory = () => {
    if (!newCategory.value || !newCategory.label) {
      alert('Inserisci sia il valore che l\'etichetta della categoria');
      return;
    }

    // Verifica che il valore sia unico
    if (costCategories.find(cat => cat.value === newCategory.value)) {
      alert('Una categoria con questo valore esiste già');
      return;
    }

    const updatedCategories = [...costCategories, newCategory];
    saveCostCategories(updatedCategories);
    setNewCategory({ value: '', label: '', color: '#6B7280' });
    setMessage('Categoria aggiunta con successo!');
    setTimeout(() => setMessage(''), 3000);
  };

  // Modifica una categoria esistente
  const updateCategory = () => {
    if (!editingCategory.value || !editingCategory.label) {
      alert('Inserisci sia il valore che l\'etichetta della categoria');
      return;
    }

    const updatedCategories = costCategories.map(cat => 
      cat.value === editingCategory.value ? editingCategory : cat
    );
    saveCostCategories(updatedCategories);
    setEditingCategory(null);
    setMessage('Categoria aggiornata con successo!');
    setTimeout(() => setMessage(''), 3000);
  };

  // Elimina una categoria
  const deleteCategory = (categoryValue) => {
    if (window.confirm('Sei sicuro di voler eliminare questa categoria? Questa azione non può essere annullata.')) {
      const updatedCategories = costCategories.filter(cat => cat.value !== categoryValue);
      saveCostCategories(updatedCategories);
      setMessage('Categoria eliminata con successo!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Ripristina le categorie predefinite
  const resetToDefaults = () => {
    if (window.confirm('Sei sicuro di voler ripristinare le categorie predefinite? Tutte le categorie personalizzate verranno eliminate.')) {
      const defaultCategories = [
        { value: 'marketing', label: 'Marketing', color: '#3B82F6' },
        { value: 'logistica', label: 'Logistica/Spedizioni', color: '#10B981' },
        { value: 'personale', label: 'Personale', color: '#8B5CF6' },
        { value: 'affitti', label: 'Affitti/Spese fisse', color: '#F59E0B' },
        { value: 'utilities', label: 'Utilities', color: '#06B6D4' },
        { value: 'altro', label: 'Altro', color: '#6B7280' }
      ];
      saveCostCategories(defaultCategories);
      setMessage('Categorie ripristinate ai valori predefiniti!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

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

  // Gestisce connessione Google Ads
  const handleGoogleAdsConnect = async () => {
    try {
      if (!googleAdsAPI.clientId) {
        alert('Google Ads API non configurata. Configura REACT_APP_GOOGLE_ADS_CLIENT_ID nel file .env');
        return;
      }
      await googleAdsAPI.authenticate();
      setGoogleAdsConnected(true);
    } catch (error) {
      console.error('Errore connessione Google Ads:', error);
      alert('Errore durante la connessione a Google Ads. Verifica le credenziali OAuth.');
    }
  };

  // Gestisce connessione Meta
  const handleMetaConnect = async () => {
    try {
      if (!metaAPI.clientId) {
        alert('Meta API non configurata. Configura REACT_APP_META_CLIENT_ID nel file .env');
        return;
      }
      await metaAPI.authenticate();
      setMetaConnected(true);
    } catch (error) {
      console.error('Errore connessione Meta:', error);
      alert('Errore durante la connessione a Meta. Verifica le credenziali OAuth.');
    }
  };

  // Gestisce disconnessione
  const handleDisconnect = (platform) => {
    if (platform === 'google') {
      localStorage.removeItem('googleAdsAccessToken');
      localStorage.removeItem('googleAdsRefreshToken');
      setGoogleAdsConnected(false);
    } else if (platform === 'meta') {
      localStorage.removeItem('metaAccessToken');
      localStorage.removeItem('metaAdAccountId');
      setMetaConnected(false);
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
            Configura le impostazioni dell'applicazione e le connessioni API
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

        {/* Gestione Categorie di Costo */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Gestione Categorie di Costo</h2>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Ripristina Predefiniti
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aggiungi Nuova Categoria */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Aggiungi Nuova Categoria</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valore (codice)
                  </label>
                  <input
                    type="text"
                    value={newCategory.value}
                    onChange={(e) => setNewCategory({...newCategory, value: e.target.value})}
                    placeholder="es. marketing, logistica"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Etichetta (nome visualizzato)
                  </label>
                  <input
                    type="text"
                    value={newCategory.label}
                    onChange={(e) => setNewCategory({...newCategory, label: e.target.value})}
                    placeholder="es. Marketing, Logistica/Spedizioni"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colore
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {categoryColors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setNewCategory({...newCategory, color: color.value})}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newCategory.color === color.value ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={addCategory}
                  disabled={!newCategory.value || !newCategory.label}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Aggiungi Categoria
                </button>
              </div>
            </div>

            {/* Lista Categorie Esistenti */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Categorie Esistenti</h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {costCategories.map(category => (
                  <div key={category.value} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <div className="font-medium text-sm">{category.label}</div>
                        <div className="text-xs text-gray-500">{category.value}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => deleteCategory(category.value)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Modifica Categoria */}
          {editingCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Modifica Categoria</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valore (codice)
                    </label>
                    <input
                      type="text"
                      value={editingCategory.value}
                      onChange={(e) => setEditingCategory({...editingCategory, value: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Etichetta (nome visualizzato)
                    </label>
                    <input
                      type="text"
                      value={editingCategory.label}
                      onChange={(e) => setEditingCategory({...editingCategory, label: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colore
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {categoryColors.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setEditingCategory({...editingCategory, color: color.value})}
                          className={`w-8 h-8 rounded-full border-2 ${
                            editingCategory.color === color.value ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={updateCategory}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Salva Modifiche
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connessioni API Marketing */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Connessioni API Marketing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Ads */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Google Ads</h3>
                <div className={`w-3 h-3 rounded-full ${googleAdsConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
              
              {googleAdsConnected ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">✅ Connesso</p>
                  <button
                    onClick={() => handleDisconnect('google')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Disconnetti
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Non connesso</p>
                  <button
                    onClick={handleGoogleAdsConnect}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Connetti Google Ads
                  </button>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Meta (Facebook/Instagram)</h3>
                <div className={`w-3 h-3 rounded-full ${metaConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
              
              {metaConnected ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">✅ Connesso</p>
                  <button
                    onClick={() => handleDisconnect('meta')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Disconnetti
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Non connesso</p>
                  <button
                    onClick={handleMetaConnect}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Connetti Meta
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Configurazione API</h4>
            <p className="text-sm text-blue-700">
              Per utilizzare le API di Google Ads e Meta, configura le variabili d'ambiente nel file <code className="bg-blue-100 px-1 rounded">.env</code>:
            </p>
            <div className="mt-2 text-xs text-blue-600 font-mono">
              REACT_APP_GOOGLE_ADS_CLIENT_ID=your_client_id<br/>
              REACT_APP_META_CLIENT_ID=your_client_id
            </div>
          </div>
        </div>

        {/* Test Firebase */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Test Firebase Database</h2>
          <FirebaseMagazzinoTest />
        </div>

        {/* Test Funzioni Sicure per Numeri */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Test Funzioni Sicure per Numeri</h2>
          <SafeNumberTest />
        </div>

        {/* Test Funzioni Sicure per Stringhe */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Test Funzioni Sicure per Stringhe</h2>
          <SafeStringTest />
        </div>
      </div>
    </div>
  );
} 