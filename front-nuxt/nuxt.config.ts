// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // Solo disponible en el servidor (SSR) — nunca llega al navegador
    apiUrlInternal: process.env.NUXT_API_URL_INTERNAL || 'http://laravel-app:8000',
    public: {
      // La URL de tu API Laravel (el servicio 'laravel-app')
      apiBase: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8000',
    }
  }
})
