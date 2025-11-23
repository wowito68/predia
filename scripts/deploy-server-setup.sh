#!/bin/bash

###############################################################################
# Script de Configuración Inicial del Servidor VPS para PREDIA
# Autor: Deployment Automation
# Descripción: Configura el servidor AWS VPS desde cero
###############################################################################

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mensajes
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que se ejecuta como root o con sudo
if [[ $EUID -ne 0 ]]; then
   log_error "Este script debe ejecutarse como root o con sudo"
   exit 1
fi

log_info "=========================================="
log_info "Configuración Inicial del Servidor VPS"
log_info "=========================================="

# 1. Actualizar sistema
log_info "Actualizando el sistema..."
apt-get update
apt-get upgrade -y

# 2. Instalar utilidades básicas
log_info "Instalando utilidades básicas..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    ufw \
    vim \
    htop \
    unzip

# 3. Configurar firewall (UFW)
log_info "Configurando firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Next.js (opcional, para testing)
log_info "Firewall configurado correctamente"

# 4. Instalar Node.js 18 LTS usando NodeSource
log_info "Instalando Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
log_info "Node.js version: $(node -v)"
log_info "NPM version: $(npm -v)"

# 5. Instalar PM2 globalmente
log_info "Instalando PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root
log_info "PM2 instalado correctamente"

# 6. Instalar MySQL Server
log_info "Instalando MySQL Server 8.0..."
apt-get install -y mysql-server

# Iniciar MySQL
systemctl start mysql
systemctl enable mysql

log_info "MySQL instalado correctamente"

# 7. Asegurar MySQL (configuración básica)
log_info "Configurando MySQL..."

# Crear un script temporal para configuración segura
mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'temporal_root_password_123';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF

log_warn "IMPORTANTE: La contraseña temporal de root de MySQL es: temporal_root_password_123"
log_warn "Cambia esta contraseña inmediatamente después de la configuración"

# 8. Instalar Nginx (opcional, para reverse proxy)
log_info "¿Deseas instalar Nginx como reverse proxy? (y/n)"
read -t 10 -r INSTALL_NGINX || INSTALL_NGINX="n"

if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
    log_info "Instalando Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    log_info "Nginx instalado correctamente"
else
    log_info "Nginx no será instalado"
fi

# 9. Crear usuario para la aplicación (opcional pero recomendado)
APP_USER="predia"
if id "$APP_USER" &>/dev/null; then
    log_warn "El usuario $APP_USER ya existe"
else
    log_info "Creando usuario $APP_USER para la aplicación..."
    useradd -m -s /bin/bash $APP_USER
    usermod -aG sudo $APP_USER
    log_info "Usuario $APP_USER creado correctamente"
fi

# 10. Crear directorio para la aplicación
APP_DIR="/var/www/predia"
log_info "Creando directorio de la aplicación en $APP_DIR..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# 11. Configurar swap (recomendado para VPS con poca RAM)
if [[ ! -f /swapfile ]]; then
    log_info "Configurando swap de 2GB..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    log_info "Swap configurado correctamente"
else
    log_warn "El archivo swap ya existe"
fi

# 12. Instalar Certbot para SSL (Let's Encrypt)
log_info "¿Deseas instalar Certbot para SSL/HTTPS? (y/n)"
read -t 10 -r INSTALL_CERTBOT || INSTALL_CERTBOT="n"

if [[ $INSTALL_CERTBOT =~ ^[Yy]$ ]]; then
    log_info "Instalando Certbot..."
    apt-get install -y certbot python3-certbot-nginx
    log_info "Certbot instalado. Ejecuta 'certbot --nginx' después de configurar tu dominio"
fi

# 13. Resumen
log_info "=========================================="
log_info "Configuración Inicial Completada"
log_info "=========================================="
log_info "✓ Sistema actualizado"
log_info "✓ Node.js $(node -v) instalado"
log_info "✓ PM2 instalado"
log_info "✓ MySQL 8.0 instalado"
log_info "✓ Firewall configurado"
log_info "✓ Usuario $APP_USER creado"
log_info "✓ Directorio de app: $APP_DIR"

log_warn ""
log_warn "PRÓXIMOS PASOS:"
log_warn "1. Cambiar la contraseña de root de MySQL"
log_warn "2. Ejecutar deploy-db-setup.sh para configurar la base de datos"
log_warn "3. Configurar las variables de entorno (.env.production)"
log_warn "4. Ejecutar deploy-app.sh para deployar la aplicación"

log_info ""
log_info "Script completado exitosamente!"
