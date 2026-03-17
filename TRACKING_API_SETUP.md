# Configurazione API Tracking

Per utilizzare il tracking reale delle spedizioni, devi configurare una delle seguenti API:

## Opzione 1: EasyPost (Raccomandata)
- **Costo**: Gratuita (1000 richieste/mese)
- **Copertura**: Tutti i corrieri principali
- **Setup**:
  1. Registrati su [EasyPost](https://www.easypost.com/)
  2. Ottieni la tua API key
  3. Aggiungi al file `.env`:
     ```
     REACT_APP_EASYPOST_API_KEY=your_api_key_here
     ```

## Opzione 2: 17track
- **Costo**: Gratuita (100 richieste/giorno)
- **Copertura**: 1000+ corrieri
- **Setup**:
  1. Registrati su [17track](https://17track.net/en/api)
  2. Ottieni la tua API key
  3. Aggiungi al file `.env`:
     ```
     REACT_APP_TRACKING_API_KEY=your_api_key_here
     ```

## Opzione 3: TrackingMore
- **Costo**: Gratuita (100 richieste/mese)
- **Copertura**: 600+ corrieri
- **Setup**:
  1. Registrati su [TrackingMore](https://www.trackingmore.com/api)
  2. Ottieni la tua API key
  3. Modifica il file `src/lib/trackingAPI.js` e sostituisci `your_api_key_here` con la tua chiave

## Configurazione File .env

Crea un file `.env` nella root del progetto:

```env
# EasyPost API (raccomandata)
REACT_APP_EASYPOST_API_KEY=your_easypost_api_key

# 17track API (alternativa)
REACT_APP_TRACKING_API_KEY=your_17track_api_key
```

## Note Importanti

- **Senza API key**: Il sistema mostrerà "API non configurata" invece di dati falsi
- **Priorità**: Il sistema prova prima EasyPost, poi 17track, poi TrackingMore
- **Fallback**: Se nessuna API funziona, mostra un messaggio chiaro
- **Sicurezza**: Le API key sono sicure nel file `.env` (non vengono committate su git)

## Test

Dopo aver configurato l'API:
1. Riavvia l'applicazione
2. Vai su un ordine "In Transito"
3. Aggiungi un numero di tracking
4. Verifica che appaiano i dati reali

## Esempi Numeri Tracking

Per testare le API:
- **DHL**: 1234567890
- **FedEx**: 123456789012
- **UPS**: 1Z999AA1234567890
- **Poste Italiane**: CP123456789IT 