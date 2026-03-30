import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);

// 1. CONFIGURACIÓN DEL ÁRBITRO (SOCKET.IO)
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Permite que cualquier puerto (Nuxt) se conecte sin chocar con reglas de seguridad
    methods: ["GET", "POST"]
  }
});

// 2. LA MEMORIA RAM CENTRAL
// Guardamos una lista de qué asientos tiene la sesión ocupados
// Ejemplo visual: { "sesion_14": [ 12, 13, 20 ] }
const asientosBloqueados = {};
const dueñosDeAsientos = {}; 

// 3. REACCIONANDO EN TIEMPO REAL
io.on('connection', (socket) => {
  console.log(`Un navegador se ha conectado. ID interno: ${socket.id}`);

  // A. Unirse a una Sala de Película (Screening)
  socket.on('unirse_a_sesion', (screening_id) => {
    const nombreSala = `sesion_${screening_id}`;
    socket.join(nombreSala);
    console.log(`El usuario ${socket.id} ha entrado a mirar la ${nombreSala}`);

    // Como acaba de entrar, si ya había asientos pillados, se los enseñamos a este usuario en particular para que su pantalla se actualice al milisegundo
    if (asientosBloqueados[nombreSala]) {
      socket.emit('estado_inicial_asientos', asientosBloqueados[nombreSala]);
    }
  });

  // B. Alguien pulsa una silla gris para hacerla verdecita
  socket.on('bloquear_asiento', (datos) => {
    const { screening_id, asiento_id } = datos;
    const nombreSala = `sesion_${screening_id}`;

    // Si es el primerísimo cliente del día para esta película, inicializamos la sala en la memoria
    if (!asientosBloqueados[nombreSala]) {
      asientosBloqueados[nombreSala] = [];
    }

    // Comprobamos si alguien le ha ganado por 1 milisegundo de antelación
    if (asientosBloqueados[nombreSala].includes(asiento_id)) {
      // Lo sentimos, está ocupado: le disparamos un error SÓLO a él
      socket.emit('conflicto_asiento', asiento_id);
      
    } else {
      // Todo correcto, guardalo en la base en nombre de la sala
      asientosBloqueados[nombreSala].push(asiento_id);
      
      // Guardalo también en el registro interno de este usuario por si huye de la web sin pagar
      dueñosDeAsientos[socket.id] = dueñosDeAsientos[socket.id] || [];
      dueñosDeAsientos[socket.id].push({ nombreSala, asiento_id });

      // Y EL PASO MÁS IMPORTANTE: Avisa al RESTO DE LA SALA (sin avisarte a ti mismo) de que ese asiento ya no es gris
      socket.to(nombreSala).emit('asiento_bloqueado_por_otro', asiento_id);
      console.log(`🔒 Asiento [${asiento_id}] apartado en la ${nombreSala}`);
    }
  });

  // C. Alguien se arrepiente y hace clic de nuevo en su silla verde
  socket.on('liberar_asiento', (datos) => {
    const { screening_id, asiento_id } = datos;
    const nombreSala = `sesion_${screening_id}`;

    // Le quitamos de la lista maestra
    if (asientosBloqueados[nombreSala]) {
      
      // Buscamos en que posicion exacta del array se encuentra nuestro id de asiento y lo cortamos
      const posicionMaestra = asientosBloqueados[nombreSala].indexOf(asiento_id);
      if (posicionMaestra > -1) {
        asientosBloqueados[nombreSala].splice(posicionMaestra, 1);
      }
      
      // Lo quitamos de su cuenta corriente personal
      if (dueñosDeAsientos[socket.id]) {
         
         const misSillas = dueñosDeAsientos[socket.id];
         
         // Como es un array de objetos complejos, lo recorremos a mano buscando el que coincida
         for (let i = 0; i < misSillas.length; i++) {
           if (misSillas[i].asiento_id === asiento_id) {
             misSillas.splice(i, 1);
             break; // Rompemos el bucle porque ya lo hemos vaciado
           }
         }
      }

      // Gritamos al resto de la sala que pueden volver a coger esta silla (vuelve a ser gris)
      socket.to(nombreSala).emit('asiento_liberado', asiento_id);
    }
  });

  // D. EL CORTACIRCUITOS (Alguien cierra el navegador dándole a la 'X' o pierde el internet)
  socket.on('disconnect', () => {
    console.log(` [DESCONEXIÓN] El usuario ${socket.id} ha cerrado la web de golpe.`);

    // Inspeccionamos si tenía mercancía sin pagar en el inventario personal
    const susAsientos = dueñosDeAsientos[socket.id];
    if (susAsientos) {
        
      // Pasamos por cada silla registrada bajo su nombre usando un for tradicional
      for (let i = 0; i < susAsientos.length; i++) {
        const registro = susAsientos[i];
        const nombreSala = registro.nombreSala;
        const asiento_id = registro.asiento_id;

        if (asientosBloqueados[nombreSala]) {
          
          // Lo desvinculamos de la memoria de la pelicula
          const posicionGeneral = asientosBloqueados[nombreSala].indexOf(asiento_id);
          if (posicionGeneral > -1) {
            asientosBloqueados[nombreSala].splice(posicionGeneral, 1);
          }
          
          // Avisamos a todo el mundo de que a este usuario se le agotó el tiempo y saltan a gris
          socket.to(nombreSala).emit('asiento_liberado', asiento_id);
        }
      }

      // Eliminamos al cliente delincuente de la lista
      delete dueñosDeAsientos[socket.id];
    }
  });

});

// 4. ARRANCAR EL MOTOR
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servicio WebSocket Árbitro vigilando en el puerto ${PORT}`);
});
