#!/bin/bash
# Script para inicializar la aplicación Diabetes AI

echo "=========================================="
echo "Inicializando Diabetes AI Backend"
echo "=========================================="

# 1. Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
pnpm install

# 2. Crear archivo .env si no existe
echo ""
echo "⚙️  Configurando variables de entorno..."
if [ ! -f .env.local ]; then
  echo "Copiando .env.example a .env.local"
  cp .env.example .env.local 2>/dev/null || echo "⚠️  .env.local no encontrado, asegúrate de crearlo manualmente"
fi

# 3. Generar cliente Prisma
echo ""
echo "🔧 Generando cliente Prisma..."
pnpm prisma generate

# 4. Ejecutar migraciones
echo ""
echo "🗄️  Ejecutando migraciones de base de datos..."
pnpm prisma migrate deploy || echo "⚠️  No hay migraciones pendientes"

# 5. Poblar BD si es necesario
echo ""
echo "👥 Poblando base de datos (opcional)..."
# pnpm node scripts/seed-usuarios.sql

# 6. Iniciar aplicación en desarrollo
echo ""
echo "🚀 Iniciando servidor de desarrollo..."
echo "La aplicación estará disponible en: http://localhost:3000"
echo ""
pnpm dev

echo ""
echo "=========================================="
echo "✅ ¡Diabetes AI está corriendo!"
echo "=========================================="
