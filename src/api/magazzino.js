// Mock data for warehouse items
const mockMagazzinoData = [
  { sku: "SKU001", nome: "Laptop HP Pavilion", quantita: 15, prezzo: 899.99 },
  { sku: "SKU002", nome: "Mouse Wireless Logitech", quantita: 45, prezzo: 29.99 },
  { sku: "SKU003", nome: "Monitor Samsung 24\"", quantita: 12, prezzo: 199.99 },
  { sku: "SKU004", nome: "Tastiera Meccanica", quantita: 28, prezzo: 89.99 },
  { sku: "SKU005", nome: "Webcam HD", quantita: 33, prezzo: 49.99 },
  { sku: "SKU006", nome: "Cuffie Bluetooth", quantita: 19, prezzo: 79.99 },
  { sku: "SKU007", nome: "Hard Disk Esterno 1TB", quantita: 8, prezzo: 69.99 },
  { sku: "SKU008", nome: "Penna USB 32GB", quantita: 67, prezzo: 12.99 },
  { sku: "SKU009", nome: "Cavo HDMI 2m", quantita: 42, prezzo: 8.99 },
  { sku: "SKU010", nome: "Adattatore USB-C", quantita: 23, prezzo: 15.99 },
];

// Mock API function to get warehouse data
export const getMagazzino = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockMagazzinoData;
};

// Mock API function to add stock
export const addStock = async (stockData) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real implementation, this would save to Google Sheets
  console.log("Stock data to be saved:", stockData);
  
  // Return success response
  return {
    success: true,
    message: "Stock aggiunto con successo",
    itemsAdded: stockData.length
  };
}; 