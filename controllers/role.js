const roleRouter = require('express').Router();
const roleServices = require('../services/roleServices');

// obtener todos los roles
roleRouter.get('/', async (req, res) => {
    try {
        // delegar la logica de negocio al servicio
        const result = await roleServices.getAllRoles();
        // responder segun el resultado
        return res.status(result.status).json({
            success: result.success,
            data: result.data,
            message: result.message
        });
        // Validar datos
    } catch (error) {
        console.error('Error en ruta de rol:', error);
        return res.status(500).json({
            success: false, 
            message: 'Error interno del servidor'
        });
    }   
})        

// crear el rol 
roleRouter.post('/', async (req, res) => {
    try {
        const data = req.body;
        console.log('Datos recibidos:', data);
        // delegar la logica de negocio al servicio
        const result = await roleServices.createRole(data);
        // responder segun el resultado
        return res.status(result.status).json({
            success: result.success,
            data: result.data,
            message: result.message
        });
        
    } catch (error) {
        console.error('Error en ruta de rol:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }

});

// actualizar el rol al usuario
roleRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        // delegar la logica de negocio al servicio
        const result = await roleServices.updateRole(id, data);
        // responder segun el resultado
        return res.status(result.status).json({
            success: result.success,
            data: result.data,
            message: result.message
        });
    }catch(error){
        console.error('Error en ruta de rol:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
})

module.exports = roleRouter;
