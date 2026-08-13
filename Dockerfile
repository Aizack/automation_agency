FROM node:20-alpine

# Instalar Chromium y dependencias necesarias para que Puppeteer funcione en Alpine Linux
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git

# Evitar descargar el Chromium bundled de Puppeteer y usar el de sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copiar archivos de dependencias de raíz y del dashboard
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Instalar dependencias en la raíz y en el subdirectorio del dashboard
RUN npm install
RUN npm install --prefix dashboard

# Copiar el resto del código
COPY . .

# Compilar el dashboard de producción para servirlo de manera estática
RUN npm run build:frontend

# Exponer el puerto del servidor express
EXPOSE 3000

# Ejecutar el bot completo (con servidor express y cliente de whatsapp web)
CMD ["npm", "run", "dev"]