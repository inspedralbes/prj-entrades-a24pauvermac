# Sistema de Autenticación y Login - Documentación Técnica

Este documento describe todos los componentes involucrados en el sistema de inicio de sesión del proyecto, con el objetivo de facilitar su recreación en otros proyectos.

## Resumen General

El sistema de autenticación implementa un enfoque basado en JWT (JSON Web Tokens) con tokens de acceso y refresh tokens para una mayor seguridad. Utiliza bcrypt para el hash de contraseñas y sigue las mejores prácticas de seguridad.

## Componentes del Sistema de Login

### 1. Backend (Node.js/Express)

#### 1.1 Funciones de Autenticación (`back/functions/auth.js`)
Archivo central que contiene todas las funciones criptográficas y de manejo de tokens:

- `hashPassword(password)`: Hashea una contraseña usando bcrypt con salt de 10 rondas
- `comparePassword(password, hashedPassword)`: Compara una contraseña con su hash
- `generateTokens(user)`: Genera un par de tokens (access y refresh) basados en los datos del usuario
- `verifyRefreshToken(token)`: Verifica la validez de un refresh token
- `verifyToken(req, res, next)`: Middleware para verificar el token de acceso en las rutas protegidas

#### 1.2 Controladores de Rutas (`back/index.js`)
Endpoints relacionados con autenticación:

- `POST /login`: Endpoint principal para autenticación
  - Valida credenciales (email y password)
  - Verifica que el usuario esté autorizado
  - Genera y devuelve access token y refresh token
  - Almacena el refresh token en la base de datos

- `POST /register`: Registro de nuevos usuarios
  - Hashea la contraseña antes de almacenarla
  - Envía email de confirmación

- `POST /refresh`: Renovación de access token usando refresh token
  - Verifica que el refresh token coincida con el almacenado en BD
  - Genera nuevo access token

- `POST /logout`: Cierre de sesión
  - Elimina el refresh token almacenado en BD

#### 1.3 Funciones de Base de Datos Utilizadas
Varias funciones de CRUD interactúan con el sistema de auth:

- `getUsuariByEmail(email, includePassword)`: Obtiene usuario por email (incluye password si es necesario)
- `getUsuariForAuth(userId)`: Obtiene usuario para autenticación (incluye token)
- `updateUsuariToken(userId, refreshToken)`: Actualiza/elimina el refresh token del usuario
- `getUserId(email)`: Obtiene el ID de usuario por email (usado en emails)

#### 1.4 Variables de Entorno Requeridas
- `JWT_SECRET`: Clave secreta para firmar access tokens
- `JWT_REFRESH_SECRET`: Clave secreta para firmar refresh tokens
- `PORT`: Puerto donde corre el servidor

### 2. Frontend (Nuxt.js/Vue)

#### 2.1 Middleware de Autenticación (`front/app/middleware/auth.js`)
Protege rutas que requieren autenticación:
- Verifica la presencia de token en cookies o localStorage
- Redirige a login si no hay token válido
- Permite acceso si el token es válido

#### 2.2 Servicios de Comunicación

##### `front/app/services/communicationManagerLogin.js`
Maneja específicamente las peticiones relacionadas con autenticación:
- `login(email, password)`: Envía credenciales al endpoint `/login`
- `refreshToken(refreshToken, userId)`: Solicita renovación de access token
- `logout(userId)`: Envía petición de cierre de sesión

##### `front/app/services/communicationManagerDatabase.js`
Maneja otras peticiones a la API (requiere token válido):
- Configura automáticamente el header Authorization con el access token
- Incluye lógica para renovar token cuando expira

#### 2.3 Almacenamiento de Tokens
El frontend maneja los tokens de la siguiente manera:
- Access token: almacenado en memoria (variable JavaScript) o localStorage
- Refresh token: almacenado en cookies HTTP-only (más seguro) o localStorage
- Se implementa renovación automática de tokens antes de que expiren

#### 2.4 Páginas de Autenticación
- `front/app/pages/index.vue`: Contiene el formulario de login
  - Campos: email y password
  - Maneja envío de credenciales y manejo de errores
  - Redirige a la página principal tras login exitoso

### 3. Flujo de Autenticación

#### 3.1 Proceso de Login
1. Usuario ingresa email y password en el formulario de login
2. Frontend envía petición POST a `/login` con las credenciales
3. Backend verifica existencia del usuario y que esté autorizado
4. Backend compara password hasheada con la proporcionada
5. Si es válida, genera access token (1h) y refresh token (7d)
6. Backend almacena refresh token en BD asociado al usuario
7. Frontend recibe y almacena ambos tokens
8. Frontend redirige a la página protegida

#### 3.2 Uso de Rutas Protegidas
1. Frontend incluye access token en header Authorization de cada petición
2. Middleware `verifyToken` valida el token en cada ruta protegida
3. Si token es válido, se adjunta `req.user` con datos del usuario
4. Si token expiró o es inválido, se retorna error 401/403

#### 3.3 Renovación de Token (Refresh)
1. Cuando access token está próximo a expirar o ha expirado
2. Frontend envía refresh token y userId a endpoint `/refresh`
3. Backend verifica que refresh token coincida con el almacenado en BD
4. Si es válido, genera nuevo access token
5. Frontend reemplaza el access token antiguo con el nuevo

#### 3.4 Cierre de Sesión
1. Frontend envía userId a endpoint `/logout`
2. Backend elimina (establece a null) el refresh token en BD
3. Frontend elimina tokens almacenados
4. Usuario es redirigido a página de login

## Requisitos para Recrear el Sistema

### Dependencias Necesarias
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```

### Configuración de Variables de Entorno
```
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
JWT_REFRESH_SECRET=tu_clave_de_refresh_muy_secreta_aqui
PORT=3000
```

### Consideraciones de Seguridad
1. Siempre usar HTTPS en producción
2. Almacenar refresh tokens en BD con expiración
3. Implementar rate limiting en endpoints de auth
4. Usar cookies HTTP-only para refresh tokens cuando sea posible
5. Implementar CSP y otros headers de seguridad
6. Rotar claves secretas periódicamente
7. Implementar bloqueo temporal tras múltiples intentos fallidos

## Esquema de Base de Datos Requerido
La tabla de usuarios debe incluir al menos:
- id (PK)
- nom (nombre)
- email (único)
- password (hash)
- rol
- autoritzat (boolean)
- token (para almacenar refresh token)
- institucio_id (FK)

## Buenas Prácticas Implementadas
1. Separación de responsabilidades (auth functions vs route handlers)
2. Manejo adecuado de errores sin filtrar información sensible
3. Uso de middleware para protección de rutas
4. Almacenamiento seguro de refresh tokens en BD
5. Expiración diferenciada de access vs refresh tokens
6. Validación de entrada en todos los endpoints
7. Uso de variables de entorno para configuración sensible