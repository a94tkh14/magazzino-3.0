# Magazzino App

Un'applicazione per la gestione del magazzino con integrazione Shopify.

## Funzionalità

- Gestione magazzino e stock
- Integrazione con Shopify per ordini
- Dashboard con statistiche
- Gestione ordini fornitori
- Tracking spedizioni
- Marketing dashboard con integrazione Google Ads e Meta

## Installazione

```bash
npm install
```

## Configurazione

### Variabili d'ambiente

Crea un file `.env` nella root del progetto:

```env
# Shopify
REACT_APP_SHOPIFY_STORE_URL=your-store.myshopify.com
REACT_APP_SHOPIFY_ACCESS_TOKEN=your-access-token

# Google Ads API (opzionale)
REACT_APP_GOOGLE_ADS_CLIENT_ID=your-google-ads-client-id
REACT_APP_GOOGLE_ADS_CLIENT_SECRET=your-google-ads-client-secret

# Meta Marketing API (opzionale)
REACT_APP_META_CLIENT_ID=your-meta-client-id
REACT_APP_META_CLIENT_SECRET=your-meta-client-secret
```

### Setup OAuth per Google Ads e Meta

Per utilizzare le funzionalità di marketing con Google Ads e Meta, è necessario configurare le credenziali OAuth:

#### Google Ads API
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita l'API Google Ads
4. Crea credenziali OAuth 2.0
5. Aggiungi gli URI di reindirizzamento:
   - `http://localhost:3000/auth/google-ads/callback` (sviluppo)
   - `https://tuodominio.com/auth/google-ads/callback` (produzione)
6. Copia Client ID e Client Secret nel file `.env`

#### Meta Marketing API
1. Vai su [Facebook Developers](https://developers.facebook.com/)
2. Crea una nuova app
3. Aggiungi il prodotto "Marketing API"
4. Configura le impostazioni OAuth
5. Aggiungi gli URI di reindirizzamento:
   - `http://localhost:3000/auth/meta/callback` (sviluppo)
   - `https://tuodominio.com/auth/meta/callback` (produzione)
6. Copia App ID e App Secret nel file `.env`

## Avvio

### Backend
```bash
npm run server
```

### Frontend
```bash
npm start
```

L'applicazione sarà disponibile su `http://localhost:3000`

## Note

- Le funzionalità di marketing richiedono la configurazione delle credenziali OAuth
- Senza le credenziali, la pagina Marketing mostrerà solo i dati stimati basati sugli ordini Shopify
- Per utilizzare le API reali, configura le credenziali e riavvia l'applicazione
