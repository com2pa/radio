const ActivityLog = require('../../model/activityLog');

const authLogger = {
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
};

module.exports = authLogger;