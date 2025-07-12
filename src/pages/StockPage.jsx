import React, { useState } from 'react';
import { FileText, Trash2, Send, Download, Package, Database } from 'lucide-react';
import Button from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { loadMagazzinoData, saveMagazzinoData, saveToLocalStorage, loadFromLocalStorage } from '../lib/magazzinoStorage';
import PriceSuggestionModal from '../components/PriceSuggestionModal';

const StockPage = () => {
  const [csvData, setCsvData] = useState([]);
  const [anagraficaData, setAnagraficaData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [anagraficaMessage, setAnagraficaMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null); // { sku, oldPrice, newPrice, onDecision }
  const [manualForm, setManualForm] = useState({
    sku: '',
    nome: '',
    quantita: '',
    prezzo: ''
  });
  const [manualProducts, setManualProducts] = useState([{ sku: '', nome: '', quantita: '', prezzo: '' }]);

  const downloadStockTemplate = () => {
    const headers = ['SKU', 'Quantità', 'Prezzo'];
    const sampleData = [
      ['SKU001', '10', '29,99'],
      ['SKU002', '5', '15,50']
    ];
    
    const csvContent = [
      headers.join(';'),
      ...sampleData.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_stock_quantita.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAnagraficaTemplate = () => {
    const headers = ['SKU', 'Nome', 'Anagrafica', 'Tipologia', 'Marca'];
    const sampleData = [
      ['SKU001', 'Prodotto Esempio', 'Anagrafica Esempio', 'Tipologia Esempio', 'Marca Esempio'],
      ['SKU002', 'Altro Prodotto', 'Anagrafica 2', 'Tipologia 2', 'Marca 2']
    ];
    
    const csvContent = [
      headers.join(';'),
      ...sampleData.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_anagrafica.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStockFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const separator = text.includes(';') ? ';' : ',';
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(separator).map(h => h.trim());

      const normalize = s => s.toLowerCase().replace('à', 'a').replace('è', 'e').replace('é', 'e');
      const requiredHeaders = ['sku', 'quantita', 'prezzo'];
      const normalizedHeaders = headers.map(normalize);
      const hasValidHeaders = requiredHeaders.every(header =>
        normalizedHeaders.includes(header)
      );

      if (!hasValidHeaders) {
        setMessage('Errore: Il file CSV deve contenere le intestazioni SKU, Quantità, Prezzo');
        return;
      }

      const data = lines.slice(1)
        .map(line => {
          const values = line.split(separator).map(v => v.trim());
          let prezzoRaw = values[2] || '';
          prezzoRaw = prezzoRaw.replace('€', '').replace(' EUR', '').replace('eur', '').trim();
          if ((prezzoRaw.match(/,/g) || []).length === 1) {
            prezzoRaw = prezzoRaw.replace(',', '.');
          } else if ((prezzoRaw.match(/,/g) || []).length > 1) {
            prezzoRaw = prezzoRaw.replace(/\./g, '').replace(/,/, '.');
          }
          const prezzo = parseFloat(prezzoRaw);
          
          return {
            sku: values[0] || '',
            quantita: parseInt(values[1]) || 0,
            prezzo: isNaN(prezzo) ? 0 : prezzo
          };
        })
        .filter(item => item.sku && item.quantita > 0 && item.prezzo > 0);

      setCsvData(data);
      setMessage(`Caricati ${data.length} elementi stock dal file CSV`);
    };

    reader.readAsText(file);
  };

  const handleAnagraficaFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const separator = text.includes(';') ? ';' : ',';
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(separator).map(h => h.trim());

      const normalize = s => s.toLowerCase().replace('à', 'a').replace('è', 'e').replace('é', 'e');
      const requiredHeaders = ['sku', 'nome'];
      const optionalHeaders = ['anagrafica', 'tipologia', 'marca'];
      const normalizedHeaders = headers.map(normalize);
      const hasValidHeaders = requiredHeaders.every(header =>
        normalizedHeaders.includes(header)
      );

      if (!hasValidHeaders) {
        setAnagraficaMessage('Errore: Il file CSV deve contenere le intestazioni SKU, Nome (Anagrafica, Tipologia, Marca sono opzionali)');
        return;
      }

      const data = lines.slice(1)
        .map(line => {
          const values = line.split(separator).map(v => v.trim());
          
          return {
            sku: values[0] || '',
            nome: values[1] || '',
            anagrafica: values[2] || '',
            tipologia: values[3] || '',
            marca: values[4] || ''
          };
        })
        .filter(item => item.sku && item.nome);

      setAnagraficaData(data);
      setAnagraficaMessage(`Caricati ${data.length} elementi anagrafica dal file CSV`);
    };

    reader.readAsText(file);
  };

  const handleUploadToWarehouse = async () => {
    if (csvData.length === 0) {
      setMessage('Nessun dato da caricare');
      return;
    }
    setIsLoading(true);

    try {
      let magazzino = await loadMagazzinoData();
      let toImport = [...csvData];

    const processNext = async () => {
      if (toImport.length === 0) {
        try {
          // Salva nel database
          await saveMagazzinoData(magazzino);
          // Salva anche in localStorage come backup
          saveToLocalStorage('magazzino_data', magazzino);
          setIsLoading(false);
          setMessage('Stock caricato e magazzino aggiornato!');
          setCsvData([]);
        } catch (error) {
          console.error('Errore nel salvare magazzino:', error);
          setMessage('Errore nel salvare i dati');
          setIsLoading(false);
        }
        return;
      }
      const newItem = toImport.shift();
      const idx = magazzino.findIndex(item => item.sku === newItem.sku);
      if (idx !== -1 && magazzino[idx].prezzo !== newItem.prezzo) {
        // Mostra popup AI
        setModalData({
          sku: newItem.sku,
          nome: magazzino[idx].nome, // Use existing name from magazzino
          oldPrice: magazzino[idx].prezzo,
          newPrice: newItem.prezzo,
          onDecision: (decision) => {
            if (decision === 'aggiorna') {
              magazzino[idx].prezzo = newItem.prezzo;
              magazzino[idx].quantita += newItem.quantita;
              // Aggiorna anagrafica se presente
              if (newItem.anagrafica) magazzino[idx].anagrafica = newItem.anagrafica;
              if (newItem.tipologia) magazzino[idx].tipologia = newItem.tipologia;
              if (newItem.marca) magazzino[idx].marca = newItem.marca;
            } else if (decision === 'mantieni') {
              magazzino[idx].quantita += newItem.quantita;
              // Aggiorna anagrafica se presente
              if (newItem.anagrafica) magazzino[idx].anagrafica = newItem.anagrafica;
              if (newItem.tipologia) magazzino[idx].tipologia = newItem.tipologia;
              if (newItem.marca) magazzino[idx].marca = newItem.marca;
            }
            // Se ignora, non aggiorna nulla
            setModalOpen(false);
            // Storico gestito automaticamente dal database
            setTimeout(processNext, 0);
          }
        });
        setModalOpen(true);
      } else if (idx !== -1) {
        magazzino[idx].quantita += newItem.quantita;
        // Aggiorna anagrafica se presente
        if (newItem.anagrafica) magazzino[idx].anagrafica = newItem.anagrafica;
        if (newItem.tipologia) magazzino[idx].tipologia = newItem.tipologia;
        if (newItem.marca) magazzino[idx].marca = newItem.marca;
        // Storico gestito automaticamente dal database
        setTimeout(processNext, 0);
      } else {
        magazzino.push({ ...newItem });
        // Storico gestito automaticamente dal database
        setTimeout(processNext, 0);
      }
    };

      await processNext();
    } catch (error) {
      console.error('Errore nel caricare magazzino:', error);
      setMessage('Errore nel caricare i dati del magazzino');
      setIsLoading(false);
    }
  };

  const handleManualInput = (e, index) => {
    const { name, value } = e.target;
    setManualProducts(prev => prev.map((item, i) => i === index ? { ...item, [name]: value } : item));
  };

  const addManualProduct = () => {
    setManualProducts(prev => [...prev, { sku: '', nome: '', quantita: '', prezzo: '' }]);
  };

  const removeManualProduct = (index) => {
    if (manualProducts.length > 1) {
      setManualProducts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const validProducts = manualProducts.filter(p => p.sku && p.quantita && p.prezzo);
    if (validProducts.length === 0) {
      setMessage('Compila almeno SKU, quantità e prezzo per aggiungere un prodotto');
      return;
    }
    
    try {
      let magazzino = await loadMagazzinoData();
      let hasError = false;
      let errorMessage = '';
      
      validProducts.forEach(product => {
        const newItem = {
          sku: product.sku.trim(),
          nome: product.nome.trim() || 'Prodotto senza nome',
          quantita: parseInt(product.quantita),
          prezzo: parseFloat(product.prezzo.replace(',', '.'))
        };
        const idx = magazzino.findIndex(item => item.sku === newItem.sku);
        if (idx !== -1) {
          magazzino[idx].quantita += newItem.quantita;
          magazzino[idx].prezzo = newItem.prezzo;
          if (product.nome.trim()) {
            magazzino[idx].nome = newItem.nome;
          }
        } else {
          if (!product.nome.trim()) {
            hasError = true;
            errorMessage = `Il nome è obbligatorio per il nuovo prodotto con SKU: ${newItem.sku}`;
            return;
          }
          magazzino.push(newItem);
        }
      });
      
      if (hasError) {
        setMessage(errorMessage);
        return;
      }
      
      // Salva nel database
      await saveMagazzinoData(magazzino);
      // Salva anche in localStorage come backup
      saveToLocalStorage('magazzino_data', magazzino);
      
      setManualProducts([{ sku: '', nome: '', quantita: '', prezzo: '' }]);
      setMessage(`${validProducts.length} prodotto/i aggiunto/i manualmente!`);
    } catch (error) {
      console.error('Errore nel salvare dati:', error);
      setMessage('Errore nel salvare i dati');
    }
  };

  const handleUploadAnagrafica = async () => {
    if (anagraficaData.length === 0) {
      setAnagraficaMessage('Nessun dato anagrafica da caricare');
      return;
    }
    setIsLoading(true);

    try {
      let magazzino = await loadMagazzinoData();
      let updatedCount = 0;
      let newCount = 0;

      anagraficaData.forEach(item => {
        const idx = magazzino.findIndex(existing => existing.sku === item.sku);
        if (idx !== -1) {
          // Aggiorna anagrafica esistente
          magazzino[idx].nome = item.nome;
          if (item.anagrafica) magazzino[idx].anagrafica = item.anagrafica;
          if (item.tipologia) magazzino[idx].tipologia = item.tipologia;
          if (item.marca) magazzino[idx].marca = item.marca;
          updatedCount++;
        } else {
          // Crea nuovo prodotto con solo anagrafica (quantità e prezzo a 0)
          magazzino.push({
            sku: item.sku,
            nome: item.nome,
            quantita: 0,
            prezzo: 0,
            anagrafica: item.anagrafica || '',
            tipologia: item.tipologia || '',
            marca: item.marca || ''
          });
          newCount++;
        }
      });

      // Salva nel database
      await saveMagazzinoData(magazzino);
      // Salva anche in localStorage come backup
      saveToLocalStorage('magazzino_data', magazzino);
      
      setAnagraficaData([]);
      setIsLoading(false);
      setAnagraficaMessage(`Anagrafica caricata: ${updatedCount} aggiornati, ${newCount} nuovi prodotti`);
    } catch (error) {
      console.error('Errore nel salvare anagrafica:', error);
      setAnagraficaMessage('Errore nel salvare i dati anagrafica');
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCsvData([]);
    setAnagraficaData([]);
    setMessage('');
    setAnagraficaMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione Stock</h1>
          <p className="text-muted-foreground">
            Carica file CSV per aggiungere nuovi prodotti al magazzino
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* CARD STOCK */}
        <Card className="bg-blue-50 border-blue-200 flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Package className="h-5 w-5" />
              Carica File Stock
            </CardTitle>
            <CardDescription className="text-blue-800">
              Seleziona un file CSV con intestazioni: <b>SKU, Quantità, Prezzo</b> (puoi usare ; o , come separatore)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleStockFileUpload}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-md ${
                message.includes('Errore') 
                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                  : 'bg-blue-100 text-blue-900 border border-blue-200'
              }`}>
                {message}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleUploadToWarehouse}
                disabled={csvData.length === 0 || isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'Caricamento...' : 'Carica su Magazzino'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={csvData.length === 0}
                className="flex items-center gap-2 border-blue-300 text-blue-700"
              >
                <Trash2 className="h-4 w-4" />
                Reset
              </Button>
              <Button 
                variant="outline" 
                onClick={downloadStockTemplate}
                className="flex items-center gap-2 border-blue-300 text-blue-700"
              >
                <Download className="h-4 w-4" />
                Scarica Template Stock
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD ANAGRAFICA */}
        <Card className="bg-yellow-50 border-yellow-200 flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Database className="h-5 w-5" />
              Carica File Anagrafica
            </CardTitle>
            <CardDescription className="text-yellow-800">
              Seleziona un file CSV con intestazioni: <b>SKU, Nome</b> (Anagrafica, Tipologia, Marca sono opzionali)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleAnagraficaFileUpload}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-yellow-500 file:text-white
                  hover:file:bg-yellow-600"
              />
            </div>

            {anagraficaMessage && (
              <div className={`p-3 rounded-md ${
                anagraficaMessage.includes('Errore') 
                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                  : 'bg-yellow-100 text-yellow-900 border border-yellow-200'
              }`}>
                {anagraficaMessage}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleUploadAnagrafica}
                disabled={anagraficaData.length === 0 || isLoading}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Database className="h-4 w-4" />
                {isLoading ? 'Caricamento...' : 'Carica Anagrafica'}
              </Button>
              <Button 
                variant="outline" 
                onClick={downloadAnagraficaTemplate}
                className="flex items-center gap-2 border-yellow-300 text-yellow-700"
              >
                <Download className="h-4 w-4" />
                Scarica Template Anagrafica
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleManualSubmit} className="mt-8 p-4 border rounded bg-muted/30 space-y-2">
        <h3 className="font-semibold mb-2">Aggiungi prodotti manualmente</h3>
        {manualProducts.map((product, index) => (
          <div key={index} className="flex flex-col sm:flex-row gap-2 items-center">
            <input name="sku" value={product.sku} onChange={(e) => handleManualInput(e, index)} placeholder="SKU" className="flex-1 px-2 py-1 border rounded" />
            <input name="nome" value={product.nome} onChange={(e) => handleManualInput(e, index)} placeholder="Nome" className="flex-1 px-2 py-1 border rounded" />
            <input name="quantita" value={product.quantita} onChange={(e) => handleManualInput(e, index)} placeholder="Quantità" type="number" min={1} className="w-24 px-2 py-1 border rounded" />
            <input name="prezzo" value={product.prezzo} onChange={(e) => handleManualInput(e, index)} placeholder="Prezzo" type="text" className="w-24 px-2 py-1 border rounded" />
            {manualProducts.length > 1 && (
              <button type="button" onClick={() => removeManualProduct(index)} className="bg-destructive text-destructive-foreground px-2 py-1 rounded">×</button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={addManualProduct} className="bg-secondary text-secondary-foreground px-4 py-1 rounded font-semibold">+ Aggiungi riga</button>
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-1 rounded font-semibold">Salva tutti</button>
        </div>
      </form>

      {csvData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anteprima Dati Stock</CardTitle>
            <CardDescription>
              {csvData.length} elementi pronti per il caricamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-4 py-2 text-left font-medium">SKU</th>
                    <th className="border border-border px-4 py-2 text-left font-medium">Quantità</th>
                    <th className="border border-border px-4 py-2 text-left font-medium">Prezzo</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((item, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border border-border px-4 py-2">{item.sku}</td>
                      <td className="border border-border px-4 py-2">{item.quantita}</td>
                      <td className="border border-border px-4 py-2">€{item.prezzo.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      {anagraficaData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anteprima Dati Anagrafica</CardTitle>
            <CardDescription>
              {anagraficaData.length} elementi pronti per il caricamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-4 py-2 text-left font-medium">SKU</th>
                    <th className="border border-border px-4 py-2 text-left font-medium">Nome</th>
                    <th className="border border-border px-4 py-2 text-left font-medium">Anagrafica</th>
                    <th className="border border-border px-4 py-2 text-left font-medium">Tipologia</th>
                    <th className="border border-border px-4 py-2 text-left font-medium">Marca</th>
                  </tr>
                </thead>
                <tbody>
                  {anagraficaData.map((item, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border border-border px-4 py-2">{item.sku}</td>
                      <td className="border border-border px-4 py-2">{item.nome}</td>
                      <td className="border border-border px-4 py-2">{item.anagrafica || '-'}</td>
                      <td className="border border-border px-4 py-2">{item.tipologia || '-'}</td>
                      <td className="border border-border px-4 py-2">{item.marca || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <PriceSuggestionModal
        open={modalOpen}
        sku={modalData?.sku}
        nome={modalData?.nome}
        oldPrice={modalData?.oldPrice}
        newPrice={modalData?.newPrice}
        onDecision={modalData?.onDecision}
      />
    </div>
  );
};

export default StockPage; 