#!/bin/bash

# Script de inicialización para Diabetes AI Backend
# Uso: chmod +x init.sh && ./init.sh

set -e

echo "🚀 Iniciando configuración de Diabetes AI Backend..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar dependencias
echo -e "${BLUE}1️⃣ Verificando dependencias...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${BLUE}   Instalando pnpm...${NC}"
    npm install -g pnpm
fi

if ! command -v mysql &> /dev/null; then
    echo -e "${RED}⚠️  MySQL no está instalado o no está en PATH${NC}"
    echo "   Por favor instálalo manualmente o asegúrate que está corriendo"
fi

echo -e "${GREEN}✅ Dependencias verificadas${NC}"
echo ""

# 2. Instalar dependencias del proyecto
echo -e "${BLUE}2️⃣ Instalando dependencias del proyecto...${NC}"
pnpm install
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# 3. Crear .env.local si no existe
echo -e "${BLUE}3️⃣ Configurando variables de entorno...${NC}"

if [ ! -f .env.local ]; then
    echo "   Creando .env.local..."
    cat > .env.local << 'EOF'
# Base de Datos
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=predia
DATABASE_USER=predia_app
DATABASE_PASSWORD=SecurePassword123!
DATABASE_URL=mysql://predia_app:SecurePassword123!@localhost:3306/predia

# JWT
JWT_SECRET=diabetes-ai-secret-key-minimo-32-caracteres-aqui
JWT_EXPIRES_IN=7d

# URLs
NEXT_PUBLIC_API_URL=http://localhost:3000/api
ML_API_URL=http://localhost:5000

# Node
NODE_ENV=development
EOF
    echo -e "${GREEN}✅ .env.local creado${NC}"
    echo "   ⚠️  IMPORTANTE: Edita .env.local con tus credenciales de BD"
else
    echo -e "${GREEN}✅ .env.local ya existe${NC}"
fi
echo ""

# 4. Generar cliente de Prisma
echo -e "${BLUE}4️⃣ Generando cliente de Prisma...${NC}"
pnpm prisma generate
echo -e "${GREEN}✅ Cliente de Prisma generado${NC}"
echo ""

# 5. Info sobre migraciones
echo -e "${BLUE}5️⃣ Siguiente paso - Migraciones de BD${NC}"
echo "   Ejecuta uno de los siguientes comandos:"
echo ""
echo "   Opción A - Primera migración (recomendado):"
echo -e "   ${GREEN}pnpm prisma migrate dev --name init${NC}"
echo ""
echo "   Opción B - Si la BD ya está creada:"
echo -e "   ${GREEN}pnpm prisma migrate deploy${NC}"
echo ""
echo "   Opción C - Sincronizar esquema (desarrollo):"
echo -e "   ${GREEN}pnpm prisma db push${NC}"
echo ""
echo "   Primero asegúrate de que MySQL está corriendo y la BD 'predia' existe:"
echo -e "   ${GREEN}mysql -u predia_app -p -e 'CREATE DATABASE IF NOT EXISTS predia;'${NC}"
echo ""

# 6. Mostrar siguiente paso
echo -e "${BLUE}6️⃣ Comandos siguientes:${NC}"
echo ""
echo "   Ejecutar servidor:"
echo -e "   ${GREEN}pnpm dev${NC}"
echo ""
echo "   Acceder a la app:"
echo -e "   ${GREEN}http://localhost:3000${NC}"
echo ""
echo "   Acceder a Prisma Studio (explorador visual de BD):"
echo -e "   ${GREEN}pnpm prisma studio${NC}"
echo ""

echo -e "${GREEN}🎉 ¡Configuración inicial completada!${NC}"
echo ""
echo "Documentación:"
echo "  - Guía rápida: GUIA_RAPIDA.md"
echo "  - Documentación completa: BACKEND_COMPLETADO.md"
echo ""
