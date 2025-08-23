// Test diretto della Netlify function shopify-sync-orders
async function testShopifySync() {
  try {
    console.log('🧪 TEST DIRETTO NETLIFY FUNCTION...');
    
    // Prima chiamata
    const response1 = await fetch('/.netlify/functions/shopify-sync-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shopDomain: 'mvl-software.myshopify.com', // Sostituisci con il tuo
        accessToken: 'shpat_...', // Sostituisci con il tuo
        apiVersion: '2024-01',
        limit: 250,
        status: 'any',
        pageInfo: null,
        useChunking: false,
        daysBack: null
      })
    });

    const data1 = await response1.json();
    console.log('📥 PRIMA CHIAMATA:', {
      success: data1.success,
      ordersCount: data1.orders?.length || 0,
      pagination: data1.pagination,
      hasNextPage: !!(data1.pagination && data1.pagination.next && data1.pagination.next.pageInfo)
    });

    if (data1.pagination && data1.pagination.next && data1.pagination.next.pageInfo) {
      console.log('✅ PageInfo per seconda pagina:', data1.pagination.next.pageInfo);
      
      // Seconda chiamata con pageInfo
      const response2 = await fetch('/.netlify/functions/shopify-sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: 'mvl-software.myshopify.com', // Sostituisci con il tuo
          accessToken: 'shpat_...', // Sostituisci con il tuo
          apiVersion: '2024-01',
          limit: 250,
          status: 'any',
          pageInfo: data1.pagination.next.pageInfo,
          useChunking: false,
          daysBack: null
        })
      });

      const data2 = await response2.json();
      console.log('📥 SECONDA CHIAMATA:', {
        success: data2.success,
        ordersCount: data2.orders?.length || 0,
        pagination: data2.pagination,
        hasNextPage: !!(data2.pagination && data2.pagination.next && data2.pagination.next.pageInfo)
      });
    } else {
      console.log('❌ Nessun pageInfo per la seconda pagina');
    }

  } catch (error) {
    console.error('❌ Errore test:', error);
  }
}

// Esegui il test
testShopifySync(); 