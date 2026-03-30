export const useApi = (request: string, options = {}) => {
  const config = useRuntimeConfig();
  
  let baseURL = '';

  // Si el código se está ejecutando en el servidor de Docker (SSR)
  if (import.meta.server) {
    baseURL = config.apiUrlInternal; // http://laravel-app:8000
  } 
  // Si el código se está ejecutando en el navegador del usuario final
  else {
    baseURL = config.public.apiBase; // http://localhost:8000
  }

  // Devolvemos la petición de Nuxt con la URL correcta
  return useFetch(request, {
    baseURL: baseURL,
    ...options
  });
};
