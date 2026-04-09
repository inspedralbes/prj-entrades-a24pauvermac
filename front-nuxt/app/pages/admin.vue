<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Panel de Administración</h1>
      <NuxtLink to="/">Volver a Inicio</NuxtLink>
    </header>

    <!-- ESTADÍSTICAS GLOBALES -->
    <section class="stats-section">
      <div class="stat-card">
        <h3>💰 Recaudación Total</h3>
        <p class="stat-value">{{ adminStore.globalStats.total_revenue }} €</p>
      </div>
      <div class="stat-card">
        <h3>🎟️ Entradas Vendidas</h3>
        <p class="stat-value">{{ adminStore.globalStats.total_seats_sold }}</p>
      </div>
      <div class="stat-card">
        <h3>📈 Ocupación Global</h3>
        <p class="stat-value">{{ adminStore.globalStats.occupancy_percentage }} %</p>
      </div>
      <div class="stat-card">
        <h3>📊 Ventas por Tipo</h3>
        <ul>
          <li v-for="(amount, type) in adminStore.globalStats.sales_by_type" :key="type">
            {{ type }}: {{ amount }} €
          </li>
        </ul>
      </div>
    </section>

    <div class="main-content">
      <!-- MÓDULO 1: PANEL EN TIEMPO REAL -->
      <section class="realtime-section">
        <h2>Panel en Tiempo Real (Sockets)</h2>
        <div class="form-group">
          <label>Seleccionar Sesión Activa:</label>
          <select v-model="selectedScreeningId" @change="onScreeningSelected">
            <option :value="null">-- Selecciona una sesión --</option>
            <option v-for="sesion in adminStore.activeScreenings" :key="sesion.id" :value="sesion.id">
              Sesión #{{ sesion.id }} - {{ sesion.room_name }} - {{ formatDate(sesion.starts_at) }}
            </option>
          </select>
        </div>

        <div v-if="adminStore.realTimePanel.selectedScreeningId" class="realtime-dashboard">
          <div class="live-stat free">
            <h4>Libres</h4>
            <p>{{ freeSeats }}</p>
          </div>
          <div class="live-stat temporal">
            <h4>En Proceso (Naranja)</h4>
            <p>{{ adminStore.realTimePanel.temporarilyLockedSeats }}</p>
          </div>
          <div class="live-stat sold">
            <h4>Vendidos (Rojo)</h4>
            <p>{{ adminStore.realTimePanel.seatsSold }}</p>
          </div>
          <div class="live-stat total">
            <h4>Capacidad Total</h4>
            <p>{{ adminStore.realTimePanel.totalCapacity }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
           Selecciona una sesión para ver sus datos en vivo.
        </div>
      </section>

      <!-- MÓDULO 2: CREACIÓN DE EVENTOS -->
      <section class="create-section">
        <h2>Crear Nueva Sesión</h2>
        
        <div class="search-box">
          <label>Buscar Película (TMDB):</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" v-model="movieQuery" placeholder="Ej. Interstellar" @keyup.enter="searchMovie" />
            <button @click="searchMovie">Buscar</button>
          </div>
        </div>

        <div v-if="adminStore.movieSearchResults.length > 0" class="movie-results">
          <div class="movie-card" 
               v-for="movie in adminStore.movieSearchResults" :key="movie.id"
               :class="{ selected: selectedMovieId === movie.id }"
               @click="selectedMovieId = movie.id">
            <img :src="movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : 'https://via.placeholder.com/200x300'" alt="poster">
            <p>{{ movie.title }}</p>
          </div>
        </div>

        <form v-if="selectedMovieId" @submit.prevent="submitScreening" class="create-form">
          <p><strong>Película seleccionada:</strong> TMDB ID {{ selectedMovieId }}</p>
          
          <div class="form-group">
            <label>Sala:</label>
            <select v-model="form.room_id" required>
              <option v-for="room in adminStore.creationOptions.rooms" :key="room.id" :value="room.id">
                {{ room.name }} (Cap: {{ room.capacity }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Formato y Precio:</label>
            <select v-model="form.price_id" required @change="onPriceSelected">
              <option v-for="price in adminStore.creationOptions.pricings" :key="price.id" :value="price.id">
                {{ price.format }} - {{ price.type }} ({{ price.price }} €)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Fecha y Hora:</label>
            <input type="datetime-local" v-model="form.starts_at" required />
          </div>

          <div class="form-group">
            <label>Idioma:</label>
            <select v-model="form.language" required>
              <option value="esp">Español</option>
              <option value="eng">Inglés (VOS)</option>
              <option value="cat">Catalán</option>
            </select>
          </div>

          <button type="submit" class="submit-btn" :disabled="isSubmitting">
            {{ isSubmitting ? 'Creando...' : 'Crear Sesión' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAdminStore } from '@/stores/useAdminStore'
import { io } from 'socket.io-client'

const adminStore = useAdminStore()
const config = useRuntimeConfig()

// Para sockets
let socket: any = null
const selectedScreeningId = ref<number | null>(null)

// Para el formulario
const movieQuery = ref('')
const selectedMovieId = ref<number | null>(null)
const isSubmitting = ref(false)

const form = ref({
  room_id: '',
  price_id: '',
  starts_at: '',
  language: 'esp',
  format: '2D'
})

// Computada para saber asientos libres
const freeSeats = computed(() => {
  const tot = adminStore.realTimePanel.totalCapacity
  const sold = adminStore.realTimePanel.seatsSold
  const temp = adminStore.realTimePanel.temporarilyLockedSeats
  return tot - sold - temp
})

onMounted(async () => {
  await adminStore.fetchAdminDashboardData()
  
  // Conectar WebSockets solo al montar, usando la base correcta
  const socketUrl = import.meta.client ? config.public.socketUrl : 'http://localhost:3000';
  socket = io(socketUrl)

  // Escuchar las actualizaciones enviadas específicamente para el admin
  socket.on('admin_temporales_update', (totalTemp: number) => {
    adminStore.updateTemporarilyLocked(totalTemp)
  })
})

onUnmounted(() => {
  if (socket) {
    socket.disconnect()
  }
})

function searchMovie() {
  if (movieQuery.value.trim() !== '') {
    adminStore.searchMovies(movieQuery.value)
  }
}

function onPriceSelected(event: any) {
  const priceId = event.target.value;
  const pricings = (adminStore.creationOptions as any)?.pricings || [];
  const selectedPriceObj = pricings.find((p: any) => p.id == priceId);
  if (selectedPriceObj) {
    form.value.format = selectedPriceObj.format;
  }
}

async function submitScreening() {
  if (!selectedMovieId.value || !form.value.room_id || !form.value.price_id || !form.value.starts_at) return;
  
  isSubmitting.value = true;
  const payload = {
    tmdb_id: selectedMovieId.value.toString(),
    room_id: Number(form.value.room_id),
    price_id: Number(form.value.price_id),
    starts_at: form.value.starts_at,
    language: form.value.language,
    format: form.value.format
  };

  const success = await adminStore.createScreening(payload);
  isSubmitting.value = false;
  
  if (success) {
    alert("Sesión creada correctamente!");
    selectedMovieId.value = null; // reset visual
  } else {
    alert("Hubo un error al crear la sesión");
  }
}

function onScreeningSelected() {
  if (selectedScreeningId.value) {
    // Si ya estabamos en una sala admin, quizas habria que hacer socket.emit('salir_admin_sesion'), 
    // pero para mantenerlo simple conectamos a la nueva
    adminStore.selectScreeningForRealTime(selectedScreeningId.value)
    
    // Avisamos a Node que como administradores queremos ver el contador de ESTA sesión
    socket.emit('unirse_admin_sesion', selectedScreeningId.value)
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.admin-container {
  padding: 2rem;
  font-family: Arial, sans-serif;
  color: white;
  background-color: #121212;
  min-height: 100vh;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}
.admin-header a {
  color: #4CAF50;
  text-decoration: none;
}

/* STATS GLOBALES */
.stats-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}
.stat-card {
  flex: 1;
  background: #1e1e1e;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}
.stat-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #aaa;
}
.stat-value {
  font-size: 2rem;
  margin: 0;
  font-weight: bold;
}
.stat-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.stat-card li {
  font-size: 1.2rem;
  font-weight: bold;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

/* SECCIONES GENÉRICAS */
h2 {
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
}
input, select {
  width: 100%;
  padding: 0.8rem;
  border-radius: 4px;
  border: 1px solid #444;
  background: #2a2a2a;
  color: white;
}
button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #45a049;
}

/* REALTIME DASHBOARD */
.empty-state {
  padding: 3rem;
  text-align: center;
  background: #1e1e1e;
  border-radius: 8px;
  color: #666;
}
.realtime-dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.live-stat {
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}
.live-stat h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  text-transform: uppercase;
}
.live-stat p {
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
}
.free { background: #1b3a20; color: #81c784; }
.temporal { background: #4a3300; color: #ffb74d; }
.sold { background: #3c1212; color: #e57373; }
.total { background: #263238; color: #90a4ae; }

/* CREATE SECTION */
.movie-results {
  display: flex;
  overflow-x: auto;
  gap: 1rem;
  padding: 1rem 0;
  margin-bottom: 1.5rem;
}
.movie-card {
  min-width: 120px;
  max-width: 120px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 5px;
  transition: 0.2s;
}
.movie-card img {
  width: 100%;
  border-radius: 4px;
}
.movie-card p {
  font-size: 0.8rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.movie-card.selected {
  border-color: #4CAF50;
  background: #1e1e1e;
}
.create-form {
  background: #1e1e1e;
  padding: 1.5rem;
  border-radius: 8px;
}
.submit-btn {
  width: 100%;
  font-size: 1.1rem;
  margin-top: 1rem;
}
</style>
