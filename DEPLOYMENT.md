# 🚀 Checklist de Deployment

## Pre-Deployment (Antes de poner en producción)

### 1. Seguridad
- [ ] Cambiar `JWT_SECRET` por una clave fuerte (mín. 32 caracteres)
- [ ] Cambiar contraseña de BD en `DATABASE_PASSWORD`
- [ ] Verificar que no hay hardcoded credentials en código
- [ ] Revisar `.env.local` no está commiteado en git
- [ ] Habilitar HTTPS en producción
- [ ] Configurar CORS correctamente si frontend en dominio diferente
- [ ] Revisar headers de seguridad HTTP

### 2. Base de Datos
- [ ] Backup de datos existentes
- [ ] Verificar conexión a BD de producción
- [ ] Ejecutar todas las migraciones: `pnpm prisma migrate deploy`
- [ ] Verificar que todas las tablas se crearon correctamente
- [ ] Crear índices de BD si es necesario
- [ ] Configurar backups automáticos

### 3. Aplicación
- [ ] Ejecutar build: `pnpm build`
- [ ] Verificar que NO hay errores en build
- [ ] Revisar bundled size es razonable
- [ ] Verificar todas las dependencias están en `package.json`
- [ ] Actualizar variables de entorno para producción
- [ ] Revisar que `NODE_ENV=production`

### 4. Testing
- [ ] Probar todos los endpoints en staging
- [ ] Verificar autenticación funciona
- [ ] Probar predicción ML con datos reales
- [ ] Verificar paginación en listados
- [ ] Probar búsqueda y filtrado
- [ ] Verificar manejo de errores
- [ ] Probar logout y expiración de tokens

### 5. Performance
- [ ] Verificar query count (no excesivas queries)
- [ ] Revisar tiempo de respuesta de endpoints críticos
- [ ] Verificar tamaño de respuestas JSON
- [ ] Considerar caché para dashboard stats
- [ ] Revisar límites de conexión a BD

### 6. Monitoreo
- [ ] Configurar logs (archivo o servicio como DataDog/Sentry)
- [ ] Configurar alertas para errores 5xx
- [ ] Configurar monitoreo de uptime
- [ ] Establecer SLA (Service Level Agreement)

---

## Deployment Steps

### Opción A: Linux Server (Recomendado)

#### 1. Preparar Servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar MySQL (si no está)
sudo apt install -y mysql-server

# Crear usuario para la app
sudo useradd -m -s /bin/bash diabetes-ai
```

#### 2. Clonar Repositorio
```bash
cd /home/diabetes-ai
git clone https://github.com/tu-usuario/diabetes-ai.git
cd diabetes-ai
sudo chown -R diabetes-ai:diabetes-ai .
```

#### 3. Instalar Dependencias
```bash
su - diabetes-ai
cd /home/diabetes-ai/diabetes-ai
pnpm install
```

#### 4. Configurar Entorno
```bash
# Crear .env.local con valores de producción
nano .env.local

# Agregar:
NODE_ENV=production
DATABASE_URL=mysql://predia_app:STRONG_PASSWORD@localhost:3306/predia
JWT_SECRET=VERY_LONG_RANDOM_STRING_32_CHARS_MIN
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=https://api.tudominio.com
```

#### 5. Migraciones de BD
```bash
# Crear base de datos si no existe
mysql -u root -p -e "CREATE DATABASE predia;"
mysql -u root -p -e "CREATE USER 'predia_app'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON predia.* TO 'predia_app'@'localhost';"

# Ejecutar migraciones
pnpm prisma generate
pnpm prisma migrate deploy
```

#### 6. Build de Producción
```bash
pnpm build
```

#### 7. Configurar PM2 (Process Manager)
```bash
# Instalar PM2
npm install -g pm2

# Crear archivo ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'diabetes-ai',
    script: '.next/standalone/server.js',
    exec_mode: 'cluster',
    instances: 'max',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    restart_delay: 4000,
    max_memory_restart: '1G'
  }]
};
EOF

# Crear carpeta de logs
mkdir -p logs

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 8. Configurar Nginx (Reverse Proxy)
```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/diabetes-ai

# Agregar:
server {
    listen 80;
    server_name api.tudominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/diabetes-ai /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

#### 9. Configurar SSL (Let's Encrypt)
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generar certificado
sudo certbot --nginx -d api.tudominio.com

# Auto-renovar
sudo systemctl enable certbot.timer
```

#### 10. Verificar Deployment
```bash
# Ver estado de la app
pm2 status

# Ver logs
pm2 logs diabetes-ai

# Ver procesos
pm2 list

# Monitorear en vivo
pm2 monit
```

---

### Opción B: Heroku (Fácil, Pago)

#### 1. Instalar Heroku CLI
```bash
npm install -g heroku
heroku login
```

#### 2. Crear app
```bash
heroku create diabetes-ai-api
```

#### 3. Agregar Add-ons
```bash
# Base de datos MySQL
heroku addons:create cleardb:ignite -a diabetes-ai-api

# Obtener URL
heroku config -a diabetes-ai-api | grep CLEARDB_DATABASE_URL
```

#### 4. Configurar variables
```bash
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET=very-long-random-string \
  NEXT_PUBLIC_API_URL=https://diabetes-ai-api.herokuapp.com/api
```

#### 5. Deploy
```bash
git push heroku main
```

#### 6. Ver logs
```bash
heroku logs --tail
```

---

### Opción C: Docker (Contenedores)

#### 1. Build imagen
```bash
docker build -t diabetes-ai:1.0.0 .
```

#### 2. Crear contenedor
```bash
docker run -d \
  --name diabetes-ai \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=mysql://... \
  -e JWT_SECRET=... \
  diabetes-ai:1.0.0
```

#### 3. Docker Compose (Recomendado)
```bash
# Crear docker-compose.yml con BD incluida
docker-compose up -d
```

---

### Opción D: AWS (Escalable)

#### 1. EC2 (similar a Linux Server)
- Crear instancia Ubuntu
- Seguir pasos de "Opción A: Linux Server"

#### 2. RDS (Base de Datos Administrada)
- Crear MySQL 8.0 instance
- Configurar security groups
- Usar endpoint como DATABASE_URL

#### 3. Elastic Beanstalk (PaaS)
```bash
# Instalar EB CLI
pip install awsebcli

# Inicializar
eb init -p node.js-20 diabetes-ai

# Deploy
eb create production
eb deploy
```

---

## Post-Deployment

### 1. Verificaciones
```bash
# Probar endpoint de health
curl https://api.tudominio.com/api/auth/me

# Probar login
curl -X POST https://api.tudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"medico","password":"password"}'

# Verificar BD
pnpm prisma studio
```

### 2. Monitoreo Continuo
```bash
# Ver estado de procesos
pm2 status

# Ver uso de memoria
pm2 monit

# Ver logs de errores
pm2 logs diabetes-ai --err
```

### 3. Backups Automáticos
```bash
# Script de backup (backup.sh)
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mysqldump -u predia_app -p$DB_PASSWORD predia | gzip > /backups/predia_$TIMESTAMP.sql.gz

# Agregar a crontab (cada día a las 2 AM)
0 2 * * * /home/diabetes-ai/backup.sh
```

### 4. Actualizaciones
```bash
# Cuando hay nuevas versiones
cd /home/diabetes-ai/diabetes-ai
git pull origin main
pnpm install
pnpm prisma migrate deploy
pnpm build
pm2 restart diabetes-ai
```

---

## Troubleshooting Post-Deployment

### Problema: "502 Bad Gateway" desde Nginx
```bash
# Verificar que app está corriendo
pm2 status

# Verificar logs
pm2 logs diabetes-ai

# Reiniciar
pm2 restart diabetes-ai
```

### Problema: "Database connection refused"
```bash
# Verificar MySQL está running
sudo systemctl status mysql

# Verificar credenciales
mysql -u predia_app -p -h localhost -e "SELECT 1;"

# Verificar DATABASE_URL está correcta
cat .env.local | grep DATABASE_URL
```

### Problema: "Token expired" muy frecuentemente
```bash
# Aumentar expiración en .env
JWT_EXPIRES_IN=30d

# Redeploy
pm2 restart diabetes-ai
```

### Problema: Lentitud en predicciones
```bash
# Ver queries lentas en logs
pnpm prisma studio

# Agregar índices en schema
model Prediccion {
  @@index([id_paciente])
  @@index([fecha_prediccion])
}

# Redeploy
pnpm prisma migrate deploy
```

---

## Monitoreo Recomendado

### Métricas a Vigilar
- [ ] Uptime de la app (objetivo: 99.9%)
- [ ] Errores 5xx (objetivo: <1%)
- [ ] Latencia de respuesta (objetivo: <500ms)
- [ ] Uso de CPU (alerta si >80%)
- [ ] Uso de memoria (alerta si >90%)
- [ ] Errores de BD (alerta si >0)
- [ ] Conexiones activas
- [ ] Almacenamiento en disco

### Herramientas Recomendadas
- **Datadog** - APM completo
- **New Relic** - Monitoreo de performance
- **Sentry** - Error tracking
- **UptimeRobot** - Health checks
- **Grafana** - Dashboards
- **Prometheus** - Métricas

### Alertas Críticas
```
- 502/503 errors
- High CPU/Memory
- DB connection errors
- API response time >5s
- Disk space <10%
```

---

## Rollback (Si algo sale mal)

```bash
# Revertir código a versión anterior
git revert HEAD
git push origin main

# Revertir BD a backup
mysql -u predia_app -p predia < /backups/predia_20251121.sql.gz

# Reiniciar procesos
pm2 restart diabetes-ai
```

---

## Checklist Final

- [ ] App está en producción y accesible
- [ ] SSL/HTTPS configurado
- [ ] Backups automáticos corriendo
- [ ] Monitoreo y alertas activos
- [ ] Logs siendo capturados
- [ ] Equipo notificado y training completado
- [ ] Documentación de runbooks actualizada
- [ ] Plan de incident response listo
- [ ] Métricas baseline registradas

---

**¡Deployment completado! 🎉**

**Próximos pasos:** Monitorear métricas, recopilar feedback de usuarios, y planear iteraciones.
