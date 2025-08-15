# 🏪 Magazzino 3.0 - Sistema di Gestione Magazzino

Sistema completo per la gestione di magazzino, ordini, marketing e contabilità aziendale.

## ✨ Caratteristiche

- 📦 **Gestione Magazzino**: Inventario completo con tracking in tempo reale
- 🛒 **Gestione Ordini**: Ordini fornitori e clienti con integrazione Shopify
- 📊 **Dashboard Analytics**: Metriche e report dettagliati
- 💰 **Conto Economico**: Analisi costi, ricavi e profitti
- 📈 **Marketing**: Campagne Google Ads e Meta con tracking ROI
- 🔄 **Sincronizzazione**: Integrazione automatica con piattaforme esterne
- 📱 **Responsive Design**: Interfaccia ottimizzata per tutti i dispositivi

## 🚀 Deploy Live

**🌐 Applicazione Live:** [Link Netlify]

## 🛠️ Tecnologie

- **Frontend**: React 18, Tailwind CSS, Recharts
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Integrazioni**: Shopify API, Google Ads API, Meta Marketing API
- **Deploy**: Netlify

## 📋 Prerequisiti

- Node.js 18+ 
- npm o yarn
- Account Supabase
- Account Shopify (opzionale)
- Account Google Ads (opzionale)
- Account Meta Business (opzionale)

## 🔧 Installazione Locale

1. **Clona il repository**
   ```bash
   git clone [URL_REPOSITORY]
   cd magazzino-3.0
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   ```bash
   cp .env.example .env
   # Modifica .env con le tue credenziali
   ```

4. **Avvia il progetto**
   ```bash
   npm run dev
   ```

5. **Apri nel browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3002

## 🌍 Variabili d'Ambiente

Crea un file `.env` con:

```env
# Supabase
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key

# Shopify (opzionale)
REACT_APP_SHOPIFY_STORE_URL=your_store.myshopify.com
REACT_APP_SHOPIFY_ACCESS_TOKEN=your_access_token

# Google Ads (opzionale)
REACT_APP_GOOGLE_ADS_CLIENT_ID=your_client_id
REACT_APP_GOOGLE_ADS_CLIENT_SECRET=your_client_secret

# Meta Marketing (opzionale)
REACT_APP_META_CLIENT_ID=your_client_id
REACT_APP_META_CLIENT_SECRET=your_client_secret
```

## 📚 Script Disponibili

- `npm run dev` - Avvia frontend e backend in modalità sviluppo
- `npm start` - Avvia solo il frontend React
- `npm run server` - Avvia solo il backend Express
- `npm run build` - Build per produzione
- `npm run test` - Esegue i test

## 🏗️ Struttura del Progetto

```
src/
├── components/          # Componenti React riutilizzabili
├── pages/              # Pagine dell'applicazione
├── lib/                # Librerie e utility
├── config/             # Configurazioni
└── ui/                 # Componenti UI base
```

## 🔌 API Endpoints

- `GET /api/shopify/test` - Test connessione Shopify
- `POST /api/shopify/save-credentials` - Salva credenziali Shopify
- `GET /api/shopify/load-credentials` - Carica credenziali Shopify

## 📱 Funzionalità Principali

### Dashboard
- Panoramica vendite e metriche
- Grafici interattivi
- Confronti periodi

### Magazzino
- Gestione inventario
- Tracking stock
- Import/export dati

### Ordini
- Gestione ordini fornitori
- Sincronizzazione Shopify
- Tracking spedizioni

### Marketing
- Campagne Google Ads
- Campagne Meta
- ROI tracking

### Contabilità
- Analisi costi
- Calcolo profitti
- Report finanziari

## 🚀 Deploy su Netlify

1. **Push su GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connetti a Netlify**
   - Vai su [netlify.com](https://netlify.com)
   - Connetti il repository GitHub
   - Configura build settings:
     - Build command: `npm run build`
     - Publish directory: `build`

3. **Variabili d'ambiente su Netlify**
   - Aggiungi le variabili d'ambiente nel pannello Netlify
   - Rinomina `REACT_APP_` in `REACT_APP_`

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi `LICENSE` per dettagli.

## 📞 Supporto

Per supporto o domande:
- 📧 Email: [your-email]
- 🐛 Issues: [GitHub Issues]
- 📖 Documentazione: [Link Docs]

---

**⭐ Se ti piace questo progetto, lascia una stella su GitHub!**
