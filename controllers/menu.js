const MenuRouter = require('express').Router();
const { roleAuthorization, userExtractor } = require('../middleware/auth');
const menuService = require('../services/menuServices');
const authLogger = require('../help/auth/authLogger');
const systemLogger = require('../help/system/systemLogger');

const adminAuthorization = roleAuthorization(['admin', 'superAdmin']);

// Crear item del menú (con tipo específico)
MenuRouter.post('/create', userExtractor, adminAuthorization, async (req, res) => {
    try {
        const menuData = {
            ...req.body,
            menu_type: req.body.menu_type || 'main'
        };
        
        console.log('Creando item del menú:', menuData);
        
        const newMenuItem = await menuService.createMenuItem(menuData);
        
        // ✅ LOG: Registrar creación exitosa
        await systemLogger.logCrudAction(
            req.user, 
            'create', 
            'menu_item', 
            newMenuItem.id, 
            req, 
            { menu_type: menuData.menu_type }
        );
        
        res.status(201).json({
            success: true,
            message: 'Item del menú creado exitosamente',
            data: newMenuItem
        });
    } catch (error) {
        console.error('Error creando item del menú:', error);
        
        // ✅ LOG: Registrar error
        await systemLogger.logSystemError(
            req.user?.id, 
            req, 
            'Error creando item del menú', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error creando item del menú',
            details: error.message 
        });
    }
});

// Obtener menú principal (pública) - Sin autenticación
MenuRouter.get('/main', async (req, res) => {
    try {
        const menu = await menuService.getHierarchicalMenuByType('user', 'main');
        // console.log(menu)
        res.status(200).json({
            success: true,
            message: 'Menú principal obtenido exitosamente',
            data: menu || []
        });
    } catch (error) {
        console.error('Error obteniendo menú principal:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo menú principal',
            details: error.message,
            data: []
        });
    }
});

// Obtener menú de dashboard de usuario (requiere autenticación)
MenuRouter.get('/user-dashboard', userExtractor, async (req, res) => {
    try {
        const user = req.user;
        const menu = await menuService.getHierarchicalMenuByType(user.role, 'user_dashboard');
        
        res.status(200).json({
            success: true,
            message: 'Menú de dashboard de usuario obtenido exitosamente',
            data: menu || []
        });
    } catch (error) {
        console.error('Error obteniendo menú de dashboard:', error);
        
        // ✅ LOG: Registrar error de acceso
        await systemLogger.logSystemError(
            user?.id, 
            req, 
            'Error obteniendo menú de dashboard', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo menú de dashboard',
            details: error.message,
            data: []
        });
    }
});

// Obtener menú de administración (requiere ser admin o superAdmin)
MenuRouter.get('/admin-dashboard', userExtractor, adminAuthorization, async (req, res) => {
    try {
        const user = req.user;
        const menu = await menuService.getHierarchicalMenuByType(user.role, 'admin_dashboard');
        
        res.status(200).json({
            success: true,
            message: 'Menú de administración obtenido exitosamente',
            data: menu || []
        });
    } catch (error) {
        console.error('Error obteniendo menú de administración:', error);
        
        // ✅ LOG: Registrar error de acceso admin
        await systemLogger.logSystemError(
            user?.id, 
            req, 
            'Error obteniendo menú de administración', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo menú de administración',
            details: error.message,
            data: []
        });
    }
});

// Obtener todos los menús del usuario actual (requiere autenticación)
MenuRouter.get('/my-menus', userExtractor, async (req, res) => {
    try {
        const user = req.user;
        const userMenus = await menuService.getUserMenus(user.role);
        
        res.status(200).json({
            success: true,
            message: 'Todos los menús del usuario obtenidos exitosamente',
            data: userMenus
        });
    } catch (error) {
        console.error('Error obteniendo menús del usuario:', error);
        
        await systemLogger.logSystemError(
            user?.id, 
            req, 
            'Error obteniendo menús del usuario', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo menús del usuario',
            details: error.message,
            data: {
                'main': [],
                'user_dashboard': [],
                'admin_dashboard': []
            }
        });
    }
});

// Endpoint adicional para obtener menú por tipo específico (requiere autenticación)
MenuRouter.get('/type/:menuType', userExtractor, async (req, res) => {
    try {
        const { menuType } = req.params;
        const user = req.user;
        
        // Validar menuType
        const validTypes = ['main', 'user_dashboard', 'admin_dashboard'];
        if (!validTypes.includes(menuType)) {
            // ✅ LOG: Registrar intento de acceso con tipo inválido
            await authLogger.logAccessDenied(
                user, 
                req, 
                `Tipo de menú no válido: ${menuType}`
            );
            
            return res.status(400).json({
                success: false,
                error: 'Tipo de menú no válido',
                validTypes: validTypes
            });
        }
        
        const menu = await menuService.getHierarchicalMenuByType(user.role, menuType);
        
        res.status(200).json({
            success: true,
            message: `Menú ${menuType} obtenido exitosamente`,
            data: menu || []
        });
    } catch (error) {
        console.error(`Error obteniendo menú ${req.params.menuType}:`, error);
        
        await systemLogger.logSystemError(
            req.user?.id, 
            req, 
            `Error obteniendo menú ${req.params.menuType}`, 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: `Error obteniendo menú ${req.params.menuType}`,
            details: error.message,
            data: []
        });
    }
});

// Endpoint para actualizar item del menú (solo admin/superAdmin)
MenuRouter.put('/:id', userExtractor, adminAuthorization, async (req, res) => {
    try {
        const { id } = req.params;
        const menuData = req.body;
        
        const updatedItem = await menuService.updateMenuItem(parseInt(id), menuData);
        
        // ✅ LOG: Registrar actualización
        await systemLogger.logCrudAction(
            req.user, 
            'update', 
            'menu_item', 
            id, 
            req, 
            { changes: menuData }
        );
        
        res.status(200).json({
            success: true,
            message: 'Item del menú actualizado exitosamente',
            data: updatedItem
        });
    } catch (error) {
        console.error('Error actualizando item del menú:', error);
        
        await systemLogger.logSystemError(
            req.user?.id, 
            req, 
            'Error actualizando item del menú', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando item del menú',
            details: error.message
        });
    }
});

// Endpoint para eliminar item del menú (solo admin/superAdmin)
MenuRouter.delete('/:id', userExtractor, adminAuthorization, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedItem = await menuService.deleteMenuItem(parseInt(id));
        
        // ✅ LOG: Registrar eliminación
        await systemLogger.logCrudAction(
            req.user, 
            'delete', 
            'menu_item', 
            id, 
            req
        );
        
        res.status(200).json({
            success: true,
            message: 'Item del menú eliminado exitosamente',
            data: deletedItem
        });
    } catch (error) {
        console.error('Error eliminando item del menú:', error);
        
        await systemLogger.logSystemError(
            req.user?.id, 
            req, 
            'Error eliminando item del menú', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error eliminando item del menú',
            details: error.message
        });
    }
});

// Endpoint para verificar acceso a ruta (requiere autenticación)
MenuRouter.post('/check-access', userExtractor, async (req, res) => {
    try {
        const { path } = req.body;
        const user = req.user;
        
        if (!path) {
            return res.status(400).json({
                success: false,
                error: 'La ruta (path) es requerida'
            });
        }
        
        const hasAccess = await menuService.hasAccessToPath(user.role, path);
        
        // ✅ LOG: Registrar verificación de acceso
        await systemLogger.logCrudAction(
            user, 
            'read', 
            'menu_access_check', 
            null, 
            req, 
            { path, hasAccess }
        );
        
        res.status(200).json({
            success: true,
            hasAccess,
            message: hasAccess ? 'Acceso permitido' : 'Acceso denegado'
        });
    } catch (error) {
        console.error('Error verificando acceso:', error);
        
        await systemLogger.logSystemError(
            req.user?.id, 
            req, 
            'Error verificando acceso', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error verificando acceso',
            details: error.message
        });
    }
});

// Endpoint para obtener todos los items del menú (solo admin/superAdmin) - Para administración
MenuRouter.get('/admin/items', userExtractor, adminAuthorization, async (req, res) => {
    try {
        // Esta función necesitarías implementarla en menuService
        // Por ahora retornamos un mensaje
        res.status(200).json({
            success: true,
            message: 'Endpoint para administración de menús - Por implementar',
            data: []
        });
    } catch (error) {
        console.error('Error obteniendo items del menú:', error);
        
        await systemLogger.logSystemError(
            req.user?.id, 
            req, 
            'Error obteniendo items del menú', 
            error
        );
        
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo items del menú',
            details: error.message
        });
    }
});

module.exports = MenuRouter;