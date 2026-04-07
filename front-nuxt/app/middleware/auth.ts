// Middleware de navegación: protege rutas que requieren estar autenticado.
// Si el usuario no tiene token, lo redirige a /login.
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  
  // Restaurar el estado de autenticación desde localStorage
  if (import.meta.client) {
    authStore.hydrate()
  }
  
  // Verificar si está autenticado
  if (!authStore.isLoggedIn) {
    // Guardar la URL de retorno para después de iniciar sesión
    const returnUrl = to.fullPath
    return navigateTo({ path: '/login', query: { redirect: returnUrl } })
  }
})
