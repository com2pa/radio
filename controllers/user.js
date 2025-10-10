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
// actualizando el token
useRouter.patch('/:id/:token', async (req, res) => {
    
    // obtengo el token por el params
    const token = req.params.token;
    console.log('token recibido', token);
    const result = await userServices.updatedUserToken(token);
    return res.status(result.status).json({
        success: result.success,
        data: result.data,
        message: result.message
    });

})

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
// terminar de definir si usar user_status o user_verify 
// para actualizar el rol del usuario

// para user_status si esta activo o inactivo
// para user_verify si esta verificado o no por email


module.exports = useRouter;