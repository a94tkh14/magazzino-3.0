# 🚀 Deploy Rapido - Magazzino 3.0

## ⚡ Deploy in 5 Minuti

### 1. GitHub Repository
```bash
# Crea repository su GitHub.com
# Nome: magazzino-3.0
# Public
# NON inizializzare con README
```

### 2. Push Codice
```bash
git remote add origin https://github.com/YOUR_USERNAME/magazzino-3.0.git
git branch -M main
git push -u origin main
```

### 3. Netlify Deploy
1. Vai su [netlify.com](https://netlify.com)
2. "New site from Git" → GitHub
3. Seleziona repository `magazzino-3.0`
4. Build command: `npm run build`
5. Publish directory: `build`
6. Deploy!

### 4. Variabili Ambiente (Netlify)
```
REACT_APP_SUPABASE_URL=https://fljxahdybqllfwzlkeum.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanhhaGR5YnFsbGZ3emxrZXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTEzNzQsImV4cCI6MjA2Nzk4NzM3NH0.soXqjjJF42FbgSGCTgx8na1vmt2rAepnY6pP0JO44wY
REACT_APP_META_CLIENT_ID=4210262035874020
REACT_APP_META_CLIENT_SECRET=ea0866b64ada2f0984b7d7c8c54f9f1b
```

## 🎯 Risultato
- ✅ App live su Netlify
- ✅ HTTPS automatico
- ✅ Deploy automatico da GitHub
- ✅ Dominio personalizzabile

**🎉 Fatto! La tua app è ora accessibile a chiunque sul web!** 