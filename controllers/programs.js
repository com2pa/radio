const programsRouter = require('express').Router();
const { userExtractor, roleAuthorization } = require('../middleware/auth');
const programsServices = require('../services/programsServices');
const systemLogger = require('../help/system/systemLogger');
const { activityLogger } = require('../middleware/activityLogger');

// Middleware para log de peticiones
const logRequest = (req, res, next) => {
    console.log(`[PROGRAMS] ${req.method} ${req.originalUrl} - User: ${req.user?.user_id || 'No auth'}`);
    next();
};

programsRouter.use(logRequest);

// GET - Obtener todos los programas con filtros (público)
programsRouter.get('/all', async (req, res) => {
    try {
        const filters = req.query;
        const result = await programsServices.getAllProgramsService(filters);
        
        // ✅ LOG: Registrar lectura de programas
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'program', 
            null, 
            req, 
            { filters, count: result.data?.length || 0 }
        );
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo programas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo programas',
            details: error.message 
        });
    }
});

// GET - Obtener programas próximos (público) - DEBE IR ANTES DE /:id
programsRouter.get('/upcoming', async (req, res) => {
    try {
        const limit = req.query.limit || 10;
        const result = await programsServices.getUpcomingProgramsService(limit);
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo programas próximos:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo programas próximos',
            details: error.message 
        });
    }
});

// GET - Obtener programa actual (público) - DEBE IR ANTES DE /:id
programsRouter.get('/current/now', async (req, res) => {
    try {
        const result = await programsServices.getCurrentProgramService();
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo programa actual:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo programa actual',
            details: error.message 
        });
    }
});

// GET - Análisis: Programas necesarios para cubrir el día - DEBE IR ANTES DE /:id
programsRouter.get('/analysis/needed/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const result = await programsServices.getProgramsNeededForDayService(date);
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo análisis de programas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo análisis de programas',
            details: error.message 
        });
    }
});

// GET - Análisis: Espacios publicitarios disponibles - DEBE IR ANTES DE /:id
programsRouter.get('/analysis/advertising-slots/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const result = await programsServices.getAvailableAdvertisingSlotsService(date);
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo espacios publicitarios:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo espacios publicitarios',
            details: error.message 
        });
    }
});

// GET - Análisis: Programas ocupados - CORREGIDO: sin parámetro opcional
programsRouter.get('/analysis/occupied', async (req, res) => {
    try {
        const date = req.query.date || null;
        const result = await programsServices.getOccupiedProgramsCountService(date);
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo programas ocupados:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo programas ocupados',
            details: error.message 
        });
    }
});

// GET - Obtener programas por tipo (público) - DEBE IR ANTES DE /:id
programsRouter.get('/type/:type', async (req, res) => {
    try {
        const programType = req.params.type;
        const result = await programsServices.getProgramsByTypeService(programType);
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo programas por tipo:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo programas por tipo',
            details: error.message 
        });
    }
});

// GET - Obtener usuarios de un programa (público) - DEBE IR ANTES DE /:id
programsRouter.get('/:id/users', async (req, res) => {
    try {
        const programId = req.params.id;
        const result = await programsServices.getProgramUsersService(programId);
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo usuarios del programa:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo usuarios del programa',
            details: error.message 
        });
    }
});

// GET - Obtener programa por ID (público) - DEBE IR AL FINAL (ruta genérica)
programsRouter.get('/:id', async (req, res) => {
    try {
        const programId = req.params.id;
        const result = await programsServices.getProgramByIdService(programId);
        
        if (result.success) {
            // ✅ LOG: Registrar lectura específica
            await systemLogger.logCrudAction(
                req.user, 
                'read', 
                'program', 
                programId, 
                req
            );
        }
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo programa:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo programa',
            details: error.message 
        });
    }
});

// POST - Crear nuevo programa (requiere autenticación y rol admin/editor)
programsRouter.post('/create', userExtractor, roleAuthorization(['admin', 'superAdmin', 'editor']), async (req, res) => {
    try {
        const userId = req.user._id;
        const programData = req.body;
        const result = await programsServices.createProgramService(programData, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar creación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'create', 
                'program', 
                result.data?.program_id, 
                req, 
                { 
                    title: programData.program_title,
                    type: programData.program_type,
                    scheduled_date: programData.scheduled_date
                }
            );
        } else {
            // ✅ LOG: Registrar error en creación
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error creando programa', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('Error creando programa:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico creando programa', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            error: 'Error creando programa',
            details: error.message 
        });
    }
});

// PUT - Actualizar programa (requiere autenticación y rol admin/editor)
programsRouter.put('/:id', userExtractor, roleAuthorization(['admin', 'superAdmin', 'editor']), async (req, res) => {
    try {
        const programId = req.params.id;
        const userId = req.user._id;
        const programData = req.body;
        const result = await programsServices.updateProgramService(programId, programData, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar actualización exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'program', 
                programId, 
                req, 
                { 
                    updated_fields: Object.keys(programData)
                }
            );
        } else {
            // ✅ LOG: Registrar error en actualización
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error actualizando programa', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error actualizando programa:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico actualizando programa', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            error: 'Error actualizando programa',
            details: error.message 
        });
    }
});

// DELETE - Eliminar programa (requiere autenticación y rol admin/superAdmin)
programsRouter.delete('/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    try {
        const programId = req.params.id;
        const userId = req.user._id;
        const result = await programsServices.deleteProgramService(programId, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar eliminación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'delete', 
                'program', 
                programId, 
                req
            );
        } else {
            // ✅ LOG: Registrar error en eliminación
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error eliminando programa', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error eliminando programa:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico eliminando programa', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            error: 'Error eliminando programa',
            details: error.message 
        });
    }
});

// POST - Agregar usuarios a un programa (requiere autenticación y rol admin/editor)
programsRouter.post('/:id/users', userExtractor, roleAuthorization(['admin', 'superAdmin', 'editor']), async (req, res) => {
    try {
        const programId = req.params.id;
        const userId = req.user._id;
        const { program_users } = req.body;
        
        if (!program_users || !Array.isArray(program_users)) {
            return res.status(400).json({
                success: false,
                message: 'Debe proporcionar un array de usuarios (program_users)'
            });
        }
        
        const result = await programsServices.addProgramUsersService(programId, program_users, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar acción
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'program_users', 
                programId, 
                req, 
                { 
                    users_added: program_users.length
                }
            );
        }
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error agregando usuarios al programa:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error agregando usuarios al programa',
            details: error.message 
        });
    }
});

// DELETE - Remover usuarios de un programa (requiere autenticación y rol admin/editor)
programsRouter.delete('/:id/users', userExtractor, roleAuthorization(['admin', 'superAdmin', 'editor']), async (req, res) => {
    try {
        const programId = req.params.id;
        const userId = req.user._id;
        const { user_ids } = req.body; // Array de IDs de usuarios a remover
        
        const result = await programsServices.removeProgramUsersService(programId, user_ids, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar acción
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'program_users', 
                programId, 
                req, 
                { 
                    users_removed: user_ids?.length || 'all'
                }
            );
        }
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error removiendo usuarios del programa:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error removiendo usuarios del programa',
            details: error.message 
        });
    }
});

module.exports = programsRouter;

