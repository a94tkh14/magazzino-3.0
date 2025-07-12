-- Tabelle per Magazzino 3.0 (Struttura utente)

-- Tabella Magazzino
CREATE TABLE IF NOT EXISTS magazzino (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  quantita INTEGER NOT NULL DEFAULT 0,
  prezzo DECIMAL(10,2) NOT NULL DEFAULT 0,
  anagrafica TEXT,
  tipologia VARCHAR(100),
  marca VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabella Stock
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  quantita INTEGER NOT NULL,
  prezzo DECIMAL(10,2) NOT NULL,
  data_aggiornamento TIMESTAMP DEFAULT NOW(),
  tipo VARCHAR(50) DEFAULT 'manuale'
);

-- Tabella Ordini
CREATE TABLE IF NOT EXISTS ordini (
  id SERIAL PRIMARY KEY,
  numero_ordine VARCHAR(50) UNIQUE NOT NULL,
  fornitore VARCHAR(255),
  data_ordine TIMESTAMP DEFAULT NOW(),
  stato VARCHAR(50) DEFAULT 'in_attesa',
  totale DECIMAL(10,2) DEFAULT 0,
  note TEXT
);

-- Tabella Storico
CREATE TABLE IF NOT EXISTS storico (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  quantita INTEGER NOT NULL,
  prezzo DECIMAL(10,2) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  data TIMESTAMP DEFAULT NOW()
);

-- Tabella Impostazioni
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  shopify_store_url VARCHAR(255),
  shopify_api_key VARCHAR(255),
  shopify_api_password VARCHAR(255),
  shopify_api_version VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_magazzino_sku ON magazzino(sku);
CREATE INDEX IF NOT EXISTS idx_magazzino_tipologia ON magazzino(tipologia);
CREATE INDEX IF NOT EXISTS idx_magazzino_marca ON magazzino(marca);
CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);
CREATE INDEX IF NOT EXISTS idx_ordini_stato ON ordini(stato);
CREATE INDEX IF NOT EXISTS idx_ordini_fornitore ON ordini(fornitore);
CREATE INDEX IF NOT EXISTS idx_storico_sku ON storico(sku);
CREATE INDEX IF NOT EXISTS idx_storico_data ON storico(data);

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_magazzino_updated_at BEFORE UPDATE ON magazzino FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 