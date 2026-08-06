#!/bin/bash
set -e

echo "📦 [SSL] Instalando Certbot y el plugin de Nginx..."
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

echo "🔑 [SSL] Generando certificado SSL con Let's Encrypt..."
# -m especifica tu correo para avisos de renovación
# --agree-tos acepta los términos de servicio
# --non-interactive ejecuta sin pedir inputs
# --nginx configura automáticamente los bloques de servidor en Nginx
sudo certbot --nginx \
  -d diazlab.online \
  -d app.diazlab.online \
  -d www.diazlab.online \
  --non-interactive \
  --agree-tos \
  -m diazbisac@gmail.com \
  --redirect

echo "🔄 [SSL] Reiniciando Nginx para aplicar cambios..."
sudo systemctl restart nginx

echo "✅ [SSL] ¡Certificado SSL instalado y configurado con éxito!"
