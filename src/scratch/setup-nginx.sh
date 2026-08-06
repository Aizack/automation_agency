#!/bin/bash
set -e

echo "📦 [Nginx] Instalando Nginx en el servidor..."
sudo apt-get update
sudo apt-get install -y nginx

echo "⚙️ [Nginx] Creando archivo de configuración..."
cat << 'EOF' > /etc/nginx/sites-available/agency-bot
server {
    listen 80;
    server_name diazlab.online app.diazlab.online www.diazlab.online;

    # Aumentar el límite de tamaño para subidas de archivos (audios, PDFs pesados para RAG)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "🔗 [Nginx] Habilitando configuración del sitio..."
sudo ln -sf /etc/nginx/sites-available/agency-bot /etc/nginx/sites-enabled/

echo "🗑️ [Nginx] Removiendo la configuración por defecto (default)..."
sudo rm -f /etc/nginx/sites-enabled/default

echo "🧪 [Nginx] Probando sintaxis de configuración..."
sudo nginx -t

echo "🔄 [Nginx] Iniciando y habilitando servicio de Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ [Nginx] ¡Proxy inverso configurado con éxito!"
