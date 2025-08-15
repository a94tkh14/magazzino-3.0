# 🚀 Guida al Deploy - Magazzino 3.0

## 📋 Prerequisiti

- Account GitHub
- Account Netlify (gratuito)
- Node.js 18+ installato localmente

## 🔧 Passo 1: Creare Repository GitHub

1. **Vai su [GitHub.com](https://github.com)**
2. **Clicca "New repository"**
3. **Configura il repository:**
   - Repository name: `magazzino-3.0`
   - Description: `Sistema completo di gestione magazzino con integrazione Shopify`
   - Public (raccomandato per progetti open source)
   - NON inizializzare con README (abbiamo già i file)

4. **Clicca "Create repository"**

## 🔗 Passo 2: Collegare Repository Locale a GitHub

```bash
# Sostituisci YOUR_USERNAME con il tuo username GitHub
git remote add origin https://github.com/YOUR_USERNAME/magazzino-3.0.git

# Verifica il remote
git remote -v

# Push del codice
git branch -M main
git push -u origin main
```

## 🌐 Passo 3: Deploy su Netlify

### 3.1 Accedi a Netlify
1. **Vai su [Netlify.com](https://netlify.com)**
2. **Clicca "Sign up" o "Log in"**
3. **Accedi con il tuo account GitHub**

### 3.2 Connetti il Repository
1. **Clicca "New site from Git"**
2. **Scegli "GitHub"**
3. **Autorizza Netlify ad accedere ai tuoi repository**
4. **Seleziona il repository `magazzino-3.0`**

### 3.3 Configura Build Settings
```
Build command: npm run build
Publish directory: build
```

### 3.4 Configura Variabili d'Ambiente
Nel pannello Netlify, vai su **Site settings > Environment variables** e aggiungi:

```env
REACT_APP_SUPABASE_URL=https://fljxahdybqllfwzlkeum.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanhhaGR5YnFsbGZ3emxrZXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTEzNzQsImV4cCI6MjA2Nzk4NzM3NH0.soXqjjJF42FbgSGCTgx8na1vmt2rAepnY6pP0JO44wY
REACT_APP_META_CLIENT_ID=4210262035874020
REACT_APP_META_CLIENT_SECRET=ea0866b64ada2f0984b7d7c8c54f9f1b
```

### 3.5 Deploy
1. **Clicca "Deploy site"**
2. **Aspetta che il build sia completato (2-5 minuti)**
3. **Il sito sarà disponibile su un URL Netlify (es: `https://random-name.netlify.app`)**

## 🔧 Passo 4: Configurazione Avanzata

### 4.1 Dominio Personalizzato (Opzionale)
1. **Nel pannello Netlify, vai su "Domain settings"**
2. **Clicca "Add custom domain"**
3. **Inserisci il tuo dominio**
4. **Configura i DNS del tuo provider**

### 4.2 HTTPS Automatico
- Netlify fornisce automaticamente certificati SSL gratuiti
- HTTPS è abilitato di default

### 4.3 Branch Deploy
- Ogni push su `main` triggera automaticamente un nuovo deploy
- Puoi configurare deploy automatici per altri branch

## 📱 Passo 5: Test dell'Applicazione

1. **Apri l'URL Netlify nel browser**
2. **Verifica che tutte le funzionalità funzionino:**
   - Dashboard
   - Gestione Magazzino
   - Ordini
   - Marketing
   - Conto Economico

## 🚨 Risoluzione Problemi

### Build Fallisce
- Controlla i log di build su Netlify
- Verifica che `npm run build` funzioni localmente
- Controlla le variabili d'ambiente

### App Non Funziona
- Verifica che le variabili d'ambiente siano corrette
- Controlla la console del browser per errori
- Verifica che Supabase sia accessibile

### Problemi di Routing
- Verifica che `netlify.toml` sia presente
- Le redirect sono configurate per SPA (Single Page Application)

## 🔄 Aggiornamenti Futuri

Per aggiornare l'applicazione:

```bash
# Fai le modifiche localmente
git add .
git commit -m "Descrizione delle modifiche"
git push origin main

# Netlify farà automaticamente il deploy
```

## 📊 Monitoraggio

- **Netlify Analytics**: Metriche base gratuite
- **Build Logs**: Controlla ogni deploy
- **Performance**: Lighthouse score integrato

## 🎯 Prossimi Passi

1. **Testa l'applicazione su dispositivi diversi**
2. **Configura un dominio personalizzato**
3. **Imposta notifiche per i deploy**
4. **Configura backup automatici**

---

## 🆘 Supporto

Se hai problemi:
1. Controlla i log di build su Netlify
2. Verifica la configurazione GitHub
3. Controlla le variabili d'ambiente
4. Testa localmente prima del deploy

**🎉 Congratulazioni! La tua applicazione è ora live sul web!** 