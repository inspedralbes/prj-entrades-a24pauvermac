// Middleware de navegación: protege rutas que requieren estar autenticado.
// Si el usuario no tiene token, lo redirige a /login.
export default defineNuxtRouteMiddleware(() => {
  // Intentamos restaurar el token desde localStorage (si recargó la página)
  if (import.meta.client) {
    const token = localStorage.getItem('access_token')
    if (!token) {
      return navigateTo('/login')
    }
  }
})
