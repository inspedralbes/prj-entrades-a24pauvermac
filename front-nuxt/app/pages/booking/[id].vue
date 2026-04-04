<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBookingStore } from '~/stores/useBookingStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { loadStripe } from '@stripe/stripe-js'

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

// ======================= FASE 3 STRIPE Y TEMPORIZADOR =======================
const procesandoPago = ref(false);
const mostrarPasarelaStripe = ref(false);
let instanciaStripe = null;
let elementosStripe = null;

// Variables reactivas sencillas para el temporizador
const tiempoRestante = ref(300); // 5 minutos = 300 segundos
let intervaloTemporizador = null;

const minutosFormateados = computed(() => Math.floor(tiempoRestante.value / 60));
const segundosFormateados = computed(() => {
  const segs = tiempoRestante.value % 60;
  return segs < 10 ? '0' + segs : segs;
});

function iniciarTemporizador() {
  tiempoRestante.value = 300;
  intervaloTemporizador = setInterval(() => {
    if (tiempoRestante.value > 0) {
      tiempoRestante.value--;
    } else {
      // Si el reloj llega a cero, detenemos todo y volvemos al estado inicial
      detenerTemporizador();
      alert("⚠️ El tiempo de reserva (5 min) ha expirado. Hemos liberado tus butacas para otros clientes.");
      mostrarPasarelaStripe.value = false;
      volverAlFormulario();
    }
  }, 1000); // Cada 1000ms (1 segundo)
}

function detenerTemporizador() {
  if (intervaloTemporizador) {
    clearInterval(intervaloTemporizador);
    intervaloTemporizador = null;
  }
}

async function iniciarProcesoDePago() {
  procesandoPago.value = true;
  
  // 1. Llamamos a nuestra nueva función de Pinia, pasando el precio por entrada
  const backendNosDioPermiso = await gestorDeReservas.prepararPagoConStripe(sesionSeleccionada.value.precio);
  
  if (backendNosDioPermiso) {
     // 2. Si todo fue bien, mostramos el modal visual y abrimos el reloj
     mostrarPasarelaStripe.value = true;
     iniciarTemporizador();
     
     // 3. Cargamos la librería central de Stripe con tu llave PÚBLICA (Empieza por pk_test_)
     instanciaStripe = await loadStripe('pk_test_51TH2YZFmdx0FAxJfQUEEKa3vWkVtUFCrUB9SjwCo3uZ4Bg2UNBaNTIaQYKPVpf5iYCPBWytlKCY3pt0kx4MYmGxy00UNN9uxqb'); 
     
     // 4. Le decimos a Vue que espere un poco a que el <div id="pasarela-stripe-contenedor"> aparezca en pantalla
     setTimeout(() => {
        // Configuramos los elementos pasándole el código secreto del backend
        elementosStripe = instanciaStripe.elements({ clientSecret: gestorDeReservas.clientSecretStripe });
        
        // Creamos la caja visual de la tarjeta y la incrustamos en el HTML
        const formularioTarjeta = elementosStripe.create('payment');
        formularioTarjeta.mount('#pasarela-stripe-contenedor');
     }, 200);

  } else {
     alert("Error crítico: El backend (Laravel) no nos dio autorización para abrir la pasarela. Revisa la consola o tu clave secreta de Stripe.");
  }
  
  procesandoPago.value = false;
}

// Esta función se ejecuta cuando el usuario le da al botón final de pagar con su tarjeta
async function confirmarElPagoFinal() {
   procesandoPago.value = true;
   
   // Le pedimos a Stripe que intente cobrar la tarjeta directamente sin pasar por nuestro servidor
   const resultadoDeStripe = await instanciaStripe.confirmPayment({
      elements: elementosStripe,
      redirect: 'if_required' // Importante para que no recargue la página automáticamente 
   });

   // Si la tarjeta falla (fondos insuficientes, código CVC incorrecto, caducada...)
   if (resultadoDeStripe.error) {
      alert("⚠️ Stripe ha rechazado la operación: " + resultadoDeStripe.error.message);
      procesandoPago.value = false;
   } 
   // Si el pago se efectuó correctamente...
   else {
      detenerTemporizador(); // Reloj paralizado, pago completado con exito
      alert("✅ ¡PAGO DE PRUEBA REALIZADO CON ÉXITO! Las entradas son tuyas.");
      
      // Reseteamos el sistema entero volviendo a la pantalla principal
      mostrarPasarelaStripe.value = false;
      procesandoPago.value = false;
      gestorDeReservas.clearCart();
      pasoActual.value = 1;

      // Un detalle, aquí tu Vue emitiría a tu Websocket o a tu Laravel que "Ya están compradas 100%"
   }
}

function cancelarPagoManualmente() {
  detenerTemporizador();
  mostrarPasarelaStripe.value = false;
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
             :disabled="gestorDeReservas.totalSeats !== entradasSeleccionadas || procesandoPago"
             @click="iniciarProcesoDePago"
          >
            {{ procesandoPago ? 'Conectando con Stripe de forma segura...' : `Confirmar y pagar película - ${(sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2)}€` }}
          </button>

        </div>
      </div>
    </div>

    <!-- ======================= MODAL DE PAGO (STRIPE) ========================== -->
    <div class="modal-stripe-fondo" v-if="mostrarPasarelaStripe">
      <div class="modal-stripe-contenido">
        
        <h2>🔒 Pasarela de Pago (Test Mode)</h2>
        
        <div class="temporizador-alerta">
           Tiempo restante para completar el pago: <strong>{{ minutosFormateados }}:{{ segundosFormateados }}</strong> minutos
        </div>
        
        <p>Apunto de cobrar el precio de las entradas: <strong>{{ (sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2) }}€</strong></p>
        
        <!-- Este DIV es el agujero negro donde Stripe inyectará el formulario Iframe hiper-seguro -->
        <div id="pasarela-stripe-contenedor" class="contenedor-caja-fuerte"></div>
        
        <div class="modal-botones">
          <button class="btn-cancelar" @click="cancelarPagoManualmente" :disabled="procesandoPago">Cancelar y volver a las sillas</button>
          
          <button class="btn-submit btn-finalizar" @click="confirmarElPagoFinal" :disabled="procesandoPago">
            {{ procesandoPago ? 'Procesando banco...' : 'Ejecutar cobro en tarjeta' }}
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

/* ======== ESTILOS MODAL STRIPE ======== */
.modal-stripe-fondo { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-stripe-contenido { background: white; padding: 35px; border-radius: 12px; width: 450px; color: #111827; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); text-align: left;}
.modal-stripe-contenido h2 { color: #10b981; margin-top: 0; margin-bottom: 10px; }
.contenedor-caja-fuerte { min-height: 220px; padding: 15px 0; }
.temporizador-alerta { background-color: #fee2e2; color: #b91c1c; padding: 12px; margin: 15px 0; border-radius: 6px; text-align: center; font-size: 1.1rem; border: 1px solid #f87171; }
.modal-botones { display: flex; gap: 15px; margin-top: 25px; }
.btn-cancelar { padding: 15px; width: 100%; background: #f1f5f9; color: #475569; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.btn-cancelar:hover:not(:disabled) { background: #e2e8f0; }
.btn-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
