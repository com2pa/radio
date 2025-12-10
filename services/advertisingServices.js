const Advertising = require('../model/Advertising');
const User = require('../model/User');
const emailService = require('./emailService');

// Obtener todas las publicidades
const getAllAdvertising = async () => {
    try {
        const advertising = await Advertising.getAllAdvertising();
        return {
            success: true,
            data: advertising,
            message: 'Publicidades obtenidas exitosamente'
        };
    } catch (error) {
        console.error('Error en getAllAdvertising:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Obtener publicidades activas
const getActiveAdvertising = async () => {
    try {
        const advertising = await Advertising.getActiveAdvertising();
        return {
            success: true,
            data: advertising,
            message: 'Publicidades activas obtenidas exitosamente'
        };
    } catch (error) {
        console.error('Error en getActiveAdvertising:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Obtener publicidad por ID
const getAdvertisingById = async (id) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de publicidad inválido',
                status: 400
            };
        }

        const advertising = await Advertising.getAdvertisingById(id);
        if (!advertising) {
            return {
                success: false,
                message: 'Publicidad no encontrada',
                status: 404
            };
        }

        return {
            success: true,
            data: advertising,
            message: 'Publicidad obtenida exitosamente'
        };
    } catch (error) {
        console.error('Error en getAdvertisingById:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Obtener publicidades por email
const getAdvertisingByEmail = async (email) => {
    try {
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                success: false,
                message: 'Formato de email inválido',
                status: 400
            };
        }

        const advertising = await Advertising.getAdvertisingByEmail(email);
        return {
            success: true,
            data: advertising,
            message: 'Publicidades obtenidas exitosamente'
        };
    } catch (error) {
        console.error('Error en getAdvertisingByEmail:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Obtener publicidades por RIF
const getAdvertisingByRif = async (rif) => {
    try {
        if (!rif || rif.trim() === '') {
            return {
                success: false,
                message: 'RIF es obligatorio',
                status: 400
            };
        }

        const advertising = await Advertising.getAdvertisingByRif(rif.trim());
        return {
            success: true,
            data: advertising,
            message: 'Publicidades obtenidas exitosamente'
        };
    } catch (error) {
        console.error('Error en getAdvertisingByRif:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Crear publicidad
const createAdvertising = async (data, userId) => {
    try {
        // Validar datos requeridos
        if (!data.company_name || !data.rif || !data.company_address || 
            !data.phone || !data.email || !data.start_date || 
            !data.end_date || !data.advertising_days) {
            return {
                success: false,
                message: 'Los campos nombre de empresa, RIF, dirección, teléfono, email, fecha de inicio, fecha de fin y días de publicidad son obligatorios',
                status: 400
            };
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return {
                success: false,
                message: 'Formato de email inválido',
                status: 400
            };
        }

        // Validar formato de teléfono
        if (!/^[\+]?[0-9\s\-\(\)]{7,20}$/.test(data.phone)) {
            return {
                success: false,
                message: 'Formato de teléfono inválido',
                status: 400
            };
        }

        // Validar fechas
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(startDate.getTime())) {
            return {
                success: false,
                message: 'Fecha de inicio inválida',
                status: 400
            };
        }

        if (isNaN(endDate.getTime())) {
            return {
                success: false,
                message: 'Fecha de fin inválida',
                status: 400
            };
        }

        if (endDate < startDate) {
            return {
                success: false,
                message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
                status: 400
            };
        }

        // Validar días de publicidad
        const advertisingDays = parseInt(data.advertising_days);
        if (isNaN(advertisingDays) || advertisingDays <= 0) {
            return {
                success: false,
                message: 'Los días de publicidad deben ser un número positivo',
                status: 400
            };
        }

        // Validar longitud de campos
        if (data.company_name.trim().length < 2 || data.company_name.trim().length > 200) {
            return {
                success: false,
                message: 'El nombre de la empresa debe tener entre 2 y 200 caracteres',
                status: 400
            };
        }

        if (data.rif.trim().length < 3 || data.rif.trim().length > 50) {
            return {
                success: false,
                message: 'El RIF debe tener entre 3 y 50 caracteres',
                status: 400
            };
        }

        if (data.company_address.trim().length < 5 || data.company_address.trim().length > 500) {
            return {
                success: false,
                message: 'La dirección debe tener entre 5 y 500 caracteres',
                status: 400
            };
        }

        // Validar formato de imagen si se proporciona
        if (data.advertising_image && !/\.(jpg|jpeg|png|webp)$/i.test(data.advertising_image)) {
            return {
                success: false,
                message: 'Formato de imagen inválido. Solo se permiten: jpg, jpeg, png, webp',
                status: 400
            };
        }

        // Verificar que el usuario exista si se proporciona
        if (userId) {
            const existingUser = await User.getUserById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    message: 'El usuario no existe',
                    status: 404
                };
            }
        }

        // Crear la publicidad
        const advertisingData = {
            company_name: data.company_name.trim(),
            rif: data.rif.trim(),
            company_address: data.company_address.trim(),
            phone: data.phone.trim(),
            email: data.email.trim().toLowerCase(),
            start_date: data.start_date,
            end_date: data.end_date,
            time: data.time ? data.time.trim() : null,
            advertising_days: advertisingDays,
            status: data.status !== undefined ? data.status : true,
            advertising_image: data.advertising_image || null,
            user_id: userId || null
        };

        const savedAdvertising = await Advertising.createAdvertising(advertisingData);

        // Enviar correo a la empresa si se publicó una imagen
        if (savedAdvertising.advertising_image) {
            try {
                await emailService.sendAdvertisingImagePublished({
                    company_name: savedAdvertising.company_name,
                    email: savedAdvertising.email,
                    start_date: savedAdvertising.start_date,
                    end_date: savedAdvertising.end_date,
                    advertising_days: savedAdvertising.advertising_days,
                    advertising_image: savedAdvertising.advertising_image,
                    rif: savedAdvertising.rif,
                    phone: savedAdvertising.phone
                });
                console.log(`✅ Email de confirmación enviado a: ${savedAdvertising.email}`);
            } catch (emailError) {
                console.error('❌ Error enviando email de confirmación de publicidad:', emailError);
                // No fallar la operación si falla el email, pero registrar el error
            }
        }

        return {
            success: true,
            data: savedAdvertising,
            message: 'Publicidad creada exitosamente',
            status: 201
        };

    } catch (error) {
        console.error('Error en createAdvertising:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Actualizar publicidad
const updateAdvertising = async (id, data) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de publicidad inválido',
                status: 400
            };
        }

        // Verificar que la publicidad existe
        const existingAdvertising = await Advertising.getAdvertisingById(id);
        if (!existingAdvertising) {
            return {
                success: false,
                message: 'Publicidad no encontrada',
                status: 404
            };
        }

        // Validar email si se proporciona
        if (data.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                return {
                    success: false,
                    message: 'Formato de email inválido',
                    status: 400
                };
            }
        }

        // Validar teléfono si se proporciona
        if (data.phone && !/^[\+]?[0-9\s\-\(\)]{7,20}$/.test(data.phone)) {
            return {
                success: false,
                message: 'Formato de teléfono inválido',
                status: 400
            };
        }

        // Validar fechas si se proporcionan
        if (data.start_date || data.end_date) {
            const startDate = data.start_date ? new Date(data.start_date) : new Date(existingAdvertising.start_date);
            const endDate = data.end_date ? new Date(data.end_date) : new Date(existingAdvertising.end_date);

            if (isNaN(startDate.getTime())) {
                return {
                    success: false,
                    message: 'Fecha de inicio inválida',
                    status: 400
                };
            }

            if (isNaN(endDate.getTime())) {
                return {
                    success: false,
                    message: 'Fecha de fin inválida',
                    status: 400
                };
            }

            if (endDate < startDate) {
                return {
                    success: false,
                    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
                    status: 400
                };
            }
        }

        // Validar días de publicidad si se proporciona
        if (data.advertising_days !== undefined) {
            const advertisingDays = parseInt(data.advertising_days);
            if (isNaN(advertisingDays) || advertisingDays <= 0) {
                return {
                    success: false,
                    message: 'Los días de publicidad deben ser un número positivo',
                    status: 400
                };
            }
        }

        // Validar longitud de campos si se proporcionan
        if (data.company_name !== undefined) {
            if (data.company_name.trim().length < 2 || data.company_name.trim().length > 200) {
                return {
                    success: false,
                    message: 'El nombre de la empresa debe tener entre 2 y 200 caracteres',
                    status: 400
                };
            }
        }

        if (data.rif !== undefined) {
            if (data.rif.trim().length < 3 || data.rif.trim().length > 50) {
                return {
                    success: false,
                    message: 'El RIF debe tener entre 3 y 50 caracteres',
                    status: 400
                };
            }
        }

        if (data.company_address !== undefined) {
            if (data.company_address.trim().length < 5 || data.company_address.trim().length > 500) {
                return {
                    success: false,
                    message: 'La dirección debe tener entre 5 y 500 caracteres',
                    status: 400
                };
            }
        }

        // Validar formato de imagen si se proporciona
        if (data.advertising_image !== undefined && data.advertising_image !== null) {
            if (!/\.(jpg|jpeg|png|webp)$/i.test(data.advertising_image)) {
                return {
                    success: false,
                    message: 'Formato de imagen inválido. Solo se permiten: jpg, jpeg, png, webp',
                    status: 400
                };
            }
        }

        // Preparar datos para actualización
        const updateData = {};
        if (data.company_name !== undefined) updateData.company_name = data.company_name.trim();
        if (data.rif !== undefined) updateData.rif = data.rif.trim();
        if (data.company_address !== undefined) updateData.company_address = data.company_address.trim();
        if (data.phone !== undefined) updateData.phone = data.phone.trim();
        if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
        if (data.start_date !== undefined) updateData.start_date = data.start_date;
        if (data.end_date !== undefined) updateData.end_date = data.end_date;
        if (data.time !== undefined) updateData.time = data.time ? data.time.trim() : null;
        if (data.advertising_days !== undefined) updateData.advertising_days = parseInt(data.advertising_days);
        if (data.status !== undefined) updateData.status = data.status;
        if (data.advertising_image !== undefined) updateData.advertising_image = data.advertising_image || null;

        const updatedAdvertising = await Advertising.updateAdvertising(id, updateData);

        // Enviar correo a la empresa si se actualizó o agregó una imagen
        const imageWasUpdated = data.advertising_image !== undefined && updatedAdvertising.advertising_image;
        const imageWasAdded = !existingAdvertising.advertising_image && updatedAdvertising.advertising_image;
        
        if (imageWasUpdated || imageWasAdded) {
            try {
                await emailService.sendAdvertisingImagePublished({
                    company_name: updatedAdvertising.company_name,
                    email: updatedAdvertising.email,
                    start_date: updatedAdvertising.start_date,
                    end_date: updatedAdvertising.end_date,
                    advertising_days: updatedAdvertising.advertising_days,
                    advertising_image: updatedAdvertising.advertising_image,
                    rif: updatedAdvertising.rif,
                    phone: updatedAdvertising.phone
                });
                console.log(`✅ Email de confirmación de imagen actualizada enviado a: ${updatedAdvertising.email}`);
            } catch (emailError) {
                console.error('❌ Error enviando email de confirmación de publicidad actualizada:', emailError);
                // No fallar la operación si falla el email, pero registrar el error
            }
        }

        return {
            success: true,
            data: updatedAdvertising,
            message: 'Publicidad actualizada exitosamente',
            status: 200
        };

    } catch (error) {
        console.error('Error en updateAdvertising:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Actualizar estado de la publicidad
const updateAdvertisingStatus = async (id, status) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de publicidad inválido',
                status: 400
            };
        }

        // Validar que el status sea booleano
        if (typeof status !== 'boolean') {
            return {
                success: false,
                message: 'El estado debe ser true o false',
                status: 400
            };
        }

        // Verificar que la publicidad existe
        const existingAdvertising = await Advertising.getAdvertisingById(id);
        if (!existingAdvertising) {
            return {
                success: false,
                message: 'Publicidad no encontrada',
                status: 404
            };
        }

        const updatedAdvertising = await Advertising.updateAdvertisingStatus(id, status);

        return {
            success: true,
            data: updatedAdvertising,
            message: `Publicidad ${status ? 'activada' : 'desactivada'} exitosamente`,
            status: 200
        };

    } catch (error) {
        console.error('Error en updateAdvertisingStatus:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Eliminar publicidad
const deleteAdvertising = async (id) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de publicidad inválido',
                status: 400
            };
        }

        // Verificar que la publicidad existe
        const existingAdvertising = await Advertising.getAdvertisingById(id);
        if (!existingAdvertising) {
            return {
                success: false,
                message: 'Publicidad no encontrada',
                status: 404
            };
        }

        const deletedAdvertising = await Advertising.deleteAdvertising(id);

        return {
            success: true,
            data: deletedAdvertising,
            message: 'Publicidad eliminada exitosamente',
            status: 200
        };

    } catch (error) {
        console.error('Error en deleteAdvertising:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

module.exports = {
    getAllAdvertising,
    getActiveAdvertising,
    getAdvertisingById,
    getAdvertisingByEmail,
    getAdvertisingByRif,
    createAdvertising,
    updateAdvertising,
    updateAdvertisingStatus,
    deleteAdvertising
};

