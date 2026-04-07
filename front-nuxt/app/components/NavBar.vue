<script setup>
import { ref, onMounted } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

const isDropdownOpen = ref(false)

onMounted(() => {
  authStore.hydrate()
})

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const closeDropdown = () => {
  isDropdownOpen.value = false
}

const handleLogout = async () => {
  await authStore.logout()
  closeDropdown()
  router.push('/')
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <NuxtLink to="/" class="navbar-logo">VMK Cinema</NuxtLink>
    </div>
    <div class="navbar-actions">
      <NuxtLink to="/" class="navbar-icon" aria-label="Inicio">
        <font-awesome-icon icon="fa-solid fa-house" />
      </NuxtLink>
      <div class="user-dropdown-container">
        <button class="navbar-icon" aria-label="Usuario" @click="toggleDropdown">
          <font-awesome-icon icon="fa-solid fa-user" />
        </button>
        <div v-if="isDropdownOpen" class="user-dropdown">
          <template v-if="authStore.isLoggedIn">
            <div class="dropdown-user-info">
              Hola, {{ authStore.user?.name }}
            </div>
            <button class="dropdown-item" @click="handleLogout">
              Logout
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="dropdown-item" @click="closeDropdown">
              Iniciar sesión
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-brand {
  flex-shrink: 0;
}

.navbar-logo {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 200;
  color: var(--color-primary);
  text-decoration: none;
  letter-spacing: -0.02em;
}

.navbar-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.navbar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--color-on-surface);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.navbar-icon:hover {
  background-color: var(--color-surface-container-low);
}

.navbar-icon svg {
  width: 24px;
  height: 24px;
}

.navbar-icon :deep(svg) {
  color: black;
}

.user-dropdown-container {
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  overflow: hidden;
  z-index: 200;
}

.dropdown-user-info {
  padding: 12px 16px;
  font-weight: 600;
  color: var(--color-on-surface);
  border-bottom: 1px solid var(--color-outline);
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-on-surface);
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: none;
}

.dropdown-item:hover {
  background: var(--color-surface-container-low);
}
</style>
