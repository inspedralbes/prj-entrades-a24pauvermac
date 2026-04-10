# Extrapolación del Sistema de Autenticación a Laravel

Este documento analiza cómo adaptar el sistema de autenticación descrito en `inicio-sesion.md` (basado en Node.js/Express con JWT) al proyecto Laravel actual, respetando su arquitectura y convenciones.

## Análisis del Sistema Actual en Laravel

Laravel incluye un sistema de autenticación robusto basado en sesiones y proporciona herramientas como:
- Auth scaffolding (via Laravel/UI o Breeze/Jetstream)
- Protección de rutas mediante middleware
- Sistema de providers y guards configurables
- Hasheado de contraseñas con bcrypt por defecto
- Sistema de reset de passwords
- Remember me functionality

## Adaptación del Sistema JWT a Laravel

Para implementar un sistema similar al descrito (JWT con access/refresh tokens) en Laravel, necesitamos:

### 1. Dependencias Necesarias

Laravel ya incluye varios componentes necesarios, pero requerimos paquetes adicionales:

```bash
# Para JWT
composer require tymon/jwt-auth

# Para refresh tokens (opcional, podemos implementarlo nosotros)
composer require doctrine/dbal
```

### 2. Configuración de Variables de Entorno

Agregar al archivo `.env`:
```
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
JWT_REFRESH_SECRET=tu_clave_de_refresh_muy_secreta_aqui
JWT_ACCESS_TOKEN_EXPIRY=3600   # 1 hora
JWT_REFRESH_TOKEN_EXPIRY=604800 # 7 días
```

### 3. Modificaciones al Modelo User

Actualizar `app/Models/User.php` para trabajar con JWT:
```php
<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;

    // ... código existente ...

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be set in the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [];
    }
}
```

### 4. Configuración de JWT Auth

Publicar la configuración:
```bash
php artisan vendor:publish --provider="Tymon\JWTAuth\Providers\LaravelServiceProvider"
```

Luego modificar `config/jwt.php`:
```php
'secret' => env('JWT_SECRET', 'your-secret-key'),
'keys' => [
    'public' => env('JWT_PUBLIC_KEY'),
    'private' => env('JWT_PRIVATE_KEY'),
],
'ttl' => env('JWT_TTL', 60), // Tiempo de vida del token en minutos
'refresh_ttl' => env('JWT_REFRESH_TTL', 20160), // Tiempo de vida del refresh token
'algo' => env('JWT_ALGO', 'HS256'),
'required_claims' => ['iss', 'iat', 'exp', 'nbf', 'sub', 'jti'],
'persistent_claims' => [],
'lock_subject' => true,
'blocklist_model' => null,
'providers' => [
    'jwt' => Tymon\JWTAuth\Providers\Jwt\Namshi::class,
    'auth' => Tymon\JWTAuth\Providers\Auth\Eloquent::class,
],
```

### 5. Creación de Controladores de Autenticación

Crear un controlador para manejar los endpoints de autenticación:
```bash
php artisan make:controller Api/AuthController
```

Implementar los métodos necesarios en `app/Http/Controllers/Api/AuthController.php`:
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;

class AuthController extends Controller
{
    /**
     * Registrar un nuevo usuario
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            // Otros campos según necesites (rol, autoritzat, etc.)
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            // Establecer otros campos según tu esquema
        ]);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => JWTAuth::factory()->getTTL() * 60
        ], 201);
    }

    /**
     * Obtener token mediante credenciales
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $credentials = $request->only('email', 'password');

        if (!$token = JWTAuth::attempt($credentials)) {
            return response()->json(['error' => 'Credenciales inválidas'], 401);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Renovar access token usando refresh token
     */
    public function refresh()
    {
        try {
            $newToken = JWTAuth::refresh(JWTAuth::getToken());
            return $this->respondWithToken($newToken);
        } catch (TokenExpiredException $e) {
            return response()->json(['error' => 'Token expirado'], 401);
        } catch (TokenInvalidException $e) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Error al renovar token'], 500);
        }
    }

    /**
     * Obtener datos del usuario autenticado
     */
    public function me()
    {
        return response()->json(JWTAuth::user());
    }

    /**
     * Cerrar sesión (invalidar token)
     */
    public function logout()
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
            return response()->json(['message' => 'Sesión cerrada exitosamente']);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Error al cerrar sesión'], 500);
        }
    }

    /**
     * Obtener el token y su tipo
     */
    protected function respondWithToken($token)
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => JWTAuth::factory()->getTTL() * 60
        ]);
    }
}
```

### 6. Definir las Rutas API

Modificar `routes/api.php` para incluir los endpoints de autenticación:
```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// Rutas públicas de autenticación
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/refresh', [AuthController::class, 'refresh']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:api');

// Rutas existentes (mantener las actuales)
Route::get('/movies', [MovieController::class, 'index']);
Route::get('/movies/search', [MovieController::class, 'search']);
Route::get('/movies/{id}', [MovieController::class, 'show']);
Route::get('/movies/{id}/screenings', [MovieController::class, 'getScreeningsByMovie']);
Route::post('/create-payment-intent', [PaymentController::class, 'createPaymentIntent']);

// Rutas de Administrador
Route::prefix('admin')->group(function () {
    Route::get('/stats', [AdminController::class, 'getGlobalStats']);
    Route::get('/options', [AdminController::class, 'getCreationOptions']);
    Route::get('/screenings', [AdminController::class, 'getActiveScreenings']);
    Route::post('/screenings', [AdminController::class, 'storeScreening']);
});
```

### 7. Configurar el Guard de API para JWT

Modificar `config/auth.php` para usar JWT como guard de API:
```php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],
    'api' => [
        'driver' => 'jwt',
        'provider' => 'users',
        'hash' => false,
    ],
],
```

### 8. Middleware para Protección de Rutas

Laravel ya incluye middleware de autenticación. Para proteger rutas, usar:
```php
Route::middleware(['auth:api'])->group(function () {
    // Rutas protegidas aquí
});
```

### 9. Consideraciones para el Frontend (Nuxt.js)

Para que el frontend funcione con este nuevo backend:

#### Almacenamiento de Tokens
- Access token: localStorage o cookies
- Refresh token: HTTP-only cookies (más seguro) o localStorage

#### Flujo de Autenticación
1. Login: POST a `/api/login` con email y password
2. Al recibir respuesta: guardar access_token y refresh_token
3. Para requests protegidas: incluir Authorization: Bearer {access_token}
4. Cuando access token expira: usar refresh token para obtener nuevo access token
5. Logout: POST a `/api/logout` para invalidar tokens

### 10. Esquema de Base de Datos Requerido

La tabla de usuarios de Laravel ya incluye la mayoría de los campos necesarios:
- id (PK)
- name (en lugar de nom)
- email (único)
- password (hash)
- remember_token (Laravel ya lo incluye)

Para adaptar exactamente al esquema del documento:
- Añadir columna `rol` si no existe
- Añadir columna `autoritzat` (boolean) si no existe
- Añadir columna `institucio_id` (FK) si es necesario
- Para refresh tokens: JWT Auth maneja esto internamente o podemos crear una tabla separada

### 11. Buenas Prácticas de Seguridad Implementadas

1. **Hasheado de contraseñas**: Laravel usa bcrypt por defecto
2. **Variables de entorno**: Configuración sensible en `.env`
3. **Middleware de protección**: Rutas protegidas con `auth:api`
4. **Expiración diferenciada**: Access tokens cortos, refresh tokens largos
5. **Validación de entrada**: En los controladores con `$request->validate()`
6. **Separación de responsabilidades**: Controladores distintos para auth vs otras funcionalidades
7. **Manejo de errores**: Respuestas apropiadas sin filtrar información sensible

### 12. Pasos para Implementar

1. Instalar dependencias: `composer require tymon/jwt-auth`
2. Publicar configuración: `php artisan vendor:publish --provider="Tymon\JWTAuth\Providers\LaravelServiceProvider"`
3. Generar clave JWT: `php artisan jwt:secret`
4. Actualizar modelo User para implementar JWTSubject
5. Modificar config/auth.php para usar guard jwt en api
6. Crear AuthController con los métodos de autenticación
7. Definir rutas en routes/api.php
8. Probar endpoints con herramientas como Postman o directamente desde el frontend
9. Ajustar el frontend Nuxt.js para consumir estos nuevos endpoints
10. Implementar lógica de refresh de tokens en el frontend si es necesario

## Conclusión

Esta adaptación mantiene la esencia del sistema descrito en `inicio-sesion.md` (JWT con access/refresh tokens, bcrypt para passwords, almacenamiento seguro) pero aprovecha las características nativas de Laravel como su sistema de autenticación flexibles, ORM Eloquent y estructura MVC.

La implementación propuesta respeta la arquitectura actual de Laravel mientras proporciona la funcionalidad de autenticación basada en tokens que era característica del sistema Node.js/Express descrito originalmente.