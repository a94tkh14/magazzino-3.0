import React, { useState, useEffect } from 'react';
import { Search, Package, Tag, Settings } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { saveMagazzinoData, loadMagazzinoData, saveToLocalStorage, loadFromLocalStorage } from '../lib/magazzinoStorage';
import { useNavigate } from 'react-router-dom';
import ProductAnagrafica from '../components/ProductAnagrafica';
import Button from '../components/ui/button';

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
        const dbData = await loadMagazzinoData();
        if (dbData && dbData.length > 0) {
          setMagazzinoData(dbData);
          setFilteredData(dbData);
        } else {
          const data = loadFromLocalStorage('magazzino_data', []);
          setMagazzinoData(data);
          setFilteredData(data);
          if (data.length > 0) {
            await saveMagazzinoData(data);
          }
        }
      } catch (error) {
        console.error('Errore nel caricare i dati:', error);
        const data = loadFromLocalStorage('magazzino_data', []);
        setMagazzinoData(data);
        setFilteredData(data);
      }
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    let filtered = magazzinoData.filter(item => {
      const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.nome.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    
    setFilteredData(filtered);
  }, [searchTerm, magazzinoData]);

  const getQuantityColor = (quantity) => {
    if (quantity <= 5) return 'text-red-600 font-semibold';
    if (quantity <= 15) return 'text-orange-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  const handleSaveEdit = async (sku) => {
    let updated;
    if (editingField === 'quantita') {
      const newQty = parseInt(editingValue);
      if (isNaN(newQty) || newQty < 0) return;
      updated = magazzinoData.map(item => {
        if (item.sku === sku) {
          return { ...item, quantita: newQty };
        }
        return item;
      });
    } else if (editingField === 'prezzo') {
      let newPrezzo = editingValue.replace(',', '.');
      const parsed = parseFloat(newPrezzo);
      if (isNaN(parsed) || parsed < 0) return;
      updated = magazzinoData.map(item => {
        if (item.sku === sku) {
          return { ...item, prezzo: parsed };
        }
        return item;
      });
    }
    
    try {
      await saveMagazzinoData(updated);
      saveToLocalStorage('magazzino_data', updated);
    } catch (error) {
      console.error('Errore nel salvare nel database:', error);
      saveToLocalStorage('magazzino_data', updated);
    }
    
    setMagazzinoData(updated);
    setFilteredData(updated);
    setEditingSku(null);
    setEditingField(null);
  };

  const handleDeleteProduct = async (sku) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo prodotto?')) return;
    
    const updated = magazzinoData.filter(item => item.sku !== sku);
    
    try {
      await saveMagazzinoData(updated);
      saveToLocalStorage('magazzino_data', updated);
    } catch (error) {
      console.error('Errore nel salvare nel database:', error);
      saveToLocalStorage('magazzino_data', updated);
    }
    
    setMagazzinoData(updated);
    setFilteredData(updated);
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

    const updated = [...magazzinoData, newItem];
    
    try {
      await saveMagazzinoData(updated);
      saveToLocalStorage('magazzino_data', updated);
    } catch (error) {
      console.error('Errore nel salvare nel database:', error);
      saveToLocalStorage('magazzino_data', updated);
    }
    
    setMagazzinoData(updated);
    setFilteredData(updated);
    setNewProduct({
      sku: '',
      nome: '',
      quantita: '',
      prezzo: '',
      anagrafica: '',
      tipologia: '',
      marca: ''
    });
    setShowAddModal(false);
    setAddError('');
  };

  const calculateMagazzinoStats = () => {
    const totalValue = magazzinoData.reduce((sum, item) => sum + (item.prezzo * item.quantita), 0);
    const totalQuantity = magazzinoData.reduce((sum, item) => sum + item.quantita, 0);
    const lowStockItems = magazzinoData.filter(item => item.quantita <= lowStockThreshold).length;
    const outOfStockItems = magazzinoData.filter(item => item.quantita === 0).length;
    
    return {
      totalValue,
      totalQuantity,
      lowStockItems,
      outOfStockItems,
      totalProducts: magazzinoData.length
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
                  {filteredData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{item.sku}</td>
                      <td className="p-3 cursor-pointer hover:underline text-blue-600" onClick={() => navigate(`/magazzino/${item.sku}`)}>
                        {item.nome}
                      </td>
                      <td className="p-3">
                        {editingSku === item.sku && editingField === 'quantita' ? (
                          <input
                            type="number"
                            min={0}
                            value={editingValue}
                            autoFocus
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={() => { setEditingSku(null); setEditingField(null); }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(item.sku);
                              if (e.key === 'Escape') { setEditingSku(null); setEditingField(null); }
                            }}
                            className="w-20 border rounded px-2 py-1"
                          />
                        ) : (
                          <span
                            className="cursor-pointer flex items-center gap-2"
                            onClick={() => {
                              setEditingSku(item.sku);
                              setEditingValue(item.quantita.toString());
                              setEditingField('quantita');
                            }}
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
                            onBlur={() => { setEditingSku(null); setEditingField(null); }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(item.sku);
                              if (e.key === 'Escape') { setEditingSku(null); setEditingField(null); }
                            }}
                            className="w-24 border rounded px-2 py-1"
                          />
                        ) : (
                          <span
                            className="cursor-pointer flex items-center gap-2"
                            onClick={() => {
                              setEditingSku(item.sku);
                              setEditingValue(item.prezzo.toFixed(2).replace('.', ','));
                              setEditingField('prezzo');
                            }}
                          >
                            €{item.prezzo.toFixed(2)}
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