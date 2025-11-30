const jwt = require('jsonwebtoken');
const User = require('../model/User');
const authLogger = require('../help/auth/authLogger');
const systemLogger = require('../help/system/systemLogger');
const { SESSION_INACTIVITY_TIMEOUT } = require('../config');

// Middleware para extraer y verificar el usuario del token
const userExtractor = async (req, res, next) => {
  try {
    console.log('🔐 MIDDLEWARE INICIADO - Ruta:', req.path);
    console.log('🔐 Headers recibidos:', req.headers);
    console.log('🍪 Cookies recibidas:', req.cookies);
    const token = req.cookies?.accesstoken || req.headers.authorization?.split(' ')[1];
    console.log('🔐 Token extraído:', token ? 'SÍ' : 'NO');
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

    // ⭐ VERIFICAR INACTIVIDAD DEL USUARIO
    if (user.last_activity_at) {
      const lastActivity = new Date(user.last_activity_at);
      const now = new Date();
      const timeSinceActivity = now.getTime() - lastActivity.getTime();

      console.log(`⏱️ Tiempo desde última actividad: ${Math.floor(timeSinceActivity / 1000 / 60)} minutos`);

      // Si ha pasado más tiempo del permitido, cerrar sesión automáticamente
      if (timeSinceActivity > SESSION_INACTIVITY_TIMEOUT) {
        console.log('⏱️ Sesión expirada por inactividad. Cerrando sesión automáticamente...');
        
        // Cerrar sesión automáticamente
        try {
          await User.updateUserStatus(user.user_id, false);
          await authLogger.logLogout(user.user_id, req);
        } catch (error) {
          console.error('Error al cerrar sesión por inactividad:', error);
        }

        // Limpiar cookies
        res.clearCookie('accesstoken', {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict'
        });
        res.clearCookie('jwt', {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict'
        });

        await authLogger.logAccessDenied(user.user_id, req, 'Sesión expirada por inactividad');
        return res.status(401).json({ 
          error: 'Sesión expirada por inactividad - Por favor inicia sesión nuevamente',
          sessionExpired: true,
          inactivityTimeout: Math.floor(SESSION_INACTIVITY_TIMEOUT / 1000 / 60) // minutos
        });
      }
    }

    // ⭐ ACTUALIZAR ÚLTIMA ACTIVIDAD
    try {
      await User.updateLastActivity(user.user_id);
      console.log('✅ Última actividad actualizada');
    } catch (error) {
      console.error('Error actualizando última actividad:', error);
      // No bloquear la solicitud si falla la actualización
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

    console.log('🔐 Usuario adaptado:', adaptedUser);

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

      // Obtener información completa del usuario incluyendo role_id
      const user = await User.getUserById(req.user._id);
      if (!user) {
        await authLogger.logAccessDenied(req.user._id, req, 'Usuario no encontrado en autorización');
        return res.status(401).json({ error: 'Usuario no válido' });
      }

      console.log('🔐 Usuario completo para autorización:', user);
      console.log('🔐 Roles requeridos:', roles);

      // Verificar permisos basado en role_id
      const hasPermissionById = checkRolePermission(user.role_id, roles);
      console.log('🔐 Tiene permisos por ID:', hasPermissionById);
      
      // Verificar permisos por nombre de rol también
      const hasPermissionByName = roles.includes(user.role_name);
      console.log('🔐 Verificando por nombre de rol:', user.role_name, 'en:', roles, 'resultado:', hasPermissionByName);
      
      const hasPermission = hasPermissionById || hasPermissionByName;
      console.log('🔐 Tiene permisos (final):', hasPermission);
      
      if (!hasPermission) {
        await authLogger.logAccessDenied(req.user._id, req, `Intento de acceso no autorizado. Rol requerido: ${roles.join(', ')}. Rol actual: ${user.role_name} (ID: ${user.role_id})`);
        return res.status(403).json({ 
          error: `Solo usuarios con rol "${roles.join('", "')}" pueden realizar esta acción`,
          requiredRoles: roles,
          currentRole: user.role_name,
          currentRoleId: user.role_id
        });
      }

      next();
    } catch (error) {
      console.error('Error en autorización de rol:', error);
      return res.status(500).json({ error: 'Error interno al verificar permisos' });
    }
  };
};

// Función auxiliar para verificar permisos de rol
const checkRolePermission = (userRoleId, requiredRoles) => {
  console.log('🔐 checkRolePermission - userRoleId:', userRoleId, 'requiredRoles:', requiredRoles);
  
  // Mapeo de nombres de roles a IDs
  const roleMap = {
    'user': 3,
    'view': 4,
    'edit': 5,
    'admin': 6,
    'superAdmin': 7
  };

  // Convertir roles requeridos a IDs mínimos
  const requiredRoleIds = requiredRoles.map(role => roleMap[role]).filter(id => id !== undefined);
  
  console.log('🔐 requiredRoleIds:', requiredRoleIds);
  
  // Si no se encontraron roles válidos, denegar acceso
  if (requiredRoleIds.length === 0) {
    console.log('🔐 No se encontraron roles válidos');
    return false;
  }

  // Verificar si el usuario tiene al menos uno de los roles requeridos
  const minRequiredRoleId = Math.min(...requiredRoleIds);
  const hasPermission = userRoleId >= minRequiredRoleId;
  
  console.log('🔐 minRequiredRoleId:', minRequiredRoleId, 'hasPermission:', hasPermission);
  
  return hasPermission;
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