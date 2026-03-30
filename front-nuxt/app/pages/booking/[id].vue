<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBookingStore } from '~/stores/useBookingStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// 1. Invocamos nuestro plugin secreto .client ("walkie talkie" hacia Node)
const nuxtApp = useNuxtApp()
const $socket = nuxtApp.$socket

const route = useRoute()
const movieId = route.params.id

const { data: screenings, pending } = await CommunicationManager.getScreeningsByMovieId(movieId)

const gestorDeReservas = useBookingStore()
const sesionSeleccionada = ref(null)
const entradasSeleccionadas = ref(1)

const pasoActual = ref(1) 

// ======================= FASE 3 WEBSOCKETS =======================

// Al entrar visualmente a la sala oscura en la pantalla...
function irAlPasoDeAsientos() {
  pasoActual.value = 2; 

  // Si tenemos señal del servidor de Node.js, emitimos nuestra intención de "Unirnos" a su cuarto virtual.
  if ($socket) {
    $socket.emit('unirse_a_sesion', sesionSeleccionada.value.id);
  }
}

function volverAlFormulario() {
  pasoActual.value = 1; 
  gestorDeReservas.clearCart(); 
  
  // Un pequeño truco que emite un falso disconnect para liberar bloqueos temporalmente cuando nos cansamos de comprar. 
  // Node automáticamente liberará nuestros asientos cuando reciba esto.
  if ($socket) { $socket.emit('liberar_asiento', { screening_id: sesionSeleccionada.value.id, asiento_id: -1 }); }
}

onMounted(() => {
  // Solo enganchamos las antenas receptoras si el enchufe (Plugin) está encendido
  if (!$socket) return;

  // Escucha A: "Acabas de entrar y la sala está así:"
  $socket.on('estado_inicial_asientos', (listaSillasAmarillas) => {
    gestorDeReservas.setInitialLockedSeats(listaSillasAmarillas);
  });

  // Escucha B: "Has chocado de manera idéntica contra otro cliente"
  $socket.on('conflicto_asiento', (asiento_id) => {
    alert("¡Uy! Ese asiento justo acaba de ser agarrado por otra persona ahora mismo.");
    // Metemos este asiento a la fuerza en el corral de "Cosas de la Competencia" (amarillo)
    gestorDeReservas.addLockedSeat(asiento_id);
  });

  // Escucha C: "Otra persona ha marcado un asiento en su casa"
  $socket.on('asiento_bloqueado_por_otro', (asiento_id) => {
    gestorDeReservas.addLockedSeat(asiento_id);
  });

  // Escucha D: "Alguien se ha liberado"
  $socket.on('asiento_liberado', (asiento_id) => {
    gestorDeReservas.releaseLockedSeat(asiento_id);
  });
});

// Limitar pérdidas de memoria cerrando las antenas al abandonar la página por completo
onUnmounted(() => {
  if ($socket) {
    $socket.off('estado_inicial_asientos');
    $socket.off('conflicto_asiento');
    $socket.off('asiento_bloqueado_por_otro');
    $socket.off('asiento_liberado');
  }
  gestorDeReservas.clearCart()
})
// =================================================================

const mapaDeAsientos = computed(() => {
  if (sesionSeleccionada.value == null) return [];

  let capacidadMaxima = sesionSeleccionada.value.capacidad_total;
  let mapaFinal = [];
  let numeroAsientoGlobal = 1;
  let idLetraFila = 65; 

  let asientosPorFila = 16; 

  while (numeroAsientoGlobal <= capacidadMaxima) {
    let nuevaFila = {
      letra: String.fromCharCode(idLetraFila),
      asientos: []
    };

    for (let asientoSuelto = 1; asientoSuelto <= asientosPorFila; asientoSuelto++) {
      if (numeroAsientoGlobal > capacidadMaxima) break; 

      let infoAsiento = {
        id: numeroAsientoGlobal,
        numero: asientoSuelto,
        esPasilloInterno: false
      };

      if (asientoSuelto === 4 || asientoSuelto === 12) {
        infoAsiento.esPasilloInterno = true;
      }

      nuevaFila.asientos.push(infoAsiento);
      numeroAsientoGlobal = numeroAsientoGlobal + 1;
    }

    mapaFinal.push(nuevaFila);
    idLetraFila = idLetraFila + 1;
  }
  return mapaFinal.reverse();
})

// LOGICA COMBINADA PINIA + SOCKET AL HACER CLIC
function hacerClicEnAsiento(asiento_id) {
  
  // 1. Comprobamos si es un sitio inviable (Amarillo de otra persona o Rojo comprado antes)
  if (esAsientoOcultoOdeOtro(asiento_id)) {
    return; // Paramos de ejecutar inmediatamente (no se puede pinchar aire)
  }

  // 2. Control anti-abuso local de entradas
  const yaEstabaVerde = esAsientoSeleccionado(asiento_id);
  
  if (yaEstabaVerde === false && gestorDeReservas.totalSeats >= entradasSeleccionadas.value) {
    alert(`Solo has pagado por ${entradasSeleccionadas.value} entradas. Deselecciona algún asiento verde primero si quieres cambiarlo.`);
    return; 
  }

  // 3. Modificamos Pinia temporal en el cliente
  const seQuedoVerdeOSeQuedoGris = gestorDeReservas.toggleSeat(asiento_id)
  
  // 4. Se lo susurramos inmediatamente a Node por el tunel subterráneo
  if ($socket) {
     if (seQuedoVerdeOSeQuedoGris === true) {
       $socket.emit('bloquear_asiento', { 
         screening_id: sesionSeleccionada.value.id, 
         asiento_id: asiento_id 
       });
     } else {
       // El usuario se cansó del asiento y le dio clic de nuevo (ahora gris)
       $socket.emit('liberar_asiento', { 
         screening_id: sesionSeleccionada.value.id, 
         asiento_id: asiento_id 
       });
     }
  }
}

// Devuelve TRUE solo para que el CSS sepa pintar de Verde
function esAsientoSeleccionado(asiento_id) {
  if (gestorDeReservas.selectedSeats.indexOf(asiento_id) > -1) {
    return true;
  }
  return false;
}

// Devuelve TRUE solo si la antena Pinia indica que el asiento es Amarillo de otra persona
function esAsientoOcultoOdeOtro(asiento_id) {
  if (gestorDeReservas.lockedByOthers.indexOf(asiento_id) > -1) {
    return true;
  }
  return false;
}

function calcularMaximoEntradas(sesion) {
  if (sesion == null) return 0;
  
  let limite = 10;
  if (sesion.asientos_disponibles < limite) {
    limite = sesion.asientos_disponibles;
  }
  return limite;
}
</script>

<template>
  <div class="booking-container">
    
    <div class="header">
      <button v-if="pasoActual === 2" @click="volverAlFormulario" class="btn-back">← Volver a modificar sesión</button>
      <NuxtLink v-else to="/" class="btn-back">← Volver a la cartelera</NuxtLink>
      
      <h1>Comprar Entradas</h1>
      <p>Estás comprando entradas para la película con ID: <strong>{{ movieId }}</strong></p>
    </div>

    <div v-if="pending" class="status-box">
      Cargando sesiones disponibles...
    </div>

    <div v-else class="booking-form">
      <div v-if="!screenings || screenings.length === 0" class="status-box error">
        No hay sesiones programadas para esta película actualmente.
      </div>

      <div v-else>
        <!-- ======================= PASO 1 ========================== -->
        <form v-if="pasoActual === 1" @submit.prevent="irAlPasoDeAsientos">
          
          <div class="form-group">
            <label class="form-label">1. Selecciona una sesión:</label>
            <select v-model="sesionSeleccionada" class="form-select">
              <option :value="null">-- Elige una sesión --</option>
              <option v-for="sesion in screenings" :key="sesion.id" :value="sesion">
                Día/Hora: {{ new Date(sesion.hora_inicio).toLocaleString('es-ES') }} | 
                Sala: {{ sesion.sala_nombre }} | 
                [Quedan {{ sesion.asientos_disponibles }} libres]
              </option>
            </select>
          </div>

          <div class="form-group" v-if="sesionSeleccionada !== null">
            <label class="form-label">2. Número de entradas a comprar:</label>
            
            <div v-if="sesionSeleccionada.asientos_disponibles === 0" class="sold-out">
              ¡Sala agotada! Lo sentimos mucho.
            </div>
            
            <select v-else v-model="entradasSeleccionadas" class="form-select">
              <option v-for="numero in calcularMaximoEntradas(sesionSeleccionada)" :key="numero" :value="numero">
                {{ numero }} entrada(s)
              </option>
            </select>
            
            <div class="price-summary" v-if="entradasSeleccionadas > 0 && sesionSeleccionada.asientos_disponibles > 0">
              Total a pagar en Fase 2: <strong>{{ (sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2) }}€</strong>
            </div>
          </div>

          <button 
             type="submit" 
             class="btn-submit" 
             :disabled="sesionSeleccionada === null || sesionSeleccionada.asientos_disponibles === 0"
          >
            Seleccionar los asientos
          </button>
        </form>

        <!-- ======================= PASO 2 ========================== -->
        <div class="sala-container" v-if="pasoActual === 2">
          
          <div class="sala-header">
             <h2>Por favor, selecciona {{ entradasSeleccionadas }} asientos</h2>
             <p class="contador-asientos" :class="{ 'contador-listo': gestorDeReservas.totalSeats === entradasSeleccionadas }">
                Llevas: {{ gestorDeReservas.totalSeats }} / {{ entradasSeleccionadas }}
             </p>
          </div>
          
          <div class="grid-asientos">
            <div class="fila" v-for="fila in mapaDeAsientos" :key="fila.letra">
              
              <div class="letra-fila">{{ fila.letra }}</div>
              
              <div class="asientos-wrapper">
                <div 
                  v-for="asiento in fila.asientos" 
                  :key="asiento.id"
                  class="contenedor-asiento"
                  :class="{ 'con-pasillo': asiento.esPasilloInterno }"
                >
                  <FontAwesomeIcon 
                    :icon="['fas', 'couch']" 
                    class="icono-asiento"
                    :class="{ 
                      'seleccionado': esAsientoSeleccionado(asiento.id),
                      'en-espera': esAsientoOcultoOdeOtro(asiento.id)
                    }"
                    @click="hacerClicEnAsiento(asiento.id)"
                  />
                </div>
              </div>

            </div>
          </div>
          
          <div class="pantalla-cine">Pantalla</div>
          
          <!-- LEYENDA COMPLETADA -->
          <div class="leyenda">
             <div class="item-leyenda"><FontAwesomeIcon :icon="['fas', 'couch']" class="ley-seleccionado" /> Míos</div>
             <div class="item-leyenda"><FontAwesomeIcon :icon="['fas', 'couch']" class="ley-espera" /> Observando</div>
             <div class="item-leyenda"><FontAwesomeIcon :icon="['fas', 'couch']" class="ley-ocupado" /> Vendido</div>
             <div class="item-leyenda"><FontAwesomeIcon :icon="['fas', 'couch']" class="ley-disponible" /> Libres</div>
          </div>

          <button 
             class="btn-submit btn-finalizar mt-4" 
             :disabled="gestorDeReservas.totalSeats !== entradasSeleccionadas"
             @click="alert('¡Boton funcionando! Redirigiendo a pago y limpiando asientos.')"
          >
            Confirmar y pagar película - {{ (sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2) }}€
          </button>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.booking-container { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif; color: #333; }
.header { margin-bottom: 30px; }
h1 { font-size: 2rem; color: #111827; margin: 15px 0 5px; }
.btn-back { display: inline-block; padding: 8px 16px; background: #e2e8f0; color: #475569; text-decoration: none; border-radius: 6px; font-weight: bold; cursor: pointer; border: none; font-size: 1rem;}
.btn-back:hover { background: #cbd5e1; }
.booking-form { background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }

.status-box { padding: 20px; text-align: center; background: #f8fafc; color: #64748b; border-radius: 6px; border: 1px dashed #cbd5e1; }
.form-group { margin-bottom: 25px; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
.form-label { display: block; font-weight: bold; margin-bottom: 10px; }
.form-select { width: 100%; padding: 12px; font-size: 1rem; border: 1px solid #cbd5e1; border-radius: 6px; background: white; }
.price-summary { margin-top: 15px; text-align: right; font-size: 1.2rem; color: #0f172a; }
.price-summary strong { font-size: 1.5rem; color: #10b981; }

.btn-submit { width: 100%; padding: 15px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-submit:hover:not(:disabled) { background-color: #2563eb; }
.btn-submit:disabled { background-color: #94a3b8; cursor: not-allowed; opacity: 0.7; }

.mt-4 { margin-top: 40px; }
.btn-finalizar { background-color: #10b981; } 
.btn-finalizar:hover:not(:disabled) { background-color: #059669; }

.sala-container {
  padding: 40px 30px;
  background-color: #1e2028; 
  border-radius: 8px;
  margin-bottom: 25px;
  text-align: center;
  color: white;
}

.sala-header { margin-bottom: 30px; }
.sala-header h2 { margin: 0; color: #fff; font-size: 1.4rem; }
.contador-asientos { font-weight: bold; color: #cbd5e1; font-size: 1.1rem; margin-top: 10px; }
.contador-asientos.contador-listo { color: #4ade80; }

.pantalla-cine {
  margin: 50px auto 0;
  padding: 10px;
  background: linear-gradient(180deg, #4ade8020 0%, transparent 100%);
  border-top: 4px solid #4ade80; 
  color: #4ade80;
  letter-spacing: 2px;
  font-weight: bold;
  border-radius: 5px 5px 0 0;
  width: 60%;
  text-transform: uppercase;
}

.grid-asientos { display: flex; flex-direction: column; gap: 15px; }
.fila { display: flex; align-items: center; justify-content: center; gap: 15px; }
.letra-fila { color: #64748b; font-weight: bold; width: 20px; text-align: left; font-size: 0.9rem; }
.asientos-wrapper { display: flex; gap: 8px; }
.contenedor-asiento { display: flex; }
.con-pasillo { margin-right: 40px; }

.icono-asiento {
  font-size: 1.6rem;
  color: #3b4252; 
  cursor: pointer;
  transition: transform 0.1s, color 0.1s;
}

.icono-asiento:hover { transform: translateY(-3px); color: #6ee7b7; }
.icono-asiento.seleccionado { color: #4ade80; }

/* ======== NUEVOS ESTILOS INTERACTIVOS (FASE WESBSOCKET) ======== */
.icono-asiento.en-espera { 
  color: #f59e0b; 
  pointer-events: none; /* Te corta el clic físico del ratón para sillas amarrillas */
}
.icono-asiento.ocupado { 
  color: #ef4444; 
  pointer-events: none; 
}

.leyenda {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
  font-size: 0.9rem;
}

.item-leyenda { display: flex; align-items: center; gap: 10px; }

.ley-seleccionado { color: #4ade80; }
.ley-disponible   { color: #3b4252; }
.ley-espera       { color: #f59e0b; }
.ley-ocupado      { color: #ef4444; }
</style>
