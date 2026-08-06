#!/bin/bash
set -e

echo "🚀 [Deploy] Iniciando aprovisionamiento del servidor Hostinger..."

echo "📦 [Deploy] 1. Instalando Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "📦 [Deploy] 2. Instalando PM2 globalmente..."
sudo npm install -g pm2

echo "📦 [Deploy] 3. Instalando dependencias de Chromium para WhatsApp (Puppeteer)..."
sudo apt-get update
sudo apt-get install -y ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  xdg-utils \
  wget

echo "🐳 [Deploy] 4. Iniciando base de datos PostgreSQL con pgvector en Docker..."
cd /app/agency-bot
docker compose up -d db

echo "📦 [Deploy] 5. Instalando paquetes de dependencias del Backend..."
npm install

echo "📦 [Deploy] 6. Instalando paquetes y compilando el Frontend React (Dashboard)..."
cd dashboard
npm install
npm run build
cd ..

echo "⚙️ [Deploy] 7. Iniciando aplicación Node.js con PM2..."
pm2 delete agency-bot || true
pm2 start "npx ts-node src/server.ts" --name agency-bot

echo "💾 [Deploy] Guardando estado de PM2..."
pm2 save

echo "🎉 [Deploy] ¡Aprovisionamiento y despliegue completado con éxito!"
echo "-------------------------------------------------------------"
pm2 status
echo "-------------------------------------------------------------"
echo "Servidor Express corriendo en: http://177.7.38.54:3000"
