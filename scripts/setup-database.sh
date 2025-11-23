#!/bin/bash
# ============================================
# scripts/setup-database.sh
# ============================================
# Script de configuración automática de base de datos
# Para despliegue en AWS VPS
#
# Uso: ./scripts/setup-database.sh

set -e  # Salir si hay algún error

echo "========================================"
echo "🚀 PREDIA - Setup de Base de Datos"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Validar variables de entorno
echo "📋 Validando variables de entorno..."

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL no está definida${NC}"
  echo "Por favor configura las variables de entorno en .env"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo -e "${YELLOW}⚠️  WARNING: JWT_SECRET no está definida${NC}"
  echo "Se recomienda configurar JWT_SECRET en .env"
fi

echo -e "${GREEN}✅ Variables de entorno validadas${NC}\n"

# 2. Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependencias..."
  npm install
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
fi

# 3. Generar cliente Prisma
echo "🔧 Generando cliente Prisma..."
npx prisma generate
echo -e "${GREEN}✅ Cliente Prisma generado${NC}\n"

# 4. Ejecutar migraciones
echo "🔄 Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Migraciones aplicadas correctamente${NC}\n"
else
  echo -e "${RED}❌ Error al aplicar migraciones${NC}"
  exit 1
fi

# 5. Ejecutar seeders (solo si existe seed.ts)
if [ -f "prisma/seed.ts" ]; then
  echo "🌱 Ejecutando seeders..."
  npm run db:seed
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Seeders ejecutados correctamente${NC}\n"
  else
    echo -e "${YELLOW}⚠️  Warning: Error en seeders (puede ser normal si ya existen datos)${NC}\n"
  fi
else
  echo -e "${YELLOW}ℹ️  No se encontró archivo de seed${NC}\n"
fi

# 6. Verificar conexión a BD
echo "🔍 Verificando conexión a base de datos..."
npx prisma db execute --stdin <<EOF
SELECT 1 as test;
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Conexión a base de datos exitosa${NC}\n"
else
  echo -e "${RED}❌ Error de conexión a base de datos${NC}"
  exit 1
fi

# Resumen
echo "========================================"
echo  "✅ Setup completado exitosamente!"
echo "========================================"
echo ""
echo "🎯 Próximos pasos:"
echo "  1. Verifica que la aplicación esté configurada correctamente"
echo "  2. Ejecuta: npm run build"
echo "  3. Ejecuta: npm run start"
echo ""
echo "📝 Credenciales por defecto (cambiarlas en producción):"
echo "  Usuario: admin_luis"
echo "  Password: password123"
echo ""
