const app = require('./app')
const http = require('http');
const { Server } = require('socket.io');
const webSocketService = require('./services/websocketService');

const server = http.createServer(app);

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // En producción, especifica el dominio de tu frontend
    methods: ["GET", "POST"]
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
});

//corriendo el servidor
server.listen(3000, () => {
  console.log('🚀 El servidor está corriendo en el puerto 3000');
  console.log('🔌 WebSocket.io configurado y listo');
});