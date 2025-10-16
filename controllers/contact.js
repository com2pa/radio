const contactRouter = require('express').Router();
const contactServices = require('../services/contactServices');

// GET - Obtener todos los contactos
contactRouter.get('/', async (req, res) => {
    try {
        const result = await contactServices.getAllContacts();
        return res.status(result.status || 200).json({
            success: result.success,
            data: result.data,
            message: result.message
        });
    } catch (error) {
        console.error('Error en ruta de contactos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET - Obtener contactos activos
contactRouter.get('/active', async (req, res) => {
    try {
        const result = await contactServices.getActiveContacts();
        return res.status(result.status || 200).json({
            success: result.success,
            data: result.data,
            message: result.message
        });
    } catch (error) {
        console.error('Error en ruta de contactos activos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET - Obtener contacto por ID
contactRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await contactServices.getContactById(id);
        return res.status(result.status || 200).json({
            success: result.success,
            data: result.data,
            message: result.message
        });
    } catch (error) {
        console.error('Error en ruta de contacto por ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET - Obtener contactos por email
contactRouter.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const result = await contactServices.getContactsByEmail(email);
        return res.status(result.status || 200).json({
            success: result.success,
            data: result.data,
            message: result.message
        });
    } catch (error) {
        console.error('Error en ruta de contactos por email:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Crear contacto
contactRouter.post('/', async (req, res) => {
    try {
        const data = req.body;
        
        // Validar datos básicos
        if (!data.contact_name || !data.contact_lastname || !data.contact_email || !data.contact_message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Los campos nombre, apellido, email y mensaje son obligatorios' 
            });
        }

        console.log('Datos de contacto recibidos:', data);

        // Delegar la lógica de negocio al servicio
        const result = await contactServices.createContact(data);
        
        // Responder según el resultado
        return res.status(result.status).json(result);

    } catch (error) {
        console.error('Error en ruta de creación de contacto:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT - Actualizar contacto
contactRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Validar que el ID sea un número
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de contacto inválido'
            });
        }

        // Validar que se proporcionen datos para actualizar
        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren datos para actualizar'
            });
        }

        console.log('Actualizando contacto ID:', id, 'con datos:', data);

        // Delegar la lógica de negocio al servicio
        const result = await contactServices.updateContact(id, data);
        
        // Responder según el resultado
        return res.status(result.status).json(result);

    } catch (error) {
        console.error('Error en ruta de actualización de contacto:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PATCH - Actualizar estado del contacto
contactRouter.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validar que el ID sea un número
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de contacto inválido'
            });
        }

        // Validar que se proporcione el estado
        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El campo status es obligatorio y debe ser true o false'
            });
        }

        console.log('Actualizando estado del contacto ID:', id, 'a:', status);

        // Delegar la lógica de negocio al servicio
        const result = await contactServices.updateContactStatus(id, status);
        
        // Responder según el resultado
        return res.status(result.status).json(result);

    } catch (error) {
        console.error('Error en ruta de actualización de estado:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE - Eliminar contacto
contactRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el ID sea un número
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de contacto inválido'
            });
        }

        console.log('Eliminando contacto ID:', id);

        // Delegar la lógica de negocio al servicio
        const result = await contactServices.deleteContact(id);
        
        // Responder según el resultado
        return res.status(result.status).json(result);

    } catch (error) {
        console.error('Error en ruta de eliminación de contacto:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET - Obtener estadísticas de WebSocket
contactRouter.get('/websocket/stats', async (req, res) => {
    try {
        const stats = webSocketService.getConnectionStats();
        return res.status(200).json({
            success: true,
            data: stats,
            message: 'Estadísticas de WebSocket obtenidas exitosamente'
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de WebSocket:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Enviar notificación de prueba
contactRouter.post('/websocket/test-notification', async (req, res) => {
    try {
        const { type = 'test', title = 'Prueba', message = 'Notificación de prueba' } = req.body;
        
        webSocketService.sendCustomNotification(type, title, message, { test: true });
        
        return res.status(200).json({
            success: true,
            message: 'Notificación de prueba enviada exitosamente'
        });
    } catch (error) {
        console.error('Error enviando notificación de prueba:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = contactRouter;
