# 🚀 Guía de Deployment en AWS VPS

Esta guía explica cómo deployar tu aplicación PREDIA en un servidor VPS de AWS (o cualquier VPS con Ubuntu/Debian) con configuración **automática de base de datos**, similar a cómo Laravel maneja sus migraciones con Eloquent.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración del Sistema Prisma](#configuración-del-sistema-prisma)
- [Paso 1: Configuración Inicial del Servidor](#paso-1-configuración-inicial-del-servidor)
- [Paso 2: Configuración de Base de Datos](#paso-2-configuración-de-base-de-datos)
- [Paso 3: Configuración de Variables de Entorno](#paso-3-configuración-de-variables-de-entorno)
- [Paso 4: Deployment de la Aplicación](#paso-4-deployment-de-la-aplicación)
- [Paso 5: Verificación](#paso-5-verificación)
- [Comandos de Mantenimiento](#comandos-de-mantenimiento)
- [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### En tu máquina local:
- Git configurado
- Acceso SSH al servidor VPS
- Tu código en un repositorio Git (GitHub, GitLab, Bitbucket)

### Tu VPS AWS:
- Ubuntu 20.04 LTS o superior / Debian 11+
- Al menos 1GB RAM (recomendado 2GB+)
- 20GB de espacio en disco
- Acceso root o sudo
- IP pública asignada

---

## 🔧 Configuración del Sistema Prisma

### ¿Qué es Prisma? (Equivalente a Laravel Eloquent)

Tu proyecto **ya usa Prisma**, que es el ORM moderno para Node.js. Funciona igual que Laravel:

| Laravel Eloquent | Tu Proyecto (Prisma) |
|------------------|----------------------|
| `php artisan migrate` | `npx prisma migrate deploy` |
| Models en `/app/Models` | Prisma Client auto-generado |
| `php artisan db:seed` | `npm run db:seed` |
| Schema en migraciones PHP | `prisma/schema.prisma` |

### Ventajas de Prisma sobre Laravel:

✅ **Type-safety completo** - TypeScript sabe exactamente qué campos tiene cada modelo  
✅ **Auto-completado perfecto** - Tu IDE conoce todas las relaciones  
✅ **Migraciones versionadas** - Cada migración se guarda en `/prisma/migrations`  
✅ **Rollback sencillo** - Puedes volver a cualquier versión anterior  
✅ **Zero-config** - El cliente se genera automáticamente desde el schema  

### El Flujo de Prisma:

```mermaid
graph LR
    A[schema.prisma] --> B[prisma generate]
    B --> C[Prisma Client]
    A --> D[prisma migrate deploy]
    D --> E[Base de Datos MySQL]
    E --> F[Tablas Creadas]
    F --> G[App Lista]
```

---

## Paso 1: Configuración Inicial del Servidor

### 1.1 Conectarse al VPS

```bash
ssh -i tu-llave.pem ubuntu@tu-ip-publica
# o
ssh root@tu-ip-publica
```

### 1.2 Transferir Scripts de Deployment

Desde tu máquina local, copia los scripts al servidor:

```bash
# Opción 1: Usando SCP
scp -r scripts/ ubuntu@tu-ip:/tmp/

# Opción 2: Clonar el repositorio directamente en el servidor
ssh ubuntu@tu-ip
git clone https://github.com/tu-usuario/predia.git /tmp/predia
cd /tmp/predia
```

### 1.3 Ejecutar Configuración del Servidor

```bash
sudo chmod +x scripts/deploy-server-setup.sh
sudo ./scripts/deploy-server-setup.sh
```

Este script instalará automáticamente:
- ✅ Node.js 18 LTS
- ✅ MySQL 8.0
- ✅ PM2 (gestor de procesos)
- ✅ Firewall (UFW) configurado
- ✅ Usuario `predia` para la app
- ✅ 2GB de swap

**⏱️ Tiempo estimado:** 5-10 minutos

> **📝 Nota:** El script creará una contraseña temporal para MySQL root. Anótala, la necesitarás en el siguiente paso.

---

## Paso 2: Configuración de Base de Datos

### 2.1 Ejecutar Script de Configuración de BD

```bash
sudo chmod +x scripts/deploy-db-setup.sh
sudo ./scripts/deploy-db-setup.sh
```

El script te pedirá:
1. **Contraseña de root de MySQL** (la del paso anterior)
2. **Contraseña para el usuario de la aplicación** (crea una segura)

Este script creará automáticamente:
- ✅ Base de datos `predia_db`
- ✅ Usuario `predia_user` con permisos completos
- ✅ Validará la conexión
- ✅ Te dará el `DATABASE_URL` para el archivo `.env`

**📋 Guarda el `DATABASE_URL` que te muestre, lo necesitarás para el siguiente paso.**

---

## Paso 3: Configuración de Variables de Entorno

### 3.1 Crear Archivo de Variables de Entorno

En tu servidor, crea el archivo `.env.production`:

```bash
cd /var/www/predia
nano .env.production
```

### 3.2 Configurar Variables

Usa el template en `env-production-template.txt` como referencia:

```bash
# BASE DE DATOS (copia el que te dio deploy-db-setup.sh)
DATABASE_URL="mysql://predia_user:tu_password@localhost:3306/predia_db"

# JWT SECRET (genera uno seguro)
JWT_SECRET="$(openssl rand -base64 32)"

# Tu dominio o IP
NEXT_PUBLIC_API_URL="http://tu-ip-o-dominio:3000"

# Entorno
NODE_ENV="production"
PORT=3000
```

### 3.3 Generar JWT Secret Seguro

```bash
openssl rand -base64 32
# Copia el resultado en JWT_SECRET
```

### 3.4 Proteger el Archivo

```bash
chmod 600 .env.production
chown predia:predia .env.production
```

---

## Paso 4: Deployment de la Aplicación

### 4.1 Ejecutar Script de Deployment

```bash
cd /tmp/predia  # o donde estén tus scripts
sudo chmod +x scripts/deploy-app.sh

# Ejecutar deployment
sudo REPO_URL="https://github.com/tu-usuario/predia.git" \
     BRANCH="main" \
     ./scripts/deploy-app.sh
```

### 4.2 ¿Qué hace este script?

El script ejecuta **automáticamente** todo el proceso de deployment:

```mermaid
graph TD
    A[Clone/Pull Git] --> B[npm ci]
    B --> C[prisma generate]
    C --> D[prisma migrate deploy]
    D --> E[npm run build]
    E --> F[PM2 start/reload]
    F --> G[✅ App Running]
```

1. **Clona o actualiza** el repositorio
2. **Instala dependencias** (`npm ci`)
3. **Genera Prisma Client** - Crea los modelos TypeScript desde `schema.prisma`
4. **Ejecuta migraciones** - Crea/actualiza tablas en MySQL automáticamente
5. **Build de producción** - Compila Next.js
6. **Inicia con PM2** - Gestión de procesos con auto-restart

**⏱️ Tiempo estimado:** 5-15 minutos (dependiendo de tu conexión)

### 4.3 Ejecutar Seed (Opcional)

Si quieres poblar la base de datos con datos iniciales:

```bash
cd /var/www/predia
RUN_SEED=true sudo -E ./scripts/deploy-app.sh
```

---

## Paso 5: Verificación

### 5.1 Ejecutar Script de Verificación

```bash
sudo chmod +x scripts/deploy-verify.sh
sudo ./scripts/deploy-verify.sh
```

Este script verifica:
- ✅ MySQL está corriendo
- ✅ Conexión a base de datos
- ✅ Todas las tablas existen
- ✅ PM2 tiene la app corriendo
- ✅ La app responde en el puerto 3000
- ✅ Firewall configurado
- ✅ Espacio en disco

### 5.2 Verificar Manualmente

```bash
# Ver estado de PM2
pm2 status

# Ver logs en tiempo real
pm2 logs predia-app

# Verificar que la app responde
curl http://localhost:3000

# Ver tablas en la base de datos
mysql -u predia_user -p -e "USE predia_db; SHOW TABLES;"
```

### 5.3 Acceder desde el Navegador

Abre tu navegador y visita:
```
http://tu-ip-publica:3000
```

> **🔒 Importante:** Si no puedes acceder, verifica que el puerto 3000 esté abierto en el firewall de AWS:
> - Ve a AWS Console → EC2 → Security Groups
> - Agrega una regla para permitir puerto 3000 (TCP)

---

## 🛠️ Comandos de Mantenimiento

### PM2 (Gestión de Procesos)

```bash
# Ver estado de todas las apps
pm2 status

# Ver logs en tiempo real
pm2 logs predia-app

# Reiniciar la app
pm2 restart predia-app

# Detener la app
pm2 stop predia-app

# Iniciar la app
pm2 start predia-app

# Recargar sin downtime
pm2 reload predia-app

# Ver monitoreo en tiempo real
pm2 monit

# Ver información detallada
pm2 show predia-app

# Guardar configuración de PM2
pm2 save
```

### Prisma (Base de Datos)

```bash
cd /var/www/predia

# Ver estado de migraciones
npx prisma migrate status

# Ejecutar migraciones pendientes (equivalente a php artisan migrate)
npx prisma migrate deploy

# Regenerar Prisma Client
npx prisma generate

# Ver datos en Prisma Studio (interfaz visual)
npx prisma studio
# Acceder en: http://tu-ip:5555

# Ejecutar seed
npm run db:seed

# Reset completo de BD (¡CUIDADO! Borra todos los datos)
npx prisma migrate reset --force
```

### MySQL

```bash
# Conectarse a MySQL
mysql -u predia_user -p

# Ver bases de datos
mysql -u predia_user -p -e "SHOW DATABASES;"

# Ver tablas
mysql -u predia_user -p -e "USE predia_db; SHOW TABLES;"

# Backup de base de datos
mysqldump -u predia_user -p predia_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u predia_user -p predia_db < backup_20231115.sql
```

### Git (Actualizaciones)

```bash
cd /var/www/predia

# Ver estado
git status

# Actualizar a última versión
git pull origin main

# Después de actualizar código, re-deployar
sudo ./scripts/deploy-app.sh
```

### Logs

```bash
# Logs de la aplicación
pm2 logs predia-app

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log

# Logs del sistema
sudo journalctl -u mysql -f
```

---

## 🔧 Troubleshooting

### Problema: La app no inicia

**Síntoma:** PM2 muestra estado "errored"

```bash
# Ver logs de error
pm2 logs predia-app --err

# Posibles causas:
# 1. DATABASE_URL mal configurada
grep DATABASE_URL /var/www/predia/.env.production

# 2. Puerto 3000 ya en uso
sudo lsof -i :3000
sudo kill -9 <PID>

# 3. Permisos incorrectos
sudo chown -R predia:predia /var/www/predia
```

### Problema: No se puede conectar a la base de datos

```bash
# Verificar que MySQL está corriendo
sudo systemctl status mysql

# Reiniciar MySQL
sudo systemctl restart mysql

# Verificar usuario y permisos
mysql -u root -p -e "SELECT User, Host FROM mysql.user WHERE User='predia_user';"

# Probar conexión
mysql -u predia_user -p -h localhost predia_db
```

### Problema: Las migraciones fallan

```bash
# Ver estado de migraciones
cd /var/www/predia
npx prisma migrate status

# Ver log detallado
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Si hay migraciones failed, puedes marcarlas como resueltas
npx prisma migrate resolve --applied "nombre_de_migracion"
```

### Problema: Puerto 3000 no accesible desde fuera

**En el servidor:**
```bash
# Verificar que UFW permite el puerto
sudo ufw status

# Agregar regla si no existe
sudo ufw allow 3000/tcp
```

**En AWS Console:**
1. Ve a EC2 → Instances → Tu instancia
2. Click en la pestaña "Security"
3. Click en el Security Group
4. "Inbound rules" → "Edit inbound rules"
5. "Add rule": Custom TCP, Port 3000, Source: 0.0.0.0/0

### Problema: La app se queda sin memoria

```bash
# Ver uso de memoria
free -h
pm2 monit

# Aumentar límite de memoria en PM2
# Editar ecosystem.config.js:
max_memory_restart: '2G'  # Aumentar a 2GB

# Reiniciar
pm2 reload predia-app
```

### Problema: Build de Next.js falla

```bash
# Limpiar cache y rebuilder
cd /var/www/predia
rm -rf .next
npm run build

# Si falla por falta de memoria, aumentar swap
sudo fallocate -l 4G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
```

---

## 🔄 Updates y Re-deployments

Para actualizar tu app después de hacer cambios:

```bash
# Método 1: Re-ejecutar el script de deployment
cd /tmp/predia
sudo REPO_URL="https://github.com/tu-usuario/predia.git" ./scripts/deploy-app.sh

# Método 2: Manual
cd /var/www/predia
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy  # Aplica nuevas migraciones
npm run build
pm2 reload predia-app
```

---

## 🔐 Configuración HTTPS (Opcional pero Recomendado)

### Usando Nginx + Let's Encrypt

```bash
# 1. Instalar Nginx y Certbot (si no lo hiciste en deploy-server-setup.sh)
sudo apt install nginx certbot python3-certbot-nginx -y

# 2. Configurar Nginx como reverse proxy
sudo nano /etc/nginx/sites-available/predia

# Pega esta configuración:
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 3. Activar configuración
sudo ln -s /etc/nginx/sites-available/predia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 4. Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# 5. Certbot configurará automáticamente HTTPS
```

---

## 📚 Recursos Adicionales

- [Documentación de Prisma](https://www.prisma.io/docs)
- [Documentación de PM2](https://pm2.keymetrics.io/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Guía de Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

## ✅ Checklist de Deployment

- [ ] VPS creado y accesible vía SSH
- [ ] Script `deploy-server-setup.sh` ejecutado
- [ ] MySQL configurado con `deploy-db-setup.sh`
- [ ] Archivo `.env.production` creado y configurado
- [ ] DATABASE_URL correctamente configurado
- [ ] JWT_SECRET generado (seguro, 32+ caracteres)
- [ ] Repositorio Git clonado en `/var/www/predia`
- [ ] Script `deploy-app.sh` ejecutado exitosamente
- [ ] Migraciones de Prisma aplicadas
- [ ] PM2 muestra la app como "online"
- [ ] App accesible desde navegador
- [ ] Firewall configurado (puertos 22, 80, 443, 3000)
- [ ] Security Group de AWS configurado
- [ ] (Opcional) HTTPS configurado con Let's Encrypt
- [ ] (Opcional) Dominio apuntando al servidor

---

**🎉 ¡Felicitaciones! Tu aplicación PREDIA está deployada y corriendo en producción.**

Para soporte adicional, revisa los logs con `pm2 logs predia-app` o consulta la sección de [Troubleshooting](#troubleshooting).
