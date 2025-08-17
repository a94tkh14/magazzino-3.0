# 🛍️ Guida Completa Integrazione Shopify

Questa guida ti accompagnerà attraverso la configurazione e l'utilizzo dell'integrazione Shopify nella tua applicazione Magazzino 3.0.

## 📋 Prerequisiti

- Un account Shopify attivo
- Un store Shopify con ordini e prodotti
- Accesso all'admin del tuo store

## 🔧 Configurazione Iniziale

### 1. Creazione App Privata Shopify

1. **Accedi al tuo Shopify Admin**
   - Vai su [admin.shopify.com](https://admin.shopify.com)
   - Accedi con le tue credenziali

2. **Vai alla sezione App**
   - Nel menu laterale, clicca su **App**
   - Clicca su **Gestisci app private**

3. **Crea una nuova app privata**
   - Clicca su **Crea app privata**
   - Inserisci un nome per la tua app (es: "Magazzino 3.0 Integration")
   - Inserisci il tuo indirizzo email

4. **Configura i permessi**
   - **Ordini**: `read_orders` (lettura ordini)
   - **Prodotti**: `read_products` (lettura prodotti)
   - **Clienti**: `read_customers` (lettura clienti)
   - **Shop**: `read_shop` (lettura informazioni shop)

5. **Installa l'app**
   - Clicca su **Installa app**
   - Conferma l'installazione

6. **Copia le credenziali**
   - **API key**: Non necessaria per app private
   - **API secret key**: Non necessaria per app private
   - **Access token**: Copia questo valore (inizia con `shpat_`)
   - **Shop domain**: Il dominio del tuo store (es: `mio-shop.myshopify.com`)

### 2. Configurazione nell'App

1. **Vai alla pagina Impostazioni**
   - Nella tua app Magazzino 3.0, vai su **Impostazioni**
   - Seleziona la tab **Integrazioni**

2. **Inserisci le credenziali**
   - **Dominio Shop**: Inserisci il dominio del tuo store (es: `mio-shop.myshopify.com`)
   - **Access Token**: Inserisci il token copiato da Shopify
   - **Versione API**: Lascia `2024-01` (versione raccomandata)

3. **Salva la configurazione**
   - Clicca su **💾 Salva Configurazione**

4. **Testa la connessione**
   - Clicca su **🔍 Test Connessione** per verificare che tutto funzioni
   - Clicca su **📋 Test Ordini** per verificare l'accesso agli ordini

## 📊 Utilizzo del Sistema

### Sincronizzazione Ordini

1. **Vai alla pagina Ordini Shopify**
   - Nella tua app, vai su **Ordini Shopify**

2. **Sincronizzazione iniziale**
   - Clicca su **Sincronizza Tutti** per scaricare tutti gli ordini
   - Questa operazione può richiedere tempo se hai molti ordini

3. **Sincronizzazione incrementale**
   - Usa **Sincronizza Recenti** per scaricare solo gli ultimi 7 giorni
   - Ideale per mantenere i dati aggiornati

### Gestione Ordini

- **Visualizzazione**: Tutti gli ordini sono visualizzati con informazioni complete
- **Filtri**: Puoi filtrare per status, data, cliente, prodotto
- **Ricerca**: Cerca ordini per numero, cliente, SKU o nome prodotto
- **Statistiche**: Visualizza metriche sui tuoi ordini in tempo reale

### Dettagli Ordine

Ogni ordine include:
- **Informazioni cliente**: Nome, email, telefono
- **Prodotti**: SKU, nome, quantità, prezzo
- **Spedizione**: Costo, tipo, corriere
- **Pagamento**: Status, totale, valuta
- **Indirizzi**: Spedizione e fatturazione completi

## 🔒 Sicurezza

### Best Practices

1. **Non condividere mai l'access token**
   - È come una password per il tuo store
   - Se compromesso, rigeneralo immediatamente

2. **Permessi minimi**
   - L'app richiede solo permessi di lettura
   - Non può modificare ordini o prodotti

3. **Storage locale**
   - Le credenziali sono salvate solo nel tuo browser
   - Non vengono inviate a server esterni

### In caso di compromissione

1. **Vai su Shopify Admin → App**
2. **Trova la tua app privata**
3. **Clicca su "Disinstalla app"**
4. **Rigenera l'access token**
5. **Reinstalla l'app con il nuovo token**

## 🚨 Risoluzione Problemi

### Errori Comuni

#### "Token di accesso non valido o scaduto"
- Verifica che l'access token sia corretto
- Assicurati che inizi con `shpat_`
- Controlla che l'app sia ancora installata su Shopify

#### "Permessi insufficienti"
- Verifica che l'app abbia i permessi corretti
- Controlla che sia installata correttamente
- Reinstalla l'app se necessario

#### "Rate limit raggiunto"
- Shopify limita le richieste API
- Aspetta qualche minuto e riprova
- Usa sincronizzazioni incrementali per ridurre le chiamate

#### "Dominio non valido"
- Assicurati che il dominio sia nel formato corretto
- Deve essere: `nome-shop.myshopify.com`
- Non includere `https://` o `http://`

### Log e Debug

- Tutte le operazioni sono loggate nella console del browser
- Le Netlify Functions forniscono log dettagliati
- Controlla la console per informazioni di debug

## 📈 Ottimizzazioni

### Performance

1. **Sincronizzazione intelligente**
   - Usa sincronizzazioni incrementali per mantenere i dati aggiornati
   - Evita di scaricare tutti gli ordini ogni volta

2. **Filtri efficaci**
   - Usa i filtri per ridurre la quantità di dati visualizzati
   - Imposta intervalli di date appropriati

3. **Paginazione**
   - Il sistema gestisce automaticamente la paginazione
   - Non sovraccaricare l'API con richieste troppo grandi

### Manutenzione

1. **Pulizia automatica**
   - I dati vecchi (oltre 90 giorni) vengono puliti automaticamente
   - Mantiene le prestazioni dell'app

2. **Backup**
   - I dati sono salvati localmente
   - Considera di fare backup regolari

## 🔄 Aggiornamenti e Novità

### Versioni API Shopify

- **2024-01**: Versione attuale e raccomandata
- **2023-10**: Versione precedente, ancora supportata
- **2023-07**: Versione legacy, non raccomandata

### Nuove Funzionalità

- **Sincronizzazione automatica**: In sviluppo
- **Webhook per aggiornamenti in tempo reale**: In sviluppo
- **Integrazione con altri servizi**: In sviluppo

## 📞 Supporto

### Dove trovare aiuto

1. **Documentazione Shopify**
   - [API Reference](https://shopify.dev/api)
   - [App Development](https://shopify.dev/apps)

2. **Community**
   - Forum Shopify
   - Stack Overflow
   - GitHub Issues

3. **Contatti**
   - Per problemi specifici dell'app, apri una issue su GitHub
   - Per problemi Shopify, contatta il supporto Shopify

## 📝 Note Importanti

- **L'app non modifica mai i dati su Shopify**
- **Tutte le operazioni sono di sola lettura**
- **I dati sono sincronizzati solo quando richiesto**
- **Non c'è sincronizzazione automatica in background**

---

**🎉 Congratulazioni!** Hai configurato con successo l'integrazione Shopify. Ora puoi gestire i tuoi ordini direttamente dalla tua app Magazzino 3.0. 