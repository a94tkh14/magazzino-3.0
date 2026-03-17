import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import Button from './ui/button';
import { Tag, Package, Save, X } from 'lucide-react';

const ProductAnagrafica = ({ sku, nome, onSave, onCancel }) => {
  const [tipologia, setTipologia] = useState(localStorage.getItem(`tipologia_${sku}`) || '');
  const [marca, setMarca] = useState(localStorage.getItem(`marca_${sku}`) || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    localStorage.setItem(`tipologia_${sku}`, tipologia);
    localStorage.setItem(`marca_${sku}`, marca);
    onSave && onSave({ sku, tipologia, marca });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTipologia(localStorage.getItem(`tipologia_${sku}`) || '');
    setMarca(localStorage.getItem(`marca_${sku}`) || '');
    setIsEditing(false);
    onCancel && onCancel();
  };

  const currentTipologia = localStorage.getItem(`tipologia_${sku}`) || '';
  const currentMarca = localStorage.getItem(`marca_${sku}`) || '';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Anagrafica Prodotto
        </CardTitle>
        <CardDescription>
          Gestisci tipologia e marca per {nome} (SKU: {sku})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Tipologia:</span>
                <span className={currentTipologia ? 'text-green-600' : 'text-muted-foreground'}>
                  {currentTipologia || 'Non impostata'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Marca:</span>
                <span className={currentMarca ? 'text-green-600' : 'text-muted-foreground'}>
                  {currentMarca || 'Non impostata'}
                </span>
              </div>
            </div>
            <Button 
              onClick={() => setIsEditing(true)}
              className="w-full"
            >
              Modifica Anagrafica
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tipologia</label>
                <Input
                  type="text"
                  placeholder="Es. Abbigliamento, Accessori, Calzature..."
                  value={tipologia}
                  onChange={(e) => setTipologia(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Marca</label>
                <Input
                  type="text"
                  placeholder="Es. Nike, Adidas, Zara..."
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                className="flex-1"
                disabled={!tipologia.trim() && !marca.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Salva
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductAnagrafica; 