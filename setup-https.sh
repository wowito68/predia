#!/bin/bash
set -e

echo "Instalando Nginx y Certbot..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx

echo "Configurando Nginx como Reverse Proxy..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/predia
server {
    listen 80;
    server_name prediaa.duckdns.org;

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

echo "Habilitando el sitio web en Nginx..."
sudo ln -sf /etc/nginx/sites-available/predia /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "Verificando Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "Obteniendo certificado SSL gratuito con Certbot (Let's Encrypt)..."
# Usamos --non-interactive y un correo placeholder válido
sudo certbot --nginx -d prediaa.duckdns.org --non-interactive --agree-tos -m soporte@prediaa.duckdns.org --redirect

echo "¡HTTPS activado exitosamente!"
