const ActivityLog = require('../model/activityLog');

const activityLogger = (action, entityType = null) => {
  return async (req, res, next) => {
    try {
      const originalSend = res.send;

      res.send = function (data) {
        // Registrar después de que la respuesta se complete
        logActivity(req, res, action, entityType, data);
        originalSend.apply(res, arguments);
      };

      next();
    } catch (error) {
      console.error('Error en activityLogger middleware:', error);
      next();
    }
  };
};

async function logActivity(req, res, action, entityType, responseData) {
  try {
    // Obtener user_id correctamente (puede ser req.user.id o req.user._id dependiendo del middleware)
    const userId = req.user?.id || req.user?._id || null;
    
    // Si hay usuario pero no hay id, intentar obtenerlo de otra forma
    let finalUserId = userId;
    if (!finalUserId && req.user && req.user.user_id) {
      finalUserId = req.user.user_id;
    }

    const logData = {
      user_id: finalUserId,
      action,
      entity_type: entityType,
      ip_address: req.ip || 'unknown',
      user_agent: req.get('User-Agent'),
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        params: req.params,
        query: req.query,
        // Incluir información del usuario en metadata si está disponible
        user_email: req.user?.email || req.user?.user_email || null,
        user_name: req.user?.name || req.user?.user_name || null,
        response: responseData, // Opcional: registrar respuesta
      },
    };

    // Agregar entityId si está disponible
    if (req.params.id) logData.entity_id = req.params.id;
    if (req.body._id) logData.entity_id = req.body._id;
    if (req.body.id) logData.entity_id = req.body.id;
    if (responseData?._id) logData.entity_id = responseData._id;
    if (responseData?.id) logData.entity_id = responseData.id;

    await ActivityLog.createActivityLog(logData);
  } catch (error) {
    console.error('Error registrando actividad:', error);
  }
}

module.exports = {
  activityLogger,
  logActivity,
};
