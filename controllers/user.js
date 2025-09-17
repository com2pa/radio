const useRouter = require('express').Router();
const userServices = require('../services/userServices');

useRouter.post('/', async (req, res) => {
    try {
        const data = req.body;
        
        // Validar datos
        if (!data.user_name || !data.user_lastname || !data.user_email || 
            !data.user_password || !data.user_address || !data.user_phone || 
            !data.user_age) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son obligatorios' 
            });
        }

        console.log('Datos recibidos:', data);

        // Delegar la lógica de negocio al servicio
        const result = await userServices.createUser(data);
        
        // Responder según el resultado
        return res.status(result.status).json({
            success: result.success,
            data: result.data,
            message: result.message
        });

    } catch (error) {
        console.error('Error en ruta de usuario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = useRouter;