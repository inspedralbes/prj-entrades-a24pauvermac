import { io } from 'socket.io-client'

export default defineNuxtPlugin(() => {
  // Atraemos el bloque .public de la configuracion de Nuxt
  const configuracion = useRuntimeConfig()
  
  // Establecemos nuestra "antena" conectándonos ciegamente a la URL del microservicio de Node
  const comunicadorDeAsientos = io(configuracion.public.socketUrl, {
    // Configuración que garantiza más estabilidad de conexión (Obliga a intentar un WebSocket crudo primero)
    transports: ['websocket', 'polling'], 
    autoConnect: true // Siempre encendida 
  })

  console.log(`🔌 Antena Socket Cliente activada dirigiendo hacia: ${configuracion.public.socketUrl}`);

  // Esta magia devuelve todo unificado para el framework Nuxt
  return {
    provide: {
      // Esto nos permite llamar a 'const { $socket } = useNuxtApp()' en toda nuestra página!
      socket: comunicadorDeAsientos
    }
  }
})
