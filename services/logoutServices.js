const User = require('../model/User');
const jwt = require('jsonwebtoken');
const systemLogger = require('../help/auth/authLogger');


const logoutService = async (req, cookies) => {
    try {
        const accessToken = cookies?.accesstoken;
        
        if (!accessToken) {
            return {
                status: 401,
                success: false,
                message: 'No token provided'
            };
        }

        let userId = null;

        // Intentar obtener el ID del usuario del token
        try {
            const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
            userId = decodedToken.id;
        } catch (tokenError) {
            console.log('Token inválido o expirado, pero procediendo con logout:', tokenError.message);
        }

        // Si tenemos user ID, actualizar estado
        if (userId) {
            try {
                 await User.updateUserStatus(userId, false);
            } catch (dbError) {
                console.warn('Error actualizando estado:', dbError.message);
            }

            try {
                await systemLogger.logLogout(userId, req);
            } catch (logError) {
                console.warn('Error registrando logout:', logError.message);
            }
        }

        return {
            status: 200,
            success: true,
            message: 'Sesión cerrada exitosamente'
        };

    } catch (error) {
        console.error('Error en logoutService:', error);
        return {
            status: 500,
            success: false,
            message: 'Error interno del servidor'
        };
    }
}

module.exports = { logoutService };