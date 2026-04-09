import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import redisClient from './redisClient.js';

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

// 2. LA MEMORIA LOCAL PARA RASTREAR QUÉ ASIENTOS LE PERTENECEN A CADA SOCKET
// Esta parte sigue en RAM porque el socket.id es único por conexión y no necesita
// compartirse entre instancias (cada instancia gestiona sus propios sockets)
// Ejemplo: { "socket_abc": [{ nombreSala: "sesion_14", asiento_id: 5 }] }
const dueñosDeAsientos = {};

// NOTA: Los asientos bloqueados globalmente ya NO viven aquí.
// Ahora viven en Redis (compartido) en Sets con clave "sesion_14", "sesion_22", etc.

// 3. REACCIONANDO EN TIEMPO REAL
io.on('connection', (socket) => {
  console.log(`Un navegador se ha conectado. ID interno: ${socket.id}`);

  // A. Unirse a una Sala de Película (Screening)
  socket.on('unirse_a_sesion', async (screening_id) => {
    const nombreSala = `sesion_${screening_id}`;
    socket.join(nombreSala);
    console.log(`El usuario ${socket.id} ha entrado a mirar la ${nombreSala}`);

    // Como acaba de entrar, leemos de Redis los asientos ya bloqueados y se los mandamos
    // sMembers devuelve todos los elementos del Set de Redis como un Array de strings
    const asientosActuales = await redisClient.sMembers(nombreSala);

    // Convertimos los strings a números antes de mandarlos a Nuxt
    const asientosComoNumeros = asientosActuales.map(id => parseInt(id));

    socket.emit('estado_inicial_asientos', asientosComoNumeros);
  });

  // A.2 Unirse como Administrador para ver los contadores en vivo
  socket.on('unirse_admin_sesion', async (screening_id) => {
    const nombreSalaAdmin = `sesion_${screening_id}_admin`;
    const nombreSala = `sesion_${screening_id}`;
    socket.join(nombreSalaAdmin);

    // Leemos de Redis cuántos asientos están bloqueados ahora mismo
    // sCard devuelve el número total de elementos en el Set
    const totalBloqueados = await redisClient.sCard(nombreSala);
    socket.emit('admin_temporales_update', totalBloqueados);
  });

  // B. Alguien pulsa una silla gris para hacerla verdecita
  socket.on('bloquear_asiento', async (datos) => {
    const { screening_id, asiento_id } = datos;
    const nombreSala = `sesion_${screening_id}`;

    // Comprobamos en Redis si el asiento ya está bloqueado por alguien
    // sIsMember devuelve true si el elemento existe en el Set, false si no
    const yaEstaOcupado = await redisClient.sIsMember(nombreSala, String(asiento_id));

    if (yaEstaOcupado) {
      // Lo sentimos, está ocupado: le disparamos un error SÓLO a él
      socket.emit('conflicto_asiento', asiento_id);

    } else {
      // Todo correcto: añadimos el asiento al Set de Redis
      // sAdd añade el elemento al Set (si ya existe, Redis lo ignora sin dar error)
      await redisClient.sAdd(nombreSala, String(asiento_id));

      // Guardalo también en el registro local de este socket por si huye sin pagar
      dueñosDeAsientos[socket.id] = dueñosDeAsientos[socket.id] || [];
      dueñosDeAsientos[socket.id].push({ nombreSala, asiento_id });

      // Avisa al RESTO DE LA SALA (sin avisarte a ti mismo) de que ese asiento ya no es gris
      socket.to(nombreSala).emit('asiento_bloqueado_por_otro', asiento_id);
      console.log(`🔒 Asiento [${asiento_id}] apartado en la ${nombreSala}`);

      // Leemos el recuento actualizado de Redis y avisamos al administrador
      const totalBloqueados = await redisClient.sCard(nombreSala);
      io.to(`${nombreSala}_admin`).emit('admin_temporales_update', totalBloqueados);
    }
  });

  // C. Alguien se arrepiente y hace clic de nuevo en su silla verde
  socket.on('liberar_asiento', async (datos) => {
    const { screening_id, asiento_id } = datos;
    const nombreSala = `sesion_${screening_id}`;

    // Eliminamos el asiento del Set de Redis
    // sRem elimina el elemento del Set (si no existe, no hace nada)
    await redisClient.sRem(nombreSala, String(asiento_id));

    // Lo quitamos también del registro local de este socket
    if (dueñosDeAsientos[socket.id]) {
      const misSillas = dueñosDeAsientos[socket.id];
      for (let i = 0; i < misSillas.length; i++) {
        if (misSillas[i].asiento_id === asiento_id) {
          misSillas.splice(i, 1);
          break; // Rompemos el bucle porque ya lo hemos encontrado y eliminado
        }
      }
    }

    // Gritamos al resto de la sala que pueden volver a coger esta silla (vuelve a ser gris)
    socket.to(nombreSala).emit('asiento_liberado', asiento_id);

    // Avisamos al admin del nuevo recuento
    const totalBloqueados = await redisClient.sCard(nombreSala);
    io.to(`${nombreSala}_admin`).emit('admin_temporales_update', totalBloqueados);
  });

  // D. EL CORTACIRCUITOS (Alguien cierra el navegador dándole a la 'X' o pierde el internet)
  socket.on('disconnect', async () => {
    console.log(`[DESCONEXIÓN] El usuario ${socket.id} ha cerrado la web de golpe.`);

    // Inspeccionamos si tenía asientos sin pagar en el registro local
    const susAsientos = dueñosDeAsientos[socket.id];
    if (susAsientos) {

      // Pasamos por cada silla registrada bajo su nombre
      for (let i = 0; i < susAsientos.length; i++) {
        const registro = susAsientos[i];
        const nombreSala = registro.nombreSala;
        const asiento_id = registro.asiento_id;

        // Lo eliminamos de Redis
        await redisClient.sRem(nombreSala, String(asiento_id));

        // Avisamos a todo el mundo de que este asiento vuelve a estar libre (gris)
        socket.to(nombreSala).emit('asiento_liberado', asiento_id);

        // Avisamos al admin del nuevo recuento actualizado
        const totalBloqueados = await redisClient.sCard(nombreSala);
        io.to(`${nombreSala}_admin`).emit('admin_temporales_update', totalBloqueados);
      }

      // Eliminamos el registro local de este socket
      delete dueñosDeAsientos[socket.id];
    }
  });

});

// 4. ARRANCAR EL MOTOR
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Servicio WebSocket Árbitro vigilando en el puerto ${PORT}`);
});
