# 🚀 Guía de Deployment

Esta guía de deployment cubre el proceso completo para poner la aplicación en producción.

---

## 📋 Checklist de Pre-Deployment

### 1. Seguridad
- [ ] Cambiar `JWT_SECRET` por una clave fuerte (mín. 32 caracteres)
- [ ] Configurar base de datos con contraseña fuerte
- [ ] Verificar que no hay hardcoded credentials
- [ ] Revisar que `.env` de producción no está en git
- [ ] Habilitar HTTPS

### 2. Base de Datos
- [ ] Ejecutar migraciones: `pnpm prisma migrate deploy`
- [ ] Verificar creación de tablas
- [ ] Configurar backups automáticos

### 3. Aplicación
- [ ] Verificar build exitoso: `pnpm build`
- [ ] Configurar variables de entorno (`NODE_ENV=production`)
- [ ] Verificar dependencias

---

## 🛠️ Deployment Automático (Recomendado)

Hemos simplificado el proceso de configuración con un script unificado.

### 1. Clonar Repositorio
```bash
git clone https://github.com/wowito68/predia.git
cd predia
```

### 2. Ejecutar Setup
```bash
# Dar permisos de ejecución
chmod +x setup.sh

# Ejecutar el script (te guiará paso a paso)
./setup.sh
```

El script `setup.sh` se encargará de:
1.  Verificar e instalar dependencias (Node.js, pnpm, MySQL cliente).
2.  Instalar dependencias del proyecto (`pnpm install`).
3.  Configurar el archivo entorno `.env` interactiva o automáticamente.
4.  Generar el cliente de Prisma.
5.  Ejecutar las migraciones de base de datos.
6.  (Opcional) Poblar la base de datos con datos de prueba (seed).

### 3. Iniciar Aplicación
```bash
# Modo Desarrollo
pnpm dev

# Modo Producción
pnpm build
pnpm start
```

---

## ☁️ Guía de Deployment en VPS (AWS/DigitalOcean/etc)

Para servidores linux (Ubuntu/Debian) destinados a producción.

### Requisitos
- Ubuntu 20.04+ / Debian 11+
- Acceso Root/Sudo
- Node.js 20+ y MySQL 8.0+

### Pasos Manuales (Si no usas setup.sh)

1.  **Configurar Entorno**:
    Copia `.env.example` a `.env` y ajusta las variables de producción:
    ```bash
    cp .env.example .env
    nano .env
    ```

2.  **Base de Datos**:
    Asegúrate de que MySQL está corriendo y la base de datos creada.
    ```bash
    pnpm prisma migrate deploy
    ```

3.  **Process Manager (PM2)**:
    Recomendamos usar PM2 para mantener la app corriendo.
    ```bash
    npm install -g pm2
    pnpm build
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    ```

4.  **Nginx (Reverse Proxy)**:
    Configura Nginx para servir la aplicación en el puerto 80/443 y redirigir al puerto 3000 interno.

---

## 📦 Docker Deployment

1.  **Build Imagen**:
    ```bash
    docker build -t predia-app .
    ```

2.  **Ejecutar**:
    ```bash
    docker run -p 3000:3000 --env-file .env predia-app
    ```

---

## 🔧 Troubleshooting Comun

### "Database connection refused"
- Verifica que MySQL está corriendo: `systemctl status mysql`
- Verifica las credenciales en `.env`
- Verifica que el host sea `localhost` o la IP correcta.

### "Token expired"
- Aumenta `JWT_EXPIRES_IN` en `.env` (ej. `7d`).

### Error en Build
- Limpia caché: `rm -rf .next node_modules` y reinstala: `pnpm install`.
