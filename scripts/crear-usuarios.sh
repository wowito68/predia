#!/bin/bash
# scripts/crear-usuarios.sh
# Script para crear múltiples usuarios rápidamente

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                                                                ║${NC}"
echo -e "${YELLOW}║          🚀 Crear Múltiples Usuarios - Diabetes AI            ║${NC}"
echo -e "${YELLOW}║                                                                ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Credenciales de base de datos
DB_USER="predia_app"
DB_PASS="SecurePassword123!"
DB_NAME="predia"

# Hash de contraseña de ejemplo (para "password123")
# Reemplaza con tu propio hash si quieres otra contraseña
HASH_PASSWORD='$2a$10$N9qo8uLOickgx2ZMRZoM.eDwCvxegen7C0ns3OtQQ6Kx.H9RSAMA'

# Array de usuarios a crear
declare -a usuarios=(
  # Formato: "username|nombre|apellido_paterno|email|id_rol|especialidad"
  "dr_juan|Juan|García|juan.garcia@hospital.com|2|Endocrinología"
  "dr_maria|María|López|maria.lopez@hospital.com|2|Cardiología"
  "dr_carlos|Carlos|Martínez|carlos.martinez@hospital.com|2|Dermatología"
  "enf_pedro|Pedro|Rodríguez|pedro.rodriguez@hospital.com|3|Enfermería"
  "enf_ana|Ana|González|ana.gonzalez@hospital.com|3|Enfermería"
  "admin_luis|Luis|Torres|luis.torres@hospital.com|1|Administración"
)

echo -e "${YELLOW}📊 USUARIOS A CREAR:${NC}"
echo ""
for i in "${!usuarios[@]}"; do
  IFS='|' read -r username nombre apellido email rol especialidad <<< "${usuarios[$i]}"
  echo "  $(($i + 1)). ${username} (${nombre} ${apellido}) - Rol: ${rol}"
done
echo ""

# Solicitar confirmación
read -p "¿Deseas continuar? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo -e "${RED}❌ Operación cancelada${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Conectando a base de datos...${NC}"
echo ""

# Crear el script SQL
SQL_SCRIPT="/tmp/crear_usuarios.sql"
cat > "$SQL_SCRIPT" << EOF
USE $DB_NAME;
SET FOREIGN_KEY_CHECKS=0;

EOF

# Agregar cada usuario
for usuario in "${usuarios[@]}"; do
  IFS='|' read -r username nombre apellido email rol especialidad <<< "$usuario"
  
  cat >> "$SQL_SCRIPT" << EOF
-- Crear usuario: $username
INSERT INTO usuario (
  username,
  password_hash,
  id_rol,
  nombre,
  apellido_paterno,
  email,
  especialidad,
  activo,
  fecha_modificacion
) VALUES (
  '$username',
  '$HASH_PASSWORD',
  $rol,
  '$nombre',
  '$apellido',
  '$email',
  '$especialidad',
  1,
  NOW()
);

EOF
done

cat >> "$SQL_SCRIPT" << EOF
SET FOREIGN_KEY_CHECKS=1;
SELECT CONCAT('✅ Usuarios creados') as resultado;
EOF

# Ejecutar el script SQL
mysql -u "$DB_USER" -p"$DB_PASS" < "$SQL_SCRIPT"

# Verificar resultado
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Usuarios creados exitosamente${NC}"
  echo ""
  echo -e "${YELLOW}📋 Usuarios creados:${NC}"
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT id_usuario, username, nombre, email, nombre_rol FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol ORDER BY u.id_usuario DESC LIMIT ${#usuarios[@]};"
  echo ""
  echo -e "${YELLOW}🔐 Contraseña para todos: password123${NC}"
  echo ""
  echo -e "${GREEN}✨ Listo para usar${NC}"
else
  echo ""
  echo -e "${RED}❌ Error al crear usuarios${NC}"
  exit 1
fi

# Limpiar archivo temporal
rm -f "$SQL_SCRIPT"
