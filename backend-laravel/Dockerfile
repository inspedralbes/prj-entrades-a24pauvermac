# --- STAGE 1: BASE (Dependencias comunes) ---
FROM php:8.4-fpm-alpine AS base

# Instalación de extensiones necesarias
RUN apk add --no-cache \
    git \
    unzip \
    zip \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    mariadb-dev \
    oniguruma-dev \
    linux-headers

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_mysql mbstring exif gd zip bcmath pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# --- STAGE 2: DEVELOPMENT (Entorno de desarrollo) ---
FROM base AS development

# Copiamos el código y las dependencias para que 'artisan' exista al arrancar.
# El volumen de docker-compose sobreescribirá estos archivos en runtime (hot-reload).
COPY . .
RUN composer install --no-interaction --prefer-dist --no-progress

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

# --- STAGE 3: PRODUCTION (Imagen final optimizada) ---
FROM base AS production

# Copiar el código al contenedor
COPY . .

# Instalar dependencias de producción (sin dev) y optimizar el autoload
RUN composer install --no-interaction --no-dev --optimize-autoloader

# Limpiar caché de dependencias
RUN rm -rf /root/.composer

# Configurar permisos para los directorios de Laravel
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 777 storage bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]