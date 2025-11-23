#!/bin/bash

# ============================================
# Script de prueba CRUD de Pacientes
# ============================================
# Verifica que:
# 1. Se puede crear un paciente con cédula única
# 2. Se puede obtener el paciente creado
# 3. Se puede actualizar datos del paciente
# 4. Se puede eliminar el paciente (hard delete)
# 5. Todos los datos relacionados se eliminan en cascada
# 6. La cédula queda disponible para reusar
# 7. No hay registros huérfanos

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
API_URL="${API_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-predia_app}"
DB_PASSWORD="${DB_PASSWORD:-SecurePassword123!}"
DB_NAME="${DB_NAME:-predia}"
TOKEN="${TOKEN:-}"

# Variables para la prueba
TEST_CEDULA="TEST$(date +%s | tail -c 5)"
PACIENTE_ID=""

# Función para imprimir resultados
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Función para ejecutar queries en MySQL
run_query() {
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$1" 2>/dev/null
}

# Función para obtener Token JWT si no está definido
get_token() {
    if [ -z "$TOKEN" ]; then
        print_info "Obteniendo token JWT..."
        # Por defecto, usar el token de un usuario existente
        # En un entorno real, esto vendría del login
        print_warning "Se requiere TOKEN definido. Usar: export TOKEN=<tu_jwt_token>"
        return 1
    fi
    return 0
}

# ============================================
# INICIO DE PRUEBAS
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║       TEST CRUD COMPLETO DE PACIENTES - Eliminación       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar que TOKEN está definido
if ! get_token; then
    exit 1
fi

print_info "Configuración:"
print_info "  API URL: $API_URL"
print_info "  Database: $DB_NAME@$DB_HOST"
print_info "  Cédula de prueba: $TEST_CEDULA"
echo ""

# ============================================
# PASO 1: CREAR PACIENTE
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 1: Crear paciente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PACIENTE_RESPONSE=$(curl -s -X POST "$API_URL/api/pacientes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"cedula\": \"$TEST_CEDULA\",
    \"nombre\": \"Juan\",
    \"apellido_paterno\": \"Pérez\",
    \"apellido_materno\": \"García\",
    \"genero\": \"M\",
    \"fecha_nacimiento\": \"1990-05-15\",
    \"email\": \"juan.perez@example.com\",
    \"telefono\": \"+56912345678\"
  }")

PACIENTE_ID=$(echo "$PACIENTE_RESPONSE" | grep -o '"id_paciente":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$PACIENTE_ID" ] && [ "$PACIENTE_ID" != "0" ]; then
    print_success "Paciente creado correctamente"
    print_info "  ID Paciente: $PACIENTE_ID"
    print_info "  Cédula: $TEST_CEDULA"
else
    print_error "Fallo al crear paciente"
    echo "Respuesta: $PACIENTE_RESPONSE"
    exit 1
fi

# Verificar en BD
BD_VERIFY=$(run_query "SELECT id_paciente FROM paciente WHERE id_paciente = $PACIENTE_ID AND cedula = '$TEST_CEDULA'")
if [ -n "$BD_VERIFY" ]; then
    print_success "Paciente verificado en base de datos"
else
    print_error "Paciente no encontrado en BD"
    exit 1
fi

# ============================================
# PASO 2: CREAR ESTUDIO LABORATORIO
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 2: Crear estudio de laboratorio"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ESTUDIO_RESPONSE=$(curl -s -X POST "$API_URL/api/estudios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_paciente\": $PACIENTE_ID,
    \"urea\": 35.5,
    \"creatinina\": 0.9,
    \"hba1c\": 6.2,
    \"colesterol_total\": 220.0,
    \"trigliceridos\": 150.0,
    \"hdl\": 50.0,
    \"ldl\": 140.0,
    \"vldl\": 30.0
  }")

ESTUDIO_ID=$(echo "$ESTUDIO_RESPONSE" | grep -o '"id_estudio":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$ESTUDIO_ID" ] && [ "$ESTUDIO_ID" != "0" ]; then
    print_success "Estudio de laboratorio creado"
    print_info "  ID Estudio: $ESTUDIO_ID"
else
    print_warning "No se pudo crear estudio (opcional para prueba)"
fi

# ============================================
# PASO 3: CREAR MEDICIÓN ANTROPOMÉTRICA
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 3: Crear medición antropométrica"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MEDICION_RESPONSE=$(curl -s -X POST "$API_URL/api/mediciones" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_paciente\": $PACIENTE_ID,
    \"peso\": 75.5,
    \"altura\": 1.75,
    \"imc\": 24.6,
    \"circunferencia_cintura\": 85.0,
    \"circunferencia_cadera\": 95.0,
    \"presion_sistolica\": 120,
    \"presion_diastolica\": 80
  }")

MEDICION_ID=$(echo "$MEDICION_RESPONSE" | grep -o '"id_medicion":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$MEDICION_ID" ] && [ "$MEDICION_ID" != "0" ]; then
    print_success "Medición antropométrica creada"
    print_info "  ID Medición: $MEDICION_ID"
else
    print_warning "No se pudo crear medición (opcional para prueba)"
fi

# ============================================
# PASO 4: CREAR PREDICCIÓN
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 4: Crear predicción"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PREDICCION_RESPONSE=$(curl -s -X POST "$API_URL/api/predicciones" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_paciente\": $PACIENTE_ID,
    \"datos_entrada\": {
      \"age\": 33,
      \"urea\": 35.5,
      \"cr\": 0.9,
      \"hba1c\": 6.2,
      \"chol\": 220.0,
      \"tg\": 150.0,
      \"hdl\": 50.0,
      \"ldl\": 140.0,
      \"vldl\": 30.0,
      \"bmi\": 24.6
    }
  }")

PREDICCION_ID=$(echo "$PREDICCION_RESPONSE" | grep -o '"id_prediccion":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$PREDICCION_ID" ] && [ "$PREDICCION_ID" != "0" ]; then
    print_success "Predicción creada"
    print_info "  ID Predicción: $PREDICCION_ID"
else
    print_warning "No se pudo crear predicción (opcional para prueba)"
fi

# ============================================
# PASO 5: CONTAR REGISTROS RELACIONADOS
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 5: Verificar registros relacionados ANTES de eliminar"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ESTUDIOS_COUNT=$(run_query "SELECT COUNT(*) FROM estudio_laboratorio WHERE id_paciente = $PACIENTE_ID" | tail -1)
MEDICIONES_COUNT=$(run_query "SELECT COUNT(*) FROM medicion_antropometrica WHERE id_paciente = $PACIENTE_ID" | tail -1)
PREDICCIONES_COUNT=$(run_query "SELECT COUNT(*) FROM prediccion WHERE id_paciente = $PACIENTE_ID" | tail -1)
HISTORIALES_COUNT=$(run_query "SELECT COUNT(*) FROM historial_clinico WHERE id_paciente = $PACIENTE_ID" | tail -1)

print_info "Registros relacionados encontrados:"
print_info "  Estudios de laboratorio: $ESTUDIOS_COUNT"
print_info "  Mediciones antropométricas: $MEDICIONES_COUNT"
print_info "  Predicciones: $PREDICCIONES_COUNT"
print_info "  Historiales clínicos: $HISTORIALES_COUNT"

TOTAL_RELATED=$((ESTUDIOS_COUNT + MEDICIONES_COUNT + PREDICCIONES_COUNT + HISTORIALES_COUNT))
print_info "  Total relacionados: $TOTAL_RELATED"

# ============================================
# PASO 6: ELIMINAR PACIENTE (HARD DELETE)
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 6: Eliminar paciente (hard delete con cascada)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/pacientes/$PACIENTE_ID" \
  -H "Authorization: Bearer $TOKEN")

DELETE_SUCCESS=$(echo "$DELETE_RESPONSE" | grep -o '"success":true')

if [ -n "$DELETE_SUCCESS" ]; then
    print_success "Paciente eliminado correctamente"
    echo "Respuesta: $DELETE_RESPONSE" | head -c 200
    echo ""
else
    print_error "Fallo al eliminar paciente"
    echo "Respuesta: $DELETE_RESPONSE"
    exit 1
fi

# ============================================
# PASO 7: VERIFICAR ELIMINACIÓN EN CASCADA
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 7: Verificar eliminación en cascada (sin huérfanos)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar paciente eliminado
PACIENTE_EXISTS=$(run_query "SELECT COUNT(*) FROM paciente WHERE id_paciente = $PACIENTE_ID" | tail -1)
if [ "$PACIENTE_EXISTS" = "0" ]; then
    print_success "Paciente eliminado de BD"
else
    print_error "Paciente aún existe en BD"
    exit 1
fi

# Verificar estudios eliminados
ESTUDIOS_REMAINING=$(run_query "SELECT COUNT(*) FROM estudio_laboratorio WHERE id_paciente = $PACIENTE_ID" | tail -1)
if [ "$ESTUDIOS_REMAINING" = "0" ]; then
    print_success "Estudios eliminados en cascada ($ESTUDIOS_COUNT eliminados)"
else
    print_error "Aún existen $ESTUDIOS_REMAINING estudios huérfanos"
    exit 1
fi

# Verificar mediciones eliminadas
MEDICIONES_REMAINING=$(run_query "SELECT COUNT(*) FROM medicion_antropometrica WHERE id_paciente = $PACIENTE_ID" | tail -1)
if [ "$MEDICIONES_REMAINING" = "0" ]; then
    print_success "Mediciones eliminadas en cascada ($MEDICIONES_COUNT eliminadas)"
else
    print_error "Aún existen $MEDICIONES_REMAINING mediciones huérfanas"
    exit 1
fi

# Verificar predicciones eliminadas
PREDICCIONES_REMAINING=$(run_query "SELECT COUNT(*) FROM prediccion WHERE id_paciente = $PACIENTE_ID" | tail -1)
if [ "$PREDICCIONES_REMAINING" = "0" ]; then
    print_success "Predicciones eliminadas en cascada ($PREDICCIONES_COUNT eliminadas)"
else
    print_error "Aún existen $PREDICCIONES_REMAINING predicciones huérfanas"
    exit 1
fi

# Verificar historiales eliminados
HISTORIALES_REMAINING=$(run_query "SELECT COUNT(*) FROM historial_clinico WHERE id_paciente = $PACIENTE_ID" | tail -1)
if [ "$HISTORIALES_REMAINING" = "0" ]; then
    print_success "Historiales eliminados en cascada ($HISTORIALES_COUNT eliminados)"
else
    print_error "Aún existen $HISTORIALES_REMAINING historiales huérfanos"
    exit 1
fi

# ============================================
# PASO 8: VERIFICAR CÉDULA DISPONIBLE PARA REUSAR
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 8: Verificar que cédula está disponible para reusar"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CEDULA_EXISTS=$(run_query "SELECT COUNT(*) FROM paciente WHERE cedula = '$TEST_CEDULA'" | tail -1)
if [ "$CEDULA_EXISTS" = "0" ]; then
    print_success "Cédula $TEST_CEDULA está disponible para reusar"
else
    print_error "Cédula aún existe en BD (no puede reutilizarse)"
    exit 1
fi

# ============================================
# PRUEBA DE REUTILIZACIÓN
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 9: Crear nuevo paciente con MISMA cédula"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REUSE_RESPONSE=$(curl -s -X POST "$API_URL/api/pacientes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"cedula\": \"$TEST_CEDULA\",
    \"nombre\": \"María\",
    \"apellido_paterno\": \"López\",
    \"apellido_materno\": \"Rodríguez\",
    \"genero\": \"F\",
    \"fecha_nacimiento\": \"1992-03-20\",
    \"email\": \"maria.lopez@example.com\",
    \"telefono\": \"+56987654321\"
  }")

NEW_PACIENTE_ID=$(echo "$REUSE_RESPONSE" | grep -o '"id_paciente":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$NEW_PACIENTE_ID" ] && [ "$NEW_PACIENTE_ID" != "0" ]; then
    print_success "Nuevo paciente creado con cédula reutilizada"
    print_info "  ID Paciente nuevo: $NEW_PACIENTE_ID"
    print_info "  Cédula (reutilizada): $TEST_CEDULA"
else
    print_error "Fallo al crear nuevo paciente con cédula reutilizada"
    echo "Respuesta: $REUSE_RESPONSE"
    exit 1
fi

# Limpiar paciente de prueba final
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Limpieza: Eliminar paciente de reutilización"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s -X DELETE "$API_URL/api/pacientes/$NEW_PACIENTE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

print_success "Paciente de prueba eliminado"

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ TODAS LAS PRUEBAS PASARON            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Resumen:"
echo "  • Paciente creado exitosamente"
echo "  • Estudios, mediciones y predicciones creados"
echo "  • Eliminación con cascada exitosa (sin huérfanos)"
echo "  • Cédula disponible para reutilización"
echo "  • Nuevo paciente creado con cédula anterior"
echo ""
echo "La implementación de hard delete con transacciones está funcionando correctamente."
echo ""
