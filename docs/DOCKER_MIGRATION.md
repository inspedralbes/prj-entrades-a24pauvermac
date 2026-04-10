# Guía de Migración: De Instalación Manual a Docker Compose

## Estado Actual

Actualmente tienes el proyecto desplegado **manualmente** en el servidor:
- Laravel funcionando en puerto 8000
- Node Socket.io funcionando en puerto 3001
- Nuxt funcionando en puerto 3000
- Nginx como proxy reverso
- MySQL y Redis instalados directamente en el servidor

## Objetivo

Migrar a **Docker Compose** usando el archivo `docker-compose.prod.yml` que ya existe en el proyecto.

---

## Pasos a Seguir

### 1. Preparar el Servidor

#### 1.1 Instalar Docker

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar dependencias
apt install -y apt-transport-https ca-certificates curl software-properties-common

# Añadir clave GPG de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Añadir repositorio Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar instalación
docker --version
docker-compose --version
```

#### 1.2 Instalar Docker Compose (si no se instaló en el paso anterior)

```bash
# Descargar docker-compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Dar permisos
chmod +x /usr/local/bin/docker-compose

# Verificar
docker-compose --version
```

---

### 2. Detener Servicios Actuales (Instalación Manual)

Antes de migrar a Docker, detén los servicios que tienes funcionando manualmente:

```bash
# Detener todos los servicios de PM2
pm2 delete all

# Detener MySQL (si lo tienes corriendo como servicio)
systemctl stop mysql

# Detener Redis
systemctl stop redis

# (Opcional) Eliminar PM2 si ya no lo necesitarás
npm uninstall -g pm2
```

---

### 3. Configurar Variables de Entorno

Crea un archivo `.env.prod` en la raíz del proyecto con las variables necesarias:

```env
# Base de datos
DB_DATABASE=tiquet_db
DB_ROOT_PASSWORD=root
DB_USERNAME=tiquet_user
DB_PASSWORD=k7#Gp$2MqL9!xV4@

# Laravel
LARAVEL_API_URL=http://tu-dominio-o-ip:8000

# Node
NODE_SOCKET_URL=http://tu-dominio-o-ip:3000

# Puertos (opcional)
NGINX_PORT=8000
NODE_PORT=3000
NUXT_PORT=3001
```

**Nota:** Ajusta los valores según tu configuración actual.

---

### 4. Configurar Nginx para Docker

El `docker-compose.prod.yml` usa Nginx interno en el contenedor. Necesitas configurar el Nginx del host para dirigir el tráfico a los contenedores.

#### Opción A: Usar Nginx del Host (Recomendado)

Edita tu configuración de Nginx en `/etc/nginx/sites-available/tiquet`:

```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;

    # Frontend Nuxt
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend Laravel API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend Node WebSocket
    location /socket {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Recarga Nginx:
```bash
nginx -t
systemctl reload nginx
```

#### Opción B: Exponer Directamente los Puertos

Si quieres acceder directamente sin Nginx del host:
- Acceder a Laravel: `http://TU_IP:8000`
- Acceder a Node: `http://TU_IP:3000`
- Acceder a Nuxt: `http://TU_IP:3001`

---

### 5. Desplegar con Docker Compose

Ahora puedes levantar los servicios con Docker:

```bash
# Ir a la carpeta del proyecto
cd /var/www/tiquet-master

# (Si no has clonado el repo, clonarlo)
# git clone https://github.com/inspedralbes/prj-entrades-a24pauvermac.git

# Asegurarse de que el archivo .env.prod existe
# (Si no existe, copiar el ejemplo)
cp .env.example .env.prod

# Levantar los contenedores
docker-compose -f docker-compose.prod.yml up -d

# Ver estado de los contenedores
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f laravel-app
```

---

### 6. Ejecutar Migraciones y Seeders

Una vez que los contenedores estén corriendo, ejecuta las migraciones:

```bash
# Ejecutar migraciones
docker-compose -f docker-compose.prod.yml exec laravel-app php artisan migrate

# Ejecutar seeders (opcional)
docker-compose -f docker-compose.prod.yml exec laravel-app php artisan db:seed
```

---

### 7. Comandos Útiles de Docker Compose

```bash
# Iniciar servicios
docker-compose -f docker-compose.prod.yml start

# Detener servicios
docker-compose -f docker-compose.prod.yml stop

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Ver estado
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f nginx

# Rebuild de un servicio
docker-compose -f docker-compose.prod.yml up -d --build laravel-app

# Eliminar contenedores (sin eliminar volúmenes)
docker-compose -f docker-compose.prod.yml down

# Eliminar todo (incluyendo volúmenes - ⚠️ CUIDADO)
docker-compose -f docker-compose.prod.yml down -v
```

---

## Estructura de Puertos Final

| Servicio | Puerto Interno | Puerto Externo |
|----------|---------------|----------------|
| MySQL | 3306 | (solo interno) |
| Redis | 6379 | (solo interno) |
| Laravel (Nginx) | 80 | 8000 |
| Node Socket.io | 3000 | 3000 |
| Nuxt | 3000 | 3001 |

---

## Ventajas de Usar Docker Compose

1. **Aislamiento**: Cada servicio funciona en su propio contenedor
2. **Facilidad de gestión**: Un solo comando para iniciar/detener todo
3. **Escalabilidad**: Fácil de replicar o mover a otro servidor
4. **Consistencia**: Funciona igual en desarrollo y producción
5. **Limpieza**: No ensucia el sistema host con instalaciones directas

---

## Mantenimiento

### Actualizar el Proyecto

```bash
cd /var/www/tiquet-master

# Hacer pull de los cambios
git pull origin main

# Rebuild de los contenedores
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backups

Para hacer backup de la base de datos MySQL:
```bash
docker-compose -f docker-compose.prod.yml exec mysql mysqldump -u root -p tiquet_db > backup.sql
```

---

## Resolución de Problemas

### Ver logs de un contenedor específico
```bash
docker-compose -f docker-compose.prod.yml logs -f <nombre_servicio>
```

### Acceder a un contenedor
```bash
docker-compose -f docker-compose.prod.yml exec <nombre_servicio> sh
```

### Ver uso de recursos
```bash
docker stats
```

### Reiniciar un servicio específico
```bash
docker-compose -f docker-compose.prod.yml restart <nombre_servicio>
```

---

## Notas Importantes

1. **Puertos**: Asegúrate de que los puertos 8000, 3000, 3001 estén disponibles
2. **Volúmenes**: Los datos de MySQL y Redis persisten en volúmenes de Docker
3. **SSL**: Para producción, configura SSL con Let's Encrypt después de tener dominio
4. **Fail2Ban**: Mantén fail2ban activo para proteger el SSH

---

## Resumen de Comandos Finales

```bash
# 1. Instalar Docker
apt update && apt install -y docker docker-compose

# 2. Clonar proyecto
cd /var/www
git clone https://github.com/inspedralbes/prj-entrades-a24pauvermac.git tiquet-master
cd tiquet-master

# 3. Crear .env.prod
cp .env.example .env.prod
# Editar con tus valores

# 4. Detener servicios manuales
pm2 delete all

# 5. Levantar Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 6. Ejecutar migraciones
docker-compose -f docker-compose.prod.yml exec laravel-app php artisan migrate
```

---

¿Necesitas más detalles sobre algún paso?