# Setup OAuth per Google Ads e Meta API

## Panoramica

L'errore "OAuth client was not found" che stai vedendo è normale perché le credenziali OAuth non sono ancora configurate. Questo documento ti guiderà attraverso il processo di configurazione.

## Stato Attuale

- ✅ **Frontend**: Pagina Marketing funzionante con dati stimati
- ✅ **Backend**: Endpoint API pronti per OAuth
- ❌ **OAuth**: Credenziali non configurate

## Configurazione Google Ads API

### 1. Google Cloud Console
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita l'API Google Ads:
   - Vai su "APIs & Services" > "Library"
   - Cerca "Google Ads API"
   - Clicca "Enable"

### 2. Credenziali OAuth
1. Vai su "APIs & Services" > "Credentials"
2. Clicca "Create Credentials" > "OAuth 2.0 Client IDs"
3. Seleziona "Web application"
4. Configura gli URI di reindirizzamento:
   ```
   http://localhost:3000/auth/google-ads/callback
   ```
5. Copia il **Client ID** e **Client Secret**

### 3. Configurazione File .env
Aggiungi al file `.env`:
```env
REACT_APP_GOOGLE_ADS_CLIENT_ID=your-client-id-here
REACT_APP_GOOGLE_ADS_CLIENT_SECRET=your-client-secret-here
```

## Configurazione Meta Marketing API

### 1. Facebook Developers
1. Vai su [Facebook Developers](https://developers.facebook.com/)
2. Crea una nuova app o seleziona una esistente
3. Aggiungi il prodotto "Marketing API"

### 2. Configurazione OAuth
1. Vai su "App Settings" > "Basic"
2. Copia **App ID** e **App Secret**
3. Vai su "Facebook Login" > "Settings"
4. Aggiungi gli URI di reindirizzamento:
   ```
   http://localhost:3000/auth/meta/callback
   ```

### 3. Configurazione File .env
Aggiungi al file `.env`:
```env
REACT_APP_META_CLIENT_ID=your-app-id-here
REACT_APP_META_CLIENT_SECRET=your-app-secret-here
```

## Test della Configurazione

### 1. Riavvia l'Applicazione
```bash
# Ferma i server attuali (Ctrl+C)
npm run server  # Backend
npm start       # Frontend
```

### 2. Verifica la Pagina Marketing
1. Vai su `http://localhost:3000/marketing`
2. Dovresti vedere:
   - ✅ Banner informativo scomparso
   - ✅ Pulsanti "Connetti" attivi
   - ✅ Status "Non connesso" invece di "Non configurato"

### 3. Test Connessione
1. Clicca "Connetti" su Google Ads o Meta
2. Dovresti essere reindirizzato alla pagina di login
3. Dopo l'autorizzazione, tornerai all'app con i dati reali

## Risoluzione Problemi

### Errore "invalid_client"
- Verifica che Client ID e Secret siano corretti
- Assicurati che gli URI di reindirizzamento siano configurati
- Controlla che l'API sia abilitata

### Errore "redirect_uri_mismatch"
- Verifica che l'URI di reindirizzamento nel file `.env` corrisponda a quello configurato nelle console

### Dati non Caricati
- Verifica che l'account abbia campagne attive
- Controlla i permessi dell'app
- Verifica che l'account di advertising sia collegato

## Note Importanti

- **Sviluppo**: Usa `http://localhost:3000` per gli URI di reindirizzamento
- **Produzione**: Cambia gli URI con il tuo dominio
- **Sicurezza**: Non committare mai il file `.env` nel repository
- **Limiti**: Le API hanno limiti di rate e quota giornaliera

## Funzionalità Disponibili

### Con Credenziali Configurate
- ✅ Dati reali da Google Ads e Meta
- ✅ Metriche accurate (CPA, ROAS, CTR)
- ✅ Storico campagne e performance
- ✅ Dati giornalieri dettagliati

### Senza Credenziali (Stato Attuale)
- ✅ Dati stimati basati su ordini Shopify
- ✅ Calcoli CPA/ROAS approssimativi
- ✅ Analisi fonti ordini
- ✅ Dashboard funzionante

## Prossimi Passi

1. Configura le credenziali OAuth seguendo questa guida
2. Testa le connessioni
3. Verifica che i dati reali vengano caricati
4. Configura le notifiche per aggiornamenti automatici

Per assistenza aggiuntiva, consulta la documentazione ufficiale:
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis/) 