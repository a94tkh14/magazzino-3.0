-- Tabella per gestire i backup del sistema
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('database', 'config', 'uploads', 'full')),
    size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'restored')),
    restored_at TIMESTAMP WITH TIME ZONE,
    restored_by VARCHAR(100)
);

-- Indici per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(type);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);

-- Tabella per le configurazioni dell'app
CREATE TABLE IF NOT EXISTS configurazioni (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    valore JSONB NOT NULL,
    descrizione TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella per le impostazioni dell'app
CREATE TABLE IF NOT EXISTS impostazioni_app (
    id SERIAL PRIMARY KEY,
    chiave VARCHAR(100) NOT NULL UNIQUE,
    valore JSONB NOT NULL,
    descrizione TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserimento configurazioni di esempio
INSERT INTO configurazioni (tipo, nome, valore, descrizione) VALUES
('shopify', 'Shopify', '{"enabled": false, "shop": "", "apiKey": "", "apiPassword": "", "apiVersion": "2024-01"}', 'Configurazione API Shopify'),
('google_ads', 'Google Ads', '{"enabled": false, "clientId": "", "clientSecret": ""}', 'Configurazione API Google Ads'),
('meta', 'Meta/Facebook', '{"enabled": false, "clientId": "", "clientSecret": ""}', 'Configurazione API Meta/Facebook')
ON CONFLICT (tipo) DO NOTHING;

-- Inserimento impostazioni app di esempio
INSERT INTO impostazioni_app (chiave, valore, descrizione) VALUES
('backup_auto', '{"enabled": false, "frequency": "weekly", "type": "full", "retention_days": 30}', 'Impostazioni backup automatici'),
('notifications', '{"email": false, "browser": true}', 'Impostazioni notifiche'),
('security', '{"session_timeout": 3600, "max_login_attempts": 5}', 'Impostazioni sicurezza')
ON CONFLICT (chiave) DO NOTHING;

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configurazioni_updated_at 
    BEFORE UPDATE ON configurazioni 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_impostazioni_app_updated_at 
    BEFORE UPDATE ON impostazioni_app 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funzione per pulire i backup vecchi
CREATE OR REPLACE FUNCTION cleanup_old_backups(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM backups 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND status != 'restored';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Commenti per documentazione
COMMENT ON TABLE backups IS 'Tabella per gestire i backup del sistema';
COMMENT ON TABLE configurazioni IS 'Tabella per le configurazioni delle API esterne';
COMMENT ON TABLE impostazioni_app IS 'Tabella per le impostazioni generali dell''applicazione';
COMMENT ON FUNCTION cleanup_old_backups IS 'Funzione per pulire i backup più vecchi di retention_days giorni'; 