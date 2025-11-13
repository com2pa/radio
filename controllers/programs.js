const programsRouter = require('express').Router();
const { userExtractor, roleAuthorization } = require('../middleware/auth');
const programsServices = require('../services/programsServices');
const systemLogger = require('../help/system/systemLogger');
const { activityLogger } = require('../middleware/activityLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'programs');
    // Crear directorio si no existe
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'program-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Solo JPG/PNG permitidos'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Servicio auxiliar para manejar la imagen
const handleImageUpload = (req, res, next) => {
    if (req.file) {
        // Guardar solo el nombre del archivo en la base de datos
        req.body.program_image = req.file.filename;
    }
    next();
};

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
programsRouter.post('/create', 
    userExtractor, 
    roleAuthorization(['admin', 'superAdmin', 'editor']), 
    upload.single('program_image'), 
    handleImageUpload,
    async (req, res) => {
    try {
        const userId = req.user._id;
        const programData = req.body;
        const file = req.file;
        
        // Si se subió una imagen pero falla la validación, eliminar el archivo
        const cleanupFile = () => {
            if (file) {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Error eliminando archivo:', err);
                }
            }
        };
        
        // Parsear program_users si viene como string JSON (cuando se envía con FormData)
        if (programData.program_users && typeof programData.program_users === 'string') {
            try {
                programData.program_users = JSON.parse(programData.program_users);
            } catch (error) {
                console.error('Error parseando program_users:', error);
                cleanupFile();
                return res.status(400).json({
                    success: false,
                    message: 'Error al procesar los usuarios del programa. Formato inválido.',
                    data: null
                });
            }
        }
        
        // Convertir duration_minutes a número si viene como string
        if (programData.duration_minutes && typeof programData.duration_minutes === 'string') {
            programData.duration_minutes = parseInt(programData.duration_minutes);
        }
        
        // Convertir podcast_id a número si viene como string
        if (programData.podcast_id && typeof programData.podcast_id === 'string') {
            programData.podcast_id = parseInt(programData.podcast_id);
        }
        
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
                    scheduled_date: programData.scheduled_date,
                    has_image: !!file
                }
            );
        } else {
            // Si falla la creación, eliminar la imagen subida
            cleanupFile();
            
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
        
        // Eliminar archivo si existe
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error eliminando archivo:', err);
            }
        }
        
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
programsRouter.put('/:id', 
    userExtractor, 
    roleAuthorization(['admin', 'superAdmin', 'editor']), 
    upload.single('program_image'), 
    handleImageUpload,
    async (req, res) => {
    try {
        const programId = req.params.id;
        const userId = req.user._id;
        const programData = req.body;
        const file = req.file;
        
        // Si se subió una nueva imagen, obtener la imagen anterior para eliminarla
        let oldImagePath = null;
        if (file) {
            try {
                const currentProgram = await programsServices.getProgramByIdService(programId);
                if (currentProgram.success && currentProgram.data?.program_image) {
                    oldImagePath = path.join(__dirname, '..', 'uploads', 'programs', currentProgram.data.program_image);
                }
            } catch (err) {
                console.error('Error obteniendo programa actual:', err);
            }
        }
        
        // Parsear program_users si viene como string JSON (cuando se envía con FormData)
        if (programData.program_users && typeof programData.program_users === 'string') {
            try {
                programData.program_users = JSON.parse(programData.program_users);
            } catch (error) {
                console.error('Error parseando program_users:', error);
                // Si falla la actualización, eliminar la nueva imagen subida
                if (file) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (err) {
                        console.error('Error eliminando archivo:', err);
                    }
                }
                return res.status(400).json({
                    success: false,
                    message: 'Error al procesar los usuarios del programa. Formato inválido.',
                    data: null
                });
            }
        }
        
        // Convertir duration_minutes a número si viene como string
        if (programData.duration_minutes !== undefined && programData.duration_minutes !== null) {
            if (typeof programData.duration_minutes === 'string') {
                programData.duration_minutes = programData.duration_minutes === '' ? null : parseInt(programData.duration_minutes);
            }
        }
        
        // Convertir podcast_id a número si viene como string
        if (programData.podcast_id !== undefined && programData.podcast_id !== null) {
            if (typeof programData.podcast_id === 'string') {
                programData.podcast_id = programData.podcast_id === '' ? null : parseInt(programData.podcast_id);
            }
        }
        
        // Limpiar strings vacíos y convertirlos a null
        if (programData.tiktok_live_url === '') programData.tiktok_live_url = null;
        if (programData.instagram_live_url === '') programData.instagram_live_url = null;
        if (programData.program_description === '') programData.program_description = null;
        
        // Validar y formatear scheduled_date si viene como string
        if (programData.scheduled_date !== undefined && programData.scheduled_date !== null && programData.scheduled_date !== '') {
            // Si viene como string, asegurarse de que esté en formato ISO
            if (typeof programData.scheduled_date === 'string') {
                try {
                    const date = new Date(programData.scheduled_date);
                    if (isNaN(date.getTime())) {
                        console.error('❌ Fecha inválida recibida:', programData.scheduled_date);
                        programData.scheduled_date = undefined; // No actualizar si es inválida
                    } else {
                        programData.scheduled_date = date.toISOString();
                    }
                } catch (error) {
                    console.error('❌ Error procesando scheduled_date:', error);
                    programData.scheduled_date = undefined;
                }
            }
        } else if (programData.scheduled_date === '') {
            // Si viene como string vacío, no actualizar
            programData.scheduled_date = undefined;
        }
        
        console.log('📝 Datos recibidos para actualizar programa:', {
            programId,
            program_title: programData.program_title,
            program_type: programData.program_type,
            scheduled_date: programData.scheduled_date,
            scheduled_date_type: typeof programData.scheduled_date,
            has_image: !!file,
            program_users_count: programData.program_users?.length || 0
        });
        
        const result = await programsServices.updateProgramService(programId, programData, userId);
        
        if (result.success) {
            // Si se actualizó correctamente y hay una imagen anterior, eliminarla
            if (oldImagePath && fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (err) {
                    console.error('Error eliminando imagen anterior:', err);
                }
            }
            
            // ✅ LOG: Registrar actualización exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'program', 
                programId, 
                req, 
                { 
                    updated_fields: Object.keys(programData),
                    image_updated: !!file
                }
            );
        } else {
            // Si falla la actualización, eliminar la nueva imagen subida
            if (file) {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Error eliminando archivo:', err);
                }
            }
            
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
        
        // Eliminar archivo si existe
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error eliminando archivo:', err);
            }
        }
        
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
programsRouter.post('/:id/users', userExtractor, roleAuthorization(['admin', 'superAdmin', ]), async (req, res) => {
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
programsRouter.delete('/:id/users', userExtractor, roleAuthorization(['admin', 'superAdmin', ]), async (req, res) => {
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

// GET - Servir imágenes estáticas de programas
programsRouter.get('/images/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '..', 'uploads', 'programs', filename);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada'
            });
        }

        // Determinar el tipo de contenido
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        
        res.setHeader('Content-Type', contentType);
        res.sendFile(imagePath);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cargar la imagen',
            error: error.message
        });
    }
});

module.exports = programsRouter;

