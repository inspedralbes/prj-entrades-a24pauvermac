// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    // Solo disponible en el servidor (SSR) — nunca llega al navegador
    apiUrlInternal: process.env.NUXT_API_URL_INTERNAL || 'http://laravel-app:8000',
    public: {
      // La URL de tu API Laravel (el servicio 'laravel-app')
      apiBase: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8000',
      // La URL en la que vive el Microservicio Árbitro interactivo de Node.js (el .env/docker-compose dice 3000)
      socketUrl: process.env.NUXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
    }
  },
  css: [
    '@fortawesome/fontawesome-svg-core/styles.css'
  ],
  build: {
    transpile: [
      '@fortawesome/vue-fontawesome',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons'
    ]
  }
})
