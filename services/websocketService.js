/**
 * Servicio de WebSocket para notificaciones en tiempo real - Backend
 * Radio Oxígeno 88.1 FM
 */

class WebSocketService {
  constructor() {
    this.io = null;
  }

  // Inicializar el servicio con la instancia de Socket.IO
  initialize(io) {
    this.io = io;
    console.log('🔌 WebSocket Service inicializado');
  }

  // Enviar notificación de nuevo contacto a administradores
  notifyNewContact(contactData) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type: 'new_contact',
      title: '📞 Nuevo Mensaje de Contacto',
      message: `Nuevo mensaje de ${contactData.contact_name} ${contactData.contact_lastname}`,
      data: {
        contact_id: contactData.contact_id,
        contact_name: contactData.contact_name,
        contact_lastname: contactData.contact_lastname,
        contact_email: contactData.contact_email,
        contact_phone: contactData.contact_phone,
        contact_message: contactData.contact_message,
        contact_created_at: contactData.contact_created_at
      },
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    // Enviar a la sala de administradores
    this.io.to('admin-room').emit('notification', notification);
    
    // También enviar a todos los clientes conectados (opcional)
    this.io.emit('new_contact', {
      contact: contactData,
      notification: notification
    });

    console.log('📢 Notificación de nuevo contacto enviada:', {
      to: 'admin-room',
      contact: `${contactData.contact_name} ${contactData.contact_lastname}`,
      email: contactData.contact_email
    });
  }

  // Enviar notificación de contacto actualizado
  notifyContactUpdated(contactData) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type: 'contact_updated',
      title: '✏️ Contacto Actualizado',
      message: `Contacto de ${contactData.contact_name} ${contactData.contact_lastname} ha sido actualizado`,
      data: {
        contact_id: contactData.contact_id,
        contact_name: contactData.contact_name,
        contact_lastname: contactData.contact_lastname,
        contact_email: contactData.contact_email,
        contact_status: contactData.contact_status,
        contact_updated_at: contactData.contact_updated_at
      },
      timestamp: new Date().toISOString(),
      priority: 'low'
    };

    this.io.to('admin-room').emit('notification', notification);
    console.log('📢 Notificación de contacto actualizado enviada:', contactData.contact_id);
  }

  // Enviar notificación de contacto eliminado
  notifyContactDeleted(contactData) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type: 'contact_deleted',
      title: '🗑️ Contacto Eliminado',
      message: `Contacto de ${contactData.contact_name} ${contactData.contact_lastname} ha sido eliminado`,
      data: {
        contact_id: contactData.contact_id,
        contact_name: contactData.contact_name,
        contact_lastname: contactData.contact_lastname,
        contact_email: contactData.contact_email
      },
      timestamp: new Date().toISOString(),
      priority: 'low'
    };

    this.io.to('admin-room').emit('notification', notification);
    console.log('📢 Notificación de contacto eliminado enviada:', contactData.contact_id);
  }

  // Enviar notificación personalizada
  sendCustomNotification(type, title, message, data = {}, priority = 'medium') {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type,
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      priority
    };

    this.io.to('admin-room').emit('notification', notification);
    console.log('📢 Notificación personalizada enviada:', { type, title });
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    if (!this.io) {
      return { error: 'WebSocket Service no inicializado' };
    }

    const adminRoom = this.io.sockets.adapter.rooms.get('admin-room');
    const totalConnections = this.io.sockets.sockets.size;

    return {
      total_connections: totalConnections,
      admin_connections: adminRoom ? adminRoom.size : 0,
      timestamp: new Date().toISOString()
    };
  }

  // Enviar estadísticas a administradores
  broadcastStats() {
    if (!this.io) {
      return;
    }

    const stats = this.getConnectionStats();
    this.io.to('admin-room').emit('connection_stats', stats);
  }
}

// Crear instancia singleton
const webSocketService = new WebSocketService();

module.exports = webSocketService;
