// Store de autenticación: guarda el token JWT y los datos del usuario
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,
    user: null as any,
  }),

  getters: {
    isLoggedIn: (state) => !!state.accessToken,
  },

  actions: {
    // Llamada al backend Laravel para hacer login
    async login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
      try {
        const config = useRuntimeConfig()
        const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal
        const res: any = await $fetch('/api/login', {
          baseURL,
          method: 'POST',
          body: { email, password },
        })
        this.accessToken = res.access_token
        // Persistimos en localStorage para sobrevivir recargas
        if (import.meta.client) {
          localStorage.setItem('access_token', res.access_token)
        }
        await this.fetchMe()
        return { ok: true }
      } catch (err: any) {
        return { ok: false, error: err?.data?.error || 'Error al iniciar sesión' }
      }
    },

    // Llamada al backend para registrar un usuario nuevo
    async register(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
      try {
        const config = useRuntimeConfig()
        const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal
        const res: any = await $fetch('/api/register', {
          baseURL,
          method: 'POST',
          body: { name, email, password },
        })
        this.accessToken = res.access_token
        if (import.meta.client) {
          localStorage.setItem('access_token', res.access_token)
        }
        await this.fetchMe()
        return { ok: true }
      } catch (err: any) {
        const msg = err?.data?.message || err?.data?.error || 'Error al registrarse'
        return { ok: false, error: msg }
      }
    },

    // Obtiene los datos del usuario con el token actual
    async fetchMe() {
      if (!this.accessToken) return
      try {
        const config = useRuntimeConfig()
        const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal
        this.user = await $fetch('/api/me', {
          baseURL,
          headers: { Authorization: `Bearer ${this.accessToken}` },
        })
      } catch {
        this.logout()
      }
    },

    // Cierra sesión
    async logout() {
      if (this.accessToken) {
        try {
          const config = useRuntimeConfig()
          const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal
          await $fetch('/api/logout', {
            baseURL,
            method: 'POST',
            headers: { Authorization: `Bearer ${this.accessToken}` },
          })
        } catch { /* ignoramos errores en logout */ }
      }
      this.accessToken = null
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('access_token')
      }
    },

    // Restaura la sesión desde localStorage al recargar la página
    hydrate() {
      if (import.meta.client) {
        const token = localStorage.getItem('access_token')
        if (token) {
          this.accessToken = token
          this.fetchMe()
        }
      }
    },
  },
})
