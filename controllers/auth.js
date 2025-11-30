const authRouter = require('express').Router();
const userServices = require('../services/userServices');
const systemLogger = require('../help/system/systemLogger');

// Verificar correo para recuperación de contraseña (sin autenticación)
authRouter.post('/verify-email-for-password-reset', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                verified: false,
                message: 'El correo electrónico es requerido'
            });
        }

        const result = await userServices.verifyEmailForPasswordReset(email.trim());

        return res.status(result.status).json({
            success: result.success,
            verified: result.verified || false,
            message: result.message
        });

    } catch (error) {
        console.error('Error en verify-email-for-password-reset:', error);
        await systemLogger.logSystemError(null, req, `Error verificando correo para recuperación: ${error.message}`);
        return res.status(500).json({
            success: false,
            verified: false,
            message: 'Error al verificar el correo'
        });
    }
});

// Resetear contraseña sin autenticación (solo con email verificado)
authRouter.put('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'El correo y la nueva contraseña son requeridos'
            });
        }

        const result = await userServices.resetPasswordByEmail(email.trim(), newPassword);

        if (!result.success) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        await systemLogger.logSystemError(null, req, `Contraseña restablecida para usuario con email: ${email}`);
        
        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error en reset-password:', error);
        await systemLogger.logSystemError(null, req, `Error reseteando contraseña: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Error al cambiar la contraseña'
        });
    }
});

module.exports = authRouter;

