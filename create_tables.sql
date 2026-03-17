-- Script per creare tutte le tabelle necessarie per Magazzino 3.0
-- Esegui questo script nel SQL Editor di Supabase

-- Tabella magazzino (prodotti)
CREATE TABLE IF NOT EXISTS magazzino (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(500) NOT NULL,
    categoria VARCHAR(255),
    prezzo_vendita DECIMAL(10,2),
    prezzo_acquisto DECIMAL(10,2),
    quantita_disponibile INTEGER DEFAULT 0,
    quantita_minima INTEGER DEFAULT 0,
    fornitore VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella stock (movimenti di magazzino)
CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) NOT NULL,
    tipo_movimento VARCHAR(50) NOT NULL, -- 'entrata', 'uscita', 'correzione'
    quantita INTEGER NOT NULL,
    quantita_precedente INTEGER,
    quantita_attuale INTEGER,
    motivo VARCHAR(255),
    data_aggiornamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella ordini (ordini di vendita)
CREATE TABLE IF NOT EXISTS ordini (
    id SERIAL PRIMARY KEY,
    numero_ordine VARCHAR(255) UNIQUE NOT NULL,
    cliente VARCHAR(255),
    data_ordine TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stato VARCHAR(50) DEFAULT 'in_attesa', -- 'in_attesa', 'confermato', 'spedito', 'consegnato', 'annullato'
    totale DECIMAL(10,2),
    prodotti JSONB,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella storico (log delle attività)
CREATE TABLE IF NOT EXISTS storico (
    id SERIAL PRIMARY KEY,
    tipo_azione VARCHAR(100) NOT NULL, -- 'aggiunta_prodotto', 'modifica_prodotto', 'movimento_stock', 'nuovo_ordine', etc.
    descrizione TEXT,
    dati_azione JSONB,
    data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    utente VARCHAR(255)
);

-- Tabella settings (impostazioni)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    low_stock_threshold INTEGER DEFAULT 10,
    currency VARCHAR(10) DEFAULT 'EUR',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    company_name VARCHAR(255),
    company_address TEXT,
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella ordini fornitori
CREATE TABLE IF NOT EXISTS supplier_orders (
    id SERIAL PRIMARY KEY,
    numero_ordine VARCHAR(255) UNIQUE NOT NULL,
    fornitore VARCHAR(255) NOT NULL,
    data_ordine TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_consegna_prevista DATE,
    stato VARCHAR(50) DEFAULT 'in_preparazione', -- 'in_preparazione', 'ordinato', 'spedito', 'ricevuto', 'annullato'
    totale DECIMAL(10,2),
    prodotti JSONB,
    note TEXT,
    tracking_number VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserimento delle impostazioni di default
INSERT INTO settings (id, low_stock_threshold, currency, date_format, company_name) 
VALUES (1, 10, 'EUR', 'DD/MM/YYYY', 'La Tua Azienda')
ON CONFLICT (id) DO NOTHING;

-- Creazione di indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_magazzino_sku ON magazzino(sku);
CREATE INDEX IF NOT EXISTS idx_magazzino_categoria ON magazzino(categoria);
CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);
CREATE INDEX IF NOT EXISTS idx_stock_data ON stock(data_aggiornamento);
CREATE INDEX IF NOT EXISTS idx_ordini_numero ON ordini(numero_ordine);
CREATE INDEX IF NOT EXISTS idx_ordini_data ON ordini(data_ordine);
CREATE INDEX IF NOT EXISTS idx_storico_tipo ON storico(tipo_azione);
CREATE INDEX IF NOT EXISTS idx_storico_data ON storico(data);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_numero ON supplier_orders(numero_ordine);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_fornitore ON supplier_orders(fornitore);

-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per aggiornare updated_at automaticamente
CREATE TRIGGER update_magazzino_updated_at BEFORE UPDATE ON magazzino
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordini_updated_at BEFORE UPDATE ON ordini
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON supplier_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Abilita Row Level Security (RLS) per tutte le tabelle
ALTER TABLE magazzino ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordini ENABLE ROW LEVEL SECURITY;
ALTER TABLE storico ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;

-- Politiche RLS per permettere tutte le operazioni (per ora)
CREATE POLICY "Enable all operations for magazzino" ON magazzino FOR ALL USING (true);
CREATE POLICY "Enable all operations for stock" ON stock FOR ALL USING (true);
CREATE POLICY "Enable all operations for ordini" ON ordini FOR ALL USING (true);
CREATE POLICY "Enable all operations for storico" ON storico FOR ALL USING (true);
CREATE POLICY "Enable all operations for settings" ON settings FOR ALL USING (true);
CREATE POLICY "Enable all operations for supplier_orders" ON supplier_orders FOR ALL USING (true);

-- Inserimento di alcuni dati di esempio
INSERT INTO magazzino (sku, nome, categoria, prezzo_vendita, prezzo_acquisto, quantita_disponibile, quantita_minima, fornitore) VALUES
('PROD001', 'Prodotto Esempio 1', 'Elettronica', 29.99, 20.00, 50, 10, 'Fornitore A'),
('PROD002', 'Prodotto Esempio 2', 'Abbigliamento', 15.50, 8.00, 100, 20, 'Fornitore B'),
('PROD003', 'Prodotto Esempio 3', 'Casa', 45.00, 30.00, 25, 5, 'Fornitore C')
ON CONFLICT (sku) DO NOTHING;

-- Inserimento di movimenti stock di esempio
INSERT INTO stock (sku, tipo_movimento, quantita, quantita_precedente, quantita_attuale, motivo) VALUES
('PROD001', 'entrata', 50, 0, 50, 'Carico iniziale'),
('PROD002', 'entrata', 100, 0, 100, 'Carico iniziale'),
('PROD003', 'entrata', 25, 0, 25, 'Carico iniziale')
ON CONFLICT DO NOTHING;

-- Inserimento di ordini di esempio
INSERT INTO ordini (numero_ordine, cliente, stato, totale, prodotti) VALUES
('ORD001', 'Cliente Esempio', 'confermato', 89.97, '[{"sku": "PROD001", "quantita": 2, "prezzo": 29.99}, {"sku": "PROD002", "quantita": 2, "prezzo": 15.50}]'),
('ORD002', 'Altro Cliente', 'in_attesa', 45.00, '[{"sku": "PROD003", "quantita": 1, "prezzo": 45.00}]')
ON CONFLICT (numero_ordine) DO NOTHING;

-- Inserimento di ordini fornitori di esempio
INSERT INTO supplier_orders (numero_ordine, fornitore, stato, totale, prodotti) VALUES
('SUP001', 'Fornitore A', 'ordinato', 1000.00, '[{"sku": "PROD001", "quantita": 50, "prezzo_acquisto": 20.00}]'),
('SUP002', 'Fornitore B', 'in_preparazione', 800.00, '[{"sku": "PROD002", "quantita": 100, "prezzo_acquisto": 8.00}]')
ON CONFLICT (numero_ordine) DO NOTHING;

-- Inserimento di storico di esempio
INSERT INTO storico (tipo_azione, descrizione, dati_azione) VALUES
('setup_sistema', 'Inizializzazione del sistema Magazzino 3.0', '{"versione": "3.0", "data_setup": "now"}'),
('carico_iniziale', 'Carico iniziale prodotti di esempio', '{"prodotti_caricati": 3, "valore_totale": 1500.00}')
ON CONFLICT DO NOTHING;

COMMIT; 