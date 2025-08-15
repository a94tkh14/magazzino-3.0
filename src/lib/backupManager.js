import { supabase } from './supabase';

class BackupManager {
  constructor() {
    this.backupTypes = {
      DATABASE: 'database',
      CONFIG: 'config',
      UPLOADS: 'uploads',
      FULL: 'full'
    };
  }

  // Backup completo del database
  async createDatabaseBackup() {
    try {
      console.log('Iniziando backup database...');
      
      // Backup delle tabelle principali
      const tables = [
        'magazzino',
        'prodotti',
        'ordini',
        'stock',
        'fornitori',
        'ordini_fornitori',
        'metriche_marketing',
        'costi'
      ];

      const backupData = {};

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');

          if (error) {
            console.error(`Errore backup tabella ${table}:`, error);
            backupData[table] = { error: error.message };
          } else {
            backupData[table] = data || [];
            console.log(`Backup tabella ${table}: ${data?.length || 0} record`);
          }
        } catch (err) {
          console.error(`Errore backup tabella ${table}:`, err);
          backupData[table] = { error: err.message };
        }
      }

      // Aggiungi metadati del backup
      const backupMetadata = {
        timestamp: new Date().toISOString(),
        type: this.backupTypes.DATABASE,
        version: '1.0',
        tables: Object.keys(backupData),
        recordCount: Object.values(backupData).reduce((total, table) => {
          return total + (Array.isArray(table) ? table.length : 0);
        }, 0)
      };

      const fullBackup = {
        metadata: backupMetadata,
        data: backupData
      };

      // Salva il backup
      await this.saveBackup(fullBackup, 'database');
      
      return {
        success: true,
        backup: fullBackup,
        message: `Backup database completato: ${backupMetadata.recordCount} record salvati`
      };

    } catch (error) {
      console.error('Errore backup database:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Backup delle configurazioni
  async createConfigBackup() {
    try {
      console.log('Iniziando backup configurazioni...');
      
      const configData = {
        timestamp: new Date().toISOString(),
        type: this.backupTypes.CONFIG,
        version: '1.0',
        supabase: {
          url: process.env.REACT_APP_SUPABASE_URL || 'https://fljxahdybqllfwzlkeum.supabase.co',
          // Non includiamo le chiavi per sicurezza
        },
        shopify: await this.getShopifyConfig(),
        googleAds: await this.getGoogleAdsConfig(),
        meta: await this.getMetaConfig(),
        appSettings: await this.getAppSettings()
      };

      await this.saveBackup(configData, 'config');
      
      return {
        success: true,
        backup: configData,
        message: 'Backup configurazioni completato'
      };

    } catch (error) {
      console.error('Errore backup configurazioni:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Backup completo del sistema
  async createFullBackup() {
    try {
      console.log('Iniziando backup completo del sistema...');
      
      const [dbBackup, configBackup] = await Promise.all([
        this.createDatabaseBackup(),
        this.createConfigBackup()
      ]);

      const fullBackup = {
        timestamp: new Date().toISOString(),
        type: this.backupTypes.FULL,
        version: '1.0',
        database: dbBackup.success ? dbBackup.backup : null,
        config: configBackup.success ? configBackup.backup : null,
        summary: {
          databaseSuccess: dbBackup.success,
          configSuccess: configBackup.success,
          totalRecords: dbBackup.success ? dbBackup.backup.metadata.recordCount : 0
        }
      };

      await this.saveBackup(fullBackup, 'full');
      
      return {
        success: true,
        backup: fullBackup,
        message: 'Backup completo del sistema completato'
      };

    } catch (error) {
      console.error('Errore backup completo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Salva il backup
  async saveBackup(backupData, type) {
    try {
      const filename = `backup_${type}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      
      // Salva localmente
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Salva anche nel database per riferimento
      const { error } = await supabase
        .from('backups')
        .insert({
          filename,
          type,
          size: JSON.stringify(backupData).length,
          created_at: new Date().toISOString(),
          metadata: backupData.metadata || backupData
        });

      if (error) {
        console.error('Errore salvataggio backup nel database:', error);
      }

      console.log(`Backup salvato: ${filename}`);
      return filename;

    } catch (error) {
      console.error('Errore salvataggio backup:', error);
      throw error;
    }
  }

  // Ripristina backup dal database
  async restoreDatabaseBackup(backupData) {
    try {
      console.log('Iniziando ripristino database...');
      
      if (!backupData.data) {
        throw new Error('Dati backup non validi');
      }

      const results = {};
      
      for (const [tableName, tableData] of Object.entries(backupData.data)) {
        if (Array.isArray(tableData) && tableData.length > 0) {
          try {
            // Pulisci la tabella esistente
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .neq('id', 0); // Delete all records

            if (deleteError) {
              console.error(`Errore pulizia tabella ${tableName}:`, deleteError);
              results[tableName] = { error: deleteError.message };
              continue;
            }

            // Inserisci i dati del backup
            const { data, error: insertError } = await supabase
              .from(tableName)
              .insert(tableData)
              .select();

            if (insertError) {
              console.error(`Errore inserimento tabella ${tableName}:`, insertError);
              results[tableName] = { error: insertError.message };
            } else {
              results[tableName] = { 
                success: true, 
                restored: data?.length || 0 
              };
              console.log(`Tabella ${tableName} ripristinata: ${data?.length || 0} record`);
            }

          } catch (err) {
            console.error(`Errore ripristino tabella ${tableName}:`, err);
            results[tableName] = { error: err.message };
          }
        }
      }

      return {
        success: true,
        results,
        message: 'Ripristino database completato'
      };

    } catch (error) {
      console.error('Errore ripristino database:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Lista dei backup disponibili
  async listBackups() {
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        backups: data || []
      };

    } catch (error) {
      console.error('Errore recupero lista backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Utility per recuperare configurazioni
  async getShopifyConfig() {
    try {
      const { data } = await supabase
        .from('configurazioni')
        .select('*')
        .eq('tipo', 'shopify')
        .single();
      
      return data || {};
    } catch (error) {
      return {};
    }
  }

  async getGoogleAdsConfig() {
    try {
      const { data } = await supabase
        .from('configurazioni')
        .select('*')
        .eq('tipo', 'google_ads')
        .single();
      
      return data || {};
    } catch (error) {
      return {};
    }
  }

  async getMetaConfig() {
    try {
      const { data } = await supabase
        .from('configurazioni')
        .select('*')
        .eq('tipo', 'meta')
        .single();
      
      return data || {};
    } catch (error) {
      return {};
    }
  }

  async getAppSettings() {
    try {
      const { data } = await supabase
        .from('impostazioni_app')
        .select('*')
        .single();
      
      return data || {};
    } catch (error) {
      return {};
    }
  }

  // Pianifica backup automatici
  scheduleBackup(type, frequency) {
    const frequencies = {
      daily: 24 * 60 * 60 * 1000,    // 24 ore
      weekly: 7 * 24 * 60 * 60 * 1000, // 7 giorni
      monthly: 30 * 24 * 60 * 60 * 1000 // 30 giorni
    };

    if (frequencies[frequency]) {
      setInterval(() => {
        this.createBackup(type);
      }, frequencies[frequency]);
      
      console.log(`Backup ${type} pianificato ogni ${frequency}`);
    }
  }
}

export default new BackupManager(); 