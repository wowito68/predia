module.exports = {
    apps: [
        {
            // Nombre de la aplicación en PM2
            name: 'predia-app',

            // Script a ejecutar (npm start ejecuta next start)
            script: 'npm',
            args: 'start',

            // Directorio de trabajo
            cwd: '/var/www/predia',

            // Número de instancias (1 para empezar, aumenta según necesites)
            // 'max' usa todos los CPUs disponibles
            instances: 1,

            // Modo de ejecución: 'cluster' o 'fork'
            // cluster permite múltiples instancias con load balancing
            exec_mode: 'fork',

            // Auto-restart en caso de crash
            autorestart: true,

            // No vigilar cambios de archivos (false en producción)
            watch: false,

            // Reiniciar si el uso de memoria supera 1GB
            max_memory_restart: '1G',

            // Variables de entorno
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },

            // Configuración de logs
            error_file: '/var/www/predia/logs/err.log',
            out_file: '/var/www/predia/logs/out.log',
            log_file: '/var/www/predia/logs/combined.log',

            // Agregar timestamp a los logs
            time: true,

            // Delay entre reinicios en caso de crash (en ms)
            restart_delay: 4000,

            // Intentos máximos de reinicio en caso de crash continuo
            max_restarts: 10,

            // Ventana de tiempo para los intentos de reinicio (en ms)
            min_uptime: 10000,

            // Configuración avanzada de logs
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

            // Variables para modo cluster (si cambias a cluster mode)
            // listen_timeout: 10000,
            // kill_timeout: 5000,
        }
    ],

    // Configuración de deployment (opcional)
    deploy: {
        production: {
            user: 'predia',
            host: 'TU_IP_DEL_SERVIDOR',
            ref: 'origin/main',
            repo: 'TU_REPOSITORIO_GIT',
            path: '/var/www/predia',

            // Comandos post-deployment
            'post-deploy': 'npm ci && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 reload ecosystem.config.js --env production',

            // Variables de entorno
            env: {
                NODE_ENV: 'production'
            }
        }
    }
};
