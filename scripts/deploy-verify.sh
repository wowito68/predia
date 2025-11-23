#!/bin/bash

###############################################################################
# Script de Verificación de Deployment
# Autor: Deployment Automation
# Descripción: Verifica que todos los servicios estén funcionando correctamente
###############################################################################

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

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# Variables
APP_DIR="${APP_DIR:-/var/www/predia}"
PM2_APP_NAME="predia-app"
PORT="${PORT:-3000}"
ERRORS=0

log_info "=========================================="
log_info "Verificación de Deployment"
log_info "=========================================="

# 1. Verificar MySQL
log_check "Verificando MySQL..."
if systemctl is-active --quiet mysql; then
    echo "  ✓ MySQL está corriendo"
else
    echo "  ✗ MySQL NO está corriendo"
    ((ERRORS++))
fi

# 2. Verificar conexión a base de datos
log_check "Verificando conexión a base de datos..."
if [ -f "$APP_DIR/.env" ] || [ -f "$APP_DIR/.env.production" ]; then
    cd "$APP_DIR"
    if npx prisma db status &> /dev/null; then
        echo "  ✓ Conexión a base de datos exitosa"
    else
        echo "  ✗ No se pudo conectar a la base de datos"
        ((ERRORS++))
    fi
else
    echo "  ✗ No se encontró archivo .env"
    ((ERRORS++))
fi

# 3. Verificar que las tablas existen
log_check "Verificando tablas de base de datos..."
# Cargar DATABASE_URL desde .env
if [ -f "$APP_DIR/.env.production" ]; then
    source "$APP_DIR/.env.production"
elif [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
fi

if [ -n "$DATABASE_URL" ]; then
    # Extraer credenciales de DATABASE_URL
    # Formato: mysql://user:password@host:port/database
    DB_INFO=$(echo "$DATABASE_URL" | sed -E 's/mysql:\/\/([^:]+):([^@]+)@([^:]+):([^/]+)\/(.+)/\1 \2 \3 \5/')
    read DB_USER DB_PASS DB_HOST DB_NAME <<< "$DB_INFO"
    
    TABLES=$(mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -D "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | tail -n +2)
    
    if [ -n "$TABLES" ]; then
        TABLE_COUNT=$(echo "$TABLES" | wc -l)
        echo "  ✓ Base de datos contiene $TABLE_COUNT tablas"
        echo "    Tablas: $(echo $TABLES | tr '\n' ', ' | sed 's/, $//')"
    else
        echo "  ✗ No se encontraron tablas en la base de datos"
        log_warn "    Ejecuta 'npx prisma migrate deploy' para crear las tablas"
        ((ERRORS++))
    fi
else
    echo "  ✗ DATABASE_URL no está configurado"
    ((ERRORS++))
fi

# 4. Verificar PM2
log_check "Verificando PM2..."
if command -v pm2 &> /dev/null; then
    echo "  ✓ PM2 está instalado"
    
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .pm2_env.status")
        if [ "$STATUS" = "online" ]; then
            echo "  ✓ Aplicación $PM2_APP_NAME está corriendo"
        else
            echo "  ✗ Aplicación $PM2_APP_NAME tiene estado: $STATUS"
            ((ERRORS++))
        fi
    else
        echo "  ✗ Aplicación $PM2_APP_NAME no encontrada en PM2"
        ((ERRORS++))
    fi
else
    echo "  ✗ PM2 no está instalado"
    ((ERRORS++))
fi

# 5. Verificar que la aplicación responde
log_check "Verificando que la aplicación responde..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT | grep -q "200\|302"; then
    echo "  ✓ Aplicación responde en puerto $PORT"
else
    echo "  ✗ Aplicación no responde en puerto $PORT"
    log_warn "    Verifica los logs con: pm2 logs $PM2_APP_NAME"
    ((ERRORS++))
fi

# 6. Verificar firewall
log_check "Verificando firewall..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        echo "  ✓ Firewall (UFW) está activo"
        ufw status | grep -E "80|443|$PORT"
    else
        echo "  ✗ Firewall (UFW) NO está activo"
        log_warn "    Activa el firewall para mayor seguridad"
    fi
else
    echo "  - UFW no está instalado"
fi

# 7. Verificar Node.js version
log_check "Verificando Node.js..."
NODE_VERSION=$(node -v)
echo "  ✓ Node.js version: $NODE_VERSION"

# 8. Verificar espacio en disco
log_check "Verificando espacio en disco..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "  ✓ Espacio en disco: ${DISK_USAGE}% usado"
else
    echo "  ✗ Espacio en disco crítico: ${DISK_USAGE}% usado"
    log_warn "    Considera liberar espacio en disco"
    ((ERRORS++))
fi

# 9. Mostrar logs recientes
log_check "Mostrando logs recientes de la aplicación..."
if pm2 list | grep -q "$PM2_APP_NAME"; then
    echo ""
    pm2 logs "$PM2_APP_NAME" --lines 10 --nostream
fi

# Resumen
log_info ""
log_info "=========================================="
if [ $ERRORS -eq 0 ]; then
    log_info "✓ Todas las verificaciones pasaron exitosamente"
    log_info "=========================================="
    exit 0
else
    log_error "✗ Se encontraron $ERRORS error(es)"
    log_info "=========================================="
    log_warn "Revisa los errores anteriores y corrígelos"
    exit 1
fi
