#!/bin/bash

###############################################################################
# Script de Configuración de Base de Datos MySQL para PREDIA
# Autor: Deployment Automation
# Descripción: Crea la base de datos y usuario automáticamente
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "=========================================="
log_info "Configuración de Base de Datos MySQL"
log_info "=========================================="

# Variables de configuración
DB_NAME="${DB_NAME:-predia_db}"
DB_USER="${DB_USER:-predia_user}"
DB_HOST="${DB_HOST:-localhost}"

# Solicitar contraseñas
log_info "Ingresa la contraseña de root de MySQL:"
read -s ROOT_PASSWORD

log_info "Ingresa una contraseña para el usuario de la aplicación ($DB_USER):"
read -s DB_PASSWORD

log_info "Confirma la contraseña:"
read -s DB_PASSWORD_CONFIRM

if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
    log_error "Las contraseñas no coinciden"
    exit 1
fi

# Verificar conexión a MySQL
log_info "Verificando conexión a MySQL..."
if ! mysql -u root -p"$ROOT_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    log_error "No se pudo conectar a MySQL. Verifica la contraseña de root"
    exit 1
fi

log_info "Conexión a MySQL exitosa"

# Crear base de datos si no existe
log_info "Creando base de datos $DB_NAME..."
mysql -u root -p"$ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
EOF

log_info "Base de datos creada o ya existe"

# Crear usuario y otorgar permisos
log_info "Creando usuario $DB_USER y otorgando permisos..."
mysql -u root -p"$ROOT_PASSWORD" <<EOF
-- Eliminar usuario si existe (para recrearlo)
DROP USER IF EXISTS '$DB_USER'@'$DB_HOST';

-- Crear usuario
CREATE USER '$DB_USER'@'$DB_HOST' IDENTIFIED BY '$DB_PASSWORD';

-- Otorgar todos los permisos sobre la base de datos
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'$DB_HOST';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- Verificar usuario
SELECT User, Host FROM mysql.user WHERE User = '$DB_USER';
EOF

log_info "Usuario creado y permisos otorgados correctamente"

# Verificar que el usuario puede conectarse
log_info "Verificando que el usuario puede conectarse..."
if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "USE $DB_NAME; SELECT 1;" &> /dev/null; then
    log_info "Verificación exitosa: el usuario puede conectarse a la base de datos"
else
    log_error "Error: el usuario no puede conectarse a la base de datos"
    exit 1
fi

# Generar string de conexión
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:3306/${DB_NAME}"

log_info "=========================================="
log_info "Configuración Completada"
log_info "=========================================="
log_info "Base de datos: $DB_NAME"
log_info "Usuario: $DB_USER"
log_info "Host: $DB_HOST"
log_info ""
log_warn "IMPORTANTE: Guarda esta información de forma segura"
log_warn ""
log_info "String de conexión para DATABASE_URL en .env:"
echo ""
echo "DATABASE_URL=\"$DATABASE_URL\""
echo ""
log_warn ""
log_warn "PRÓXIMOS PASOS:"
log_warn "1. Copia el DATABASE_URL en tu archivo .env.production"
log_warn "2. Ejecuta 'npx prisma migrate deploy' para crear las tablas"
log_warn "3. Ejecuta 'npm run db:seed' para poblar datos iniciales"

log_info ""
log_info "Script completado exitosamente!"
