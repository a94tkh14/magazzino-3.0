// Test diretto della Netlify Function
// Esegui questo script per testare se la funzione funziona

const testNetlifyFunction = async () => {
  console.log('🧪 Test Netlify Function...');
  
  try {
    // Test 1: Verifica se la funzione risponde
    console.log('📡 Test 1: Verifica risposta funzione...');
    
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
    
    // Test 2: Verifica struttura risposta
    console.log('📋 Test 2: Verifica struttura risposta...');
    
    if (!data.success) {
      console.error('❌ Risposta non valida: success = false');
      return false;
    }
    
    if (!data.orders) {
      console.error('❌ Risposta non valida: orders mancante');
      return false;
    }
    
    console.log('✅ Struttura risposta valida');
    
    // Test 3: Verifica metadati
    console.log('📊 Test 3: Verifica metadati...');
    
    if (data.metadata) {
      console.log('✅ Metadati presenti:', data.metadata);
    } else {
      console.log('⚠️ Metadati mancanti');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Errore durante il test:', error);
    return false;
  }
};

const testLocalNetlify = async () => {
  console.log('🏠 Test Netlify Functions in locale...');
  
  try {
    // Test se netlify-cli è installato
    console.log('📦 Verifica netlify-cli...');
    
    // Prova a chiamare la funzione locale
    const response = await fetch('http://localhost:8888/.netlify/functions/shopify-sync-orders', {
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
    
    console.log('📊 Status locale:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Funzione locale funziona:', data);
      return true;
    } else {
      console.log('⚠️ Funzione locale non risponde correttamente');
      return false;
    }
    
  } catch (error) {
    console.log('⚠️ Netlify Functions non disponibili in locale');
    console.log('💡 Per testare in locale, installa netlify-cli e avvia:');
    console.log('   npm install -g netlify-cli');
    console.log('   netlify dev');
    return false;
  }
};

// Esegui i test
console.log('🚀 Avvio test Netlify Functions...');
console.log('');

// Test 1: Funzione deployata
testNetlifyFunction().then(success => {
  console.log('');
  if (success) {
    console.log('✅ Test funzione deployata: SUCCESSO');
  } else {
    console.log('❌ Test funzione deployata: FALLITO');
  }
  
  // Test 2: Funzione locale
  return testLocalNetlify();
}).then(success => {
  console.log('');
  if (success) {
    console.log('✅ Test funzione locale: SUCCESSO');
  } else {
    console.log('⚠️ Test funzione locale: NON DISPONIBILE');
  }
  
  console.log('');
  console.log('🎯 Riepilogo test completato!');
  console.log('📋 Controlla i risultati sopra per identificare il problema.');
});

// Funzione per testare con credenziali reali
window.testShopifyWithRealCredentials = async (shopDomain, accessToken) => {
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
    return true;
    
  } catch (error) {
    console.error('💥 Errore:', error);
    return false;
  }
};

console.log('💡 Per testare con credenziali reali, usa:');
console.log('   testShopifyWithRealCredentials("tuo-shop.myshopify.com", "shpat_tuo_token")'); 