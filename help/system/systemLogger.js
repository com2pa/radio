const ActivityLog = require('../../model/activityLog');

const systemLogger = {
  /**
   * Función helper para reintentos
   */
  // logWithRetry: async function(logFn, maxRetries = 3, delay = 2000) {
  //   let attempt = 1;
  //   while (attempt <= maxRetries) {
  //     try {
  //       return await logFn();
  //     } catch (error) {
  //       if (attempt === maxRetries) throw error;
  //       console.warn(`Intento ${attempt} fallido. Reintentando en ${delay}ms...`);
  //       await new Promise(resolve => setTimeout(resolve, delay));
  //       attempt++;
  //     }
  //   }
  // },

  /**
   * Registra eventos del sistema (inicio/parada)
   * @param {String} action - Tipo de evento (system_start/system_stop)
   * @param {Object} metadata - Metadatos adicionales
   */
  logSystemEvent: async function(action, metadata = {}) {
    try {
      await this.logWithRetry(async () => {
        await ActivityLog.createActivityLog({
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
  
  /**
   * Registra errores del sistema
   * @param {Object} userId - ID del usuario (si aplica)
   * @param {Object} req - Objeto de petición Express
   * @param {String} errorMessage - Mensaje de error
   * @param {Object} error - Objeto Error completo
   */
  logSystemError: async (userId, req, description, error) => {
    try {
      await ActivityLog.createActivityLog({
        user_id: userId,
        action: 'system_error',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          method: req.method,
          path: req.path,
          description,
          error_message: error.message,
          error_stack: error.stack,
          timestamp: new Date(),
        },
      });
    } catch (logError) {
      console.error('Error registrando error del sistema:', logError);
    }
  },
};

module.exports = systemLogger;