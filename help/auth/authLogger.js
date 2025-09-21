// /help/system/systemLogger.js
const ActivityLog = require('../../model/activityLog');

const systemLogger = {
  /**
   * Registra login exitoso
   * @param {Object} user - Usuario que inició sesión
   * @param {Object} req - Objeto de petición Express
   */
  logLogin: async (user, req) => {
    try {
      await ActivityLog.createActivityLog({
        user_id: user.id,  // Cambiado de _id a id (PostgreSQL)
        user_name: user.name,  // Nuevo campo para nombre de usuario
        action: 'login',
        ip_address: req.ip,  // Cambiado a snake_case
        user_agent: req.get('User-Agent'),  // Cambiado a snake_case
        metadata: {
          method: req.method,
          path: req.path,
          email: user.email,
          name: user.name,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error registrando login:', error);
    }
  },

  /**
   * Registra logout
   * @param {ObjectId} userId - ID del usuario
   * @param {Object} req - Objeto de petición Express
   */
  logLogout: async (userId, req) => {
    try {
      await ActivityLog.create({
        user_id: userId,  // Cambiado de user a user_id
        action: 'logout',
        ip_address: req.ip,  // Cambiado a snake_case
        user_agent: req.get('User-Agent'),  // Cambiado a snake_case
        metadata: {
          method: req.method,
          path: req.path,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error registrando logout:', error);
    }
  },

  /**
   * Registra acceso denegado
   * @param {Object} user - Usuario (si existe)
   * @param {Object} req - Objeto de petición Express
   * @param {String} reason - Razón del denegado
   */
  logAccessDenied: async (user, req, reason) => {
    try {
      await ActivityLog.create({
        user_id: user?.id,  // Cambiado de _id a id y user a user_id
        action: 'access_denied',
        ip_address: req.ip,  // Cambiado a snake_case
        user_agent: req.get('User-Agent'),  // Cambiado a snake_case
        metadata: {
          method: req.method,
          path: req.path,
          reason: reason,
          attempted_email: user?.email,  // Cambiado a snake_case
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error registrando acceso denegado:', error);
    }
  },

  /**
   * Función helper para reintentos
   */
  logWithRetry: async function(logFn, maxRetries = 3, delay = 2000) {
    let attempt = 1;
    while (attempt <= maxRetries) {
      try {
        return await logFn();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        console.warn(`Intento ${attempt} fallido. Reintentando en ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
  },

  /**
   * Registra eventos del sistema (inicio/parada)
   * @param {String} action - Tipo de evento (system_start/system_stop)
   * @param {Object} metadata - Metadatos adicionales
   */
  logSystemEvent: async function(action, metadata = {}) {
    try {
      await this.logWithRetry(async () => {
        await ActivityLog.create({
          action,
          ip_address: 'system',  // Cambiado a snake_case
          metadata: {
            ...metadata,
            timestamp: new Date(),
          },
        });
      });
    } catch (error) {
      console.error(`Error crítico registrando evento del sistema (${action}):`, error);
      // Fallback: Escribir en archivo local o enviar a servicio externo
    }
  },
  

  /**
   * Registra acciones CRUD (crear, leer, actualizar, eliminar)
   * @param {Object} user - Usuario que realiza la acción
   * @param {String} action - Tipo de acción (create, read, update, delete)
   * @param {String} entityType - Tipo de entidad afectada (ej: 'Aliquot')
   * @param {String} entityId - ID de la entidad afectada
   * @param {Object} req - Objeto de petición Express
   * @param {Object} metadata - Metadatos adicionales
   */
  logCrudAction: async (
    user,
    action,
    entityType,
    entityId,
    req,
    metadata = {}
  ) => {
    try {
      // Asegúrate que action sea uno de: create, read, update, delete
      const validActions = ['create', 'read', 'update', 'delete'];
      if (!validActions.includes(action)) {
        throw new Error(`Acción CRUD no válida: ${action}`);
      }
      await ActivityLog.createActivityLog({
        user_id: user?.id,  // Cambiado de _id a id y user a user_id
        action: `${action}`,
        entity_type: entityType,  // Cambiado a snake_case
        entity_id: entityId,  // Cambiado a snake_case
        ip_address: req.ip,  // Cambiado a snake_case
        user_agent: req.get('User-Agent'),  // Cambiado a snake_case
        metadata: {
          method: req.method,
          path: req.path,
          ...metadata,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error registrando acción CRUD (${action}):`, error);
    }
  },
};

module.exports = systemLogger;