const programsModel = require('../model/programs');
const podcastsModel = require('../model/podcats');

// Crear nuevo programa
const createProgramService = async (programData, userId) => {
    try {
        // Validaciones de negocio básicas
        if (!programData.program_title) {
            throw new Error('El título del programa es obligatorio');
        }

        if (programData.program_title.length < 3) {
            throw new Error('El título debe tener al menos 3 caracteres');
        }

        if (!programData.program_type) {
            throw new Error('El tipo de programa es obligatorio');
        }

        if (!['tiktok_live', 'instagram_live', 'podcast'].includes(programData.program_type)) {
            throw new Error('Tipo de programa inválido. Debe ser: tiktok_live, instagram_live o podcast');
        }

        if (!programData.scheduled_date) {
            throw new Error('La fecha y hora programada es obligatoria');
        }

        if (!programData.duration_minutes) {
            throw new Error('La duración del programa es obligatoria');
        }

        // Validar que el podcast existe si el tipo es podcast
        if (programData.program_type === 'podcast' && programData.podcast_id) {
            try {
                await podcastsModel.getPodcastById(programData.podcast_id);
            } catch (error) {
                throw new Error(`El podcast con ID ${programData.podcast_id} no existe`);
            }
        }

        // Validar que hay usuarios asociados
        if (!programData.program_users || !Array.isArray(programData.program_users) || programData.program_users.length === 0) {
            throw new Error('Debe asociar al menos un usuario al programa');
        }

        // Crear el programa (las validaciones de duración, horario y espaciado se hacen en el modelo)
        const program = await programsModel.createProgram(programData, userId);
        
        return {
            success: true,
            message: 'Programa creado exitosamente',
            data: program
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener todos los programas con filtros
const getAllProgramsService = async (filters = {}) => {
    try {
        const programs = await programsModel.getAllPrograms(filters);
        
        return {
            success: true,
            message: 'Programas obtenidos exitosamente',
            data: programs,
            count: programs.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Obtener programa por ID
const getProgramByIdService = async (programId) => {
    try {
        if (!programId) {
            throw new Error('ID del programa es requerido');
        }

        const program = await programsModel.getProgramById(programId);
        
        if (!program) {
            throw new Error('Programa no encontrado');
        }
        
        return {
            success: true,
            message: 'Programa obtenido exitosamente',
            data: program
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener programas por tipo
const getProgramsByTypeService = async (programType) => {
    try {
        if (!programType) {
            throw new Error('Tipo de programa es requerido');
        }

        if (!['tiktok_live', 'instagram_live', 'podcast'].includes(programType)) {
            throw new Error('Tipo de programa inválido');
        }

        const programs = await programsModel.getProgramsByType(programType);
        
        return {
            success: true,
            message: `Programas de tipo ${programType} obtenidos exitosamente`,
            data: programs,
            count: programs.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Obtener programas próximos
const getUpcomingProgramsService = async (limit = 10) => {
    try {
        const limitNumber = parseInt(limit) || 10;
        const programs = await programsModel.getUpcomingPrograms(limitNumber);
        
        return {
            success: true,
            message: 'Programas próximos obtenidos exitosamente',
            data: programs,
            count: programs.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Obtener programa actual
const getCurrentProgramService = async () => {
    try {
        const program = await programsModel.getCurrentProgram();
        
        return {
            success: true,
            message: program ? 'Programa actual obtenido exitosamente' : 'No hay programa en curso',
            data: program
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Actualizar programa
const updateProgramService = async (programId, programData, userId) => {
    try {
        if (!programId) {
            throw new Error('ID del programa es requerido');
        }

        // Validar que el programa existe
        const existingProgram = await programsModel.getProgramById(programId);
        if (!existingProgram) {
            throw new Error('Programa no encontrado');
        }

        // Validar tipo si se está cambiando
        if (programData.program_type && !['tiktok_live', 'instagram_live', 'podcast'].includes(programData.program_type)) {
            throw new Error('Tipo de programa inválido');
        }

        // Validar podcast si se está cambiando
        if (programData.program_type === 'podcast' && programData.podcast_id) {
            try {
                await podcastsModel.getPodcastById(programData.podcast_id);
            } catch (error) {
                throw new Error(`El podcast con ID ${programData.podcast_id} no existe`);
            }
        }

        // Actualizar el programa
        const updatedProgram = await programsModel.updateProgram(programId, programData, userId);
        
        return {
            success: true,
            message: 'Programa actualizado exitosamente',
            data: updatedProgram
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Eliminar programa
const deleteProgramService = async (programId, userId) => {
    try {
        if (!programId) {
            throw new Error('ID del programa es requerido');
        }

        // Validar que el programa existe
        const existingProgram = await programsModel.getProgramById(programId);
        if (!existingProgram) {
            throw new Error('Programa no encontrado');
        }

        const deletedProgram = await programsModel.deleteProgram(programId, userId);
        
        return {
            success: true,
            message: 'Programa eliminado exitosamente',
            data: deletedProgram
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener programas necesarios para cubrir el día
const getProgramsNeededForDayService = async (date) => {
    try {
        if (!date) {
            throw new Error('La fecha es requerida');
        }

        const analysis = await programsModel.getProgramsNeededForDay(date);
        
        return {
            success: true,
            message: 'Análisis de programas obtenido exitosamente',
            data: analysis
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener espacios publicitarios disponibles
const getAvailableAdvertisingSlotsService = async (date) => {
    try {
        if (!date) {
            throw new Error('La fecha es requerida');
        }

        const slots = await programsModel.getAvailableAdvertisingSlots(date);
        
        return {
            success: true,
            message: 'Espacios publicitarios obtenidos exitosamente',
            data: slots
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener cantidad de programas ocupados
const getOccupiedProgramsCountService = async (date = null) => {
    try {
        const count = await programsModel.getOccupiedProgramsCount(date);
        
        return {
            success: true,
            message: 'Conteo de programas obtenido exitosamente',
            data: count
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener usuarios de un programa
const getProgramUsersService = async (programId) => {
    try {
        if (!programId) {
            throw new Error('ID del programa es requerido');
        }

        const users = await programsModel.getProgramUsers(programId);
        
        return {
            success: true,
            message: 'Usuarios del programa obtenidos exitosamente',
            data: users,
            count: users.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Agregar usuarios a un programa
const addProgramUsersService = async (programId, programUsers, userId) => {
    try {
        if (!programId) {
            throw new Error('ID del programa es requerido');
        }

        if (!programUsers || !Array.isArray(programUsers) || programUsers.length === 0) {
            throw new Error('Debe proporcionar al menos un usuario');
        }

        // Validar que el programa existe
        await programsModel.getProgramById(programId);

        // Validar roles de usuarios
        await programsModel.validateProgramUsers(programUsers);

        const addedUsers = await programsModel.addProgramUsers(programId, programUsers);
        
        return {
            success: true,
            message: 'Usuarios agregados al programa exitosamente',
            data: addedUsers,
            count: addedUsers.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Remover usuarios de un programa
const removeProgramUsersService = async (programId, userIds, userId) => {
    try {
        if (!programId) {
            throw new Error('ID del programa es requerido');
        }

        // Validar que el programa existe
        const program = await programsModel.getProgramById(programId);

        // Verificar permisos
        await programsModel.canModifyProgram(programId, userId);

        await programsModel.removeProgramUsers(programId, userIds || []);
        
        return {
            success: true,
            message: 'Usuarios removidos del programa exitosamente',
            data: null
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

module.exports = {
    createProgramService,
    getAllProgramsService,
    getProgramByIdService,
    getProgramsByTypeService,
    getUpcomingProgramsService,
    getCurrentProgramService,
    updateProgramService,
    deleteProgramService,
    getProgramsNeededForDayService,
    getAvailableAdvertisingSlotsService,
    getOccupiedProgramsCountService,
    getProgramUsersService,
    addProgramUsersService,
    removeProgramUsersService
};

