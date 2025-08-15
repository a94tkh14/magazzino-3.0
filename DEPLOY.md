# 🚀 Guida al Deploy Online e Gestione Backup

## 📋 Panoramica

Questo progetto include un sistema completo di backup e può essere deployato online su diverse piattaforme.

## 🔧 Sistema di Backup

### Funzionalità
- **Backup Database**: Backup completo di tutte le tabelle
- **Backup Configurazioni**: Salvataggio delle configurazioni API
- **Backup Completo**: Backup combinato di database e configurazioni
- **Ripristino**: Possibilità di ripristinare i dati da backup
- **Backup Automatici**: Pianificazione di backup periodici
- **Gestione File**: Download e upload di file di backup

### Componenti
- `src/lib/backupManager.js` - Logica di gestione backup
- `src/components/BackupManager.jsx` - Interfaccia utente
- `backup_table.sql` - Schema database per i backup

## 🌐 Deploy Online

### Opzione 1: Vercel (Frontend React) - GRATUITO

1. **Installa Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Configura variabili ambiente**:
   - Vai su [vercel.com](https://vercel.com)
   - Seleziona il progetto
   - Settings → Environment Variables
   - Aggiungi:
     ```
     REACT_APP_SUPABASE_URL
     REACT_APP_SUPABASE_ANON_KEY
     REACT_APP_GOOGLE_ADS_CLIENT_ID
     REACT_APP_GOOGLE_ADS_CLIENT_SECRET
     REACT_APP_META_CLIENT_ID
     REACT_APP_META_CLIENT_SECRET
     ```

### Opzione 2: Netlify (Frontend React) - GRATUITO

1. **Connetti repository GitHub**:
   - Vai su [netlify.com](https://netlify.com)
   - "New site from Git"
   - Seleziona il repository

2. **Configura build**:
   - Build command: `npm run build`
   - Publish directory: `build`

3. **Configura variabili ambiente**:
   - Site settings → Environment variables
   - Aggiungi le stesse variabili di Vercel

### Opzione 3: Railway (Backend Express) - A PARTIRE DA $5/mese

1. **Installa Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Deploy**:
   ```bash
   railway init
   railway up
   ```

4. **Configura variabili ambiente**:
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   ```

### Opzione 4: Heroku (Backend Express) - A PARTIRE DA $7/mese

1. **Installa Heroku CLI**:
   ```bash
   npm install -g heroku
   ```

2. **Login**:
   ```bash
   heroku login
   ```

3. **Crea app**:
   ```bash
   heroku create magazzino-app-backend
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

5. **Configura variabili**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PORT=3000
   ```

## 🗄️ Database e Backup

### Setup Database Supabase

1. **Esegui lo script SQL**:
   ```bash
   # Copia il contenuto di backup_table.sql
   # Eseguilo nel tuo database Supabase
   ```

2. **Verifica le tabelle**:
   - `backups` - Gestione backup
   - `configurazioni` - Configurazioni API
   - `impostazioni_app` - Impostazioni generali

### Backup Automatici

Il sistema supporta backup automatici configurati tramite l'interfaccia:

- **Frequenza**: Giornaliera, settimanale, mensile
- **Tipo**: Database, configurazioni, completo
- **Retention**: Configurabile (default 30 giorni)

### Ripristino Dati

1. **Da interfaccia**: Seleziona backup → Ripristina
2. **Da file**: Upload file JSON → Ripristina
3. **Verifica**: Controlla i dati ripristinati

## 🔒 Sicurezza

### Variabili Ambiente
- **NON committare mai** file `.env`
- Usa le variabili ambiente della piattaforma di hosting
- Rotazione periodica delle chiavi API

### Backup
- I backup contengono dati sensibili
- Archivia in modo sicuro
- Crittografia per backup critici (opzionale)

## 📊 Monitoraggio

### Health Check
- Endpoint: `/api/health`
- Monitora uptime e stato del server
- Configura alert per downtime

### Log
- Log strutturati per debugging
- Monitoraggio errori in produzione
- Metriche performance

## 🚀 Comandi Utili

### Sviluppo Locale
```bash
# Frontend
npm start

# Backend
node server.js

# Build produzione
npm run build
```

### Deploy
```bash
# Vercel
vercel --prod

# Railway
railway up

# Heroku
git push heroku main
```

### Backup
```bash
# Backup manuale database
node -e "const bm = require('./src/lib/backupManager'); bm.createDatabaseBackup();"

# Backup completo
node -e "const bm = require('./src/lib/backupManager'); bm.createFullBackup();"
```

## 📝 Checklist Deploy

- [ ] Variabili ambiente configurate
- [ ] Database Supabase configurato
- [ ] Tabelle backup create
- [ ] Test backup locali
- [ ] Deploy frontend (Vercel/Netlify)
- [ ] Deploy backend (Railway/Heroku)
- [ ] Test endpoint API
- [ ] Test sistema backup
- [ ] Configurazione backup automatici
- [ ] Monitoraggio health check

## 🆘 Troubleshooting

### Problemi Comuni

1. **Backup fallisce**:
   - Verifica connessione database
   - Controlla permessi tabelle
   - Verifica spazio disco

2. **Deploy fallisce**:
   - Controlla variabili ambiente
   - Verifica build locale
   - Controlla log deploy

3. **API non funzionano**:
   - Verifica CORS
   - Controlla endpoint health
   - Verifica variabili ambiente

### Supporto
- Controlla i log della piattaforma
- Verifica configurazione database
- Testa endpoint localmente

## 🔄 Aggiornamenti

### Deploy Automatico
- Connessione GitHub per deploy automatico
- Branch protection per produzione
- Test automatici prima del deploy

### Rollback
- Mantieni versioni precedenti
- Backup prima di aggiornamenti
- Deploy graduale per test

---

**Nota**: Questa guida copre i passaggi principali. Adatta le istruzioni in base alle tue esigenze specifiche e alla piattaforma scelta. 