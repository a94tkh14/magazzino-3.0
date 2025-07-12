import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const CostiPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analisi Costi</h1>
          <p className="text-muted-foreground">
            Monitoraggio costi e analisi economiche
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>In sviluppo</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Funzionalità in Sviluppo
          </CardTitle>
          <CardDescription>
            Questa sezione sarà presto disponibile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <DollarSign className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analisi Costi</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Questa sezione permetterà di analizzare costi, margini di profitto 
              e trend economici del magazzino.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostiPage; 