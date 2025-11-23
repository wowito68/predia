#!/bin/bash

###############################################################################
# Script de Deployment de Aplicación PREDIA
# Autor: Deployment Automation
# Descripción: Deploya o actualiza la aplicación en el servidor
###############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Variables de configuración
APP_DIR="${APP_DIR:-/var/www/predia}"
APP_USER="${APP_USER:-predia}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
PM2_APP_NAME="predia-app"
PORT="${PORT:-3000}"

log_info "=========================================="
log_info "Deployment de Aplicación PREDIA"
log_info "=========================================="

# Verificar que se proporcionó la URL del repositorio
if [ -z "$REPO_URL" ]; then
    log_error "Debes proporcionar la URL del repositorio"
    log_info "Ejemplo: REPO_URL=https://github.com/tu-usuario/predia.git ./deploy-app.sh"
    exit 1
fi

# Verificar que existe el archivo .env.production
if [ ! -f "$APP_DIR/.env.production" ] && [ ! -f "$APP_DIR/.env" ]; then
    log_error "No se encontró archivo .env.production o .env en $APP_DIR"
    log_warn "Crea el archivo .env.production con las variables necesarias antes de continuar"
    exit 1
fi

# Paso 1: Clonar o actualizar repositorio
log_step "1/8: Obteniendo código fuente..."
if [ ! -d "$APP_DIR/.git" ]; then
    log_info "Clonando repositorio por primera vez..."
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
else
    log_info "Actualizando repositorio existente..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/"$BRANCH"
    git pull origin "$BRANCH"
fi

cd "$APP_DIR"

# Paso 2: Instalar dependencias
log_step "2/8: Instalando dependencias..."
npm ci --omit=dev

# Paso 3: Generar Prisma Client
log_step "3/8: Generando Prisma Client..."
npx prisma generate

# Verificar que DATABASE_URL esté configurado
if ! grep -q "DATABASE_URL" .env* 2>/dev/null; then
    log_error "DATABASE_URL no está configurado en el archivo .env"
    exit 1
fi

# Paso 4: Ejecutar migraciones
log_step "4/8: Ejecutando migraciones de base de datos..."
log_info "Esto creará o actualizará las tablas automáticamente (similar a 'php artisan migrate')"
npx prisma migrate deploy

# Paso 5: Seed de base de datos (opcional)
log_step "5/8: Verificando si es necesario seed de datos..."
if [ "$RUN_SEED" = "true" ]; then
    log_info "Ejecutando seed de base de datos..."
    npm run db:seed || log_warn "Seed falló o no es necesario"
else
    log_warn "Seed omitido. Configura RUN_SEED=true si deseas ejecutarlo"
fi

# Paso 6: Build de producción
log_step "6/8: Construyendo aplicación para producción..."
npm run build

# Paso 7: Ajustar permisos
log_step "7/8: Ajustando permisos..."
chown -R $APP_USER:$APP_USER "$APP_DIR"

# Paso 8: Configurar y ejecutar con PM2
log_step "8/8: Configurando PM2..."

# Verificar si existe ecosystem.config.js, si no, crear uno básico
if [ ! -f "$APP_DIR/ecosystem.config.js" ]; then
    log_info "Creando ecosystem.config.js..."
    cat > "$APP_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true
  }]
};
EOF
fi

# Crear directorio de logs
mkdir -p "$APP_DIR/logs"
chown -R $APP_USER:$APP_USER "$APP_DIR/logs"

# Verificar si la app ya está corriendo en PM2
if pm2 list | grep -q "$PM2_APP_NAME"; then
    log_info "Aplicación ya está corriendo, reiniciando..."
    pm2 reload "$PM2_APP_NAME" --update-env
else
    log_info "Iniciando aplicación por primera vez..."
    pm2 start "$APP_DIR/ecosystem.config.js"
fi

# Guardar configuración de PM2
pm2 save

log_info "=========================================="
log_info "Deployment Completado Exitosamente!"
log_info "=========================================="
log_info "✓ Código actualizado desde rama: $BRANCH"
log_info "✓ Dependencias instaladas"
log_info "✓ Prisma Client generado"
log_info "✓ Migraciones ejecutadas"
log_info "✓ Build de producción completado"
log_info "✓ Aplicación corriendo con PM2"
log_info ""
log_info "Estado de PM2:"
pm2 list

log_info ""
log_info "Ver logs en tiempo real:"
log_info "  pm2 logs $PM2_APP_NAME"
log_info ""
log_info "Otros comandos útiles:"
log_info "  pm2 restart $PM2_APP_NAME  - Reiniciar app"
log_info "  pm2 stop $PM2_APP_NAME     - Detener app"
log_info "  pm2 monit                   - Monitor interactivo"
log_info ""
log_info "La aplicación debería estar disponible en http://tu-servidor:$PORT"
