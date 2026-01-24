#!/bin/bash
# setup.sh - Script unificado de configuración para PREDIA
# Uso: ./setup.sh

set -e

# Colores y formato
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   PREDIA - Setup Assistant   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Verificar Dependencias
echo -e "\n${YELLOW}[1/5] Verificando dependencias del sistema...${NC}"

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ $1 no está instalado.${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 detectado.${NC}"
        return 0
    fi
}

check_cmd node || exit 1
check_cmd pnpm || {
    echo -e "${YELLOW}Instalando pnpm...${NC}"
    npm install -g pnpm
}
check_cmd mysql || echo -e "${YELLOW}⚠️  Cliente MySQL no encontrado (opcional, pero recomendado para checks).${NC}"

# 2. Instalar Node Modules
echo -e "\n${YELLOW}[2/5] Instalando dependencias del proyecto...${NC}"
pnpm install

# 3. Configurar Entorno (.env)
echo -e "\n${YELLOW}[3/5] Configurando variables de entorno...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "Copiando .env.example a .env..."
        cp .env.example .env
        echo -e "${GREEN}✅ Archivo .env creado.${NC}"
        echo -e "${RED}⚠️  IMPORTANTE: Recuerda editar .env con tus credenciales reales.${NC}"
    else
        echo -e "${RED}❌ No se encontró .env.example.${NC}"
    fi
else
    echo -e "${GREEN}✅ Archivo .env ya existe. Saltando creación.${NC}"
fi

# 4. Base de Datos (Prisma)
echo -e "\n${YELLOW}[4/5] Configurando Base de Datos...${NC}"

echo -e "Generando Cliente Prisma..."
pnpm prisma generate

echo -e "¿Deseas ejecutar las migraciones de base de datos ahora? (s/n)"
read -r RUN_MIGRATIONS
if [[ "$RUN_MIGRATIONS" =~ ^[Ss] ]]; then
    echo -e "Ejecutando migraciones..."
    pnpm prisma migrate deploy
    echo -e "${GREEN}✅ Migraciones aplicadas.${NC}"
else
    echo -e "${YELLOW}Saltando migraciones.${NC}"
fi

# 5. Opcionales (Seed)
echo -e "\n${YELLOW}[5/5] Pasos finales...${NC}"
echo -e "¿Deseas poblar la base de datos con datos de prueba (seed)? (s/n)"
read -r RUN_SEED
if [[ "$RUN_SEED" =~ ^[Ss] ]]; then
    echo -e "Ejecutando seed..."
    pnpm db:seed || echo -e "${RED}Error ejecutando seed.${NC}"
fi

echo -e "\n${BLUE}=======================================${NC}"
echo -e "${GREEN}🎉 ¡Setup completado!${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "Para iniciar desarrollo:  ${GREEN}pnpm dev${NC}"
echo -e "Para build producción:    ${GREEN}pnpm build && pnpm start${NC}"
