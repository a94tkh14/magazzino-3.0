# Dockerfile per l'applicazione Magazzino
FROM node:18-alpine

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Installa le dipendenze
RUN npm ci --only=production

# Copia il codice sorgente
COPY . .

# Build dell'applicazione React
RUN npm run build

# Espone la porta
EXPOSE 3000

# Comando di avvio
CMD ["npm", "run", "server"] 