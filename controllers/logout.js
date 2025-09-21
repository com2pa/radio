const logoutRouter = require('express').Router();
const { logoutService } = require('../services/logoutServices');

logoutRouter.get('/', async (req, res) => {
    try {
        const result = await logoutService(req, req.cookies);
        
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

        return res.status(result.status).json({
            success: result.success,
            message: result.message
        });

    } catch (error) {
        console.error('Error en logout router:', error);
        
        // Limpiar cookies incluso en caso de error
        res.clearCookie('accesstoken');
        res.clearCookie('jwt');
        
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = logoutRouter;