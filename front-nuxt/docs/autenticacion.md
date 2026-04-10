# Sistema de Autenticación - Documentación Técnica

## Índice

1. [Arquitectura General](#arquitectura-general)
2. [Flujo de Inicio de Sesión](#flujo-de-inicio-de-sesión)
3. [Flujo de Cierre de Sesión](#flujo-de-cierre-de-sesión)
4. [Persistencia de Sesión](#persistencia-de-sesión)
5. [Restauración de Sesión (Hydrate)](#restauración-de-sesión-hydrate)
6. [Protección de Rutas](#protección-de-rutas)
7. [UI del Navbar - Dropdown de Usuario](#ui-del-navbar---dropdown-de-usuario)
8. [Redirección Inteligente Post-Login](#redirección-inteligente-post-login)
9. [Diagrama de Flujo](#diagrama-de-flujo)

---

## Arquitectura General

El sistema de autenticación está construido con un stack tecnológico moderno que permite gestionar la sesión del usuario de manera eficiente y segura. A continuación se detallan los componentes principales y cómo interactúan entre sí.

### Tecnologías Utilizadas

**Pinia** es el gestor de estado oficial para Vue 3 y es el reemplazo moderno de Vuex. En este proyecto, Pinia se utiliza para crear un store de autenticación que mantiene el estado reactivo del usuario en toda la aplicación. El store contiene información como el token de acceso y los datos del usuario, permitiendo que cualquier componente de la aplicación pueda acceder a esta información de manera централизованная. La ventaja principal de Pinia es su API simplificada y su soporte nativo para TypeScript, lo que facilita el desarrollo y mantenimiento del código.

**localStorage** es una API del navegador que permite almacenar datos de forma persistente en el cliente. A diferencia de las cookies, localStorage tiene una capacidad mucho mayor (generalmente 5MB) y los datos no se envían automáticamente en cada petición HTTP. En este sistema, localStorage se utiliza para guardar el token JWT del usuario, lo que permite que la sesión persista incluso cuando el usuario cierra el navegador o recarga la página. Sin embargo, es importante destacar que localStorage tiene una vulnerabilidad conocida: es susceptible a ataques XSS (Cross-Site Scripting), por lo que en aplicaciones de alta seguridad se recomienda usar cookies HttpOnly.

**Middleware de Nuxt** es un sistema de拦截 que permite ejecutar código antes de renderizar una página o antes de cambiar de ruta. En este proyecto, el middleware de autenticación se utiliza para proteger rutas que requieren que el usuario esté logueado. El middleware intercepta las peticiones y verifica si el usuario tiene una sesión activa; si no la tiene, lo redirige a la página de login. Esta aproximación proporciona una capa adicional de seguridad a nivel de aplicación.

**API Backend (Laravel)** es el servidor que gestiona toda la lógica de autenticación. Laravel proporciona endpoints REST para login, logout, registro y obtención de datos del usuario. El backend utiliza JWT (JSON Web Tokens) para la autenticación sin estado, lo que significa que cada petición desde el cliente debe incluir el token en el header para ser validada. Laravel genera el token cuando el usuario se identifica correctamente, y este token tiene una validez configurable (generalmente definida en el archivo de configuración del proyecto).

### Flujo de Datos entre Componentes

Cuando un usuario se identifica en la aplicación, el flujo de datos sigue una secuencia específica: el usuario envía sus credenciales desde el frontend (Vue/Nuxt), el backend verifica esas credenciales y devuelve un token JWT si son válidas, el frontend guarda ese token en el store de Pinia y en localStorage, y finalmente cualquier componente que necesite verificar la autenticación puede acceder al store para hacerlo.

### Archivos Clave del Sistema

| Archivo | Ubicación | Función |
|---------|-----------|---------|
| `useAuthStore.ts` | `app/stores/` | Store de Pinia que gestiona el estado de autenticación (token, usuario, métodos) |
| `auth.ts` | `app/middleware/` | Middleware de Nuxt que protege rutas y verifica autenticación |
| `login.vue` | `app/pages/` | Página de inicio de sesión con formulario y lógica de autenticación |
| `register.vue` | `app/pages/` | Página de registro de nuevos usuarios |
| `NavBar.vue` | `app/components/` | Barra de navegación con dropdown de usuario según estado de sesión |
| `CommunicationManager.ts` | `app/utils/` | Gestor de comunicaciones con el backend para operaciones autenticadas |

---

## Flujo de Inicio de Sesión

El proceso de inicio de sesión es uno de los flujos más críticos en cualquier aplicación, ya que establece la identidad del usuario y determina qué recursos puede acceder. Este sistema implementa un flujo robusto que incluye validación de credenciales, generación de token, persistencia de sesión y redirección inteligente.

### Paso 1: El usuario accede a la página de login

Cuando el usuario navega a la URL `/login`, ocurre una serie de eventos en el lado del cliente. En primer lugar, Nuxt carga el componente de la página de login definido en `pages/login.vue`. Durante la ejecución del script setup de este componente, se ejecuta una verificación inicial para determinar si el usuario ya tiene una sesión activa.

Esta verificación se realiza consultando el store de autenticación mediante `authStore.isLoggedIn`. El getter `isLoggedIn` en el store es una propiedad computada que devuelve `true` únicamente si existe un token de acceso almacenado en el estado del store. Es importante entender que en este punto del flujo, el store de Pinia podría estar vacío si acaba de ocurrir una recarga de página, ya que el estado de Pinia no se persiste automáticamente entre recargas.

Si el usuario ya está autenticado (el getter devuelve `true`), el código ejecuta una redirección inmediata utilizando la función `navigateTo` de Nuxt. En este caso, se intenta obtener el parámetro `redirect` de la query string de la URL. Este parámetro representa la URL original que el usuario intentaba visitar antes de ser redirigido a la página de login. Si existe este parámetro, el usuario es enviado de vuelta a esa URL; de lo contrario, se le redirige al首页 (`/`).

El propósito de esta verificación es evitar que un usuario que ya tiene sesión activa pueda acceder a la página de login nuevamente. Si un usuario autenticado intentara acceder a `/login`, sería redirigido automáticamente a la página principal, mejorando la experiencia de usuario y evitando confusión.

### Paso 2: El usuario introduce credenciales

Una vez que el usuario llega a la página de login y se confirma que no tiene una sesión activa, se le presenta un formulario con dos campos: email y contraseña. El diseño del formulario sigue las mejores prácticas de usabilidad, con etiquetas claras, placeholders informativos y validación de HTML5 para el campo de email.

El usuario introduce sus credenciales en los campos correspondientes. El campo de email está configurado para aceptar solo direcciones de correo electrónico válidas (type="email"), y el campo de contraseña está configurado para ocultar los caracteres introducidos (type="password"). Estos datos se almacenan en variables reactivas de Vue (`email` y `password`) utilizando la función `ref`.

Cuando el usuario hace clic en el botón "Acceder", se ejecuta la función `handleLogin()`. Esta función es asíncrona porque realiza una petición de red al backend. Antes de enviar la petición, la función limpia cualquier mensaje de error anterior y establece un indicador de carga (`loading`) a `true`, lo que deshabilita el botón y muestra un texto alternativo ("Entrando...") para indicar al usuario que el proceso está en curso.

### Paso 3: El store realiza la petición al backend

Una vez que el usuario envía el formulario, la función `handleLogin()` llama al método `login()` del store de autenticación. Este método es el responsable de comunicarse con el backend Laravel para validar las credenciales del usuario.

El método `login()` del store utiliza la función `$fetch` de Nuxt (que es un wrapper sobre la API fetch nativa) para realizar una petición HTTP POST al endpoint `/api/login` del backend. El endpoint está configurado en el archivo de configuración de Nuxt (`nuxt.config.ts`) y apunta al servidor Laravel que puede estar funcionando en localhost o en un contenedor Docker.

El cuerpo de la petición incluye las credenciales del usuario en formato JSON:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

El backend Laravel recibe esta petición y ejecuta el método correspondiente en el controlador de autenticación. Este método valida las credenciales contra la base de datos utilizando el modelo de Usuario de Laravel. Si las credenciales son válidas, Laravel genera un token JWT utilizando la librería jwt-auth y devuelve el token en la respuesta.

Si la validación es exitosa, el backend devuelve una respuesta con la siguiente estructura:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

El método `login()` del store recibe esta respuesta y realiza las siguientes operaciones:

1. **Asignación del token al estado del store**: El token recibido se guarda en la propiedad `accessToken` del estado de Pinia. Esta asignación es reactiva, lo que significa que cualquier componente que dependa de esta propiedad se actualizará automáticamente.

2. **Persistencia en localStorage**: Simultáneamente, el token se guarda en localStorage del navegador. Esta persistencia es crucial para mantener la sesión entre recargas de página. El código verifica que se está ejecutando en el cliente (`import.meta.client`) antes de acceder a localStorage, ya que esta API no está disponible durante el renderizado del lado del servidor (SSR).

3. **Obtención de datos del usuario**: Inmediatamente después de guardar el token, el store llama al método `fetchMe()` para obtener los datos completos del usuario. Este paso es necesario porque el endpoint de login solo devuelve el token, no los datos del usuario.

### Paso 4: Obtención de datos del usuario

El método `fetchMe()` realiza una petición GET al endpoint `/api/me` del backend. Este endpoint es una ruta protegida que requiere un token de autenticación válido en el header de la petición. El store añade automáticamente el header de autorización:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

El backend Laravel valida el token y, si es válido, devuelve los datos del usuario logueado. En este proyecto, el endpoint devuelve un objeto con la estructura del modelo de Usuario de Laravel, que típicamente incluye campos como `id`, `name`, `email`, y posiblemente otros datos como `created_at` o roles.

El store asigna estos datos a la propiedad `user` del estado, lo que permite que la interfaz de usuario pueda mostrar información personalizada del usuario, como su nombre en el dropdown del NavBar.

Si por alguna razón la petición al endpoint `/api/me` falla (por ejemplo, si el token ha expirado o es inválido), el método `fetchMe()` captura el error y ejecuta automáticamente el método `logout()` del store para limpiar el estado y redirigir al usuario a la página de login.

### Paso 5: Redirección al destino original

Una vez que el login ha sido exitoso (el método devuelve `{ ok: true }`), la función `handleLogin()` realiza la redirección final. El usuario es enviado a la URL que venía intentando acceder originalmente, que fue almacenada en el parámetro `redirect` de la query string.

Por ejemplo, si el usuario intentó acceder a `/admin` sin estar autenticado, fue redirigido a `/login?redirect=%2Fadmin`. Después de iniciar sesión correctamente, será redirigido de vuelta a `/admin`.

Si no hay un parámetro de redirect en la URL, el usuario es llevado al首页 de la aplicación (`/`). Esta lógica proporciona una experiencia de usuario fluida, ya que no pierde el contexto de dónde estaba intentando ir antes de que se le pidiera iniciar sesión.

---

## Flujo de Cierre de Sesión

El proceso de cierre de sesión es igualmente importante para la seguridad de la aplicación. Este flujo limpia todos los datos de autenticación tanto del cliente como del servidor, asegurando que la sesión no pueda ser reutilizada después de que el usuario decida cerrar sesión.

### Activación del Logout desde el UI

El usuario puede iniciar el proceso de logout haciendo clic en el botón "Logout" que aparece en el dropdown del NavBar cuando hay una sesión activa. Este dropdown solo se muestra cuando el usuario está autenticado, verificado mediante la condición `authStore.isLoggedIn` en el template.

Cuando el usuario hace clic en "Logout", se ejecuta la función `handleLogout()` definida en el componente NavBar. Esta función es asíncrona porque debe esperar a que el store complete el proceso de logout antes de redirigir al usuario.

La función realiza las siguientes operaciones en orden:
1. Llama al método `logout()` del store de autenticación
2. Cierra el dropdown (establece `isDropdownOpen` a `false`)
3. Redirige al usuario al首页 de la aplicación

### Proceso de Logout en el Store

El método `logout()` del store de autenticación es más complejo de lo que podría parecer a simple vista. No solo limpia el estado local, sino que también intenta notificar al backend para invalidar el token del lado del servidor.

El proceso completo incluye los siguientes pasos:

**Notificación al backend**: El store realiza una petición POST al endpoint `/api/logout` del backend Laravel. Esta petición incluye el header de autorización con el token actual. El propósito es notificar al servidor que el usuario ha cerrado sesión para que pueda invalidar el token del lado del servidor, preveniendo su uso futuro. Si esta petición falla (por ejemplo, si el servidor no está disponible), el error se captura silenciosamente con un bloque catch vacío, ya que no es crítico para el funcionamiento del logout en el cliente.

**Limpieza del estado del store**: Independientemente de si la llamada al backend fue exitosa, el store limpia todas las propiedades relacionadas con la autenticación. Esto incluye establecer `accessToken` a `null` y `user` a `null`. Al hacer esto, el getter `isLoggedIn` devolverá `false` y cualquier componente que dependa de estos datos se actualizará automáticamente.

**Eliminación de localStorage**: El store también elimina la clave `access_token` del localStorage del navegador. Esto es esencial para asegurar que la sesión no persista después de cerrar el navegador. Sin esta limpieza, un usuario podría cerrar la sesión en la aplicación pero aún así tener el token guardado en el navegador.

### Redirección Final después del Logout

Después de que el método `logout()` del store ha completado todas las operaciones de limpieza, la función `handleLogout()` en el componente NavBar redirige al usuario al首页 utilizando `router.push('/')`. Esta redirección proporciona una sensación de cierre de sesión completo y lleva al usuario a una página pública que no requiere autenticación.

---

## Persistencia de Sesión

La persistencia de sesión es un aspecto crítico en cualquier aplicación web moderna. Los usuarios esperan poder cerrar el navegador, abrirlo nuevamente y seguir conectados, o al menos no tener que introducir sus credenciales cada vez que recargan la página. Este sistema implementa una estrategia de persistencia basada en localStorage combinada con el proceso de hydrate del store de Pinia.

### Almacenamiento en localStorage

El token JWT recibido del backend se almacena en el localStorage del navegador bajo la clave `access_token`. Este almacenamiento ocurre inmediatamente después de que el backend confirma que las credenciales son válidas, tanto en el flujo de login como en el flujo de registro.

La decisión de usar localStorage en lugar de cookies tiene varias implicaciones:

**Ventajas de localStorage**:
- Mayor capacidad de almacenamiento (generalmente 5MB frente a los 4KB de las cookies)
- Los datos no se envían automáticamente en cada petición HTTP, lo que reduce el ancho de banda
- Los datos persisten incluso después de cerrar y reopen el navegador
- Es más fácil de manipular desde JavaScript para implementar lógicas personalizadas

**Desventajas de localStorage**:
- Vulnerable a ataques XSS (Cross-Site Scripting), ya que cualquier script malicioso puede leer el contenido
- No puede ser utilizado para operaciones que requieran envío automático de cookies
- No proporciona protección contra ataques CSRF (Cross-Site Request Forgery)

### Persistencia del Estado del Store

Es importante entender que Pinia, por defecto, no persiste el estado entre recargas de página. Cuando un usuario recarga la página, todo el estado de la aplicación (incluyendo el store de autenticación) se reinicia. Esto es un comportamiento esperado en aplicaciones universales (SSR) como Nuxt.

Por esta razón, el sistema implementa un mecanismo de doble persistencia:
1. El token se guarda en localStorage (manual)
2. El token se restaura desde localStorage al cargar la página (hydrate)

Sin el paso de hydrate, el usuario tendría que iniciar sesión nuevamente cada vez que recargue la página, lo que proporcionaría una experiencia de usuario muy pobre.

---

## Restauración de Sesión (Hydrate)

El proceso de hydrate es el mecanismo mediante el cual el estado de autenticación se restaura cuando el usuario recarga la página o navega después de un período de inactividad. Este proceso es esencial para proporcionar la experiencia de "sesión persistente" que los usuarios esperan en aplicaciones modernas.

### Concepto de Hydrate en Nuxt/Pinia

En el contexto de Nuxt y Pinia, el término "hydrate" se refiere al proceso de sincronizar el estado del lado del cliente con el estado que podría haber sido generado en el servidor durante el renderizado inicial (SSR). Sin embargo, en el caso del store de autenticación, no hay un estado inicial posible desde el servidor porque el servidor no tiene acceso a las credenciales del usuario.

Por lo tanto, el hydrate en este contexto significa específicamente: "leer el token desde localStorage y restaurar el estado de autenticación en el store de Pinia".

### Implementación del Método hydrate

El método `hydrate()` está definido en el store de autenticación y tiene la siguiente implementación:

```typescript
hydrate() {
  if (import.meta.client) {
    const token = localStorage.getItem('access_token')
    if (token) {
      this.accessToken = token
      this.fetchMe()
    }
  }
}
```

El método comienza verificando si el código se está ejecutando en el cliente (`import.meta.client`). Esta verificación es crucial porque localStorage es una API del navegador y no está disponible en el servidor. Intentar acceder a localStorage durante el SSR causaría un error.

Si estamos en el cliente, el método intenta obtener el token desde localStorage utilizando la clave `access_token`. Si existe un token, lo asigna al estado del store (`this.accessToken = token`) y luego llama a `fetchMe()` para obtener los datos del usuario.

### Cuándo se Ejecuta el Hydrate

El hydrate se ejecuta en dos puntos principales de la aplicación:

**En el NavBar al montar el componente**: El NavBar es un componente global que está presente en todas las páginas de la aplicación (definido en `app.vue`). Se monta cuando la aplicación se carga inicialmente, lo que significa que el hydrate se ejecuta prácticamente al inicio de cada sesión del usuario.

```typescript
// components/NavBar.vue
onMounted(() => {
  authStore.hydrate()
})
```

La función `onMounted` es un lifecycle hook de Vue que se ejecuta después de que el componente ha sido insertado en el DOM. Es el momento ideal para ejecutar código que necesita acceso a APIs del navegador como localStorage.

**En el middleware de autenticación**: Cada vez que el usuario intenta acceder a una ruta protegida, el middleware `auth.ts` ejecuta el hydrate para asegurar que el estado de autenticación está actualizado antes de verificar si el usuario tiene acceso.

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  
  if (import.meta.client) {
    authStore.hydrate()
  }
  // ... resto del middleware
})
```

### Flujo Detallado del Hydrate

El proceso de hydrate sigue una secuencia específica:

1. **Recarga de página o navegación**: El usuario recarga la página o navega a una nueva URL después de haber cerrado el navegador previamente.

2. **Mount del NavBar**: Nuxt carga la aplicación y monta el componente NavBar (entre otros).

3. **Ejecución de onMounted**: El hook onMounted del NavBar se ejecuta.

4. **Llamada a hydrate**: Se llama a `authStore.hydrate()`.

5. **Lectura de localStorage**: El método verifica si existe la clave `access_token` en localStorage.

6. **Asignación del token**: Si existe un token, se asigna al estado del store de Pinia.

7. **Obtención de datos del usuario**: Se llama a `fetchMe()` para obtener los datos del usuario con el token restaurado.

8. **Actualización del UI**: El NavBar detecta que `authStore.isLoggedIn` es `true` y muestra el dropdown con el nombre del usuario.

9. **Usuario puede continuar**: El usuario puede navegar por la aplicación sin necesidad de iniciar sesión nuevamente.

Este proceso ocurre de manera transparente para el usuario, proporcionando la sensación de que la sesión se mantiene entre navegaciones y recargas.

---

## Protección de Rutas

La protección de rutas es una capa de seguridad que impede que usuarios no autenticados accedan a ciertas partes de la aplicación. Dependiendo del tipo de ruta, se implementan diferentes niveles de protección.

### Tipos de Protección

Este sistema implementa dos tipos de protección de rutas:

**Protección a nivel de middleware**: Se utiliza el middleware de Nuxt para proteger rutas completas. Cuando un usuario intenta acceder a una ruta que tiene el middleware aplicado, el middleware se ejecuta antes de renderizar la página y decide si permitir el acceso o redirigir al usuario.

**Protección a nivel de componente**: Para rutas que necesitan protección parcial (donde algunas partes son públicas y otras protegidas), se implementa una verificación inline dentro del componente. Esta aproximación permite un control más granular del flujo.

### Protección con Middleware (Rutas Completamente Protegidas)

El archivo `middleware/auth.ts` contiene el middleware de autenticación que protege rutas completas:

```typescript
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  
  if (import.meta.client) {
    authStore.hydrate()
  }
  
  if (!authStore.isLoggedIn) {
    const returnUrl = to.fullPath
    return navigateTo({ path: '/login', query: { redirect: returnUrl } })
  }
})
```

El middleware recibe el objeto `to` que representa la ruta destino. Este objeto contiene información como el path completo (`to.fullPath`) que se utiliza para construir la URL de retorno.

El flujo de ejecución del middleware es:

1. **Obtención del store**: Se crea o obtiene una referencia al store de autenticación.

2. **Hydrate**: Se ejecuta el proceso de hydrate para restaurar el estado desde localStorage.

3. **Verificación de sesión**: Se verifica el getter `isLoggedIn` que retorna `true` solo si existe un token en el estado del store.

4. **Decisión de acceso**:
   - Si el usuario está autenticado: Se permite el acceso a la ruta
   - Si el usuario NO está autenticado: Se redirige a `/login` con el parámetro `redirect` containing la URL original

### Rutas Protegidas con Middleware

En este proyecto, la ruta `/admin` está protegida con el middleware de autenticación. Para aplicar el middleware a una ruta, se utiliza la función `definePageMeta` en el archivo de la página:

```typescript
// pages/admin.vue
definePageMeta({ middleware: 'auth' })
```

Cuando un usuario intenta acceder a `/admin`:
1. El middleware se ejecuta antes de renderizar la página
2. Se ejecuta el hydrate para restaurar el estado
3. Se verifica si el usuario está autenticado
4. Si no lo está, se redirige a `/login?redirect=%2Fadmin`
5. Después de iniciar sesión, el usuario es redirigido de vuelta a `/admin`

### Protección a Nivel de Componente (Protección Parcial)

Para el flujo de compra de entradas, se implementó una protección diferente. La página de booking (`pages/booking/[id].vue`) permite ver la información de la película y seleccionar sesión sin necesidad de estar autenticado. La protección se activa solo cuando el usuario intenta pasar a la selección de asientos.

Esta protección se implementa en la función que maneja el clic en el botón "Continuar":

```typescript
function irAlPasoDeAsientos() {
  const authStore = useAuthStore()
  
  if (!authStore.isLoggedIn) {
    const currentPath = route.fullPath
    router.push({ path: '/login', query: { redirect: currentPath } })
    return
  }
  
  // Continuar con el flujo de selección de asientos...
}
```

Este enfoque proporciona una mejor experiencia de usuario porque:
- El usuario puede explorar las sesiones disponibles sin iniciar sesión
- Solo se pide autenticación cuando realmente va a realizar una compra
- Se reduce la fricción en el proceso de compra

---

## UI del Navbar - Dropdown de Usuario

El NavBar es el componente de navegación principal de la aplicación y contiene un dropdown que muestra diferentes opciones dependiendo del estado de autenticación del usuario. Este componente es fundamental para la experiencia de usuario porque proporciona una forma clara de iniciar o cerrar sesión.

### Estructura del Componente

El NavBar está compuesto por dos secciones principales: la marca (logo) y las acciones. Las acciones incluyen un botón de inicio y un botón de usuario con su dropdown asociado.

```vue
<div class="user-dropdown-container">
  <button class="navbar-icon" aria-label="Usuario" @click="toggleDropdown">
    <font-awesome-icon icon="fa-solid fa-user" />
  </button>
  
  <div v-if="isDropdownOpen" class="user-dropdown">
    <!-- Contenido según estado de autenticación -->
  </div>
</div>
```

### Estados del Dropdown

El dropdown tiene dos estados principales que se determinan mediante la condición `authStore.isLoggedIn`:

**Estado 1: Usuario NO autenticado**

Cuando el usuario no ha iniciado sesión, el dropdown muestra un único elemento: un enlace a la página de login. Este enlace permite al usuario navegar a la página de inicio de sesión para introducir sus credenciales.

```vue
<template v-else>
  <NuxtLink to="/login" class="dropdown-item" @click="closeDropdown">
    Iniciar sesión
  </NuxtLink>
</template>
```

El enlace está implementado usando el componente `NuxtLink` de Nuxt, que proporciona navegación del lado del cliente sin recarga completa de la página. Al hacer clic, también se cierra el dropdown mediante la función `closeDropdown()`.

**Estado 2: Usuario autenticado**

Cuando el usuario ha iniciado sesión, el dropdown muestra dos elementos:

1. Un mensaje de bienvenida con el nombre del usuario
2. Un botón para cerrar sesión

```vue
<template v-if="authStore.isLoggedIn">
  <div class="dropdown-user-info">
    Hola, {{ authStore.user?.name }}
  </div>
  <button class="dropdown-item" @click="handleLogout">
    Logout
  </button>
</template>
```

El nombre del usuario se obtiene de `authStore.user?.name`. El operador optional chaining (`?.`) se usa para manejar el caso donde `user` podría ser `null` (aunque esto no debería ocurrir si el usuario está autenticado).

### Iconos de FontAwesome

El sistema utiliza iconos de FontAwesome en su versión "solid" (relleno) para los botones de navegación. El icono de usuario (`fa-solid fa-user`) se muestra en el botón del dropdown. Los iconos tienen un color negro definido en el CSS del componente:

```css
.navbar-icon :deep(svg) {
  color: black;
}
```

El selector `:deep(svg>` se utiliza para aplicar estilos a los elementos SVG que son renderizados por el componente `font-awesome-icon`, que es un componente dinámico que genera los iconos internamente.

### Gestión del Estado del Dropdown

El dropdown tiene un estado de apertura controliado por la variable `isDropdownOpen`. Las funciones relacionadas son:

**toggleDropdown()**: Alterna el estado del dropdown entre abierto y cerrado. Se ejecuta cuando el usuario hace clic en el botón de usuario.

**closeDropdown()**: Establece el estado a `false`. Se ejecuta cuando el usuario hace clic en una opción del dropdown (como "Iniciar sesión").

**handleLogout()**: Además de cerrar el dropdown, esta función llama al método `logout()` del store y redirige al usuario al首页.

### Estilos del Dropdown

El dropdown tiene los siguientes estilos definidos:

- Posición absoluta (`position: absolute`) relative al contenedor del dropdown
- Aparece debajo del botón de usuario (`top: 100%`)
- Se alinea a la derecha del botón (`right: 0`)
- Tiene un margen superior de 8px para separarlo del botón
- Fondo blanco con borde y sombra sutil
- Ancho mínimo de 160px
- Z-index alto (200) para aparecer sobre otros elementos

El elemento de información del usuario tiene un estilo distintivo con un borde inferior, mientras que los elementos de acción tienen un efecto hover que cambia el fondo.

---

## Redirección Inteligente Post-Login

La redirección inteligente es una funcionalidad que mejora significativamente la experiencia de usuario al recordar la página que el usuario intentaba visitar antes de que se le pidiera iniciar sesión. Sin esta funcionalidad, el usuario sería selalu redirigido al首页 después de iniciar sesión, perdiendo el contexto de su navegación original.

### Cómo se Guarda la URL de Destino

Cuando un usuario intenta acceder a una ruta protegida sin estar autenticado, el sistema captura la URL completa y la pasa como parámetro en la redirección a la página de login.

En el middleware de autenticación:
```typescript
if (!authStore.isLoggedIn) {
  const returnUrl = to.fullPath
  return navigateTo({ path: '/login', query: { redirect: returnUrl } })
}
```

El objeto `to.fullPath` contiene la ruta completa incluyendo query parameters. Por ejemplo, si el usuario intenta acceder a `/booking/123?session=afternoon`, `to.fullPath` será `/booking/123?session=afternoon`.

Esta URL se codifica como parámetro de query con la clave `redirect`. La codificación URL es automática cuando se usa el objeto de opciones de `navigateTo`.

### Cómo se Utiliza la URL de Retorno

En la página de login, después de que el usuario inicia sesión exitosamente, el código lee el parámetro `redirect` de la query string:

```typescript
if (result.ok) {
  const route = useRoute()
  const redirect = route.query.redirect as string
  router.push(redirect || '/')
}
```

El parámetro `route.query.redirect` contiene la URL codificada que fue almacenada durante la redirección anterior. El código la decodifica automáticamente y la usa como destino para la navegación.

Si por alguna razón no hay un parámetro `redirect` (por ejemplo, si el usuario navegó directamente a `/login`), se usa el首页 (`/`) como destino por defecto.

### Ejemplo de Flujo Completo

Para ilustrar mejor este proceso, veamos un ejemplo concreto:

1. El usuario está explorando la cartelera en el首页 sin estar autenticado
2. El usuario hace clic en "Comprar entradas" para una película específica
3. El navegador navega a `/booking/456`
4. El usuario ve la página de booking, selecciona fecha, hora y número de entradas
5. El usuario hace clic en "Continuar a la selección de asientos"
6. El sistema verifica que el usuario no está autenticado
7. El sistema redirige a `/login?redirect=%2Fbooking%2F456`
8. El usuario ve la página de login
9. El usuario introduce sus credenciales y hace clic en "Acceder"
10. El sistema valida las credenciales, guarda el token y obtiene los datos del usuario
11. El sistema redirige al usuario a `/booking/456` (el valor del parámetro `redirect`)
12. El usuario continúa con el proceso de compra exactamente donde lo dejó

Este flujo proporciona una experiencia de usuario fluida y sin fricción, ya que no pierde el contexto de su acción original.

---

## Diagrama de Flujo

A continuación se presenta un diagrama de flujo visual que resume todo el proceso de autenticación:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USUARIO ACCEDE A LA APLICACIÓN                      │
│                         (Abre el navegador/recarga página)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NAVBAR SE MONTA EN LA PÁGINA                         │
│                         onMounted() → authStore.hydrate()                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │ localStorage contiene   │
                         │ la clave 'access_token'? │
                         └─────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                                   ▼
                   SÍ                                  NO
                    │                                   │
                    ▼                                   ▼
         ┌────────────────────┐              ┌────────────────────┐
         │ authStore.        │              │ Usuario permanece  │
         │ accessToken =     │              │ como NO autenticado│
         │ token (desde      │              │ (isLoggedIn =      │
         │ localStorage)      │              │ false)             │
         └────────────────────┘              └────────────────────┘
                    │
                    ▼
         ┌────────────────────┐
         │ fetchMe() se       │
         │ ejecuta:           │
         │ GET /api/me        │
         │ (con Authorization │
         │  Bearer token)     │
         └────────────────────┘
                    │
                    ▼
         ┌────────────────────┐
         │ Backend devuelve   │
         │ datos del usuario  │
         │ (id, name, email,  │
         │  etc.)             │
         └────────────────────┘
                    │
                    ▼
         ┌────────────────────┐
         │ authStore.user =  │
         │ datos_del_usuario │
         └────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USUARIO NAVEGA POR LA APP                            │
│                    (Ve películas, hace clicks, etc.)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
    ┌─────────────┐          ┌─────────────┐         ┌─────────────┐
    │  / (Home)   │          │ /booking/123 │         │  /admin     │
    │ (público)   │          │ (mixto)      │         │ (protegido) │
    └─────────────┘          └─────────────┘         └─────────────┘
           │                        │                        │
           ▼                        ▼                        ▼
    ┌─────────────┐          ┌─────────────┐         ┌─────────────┐
    │ Acceso      │          │ Ver sesión  │         │ Middleware  │
    │ permitido  │          │ sin auth    │         │ auth.ts se  │
    │ siempre    │          │ permitido   │         │ ejecuta     │
    └─────────────┘          └─────────────┘         └─────────────┘
                                      │                        │
                                      ▼                        ▼
                          ┌────────────────────┐    ┌────────────────────┐
                          │ Click "Continuar   │    │ isLoggedIn?        │
                          │ a asientos"       │    │ (verifica token)   │
                          └────────────────────┘    └────────────────────┘
                                      │                        │
                                      ▼           ┌─────────────┴─────────────┐
                          ┌────────────────────┐  ▼                         ▼
                          │ isLoggedIn?        │ SÍ                         NO
                          │ (verificación       │  │                         │
                          │  inline)           │  ▼                         ▼
                          └────────────────────┘┌─────────────────────┐   ┌─────────────────────┐
                                      │          │ Permite acceso al    │   │ Redirige a          │
                                      ▼          │ paso 2 (asientos)   │   │ /login?redirect=    │
                          ┌───────────┴───────────┐└─────────────────────┘   │ /admin              │
                          ▼                       ▼                          └─────────────────────┘
                       SÍ                         NO
                        │                          │
                        ▼                          ▼
            ┌────────────────────┐   ┌────────────────────┐
            │ Ir a paso 2        │   │ Redirigir a        │
            │ (selección         │   │ /login             │
            │  asientos)         │   │                    │
            └────────────────────┘   └────────────────────┘
                                                    │
                                                    ▼
                                    ┌────────────────────────────┐
                                    │ USUARIO EN PÁGINA DE LOGIN │
                                    │ Introduce credenciales     │
                                    │ Click en "Acceder"          │
                                    └────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌────────────────────────────┐
                                    │ authStore.login()           │
                                    │ POST /api/login             │
                                    │ { email, password }         │
                                    └────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌────────────────────────────┐
                                    │ Backend valida credenciales │
                                    │ Devuelve access_token JWT  │
                                    └────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌────────────────────────────┐
                                    │ 1. accessToken = token     │
                                    │ 2. localStorage.setItem    │
                                    │    ('access_token', token) │
                                    │ 3. fetchMe() → user = datos│
                                    └────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌────────────────────────────┐
                                    │ Login exitoso              │
                                    │ redirect = /admin (desde  │
                                    │ query param)               │
                                    └────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌────────────────────────────┐
                                    │ router.push(redirect || '/')│
                                    │ → Redirige a /admin         │
                                    └────────────────────────────┘
```

---

## Notas Adicionales

### Tokens JWT

El sistema de autenticación utiliza JSON Web Tokens (JWT) para la autenticación sin estado. Los JWT son un estándar abierto (RFC 7519) que define un formato compacto y autónomo para transmitir información entre partes como un objeto JSON.

**Características del token utilizado:**

- **Formato**: El token es una cadena codificada en Base64 que contiene tres partes separadas por puntos: header.payload.signature
- **Firma**: El token está firmado digitalmente por el backend Laravel, lo que permite verificar su autenticidad sin necesidad de consultar la base de datos en cada petición
- **Vigencia**: El token tiene una validez definida por el backend (generalmente configurable en el archivo de configuración de Laravel). Cuando el token expira, el usuario debe iniciar sesión nuevamente
- **Contenido**: El token típicamente contiene información como el ID del usuario, pero no contiene la contraseña ni otros datos sensibles

### Seguridad

**Consideraciones importantes sobre la seguridad del sistema:**

El token se almacena en localStorage, lo que significa que es accesible desde JavaScript en el navegador. Esto presenta una vulnerabilidad conocida como XSS (Cross-Site Scripting). Si un atacante logra injectar código JavaScript malicioso en la página, podría leer el token de localStorage y usarlo para hacerse pasar por el usuario.

Para aplicaciones que requieren mayor seguridad, se recomienda considerar las siguientes alternativas:

- **Cookies HttpOnly**: Almacenar el token en una cookie con el flag HttpOnly, lo que impide que JavaScript pueda leer el token
- **Tokens de corta duración**: Implementar tokens conExpiration más corta y usar refresh tokens para extender la sesión
- **Verificación adicional**: Implementar verificación de IP o dispositivo

### SSR y Hydration

El proceso de hydrate solo se ejecuta en el cliente (`import.meta.client`). Esto es importante entenderlo porque durante el renderizado del lado del servidor (SSR), el estado inicial del store de autenticación siempre está vacío.

Cuando Nuxt genera la página en el servidor, no tiene acceso a localStorage ni a las cookies de sesión del navegador. Por lo tanto, el estado de autenticación no puede ser determinado en el servidor. Esto tiene implicaciones como que la página se renderiza inicialmente como si el usuario no estuviera autenticado, y después de que el JavaScript se ejecuta en el navegador, el estado se actualiza y la UI se actualiza correspondientemente (esto es lo que se llama "hydrate").

Este comportamiento es esperado y no debe confundirse con un error. La verificación de autenticación y el hydrate ocurren tan pronto como el componente se monta en el cliente, por lo que el usuario generalmente no nota este proceso.

### Gestión de Errores

El sistema implementa gestión de errores en varios puntos del flujo:

- **Login incorrecto**: Si las credenciales son incorrectas, el backend devuelve un error que se muestra al usuario en la página de login
- **Token expirado**: Si el token expira mientras el usuario está usando la aplicación, el endpoint `/api/me` fallará y el sistema ejecutará logout automáticamente
- **Errores de red**: Los errores de red se capturan y manejan apropiadamente, mostrando mensajes al usuario cuando es necesario

---

## Mantenimiento y Extensiones

### Añadir Nueva Ruta Protegida con Middleware

Para proteger una nueva ruta completamente (todos los componentes de la página requieren autenticación), añade el middleware en el archivo de la página:

```typescript
// pages/nueva-ruta-protegida.vue
<script setup>
definePageMeta({ middleware: 'auth' })
// Resto del código de la página...
</script>
```

Esto automáticamente ejecutará el middleware cada vez que un usuario intente acceder a esa ruta.

### Añadir Protección Parcial (Inline)

Si necesitas proteger solo ciertas partes de una página mientras otras son públicas, usa verificación inline:

```typescript
// En el componente
function accionProtegida() {
  const authStore = useAuthStore()
  
  if (!authStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  
  // Ejecutar la acción protegida...
}
```

### Añadir Más Datos al Usuario

Si necesitas mostrar más información del usuario en la UI:

1. **Backend**: Modifica el endpoint `/api/me` en Laravel para devolver los campos adicionales que necesites
2. **Frontend**: Actualiza el tipo del campo `user` en el store si estás usando TypeScript strict, o simplemente usa los nuevos campos directamente en los componentes

### Cambiar Comportamiento Post-Logout

Si necesitas modificar qué ocurre después de que el usuario cierra sesión:

1. **Modificar en el componente**: Cambia la función `handleLogout()` en `components/NavBar.vue` para cambiar la redirección
2. **Modificar en el store**: Cambia el método `logout()` en el store si necesitas ejecutar lógica adicional (como limpiar otros stores)

### Persistencia de Sesión Personalizada

Si necesitas persistencia adicional (por ejemplo, recordar preferencias del usuario):

1. Crea un store adicional o extiende el store de autenticación
2. Implementa métodos de hydrate/restore similares a los del store de autenticación
3. Asegúrate de ejecutar el hydrate en el momento apropiado (generalmente en el onMounted del NavBar o en un plugin de Nuxt)

---

## Resumen

El sistema de autenticación de esta aplicación es un flujo completo que maneja todas las etapas del ciclo de vida de la sesión del usuario:

1. **Inicio de sesión**: El usuario introduce credenciales, el backend valida y devuelve un token JWT que se almacena en el estado de la aplicación y en localStorage
2. **Persistencia**: El token en localStorage permite que la sesión sobreviva a recargas de página mediante el proceso de hydrate
3. **Protección**: Las rutas protegidas verifican el estado de autenticación y redirigen a usuarios no autenticados al login
4. **Cierre de sesión**: El proceso de logout limpia el estado local, elimina el token de localStorage y notifica al backend

Todo el sistema está diseñado para proporcionar una experiencia de usuario fluida mientras mantiene un nivel adecuado de seguridad para una aplicación web de este tipo.