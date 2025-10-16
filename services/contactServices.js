const Contact = require('../model/Contact');
const webSocketService = require('./websocketService');

// Obtener todos los contactos
const getAllContacts = async () => {
    try {
        const contacts = await Contact.getAllContacts();
        return {
            success: true,
            data: contacts,
            message: 'Contactos obtenidos exitosamente'
        };
    } catch (error) {
        console.error('Error en getAllContacts:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Obtener contactos activos
const getActiveContacts = async () => {
    try {
        const contacts = await Contact.getActiveContacts();
        return {
            success: true,
            data: contacts,
            message: 'Contactos activos obtenidos exitosamente'
        };
    } catch (error) {
        console.error('Error en getActiveContacts:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Obtener contacto por ID
const getContactById = async (id) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de contacto inválido',
                status: 400
            };
        }

        const contact = await Contact.getContactById(id);
        if (!contact) {
            return {
                success: false,
                message: 'Contacto no encontrado',
                status: 404
            };
        }

        return {
            success: true,
            data: contact,
            message: 'Contacto obtenido exitosamente'
        };
    } catch (error) {
        console.error('Error en getContactById:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Obtener contactos por email
const getContactsByEmail = async (email) => {
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

        const contacts = await Contact.getContactsByEmail(email);
        return {
            success: true,
            data: contacts,
            message: 'Contactos obtenidos exitosamente'
        };
    } catch (error) {
        console.error('Error en getContactsByEmail:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Crear contacto
const createContact = async (data) => {
    try {
        // Validar datos requeridos
        if (!data.contact_name || !data.contact_lastname || !data.contact_email || !data.contact_message) {
            return {
                success: false,
                message: 'Los campos nombre, apellido, email y mensaje son obligatorios',
                status: 400
            };
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contact_email)) {
            return {
                success: false,
                message: 'Formato de email inválido',
                status: 400
            };
        }

        // Validar longitud del mensaje
        if (data.contact_message.length < 10) {
            return {
                success: false,
                message: 'El mensaje debe tener al menos 10 caracteres',
                status: 400
            };
        }

        // Validar longitud del nombre y apellido
        if (data.contact_name.length < 2 || data.contact_lastname.length < 2) {
            return {
                success: false,
                message: 'El nombre y apellido deben tener al menos 2 caracteres',
                status: 400
            };
        }

        // Validar teléfono si se proporciona
        if (data.contact_phone && !/^[\+]?[0-9\s\-\(\)]{7,15}$/.test(data.contact_phone)) {
            return {
                success: false,
                message: 'Formato de teléfono inválido',
                status: 400
            };
        }

        // Crear el contacto
        const contactData = {
            contact_name: data.contact_name.trim(),
            contact_lastname: data.contact_lastname.trim(),
            contact_email: data.contact_email.trim().toLowerCase(),
            contact_phone: data.contact_phone ? data.contact_phone.trim() : null,
            contact_message: data.contact_message.trim()
        };

        const savedContact = await Contact.createContact(contactData);

        // Enviar notificación WebSocket a administradores
        try {
            webSocketService.notifyNewContact(savedContact);
        } catch (wsError) {
            console.error('Error enviando notificación WebSocket:', wsError);
            // No fallar la operación si WebSocket falla
        }

        return {
            success: true,
            data: savedContact,
            message: 'Contacto creado exitosamente',
            status: 201
        };

    } catch (error) {
        console.error('Error en createContact:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Actualizar contacto
const updateContact = async (id, data) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de contacto inválido',
                status: 400
            };
        }

        // Verificar que el contacto existe
        const existingContact = await Contact.getContactById(id);
        if (!existingContact) {
            return {
                success: false,
                message: 'Contacto no encontrado',
                status: 404
            };
        }

        // Validar email si se proporciona
        if (data.contact_email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.contact_email)) {
                return {
                    success: false,
                    message: 'Formato de email inválido',
                    status: 400
                };
            }
        }

        // Validar longitud del mensaje si se proporciona
        if (data.contact_message && data.contact_message.length < 10) {
            return {
                success: false,
                message: 'El mensaje debe tener al menos 10 caracteres',
                status: 400
            };
        }

        // Validar longitud del nombre y apellido si se proporcionan
        if (data.contact_name && data.contact_name.length < 2) {
            return {
                success: false,
                message: 'El nombre debe tener al menos 2 caracteres',
                status: 400
            };
        }

        if (data.contact_lastname && data.contact_lastname.length < 2) {
            return {
                success: false,
                message: 'El apellido debe tener al menos 2 caracteres',
                status: 400
            };
        }

        // Validar teléfono si se proporciona
        if (data.contact_phone && !/^[\+]?[0-9\s\-\(\)]{7,15}$/.test(data.contact_phone)) {
            return {
                success: false,
                message: 'Formato de teléfono inválido',
                status: 400
            };
        }

        // Preparar datos para actualización
        const updateData = {};
        if (data.contact_name !== undefined) updateData.contact_name = data.contact_name.trim();
        if (data.contact_lastname !== undefined) updateData.contact_lastname = data.contact_lastname.trim();
        if (data.contact_email !== undefined) updateData.contact_email = data.contact_email.trim().toLowerCase();
        if (data.contact_phone !== undefined) updateData.contact_phone = data.contact_phone ? data.contact_phone.trim() : null;
        if (data.contact_message !== undefined) updateData.contact_message = data.contact_message.trim();
        if (data.contact_status !== undefined) updateData.contact_status = data.contact_status;

        const updatedContact = await Contact.updateContact(id, updateData);

        return {
            success: true,
            data: updatedContact,
            message: 'Contacto actualizado exitosamente',
            status: 200
        };

    } catch (error) {
        console.error('Error en updateContact:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Actualizar estado del contacto
const updateContactStatus = async (id, status) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de contacto inválido',
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

        // Verificar que el contacto existe
        const existingContact = await Contact.getContactById(id);
        if (!existingContact) {
            return {
                success: false,
                message: 'Contacto no encontrado',
                status: 404
            };
        }

        const updatedContact = await Contact.updateContactStatus(id, status);

        return {
            success: true,
            data: updatedContact,
            message: `Contacto ${status ? 'activado' : 'desactivado'} exitosamente`,
            status: 200
        };

    } catch (error) {
        console.error('Error en updateContactStatus:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

// Eliminar contacto
const deleteContact = async (id) => {
    try {
        // Validar que el ID sea un número
        if (isNaN(id)) {
            return {
                success: false,
                message: 'ID de contacto inválido',
                status: 400
            };
        }

        // Verificar que el contacto existe
        const existingContact = await Contact.getContactById(id);
        if (!existingContact) {
            return {
                success: false,
                message: 'Contacto no encontrado',
                status: 404
            };
        }

        const deletedContact = await Contact.deleteContact(id);

        return {
            success: true,
            data: deletedContact,
            message: 'Contacto eliminado exitosamente',
            status: 200
        };

    } catch (error) {
        console.error('Error en deleteContact:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
};

module.exports = {
    getAllContacts,
    getActiveContacts,
    getContactById,
    getContactsByEmail,
    createContact,
    updateContact,
    updateContactStatus,
    deleteContact
};
