FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expone el puerto del servidor
EXPOSE 3000

# Usamos ts-node para el entorno de desarrollo
CMD ["npm", "run", "dev"]