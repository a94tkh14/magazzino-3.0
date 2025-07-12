import React, { useState, useEffect } from 'react';
import { Search, Package, Loader2, Tag, Settings } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { saveMagazzinoData, loadMagazzinoData, saveToLocalStorage, loadFromLocalStorage } from '../lib/magazzinoStorage';
import { useNavigate } from 'react-router-dom';
import ProductAnagrafica from '../components/ProductAnagrafica';
// RIMUOVO: import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import Button from '../components/ui/button';

const MagazzinoPage = () => {
  const [magazzinoData, setMagazzinoData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingSku, setEditingSku] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingField, setEditingField] = useState(null); // 'quantita' o 'prezzo'
  const [filtroDisponibilita, setFiltroDisponibilita] = useState('tutti');
  const [filtroMarca, setFiltroMarca] = useState('tutte');
  const [filtroTipologia, setFiltroTipologia] = useState('tutte');
  const [filtroPrezzo, setFiltroPrezzo] = useState('tutti');
  const [showAnagrafica, setShowAnagrafica] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
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
  const [newProductImage, setNewProductImage] = useState(null); // base64

  // Configurazione ordinamento
  const [sortField, setSortField] = useState('nome'); // 'nome', 'quantita', 'prezzo'
  const [sortOrder, setSortOrder] = useState('crescente'); // 'crescente' o 'decrescente'

  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Carica dal database Supabase
        const dbData = await loadMagazzinoData();
        if (dbData && dbData.length > 0) {
          setMagazzinoData(dbData);
          setFilteredData(dbData);
        } else {
          // Fallback al localStorage
          const data = loadFromLocalStorage('magazzino_data', []);
          setMagazzinoData(data);
          setFilteredData(data);
          // Salva nel database se ci sono dati
          if (data.length > 0) {
            await saveMagazzinoData(data);
          }
        }
      } catch (error) {
        console.error('Errore nel caricare i dati:', error);
        // Fallback al localStorage
        const data = loadFromLocalStorage('magazzino_data', []);
        setMagazzinoData(data);
        setFilteredData(data);
      }
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    // Filter data based on search term and filters
    let filtered = magazzinoData.filter(item => {
      const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.nome.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Filtro disponibilità
      if (filtroDisponibilita !== 'tutti') {
        if (filtroDisponibilita === 'basse' && item.quantita > lowStockThreshold) return false;
        if (filtroDisponibilita === 'attenzione' && (item.quantita <= lowStockThreshold || item.quantita > 15)) return false;
        if (filtroDisponibilita === 'disponibile' && item.quantita <= 15) return false;
      }
      
      // Filtro marca
      if (filtroMarca !== 'tutte') {
        const marca = localStorage.getItem(`marca_${item.sku}`) || '';
        if (filtroMarca === 'senza_marca' && marca) return false;
        if (filtroMarca === 'con_marca' && !marca) return false;
        if (filtroMarca !== 'senza_marca' && filtroMarca !== 'con_marca' && marca !== filtroMarca) return false;
      }
      
      // Filtro tipologia
      if (filtroTipologia !== 'tutte') {
        const tipologia = localStorage.getItem(`tipologia_${item.sku}`) || '';
        if (filtroTipologia === 'senza_tipologia' && tipologia) return false;
        if (filtroTipologia === 'con_tipologia' && !tipologia) return false;
        if (filtroTipologia !== 'senza_tipologia' && filtroTipologia !== 'con_tipologia' && tipologia !== filtroTipologia) return false;
      }
      
      // Filtro prezzo
      if (filtroPrezzo !== 'tutti') {
        if (filtroPrezzo === 'basso' && item.prezzo >= 10) return false;
        if (filtroPrezzo === 'medio' && (item.prezzo < 10 || item.prezzo >= 50)) return false;
        if (filtroPrezzo === 'alto' && item.prezzo < 50) return false;
      }
      
      return true;
    });

    // Applica ordinamento
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'nome':
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
          break;
        case 'quantita':
          aValue = a.quantita;
          bValue = b.quantita;
          break;
        case 'prezzo':
          aValue = a.prezzo;
          bValue = b.prezzo;
          break;
        default:
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
      }
      
      if (sortOrder === 'crescente') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    setFilteredData(filtered);
  }, [searchTerm, magazzinoData, filtroDisponibilita, filtroMarca, filtroTipologia, filtroPrezzo, sortField, sortOrder]);

  const getQuantityColor = (quantity) => {
    if (quantity <= 5) return 'text-destructive font-semibold';
    if (quantity <= 15) return 'text-orange-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  const handleSaveEdit = async (sku) => {
    let updated;
    let tipo = 'modifica';
    let nuovoPrezzo = null;
    let nuovaQuantita = null;
    if (editingField === 'quantita') {
      const newQty = parseInt(editingValue);
      if (isNaN(newQty) || newQty < 0) return;
      updated = magazzinoData.map(item => {
        if (item.sku === sku) {
          nuovaQuantita = newQty;
          nuovoPrezzo = item.prezzo;
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
          nuovaQuantita = item.quantita;
          nuovoPrezzo = parsed;
          return { ...item, prezzo: parsed };
        }
        return item;
      });
    }
    
    // Salva nel database
    try {
      await saveMagazzinoData(updated);
      // Salva anche in localStorage come backup
      saveToLocalStorage('magazzino_data', updated);
    } catch (error) {
      console.error('Errore nel salvare nel database:', error);
      // Fallback al localStorage
      saveToLocalStorage('magazzino_data', updated);
    }
    
    setMagazzinoData(updated);
    setFilteredData(updated);
    setEditingSku(null);
    setEditingField(null);
  };
  };

  const handleDeleteProduct = async (sku) => {
    if (window.confirm('Sei sicuro di voler eliminare questo prodotto dal magazzino?')) {
      const updated = magazzinoData.filter(item => item.sku !== sku);
      
      // Salva nel database
      try {
        await saveMagazzinoData(updated);
        // Salva anche in localStorage come backup
        saveToLocalStorage('magazzino_data', updated);
      } catch (error) {
        console.error('Errore nel salvare nel database:', error);
        // Fallback al localStorage
        saveToLocalStorage('magazzino_data', updated);
      }
      
      setMagazzinoData(updated);
      setFilteredData(updated);
    }
  };

  const getAvailableBrands = () => {
    const brands = new Set();
    magazzinoData.forEach(item => {
      const marca = localStorage.getItem(`marca_${item.sku}`);
      if (marca) brands.add(marca);
    });
    return Array.from(brands).sort();
  };
  const getAvailableTipologie = () => {
    const tipi = new Set();
    magazzinoData.forEach(item => {
      const tipologia = localStorage.getItem(`tipologia_${item.sku}`);
      if (tipologia) tipi.add(tipologia);
    });
    return Array.from(tipi).sort();
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
    // L'anagrafica viene salvata automaticamente nel localStorage dal componente
    // Qui possiamo aggiungere logica aggiuntiva se necessario
    console.log('Anagrafica salvata:', anagraficaData);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewProductImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async () => {
    setAddError('');
    const { sku, nome, quantita, prezzo, anagrafica, tipologia, marca } = newProduct;
    if (!sku.trim() || !nome.trim() || !quantita || !prezzo) {
      setAddError('Compila tutti i campi obbligatori (SKU, Nome, Quantità, Prezzo)');
      return;
    }
    if (magazzinoData.some(item => item.sku === sku.trim())) {
      setAddError('Esiste già un prodotto con questo SKU');
      return;
    }
    const prodotto = {
      sku: sku.trim(),
      nome: nome.trim(),
      quantita: parseInt(quantita),
      prezzo: parseFloat(prezzo.replace(',', '.')),
      anagrafica: anagrafica.trim(),
      tipologia: tipologia.trim(),
      marca: marca.trim()
    };
    // Salva su magazzino
    const nuovoMagazzino = [...magazzinoData, prodotto];
    
    // Salva nel database
    try {
      await saveMagazzinoData(nuovoMagazzino);
      // Salva anche in localStorage come backup
      saveToLocalStorage('magazzino_data', nuovoMagazzino);
    } catch (error) {
      console.error('Errore nel salvare nel database:', error);
      // Fallback al localStorage
      saveToLocalStorage('magazzino_data', nuovoMagazzino);
    }
    
    setMagazzinoData(nuovoMagazzino);
    setFilteredData(nuovoMagazzino);
    // Salva anagrafica su localStorage
    if (anagrafica) localStorage.setItem(`anagrafica_${sku.trim()}`, anagrafica.trim());
    if (tipologia) localStorage.setItem(`tipologia_${sku.trim()}`, tipologia.trim());
    if (marca) localStorage.setItem(`marca_${sku.trim()}`, marca.trim());
    // Salva foto su localStorage
    if (newProductImage) localStorage.setItem(`foto_${sku.trim()}`, newProductImage);
    setShowAddModal(false);
    setNewProduct({ sku: '', nome: '', quantita: '', prezzo: '', anagrafica: '', tipologia: '', marca: '' });
    setNewProductImage(null);
  };

  // Configurazione soglia scorte basse
  const [lowStockThreshold, setLowStockThreshold] = useState(() => {
    const saved = localStorage.getItem('lowStockThreshold');
    return saved ? parseInt(saved) : 5;
  });

  // Configurazione categorie prodotti
  const [productCategories, setProductCategories] = useState(() => {
    const saved = localStorage.getItem('productCategories');
    return saved ? JSON.parse(saved) : ['Skincare', 'Profumo', 'Premium', 'Lusso', 'Eco-friendly'];
  });

  // Calcola statistiche del magazzino
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
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Foto prodotto (opzionale):</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {newProductImage && (
                  <img src={newProductImage} alt="Anteprima" className="max-h-32 rounded border mt-2 mx-auto" />
                )}
              </div>
              {addError && <div className="text-red-600 text-sm">{addError}</div>}
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setNewProductImage(null); }}>Annulla</Button>
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
            Cerca per SKU o nome prodotto (ricerca case-insensitive)
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
          <CardTitle>Filtri</CardTitle>
          <CardDescription>
            Filtra i prodotti per disponibilità, marca, tipologia e prezzo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center">
            <select
              value={filtroDisponibilita}
              onChange={(e) => setFiltroDisponibilita(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="tutti">Tutte le disponibilità</option>
              <option value="basse">Scorte Basse (≤{lowStockThreshold})</option>
              <option value="attenzione">Attenzione ({lowStockThreshold + 1}-15)</option>
              <option value="disponibile">Disponibile (&gt;15)</option>
            </select>
            <select
              value={filtroMarca}
              onChange={(e) => setFiltroMarca(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="tutte">Tutte le marche</option>
              <option value="con_marca">Con Marca</option>
              <option value="senza_marca">Senza Marca</option>
              {getAvailableBrands().map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <select
              value={filtroTipologia}
              onChange={(e) => setFiltroTipologia(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="tutte">Tutte le tipologie</option>
              <option value="con_tipologia">Con Tipologia</option>
              <option value="senza_tipologia">Senza Tipologia</option>
              {getAvailableTipologie().map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <select
              value={filtroPrezzo}
              onChange={(e) => setFiltroPrezzo(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="tutti">Tutti i prezzi</option>
              <option value="basso">Basso (&lt;€10)</option>
              <option value="medio">Medio (€10-50)</option>
              <option value="alto">Alto (&gt;€50)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>
            {filteredData.length} prodotti trovati
            {searchTerm && ` per "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Caricamento inventario...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-4 py-3 text-left font-medium">SKU</th>
                    <th className="border border-border px-4 py-3 text-left font-medium">Nome Prodotto</th>
                    <th className="border border-border px-4 py-3 text-left font-medium">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                        if (sortField === 'quantita') {
                          setSortOrder(sortOrder === 'crescente' ? 'decrescente' : 'crescente');
                        } else {
                          setSortField('quantita');
                          setSortOrder('crescente');
                        }
                      }}>
                        Quantità
                        <div className="flex flex-col">
                          <svg className={`w-3 h-3 ${sortField === 'quantita' && sortOrder === 'crescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 ${sortField === 'quantita' && sortOrder === 'decrescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th className="border border-border px-4 py-3 text-left font-medium">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                        if (sortField === 'prezzo') {
                          setSortOrder(sortOrder === 'crescente' ? 'decrescente' : 'crescente');
                        } else {
                          setSortField('prezzo');
                          setSortOrder('crescente');
                        }
                      }}>
                        Prezzo
                        <div className="flex flex-col">
                          <svg className={`w-3 h-3 ${sortField === 'prezzo' && sortOrder === 'crescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 ${sortField === 'prezzo' && sortOrder === 'decrescente' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th className="border border-border px-4 py-3 text-left font-medium">Categoria</th>
                    <th className="border border-border px-4 py-3 text-left font-medium">Stato</th>
                    <th className="border border-border px-4 py-3 text-left font-medium">Anagrafica</th>
                    <th className="border border-border px-4 py-3 text-left font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="border border-border px-4 py-8 text-center text-muted-foreground">
                        {searchTerm ? 'Nessun prodotto trovato per la ricerca' : 'Nessun prodotto disponibile'}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="border border-border px-4 py-3 font-mono text-sm">
                          {item.sku}
                        </td>
                        <td
                          className="border border-border px-4 py-3 cursor-pointer hover:underline text-primary"
                          onClick={() => navigate(`/magazzino/${item.sku}`)}
                        >
                          {item.nome}
                        </td>
                        <td className="border border-border px-4 py-3">
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
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                              </svg>
                            </span>
                          )}
                        </td>
                        <td className="border border-border px-4 py-3 font-medium">
                          {editingSku === item.sku && editingField === 'prezzo' ? (
                            <input
                              type="text"
                              inputMode="decimal"
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
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                              </svg>
                            </span>
                          )}
                        </td>
                        <td className="border border-border px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                              {localStorage.getItem(`category_${item.sku}`) || 'Skincare'}
                            </span>
                            <button
                              onClick={() => {
                                const currentCategory = localStorage.getItem(`category_${item.sku}`) || 'Skincare';
                                const newCategory = prompt(
                                  `Cambia categoria per ${item.nome}:\n\nCategorie disponibili: ${productCategories.join(', ')}`,
                                  currentCategory
                                );
                                if (newCategory && productCategories.includes(newCategory)) {
                                  localStorage.setItem(`category_${item.sku}`, newCategory);
                                  // Forza il re-render
                                  setMagazzinoData([...magazzinoData]);
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Cambia
                            </button>
                          </div>
                        </td>
                        <td className="border border-border px-4 py-3">
                          {item.quantita <= lowStockThreshold && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                              Scorte Basse
                            </span>
                          )}
                          {item.quantita > lowStockThreshold && item.quantita <= 15 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Attenzione
                            </span>
                          )}
                          {item.quantita > 15 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Disponibile
                            </span>
                          )}
                        </td>
                        <td className="border border-border px-2 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-1 max-w-[180px] mx-auto">
                            {localStorage.getItem(`tipologia_${item.sku}`) && (
                              <span className="inline-flex items-center max-w-[80px] px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 truncate">
                                <Tag className="w-3 h-3 mr-1" />
                                {localStorage.getItem(`tipologia_${item.sku}`)}
                              </span>
                            )}
                            {localStorage.getItem(`marca_${item.sku}`) && (
                              <span className="inline-flex items-center max-w-[80px] px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 truncate">
                                {localStorage.getItem(`marca_${item.sku}`)}
                              </span>
                            )}
                            {!localStorage.getItem(`tipologia_${item.sku}`) && !localStorage.getItem(`marca_${item.sku}`) && (
                              <span className="text-xs text-muted-foreground">Non configurato</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-border px-4 py-3 text-center">
                          <button
                            className="text-blue-600 hover:bg-blue-50 rounded p-1 mr-2"
                            title="Gestisci anagrafica"
                            onClick={() => handleOpenAnagrafica(item)}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            className="text-destructive hover:bg-destructive/10 rounded p-1"
                            title="Elimina prodotto"
                            onClick={() => handleDeleteProduct(item.sku)}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Anagrafica Prodotto */}
      {showAnagrafica && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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