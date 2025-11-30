const useRouter = require('express').Router();
const userServices = require('../services/userServices');

// obtengo todos los usuarios
useRouter.get('/', async (req, res) => {
    const result = await userServices.getAllUsers();
    return res.status(200).json({
        success: result.success,
        data: result.data,
        message: result.message
    });
})

// creando usuario
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
        return res.status(result.status).json(result);

    } catch (error) {
        console.error('Error en ruta de usuario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});
// actualizando el token
useRouter.patch('/:id/:token', async (req, res) => {
    try {
        // obtengo el token y el id por los params
        const { token, id } = req.params;
        console.log('token recibido', token);
        console.log('id recibido', id);
        
        const result = await userServices.updatedUserToken(token, id);
        
        // Siempre devolver respuesta JSON, no redirección
        return res.status(result.status).json({
            success: result.success,
            data: result.data,
            message: result.message
        });

    } catch (error) {
        console.error('Error en ruta de verificación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Actualizar rol del usuario
useRouter.put('/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const roleData = req.body;

        // Validar que el ID sea un número
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido'
            });
        }

        // Delegar la lógica de negocio al servicio
        const result = await userServices.updateUserRole(id, roleData);
        
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
// Nota: 
// - user_status: indica si el usuario está activo/inactivo (online/offline)
// - user_verify: indica si el usuario ha verificado su email


module.exports = useRouter;