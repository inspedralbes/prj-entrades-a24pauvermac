<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <NuxtLink to="/" class="navbar-logo">VMK Cinema</NuxtLink>
    </div>
    <div class="navbar-actions">
      <NuxtLink to="/" class="navbar-icon" aria-label="Inicio">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </NuxtLink>
      <button class="navbar-icon" aria-label="Usuario">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
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
</style>
