// Dati di esempio per testare la pagina Shopify
// Copia questo nel localStorage per vedere la pagina in azione

const sampleOrders = [
  {
    id: 1,
    orderNumber: "1001",
    customerName: "Mario Rossi",
    customerEmail: "mario.rossi@email.com",
    status: "paid",
    totalPrice: 89.99,
    currency: "EUR",
    createdAt: "2024-01-15T10:30:00Z",
    items: [
      {
        sku: "PROD001",
        name: "Prodotto Test 1",
        quantity: 2,
        price: 44.99
      }
    ]
  },
  {
    id: 2,
    orderNumber: "1002",
    customerName: "Giulia Bianchi",
    customerEmail: "giulia.bianchi@email.com",
    status: "pending",
    totalPrice: 129.50,
    currency: "EUR",
    createdAt: "2024-01-16T14:20:00Z",
    items: [
      {
        sku: "PROD002",
        name: "Prodotto Test 2",
        quantity: 1,
        price: 129.50
      }
    ]
  },
  {
    id: 3,
    orderNumber: "1003",
    customerName: "Luca Verdi",
    customerEmail: "luca.verdi@email.com",
    status: "paid",
    totalPrice: 67.80,
    currency: "EUR",
    createdAt: "2024-01-17T09:15:00Z",
    items: [
      {
        sku: "PROD003",
        name: "Prodotto Test 3",
        quantity: 3,
        price: 22.60
      }
    ]
  }
];

// Per testare la pagina:
// 1. Apri la console del browser (F12)
// 2. Copia e incolla questo comando:
// localStorage.setItem('shopify_orders', JSON.stringify(sampleOrders));
// 3. Ricarica la pagina Shopify

console.log('✅ Dati di esempio caricati!');
console.log('📋 Per testare la pagina, esegui:');
console.log('localStorage.setItem("shopify_orders", JSON.stringify(sampleOrders));');
console.log('🔄 Poi ricarica la pagina Shopify'); 