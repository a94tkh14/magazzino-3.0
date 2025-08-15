// Google Ads API Integration
const GOOGLE_ADS_API_BASE = 'https://googleads.googleapis.com/v14';

class GoogleAdsAPI {
  constructor() {
    this.accessToken = null;
    this.customerId = null;
    this.clientId = process.env.REACT_APP_GOOGLE_ADS_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_GOOGLE_ADS_CLIENT_SECRET;
    this.testMode = true; // Modalità test per simulare i dati
  }

  // Autenticazione OAuth 2.0 (simulata in test mode)
  async authenticate() {
    if (this.testMode) {
      // Simula autenticazione di successo
      this.accessToken = 'test_google_token_' + Date.now();
      localStorage.setItem('googleAdsAccessToken', this.accessToken);
      return true;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google-ads/callback')}&` +
      `scope=https://www.googleapis.com/auth/adwords&` +
      `response_type=code&` +
      `access_type=offline`;

    window.location.href = authUrl;
  }

  // Gestisce il callback OAuth
  async handleCallback(code) {
    if (this.testMode) {
      return true;
    }

    try {
      const response = await fetch('/api/google-ads/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      
      localStorage.setItem('googleAdsAccessToken', this.accessToken);
      localStorage.setItem('googleAdsRefreshToken', this.refreshToken);
      
      return true;
    } catch (error) {
      console.error('Errore autenticazione Google Ads:', error);
      return false;
    }
  }

  // Carica i dati delle campagne
  async getCampaigns(dateRange = 'LAST_30_DAYS') {
    if (this.testMode) {
      // Simula dati delle campagne Google Ads
      return [
        {
          id: 'camp_google_001',
          name: 'Google Campagna 1',
          platform: 'Google Ads',
          status: 'active',
          budget: 400.00,
          spent: 198.75,
          impressions: 15800,
          clicks: 1120,
          conversions: 52,
          revenue: 1450.00,
          cpa: 3.82,
          roas: 7.30,
          ctr: 7.09,
          cpc: 0.18
        },
        {
          id: 'camp_google_002',
          name: 'Google Campagna 2',
          platform: 'Google Ads',
          status: 'active',
          budget: 250.00,
          spent: 156.40,
          impressions: 9800,
          clicks: 745,
          conversions: 38,
          revenue: 890.00,
          cpa: 4.12,
          roas: 5.69,
          ctr: 7.60,
          cpc: 0.21
        },
        {
          id: 'camp_google_003',
          name: 'Google Campagna 3',
          platform: 'Google Ads',
          status: 'paused',
          budget: 150.00,
          spent: 67.25,
          impressions: 5200,
          clicks: 398,
          conversions: 22,
          revenue: 320.00,
          cpa: 3.06,
          roas: 4.76,
          ctr: 7.65,
          cpc: 0.17
        }
      ];
    }

    if (!this.accessToken) {
      throw new Error('Non autenticato. Esegui prima authenticate()');
    }

    try {
      const response = await fetch('/api/google-ads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          customerId: this.customerId,
          dateRange,
        }),
      });

      const data = await response.json();
      return this.formatCampaignData(data);
    } catch (error) {
      console.error('Errore nel caricamento campagne Google Ads:', error);
      throw error;
    }
  }

  // Formatta i dati delle campagne
  formatCampaignData(rawData) {
    return rawData.map(campaign => ({
      id: campaign.campaign.id,
      name: campaign.campaign.name,
      platform: 'Google Ads',
      status: campaign.campaign.status === 'ENABLED' ? 'active' : 'paused',
      budget: parseFloat(campaign.campaign.budget_amount_micros) / 1000000,
      spent: parseFloat(campaign.metrics.cost_micros) / 1000000,
      impressions: parseInt(campaign.metrics.impressions),
      clicks: parseInt(campaign.metrics.clicks),
      conversions: parseInt(campaign.metrics.conversions),
      revenue: parseFloat(campaign.metrics.conversions_value),
      cpa: campaign.metrics.conversions > 0 ? 
        parseFloat(campaign.metrics.cost_micros) / 1000000 / parseInt(campaign.metrics.conversions) : 0,
      roas: campaign.metrics.cost_micros > 0 ? 
        parseFloat(campaign.metrics.conversions_value) / (parseFloat(campaign.metrics.cost_micros) / 1000000) : 0,
      ctr: campaign.metrics.impressions > 0 ? 
        (parseInt(campaign.metrics.clicks) / parseInt(campaign.metrics.impressions)) * 100 : 0,
      cpc: campaign.metrics.clicks > 0 ? 
        parseFloat(campaign.metrics.cost_micros) / 1000000 / parseInt(campaign.metrics.clicks) : 0,
    }));
  }

  // Carica dati giornalieri
  async getDailyData(dateRange = 'LAST_30_DAYS') {
    if (this.testMode) {
      // Simula dati giornalieri degli ultimi 7 giorni
      const dailyData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        dailyData.push({
          date: date.toISOString().split('T')[0],
          spend: Math.random() * 40 + 15,
          conversions: Math.floor(Math.random() * 12) + 3,
          revenue: Math.random() * 250 + 120,
          impressions: Math.floor(Math.random() * 2500) + 1200,
          clicks: Math.floor(Math.random() * 180) + 60
        });
      }
      
      return dailyData;
    }

    if (!this.accessToken) {
      throw new Error('Non autenticato');
    }

    try {
      const response = await fetch('/api/google-ads/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          customerId: this.customerId,
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
      date: day.date,
      spend: parseFloat(day.cost_micros) / 1000000,
      conversions: parseInt(day.conversions),
      revenue: parseFloat(day.conversions_value),
      impressions: parseInt(day.impressions),
      clicks: parseInt(day.clicks),
    }));
  }

  // Verifica se è autenticato
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Carica token dal localStorage
  loadStoredToken() {
    const token = localStorage.getItem('googleAdsAccessToken');
    if (token) {
      this.accessToken = token;
      return true;
    }
    return false;
  }
}

export default GoogleAdsAPI; 