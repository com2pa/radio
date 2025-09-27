const MenuAccess = require('../model/MenuAccess');

const roleMap = {
    'superAdmin': 7,
    'admin': 6,
    'edit': 5,
    'view': 4,
    'user': 3
};

const getRoleId = (roleName) => {
    const roleId = roleMap[roleName];
    if (!roleId) {
        throw new Error(`Rol no válido: ${roleName}`);
    }
    return roleId;
};

// Obtener menú por tipo
const getMenuByType = async (roleName, menuType) => {
    try {
        const roleId = getRoleId(roleName);
        const menu = await MenuAccess.getMenuByRoleAndType(roleId, menuType);
        return menu;
    } catch (error) {
        console.error('Error en getMenuByType service:', error);
        throw error;
    }
}

// Obtener menú jerárquico por tipo
const getHierarchicalMenuByType = async (roleName, menuType) => {
    try {
        const flatMenu = await getMenuByType(roleName, menuType);
        
        // Crear menú jerárquico
        const menuMap = new Map();
        const hierarchicalMenu = [];
        
        flatMenu.forEach(item => {
            menuMap.set(item.id, { ...item, children: [] });
        });
        
        flatMenu.forEach(item => {
            if (item.parent_id === null) {
                hierarchicalMenu.push(menuMap.get(item.id));
            } else {
                const parent = menuMap.get(item.parent_id);
                if (parent) {
                    parent.children.push(menuMap.get(item.id));
                }
            }
        });
        
        // Ordenar por order_index
        const sortMenu = (menu) => {
            menu.sort((a, b) => a.order_index - b.order_index);
            menu.forEach(item => {
                if (item.children.length > 0) {
                    sortMenu(item.children);
                }
            });
            return menu;
        };
        
        return sortMenu(hierarchicalMenu);
    }catch(error) {
        console.error('Error en getHierarchicalMenuByType service:', error);
        throw error;
    }   
}

// Obtener todos los menús del usuario por tipo
const getUserMenus = async (roleName) => {
    try {
        const menuTypes = ['main', 'user_dashboard', 'admin_dashboard'];
        const userMenus = {};
        
        for (const menuType of menuTypes) {
            userMenus[menuType] = await getHierarchicalMenuByType(roleName, menuType);
        }
        
        return userMenus;
    } catch (error) {
        console.error('Error en getUserMenus service:', error);
        throw error;
    }
}


// Crear un nuevo item del menú
const createMenuItem = async (menuData) => {
    try {
        // verificar si el item ya existe        
         const newMenuItem = await MenuAccess.createMenuItemWithCheck(menuData);
        return newMenuItem;
    } catch (error) {
        console.error('Error en createMenuItem service:', error);
        throw error;
    }
}

// Obtener menú por rol
const getMenuByRole = async (roleId) => {
    try {
        const menu = await MenuAccess.getMenuByRole(roleId);
        return menu;
    } catch (error) {
        console.error('Error en getMenuByRole service:', error);
        throw error;
    }
}

// Actualizar item del menú
const updateMenuItem = async (id, menuData) => {
    try {
        const updatedItem = await MenuAccess.updateMenuItem(id, menuData);
        return updatedItem;
    } catch (error) {
        console.error('Error en updateMenuItem service:', error);
        throw error;
    }
}

// Eliminar item del menú
const deleteMenuItem = async (id) => {
    try {
        const deletedItem = await MenuAccess.deleteMenuItem(id);
        return deletedItem;
    } catch (error) {
        console.error('Error en deleteMenuItem service:', error);
        throw error;
    }
}

// Verificar acceso a ruta
const hasAccessToPath = async (roleId, path) => {
    try {
        const hasAccess = await MenuAccess.hasAccessToPath(roleId, path);
        return hasAccess;
    } catch (error) {
        console.error('Error en hasAccessToPath service:', error);
        throw error;
    }
}

module.exports = {
    createMenuItem,
    getMenuByRole,
    updateMenuItem,
    deleteMenuItem,
    hasAccessToPath,
    getMenuByType,
    getHierarchicalMenuByType,
    getUserMenus,
    roleMap,
};