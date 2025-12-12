const Advertising = require('express').Router();
const { roleAuthorization, userExtractor } = require('../middleware/auth');
const systemLogger = require('../help/system/systemLogger');
const AdvertisingServices = require('../services/advertisingServices');
const webSocketService = require('../services/websocketService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'advertising');
    // Crear directorio si no existe
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'advertising-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Solo JPG/PNG/WEBP permitidos'), false);
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
        req.body.advertising_image = req.file.filename;
    }
    next();
};

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'El archivo es demasiado grande. El tamaño máximo es 5MB'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Demasiados archivos. Solo se permite un archivo'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Error al subir el archivo: ${err.message}`
        });
    }
    if (err) {
        // Error del fileFilter u otro error
        return res.status(400).json({
            success: false,
            error: err.message || 'Error al procesar el archivo'
        });
    }
    next();
};

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

// GET - Servir imágenes estáticas de publicidad (DEBE IR ANTES DE /:id)
Advertising.get('/images/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Validar que el filename no contenga rutas relativas (seguridad)
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                message: 'Nombre de archivo inválido'
            });
        }
        
        const imagePath = path.join(__dirname, '..', 'uploads', 'advertising', filename);
        
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
        if (ext === '.webp') contentType = 'image/webp';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        
        // Establecer headers de seguridad y cache
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año
        res.sendFile(path.resolve(imagePath)); // Usar path.resolve para ruta absoluta
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cargar la imagen',
            error: error.message
        });
    }
});

// Obtener publicidades por email (DEBE IR ANTES DE /:id)
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

// Obtener publicidades por RIF (DEBE IR ANTES DE /:id)
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

// POST - Subir imagen de publicidad (endpoint separado)
Advertising.post('/upload-image', 
    userExtractor, 
    roleAuthorization(['admin', 'superAdmin']), 
    upload.single('advertising_image'),
    handleMulterError,
    async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó ninguna imagen'
            });
        }

        // ✅ LOG: Registrar subida de imagen
        await systemLogger.logCrudAction(
            req.user, 
            'create', 
            'advertising_image', 
            null, 
            req, 
            { 
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        );

        res.status(200).json({
            success: true,
            message: 'Imagen subida exitosamente',
            data: {
                filename: req.file.filename,
                path: `/api/advertising/images/${req.file.filename}`,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } catch (error) {
        // Eliminar archivo si hay error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error eliminando archivo:', err);
            }
        }

        await systemLogger.logSystemError(req.user?.id, req, `Error subiendo imagen de publicidad: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error subiendo imagen', 
            details: error.message 
        });
    }
});

// PUT - Actualizar imagen de publicidad en la base de datos
Advertising.put('/:id/image', 
    userExtractor, 
    roleAuthorization(['admin', 'superAdmin']), 
    upload.single('advertising_image'),
    handleMulterError,
    async (req, res) => {
    try {
        const advertisingId = req.params.id;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó ninguna imagen'
            });
        }

        // Obtener la publicidad actual para eliminar la imagen anterior
        const currentAdvertising = await AdvertisingServices.getAdvertisingById(advertisingId);
        if (!currentAdvertising.success) {
            // Eliminar archivo si la publicidad no existe
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Publicidad no encontrada'
            });
        }

        // Actualizar solo la imagen en la base de datos
        const result = await AdvertisingServices.updateAdvertising(advertisingId, {
            advertising_image: req.file.filename
        });

        if (result.success) {
            // Eliminar la imagen anterior si existe
            if (currentAdvertising.data?.advertising_image) {
                const oldImagePath = path.join(__dirname, '..', 'uploads', 'advertising', currentAdvertising.data.advertising_image);
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                    } catch (err) {
                        console.error('Error eliminando imagen anterior:', err);
                    }
                }
            }

            // ✅ LOG: Registrar actualización de imagen
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'advertising_image', 
                advertisingId, 
                req, 
                { 
                    filename: req.file.filename,
                    old_filename: currentAdvertising.data?.advertising_image
                }
            );

            // ✅ WEBSOCKET: Notificar actualización de imagen de publicidad en tiempo real
            try {
                webSocketService.notifyAdvertisingUpdated(result.data);
            } catch (wsError) {
                console.error('Error enviando notificación WebSocket de imagen actualizada:', wsError);
                // No fallar la operación si WebSocket falla
            }

            res.status(200).json({
                success: true,
                message: 'Imagen actualizada exitosamente',
                data: {
                    ...result.data,
                    image_path: `/api/advertising/images/${req.file.filename}`
                }
            });
        } else {
            // Eliminar archivo si falla la actualización
            fs.unlinkSync(req.file.path);
            res.status(result.status || 400).json(result);
        }
    } catch (error) {
        // Eliminar archivo si hay error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error eliminando archivo:', err);
            }
        }

        await systemLogger.logSystemError(req.user?.id, req, `Error actualizando imagen de publicidad: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando imagen', 
            details: error.message 
        });
    }
});

// Obtener una publicidad por ID (DEBE IR AL FINAL - ruta genérica)
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

// Crear una nueva publicidad (solo admin y superAdmin) - con imagen opcional
Advertising.post('/create', 
    userExtractor, 
    roleAuthorization(['admin', 'superAdmin']), 
    upload.single('advertising_image'),
    handleMulterError,
    handleImageUpload,
    async (req, res) => {
    const userId = req.user.id; // Obtenemos el ID del usuario autenticado
    const file = req.file;
    
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
                    end_date: req.body.end_date,
                    has_image: !!file
                }
            );

            // ✅ WEBSOCKET: Notificar nueva publicidad en tiempo real (solo si tiene imagen)
            if (result.data?.advertising_image) {
                try {
                    webSocketService.notifyNewAdvertising(result.data);
                } catch (wsError) {
                    console.error('Error enviando notificación WebSocket de publicidad:', wsError);
                    // No fallar la operación si WebSocket falla
                }
            }
        } else {
            // Si falla la creación, eliminar la imagen subida
            if (file) {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Error eliminando archivo:', err);
                }
            }
            
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
        // Eliminar archivo si hay error
        if (file) {
            try {
                fs.unlinkSync(file.path);
            } catch (err) {
                console.error('Error eliminando archivo:', err);
            }
        }

        await systemLogger.logSystemError(req.user?.id, req, `Error creando publicidad: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error creando publicidad', 
            details: error.message 
        });
    }
});

// Actualizar una publicidad (solo admin y superAdmin) - con imagen opcional
Advertising.put('/update/:id', 
    userExtractor, 
    roleAuthorization(['admin', 'superAdmin']), 
    upload.single('advertising_image'),
    handleMulterError,
    handleImageUpload,
    async (req, res) => {
    const advertisingId = req.params.id;
    const file = req.file;
    
    try {
        // Si se subió una nueva imagen, obtener la imagen anterior para eliminarla
        let oldImagePath = null;
        if (file) {
            try {
                const currentAdvertising = await AdvertisingServices.getAdvertisingById(advertisingId);
                if (currentAdvertising.success && currentAdvertising.data?.advertising_image) {
                    oldImagePath = path.join(__dirname, '..', 'uploads', 'advertising', currentAdvertising.data.advertising_image);
                }
            } catch (err) {
                console.error('Error obteniendo publicidad actual:', err);
            }
        }

        const result = await AdvertisingServices.updateAdvertising(advertisingId, req.body);
        
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
                'advertising', 
                advertisingId, 
                req, 
                { 
                    updated_fields: Object.keys(req.body),
                    company_name: req.body.company_name || result.data?.company_name,
                    image_updated: !!file
                }
            );

            // ✅ WEBSOCKET: Notificar actualización de publicidad en tiempo real (solo si se actualizó la imagen)
            if (file && result.data?.advertising_image) {
                try {
                    webSocketService.notifyAdvertisingUpdated(result.data);
                } catch (wsError) {
                    console.error('Error enviando notificación WebSocket de publicidad actualizada:', wsError);
                    // No fallar la operación si WebSocket falla
                }
            }
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
                req.user?.id, 
                req, 
                'Error actualizando publicidad', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.status || 200).json(result);
    } catch (error) {
        // Eliminar archivo si hay error
        if (file) {
            try {
                fs.unlinkSync(file.path);
            } catch (err) {
                console.error('Error eliminando archivo:', err);
            }
        }

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

            // ✅ WEBSOCKET: Notificar eliminación de publicidad en tiempo real
            try {
                webSocketService.notifyAdvertisingDeleted(result.data);
            } catch (wsError) {
                console.error('Error enviando notificación WebSocket de publicidad eliminada:', wsError);
                // No fallar la operación si WebSocket falla
            }
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

