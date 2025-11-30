const perfilUserRouter = require('express').Router();
const { userExtractor, roleAuthorization } = require('../middleware/auth');
const userServices = require('../services/userServices');
const systemLogger = require('../help/system/systemLogger');
const { activityLogger } = require('../middleware/activityLogger');

// Obtener perfil del usuario actual
perfilUserRouter.get('/profile', userExtractor, async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('📥 [GET /profile] Obteniendo perfil para usuario ID:', userId);

        const result = await userServices.getUserProfile(userId);

        if (!result.success) {
            console.log('❌ [GET /profile] Error obteniendo perfil:', result.message);
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        console.log('✅ [GET /profile] Perfil obtenido exitosamente');
        // Agregar headers para evitar caché en desarrollo (opcional)
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.status(200).json(result);
    } catch (error) {
        console.error('❌ [GET /profile] Error:', error);
        await systemLogger.logSystemError(null, req,`Error obteniendo perfil del usuario: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
        
    }
});

// Obtener datos del perfil para edición
perfilUserRouter.get('/profile/edit', userExtractor, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await userServices.getProfileForEdit(userId);

        if (!result.success) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo datos para edición del perfil: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details:error.message
        });
    }
});

// Actualizar perfil del usuario
perfilUserRouter.put('/profile', userExtractor, activityLogger, async (req, res) => {
    try {
        const userId = req.user.id;
        const userData = req.body;

        console.log('📥 [perfilUser] Datos recibidos:', userData);
        console.log('📥 [perfilUser] User ID:', userId);

        const result = await userServices.updateUserProfile(userId, userData);

        console.log('📤 [perfilUser] Resultado de actualización:', result);

        if (!result.success) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        systemLogger.info(`Usuario ${userId} actualizó su perfil`);
        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error('❌ [perfilUser] Error:', error);
        await systemLogger.logSystemError(null, req,`Error actualizando perfil del usuario ${req.user.id}: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Cambiar contraseña del usuario
perfilUserRouter.put('/profile/password', userExtractor, activityLogger, async (req, res) => {
    try {
        const userId = req.user.id;
        const passwordData = req.body;

        console.log('🔐 [PUT /profile/password] Cambiando contraseña para usuario:', userId);

        const result = await userServices.changePassword(userId, passwordData);

        if (!result.success) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        // Si la contraseña se cambió exitosamente, cerrar sesión limpiando cookies
        if (result.requiresLogout) {
            console.log('🔐 [PUT /profile/password] Cerrando sesión después de cambiar contraseña');
            
            // Limpiar todas las cookies de autenticación
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
        }

        systemLogger.info(`Usuario ${userId} cambió su contraseña - Sesión cerrada automáticamente`);
        
        res.status(200).json({
            success: true,
            message: result.message,
            requiresLogout: result.requiresLogout || false,
            data: result.data
        });
    } catch (error) {
        console.error('❌ [PUT /profile/password] Error:', error);
        await systemLogger.logSystemError(null, req,`Error cambiando contraseña del usuario ${req.user.id}: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details:error.message
        });
    }
});

// Actualizar información específica del perfil (parcial)
perfilUserRouter.patch('/profile', userExtractor, activityLogger, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Campos permitidos para actualización desde el perfil
        const allowedFields = ['user_name', 'user_lastname', 'user_email', 'user_address', 'user_phone', 'user_age'];
        
        // Filtrar solo los campos permitidos
        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        // Si no hay campos válidos para actualizar
        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos válidos para actualizar'
            });
        }

        const result = await userServices.updateUserProfile(userId, filteredUpdates);

        if (!result.success) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        // systemLogger.info(`Usuario ${userId} actualizó parcialmente su perfil`);
        res.status(200).json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: result.data
        });
    } catch (error) {
        await systemLogger.logSystemError(null, req,`Error actualizando perfil parcial del usuario ${req.user.id}: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details:error.message
        });
    }
});

module.exports = perfilUserRouter;