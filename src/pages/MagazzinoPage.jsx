import React, { useState, useEffect } from 'react';
import { Search, Package, Tag, Settings, Download, Upload, ShoppingBag, Check, X, RefreshCw } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { saveMagazzino, loadMagazzino } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveToLocalStorage, loadFromLocalStorage } from '../lib/magazzinoStorage';
import { loadLargeData } from '../lib/dataManager';
import { useNavigate } from 'react-router-dom';
import ProductAnagrafica from '../components/ProductAnagrafica';
import Button from '../components/ui/button';
import { safeToFixed, formatPrice, safeIncludes } from '../lib/utils';

const MagazzinoPage = () => {
  const [magazzinoData, setMagazzinoData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingSku, setEditingSku] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    nome: '',
    quantita: '',
    prezzo: '',
    anagrafica: '',
    tipologia: '',
    marca: ''
  });
  const [addError, setAddError] = useState('');
  const [showAnagrafica, setShowAnagrafica] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalData, setOriginalData] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  
  // Stati per importazione Shopify
  const [showImportModal, setShowImportModal] = useState(false);
  const [shopifyProducts, setShopifyProducts] = useState([]);
  const [selectedForImport, setSelectedForImport] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSearch, setImportSearch] = useState('');

  const navigate = useNavigate();
  const lowStockThreshold = 5;

  useEffect(() => {
    const loadData = async () => {
      try {
        // Prova prima a caricare da Firebase
        const firebaseResult = await loadMagazzino();
        if (firebaseResult.success && firebaseResult.data && firebaseResult.data.length > 0) {
          setMagazzinoData(firebaseResult.data);
          setFilteredData(firebaseResult.data);
        } else {
          // Fallback al localStorage se Firebase non ha dati
          const data = loadFromLocalStorage('magazzino_data', []);
          const localDataArray = Array.isArray(data) ? data : [];
          setMagazzinoData(localDataArray);
          setFilteredData(localDataArray);
          // NON migrare più i dati locali a Firebase automaticamente
          // if (localDataArray.length > 0) {
          //   for (const item of localDataArray) {
          //     await saveMagazzino(item);
          //   }
          // }
        }
      } catch (error) {
        console.error('Errore nel caricare i dati da Firebase:', error);
        // Fallback al localStorage
        const data = loadFromLocalStorage('magazzino_data', []);
        const localDataArray = Array.isArray(data) ? data : [];
        setMagazzinoData(localDataArray);
        setFilteredData(localDataArray);
      }
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    let filtered = (Array.isArray(magazzinoData) ? magazzinoData : []).filter(item => {
      const matchesSearch = safeIncludes(item.sku, searchTerm) ||
                           safeIncludes(item.nome, searchTerm);
      return matchesSearch;
    });
    
    setFilteredData(filtered);
  }, [searchTerm, magazzinoData]);

  const getQuantityColor = (quantity) => {
    if (quantity <= 5) return 'text-red-600 font-semibold';
    if (quantity <= 15) return 'text-orange-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  const handleEditField = (sku, field, currentValue) => {
    if (!isEditMode) return; // Solo in modalità modifica
    
    setEditingSku(sku);
    setEditingField(field);
    setEditingValue(currentValue || '');
  };

  const handleSaveEdit = async (sku, field, value) => {
    if (!isEditMode) return; // Solo in modalità modifica
    
    let updated;
    if (field === 'nome') {
      if (!value.trim()) return;
      updated = (Array.isArray(magazzinoData) ? magazzinoData : []).map(item => {
        if (item.sku === sku) {
          return { ...item, nome: value.trim() };
        }
        return item;
      });
    } else if (field === 'sku') {
      if (!value.trim()) return;
      // Verifica che il nuovo SKU non esista già
      const existingSku = (Array.isArray(magazzinoData) ? magazzinoData : []).find(item => item.sku === value.trim() && item.sku !== sku);
      if (existingSku) {
        alert('SKU già esistente!');
        return;
      }
      updated = (Array.isArray(magazzinoData) ? magazzinoData : []).map(item => {
        if (item.sku === sku) {
          return { ...item, sku: value.trim() };
        }
        return item;
      });
    } else if (field === 'quantita') {
      const newQty = parseInt(value);
      if (isNaN(newQty) || newQty < 0) return;
      updated = (Array.isArray(magazzinoData) ? magazzinoData : []).map(item => {
        if (item.sku === sku) {
          return { ...item, quantita: newQty };
        }
        return item;
      });
    } else if (field === 'prezzo') {
      let newPrezzo = value.replace(',', '.');
      const parsed = parseFloat(newPrezzo);
      if (isNaN(parsed) || parsed < 0) return;
      updated = (Array.isArray(magazzinoData) ? magazzinoData : []).map(item => {
        if (item.sku === sku) {
          return { ...item, prezzo: parsed };
        }
        return item;
      });
    } else if (field === 'anagrafica') {
      updated = (Array.isArray(magazzinoData) ? magazzinoData : []).map(item => {
        if (item.sku === sku) {
          return { ...item, anagrafica: value };
        }
        return item;
      });
    } else if (field === 'tipologia') {
      updated = (Array.isArray(magazzinoData) ? magazzinoData : []).map(item => {
        if (item.sku === sku) {
          return { ...item, tipologia: value };
        }
        return item;
      });
    } else if (field === 'marca') {
      updated = (Array.isArray(magazzinoData) ? magazzinoData : []).map(item => {
        if (item.sku === sku) {
          return { ...item, marca: value };
        }
        return item;
      });
    }
    
    if (!updated) return;
    
    // Salva le modifiche in pendingChanges invece di salvare subito
    setPendingChanges(prev => ({
      ...prev,
      [sku]: { ...prev[sku], [field]: value }
    }));
    
    // Aggiorna immediatamente l'interfaccia
    setMagazzinoData(updated);
    setFilteredData(updated);
    
    // Esci dalla modalità di modifica del campo
    setEditingSku(null);
    setEditingField(null);
    setEditingValue('');
  };

  const startEditMode = () => {
    setOriginalData([...magazzinoData]);
    setPendingChanges({});
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    // Ripristina i dati originali
    setMagazzinoData(originalData);
    setFilteredData(originalData);
    setPendingChanges({});
    setIsEditMode(false);
    setEditingSku(null);
    setEditingField(null);
    setEditingValue('');
  };

  const saveAllChanges = async () => {
    try {
      // Salva tutte le modifiche su Firebase
      const savePromises = Object.entries(pendingChanges).map(async ([sku, changes]) => {
        const item = magazzinoData.find(item => item.sku === sku);
        if (item) {
          const updatedItem = { ...item, ...changes };
          return await saveMagazzino(updatedItem);
        }
      });

      const results = await Promise.all(savePromises);
      const allSuccessful = results.every(result => result && result.success);

      if (allSuccessful) {
        // Salva anche in localStorage come backup
        saveToLocalStorage('magazzino_data', magazzinoData);
        
        // Esci dalla modalità di modifica
        setIsEditMode(false);
        setPendingChanges({});
        setOriginalData([]);
        
        // Mostra messaggio di successo
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMessage.textContent = `Tutte le modifiche salvate con successo!`;
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
      } else {
        alert('Errore nel salvare alcune modifiche');
      }
    } catch (error) {
      console.error('Errore nel salvare le modifiche:', error);
      alert(`Errore nel salvare: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (sku) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il prodotto "${sku}"?`)) return;
    
    try {
      // Prima elimina da Firebase se ha un ID
      const itemToDelete = magazzinoData.find(item => item.sku === sku);
      if (itemToDelete && itemToDelete.id) {
        await deleteDoc(doc(db, 'magazzino', itemToDelete.id));
        console.log('✅ Prodotto eliminato da Firebase');
      }
      
      // Poi elimina immediatamente da stato locale
      const updated = magazzinoData.filter(item => item.sku !== sku);
      
      // Aggiorna immediatamente l'interfaccia
      setMagazzinoData(updated);
      setFilteredData(updated);
      
      // Salva in localStorage come backup
      saveToLocalStorage('magazzino_data', updated);
      
      // Mostra messaggio di successo
      alert(`Prodotto "${sku}" eliminato con successo!`);
      
    } catch (error) {
      console.error('❌ Errore nell\'eliminazione del prodotto:', error);
      alert(`Errore nell'eliminazione: ${error.message}`);
    }
  };

  const handleOpenAnagrafica = (product) => {
    setSelectedProduct(product);
    setShowAnagrafica(true);
  };

  const handleCloseAnagrafica = () => {
    setShowAnagrafica(false);
    setSelectedProduct(null);
  };

  const handleSaveAnagrafica = (anagraficaData) => {
    // Salva i dati dell'anagrafica
    Object.keys(anagraficaData).forEach(key => {
      if (anagraficaData[key]) {
        localStorage.setItem(`${key}_${selectedProduct.sku}`, anagraficaData[key]);
      }
    });
    handleCloseAnagrafica();
  };

  const handleAddProduct = async () => {
    if (!newProduct.sku || !newProduct.nome || !newProduct.quantita || !newProduct.prezzo) {
      setAddError('Tutti i campi obbligatori devono essere compilati');
      return;
    }

    const quantita = parseInt(newProduct.quantita);
    const prezzo = parseFloat(newProduct.prezzo.replace(',', '.'));
    
    if (isNaN(quantita) || isNaN(prezzo) || quantita < 0 || prezzo < 0) {
      setAddError('Quantità e prezzo devono essere numeri validi');
      return;
    }

    const newItem = {
      sku: newProduct.sku,
      nome: newProduct.nome,
      quantita: quantita,
      prezzo: prezzo,
      anagrafica: newProduct.anagrafica,
      tipologia: newProduct.tipologia,
      marca: newProduct.marca
    };

    console.log('🔄 Tentativo di salvataggio prodotto:', newItem);

    try {
      // Salva solo il nuovo prodotto su Firebase
      const result = await saveMagazzino(newItem);
      console.log('📡 Risposta Firebase:', result);
      
      if (result.success) {
        // Aggiungi il nuovo prodotto con l'ID restituito
        const productWithId = { ...newItem, id: result.id };
        
        // Aggiorna immediatamente l'interfaccia
        const updated = [...magazzinoData, productWithId];
        setMagazzinoData(updated);
        setFilteredData(updated);
        
        // Salva anche in localStorage come backup
        saveToLocalStorage('magazzino_data', updated);
        
        // Pulisci il form
        setNewProduct({
          sku: '',
          nome: '',
          quantita: '',
          prezzo: '',
          anagrafica: '',
          tipologia: '',
          marca: ''
        });
        setAddError('');
        
        // Mostra messaggio di successo temporaneo
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMessage.textContent = `Prodotto "${newItem.nome}" aggiunto con successo!`;
        document.body.appendChild(successMessage);
        
        // Rimuovi il messaggio dopo 3 secondi
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
        
      } else {
        console.error('❌ Errore Firebase:', result.error);
        setAddError('Errore nel salvataggio: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Errore nel salvataggio:', error);
      setAddError('Errore nel salvataggio: ' + error.message);
    }
  };

  const calculateMagazzinoStats = () => {
    // Assicura che magazzinoData sia un array
    const data = Array.isArray(magazzinoData) ? magazzinoData : [];
    
    const totalValue = data.reduce((sum, item) => sum + (item.prezzo * item.quantita), 0);
    const totalQuantity = data.reduce((sum, item) => sum + item.quantita, 0);
    const lowStockItems = data.filter(item => item.quantita <= lowStockThreshold).length;
    const outOfStockItems = data.filter(item => item.quantita === 0).length;
    
    return {
      totalValue,
      totalQuantity,
      lowStockItems,
      outOfStockItems,
      totalProducts: data.length
    };
  };

  // Funzione per caricare prodotti da Shopify
  const loadShopifyProducts = async () => {
    setImportLoading(true);
    try {
      const orders = await loadLargeData('shopify_orders') || [];
      
      // Estrai prodotti unici dagli ordini
      const productsMap = new Map();
      
      orders.forEach(order => {
        const items = order.line_items || order.products || order.items || [];
        items.forEach(item => {
          const sku = item.sku || item.variant_id?.toString() || '';
          const name = item.name || item.title || 'Prodotto senza nome';
          const price = parseFloat(item.price) || 0;
          const vendor = item.vendor || '';
          const productId = item.product_id?.toString() || '';
          const variantId = item.variant_id?.toString() || '';
          const variantTitle = item.variant_title || '';
          
          if (sku || name) {
            const key = sku || `${name}_${variantId}`;
            
            if (!productsMap.has(key)) {
              productsMap.set(key, {
                sku: sku || variantId || `SHOP_${Date.now()}_${productsMap.size}`,
                nome: variantTitle ? `${name} - ${variantTitle}` : name,
                prezzo: price,
                quantita: 0, // Da impostare manualmente
                marca: vendor,
                tipologia: '',
                productId,
                variantId,
                ordersCount: 1,
                totalSold: item.quantity || 1
              });
            } else {
              const existing = productsMap.get(key);
              existing.ordersCount += 1;
              existing.totalSold += (item.quantity || 1);
              // Aggiorna prezzo se più recente
              if (price > 0) existing.prezzo = price;
            }
          }
        });
      });
      
      // Converti in array e ordina per vendite
      const products = Array.from(productsMap.values())
        .sort((a, b) => b.totalSold - a.totalSold);
      
      setShopifyProducts(products);
      setSelectedForImport([]);
      
    } catch (error) {
      console.error('Errore caricamento prodotti Shopify:', error);
      alert('Errore nel caricare i prodotti da Shopify');
    }
    setImportLoading(false);
  };

  // Apri modal importazione
  const handleOpenImportModal = () => {
    setShowImportModal(true);
    loadShopifyProducts();
  };

  // Toggle selezione prodotto per import
  const toggleSelectForImport = (sku) => {
    setSelectedForImport(prev => {
      if (prev.includes(sku)) {
        return prev.filter(s => s !== sku);
      } else {
        return [...prev, sku];
      }
    });
  };

  // Seleziona tutti / Deseleziona tutti
  const toggleSelectAll = () => {
    const filteredProducts = getFilteredShopifyProducts();
    if (selectedForImport.length === filteredProducts.length) {
      setSelectedForImport([]);
    } else {
      setSelectedForImport(filteredProducts.map(p => p.sku));
    }
  };

  // Filtra prodotti Shopify per ricerca
  const getFilteredShopifyProducts = () => {
    if (!importSearch) return shopifyProducts;
    const term = importSearch.toLowerCase();
    return shopifyProducts.filter(p => 
      p.nome?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.marca?.toLowerCase().includes(term)
    );
  };

  // Importa prodotti selezionati
  const handleImportSelected = async () => {
    if (selectedForImport.length === 0) {
      alert('Seleziona almeno un prodotto da importare');
      return;
    }

    const productsToImport = shopifyProducts.filter(p => selectedForImport.includes(p.sku));
    const existingSkus = new Set(magazzinoData.map(p => p.sku));
    
    let imported = 0;
    let skipped = 0;
    const newProducts = [];

    for (const product of productsToImport) {
      if (existingSkus.has(product.sku)) {
        skipped++;
        continue;
      }

      const newItem = {
        sku: product.sku,
        nome: product.nome,
        quantita: 0, // Quantità da impostare manualmente
        prezzo: product.prezzo || 0,
        marca: product.marca || '',
        tipologia: product.tipologia || '',
        anagrafica: ''
      };

      try {
        const result = await saveMagazzino(newItem);
        if (result.success) {
          newProducts.push({ ...newItem, id: result.id });
          imported++;
        }
      } catch (error) {
        console.error('Errore importazione prodotto:', product.sku, error);
      }
    }

    if (newProducts.length > 0) {
      const updated = [...magazzinoData, ...newProducts];
      setMagazzinoData(updated);
      setFilteredData(updated);
      saveToLocalStorage('magazzino_data', updated);
    }

    alert(`Importazione completata!\n✅ Importati: ${imported}\n⏭️ Saltati (già esistenti): ${skipped}`);
    setShowImportModal(false);
    setSelectedForImport([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Caricamento...</span>
        </div>
      </div>
    );
  }
  const stats = calculateMagazzinoStats();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Magazzino</h1>
          <p className="text-muted-foreground">
            Gestione inventario e controllo scorte
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{magazzinoData.length} prodotti</span>
          <Button className="ml-4 bg-[#c68776] hover:bg-[#b07567]" onClick={handleOpenImportModal}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            Importa da Ordini
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            + Aggiungi prodotto
          </Button>
        </div>
      </div>

      {/* Statistiche del Magazzino */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valore Totale</p>
                <p className="text-2xl font-bold text-green-600">
                  €{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Tag className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantità Totale</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalQuantity.toLocaleString('it-IT')}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scorte Basse</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.lowStockItems}
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Settings className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Esauriti</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.outOfStockItems}
                </p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL AGGIUNTA PRODOTTO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-3 text-center">Aggiungi nuovo prodotto</h2>
            <form onSubmit={e => { e.preventDefault(); handleAddProduct(); }} className="space-y-2">
              <div className="flex gap-2">
                <input className="border rounded px-2 py-1 flex-1" placeholder="SKU*" value={newProduct.sku} onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))} />
                <input className="border rounded px-2 py-1 flex-1" placeholder="Nome*" value={newProduct.nome} onChange={e => setNewProduct(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <input className="border rounded px-2 py-1 w-24" placeholder="Quantità*" type="number" min="0" value={newProduct.quantita} onChange={e => setNewProduct(p => ({ ...p, quantita: e.target.value }))} />
                <input className="border rounded px-2 py-1 w-24" placeholder="Prezzo*" type="text" value={newProduct.prezzo} onChange={e => setNewProduct(p => ({ ...p, prezzo: e.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <input className="border rounded px-2 py-1 flex-1 min-w-0 max-w-[150px]" placeholder="Anagrafica" value={newProduct.anagrafica} onChange={e => setNewProduct(p => ({ ...p, anagrafica: e.target.value }))} />
                <input className="border rounded px-2 py-1 flex-1 min-w-0 max-w-[150px]" placeholder="Tipologia" value={newProduct.tipologia} onChange={e => setNewProduct(p => ({ ...p, tipologia: e.target.value }))} />
                <input className="border rounded px-2 py-1 flex-1 min-w-0 max-w-[150px]" placeholder="Marca" value={newProduct.marca} onChange={e => setNewProduct(p => ({ ...p, marca: e.target.value }))} />
              </div>
              {addError && <div className="text-red-600 text-sm">{addError}</div>}
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); }}>Annulla</Button>
                <Button type="submit">Salva</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAZIONE DA SHOPIFY */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-[#c68776] to-[#b07567] text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Importa Prodotti da Shopify</h2>
                    <p className="text-white/80 text-sm">Seleziona i prodotti da aggiungere al magazzino</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Barra di ricerca e azioni */}
            <div className="p-4 border-b bg-gray-50 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cerca prodotto per nome, SKU o marca..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#c68776] focus:border-transparent"
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  {selectedForImport.length === getFilteredShopifyProducts().length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                </button>
                <button
                  onClick={loadShopifyProducts}
                  className="p-2 border rounded-lg hover:bg-gray-100 transition-colors"
                  title="Ricarica prodotti"
                >
                  <RefreshCw className={`h-4 w-4 ${importLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Statistiche */}
            <div className="px-4 py-2 bg-blue-50 border-b flex items-center gap-4 text-sm">
              <span className="text-blue-700 font-medium">
                {shopifyProducts.length} prodotti trovati
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-green-700 font-medium">
                {selectedForImport.length} selezionati per importazione
              </span>
              {magazzinoData.length > 0 && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-orange-700 font-medium">
                    {shopifyProducts.filter(p => magazzinoData.some(m => m.sku === p.sku)).length} già in magazzino
                  </span>
                </>
              )}
            </div>

            {/* Lista prodotti */}
            <div className="flex-1 overflow-auto p-4">
              {importLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <RefreshCw className="h-12 w-12 animate-spin mx-auto text-[#c68776] mb-4" />
                    <p className="text-gray-600">Caricamento prodotti dagli ordini Shopify...</p>
                  </div>
                </div>
              ) : getFilteredShopifyProducts().length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nessun prodotto trovato</p>
                    <p className="text-sm mt-1">Sincronizza prima gli ordini da Shopify nella pagina Ordini</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getFilteredShopifyProducts().map((product) => {
                    const isSelected = selectedForImport.includes(product.sku);
                    const alreadyExists = magazzinoData.some(m => m.sku === product.sku);
                    
                    return (
                      <div
                        key={product.sku}
                        onClick={() => !alreadyExists && toggleSelectForImport(product.sku)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          alreadyExists 
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
                            : isSelected 
                              ? 'bg-[#c68776]/10 border-[#c68776] ring-2 ring-[#c68776]' 
                              : 'hover:border-[#c68776] hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{product.nome}</h4>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                              <span className="bg-gray-200 px-2 py-0.5 rounded">SKU: {product.sku}</span>
                              {product.marca && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{product.marca}</span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm">
                              <span className="text-green-700 font-medium">€{(product.prezzo || 0).toFixed(2)}</span>
                              <span className="text-gray-500">Venduti: {product.totalSold}</span>
                              <span className="text-gray-400 text-xs">({product.ordersCount} ordini)</span>
                            </div>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            {alreadyExists ? (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                Già in magazzino
                              </span>
                            ) : isSelected ? (
                              <div className="w-6 h-6 bg-[#c68776] rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer con azioni */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
              <p className="text-sm text-gray-600">
                I prodotti verranno importati con quantità 0 (da aggiornare manualmente)
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowImportModal(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={handleImportSelected}
                  disabled={selectedForImport.length === 0}
                  className="bg-[#c68776] hover:bg-[#b07567] disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Importa {selectedForImport.length} prodotti
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controlli per la modalità di modifica */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditMode ? '🔧 Modalità Modifica Attiva' : '📋 Visualizzazione Prodotti'}
            </h3>
            {isEditMode && (
              <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                {Object.keys(pendingChanges).length} modifiche in sospeso
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            {!isEditMode ? (
              <button
                onClick={startEditMode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                ✏️ Modifica Prodotti
              </button>
            ) : (
              <>
                <button
                  onClick={saveAllChanges}
                  disabled={Object.keys(pendingChanges).length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  💾 Salva Modifiche
                </button>
                <button
                  onClick={cancelEditMode}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  ❌ Annulla Modifiche
                </button>
              </>
            )}
          </div>
        </div>
        
        {isEditMode && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              💡 <strong>Istruzioni:</strong> Clicca sui campi che vuoi modificare. Le modifiche verranno salvate solo quando clicchi "Salva Modifiche".
              Puoi annullare tutte le modifiche con "Annulla Modifiche".
            </p>
          </div>
        )}
      </div>

      {/* Tabella prodotti */}
      <Card>
        <CardHeader>
          <CardTitle>Ricerca Prodotti</CardTitle>
          <CardDescription>
            Cerca per SKU o nome prodotto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cerca SKU o nome prodotto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prodotti</CardTitle>
          <CardDescription>
            Lista completa dei prodotti in magazzino
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nessun prodotto trovato per la ricerca' : 'Nessun prodotto disponibile'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">SKU</th>
                    <th className="text-left p-3 font-medium">Quantità</th>
                    <th className="text-left p-3 font-medium">Prezzo</th>
                    <th className="text-left p-3 font-medium">Anagrafica</th>
                    <th className="text-left p-3 font-medium">Tipologia</th>
                    <th className="text-left p-3 font-medium">Marca</th>
                    <th className="text-left p-3 font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(filteredData) ? filteredData : []).map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {editingSku === item.sku && editingField === 'nome' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'nome', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'nome', editingValue)}
                            className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onClick={() => handleEditField(item.sku, 'nome', item.nome)} 
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-blue-600 hover:text-blue-800 hover:underline"
                            title="Clicca per modificare o per vedere i dettagli"
                          >
                            {item.nome}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingSku === item.sku && editingField === 'sku' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'sku', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'sku', editingValue)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="font-mono bg-gray-100 px-2 py-1 rounded text-xs cursor-pointer hover:bg-gray-200 text-blue-600 hover:text-blue-800"
                            onClick={() => navigate(`/magazzino/${item.sku}`)}
                            title="Clicca per vedere i dettagli del prodotto"
                          >
                            {item.sku}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingSku === item.sku && editingField === 'quantita' ? (
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'quantita', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'quantita', editingValue)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span onClick={() => handleEditField(item.sku, 'quantita', item.quantita.toString())} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {item.quantita}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingSku === item.sku && editingField === 'prezzo' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'prezzo', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'prezzo', editingValue)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span onClick={() => handleEditField(item.sku, 'prezzo', safeToFixed(item.prezzo, 2).replace('.', ','))} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {formatPrice(item.prezzo)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingSku === item.sku && editingField === 'anagrafica' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'anagrafica', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'anagrafica', editingValue)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span onClick={() => handleEditField(item.sku, 'anagrafica', item.anagrafica || '')} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {item.anagrafica || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingSku === item.sku && editingField === 'tipologia' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'tipologia', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'tipologia', editingValue)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span onClick={() => handleEditField(item.sku, 'tipologia', item.tipologia || '')} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {item.tipologia || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingSku === item.sku && editingField === 'marca' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'marca', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'marca', editingValue)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span onClick={() => handleEditField(item.sku, 'tipologia', item.marca || '')} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {item.marca || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/magazzino/${item.sku}`)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
                            title="Vedi dettagli e variazioni prezzo"
                          >
                            👁️ Dettagli
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(item.sku)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
                            title="Elimina prodotto"
                          >
                            🗑️ Cancella
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Anagrafica Prodotto */}
      {showAnagrafica && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <ProductAnagrafica
              sku={selectedProduct.sku}
              nome={selectedProduct.nome}
              onSave={handleSaveAnagrafica}
              onCancel={handleCloseAnagrafica}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MagazzinoPage; 