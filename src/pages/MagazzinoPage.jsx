import React, { useState, useEffect } from 'react';
import { Search, Package, Tag, Settings } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { saveMagazzino, loadMagazzino } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveToLocalStorage, loadFromLocalStorage } from '../lib/magazzinoStorage';
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

  const navigate = useNavigate();
  const lowStockThreshold = 5;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await loadMagazzino();
        if (result.success && result.data.length > 0) {
          setMagazzinoData(result.data);
          setFilteredData(result.data);
        } else {
          // Fallback al localStorage se Firebase non ha dati
          const data = loadFromLocalStorage('magazzino_data', []);
          const localDataArray = Array.isArray(data) ? data : [];
          setMagazzinoData(localDataArray);
          setFilteredData(localDataArray);
          // Migra i dati locali a Firebase
          if (localDataArray.length > 0) {
            for (const item of localDataArray) {
              await saveMagazzino(item);
            }
          }
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
    setEditingSku(sku);
    setEditingField(field);
    setEditingValue(currentValue || '');
  };

  const handleSaveEdit = async (sku, field, value) => {
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
    
    try {
      // Trova il prodotto modificato
      const modifiedItem = updated.find(item => item.sku === sku);
      if (modifiedItem) {
        // Salva solo il prodotto modificato su Firebase
        const result = await saveMagazzino(modifiedItem);
        if (result.success) {
          // Aggiorna immediatamente l'interfaccia
          setMagazzinoData(updated);
          setFilteredData(updated);
          
          // Salva anche in localStorage come backup
          saveToLocalStorage('magazzino_data', updated);
          
          // Esci dalla modalità di modifica
          setEditingSku(null);
          setEditingField(null);
          setEditingValue(''); // Clear value after saving
          
          // Mostra messaggio di successo temporaneo
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          successMessage.textContent = `Prodotto "${modifiedItem.nome}" modificato con successo!`;
          document.body.appendChild(successMessage);
          
          // Rimuovi il messaggio dopo 3 secondi
          setTimeout(() => {
            if (successMessage.parentNode) {
              successMessage.parentNode.removeChild(successMessage);
            }
          }, 3000);
          
        } else {
          console.error('Errore nel salvare su Firebase:', result.error);
          
          // Mostra messaggio di errore temporaneo
          const errorMessage = document.createElement('div');
          errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          errorMessage.textContent = `Errore: ${result.error}`;
          document.body.appendChild(errorMessage);
          
          // Rimuovi il messaggio dopo 5 secondi
          setTimeout(() => {
            if (errorMessage.parentNode) {
              errorMessage.parentNode.removeChild(errorMessage);
            }
          }, 5000);
        }
      }
    } catch (error) {
      console.error('Errore nel salvare su Firebase:', error);
      
      // Mostra messaggio di errore temporaneo
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMessage.textContent = `Errore: ${error.message}`;
      document.body.appendChild(errorMessage);
      
      // Rimuovi il messaggio dopo 5 secondi
      setTimeout(() => {
        if (errorMessage.parentNode) {
          errorMessage.parentNode.removeChild(errorMessage);
        }
      }, 5000);
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
      
      // Poi elimina immediatamente da stato locale e localStorage
      const updated = magazzinoData.filter(item => item.sku !== sku);
      
      // Aggiorna immediatamente l'interfaccia
      setMagazzinoData(updated);
      setFilteredData(updated);
      
      // Salva in localStorage come backup
      saveToLocalStorage('magazzino_data', updated);
      
      // Mostra messaggio di successo temporaneo
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successMessage.textContent = `Prodotto "${sku}" eliminato!`;
      document.body.appendChild(successMessage);
      
      // Rimuovi il messaggio dopo 3 secondi
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Errore nell\'eliminazione del prodotto:', error);
      
      // Mostra messaggio di errore temporaneo
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMessage.textContent = `Errore: ${error.message}`;
      document.body.appendChild(errorMessage);
      
      // Rimuovi il messaggio dopo 5 secondi
      setTimeout(() => {
        if (errorMessage.parentNode) {
          errorMessage.parentNode.removeChild(errorMessage);
        }
      }, 5000);
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

    try {
      // Salva solo il nuovo prodotto su Firebase
      const result = await saveMagazzino(newItem);
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
        setAddError('Errore nel salvataggio: ' + result.error);
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
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
          <Button className="ml-4" onClick={() => setShowAddModal(true)}>
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
                    <th className="text-left p-3 font-medium">SKU</th>
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Quantità</th>
                    <th className="text-left p-3 font-medium">Prezzo</th>
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
                            <span onClick={() => handleEditField(item.sku, 'nome', item.nome)} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
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
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                              {item.sku}
                            </span>
                          )}
                        </td>
                      <td className="p-3">
                        {editingSku === item.sku && editingField === 'quantita' ? (
                          <input
                            type="number"
                            min={0}
                            value={editingValue}
                            autoFocus
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'quantita', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'quantita', editingValue)}
                            className="w-20 border rounded px-2 py-1"
                          />
                        ) : (
                          <span
                            className="cursor-pointer flex items-center gap-2"
                            onClick={() => handleEditField(item.sku, 'quantita', item.quantita.toString())}
                          >
                            <span className={getQuantityColor(item.quantita)}>
                              {item.quantita}
                            </span>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {editingSku === item.sku && editingField === 'prezzo' ? (
                          <input
                            type="text"
                            value={editingValue}
                            autoFocus
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.sku, 'prezzo', editingValue)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.sku, 'prezzo', editingValue)}
                            className="w-24 border rounded px-2 py-1"
                          />
                        ) : (
                          <span
                            className="cursor-pointer flex items-center gap-2"
                            onClick={() => handleEditField(item.sku, 'prezzo', safeToFixed(item.prezzo, 2).replace('.', ','))}
                          >
                            {formatPrice(item.prezzo)}
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          className="text-blue-600 hover:bg-blue-50 rounded p-1 mr-2"
                          title="Gestisci anagrafica"
                          onClick={() => handleOpenAnagrafica(item)}
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          className="text-red-600 hover:bg-red-50 rounded p-1"
                          title="Elimina prodotto"
                          onClick={() => handleDeleteProduct(item.sku)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
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