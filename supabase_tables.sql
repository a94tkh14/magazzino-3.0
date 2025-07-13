-- Tabella magazzino
CREATE TABLE IF NOT EXISTS magazzino (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  prezzo DECIMAL(10,2),
  quantita INTEGER DEFAULT 0,
  quantita_minima INTEGER DEFAULT 0,
  fornitore VARCHAR(255),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella ordini
CREATE TABLE IF NOT EXISTS ordini (
  id SERIAL PRIMARY KEY,
  numero_ordine VARCHAR(255) UNIQUE NOT NULL,
  cliente VARCHAR(255),
  data_ordine DATE,
  stato VARCHAR(50) DEFAULT 'in_attesa',
  totale DECIMAL(10,2),
  prodotti JSONB,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella ordini fornitori
CREATE TABLE IF NOT EXISTS supplier_orders (
  id SERIAL PRIMARY KEY,
  numero_ordine VARCHAR(255) UNIQUE NOT NULL,
  fornitore VARCHAR(255),
  data_ordine DATE,
  stato VARCHAR(50) DEFAULT 'in_attesa',
  totale DECIMAL(10,2),
  prodotti JSONB,
  note TEXT,
  tracking_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella stock
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE NOT NULL,
  quantita INTEGER DEFAULT 0,
  quantita_minima INTEGER DEFAULT 0,
  data_aggiornamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella storico
CREATE TABLE IF NOT EXISTS storico (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  sku VARCHAR(255),
  quantita INTEGER,
  prezzo DECIMAL(10,2),
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella impostazioni
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  low_stock_threshold INTEGER DEFAULT 10,
  currency VARCHAR(10) DEFAULT 'EUR',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci impostazioni di default
INSERT INTO settings (id, low_stock_threshold, currency, date_format) 
VALUES (1, 10, 'EUR', 'DD/MM/YYYY')
ON CONFLICT (id) DO NOTHING;

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_magazzino_sku ON magazzino(sku);
CREATE INDEX IF NOT EXISTS idx_ordini_numero ON ordini(numero_ordine);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_numero ON supplier_orders(numero_ordine);
CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);
CREATE INDEX IF NOT EXISTS idx_storico_data ON storico(data);
CREATE INDEX IF NOT EXISTS idx_storico_tipo ON storico(tipo); 