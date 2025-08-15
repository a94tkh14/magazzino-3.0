// Meta Marketing API Integration
const META_API_BASE = 'https://graph.facebook.com/v18.0';

class MetaAPI {
  constructor() {
    this.accessToken = null;
    this.adAccountId = null;
    this.clientId = process.env.REACT_APP_META_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_META_CLIENT_SECRET;
    this.testMode = true; // Modalità test per simulare i dati
  }

  // Autenticazione OAuth 2.0 (simulata in test mode)
  async authenticate() {
    if (this.testMode) {
      // Simula autenticazione di successo
      this.accessToken = 'test_token_' + Date.now();
      localStorage.setItem('metaAccessToken', this.accessToken);
      return true;
    }

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/meta/callback')}&` +
      `scope=ads_management,ads_read,business_management&` +
      `response_type=code`;

    window.location.href = authUrl;
  }

  // Gestisce il callback OAuth
  async handleCallback(code) {
    if (this.testMode) {
      return true;
    }

    try {
      const response = await fetch('/api/meta/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      
      localStorage.setItem('metaAccessToken', this.accessToken);
      
      return true;
    } catch (error) {
      console.error('Errore autenticazione Meta:', error);
      return false;
    }
  }

  // Carica gli ad accounts disponibili
  async getAdAccounts() {
    if (this.testMode) {
      // Simula ad accounts
      return [
        { id: 'act_123456789', name: 'Test Ad Account 1' },
        { id: 'act_987654321', name: 'Test Ad Account 2' }
      ];
    }

    if (!this.accessToken) {
      throw new Error('Non autenticato. Esegui prima authenticate()');
    }

    try {
      const response = await fetch('/api/meta/ad-accounts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      return data.adAccounts;
    } catch (error) {
      console.error('Errore nel caricamento ad accounts:', error);
      throw error;
    }
  }

  // Carica i dati delle campagne
  async getCampaigns(dateRange = 'last_30d') {
    if (this.testMode) {
      // Simula dati delle campagne
      return [
        {
          id: 'camp_001',
          name: 'Campagna Test 1',
          platform: 'Meta',
          status: 'active',
          budget: 500.00,
          spent: 245.50,
          impressions: 12500,
          clicks: 890,
          conversions: 45,
          revenue: 1250.00,
          cpa: 5.46,
          roas: 5.09,
          ctr: 7.12,
          cpc: 0.28
        },
        {
          id: 'camp_002',
          name: 'Campagna Test 2',
          platform: 'Meta',
          status: 'active',
          budget: 300.00,
          spent: 187.25,
          impressions: 8900,
          clicks: 623,
          conversions: 32,
          revenue: 890.00,
          cpa: 5.85,
          roas: 4.75,
          ctr: 7.00,
          cpc: 0.30
        },
        {
          id: 'camp_003',
          name: 'Campagna Test 3',
          platform: 'Meta',
          status: 'paused',
          budget: 200.00,
          spent: 89.75,
          impressions: 4200,
          clicks: 298,
          conversions: 18,
          revenue: 450.00,
          cpa: 4.99,
          roas: 5.01,
          ctr: 7.10,
          cpc: 0.30
        }
      ];
    }

    if (!this.accessToken || !this.adAccountId) {
      throw new Error('Non autenticato o ad account non selezionato');
    }

    try {
      const response = await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          adAccountId: this.adAccountId,
          dateRange,
        }),
      });

      const data = await response.json();
      return this.formatCampaignData(data);
    } catch (error) {
      console.error('Errore nel caricamento campagne Meta:', error);
      throw error;
    }
  }

  // Formatta i dati delle campagne
  formatCampaignData(rawData) {
    return rawData.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      platform: 'Meta',
      status: campaign.status === 'ACTIVE' ? 'active' : 'paused',
      budget: parseFloat(campaign.lifetime_budget || campaign.daily_budget || 0) / 100,
      spent: parseFloat(campaign.spend) / 100,
      impressions: parseInt(campaign.impressions),
      clicks: parseInt(campaign.clicks),
      conversions: parseInt(campaign.actions?.purchase || 0),
      revenue: parseFloat(campaign.value?.purchase || 0),
      cpa: campaign.actions?.purchase > 0 ? 
        parseFloat(campaign.spend) / 100 / parseInt(campaign.actions.purchase) : 0,
      roas: campaign.spend > 0 ? 
        parseFloat(campaign.value?.purchase || 0) / (parseFloat(campaign.spend) / 100) : 0,
      ctr: campaign.impressions > 0 ? 
        (parseInt(campaign.clicks) / parseInt(campaign.impressions)) * 100 : 0,
      cpc: campaign.clicks > 0 ? 
        parseFloat(campaign.spend) / 100 / parseInt(campaign.clicks) : 0,
    }));
  }

  // Carica dati giornalieri
  async getDailyData(dateRange = 'last_30d') {
    if (this.testMode) {
      // Simula dati giornalieri degli ultimi 7 giorni
      const dailyData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        dailyData.push({
          date: date.toISOString().split('T')[0],
          spend: Math.random() * 50 + 20,
          conversions: Math.floor(Math.random() * 10) + 2,
          revenue: Math.random() * 200 + 100,
          impressions: Math.floor(Math.random() * 2000) + 1000,
          clicks: Math.floor(Math.random() * 150) + 50
        });
      }
      
      return dailyData;
    }

    if (!this.accessToken || !this.adAccountId) {
      throw new Error('Non autenticato');
    }

    try {
      const response = await fetch('/api/meta/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          adAccountId: this.adAccountId,
          dateRange,
        }),
      });

      const data = await response.json();
      return this.formatDailyData(data);
    } catch (error) {
      console.error('Errore nel caricamento dati giornalieri:', error);
      throw error;
    }
  }

  // Formatta dati giornalieri
  formatDailyData(rawData) {
    return rawData.map(day => ({
      date: day.date_start,
      spend: parseFloat(day.spend) / 100,
      conversions: parseInt(day.actions?.purchase || 0),
      revenue: parseFloat(day.value?.purchase || 0),
      impressions: parseInt(day.impressions),
      clicks: parseInt(day.clicks),
    }));
  }

  // Imposta l'ad account
  setAdAccount(adAccountId) {
    this.adAccountId = adAccountId;
    localStorage.setItem('metaAdAccountId', adAccountId);
  }

  // Verifica se è autenticato
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Carica token dal localStorage
  loadStoredToken() {
    const token = localStorage.getItem('metaAccessToken');
    const adAccountId = localStorage.getItem('metaAdAccountId');
    
    if (token) {
      this.accessToken = token;
      if (adAccountId) {
        this.adAccountId = adAccountId;
      }
      return true;
    }
    return false;
  }
}

export default MetaAPI; 