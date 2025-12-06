const { pool } = require('../db/index');

// Crear tabla de menu de acceso con relación a roles
const createMenuAccessTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS menu_access (
            id SERIAL PRIMARY KEY,
            title VARCHAR(100) NOT NULL,
            path VARCHAR(200) NOT NULL,
            parent_id INTEGER REFERENCES menu_access(id) ON DELETE CASCADE,
            role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,  -- CAMBIADO: roles(role_id)
            menu_type VARCHAR(20) DEFAULT 'main',
            order_index INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear índices para mejorar el rendimiento
        CREATE INDEX IF NOT EXISTS idx_menu_access_role_id ON menu_access(role_id);
        CREATE INDEX IF NOT EXISTS idx_menu_access_parent_id ON menu_access(parent_id);
        CREATE INDEX IF NOT EXISTS idx_menu_access_order ON menu_access(order_index);
        CREATE INDEX IF NOT EXISTS idx_menu_access_active ON menu_access(is_active);
        CREATE INDEX IF NOT EXISTS idx_menu_access_type ON menu_access(menu_type);
    `;

    try {
        await pool.query(query);
        console.log('Tabla menu_access creada exitosamente');
    } catch (error) {
        console.error('Error al crear la tabla menu_access:', error);
        throw error;
    }
};

// Función para obtener el menú por rol y tipo
const getMenuByRoleAndType = async (roleId, menuType) => {
    // Para user_dashboard y main, devolver TODOS los items sin filtrar por role_id
    // Para otros tipos de menú, mantener el filtro por role_id
    const shouldFilterByRole = menuType !== 'user_dashboard' && menuType !== 'main';
    
    const query = shouldFilterByRole 
        ? `
            WITH RECURSIVE menu_tree AS (
                SELECT 
                    id,
                    title,
                    path,
                    parent_id,
                    role_id,
                    menu_type,
                    order_index,
                    is_active,
                    1 as level
                FROM menu_access
                WHERE parent_id IS NULL 
                AND role_id = $1 
                AND menu_type = $2
                AND is_active = true
                
                UNION ALL
                
                SELECT 
                    m.id,
                    m.title,
                    m.path,
                    m.parent_id,
                    m.role_id,
                    m.menu_type,
                    m.order_index,
                    m.is_active,
                    mt.level + 1
                FROM menu_access m
                INNER JOIN menu_tree mt ON m.parent_id = mt.id
                WHERE m.is_active = true
            )
            SELECT * FROM menu_tree
            ORDER BY level, order_index, title;
        `
        : `
            WITH RECURSIVE menu_tree AS (
                SELECT 
                    id,
                    title,
                    path,
                    parent_id,
                    role_id,
                    menu_type,
                    order_index,
                    is_active,
                    1 as level
                FROM menu_access
                WHERE parent_id IS NULL 
                AND menu_type = $1
                AND is_active = true
                
                UNION ALL
                
                SELECT 
                    m.id,
                    m.title,
                    m.path,
                    m.parent_id,
                    m.role_id,
                    m.menu_type,
                    m.order_index,
                    m.is_active,
                    mt.level + 1
                FROM menu_access m
                INNER JOIN menu_tree mt ON m.parent_id = mt.id
                WHERE m.is_active = true
            )
            SELECT * FROM menu_tree
            ORDER BY level, order_index, title;
        `;

    try {
        const result = shouldFilterByRole
            ? await pool.query(query, [roleId, menuType])
            : await pool.query(query, [menuType]);
        return result.rows;
    } catch (error) {
        console.error('Error al obtener el menú por rol y tipo:', error);
        throw error;
    }
};

// Función para obtener el menú por rol
const getMenuByRole = async (roleId) => {
    const query = `
        WITH RECURSIVE menu_tree AS (
            SELECT 
                id,
                title,
                path,
                
                parent_id,
                role_id,
                order_index,
                is_active,
                1 as level
            FROM menu_access
            WHERE parent_id IS NULL 
            AND role_id = $1 
            AND is_active = true
            
            UNION ALL
            
            SELECT 
                m.id,
                m.title,
                m.path,
               
                m.parent_id,
                m.role_id,
                m.order_index,
                m.is_active,
                mt.level + 1
            FROM menu_access m
            INNER JOIN menu_tree mt ON m.parent_id = mt.id
            WHERE m.is_active = true
        )
        SELECT * FROM menu_tree
        ORDER BY level, order_index, title;
    `;

    try {
        const result = await pool.query(query, [roleId]);
        return result.rows;
    } catch (error) {
        console.error('Error al obtener el menú por rol:', error);
        throw error;
    }
};

// Función para crear un nuevo item del menú
// Función para crear un nuevo item del menú (mejorada)
const createMenuItem = async (menuData) => {
    const { title, path, parent_id, role_id, menu_type, order_index, is_active } = menuData;
    
    // ✅ VALIDAR CAMPOS REQUERIDOS
    if (!title || !path || !role_id || !menu_type) {
        throw new Error('Los campos title, path, role_id y menu_type son requeridos');
    }
    
    const query = `
        INSERT INTO menu_access (title, path, parent_id, role_id, menu_type, order_index, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;

    try {
        const result = await pool.query(query, [
            title, 
            path, 
            parent_id || null, 
            role_id, 
            menu_type, 
            order_index || 0, 
            is_active !== false
        ]);
        return result.rows[0];
    } catch (error) {
        console.error('Error al crear item del menú:', error);
        
        // ✅ CAPTURAR ERROR DE DUPLICADO DE BASE DE DATOS
        if (error.code === '23505') { // Código de violación de constraint único
            throw new Error('Ya existe un item del menú con estos datos');
        }
        throw error;
    }
};


// Función para actualizar un item del menú
const updateMenuItem = async (id, menuData) => {
    const { title, path, parent_id, menu_type, order_index, is_active } = menuData;
    
    const query = `
        UPDATE menu_access 
        SET 
            title = $1,
            path = $2,
            parent_id = $3,
            menu_type = $4,
            order_index = $5,
            is_active = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *;
    `;

    try {
        const result = await pool.query(query, [
            title, path, parent_id, menu_type, order_index, is_active, id
        ]);
        return result.rows[0];
    } catch (error) {
        console.error('Error al actualizar item del menú:', error);
        throw error;
    }
};

// Función para eliminar un item del menú
const deleteMenuItem = async (id) => {
    const query = `
        DELETE FROM menu_access 
        WHERE id = $1
        RETURNING *;
    `;

    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error al eliminar item del menú:', error);
        throw error;
    }
};

// Función para verificar si un usuario tiene acceso a una ruta
const hasAccessToPath = async (roleId, path) => {
    const query = `
        SELECT EXISTS (
            SELECT 1 FROM menu_access 
            WHERE role_id = $1 
            AND path = $2 
            AND is_active = true
        ) as has_access;
    `;

    try {
        const result = await pool.query(query, [roleId, path]);
        return result.rows[0].has_access;
    } catch (error) {
        console.error('Error al verificar acceso:', error);
        throw error;
    }
};

// verificar el item no exista antes de crearlo
// verificar el item no exista antes de crearlo
const createMenuItemWithCheck = async (menuData) => {
    const { title, path, role_id, menu_type } = menuData;
    
    try {
        // ✅ VERIFICAR SI EL ITEM YA EXISTE
        const checkQuery = `
            SELECT id FROM menu_access 
            WHERE title = $1 
            AND path = $2 
            AND role_id = $3 
            AND menu_type = $4 
            AND is_active = true
        `;

        const checkResult = await pool.query(checkQuery, [title, path, role_id, menu_type]);
        
        if (checkResult.rows.length > 0) {
            throw new Error(`El item del menú "${title}" ya existe para este rol y tipo de menú`);
        }
        
        // ✅ CREAR NUEVO ITEM SI NO EXISTE
        const newMenuItem = await createMenuItem(menuData); // ← Cambio importante aquí
        return newMenuItem;

    } catch (error) {
        console.error('Error en createMenuItemWithCheck:', error);
        
        // Si ya es un error de duplicado, mantener el mensaje
        if (error.message.includes('ya existe')) {
            throw error;
        }
        
        throw new Error('Error al crear el item del menú');
    }
}

// Inicializar tabla de forma asíncrona con retries
const initializeMenuAccessTable = async () => {
    await new Promise(resolve => setTimeout(resolve, 2500)); // Esperar 2.5 segundos para que roles se cree primero
    
    let retries = 3;
    let delay = 2000;
    
    for (let i = 0; i < retries; i++) {
        try {
            await createMenuAccessTable();
            return;
        } catch (error) {
            console.warn(`⚠️ Error inicializando tabla menu_access (intento ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ No se pudo inicializar la tabla menu_access después de varios intentos');
                console.error('   Asegúrate de que la tabla roles exista primero');
            }
        }
    }
};

// Ejecutar de forma asíncrona sin bloquear
setImmediate(() => {
    initializeMenuAccessTable().catch(() => {});
});

module.exports = {
    createMenuAccessTable,
    getMenuByRole,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    hasAccessToPath,
    getMenuByRoleAndType,
    createMenuItemWithCheck
};


/** 
 * id: Identificador único (serial primary key)

title: Nombre del item del menú

path: Ruta del dashboard (ej: '/dashboard', '/users')

icon: Icono para el menú (ej: 'dashboard', 'users')

parent_id: Referencia al item padre para menús anidados

role_id: ID del rol que tiene acceso (debe existir en tabla roles)

order_index: Orden de aparición en el menú

is_active: Si el item está activo o no

created_at y updated_at: Timestamps de creación y actualización

1-Creación de la tabla con todas las restricciones necesarias

2-Obtención del menú por rol usando consulta recursiva para menús anidados

3-CRUD completo para items del menú

4-Verificación de acceso a rutas específicas por rol

 * 
 */