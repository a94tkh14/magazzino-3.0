// Meta Marketing API Integration
const META_API_BASE = 'https://graph.facebook.com/v18.0';

class MetaAPI {
  constructor() {
    this.accessToken = null;
    this.adAccountId = null;
    this.clientId = process.env.REACT_APP_META_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_META_CLIENT_SECRET;
  }

  // Autenticazione OAuth 2.0
  async authenticate() {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/meta/callback')}&` +
      `scope=ads_management,ads_read,business_management&` +
      `response_type=code`;

    window.location.href = authUrl;
  }

  // Gestisce il callback OAuth
  async handleCallback(code) {
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