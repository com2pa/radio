// /help/system/systemLogger.js
const ActivityLog = require('../../model/activityLog');

const  authLogger= {


  /**
   * Registra intento fallido de login
   * @param {String} email - Email utilizado
   * @param {Object} req - Objeto de petición Express
   * @param {String} reason - Razón del fallo
   */
  logFailedAttempt: async (email, req, reason) => {
    try {
      await ActivityLog.createActivityLog({
        action: 'login_failed',
        ip_address: req.ip, // Cambiado a snake_case
        user_agent: req.get('User-Agent'), // Cambiado a snake_case
        metadata: {
          attempted_email: email, // Cambiado a snake_case
          method: req.method,
          path: req.path,
          reason: reason,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error registrando intento fallido:', error);
    }
  },
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
      await ActivityLog.createActivityLog({
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
      await ActivityLog.createActivityLog({
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

  
};

module.exports = authLogger;