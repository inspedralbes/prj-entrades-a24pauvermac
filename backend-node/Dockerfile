# --- STAGE 1: BASE (Dependencias comunes) ---
FROM node:20-alpine AS base

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# --- STAGE 2: DEVELOPMENT (Entorno de desarrollo) ---
FROM base AS development
# En desarrollo usaremos volúmenes, instalamos todas las dependencias (incluida nodemon si está en dev)
RUN npm install
# No copiamos el código aquí si usamos Docker Compose con volúmenes montados
CMD ["npm", "run", "dev"]

# --- STAGE 3: PRODUCTION (Imagen final optimizada) ---
FROM base AS production
# En producción solo instalamos dependencias de producción
RUN npm install --only=production
# Copiamos el código final a la imagen
COPY . .
# En producción corremos el script de inicio normal
CMD ["npm", "start"]
