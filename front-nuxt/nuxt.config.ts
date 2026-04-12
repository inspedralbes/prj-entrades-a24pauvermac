// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  app: {
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,300;1,8..60,400&display=swap'
        }
      ]
    }
  },
  runtimeConfig: {
    apiUrlInternal: process.env.NUXT_API_URL_INTERNAL || 'http://127.0.0.1:8000',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_URL || 'http://204.168.252.153:8000',
      socketUrl: process.env.NUXT_PUBLIC_SOCKET_URL || 'http://204.168.252.153:3001'
    }
  },
  css: [
    '@fortawesome/fontawesome-svg-core/styles.css',
    '~/assets/css/main.css'
  ],
  build: {
    transpile: [
      '@fortawesome/vue-fontawesome',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons'
    ]
  }
})
