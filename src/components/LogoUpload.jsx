import React, { useState, useEffect } from 'react';
import { Upload, X, Image, Type } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

const LogoUpload = ({ onLogoChange, onNameChange }) => {
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [appName, setAppName] = useState('Dashboard');

  // Carica il logo e il nome salvati dal localStorage all'avvio
  useEffect(() => {
    const savedLogo = localStorage.getItem('appLogo');
    const savedName = localStorage.getItem('appName');
    
    if (savedLogo) {
      setLogo(savedLogo);
      setPreview(savedLogo);
    }
    
    if (savedName) {
      setAppName(savedName);
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Verifica che sia un'immagine
      if (!file.type.startsWith('image/')) {
        alert('Per favore seleziona un file immagine (JPG, PNG, GIF)');
        return;
      }

      // Verifica la dimensione del file (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Il file è troppo grande. Dimensione massima: 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        setLogo(result);
        setPreview(result);
        localStorage.setItem('appLogo', result);
        
        // Notifica il cambiamento
        if (onLogoChange) {
          onLogoChange(result);
        }
        
        // Dispara evento personalizzato
        window.dispatchEvent(new CustomEvent('logoChanged', { detail: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setPreview(null);
    localStorage.removeItem('appLogo');
    
    // Notifica il cambiamento
    if (onLogoChange) {
      onLogoChange(null);
    }
    
    // Dispara evento personalizzato
    window.dispatchEvent(new CustomEvent('logoChanged', { detail: null }));
  };

  const handleNameChange = (event) => {
    const newName = event.target.value;
    setAppName(newName);
    localStorage.setItem('appName', newName);
    
    // Notifica il cambiamento
    if (onNameChange) {
      onNameChange(newName);
    }
    
    // Dispara evento personalizzato
    window.dispatchEvent(new CustomEvent('nameChanged', { detail: newName }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Personalizzazione Brand
        </CardTitle>
        <CardDescription>
          Carica il tuo logo e personalizza il nome dell'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome Applicazione */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4" />
            Nome Applicazione
          </label>
          <Input
            type="text"
            value={appName}
            onChange={handleNameChange}
            placeholder="Inserisci il nome dell'applicazione"
            className="w-full"
          />
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Image className="h-4 w-4" />
            Logo Aziendale
          </label>
          
          {!preview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Clicca per caricare il tuo logo
              </p>
              <p className="text-xs text-gray-500">
                Formati supportati: JPG, PNG, GIF (max 2MB)
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Carica Logo
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Logo preview"
                  className="max-h-20 max-w-40 object-contain border rounded-lg"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Logo caricato con successo
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoUpload; 