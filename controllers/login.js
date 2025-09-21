const loginRouter = require('express').Router();
const { loginService } = require('../services/loginServices');


loginRouter.post('/', async (req, res) => {
    try {
        const data = {
            user_email: req.body.user_email,
            user_password: req.body.user_password
        };

        // Delegar la lógica de negocio al servicio
        const result = await loginService(data, req); // ← Pasar req

        // Manejar la cookie desde el router
        if (result.success && result.cookieOptions) {
            res.cookie('accesstoken', result.accesstoken, result.cookieOptions);
        }

        // Enviar respuesta
        return res.status(200).json(result);

    } catch (error) {
        console.error('Error en login router:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = loginRouter;