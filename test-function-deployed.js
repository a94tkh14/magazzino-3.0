// Test della funzione deployata
// Copia e incolla questo codice nella console del browser

console.log('🧪 Test funzione shopify-sync-orders deployata...');

const testDeployedFunction = async () => {
  try {
    console.log('📡 Chiamata a /.netlify/functions/shopify-sync-orders...');
    
    const response = await fetch('/.netlify/functions/shopify-sync-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shopDomain: 'test-shop.myshopify.com',
        accessToken: 'shpat_test_token',
        apiVersion: '2024-01',
        limit: 1,
        status: 'any'
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore HTTP:', response.status, errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Risposta ricevuta:', data);
    
    // Verifica struttura risposta
    if (data.success !== undefined) {
      console.log('✅ Campo "success" presente');
    } else {
      console.log('❌ Campo "success" mancante');
    }
    
    if (data.orders !== undefined) {
      console.log('✅ Campo "orders" presente');
    } else {
      console.log('❌ Campo "orders" mancante');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Errore durante il test:', error);
    return false;
  }
};

// Esegui il test
testDeployedFunction().then(success => {
  if (success) {
    console.log('🎉 SUCCESSO: La funzione è deployata e funziona!');
    console.log('💡 Ora puoi testare con credenziali reali Shopify');
  } else {
    console.log('❌ FALLITO: La funzione non funziona correttamente');
  }
});

// Funzione per testare con credenziali reali
window.testWithRealCredentials = async (shopDomain, accessToken) => {
  console.log('🔑 Test con credenziali reali...');
  
  try {
    const response = await fetch('/.netlify/functions/shopify-sync-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shopDomain,
        accessToken,
        apiVersion: '2024-01',
        limit: 1,
        status: 'any'
      })
    });
    
    console.log('📊 Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Risposta:', data);
    
    if (data.success && data.orders) {
      console.log(`🎯 Ordini trovati: ${data.orders.length}`);
      if (data.orders.length > 0) {
        console.log('📦 Primo ordine:', data.orders[0]);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Errore:', error);
    return false;
  }
};

console.log('💡 Per testare con credenziali reali, usa:');
console.log('   testWithRealCredentials("tuo-shop.myshopify.com", "shpat_tuo_token")'); 