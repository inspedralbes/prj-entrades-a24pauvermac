<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({ layout: false })

const authStore = useAuthStore()
const router = useRouter()

// Si ya está logueado, redirige directamente
if (authStore.isLoggedIn) {
  const route = useRoute()
  const redirect = route.query.redirect as string
  navigateTo(redirect || '/')
}

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function handleLogin() {
  error.value   = ''
  loading.value = true

  const result = await authStore.login(email.value, password.value)

  loading.value = false

  if (result.ok) {
    const route = useRoute()
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } else {
    error.value = result.error || 'Credenciales incorrectas'
  }
}
</script>

<template>
  <div class="auth-page">

    <!-- Cabecera -->
    <header class="auth-header">
      <NuxtLink to="/" class="auth-brand text-label">VMK·Cinema</NuxtLink>
    </header>

    <!-- Hero text -->
    <div class="auth-hero">
      <h1 class="auth-title">Bienvenido de nuevo<br>a la cartelera</h1>
    </div>

    <!-- Card -->
    <div class="auth-card">

      <!-- Error -->
      <p v-if="error" class="auth-error text-label">{{ error }}</p>

      <form @submit.prevent="handleLogin" class="auth-form">

        <!-- Email -->
        <div class="auth-field">
          <label class="auth-field-label text-label">Correo Electrónico</label>
          <input
            v-model="email"
            type="email"
            class="auth-input"
            placeholder="curator@vmk-cinema.com"
            required
            autocomplete="email"
          />
        </div>

        <!-- Password -->
        <div class="auth-field">
          <div class="auth-field-header">
            <label class="auth-field-label text-label">Contraseña</label>
            <span class="auth-forgot text-label">¿Olvidaste?</span>
          </div>
          <input
            v-model="password"
            type="password"
            class="auth-input"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <!-- Submit -->
        <button type="submit" class="auth-submit text-label" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Acceder a la Cartelera' }}
        </button>

      </form>

      
      <!-- Link a register -->
      <p class="auth-switch text-body">
        ¿No tienes acceso?
        <NuxtLink to="/register" class="auth-switch-link">Crea una cuenta</NuxtLink>
      </p>

    </div>

  </div>
</template>

<style scoped>
/* ── PAGE ─────────────────────────────────────────── */
.auth-page {
  min-height: 100vh;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── HEADER ───────────────────────────────────────── */
.auth-header {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-md);
}
.auth-brand {
  font-family: var(--font-serif);
  font-size: 0.8rem;
  font-style: normal;
  text-decoration: none;
  color: var(--color-on-surface-muted);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* ── HERO ─────────────────────────────────────────── */
.auth-hero {
  text-align: center;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-lg);
  max-width: 480px;
}
.auth-title {
  font-family: var(--font-serif);
  font-size: clamp(2.2rem, 5vw, 3rem);
  font-weight: 200;
  color: var(--color-primary);
  line-height: 1.25;
  margin: 0;
}

/* ── CARD ─────────────────────────────────────────── */
.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface-container-lowest);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-ambient);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xl);
}

/* ── FORM ─────────────────────────────────────────── */
.auth-form { display: flex; flex-direction: column; gap: var(--spacing-lg); }

.auth-field { display: flex; flex-direction: column; gap: 8px; }

.auth-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.auth-field-label {
  font-size: 0.65rem;
  color: var(--color-on-surface-muted);
}

.auth-forgot {
  font-size: 0.65rem;
  color: var(--color-on-surface-muted);
  cursor: pointer;
  transition: color 0.2s;
}
.auth-forgot:hover { color: var(--color-primary); }

/* Input con sólo línea inferior — estilo editorial */
.auth-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(26,26,26,0.2);
  padding: 8px 0;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--color-on-surface);
  transition: border-color 0.2s;
  outline: none;
}
.auth-input::placeholder { color: rgba(26,26,26,0.25); }
.auth-input:focus { border-bottom-color: var(--color-primary); }

/* Botón negro de envío */
.auth-submit {
  width: 100%;
  padding: 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: var(--spacing-sm);
}
.auth-submit:hover:not(:disabled) { opacity: 0.85; }
.auth-submit:disabled { opacity: 0.4; cursor: not-allowed; }

/* Error */
.auth-error {
  color: #b91c1c;
  font-size: 0.7rem;
  background: #fef2f2;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

/* ── SWITCH ───────────────────────────────────────── */
.auth-switch {
  margin-top: var(--spacing-md);
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-on-surface-muted);
}
.auth-switch-link {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
}
.auth-switch-link:hover { opacity: 0.7; }
</style>
