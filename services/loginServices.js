const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const systemLogger = require('../help/system/systemLogger');
const authLogger = require('../help/auth/authLogger');



const loginService = async (data, req) => { 
    try {
        if (!data || !data.user_email || !data.user_password) {
            
            authLogger.logFailedAttempt(data.user_email || 'no encontrado', req, 'Datos incompletos');
            return {
                success: false,
                status: 400,
                message: 'Datos incompletos'
            };
        }
        // verificar el usuario por el email
        const userExists = await User.getUserByEmail(data.user_email);
        if (!userExists) {
            
            authLogger.logFailedAttempt(data.user_email, req, 'Usuario no encontrado');
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }
        // verificar si el usuario está verificado
        if (!userExists.user_verify) {
            
            authLogger.logFailedAttempt(data.user_email, req, 'Usuario no verificado');
            return {
                success: false,
                status: 403,
                message: 'Usuario no verificado'
            };
        }
        // verificar la contraseña
        const isCorrect = await bcrypt.compare(data.user_password, userExists.user_password);
        if (!isCorrect) {
            
            authLogger.logFailedAttempt(data.user_email, req, 'Contraseña incorrecta');
            return {
                success: false,
                status: 400,
                message: 'Email o Contraseña inválida'
            };
        }

        // // Actualizar estado del usuario a 'activo' si es necesario
        if (!userExists.user_status) {
            await User.updateUserStatus(userExists.user_id, true);
        }
        // generar el token
        const userForToken = {
            id: userExists.user_id,
            name: userExists.user_name,
            role: userExists.role_id,
            online: true,
            verify: userExists.user_verify
        };
        // Token válido por 1 día
        const accesstoken = jwt.sign(
            userForToken,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        // Registrar login exitoso
         const userForLogger = {
            id: userExists.user_id, 
            email: userExists.user_email
        };

        await authLogger.logLogin(userForLogger, req);
        // 
        return {
            success: true,
            status: 200,
            message: 'Login exitoso',
            user: {
                id: userExists.user_id,
                name: userExists.user_name,
                email: userExists.user_email,
                role: userExists.role_id,
                online: true,
            },
            accesstoken,
            cookieOptions: {
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
            }
        };

    } catch (error) {
        console.error('Error en loginService:', error);
        return {
            success: false,
            status: 500,
            message: 'Error interno del servidor'
        };
    }
};

module.exports = {
    loginService
};