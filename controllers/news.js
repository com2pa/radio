const newsRouter = require('express').Router();
const newsServices = require('../services/newsServices');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { userExtractor, roleAuthorization } = require('../middleware/auth');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'news');
    // Crear directorio si no existe
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'news-' + uniqueSuffix + ext);
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

// Middleware para log de peticiones
const logRequest = (req, res, next) => {
    console.log(`[NEWS] ${req.method} ${req.originalUrl} - User: ${req.user?.user_id || 'No auth'}`);
    next();
};

// Endpoint temporal para verificar roles
newsRouter.get('/debug/roles', async (req, res) => {
    try {
        const { pool } = require('../db/index');
        const result = await pool.query('SELECT * FROM roles ORDER BY role_id');
        res.json({
            success: true,
            data: result.rows,
            message: 'Roles obtenidos para depuración'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener roles',
            error: error.message
        });
    }
});

// Endpoint temporal para verificar usuario específico
newsRouter.get('/debug/user/:id', async (req, res) => {
    try {
        const { pool } = require('../db/index');
        const userId = req.params.id;
        const result = await pool.query(`
            SELECT u.*, r.role_name, r.role_id as role_table_id
            FROM users u 
            INNER JOIN roles r ON u.role_id = r.role_id 
            WHERE u.user_id = $1
        `, [userId]);
        
        res.json({
            success: true,
            data: result.rows[0] || null,
            message: `Usuario ${userId} obtenido para depuración`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario',
            error: error.message
        });
    }
});

// Endpoint temporal para verificar subcategorías
newsRouter.get('/debug/subcategories', async (req, res) => {
    try {
        const { pool } = require('../db/index');
        const result = await pool.query('SELECT * FROM subcategories ORDER BY subcategory_id');
        res.json({
            success: true,
            data: result.rows,
            message: 'Subcategorías obtenidas para depuración'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener subcategorías',
            error: error.message
        });
    }
});

// Endpoint temporal para verificar estructura de tabla news
newsRouter.get('/debug/news-structure', async (req, res) => {
    try {
        const { pool } = require('../db/index');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'news' 
            ORDER BY ordinal_position
        `);
        res.json({
            success: true,
            data: result.rows,
            message: 'Estructura de tabla news obtenida para depuración'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estructura de tabla news',
            error: error.message
        });
    }
});

newsRouter.use(logRequest);

// Servicio auxiliar para manejar la imagen
const handleImageUpload = (req, res, next) => {
    if (req.file) {
        // Guardar solo el nombre del archivo en la base de datos
        req.body.news_image = req.file.filename;
    }
    next();
};

// CORREGIDO: Orden correcto de middlewares
// CREATE - Crear nueva noticia con imagen
newsRouter.post('/create', 
  userExtractor,  // PRIMERO: autenticación
  roleAuthorization(['admin','superAdmin','edit']), // SEGUNDO: autorización
  upload.single('news_image'), // TERCERO: upload de archivo
  handleImageUpload, // CUARTO: procesar imagen
  async (req, res) => {
    try {
        const { body, user, file } = req;
        
        // Ya no necesitas verificar user porque userExtractor lo hace
        console.log('Usuario autenticado:', user);

        // Validar que se subió una imagen si es requerida
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'La imagen es requerida'
            });
        }

        // Validar campos requeridos
        if (!body.news_title || !body.news_content) {
            // Eliminar archivo si faltan campos requeridos
            if (file) {
                fs.unlinkSync(file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'El título y contenido son obligatorios'
            });
        }

        // Validar subcategoría
        if (!body.subcategory_id) {
            if (file) {
                fs.unlinkSync(file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'La subcategoría es requerida'
            });
        }

        console.log('📰 Controlador - Usuario:', user);
        console.log('📰 Controlador - UserId a pasar:', user._id);
        
        const result = await newsServices.createNewsService(body, user._id);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            // Si falla la creación, eliminar la imagen subida
            if (file) {
                fs.unlinkSync(file.path);
            }
            res.status(400).json(result);
        }
    } catch (error) {
        // Eliminar archivo en caso de error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error en creación de noticia:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});


// UPDATE - Actualizar noticia con imagen opcional
newsRouter.put('/:id', upload.single('news_image'), handleImageUpload,userExtractor, roleAuthorization(['admin','superAdmin','edit']), async (req, res) => {
    try {
        const { id } = req.params;
        const { body, user, file } = req;
        const newsId = parseInt(id);

        if (isNaN(newsId)) {
            // Eliminar archivo si el ID es inválido
            if (file) {
                fs.unlinkSync(file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'ID de noticia inválido'
            });
        }

        if (!user) {
            // Eliminar archivo si no está autenticado
            if (file) {
                fs.unlinkSync(file.path);
            }
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        // Obtener noticia actual para eliminar imagen anterior si se sube una nueva
        let oldImage = null;
        if (file) {
            const currentNews = await newsServices.getNewsByIdService(newsId);
            if (currentNews.success && currentNews.data.news_image) {
                oldImage = currentNews.data.news_image;
            }
        }

        const result = await newsServices.updateNewsService(newsId, body, user._id);
        
        if (result.success) {
            // Eliminar imagen anterior si se subió una nueva
            if (oldImage) {
                const oldImagePath = path.join(__dirname, '..', 'uploads', 'news', oldImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            res.status(200).json(result);
        } else {
            // Si falla la actualización, eliminar la nueva imagen subida
            if (file) {
                fs.unlinkSync(file.path);
            }
            res.status(400).json(result);
        }
    } catch (error) {
        // Eliminar archivo en caso de error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// READ - Servir imágenes estáticas
newsRouter.get('/images/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '..', 'uploads', 'news', filename);
        
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

// READ - Obtener todas las noticias
newsRouter.get('/', async (req, res) => {
    try {
        const result = await newsServices.getAllNewsService();
        
        // Agregar URL completa de la imagen a cada noticia
        if (result.success && result.data) {
            result.data = result.data.map(newsItem => ({
                ...newsItem,
                news_image_url: newsItem.news_image 
                    ? `${req.protocol}://${req.get('host')}/api/news/images/${newsItem.news_image}`
                    : null
            }));
        }
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// READ - Obtener noticia por ID
newsRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const newsId = parseInt(id);

        if (isNaN(newsId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de noticia inválido'
            });
        }

        const result = await newsServices.getNewsByIdService(newsId);
        
        // Agregar URL completa de la imagen
        if (result.success && result.data) {
            result.data.news_image_url = result.data.news_image 
                ? `${req.protocol}://${req.get('host')}/api/news/images/${result.data.news_image}`
                : null;
        }
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// READ - Obtener noticias del usuario actual
newsRouter.get('/user/my-news',  userExtractor, roleAuthorization(['admin','superAdmin','edit']), async (req, res) => {
    try {
        const { user } = req;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        const result = await newsServices.getNewsByUserService(user._id);
        
        // Agregar URL completa de la imagen a cada noticia
        if (result.success && result.data) {
            result.data = result.data.map(newsItem => ({
                ...newsItem,
                news_image_url: newsItem.news_image 
                    ? `${req.protocol}://${req.get('host')}/api/news/images/${newsItem.news_image}`
                    : null
            }));
        }
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// READ - Buscar noticias por título
newsRouter.get('/search/:term', async (req, res) => {
    try {
        const { term } = req.params;

        if (!term || term.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El término de búsqueda debe tener al menos 3 caracteres'
            });
        }

        const result = await newsServices.searchNewsByTitleService(term.trim());
        
        // Agregar URL completa de la imagen a cada noticia
        if (result.success && result.data) {
            result.data = result.data.map(newsItem => ({
                ...newsItem,
                news_image_url: newsItem.news_image 
                    ? `${req.protocol}://${req.get('host')}/api/news/images/${newsItem.news_image}`
                    : null
            }));
        }
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// READ - Obtener noticias por subcategoría
newsRouter.get('/subcategory/:subcategoryId', async (req, res) => {
    try {
        const { subcategoryId } = req.params;
        const id = parseInt(subcategoryId);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de subcategoría inválido'
            });
        }

        const result = await newsServices.getNewsBySubcategoryService(id);
        
        // Agregar URL completa de la imagen a cada noticia
        if (result.success && result.data) {
            result.data = result.data.map(newsItem => ({
                ...newsItem,
                news_image_url: newsItem.news_image 
                    ? `${req.protocol}://${req.get('host')}/api/news/images/${newsItem.news_image}`
                    : null
            }));
        }
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// READ - Obtener noticias por categoría
newsRouter.get('/category/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const id = parseInt(categoryId);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de categoría inválido'
            });
        }

        const result = await newsServices.getNewsByCategoryService(id);
        
        // Agregar URL completa de la imagen a cada noticia
        if (result.success && result.data) {
            result.data = result.data.map(newsItem => ({
                ...newsItem,
                news_image_url: newsItem.news_image 
                    ? `${req.protocol}://${req.get('host')}/api/news/images/${newsItem.news_image}`
                    : null
            }));
        }
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// UPDATE - Cambiar estado de la noticia
newsRouter.patch('/:id/status', userExtractor, roleAuthorization(['admin','superAdmin','edit']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { user } = req;
        const newsId = parseInt(id);

        if (isNaN(newsId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de noticia inválido'
            });
        }

        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El campo "status" es requerido y debe ser booleano'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        const result = await newsServices.updateNewsStatusService(newsId, status, user._id);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// DELETE - Eliminar noticia
newsRouter.delete('/:id',userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;
        const newsId = parseInt(id);

        if (isNaN(newsId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de noticia inválido'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        // Obtener noticia para eliminar la imagen asociada
        const currentNews = await newsServices.getNewsByIdService(newsId);
        
        const result = await newsServices.deleteNewsService(newsId, user._id);
        
        if (result.success) {
            // Eliminar imagen asociada si existe
            if (currentNews.success && currentNews.data.news_image) {
                const imagePath = path.join(__dirname, '..', 'uploads', 'news', currentNews.data.news_image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

module.exports = newsRouter;