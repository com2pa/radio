const Role = require('../model/Role');

// obtener todos los roles para admin y superadmin
const getAllRoles = async () => {
    try {
        const roles = await Role.getAllRoles();
        return {
            success: true,
            status: 200,    
            data: roles,
            message: 'Roles obtenidos exitosamente'
        };
    } catch (error) {
        console.error('Error en servicio de rol:', error);
        return {
            success: false,
            status: 500,
            message: 'Error interno del servidor'
        };
    }
}




// creando el rol
const createRole = async (data) => {
    try {
        // Validar datos
        if (!data.role_name) {
            return {
                success: false,
                status: 400,
                message: 'El nombre del rol es obligatorio'
            };
        }
        // 
        // Verificar si el rol ya existe
        const existingRole = await Role.getRoleByName(data.role_name);
        if (existingRole) {
            return {
                success: false,
                status: 409,
                message: 'El rol ya existe'
            };
        }
        // Crear el rol en la base de datos
        const newRole = await Role.createRole({
            role_name: data.role_name,
            role_description: data.role_description 
        });
        return {
            success: true,
            status: 201,
            data: newRole,
            message: 'Rol creado exitosamente'
        };
    } catch (error) {
        console.error('Error en servicio de rol:', error);
        return {
            success: false,
            status: 500,
            message: 'Error interno del servidor'
        };
    }
    
}

// actualizar el rol al usuario
const updateRole = async (id, data) => {
    try {
        const role = await Role.findByPk(id);
        if (!role) {
            return {
                success: false,
                status: 404,
                message: 'Rol no encontrado'
            };
        }
        // verificar si el nuevo nombre del rol ya existe
        if (data.role_name && data.role_name !== role.role_name) {
            const existingRole = await Role.findOne({ where: { role_name: data.role_name } });
            if (existingRole) {
                return {
                    success: false,
                    status: 409,
                    message: 'El nombre del rol ya existe'
                };
            }
        }
        // Actualizar el rol
        await role.update(data);
        return {
            success: true,
            status: 200,
            data: role,
            message: 'Rol actualizado exitosamente'
        };


        
    } catch (error) {
       
        console.error('Error en servicio de rol:', error);
        return {
            success: false,
            status: 500,
            message: 'Error interno del servidor'
        };

    }
}



// exportando los servicios
module.exports = {
    createRole,
    getAllRoles,
    updateRole
}