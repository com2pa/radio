const Advertising = require('express').Router();
const { roleAuthorization, userExtractor } = require('../middleware/auth');
const systemLogger = require('../help/system/systemLogger');
const AdvertisingServices = require('../services/advertisingServices');

// Obtener todas las publicidades
Advertising.get('/all', async (req, res) => {
    try {
        const result = await AdvertisingServices.getAllAdvertising();
        
        // ✅ LOG: Registrar lectura de publicidades
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'advertising', 
            null, 
            req, 
            { count: result.data?.length || 0 }
        );
        
        res.status(result.status || 200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo publicidades: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo publicidades', 
            details: error.message 
        });
    }
});

// Obtener publicidades activas
Advertising.get('/active', async (req, res) => {
    try {
        const result = await AdvertisingServices.getActiveAdvertising();
        res.status(result.status || 200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo publicidades activas: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo publicidades activas', 
            details: error.message 
        });
    }
});

// Obtener una publicidad por ID
Advertising.get('/:id', async (req, res) => {
    const advertisingId = req.params.id;
    try {
        const result = await AdvertisingServices.getAdvertisingById(advertisingId);
        
        if (result.success) {
            // ✅ LOG: Registrar lectura específica
            await systemLogger.logCrudAction(
                req.user, 
                'read', 
                'advertising', 
                advertisingId, 
                req
            );
        }
        
        if (!result.success) {
            return res.status(result.status || 404).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo publicidad: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo publicidad', 
            details: error.message 
        });
    }
});

// Obtener publicidades por email
Advertising.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const result = await AdvertisingServices.getAdvertisingByEmail(email);
        res.status(result.status || 200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo publicidades por email: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo publicidades por email', 
            details: error.message 
        });
    }
});

// Obtener publicidades por RIF
Advertising.get('/rif/:rif', async (req, res) => {
    try {
        const { rif } = req.params;
        const result = await AdvertisingServices.getAdvertisingByRif(rif);
        res.status(result.status || 200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo publicidades por RIF: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo publicidades por RIF', 
            details: error.message 
        });
    }
});

// Crear una nueva publicidad (solo admin y superAdmin)
Advertising.post('/create', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const userId = req.user.id; // Obtenemos el ID del usuario autenticado
    
    try {
        const result = await AdvertisingServices.createAdvertising(req.body, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar creación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'create', 
                'advertising', 
                result.data?.advertising_id, 
                req, 
                { 
                    company_name: req.body.company_name,
                    rif: req.body.rif,
                    start_date: req.body.start_date,
                    end_date: req.body.end_date
                }
            );
        } else {
            // ✅ LOG: Registrar error en creación
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error creando publicidad', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.status || 201).json(result);
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error creando publicidad: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error creando publicidad', 
            details: error.message 
        });
    }
});

// Actualizar una publicidad (solo admin y superAdmin)
Advertising.put('/update/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const advertisingId = req.params.id;
    
    try {
        const result = await AdvertisingServices.updateAdvertising(advertisingId, req.body);
        
        if (result.success) {
            // ✅ LOG: Registrar actualización exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'advertising', 
                advertisingId, 
                req, 
                { 
                    updated_fields: Object.keys(req.body),
                    company_name: req.body.company_name || result.data?.company_name
                }
            );
        } else {
            // ✅ LOG: Registrar error en actualización
            await systemLogger.logSystemError(
                req.user?.id, 
                req, 
                'Error actualizando publicidad', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.status || 200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error actualizando publicidad: ${error.message}`);
        
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando publicidad', 
            details: error.message 
        });
    }
});

// Actualizar estado de una publicidad (solo admin y superAdmin)
Advertising.patch('/update/:id/status', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const advertisingId = req.params.id;
    const { status } = req.body;
    
    try {
        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El campo status es obligatorio y debe ser true o false'
            });
        }

        const result = await AdvertisingServices.updateAdvertisingStatus(advertisingId, status);
        
        if (result.success) {
            // ✅ LOG: Registrar actualización de estado
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'advertising', 
                advertisingId, 
                req, 
                { 
                    status_change: status,
                    action: 'status_update'
                }
            );
        } else {
            // ✅ LOG: Registrar error en actualización de estado
            await systemLogger.logSystemError(
                req.user?.id, 
                req, 
                'Error actualizando estado de publicidad', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.status || 200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error actualizando estado de publicidad: ${error.message}`);
        
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando estado de publicidad', 
            details: error.message 
        });
    }
});

// Eliminar una publicidad (solo admin y superAdmin)
Advertising.delete('/delete/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const advertisingId = req.params.id;
    
    try {
        const result = await AdvertisingServices.deleteAdvertising(advertisingId);
        
        if (result.success) {
            // ✅ LOG: Registrar eliminación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'delete', 
                'advertising', 
                advertisingId, 
                req,
                {
                    company_name: result.data?.company_name || 'N/A'
                }
            );
        } else {
            // ✅ LOG: Registrar error en eliminación
            await systemLogger.logSystemError(
                req.user?.id, 
                req, 
                'Error eliminando publicidad', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.status || 200).json(result);
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error eliminando publicidad: ${error.message}`);
        
        res.status(500).json({ 
            success: false,
            error: 'Error eliminando publicidad', 
            details: error.message 
        });
    }
});

module.exports = Advertising;

