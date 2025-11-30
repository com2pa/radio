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
      
      // Obtener user_id de diferentes formas posibles
      const userId = user?.id || user?._id || user?.user_id || null;
      
      await ActivityLog.createActivityLog({
        user_id: userId,
        action: `${action}`,
        entity_type: entityType,
        entity_id: entityId,
        ip_address: req?.ip || 'unknown',
        user_agent: req?.get('User-Agent') || null,
        metadata: {
          method: req?.method || 'UNKNOWN',
          path: req?.path || 'unknown',
          // Incluir información del usuario en metadata si está disponible
          user_email: user?.email || user?.user_email || null,
          user_name: user?.name || user?.user_name || null,
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
  logSystemError: async (userId, req, description, error = null) => {
    try {
      await ActivityLog.createActivityLog({
        user_id: userId || null,
        action: 'system_error',
        ip_address: req?.ip || 'unknown',
        user_agent: req?.get('User-Agent') || null,
        metadata: {
          method: req?.method || 'UNKNOWN',
          path: req?.path || 'unknown',
          description: description || 'Error del sistema',
          error_message: error?.message || description || 'Error desconocido',
          error_stack: error?.stack || null,
          timestamp: new Date(),
        },
      });
    } catch (logError) {
      console.error('Error registrando error del sistema:', logError);
    }
  },
  
  /**
   * Método simple para logging de información
   * @param {String} message - Mensaje a registrar
   */
  info: (message) => {
    console.log(`ℹ️ [SystemLogger] ${message}`);
  },
};

module.exports = systemLogger;