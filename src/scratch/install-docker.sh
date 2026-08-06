#!/bin/bash
set -e

echo "🔄 [Docker Init] Actualizando repositorios e instalando prerrequisitos..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

echo "🔑 [Docker Init] Agregando llave GPG oficial de Docker..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "📂 [Docker Init] Configurando el repositorio estable..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "🔄 [Docker Init] Actualizando base de paquetes..."
sudo apt-get update

echo "🐳 [Docker Init] Instalando Docker Engine, CLI y Docker Compose..."
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "✅ [Docker Init] Activando e iniciando el servicio de Docker..."
sudo systemctl enable docker
sudo systemctl start docker

echo "🎉 [Docker Init] ¡Instalación de Docker completada con éxito!"
docker --version
docker compose version
