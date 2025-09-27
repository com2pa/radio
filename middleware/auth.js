const jwt = require('jsonwebtoken');
const User = require('../model/User');
const authLogger = require('../help/auth/authLogger');
const systemLogger = require('../help/system/systemLogger');

// Middleware para extraer y verificar el usuario del token
const userExtractor = async (req, res, next) => {
  try {
    // console.log('🔐 MIDDLEWARE INICIADO - Ruta:', req.path);
    // console.log('🔐 Headers recibidos:', req.headers);
    // console.log('🍪 Cookies recibidas:', req.cookies);
    const token = req.cookies?.accesstoken || req.headers.authorization?.split(' ')[1];
    // console.log('🔐 Token extraído:', token ? 'SÍ' : 'NO');
    if (!token) {
      console.log('❌ No se encontró token');
      // await authLogger.logAccessDenied(null, req, 'Token no proporcionado');
      return res.status(401).json({ error: 'Acceso no autorizado - Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.getUserById(decoded.id);

    if (!user) {
      await authLogger.logAccessDenied(null, req, 'Usuario no encontrado');
      return res.status(401).json({ error: 'Usuario no válido' });
    }

      // ⭐ ADAPTAR la estructura del usuario para que coincida con lo que espera el sistema
    const adaptedUser = {
      _id: user.user_id,           // Mongoose usa _id, PostgreSQL usa user_id
      id: user.user_id,            // Para compatibilidad
      name: user.user_name,
      email: user.user_email,
      role: user.role_name,        // ⚠️ IMPORTANTE: Usar role_name en lugar de role_id
      online: user.user_status,    // user_status en lugar de online
      verify: user.user_verify     // user_verify en lugar de verify
    };

    // console.log('🔐 Usuario adaptado:', adaptedUser);

    if (!adaptedUser.verify) {
      await authLogger.logAccessDenied(adaptedUser._id, req, 'Cuenta no verificada');
      return res.status(403).json({ error: 'Cuenta no verificada - Por favor verifica tu email' });
    }

    req.user = adaptedUser;
    next();
  } catch (error) {
    await authLogger.logAccessDenied(null, req, 'Error de autenticación: ' + error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado - Por favor inicia sesión nuevamente' });
    }
    
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar roles
const roleAuthorization = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        await authLogger.logAccessDenied(null, req, 'Intento de autorización sin autenticación');
        return res.status(401).json({ error: 'Autenticación requerida' });
      }

      if (!roles.includes(req.user.role)) {
        await authLogger.logAccessDenied(req.user._id, req, `Intento de acceso no autorizado. Rol requerido: ${roles.join(', ')}`);
        return res.status(403).json({ 
          error: 'Acceso no autorizado',
          requiredRoles: roles,
          currentRole: req.user.role
        });
      }

      next();
    } catch (error) {
      // await systemLogger.logSystemError(req.user?._id, req, 'Error en autorización de rol', error);
      return res.status(500).json({ error: 'Error interno al verificar permisos' });
    }
  };
};

// Middleware para verificar si el usuario está activo/online
const checkUserStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const user = await User.findById(req.user._id);
    if (!user.online) {
      await authLogger.logAccessDenied(req.user._id, req, 'Intento de acceso con cuenta inactiva');
      return res.status(403).json({ error: 'Tu cuenta está inactiva' });
    }

    next();
  } catch (error) {
    // await systemLogger.logSystemError(req.user?._id, req, 'Error al verificar estado de usuario', error);
    next(); // Continuar aunque falle esta verificación
  }
};

// Middleware para protección contra fuerza bruta
const rateLimiter = require('express-rate-limit');
const loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por IP
  message: async (req, res) => {
    await authLogger.logSecurityEvent(null, req, 'Demasiados intentos de login');
    return res.status(429).json({ 
      error: 'Demasiados intentos. Por favor intenta nuevamente más tarde.' 
    });
  }
});

module.exports = {
  userExtractor,
  roleAuthorization,
  checkUserStatus,
  loginLimiter
};