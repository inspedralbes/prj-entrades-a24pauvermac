import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import redisClient from './redisClient.js';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para que Laravel notifique ventas confirmadas (actualiza el panel de admin en tiempo real)
app.post('/api/venta-confirmada', async (req, res) => {
  const { screening_id, seats_count, seats } = req.body;

  if (!screening_id || !seats_count) {
    return res.status(400).json({ error: 'Faltan datos: screening_id y seats_count' });
  }

  const nombreSalaAdmin = `sesion_${screening_id}_admin`;
  const setKey = getSetKey(screening_id);

  // Limpiar los asientos del set de Redis (ya comprados, no bloqueados)
  if (seats && Array.isArray(seats)) {
    for (const seatId of seats) {
      const bloqueoKey = getBloqueoKey(screening_id, seatId);
      await redisClient.sRem(setKey, String(seatId));
      await redisClient.del(bloqueoKey);
      console.log(`🧹 Asiento ${seatId} limpiado de Redis tras compra`);
    }
  }

  // Emitir evento a los admins monitorizando esta sesión
  io.to(nombreSalaAdmin).emit('seats_sold_update', {
    screening_id,
    seats_count,
    timestamp: Date.now()
  });

  console.log(`💰 Venta confirmada: ${seats_count} asientos en sesión ${screening_id}`);
  
  res.json({ success: true });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DUEÑOS_DE_ASIENTOS = {};
const BLOQUEO_TTL_SECONDS = 300;
const HEARTBEAT_INTERVAL_MS = 30000;

function getBloqueoKey(screeningId, asientoId) {
  return `bloqueo_${screeningId}_${asientoId}`;
}

function getSetKey(screeningId) {
  return `sesion_${screeningId}`;
}

async function iniciarBloqueo(screeningId, asientoId, socketId) {
  const setKey = getSetKey(screeningId);
  const bloqueoKey = getBloqueoKey(screeningId, asientoId);

  await redisClient.sAdd(setKey, String(asientoId));
  await redisClient.setEx(bloqueoKey, BLOQUEO_TTL_SECONDS, socketId);

  DUEÑOS_DE_ASIENTOS[socketId] = DUEÑOS_DE_ASIENTOS[socketId] || [];
  DUEÑOS_DE_ASIENTOS[socketId].push({ screeningId, asiento_id: Number(asientoId) });
}

async function liberarBloqueo(screeningId, asientoId, socketId) {
  const setKey = getSetKey(screeningId);
  const bloqueoKey = getBloqueoKey(screeningId, asientoId);

  const propietario = await redisClient.get(bloqueoKey);
  if (propietario !== socketId) {
    return false;
  }

  await redisClient.sRem(setKey, String(asientoId));
  await redisClient.del(bloqueoKey);
  return true;
}

async function obtenerAsientosBloqueados(screeningId) {
  const setKey = getSetKey(screeningId);
  const asientos = await redisClient.sMembers(setKey);
  return asientos.map(id => parseInt(id));
}

async function renovarBloqueo(screeningId, asientoId, socketId) {
  const bloqueoKey = getBloqueoKey(screeningId, asientoId);
  const propietarioActual = await redisClient.get(bloqueoKey);

  if (propietarioActual === socketId) {
    await redisClient.expire(bloqueoKey, BLOQUEO_TTL_SECONDS);
    return true;
  }
  return false;
}

io.on('connection', (socket) => {
  console.log(`Un navegador se ha conectado. ID interno: ${socket.id}`);

  socket.on('unirse_a_sesion', async (screening_id) => {
    const nombreSala = getSetKey(screening_id);
    socket.join(nombreSala);
    console.log(`El usuario ${socket.id} ha entrado a mirar la ${nombreSala}`);

    const asientosActuales = await obtenerAsientosBloqueados(screening_id);
    socket.emit('estado_inicial_asientos', asientosActuales);
  });

  socket.on('unirse_admin_sesion', async (screening_id) => {
    const nombreSalaAdmin = `sesion_${screening_id}_admin`;
    const nombreSala = getSetKey(screening_id);
    socket.join(nombreSalaAdmin);

    const totalBloqueados = await redisClient.sCard(nombreSala);
    socket.emit('admin_temporales_update', totalBloqueados);
  });

  socket.on('bloquear_asiento', async (datos) => {
    const { screening_id, asiento_id } = datos;
    const setKey = getSetKey(screening_id);

    const yaEstaOcupado = await redisClient.sIsMember(setKey, String(asiento_id));

    if (yaEstaOcupado) {
      socket.emit('conflicto_asiento', asiento_id);
    } else {
      await iniciarBloqueo(screening_id, asiento_id, socket.id);

      socket.to(setKey).emit('asiento_bloqueado_por_otro', asiento_id);
      console.log(`🔒 Asiento [${asiento_id}] apartado en la ${setKey}`);

      const totalBloqueados = await redisClient.sCard(setKey);
      io.to(`${setKey}_admin`).emit('admin_temporales_update', totalBloqueados);
    }
  });

  socket.on('liberar_asiento', async (datos) => {
    const { screening_id, asiento_id } = datos;
    const setKey = getSetKey(screening_id);

    const liberado = await liberarBloqueo(screening_id, asiento_id, socket.id);

    if (liberado && DUEÑOS_DE_ASIENTOS[socket.id]) {
      const misSillas = DUEÑOS_DE_ASIENTOS[socket.id];
      const indice = misSillas.findIndex(s => s.asiento_id === Number(asiento_id));
      if (indice !== -1) {
        misSillas.splice(indice, 1);
      }
    }

    if (liberado) {
      socket.to(setKey).emit('asiento_liberado', asiento_id);
    }

    const totalBloqueados = await redisClient.sCard(setKey);
    io.to(`${setKey}_admin`).emit('admin_temporales_update', totalBloqueados);
  });

  socket.on('heartbeat_asiento', async (datos) => {
    const { screening_id, asiento_id } = datos;
    const renovado = await renovarBloqueo(screening_id, asiento_id, socket.id);

    if (!renovado) {
      socket.emit('conflicto_asiento', asiento_id);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`[DESCONEXIÓN] El usuario ${socket.id} ha cerrado la web de golpe.`);

    const susAsientos = DUEÑOS_DE_ASIENTOS[socket.id];
    if (susAsientos) {
      for (const registro of susAsientos) {
        const { screeningId, asientoId } = registro;
        const setKey = getSetKey(screeningId);

        await liberarBloqueo(screeningId, asientoId, socket.id);

        socket.to(setKey).emit('asiento_liberado', asientoId);

        const totalBloqueados = await redisClient.sCard(setKey);
        io.to(`${setKey}_admin`).emit('admin_temporales_update', totalBloqueados);
      }

      delete DUEÑOS_DE_ASIENTOS[socket.id];
    }
  });

});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Servicio WebSocket Árbitro vigilando en el puerto ${PORT}`);
});