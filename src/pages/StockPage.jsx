import React, { useState, useRef } from 'react';
import { FileText, Trash2, Send, Download, Package, Database, FileSpreadsheet, Search, Upload, X, Check, RefreshCw, Image, AlertCircle, CheckCircle2, ShoppingBag } from 'lucide-react';
import Button from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { loadMagazzino, saveMagazzino } from '../lib/firebase';
import { saveToLocalStorage, loadFromLocalStorage } from '../lib/magazzinoStorage';
import PriceSuggestionModal from '../components/PriceSuggestionModal';
import { formatPrice, normalizeString } from '../lib/utils';

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
  
  // Stati per importazione CSV Shopify
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvShopifyProducts, setCsvShopifyProducts] = useState([]);
  const [csvSelectedForImport, setCsvSelectedForImport] = useState([]);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvImportProgress, setCsvImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [csvSearch, setCsvSearch] = useState('');
  const [csvImportMode, setCsvImportMode] = useState('new'); // 'new', 'update', 'all'
  const [shopifyMessage, setShopifyMessage] = useState('');
  const csvFileInputRef = useRef(null);

  const downloadStockTemplate = () => {
    const headers = ['SKU', 'Quantità', 'Prezzo'];
    const sampleData = [
      ['SKU001', '10', '29,99'],
      ['SKU002', '5', '15,50']
    ];
    
    const csvContent = [
      headers.join(';'),
      ...(Array.isArray(sampleData) ? sampleData : []).map(row => row.join(';'))
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
      ...(Array.isArray(sampleData) ? sampleData : []).map(row => row.join(';'))
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

      const normalize = s => normalizeString(s);
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

      const normalize = s => normalizeString(s);
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
      const result = await loadMagazzino();
      let magazzino = result.success ? result.data : [];
      let toImport = [...csvData];

    const processNext = async () => {
      if (toImport.length === 0) {
        try {
          // Salva su Firebase
          for (const item of magazzino) {
            await saveMagazzino(item);
          }
          // Salva anche in localStorage come backup
          saveToLocalStorage('magazzino_data', magazzino);
          setIsLoading(false);
          setMessage('Stock caricato e magazzino aggiornato su Firebase!');
          setCsvData([]);
        } catch (error) {
          console.error('Errore nel salvare su Firebase:', error);
          setMessage('Errore nel salvare i dati su Firebase');
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
      const result = await loadMagazzino();
      let magazzino = result.success ? result.data : [];
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
      
      // Salva su Firebase
      for (const item of magazzino) {
        await saveMagazzino(item);
      }
      // Salva anche in localStorage come backup
      saveToLocalStorage('magazzino_data', magazzino);
      
      setManualProducts([{ sku: '', nome: '', quantita: '', prezzo: '' }]);
      setMessage(`${validProducts.length} prodotto/i aggiunto/i manualmente su Firebase!`);
    } catch (error) {
      console.error('Errore nel salvare su Firebase:', error);
      setMessage('Errore nel salvare i dati su Firebase');
    }
  };

  const handleUploadAnagrafica = async () => {
    if (anagraficaData.length === 0) {
      setAnagraficaMessage('Nessun dato anagrafica da caricare');
      return;
    }
    setIsLoading(true);

    try {
      const result = await loadMagazzino();
      let magazzino = result.success ? result.data : [];
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

      // Salva su Firebase
      for (const item of magazzino) {
        await saveMagazzino(item);
      }
      // Salva anche in localStorage come backup
      saveToLocalStorage('magazzino_data', magazzino);
      
      setAnagraficaData([]);
      setIsLoading(false);
      setAnagraficaMessage(`Anagrafica caricata su Firebase: ${updatedCount} aggiornati, ${newCount} nuovi prodotti`);
    } catch (error) {
      console.error('Errore nel salvare anagrafica su Firebase:', error);
      setAnagraficaMessage('Errore nel salvare i dati anagrafica su Firebase');
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCsvData([]);
    setAnagraficaData([]);
    setMessage('');
    setAnagraficaMessage('');
  };

  // ========== FUNZIONI IMPORTAZIONE CSV SHOPIFY ==========
  
  // Parser CSV robusto che gestisce virgole dentro i campi quotati
  const parseShopifyCSV = (text) => {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        currentLine.push(currentField.trim());
        if (currentLine.some(f => f)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentField += char;
      }
    }
    
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f)) {
        lines.push(currentLine);
      }
    }
    
    return lines;
  };

  // Gestione file CSV Shopify
  const handleShopifyCsvFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setCsvImportLoading(true);
    setCsvImportProgress({ current: 0, total: 0, status: 'Lettura file CSV...' });
    
    try {
      const text = await file.text();
      const lines = parseShopifyCSV(text);
      
      if (lines.length < 2) {
        setShopifyMessage('Errore: Il file CSV sembra vuoto o non valido');
        setCsvImportLoading(false);
        return;
      }
      
      // Trova indici delle colonne Shopify
      const headers = lines[0].map(h => h.toLowerCase().trim());
      const colIndex = {
        handle: headers.indexOf('handle'),
        title: headers.indexOf('title'),
        vendor: headers.indexOf('vendor'),
        type: headers.indexOf('type'),
        tags: headers.indexOf('tags'),
        variantSku: headers.indexOf('variant sku'),
        variantPrice: headers.indexOf('variant price'),
        variantComparePrice: headers.indexOf('variant compare at price'),
        variantBarcode: headers.indexOf('variant barcode'),
        variantInventory: headers.indexOf('variant inventory qty'),
        variantWeight: headers.indexOf('variant grams'),
        imageSrc: headers.indexOf('image src'),
        imageAlt: headers.indexOf('image alt text'),
        variantImage: headers.indexOf('variant image'),
        status: headers.indexOf('status'),
        variantTitle: headers.indexOf('option1 value') !== -1 ? headers.indexOf('option1 value') : headers.indexOf('variant inventory policy'),
      };
      
      // Verifica che ci siano le colonne essenziali
      if (colIndex.title === -1 && colIndex.handle === -1) {
        setShopifyMessage('Errore: Il CSV non sembra essere un export prodotti Shopify valido. Mancano le colonne Title o Handle.');
        setCsvImportLoading(false);
        return;
      }
      
      setCsvImportProgress({ current: 0, total: lines.length - 1, status: 'Elaborazione prodotti...' });
      
      // Mappa per raggruppare varianti sotto lo stesso prodotto
      const productsMap = new Map();
      let currentHandle = '';
      let currentTitle = '';
      let currentVendor = '';
      let currentType = '';
      let currentTags = '';
      let currentMainImage = '';
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        
        // Aggiorna progresso ogni 50 righe
        if (i % 50 === 0) {
          setCsvImportProgress({ current: i, total: lines.length - 1, status: `Elaborazione riga ${i}/${lines.length - 1}...` });
          await new Promise(r => setTimeout(r, 0));
        }
        
        const getValue = (idx) => idx !== -1 && row[idx] ? row[idx].trim() : '';
        
        // Se c'è un handle, è un nuovo prodotto principale
        const handle = getValue(colIndex.handle);
        const title = getValue(colIndex.title);
        const vendor = getValue(colIndex.vendor);
        const type = getValue(colIndex.type);
        const tags = getValue(colIndex.tags);
        const imageSrc = getValue(colIndex.imageSrc);
        
        if (handle) {
          currentHandle = handle;
          currentTitle = title || currentTitle;
          currentVendor = vendor || currentVendor;
          currentType = type || currentType;
          currentTags = tags || currentTags;
          currentMainImage = imageSrc || currentMainImage;
        }
        
        // Dati variante
        const variantSku = getValue(colIndex.variantSku);
        const variantPrice = parseFloat(getValue(colIndex.variantPrice)) || 0;
        const variantComparePrice = parseFloat(getValue(colIndex.variantComparePrice)) || 0;
        const variantBarcode = getValue(colIndex.variantBarcode);
        const variantInventory = parseInt(getValue(colIndex.variantInventory)) || 0;
        const variantWeight = parseFloat(getValue(colIndex.variantWeight)) || 0;
        const variantImage = getValue(colIndex.variantImage);
        const variantTitle = getValue(colIndex.variantTitle);
        
        // Salta righe senza SKU o senza titolo
        if (!variantSku && !currentTitle) continue;
        
        // Chiave unica: SKU o handle + variant
        const uniqueKey = variantSku || `${currentHandle}_${i}`;
        
        // Nome completo con variante
        let fullName = currentTitle;
        if (variantTitle && variantTitle !== 'Default Title') {
          fullName = `${currentTitle} - ${variantTitle}`;
        }
        
        // Immagine: preferisci variante, poi principale
        const finalImage = variantImage || currentMainImage;
        
        const productData = {
          sku: variantSku || uniqueKey,
          nome: fullName,
          handle: currentHandle,
          prezzo: variantPrice,
          prezzoOriginale: variantComparePrice,
          quantita: variantInventory,
          marca: currentVendor,
          tipologia: currentType,
          tags: currentTags,
          barcode: variantBarcode,
          peso: variantWeight,
          immagine: finalImage,
          variantTitle: variantTitle,
          status: getValue(colIndex.status) || 'active'
        };
        
        // Aggiungi solo se ha dati significativi
        if (productData.sku && (productData.nome || productData.prezzo > 0)) {
          productsMap.set(productData.sku, productData);
        }
      }
      
      const products = Array.from(productsMap.values());
      
      setCsvShopifyProducts(products);
      setCsvSelectedForImport([]);
      setShopifyMessage(`${products.length} prodotti trovati nel CSV Shopify`);
      setCsvImportProgress({ current: lines.length - 1, total: lines.length - 1, status: `${products.length} prodotti trovati!` });
      
    } catch (error) {
      console.error('Errore parsing CSV:', error);
      setShopifyMessage('Errore nella lettura del file CSV: ' + error.message);
    }
    
    setCsvImportLoading(false);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  // Ottieni dati magazzino per confronto
  const getMagazzinoData = async () => {
    try {
      const result = await loadMagazzino();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Errore caricamento magazzino:', error);
      return loadFromLocalStorage('magazzino_data', []);
    }
  };

  // Filtra prodotti CSV
  const getFilteredCsvProducts = (magazzinoData = []) => {
    let filtered = csvShopifyProducts;
    
    // Filtro per modalità
    if (csvImportMode === 'new') {
      const existingSkus = new Set(magazzinoData.map(p => p.sku));
      filtered = filtered.filter(p => !existingSkus.has(p.sku));
    } else if (csvImportMode === 'update') {
      const existingSkus = new Set(magazzinoData.map(p => p.sku));
      filtered = filtered.filter(p => existingSkus.has(p.sku));
    }
    
    // Filtro per ricerca
    if (csvSearch) {
      const term = csvSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.nome?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.marca?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // Toggle selezione CSV
  const toggleCsvSelectForImport = (sku) => {
    setCsvSelectedForImport(prev => {
      if (prev.includes(sku)) {
        return prev.filter(s => s !== sku);
      } else {
        return [...prev, sku];
      }
    });
  };

  // Seleziona tutti CSV
  const toggleCsvSelectAll = async () => {
    const magazzinoData = await getMagazzinoData();
    const filteredProducts = getFilteredCsvProducts(magazzinoData);
    if (csvSelectedForImport.length === filteredProducts.length) {
      setCsvSelectedForImport([]);
    } else {
      setCsvSelectedForImport(filteredProducts.map(p => p.sku));
    }
  };

  // Importa prodotti CSV selezionati
  const handleShopifyCsvImportSelected = async () => {
    if (csvSelectedForImport.length === 0) {
      setShopifyMessage('Seleziona almeno un prodotto da importare');
      return;
    }

    const productsToImport = csvShopifyProducts.filter(p => csvSelectedForImport.includes(p.sku));
    
    let imported = 0;
    let updated = 0;
    let failed = 0;

    setCsvImportLoading(true);
    setCsvImportProgress({ current: 0, total: productsToImport.length, status: 'Importazione in corso...' });

    try {
      const result = await loadMagazzino();
      let magazzino = result.success ? result.data : [];
      const existingProducts = new Map(magazzino.map(p => [p.sku, p]));

      for (let i = 0; i < productsToImport.length; i++) {
        const product = productsToImport[i];
        
        setCsvImportProgress({ 
          current: i + 1, 
          total: productsToImport.length, 
          status: `Importazione ${product.sku}...` 
        });

        const existingProduct = existingProducts.get(product.sku);
        
        const productData = {
          sku: product.sku,
          nome: product.nome,
          quantita: product.quantita || (existingProduct?.quantita || 0),
          prezzo: product.prezzo || (existingProduct?.prezzo || 0),
          prezzoOriginale: product.prezzoOriginale,
          marca: product.marca || (existingProduct?.marca || ''),
          tipologia: product.tipologia || (existingProduct?.tipologia || ''),
          tags: product.tags,
          barcode: product.barcode || (existingProduct?.barcode || ''),
          peso: product.peso,
          immagine: product.immagine || (existingProduct?.immagine || ''),
          handle: product.handle,
          anagrafica: existingProduct?.anagrafica || ''
        };

        try {
          const saveResult = await saveMagazzino(productData);
          
          if (saveResult.success) {
            if (existingProduct) {
              // Aggiorna prodotto esistente nell'array
              const idx = magazzino.findIndex(p => p.sku === product.sku);
              if (idx !== -1) {
                magazzino[idx] = { ...productData, id: saveResult.id || existingProduct.id };
              }
              updated++;
            } else {
              // Nuovo prodotto
              magazzino.push({ ...productData, id: saveResult.id });
              existingProducts.set(product.sku, productData);
              imported++;
            }
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Errore importazione:', product.sku, error);
          failed++;
        }

        // Piccola pausa ogni 10 prodotti per non bloccare UI
        if (i % 10 === 0) {
          await new Promise(r => setTimeout(r, 10));
        }
      }

      // Salva anche in localStorage come backup
      saveToLocalStorage('magazzino_data', magazzino);

      setCsvImportLoading(false);
      setCsvImportProgress({ current: 0, total: 0, status: '' });

      setShopifyMessage(`Importazione completata! ✅ Nuovi: ${imported} | 🔄 Aggiornati: ${updated} | ❌ Falliti: ${failed}`);
      
      if (failed === 0) {
        setShowCsvModal(false);
        setCsvShopifyProducts([]);
        setCsvSelectedForImport([]);
      }
    } catch (error) {
      console.error('Errore importazione:', error);
      setShopifyMessage('Errore durante l\'importazione: ' + error.message);
      setCsvImportLoading(false);
    }
  };

  // Stato magazzino per filtri (caricato al bisogno)
  const [magazzinoForFilter, setMagazzinoForFilter] = useState([]);
  
  // Carica magazzino quando si apre il modal
  const openShopifyCsvModal = async () => {
    setShowCsvModal(true);
    const data = await getMagazzinoData();
    setMagazzinoForFilter(data);
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

      {/* CARD IMPORTAZIONE CSV SHOPIFY */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <ShoppingBag className="h-5 w-5" />
            Importa Anagrafica da CSV Shopify
          </CardTitle>
          <CardDescription className="text-green-800">
            Importa l'anagrafica completa dei prodotti da un export CSV di Shopify, incluse <b>immagini, marca, tipologia, barcode e prezzi</b>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={openShopifyCsvModal}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Apri Importazione CSV Shopify
            </Button>
          </div>

          {shopifyMessage && (
            <div className={`p-3 rounded-md ${
              shopifyMessage.includes('Errore') 
                ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                : 'bg-green-100 text-green-900 border border-green-200'
            }`}>
              {shopifyMessage}
            </div>
          )}

          <div className="text-sm text-green-700 bg-green-100 rounded-lg p-3">
            <p className="font-semibold mb-1">Come esportare da Shopify:</p>
            <ol className="list-decimal list-inside space-y-1 text-green-600">
              <li>Vai su Shopify Admin → Prodotti</li>
              <li>Clicca "Esporta" in alto a destra</li>
              <li>Seleziona "Tutti i prodotti" o i prodotti desiderati</li>
              <li>Formato: <b>Plain CSV file</b></li>
              <li>Carica il file qui</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleManualSubmit} className="mt-8 p-4 border rounded bg-muted/30 space-y-2">
        <h3 className="font-semibold mb-2">Aggiungi prodotti manualmente</h3>
        {(Array.isArray(manualProducts) ? manualProducts : []).map((product, index) => (
          <div key={index} className="flex flex-col sm:flex-row gap-2 items-center">
            <input name="sku" value={product.sku} onChange={(e) => handleManualInput(e, index)} placeholder="SKU" className="flex-1 px-2 py-1 border rounded" />
            <input name="nome" value={product.nome} onChange={(e) => handleManualInput(e, index)} placeholder="Nome" className="flex-1 px-2 py-1 border rounded" />
            <input name="quantita" value={product.quantita} onChange={(e) => handleManualInput(e, index)} placeholder="Quantità" type="number" min={1} className="w-24 px-2 py-1 border rounded" />
            <input name="prezzo" value={product.prezzo} onChange={(e) => handleManualInput(e, index)} placeholder="Prezzo" type="text" className="w-24 px-2 py-1 border rounded" />
            {(Array.isArray(manualProducts) ? manualProducts : []).length > 1 && (
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
                  {(Array.isArray(csvData) ? csvData : []).map((item, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border border-border px-4 py-2">{item.sku}</td>
                      <td className="border border-border px-4 py-2">{item.quantita}</td>
                      <td className="border border-border px-4 py-2">{formatPrice(item.prezzo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      {(Array.isArray(anagraficaData) ? anagraficaData : []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anteprima Dati Anagrafica</CardTitle>
            <CardDescription>
              {(Array.isArray(anagraficaData) ? anagraficaData : []).length} elementi pronti per il caricamento
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
                  {(Array.isArray(anagraficaData) ? anagraficaData : []).map((item, index) => (
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

      {/* MODAL IMPORTAZIONE CSV SHOPIFY */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Importa Anagrafica da CSV Shopify</h2>
                    <p className="text-white/80 text-sm">Carica l'export CSV dei prodotti Shopify con immagini e anagrafica completa</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvShopifyProducts([]);
                    setCsvSelectedForImport([]);
                    setShopifyMessage('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Caricamento file */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[300px]">
                  <label className="flex items-center justify-center w-full h-14 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 hover:border-green-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <Upload className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600 font-medium">
                        {csvImportLoading ? 'Elaborazione...' : 'Clicca o trascina il file CSV Shopify'}
                      </span>
                    </div>
                    <input 
                      ref={csvFileInputRef}
                      type="file" 
                      accept=".csv"
                      className="hidden"
                      onChange={handleShopifyCsvFileSelect}
                      disabled={csvImportLoading}
                    />
                  </label>
                </div>
                
                {csvShopifyProducts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Modalità:</label>
                      <select 
                        value={csvImportMode}
                        onChange={(e) => setCsvImportMode(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="new">Solo nuovi prodotti</option>
                        <option value="update">Solo aggiornamenti</option>
                        <option value="all">Tutti</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cerca per nome, SKU, marca o barcode..."
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={csvSearch}
                          onChange={(e) => setCsvSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Progress bar */}
              {csvImportProgress.total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{csvImportProgress.status}</span>
                    <span>{csvImportProgress.current}/{csvImportProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(csvImportProgress.current / csvImportProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Statistiche */}
            {csvShopifyProducts.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 border-b flex flex-wrap items-center gap-4 text-sm">
                <span className="text-blue-700 font-medium flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {csvShopifyProducts.length} nel CSV
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-green-700 font-medium">
                  {getFilteredCsvProducts(magazzinoForFilter).length} visualizzati
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-[#c68776] font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {csvSelectedForImport.length} selezionati
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-orange-700 font-medium">
                  {csvShopifyProducts.filter(p => magazzinoForFilter.some(m => m.sku === p.sku)).length} già esistenti
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-purple-700 font-medium flex items-center gap-1">
                  <Image className="h-4 w-4" />
                  {csvShopifyProducts.filter(p => p.immagine).length} con immagine
                </span>
                
                <div className="ml-auto">
                  <button
                    onClick={toggleCsvSelectAll}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    {csvSelectedForImport.length === getFilteredCsvProducts(magazzinoForFilter).length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista prodotti */}
            <div className="flex-1 overflow-auto p-4">
              {csvShopifyProducts.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center text-gray-500">
                    <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium text-lg">Carica un file CSV Shopify</p>
                    <p className="text-sm mt-2 max-w-md mx-auto">
                      Vai su Shopify → Prodotti → Esporta → seleziona "Plain CSV file" e carica il file qui.
                      <br />
                      Verranno importati SKU, nome, prezzo, quantità, marca, tipologia, barcode e immagini.
                    </p>
                  </div>
                </div>
              ) : getFilteredCsvProducts(magazzinoForFilter).length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nessun prodotto corrisponde ai filtri</p>
                    <p className="text-sm mt-1">Prova a cambiare la modalità o il termine di ricerca</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header tabella */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 uppercase">
                    <div className="col-span-1 flex items-center justify-center">Sel.</div>
                    <div className="col-span-1">Img</div>
                    <div className="col-span-2">SKU</div>
                    <div className="col-span-3">Nome</div>
                    <div className="col-span-1">Prezzo</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-1">Marca</div>
                    <div className="col-span-1">Tipo</div>
                    <div className="col-span-1">Status</div>
                  </div>
                  
                  {/* Righe prodotti */}
                  {getFilteredCsvProducts(magazzinoForFilter).map((product) => {
                    const isSelected = csvSelectedForImport.includes(product.sku);
                    const alreadyExists = magazzinoForFilter.some(m => m.sku === product.sku);
                    
                    return (
                      <div
                        key={product.sku}
                        onClick={() => toggleCsvSelectForImport(product.sku)}
                        className={`grid grid-cols-12 gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all items-center ${
                          isSelected 
                            ? 'bg-green-50 border-2 border-green-500' 
                            : alreadyExists
                              ? 'bg-orange-50 border border-orange-200 hover:border-orange-400'
                              : 'bg-white border border-gray-200 hover:border-green-400 hover:shadow-sm'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="col-span-1 flex items-center justify-center">
                          {isSelected ? (
                            <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                        
                        {/* Immagine */}
                        <div className="col-span-1">
                          {product.immagine ? (
                            <img 
                              src={product.immagine} 
                              alt={product.nome}
                              className="w-10 h-10 object-cover rounded border"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        
                        {/* SKU */}
                        <div className="col-span-2 font-mono text-xs text-gray-700 truncate" title={product.sku}>
                          {product.sku}
                        </div>
                        
                        {/* Nome */}
                        <div className="col-span-3 font-medium text-gray-900 truncate text-sm" title={product.nome}>
                          {product.nome}
                        </div>
                        
                        {/* Prezzo */}
                        <div className="col-span-1 text-green-700 font-semibold text-sm">
                          €{(product.prezzo || 0).toFixed(2)}
                        </div>
                        
                        {/* Quantità */}
                        <div className="col-span-1 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            product.quantita > 10 ? 'bg-green-100 text-green-700' :
                            product.quantita > 0 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {product.quantita || 0}
                          </span>
                        </div>
                        
                        {/* Marca */}
                        <div className="col-span-1 text-xs text-gray-600 truncate" title={product.marca}>
                          {product.marca || '-'}
                        </div>
                        
                        {/* Tipo */}
                        <div className="col-span-1 text-xs text-gray-600 truncate" title={product.tipologia}>
                          {product.tipologia || '-'}
                        </div>
                        
                        {/* Status */}
                        <div className="col-span-1">
                          {alreadyExists ? (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                              Esistente
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              Nuovo
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p><strong>Campi importati:</strong> SKU, Nome, Prezzo, Quantità, Marca, Tipo, Tags, Barcode, Peso, Immagine</p>
                <p className="text-xs text-gray-500 mt-1">I prodotti esistenti verranno aggiornati con i nuovi dati (mantenendo le quantità se non presenti nel CSV)</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvShopifyProducts([]);
                    setCsvSelectedForImport([]);
                    setShopifyMessage('');
                  }}
                >
                  Annulla
                </Button>
                <Button 
                  onClick={handleShopifyCsvImportSelected}
                  disabled={csvSelectedForImport.length === 0 || csvImportLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {csvImportLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importazione...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Importa {csvSelectedForImport.length} prodotti
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage; 