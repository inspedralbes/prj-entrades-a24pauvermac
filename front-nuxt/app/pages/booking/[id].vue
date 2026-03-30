<script setup>
import { ref } from 'vue'

const route = useRoute()
const movieId = route.params.id

// Pedimos las sesiones usando nuestro Gestor de Comunicación
const { data: screenings, pending } = await CommunicationManager.getScreeningsByMovieId(movieId)

// Variables vacías para el formulario
const sesionSeleccionada = ref(null)
const entradasSeleccionadas = ref(1)

// Función matemática básica para entender el límite
function calcularMaximoEntradas(sesion) {
  // Si aún no han interactuado con el form, devolvemos 0
  if (sesion == null) {
    return 0;
  }

  // Tope teórico dictado por negocio (anti-reventa)
  let limite = 10;
  
  // Si quedan menos asientos del tope (ej: nos quedan 3 asientos),
  // el límite máximo ahora será ese número restante.
  if (sesion.asientos_disponibles < limite) {
    limite = sesion.asientos_disponibles;
  }

  return limite;
}
</script>

<template>
  <div class="booking-container">
    <div class="header">
      <NuxtLink to="/" class="btn-back">← Volver a la cartelera</NuxtLink>
      <h1>Comprar Entradas</h1>
      <p>Estás comprando entradas para la película con ID: <strong>{{ movieId }}</strong></p>
    </div>

    <!-- Mensaje de carga mientras llegan los datos de Laravel -->
    <div v-if="pending" class="status-box">
      Cargando sesiones disponibles...
    </div>

    <!-- Formulario de reserva -->
    <div v-else class="booking-form">
      
      <!-- Si NO conectó bien o no tiene sesiones listadas -->
      <div v-if="!screenings || screenings.length === 0" class="status-box error">
        No hay sesiones programadas para esta película actualmente.
      </div>

      <!-- El formulario real -->
      <form v-else @submit.prevent>
        
        <!-- Desplegable 1: Seleccionar sesión -->
        <div class="form-group">
          <label class="form-label">1. Selecciona una sesión:</label>
          <select v-model="sesionSeleccionada" class="form-select">
            
            <option :value="null">-- Elige una sesión --</option>
            
            <!-- Recorremos todas las sesiones recibidas de Laravel -->
            <option v-for="sesion in screenings" :key="sesion.id" :value="sesion">
              Día/Hora: {{ new Date(sesion.hora_inicio).toLocaleString('es-ES') }} | 
              Sala: {{ sesion.sala_nombre }} | 
              Formato: {{ sesion.formato }} | 
              Precio: {{ sesion.precio }}€ |
              [Quedan {{ sesion.asientos_disponibles }} asientos]
            </option>
          
          </select>
        </div>

        <!-- Desplegable 2: Activo SOLO si hay sesión seleccionada -->
        <div class="form-group" v-if="sesionSeleccionada !== null">
          <label class="form-label">2. Número de entradas a comprar:</label>
          
          <div v-if="sesionSeleccionada.asientos_disponibles === 0" class="sold-out">
            ¡Sala agotada! Lo sentimos mucho.
          </div>
          
          <select v-else v-model="entradasSeleccionadas" class="form-select">
            
            <!-- Creamos las opciones desde el 1 hasta el número máximo permitido por la función del script -->
            <option v-for="numero in calcularMaximoEntradas(sesionSeleccionada)" :key="numero" :value="numero">
              {{ numero }} entrada(s)
            </option>
            
          </select>
          
          <div class="price-summary" v-if="entradasSeleccionadas > 0 && sesionSeleccionada.asientos_disponibles > 0">
            Total a pagar: <strong>{{ (sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2) }}€</strong>
          </div>
        </div>

        <!-- Botón de compra (disabled si la sala está llena o no ha seleccionado sesión) -->
        <button 
          type="submit" 
          class="btn-submit" 
          :disabled="sesionSeleccionada === null || sesionSeleccionada.asientos_disponibles === 0"
        >
          Seleccionar asientos
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.booking-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
}

.header {
  margin-bottom: 30px;
}

h1 {
  font-size: 2rem;
  color: #111827;
  margin: 15px 0 5px;
}

.btn-back {
  display: inline-block;
  padding: 8px 16px;
  background: #e2e8f0;
  color: #475569;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
}
.btn-back:hover {
  background: #cbd5e1;
}

.booking-form {
  background: #ffffff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.status-box {
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  color: #64748b;
  border-radius: 6px;
  border: 1px dashed #cbd5e1;
}
.status-box.error {
  color: #ef4444;
  border-color: #fca5a5;
  background: #fef2f2;
}

.form-group {
  margin-bottom: 25px;
  padding: 15px;
  border-left: 4px solid #3b82f6;
  background: #f8fafc;
}

.form-label {
  display: block;
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 1.1rem;
}

.form-select {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: white;
}

.sold-out {
  color: #dc2626;
  font-weight: bold;
  padding: 10px;
  background: #fee2e2;
  border-radius: 4px;
}

.price-summary {
  margin-top: 15px;
  text-align: right;
  font-size: 1.2rem;
  color: #0f172a;
}
.price-summary strong {
  font-size: 1.5rem;
  color: #10b981;
}

.btn-submit {
  width: 100%;
  padding: 15px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}
.btn-submit:hover:not(:disabled) {
  background-color: #059669;
}
.btn-submit:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
