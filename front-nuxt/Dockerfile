# --- STAGE 1: BASE ---
FROM node:20-alpine AS base

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# --- STAGE 2: DEVELOPMENT ---
FROM base AS development
# Instalar todas las dependencias incluyendo devDependencies
RUN npm install
# En desarrollo se corre 'npm run dev' con volúmenes montados
CMD ["npm", "run", "dev"]

# --- STAGE 3: PRODUCTION ---
FROM base AS production
# Instalar todas las dependencias temporalmente para construir el sitio
RUN npm install
# Copiar el código fuente
COPY . .
# Construir la aplicación para producción
RUN npm run build

# Opcional: Podrías usar otra etapa para una imagen final limpia que solo contenga .output
# Nuxt genera su salida en la carpeta .output
CMD ["node", ".output/server/index.mjs"]
