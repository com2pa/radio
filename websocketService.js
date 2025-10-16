/**
 * Servicio WebSocket para el Frontend - Radio Oxígeno 88.1 FM
 * Archivo: websocketService.js
 * Ubicación: src/services/websocketService.js (ajustar según tu estructura)
 */

import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAdmin = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 segundos
    
    // URL del servidor - ajustar según tu configuración
    this.serverUrl = process.env.NODE_ENV === 'production' 
      ? 'https://tu-backend-url.com' // Cambiar por tu URL de producción
      : 'http://localhost:3000';
  }

  // Conectar al servidor WebSocket
  connect() {
    if (this.socket && this.isConnected) {
      console.log('🔌 Ya conectado al servidor WebSocket');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval
      });

      this.setupEventListeners();

      // Resolver cuando se conecte
      this.socket.on('connect', () => {
        resolve();
      });

      // Rechazar si hay error de conexión
      this.socket.on('connect_error', (error) => {
        reject(error);
      });
    });
  }

  // Configurar listeners de eventos
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('🔌 Conectado al servidor WebSocket:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection-status', { 
        connected: true, 
        id: this.socket.id,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado del servidor WebSocket:', reason);
      this.isConnected = false;
      this.isAdmin = false;
      this.emit('connection-status', { 
        connected: false, 
        reason,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      this.reconnectAttempts++;
      this.emit('connection-error', { 
        error, 
        attempts: this.reconnectAttempts,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconectado al servidor WebSocket después de', attemptNumber, 'intentos');
      this.emit('reconnected', { 
        attempts: attemptNumber,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Error de reconexión WebSocket:', error);
      this.emit('reconnect-error', { 
        error,
        timestamp: new Date().toISOString()
      });
    });

    // Escuchar notificaciones del servidor
    this.socket.on('notification', (notification) => {
      console.log('📢 Notificación recibida:', notification);
      this.emit('notification', notification);
    });

    this.socket.on('new_contact', (data) => {
      console.log('📞 Nuevo contacto recibido:', data);
      this.emit('new-contact', data);
    });

    this.socket.on('connection_stats', (stats) => {
      console.log('📊 Estadísticas actualizadas:', stats);
      this.emit('connection-stats', stats);
    });
  }

  // Unirse como administrador
  joinAdmin() {
    if (!this.socket || !this.isConnected) {
      console.error('❌ No hay conexión WebSocket activa');
      return false;
    }

    this.socket.emit('join-admin');
    this.isAdmin = true;
    console.log('👤 Unido como administrador');
    this.emit('admin-status', { 
      isAdmin: true,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // Salir como administrador
  leaveAdmin() {
    if (!this.socket || !this.isConnected) {
      console.error('❌ No hay conexión WebSocket activa');
      return false;
    }

    this.socket.emit('leave-admin');
    this.isAdmin = false;
    console.log('👤 Salido como administrador');
    this.emit('admin-status', { 
      isAdmin: false,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isAdmin = false;
      console.log('🔌 Desconectado del servidor WebSocket');
    }
  }

  // Sistema de eventos personalizado
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en callback del evento ${event}:`, error);
        }
      });
    }
  }

  // Obtener estado de la conexión
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      isAdmin: this.isAdmin,
      socketId: this.socket ? this.socket.id : null,
      serverUrl: this.serverUrl,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Enviar notificación de prueba
  sendTestNotification(type = 'test', title = 'Prueba', message = 'Notificación de prueba') {
    if (!this.isConnected) {
      console.error('❌ No hay conexión WebSocket activa');
      return Promise.reject(new Error('No hay conexión WebSocket activa'));
    }

    return fetch('/api/contacts/websocket/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type, title, message })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('✅ Notificación de prueba enviada');
        return data;
      } else {
        throw new Error(data.message || 'Error enviando notificación de prueba');
      }
    })
    .catch(error => {
      console.error('❌ Error en petición de notificación de prueba:', error);
      throw error;
    });
  }

  // Obtener estadísticas del servidor
  getServerStats() {
    return fetch('/api/contacts/websocket/stats')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.message || 'Error obteniendo estadísticas');
        }
      })
      .catch(error => {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
      });
  }

  // Verificar si el servidor está disponible
  ping() {
    if (!this.socket || !this.isConnected) {
      return false;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 1000);

      this.socket.emit('ping', Date.now(), (response) => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  // Configurar reconexión automática
  enableAutoReconnect() {
    if (this.socket) {
      this.socket.io.reconnection(true);
      this.socket.io.reconnectionAttempts(this.maxReconnectAttempts);
      this.socket.io.reconnectionDelay(this.reconnectInterval);
    }
  }

  // Deshabilitar reconexión automática
  disableAutoReconnect() {
    if (this.socket) {
      this.socket.io.reconnection(false);
    }
  }
}

// Crear instancia singleton
const webSocketService = new WebSocketService();

export default webSocketService;
