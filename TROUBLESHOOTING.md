# 🔧 Troubleshooting - Diabetes AI

## Problema: "No autorizado" al crear/listar usuarios

### ✅ Solución Aplicada

El problema fue que **la tabla ROL estaba vacía**. Se agregaron los 3 roles requeridos:

```sql
INSERT INTO rol (nombre_rol, descripcion, activo) VALUES
('Administrador', 'Acceso total al sistema', 1),
('Médico', 'Puede crear pacientes y predicciones', 1),
('Enfermero', 'Acceso limitado a registro de pacientes', 1);
```

---

## Usuarios y Contraseñas Disponibles

Todos los usuarios tienen contraseña: **`password123`**

| Username | Rol | Especialidad |
|----------|-----|--------------|
| admin_luis | Administrador | Administración |
| dr_juan | Médico | Endocrinología |
| dr_maria | Médico | Cardiología |
| dr_carlos | Médico | Dermatología |
| enf_pedro | Enfermero | Enfermería |
| enf_ana | Enfermero | Enfermería |

---

## Cómo Obtener un Token

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_luis","password":"password123"}' | \
  grep -oP '(?<="token":")[^"]+' > /tmp/token.txt

cat /tmp/token.txt
```

---

## Verificar que Todo Funciona

### 1. Verificar servidor corriendo
```bash
curl http://localhost:3000
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<USUARIO_DEMO>","password":"<PASSWORD_DEMO>"}'
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Autenticado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Listar usuarios
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<USUARIO_DEMO>","password":"<PASSWORD_DEMO>"}' | \
  grep -oP '(?<="token":")[^"]+')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/usuarios
```

Respuesta esperada: JSON con lista de usuarios

---

## Problemas Comunes

### 1. "No se ha encontrado la orden «jq»"
**Solución:** Usar `grep` en lugar de `jq`
```bash
# En lugar de:
curl ... | jq -r '.token'

# Usar:
curl ... | grep -oP '(?<="token":")[^"]+' 
```

### 2. "Connection refused"
**Solución:** Iniciar el servidor
```bash
cd /home/wowo/Descargas/diabetes-ai-main
pnpm dev
```

### 3. "No autorizado" al usar token
**Posibles causas:**
- Token expirado (válidos por 7 días)
- Token inválido o corrupto
- Usuario no existe o está inactivo
- Roles no configurados (YA RESUELTO)

**Solución:** Obtener nuevo token

### 4. "El usuario no existe"
**Verificar en BD:**
```bash
mysql -u predia_app -pSecurePassword123! predia -e \
  "SELECT username, nombre, nombre_rol FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol;"
```

Si no ves resultados, ejecutar script:
```bash
bash scripts/crear-usuarios.sh
```

### 5. "La tabla ROL está vacía"
**Solución:** Insertar roles manualmente
```bash
mysql -u predia_app -pSecurePassword123! predia << 'EOF'
INSERT INTO rol (nombre_rol, descripcion, activo) VALUES
('Administrador', 'Acceso total', 1),
('Médico', 'Crear pacientes', 1),
('Enfermero', 'Acceso limitado', 1);
EOF
```

---

## Formato de Headers para Requests

### Con Bearer Token
```bash
curl -H "Authorization: Bearer ${TOKEN}"
```

### Alternativa con Basic Auth (NO RECOMENDADO)
```bash
curl -u username:password
```

---

## Estado Actual del Sistema

✅ **Base de datos:** Conectada
✅ **Usuarios:** 6 usuarios creados
✅ **Roles:** 3 roles configurados  
✅ **Servidor:** Corriendo en puerto 3000
✅ **Autenticación:** JWT funcional
✅ **Endpoints:** Todos disponibles

---

## Scripts Útiles

### Crear todos los usuarios de una vez
```bash
bash scripts/crear-usuarios.sh
```

### Ver todos los usuarios
```bash
mysql -u predia_app -pSecurePassword123! predia \
  -e "SELECT id_usuario, username, nombre, email, nombre_rol FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol;"
```

### Cambiar contraseña de un usuario
```bash
# Generar hash de nueva contraseña
HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'NuevaPass123!', bcrypt.gensalt(10)).decode())")

# Actualizar en BD
mysql -u predia_app -pSecurePassword123! predia \
  -e "UPDATE usuario SET password_hash='$HASH' WHERE username='dr_juan';"
```

### Desactivar/Activar usuario
```bash
# Desactivar
mysql -u predia_app -pSecurePassword123! predia \
  -e "UPDATE usuario SET activo=0 WHERE username='dr_juan';"

# Activar
mysql -u predia_app -pSecurePassword123! predia \
  -e "UPDATE usuario SET activo=1 WHERE username='dr_juan';"
```

---

## Documentación Relacionada

- **CREAR_USUARIOS_RAPIDO.md** - Guía rápida de creación
- **GESTION_USUARIOS.md** - Documentación completa
- **BACKEND_COMPLETADO.md** - Referencia de endpoints
- **.env.local** - Configuración de ambiente

---

Última actualización: 21 de noviembre de 2025
