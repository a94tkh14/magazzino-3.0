import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Search, Clock, Package, Tag, Settings, Trash2, Plus, Edit } from 'lucide-react';
import { dataManager } from '../lib/dataManager';
import { safeIncludes } from '../lib/utils';

const StoricoPage = () => {
  const [storico, setStorico] = useState([]);
  const [filteredStorico, setFilteredStorico] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('tutti');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorico();
  }, []);

  useEffect(() => {
    filterStorico();
  }, [searchTerm, selectedType, storico]);

  const loadStorico = async () => {
    setIsLoading(true);
    try {
      await dataManager.initialize();
      const allData = await dataManager.loadAllData();
      const storicoArray = Array.isArray(allData.storico) ? allData.storico : [];
      
      // Ordina per data (più recenti prima)
      const sortedStorico = storicoArray.sort((a, b) => 
        new Date(b.data) - new Date(a.data)
      );
      
      setStorico(sortedStorico);
      console.log('✅ Storico caricato:', sortedStorico.length, 'voci');
    } catch (error) {
      console.error('❌ Errore nel caricare storico:', error);
      setStorico([]);
    }
    setIsLoading(false);
  };

  const filterStorico = () => {
    let filtered = [...storico];

    // Filtra per tipo
    if (selectedType !== 'tutti') {
      filtered = filtered.filter(item => item.tipo_azione === selectedType);
    }

    // Filtra per ricerca
    if (searchTerm) {
      filtered = filtered.filter(item => 
        safeIncludes(item.descrizione, searchTerm) ||
        (item.dati_azione && item.dati_azione.sku && 
         safeIncludes(item.dati_azione.sku, searchTerm))
      );
    }

    setFilteredStorico(filtered);
  };

  const getActionIcon = (tipoAzione) => {
    switch (tipoAzione) {
      case 'aggiunta_prodotto':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'modifica_prodotto':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'eliminazione_prodotto':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'aggiornamento_quantita':
        return <Package className="h-4 w-4 text-orange-600" />;
      case 'nuovo_ordine':
      case 'modifica_ordine':
        return <Tag className="h-4 w-4 text-purple-600" />;
      case 'nuovo_ordine_fornitore':
      case 'modifica_ordine_fornitore':
        return <Settings className="h-4 w-4 text-indigo-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (tipoAzione) => {
    switch (tipoAzione) {
      case 'aggiunta_prodotto':
        return 'bg-green-50 border-green-200';
      case 'modifica_prodotto':
        return 'bg-blue-50 border-blue-200';
      case 'eliminazione_prodotto':
        return 'bg-red-50 border-red-200';
      case 'aggiornamento_quantita':
        return 'bg-orange-50 border-orange-200';
      case 'nuovo_ordine':
      case 'modifica_ordine':
        return 'bg-purple-50 border-purple-200';
      case 'nuovo_ordine_fornitore':
      case 'modifica_ordine_fornitore':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getActionLabel = (tipoAzione) => {
    switch (tipoAzione) {
      case 'aggiunta_prodotto':
        return 'Aggiunta Prodotto';
      case 'modifica_prodotto':
        return 'Modifica Prodotto';
      case 'eliminazione_prodotto':
        return 'Eliminazione Prodotto';
      case 'aggiornamento_quantita':
        return 'Aggiornamento Quantità';
      case 'nuovo_ordine':
        return 'Nuovo Ordine';
      case 'modifica_ordine':
        return 'Modifica Ordine';
      case 'nuovo_ordine_fornitore':
        return 'Nuovo Ordine Fornitore';
      case 'modifica_ordine_fornitore':
        return 'Modifica Ordine Fornitore';
      default:
        return tipoAzione;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUniqueActionTypes = () => {
    const types = [...new Set(storico.map(item => item.tipo_azione))];
    return types.sort();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Caricamento storico...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Storico Operazioni</h1>
          <p className="text-muted-foreground">
            Cronologia completa di tutte le operazioni effettuate
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{storico.length} operazioni totali</span>
        </div>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
          <CardDescription>
            Filtra le operazioni per tipo e ricerca
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cerca per descrizione o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="tutti">Tutti i tipi</option>
                {getUniqueActionTypes().map(type => (
                  <option key={type} value={type}>
                    {getActionLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Storico */}
      <Card>
        <CardHeader>
          <CardTitle>Operazioni</CardTitle>
          <CardDescription>
            {filteredStorico.length} operazioni trovate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStorico.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || selectedType !== 'tutti' 
                ? 'Nessuna operazione trovata con i filtri applicati' 
                : 'Nessuna operazione registrata'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStorico.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getActionColor(item.tipo_azione)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getActionIcon(item.tipo_azione)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {getActionLabel(item.tipo_azione)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.data)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {item.descrizione}
                        </p>
                        
                        {/* Dettagli aggiuntivi se disponibili */}
                        {item.dati_azione && (
                          <div className="text-xs text-gray-600 space-y-1">
                            {item.dati_azione.sku && (
                              <div>SKU: <span className="font-mono">{item.dati_azione.sku}</span></div>
                            )}
                            {item.dati_azione.quantita_precedente !== undefined && item.dati_azione.quantita_nuova !== undefined && (
                              <div>
                                Quantità: {item.dati_azione.quantita_precedente} → {item.dati_azione.quantita_nuova}
                                {item.dati_azione.motivo && ` (${item.dati_azione.motivo})`}
                              </div>
                            )}
                            {item.dati_azione.numero_ordine && (
                              <div>Ordine: <span className="font-mono">{item.dati_azione.numero_ordine}</span></div>
                            )}
                            {item.dati_azione.fornitore && (
                              <div>Fornitore: {item.dati_azione.fornitore}</div>
                            )}
                            {item.dati_azione.totale && (
                              <div>Totale: €{item.dati_azione.totale.toFixed(2)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Operazioni Totali</p>
                <p className="text-2xl font-bold">{storico.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prodotti Aggiunti</p>
                <p className="text-2xl font-bold text-green-600">
                  {storico.filter(item => item.tipo_azione === 'aggiunta_prodotto').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Plus className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prodotti Eliminati</p>
                <p className="text-2xl font-bold text-red-600">
                  {storico.filter(item => item.tipo_azione === 'eliminazione_prodotto').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Movimenti Stock</p>
                <p className="text-2xl font-bold text-orange-600">
                  {storico.filter(item => item.tipo_azione === 'aggiornamento_quantita').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoricoPage; 