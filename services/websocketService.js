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

  // ==================== MÉTODOS PARA COMENTARIOS DE PODCASTS ====================

  // Notificar nuevo comentario en un podcast
  notifyNewComment(commentData) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type: 'new_podcast_comment',
      title: '💬 Nuevo Comentario',
      message: `Nuevo comentario en el podcast "${commentData.podcast_title || 'Podcast'}"`,
      data: {
        coment_podcast_id: commentData.coment_podcast_id,
        coment_podcast_text: commentData.coment_podcast_text,
        podcast_id: commentData.podcast_id,
        user_id: commentData.user_id,
        user_name: commentData.user_name,
        user_lastname: commentData.user_lastname,
        user_email: commentData.user_email,
        parent_comment_id: commentData.parent_comment_id,
        coment_podcast_created_at: commentData.coment_podcast_created_at,
        coment_podcast_updated_at: commentData.coment_podcast_updated_at
      },
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    // Enviar a todos los usuarios que están viendo este podcast específico
    const podcastRoom = `podcast-${commentData.podcast_id}`;
    this.io.to(podcastRoom).emit('new_podcast_comment', {
      comment: commentData,
      notification: notification
    });

    // También enviar a la sala de administradores para moderación
    this.io.to('admin-room').emit('notification', notification);

    // Emitir a todos los clientes conectados (opcional, para tiempo real global)
    this.io.emit('new_podcast_comment_global', {
      podcast_id: commentData.podcast_id,
      comment: commentData,
      timestamp: new Date().toISOString()
    });

    console.log('📢 Notificación de nuevo comentario enviada:', {
      to: podcastRoom,
      podcast_id: commentData.podcast_id,
      comment_id: commentData.coment_podcast_id,
      user: `${commentData.user_name || ''} ${commentData.user_lastname || ''}`.trim()
    });
  }

  // Notificar comentario actualizado
  notifyCommentUpdated(commentData) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type: 'podcast_comment_updated',
      title: '✏️ Comentario Actualizado',
      message: `Comentario actualizado en el podcast`,
      data: {
        coment_podcast_id: commentData.coment_podcast_id,
        coment_podcast_text: commentData.coment_podcast_text,
        podcast_id: commentData.podcast_id,
        user_id: commentData.user_id,
        coment_podcast_updated_at: commentData.coment_podcast_updated_at
      },
      timestamp: new Date().toISOString(),
      priority: 'low'
    };

    // Enviar a todos los usuarios que están viendo este podcast específico
    const podcastRoom = `podcast-${commentData.podcast_id}`;
    this.io.to(podcastRoom).emit('podcast_comment_updated', {
      comment: commentData,
      notification: notification
    });

    // También a administradores
    this.io.to('admin-room').emit('notification', notification);

    console.log('📢 Notificación de comentario actualizado enviada:', {
      podcast_id: commentData.podcast_id,
      comment_id: commentData.coment_podcast_id
    });
  }

  // Notificar comentario eliminado
  notifyCommentDeleted(commentData) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type: 'podcast_comment_deleted',
      title: '🗑️ Comentario Eliminado',
      message: `Comentario eliminado del podcast`,
      data: {
        coment_podcast_id: commentData.coment_podcast_id,
        podcast_id: commentData.podcast_id,
        user_id: commentData.user_id
      },
      timestamp: new Date().toISOString(),
      priority: 'low'
    };

    // Enviar a todos los usuarios que están viendo este podcast específico
    const podcastRoom = `podcast-${commentData.podcast_id}`;
    this.io.to(podcastRoom).emit('podcast_comment_deleted', {
      comment_id: commentData.coment_podcast_id,
      podcast_id: commentData.podcast_id,
      notification: notification
    });

    // También a administradores
    this.io.to('admin-room').emit('notification', notification);

    console.log('📢 Notificación de comentario eliminado enviada:', {
      podcast_id: commentData.podcast_id,
      comment_id: commentData.coment_podcast_id
    });
  }

  // Notificar cambio de estado de comentario (moderación)
  notifyCommentStatusChanged(commentData, status) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const notification = {
      type: 'podcast_comment_status_changed',
      title: status ? '✅ Comentario Aprobado' : '🚫 Comentario Ocultado',
      message: `Comentario ${status ? 'aprobado' : 'ocultado'} por moderador`,
      data: {
        coment_podcast_id: commentData.coment_podcast_id,
        podcast_id: commentData.podcast_id,
        coment_podcast_status: status,
        coment_podcast_updated_at: commentData.coment_podcast_updated_at
      },
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    // Enviar a todos los usuarios que están viendo este podcast específico
    const podcastRoom = `podcast-${commentData.podcast_id}`;
    this.io.to(podcastRoom).emit('podcast_comment_status_changed', {
      comment_id: commentData.coment_podcast_id,
      status: status,
      podcast_id: commentData.podcast_id,
      notification: notification
    });

    // También a administradores
    this.io.to('admin-room').emit('notification', notification);

    console.log('📢 Notificación de cambio de estado de comentario enviada:', {
      podcast_id: commentData.podcast_id,
      comment_id: commentData.coment_podcast_id,
      status: status
    });
  }

  // Enviar actualización de conteo de comentarios para un podcast
  broadcastCommentCount(podcastId, count) {
    if (!this.io) {
      console.error('❌ WebSocket Service no inicializado');
      return;
    }

    const podcastRoom = `podcast-${podcastId}`;
    this.io.to(podcastRoom).emit('podcast_comment_count_updated', {
      podcast_id: podcastId,
      count: count,
      timestamp: new Date().toISOString()
    });

    console.log('📊 Conteo de comentarios actualizado:', {
      podcast_id: podcastId,
      count: count
    });
  }
}

// Crear instancia singleton
const webSocketService = new WebSocketService();

module.exports = webSocketService;
