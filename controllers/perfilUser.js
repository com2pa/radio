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

// Cambiar contraseña del usuario - VERSIÓN ULTRA OPTIMIZADA
// Removido activityLogger para evitar bloqueos
perfilUserRouter.put('/profile/password', userExtractor, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const userId = req.user.id;
        const passwordData = req.body;

        // Ejecutar servicio directamente (ya tiene timeouts internos)
        const result = await userServices.changePassword(userId, passwordData);
        
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > 1000) {
            console.warn(`⚠️ [PUT /profile/password] Tardó ${elapsedTime}ms (debería ser < 500ms)`);
        }

        if (!result.success) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        // Limpiar cookies inmediatamente si requiere logout (antes de enviar respuesta)
        if (result.requiresLogout) {
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

        // ENVIAR RESPUESTA INMEDIATAMENTE (sin esperar nada más)
        res.status(200).json({
            success: true,
            message: result.message,
            requiresLogout: result.requiresLogout || false,
            data: result.data
        });
        
        // Logging asíncrono después de enviar respuesta (info es síncrono, no necesita catch)
        setImmediate(() => {
            systemLogger.info(`Usuario ${userId} cambió su contraseña`);
        });
        
        return; // Asegurar que no se ejecute nada más
        
    } catch (error) {
        const elapsedTime = Date.now() - startTime;
        console.error(`❌ [PUT /profile/password] Error después de ${elapsedTime}ms:`, error);
        
        // Manejar timeout específicamente
        if (error.message.includes('Timeout')) {
            return res.status(408).json({
                success: false,
                message: 'La operación está tomando demasiado tiempo. Por favor, intenta nuevamente.'
            });
        }
        
        // Logging asíncrono (no bloquear)
        systemLogger.logSystemError(null, req, `Error cambiando contraseña: ${error.message}`).catch(() => {});
        
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
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