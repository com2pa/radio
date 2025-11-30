const app = require('./app')
const http = require('http');
const { Server } = require('socket.io');
const webSocketService = require('./services/websocketService');

const server = http.createServer(app);

// Configurar Socket.IO
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['https://Radio.onrender.com'])
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Permitir conexiones sin origen (móviles, Postman, etc.) solo en desarrollo
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Hacer io disponible globalmente
app.set('io', io);

// Inicializar el servicio WebSocket
webSocketService.initialize(io);

// Manejar conexiones WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Unir al cliente a la sala de administradores
  socket.join('admin-room');
  
  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
  
  // Evento para que los administradores se unan a la sala
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👤 Administrador unido a la sala:', socket.id);
  });
  
  // Evento para salir de la sala de administradores
  socket.on('leave-admin', () => {
    socket.leave('admin-room');
    console.log('👤 Administrador salió de la sala:', socket.id);
  });

  // ==================== EVENTOS PARA COMENTARIOS DE PODCASTS ====================
  
  // Evento para unirse a la sala de un podcast específico
  socket.on('join-podcast-room', (podcastId) => {
    if (!podcastId) {
      console.warn('⚠️ Intento de unirse a sala sin podcastId:', socket.id);
      return;
    }
    
    const roomName = `podcast-${podcastId}`;
    socket.join(roomName);
    console.log(`🎧 Cliente ${socket.id} se unió a la sala del podcast ${podcastId}`);
    
    // Confirmar unión a la sala
    socket.emit('joined-podcast-room', {
      podcast_id: podcastId,
      room: roomName,
      timestamp: new Date().toISOString()
    });
  });

  // Evento para salir de la sala de un podcast específico
  socket.on('leave-podcast-room', (podcastId) => {
    if (!podcastId) {
      return;
    }
    
    const roomName = `podcast-${podcastId}`;
    socket.leave(roomName);
    console.log(`🎧 Cliente ${socket.id} salió de la sala del podcast ${podcastId}`);
  });

  // Evento para dejar todas las salas de podcasts
  socket.on('leave-all-podcast-rooms', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('podcast-')) {
        socket.leave(room);
        console.log(`🎧 Cliente ${socket.id} salió de la sala ${room}`);
      }
    });
  });
});

//corriendo el servidor
server.listen(3000, () => {
  console.log('🚀 El servidor está corriendo en el puerto 3000');
  console.log('🔌 WebSocket.io configurado y listo');
});