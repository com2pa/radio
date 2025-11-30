const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { PAGE_URL } = require('../config');
const Role = require('../model/Role')

// obtengo todos los usuarios
const getAllUsers = async () => {
    try {
        const users = await User.getAllUsers();
    return {
        success: true,
        data: users,
    }
    } catch (error) {
        console.error('Error en getAllUsers:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        
        }
    }
}
// creando usuario
const createUser = async (data) => {
    try {
        // Verificar si el email ya existe - CORREGIDO
        const existingUser = await User.getUserByEmail(data.user_email);
        console.log('Usuario ya existe', existingUser);
        
        if (existingUser) {
            return { 
                success: false, 
                message: 'El email ya existe',
                status: 400 
            };
        }

        // Validación del email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.user_email)) {
            return {
                success: false,
                message: 'Formato de email inválido',
                status: 400
            };
        }

        // Validar fortaleza de la contraseña - CORREGIDO (variable password)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(data.user_password)) {
            return {
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres, incluyendo letras mayúsculas, letras minúsculas y números',
                status: 400
            };
        }

        // Encriptar la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.user_password, saltRounds);

        // Crear el nuevo usuario - CORREGIDO (estructura de datos)
        const userData = {
            user_name: data.user_name,
            user_lastname: data.user_lastname,
            user_email: data.user_email,
            user_password: hashedPassword,
            user_address: data.user_address,
            user_phone: data.user_phone,
            user_age: data.user_age
        };

        // Guardar el usuario - CORREGIDO
        const savedUser = await User.createUser(userData);
        console.log('Usuario guardado:', savedUser);

        // Crear token - CORREGIDO (usar user_id en lugar de id)
        const token = jwt.sign(
            { id: savedUser.user_id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        // Enviar correo de verificación - CORREGIDO (variables)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Radio Oxígeno 88.1 FM" <${process.env.EMAIL_USER}>`,
            to: data.user_email,
            subject: '🎵 ¡Bienvenido a Radio Oxígeno 88.1 FM! - Verifica tu cuenta',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Verificación de Cuenta - Radio Oxígeno 88.1 FM</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header con gradiente -->
                        <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 40px 20px; text-align: center; position: relative; overflow: hidden;">
                            <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                            <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                            
                            <div style="position: relative; z-index: 2;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                    🎵 Radio Oxígeno
                                </h1>
                                <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">
                                    88.1 FM
                                </p>
                                <div style="background: rgba(255,255,255,0.2); height: 2px; width: 80px; margin: 20px auto; border-radius: 1px;"></div>
                            </div>
                        </div>
                        
                        <!-- Contenido principal -->
                        <div style="padding: 40px 30px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                    <span style="font-size: 32px; color: white;">📻</span>
                                </div>
                                <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: 600;">
                                    ¡Bienvenido a nuestra familia!
                                </h2>
                            </div>
                            
                            <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; border-left: 4px solid #667eea; margin-bottom: 30px;">
                                <p style="font-size: 16px; color: #2c3e50; margin: 0 0 15px 0; line-height: 1.6;">
                                    Hola <strong style="color: #667eea;">${data.user_name}</strong>,
                                </p>
                                <p style="font-size: 16px; color: #5a6c7d; margin: 0; line-height: 1.6;">
                                    ¡Gracias por unirte a Radio Oxígeno 88.1 FM! Estamos emocionados de tenerte como parte de nuestra comunidad. Para completar tu registro y acceder a todos nuestros contenidos exclusivos, por favor verifica tu dirección de correo electrónico.
                                </p>
                            </div>
                            
                            <!-- Botón de verificación -->
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${PAGE_URL}/verify/${savedUser.user_id}/${token}" 
                                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                          color: white; 
                                          padding: 16px 32px; 
                                          text-decoration: none; 
                                          border-radius: 50px; 
                                          font-weight: 600; 
                                          font-size: 16px; 
                                          display: inline-block; 
                                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                                          transition: all 0.3s ease;
                                          border: none;
                                          cursor: pointer;">
                                    ✨ Verificar mi cuenta
                                </a>
                            </div>
                            
                            <!-- Información adicional -->
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <p style="font-size: 14px; color: #856404; margin: 0 0 10px 0; font-weight: 600;">
                                    📝 Información importante:
                                </p>
                                <p style="font-size: 14px; color: #856404; margin: 0; line-height: 1.5;">
                                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                                </p>
                                <p style="font-size: 12px; color: #6c757d; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0 0 0; font-family: monospace;">
                                    ${PAGE_URL}/verify/${savedUser.user_id}/${token}
                                </p>
                            </div>
                            
                            <p style="font-size: 14px; color: #6c757d; text-align: center; margin: 30px 0 0 0; line-height: 1.5;">
                                Si no has solicitado este registro, por favor ignora este mensaje.
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #2c3e50; padding: 30px; text-align: center;">
                            <div style="margin-bottom: 20px;">
                                <h3 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                                    🎵 Radio Oxígeno 88.1 FM
                                </h3>
                                <p style="color: #bdc3c7; margin: 5px 0 0 0; font-size: 14px;">
                                    Tu música, tu oxígeno
                                </p>
                            </div>
                            
                            <div style="border-top: 1px solid #34495e; padding-top: 20px;">
                                <p style="color: #95a5a6; font-size: 12px; margin: 0; line-height: 1.4;">
                                    © 2024 Radio Oxígeno 88.1 FM. Todos los derechos reservados.<br>
                                    Este es un mensaje automático, por favor no responder.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `🎵 Radio Oxígeno 88.1 FM\n\nHola ${data.user_name},\n\n¡Gracias por unirte a Radio Oxígeno 88.1 FM! Estamos emocionados de tenerte como parte de nuestra comunidad.\n\nPara completar tu registro y acceder a todos nuestros contenidos exclusivos, por favor verifica tu dirección de correo electrónico visitando este enlace:\n\n${PAGE_URL}/verify/${savedUser.user_id}/${token}\n\nSi no has solicitado este registro, por favor ignora este mensaje.\n\n¡Bienvenido a nuestra familia!\n\nEquipo de Radio Oxígeno 88.1 FM\nTu música, tu oxígeno`
        });

        return {
            success: true,
            data: {
                user: savedUser,
                token: token,
                message: 'Usuario registrado. Verifique su correo :)'
            },
            status: 201
        };

    } catch (error) {
        console.error('Error en createUser:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
}
// actualizando el token
// actualizando el token - FUNCIÓN CORREGIDA
const updatedUserToken = async (token, userId) => {
    try {
        // verifico el token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log('token decodificado', decodedToken);
        
        // Verificar que el ID del token coincida con el ID del parámetro
        if (decodedToken.id != userId) {
            return {
                success: false,
                status: 400,
                message: 'Token no válido para este usuario'
            };
        }
        
        const id = userId; // Usar el ID del parámetro, no del token
        
        // Obtener el usuario actual primero para mantener los datos
        const existingUser = await User.getUserById(id);
        if (!existingUser) {
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }

        // Actualizar solo el campo user_verify manteniendo los demás datos
        const user = await User.updateUser(
            id,
            {
                user_name: existingUser.user_name,
                user_lastname: existingUser.user_lastname,
                user_email: existingUser.user_email,
                user_address: existingUser.user_address,
                user_phone: existingUser.user_phone,
                user_age: existingUser.user_age,
                user_status: existingUser.user_status,
                user_verify: true, // Solo cambiamos este campo
                role_id: existingUser.role_id
            }
        );
        
        console.log('usuario verificado', user);
        if (!user) {
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }
        
        return {
            success: true,
            status: 200,
            message: 'Usuario verificado con éxito',
            redirectTo: '/login'
        };

    } catch (error) {
        console.error('Error en verificación:', error);
        
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            // Encontrar el usuario por ID usando el parámetro userId
            const user = await User.getUserById(userId);
            if (!user) {
                return {
                    success: false,
                    status: 404,
                    message: 'Usuario no encontrado'
                };
            }

            // Firmar el nuevo token
            const newToken = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d',
            });

            // Enviar correo para verificación de usuario registrado
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            // Enviar el correo
            await transporter.sendMail({
                from: `"Radio Oxígeno 88.1 FM" <${process.env.EMAIL_USER}>`,
                to: user.user_email,
                subject: '🔄 Enlace de verificación renovado - Radio Oxígeno 88.1 FM',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Enlace Renovado - Radio Oxígeno 88.1 FM</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            
                            <!-- Header con gradiente naranja -->
                            <div style="background: linear-gradient(135deg, #ff6b4a 0%, #ff8a65 100%); padding: 40px 20px; text-align: center; position: relative; overflow: hidden;">
                                <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                                <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                                
                                <div style="position: relative; z-index: 2;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                        🎵 Radio Oxígeno
                                    </h1>
                                    <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">
                                        88.1 FM
                                    </p>
                                    <div style="background: rgba(255,255,255,0.2); height: 2px; width: 80px; margin: 20px auto; border-radius: 1px;"></div>
                                </div>
                            </div>
                            
                            <!-- Contenido principal -->
                            <div style="padding: 40px 30px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <div style="background: linear-gradient(135deg, #ff6b4a 0%, #ff8a65 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(255, 107, 74, 0.4);">
                                        <span style="font-size: 32px; color: white;">🔄</span>
                                    </div>
                                    <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: 600;">
                                        ¡Enlace renovado!
                                    </h2>
                                </div>
                                
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #ff6b4a;">
                                    <p style="font-size: 16px; color: #2c3e50; margin: 0 0 15px 0; line-height: 1.6;">
                                        Hola <strong style="color: #ff6b4a;">${user.user_name}</strong>,
                                    </p>
                                    <p style="font-size: 16px; color: #5a6c7d; margin: 0; line-height: 1.6;">
                                        El enlace de verificación que recibiste anteriormente ha expirado por seguridad. No te preocupes, hemos generado uno nuevo para que puedas completar tu registro en Radio Oxígeno 88.1 FM.
                                    </p>
                                </div>
                                
                                <!-- Botón de verificación -->
                                <div style="text-align: center; margin: 35px 0;">
                                    <a href="${PAGE_URL}/verify/${userId}/${newToken}" 
                                       style="background: linear-gradient(135deg, #ff6b4a 0%, #ff8a65 100%); 
                                              color: white; 
                                              padding: 16px 32px; 
                                              text-decoration: none; 
                                              border-radius: 50px; 
                                              font-weight: 600; 
                                              font-size: 16px; 
                                              display: inline-block; 
                                              box-shadow: 0 4px 15px rgba(255, 107, 74, 0.4);
                                              transition: all 0.3s ease;
                                              border: none;
                                              cursor: pointer;">
                                        ✨ Nuevo enlace de verificación
                                    </a>
                                </div>
                                
                                <!-- Información adicional -->
                                <div style="background: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                    <p style="font-size: 14px; color: #0c5460; margin: 0 0 10px 0; font-weight: 600;">
                                        ⏰ Información importante:
                                    </p>
                                    <p style="font-size: 14px; color: #0c5460; margin: 0; line-height: 1.5;">
                                        • Este enlace estará activo por 24 horas<br>
                                        • Si el botón no funciona, copia y pega este enlace en tu navegador:
                                    </p>
                                    <p style="font-size: 12px; color: #6c757d; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0 0 0; font-family: monospace;">
                                        ${PAGE_URL}/verify/${userId}/${newToken}
                                    </p>
                                </div>
                                
                                <p style="font-size: 14px; color: #6c757d; text-align: center; margin: 30px 0 0 0; line-height: 1.5;">
                                    Si no has solicitado este registro, por favor ignora este mensaje.
                                </p>
                            </div>
                            
                            <!-- Footer -->
                            <div style="background: #2c3e50; padding: 30px; text-align: center;">
                                <div style="margin-bottom: 20px;">
                                    <h3 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                                        🎵 Radio Oxígeno 88.1 FM
                                    </h3>
                                    <p style="color: #bdc3c7; margin: 5px 0 0 0; font-size: 14px;">
                                        Tu música, tu oxígeno
                                    </p>
                                </div>
                                
                                <div style="border-top: 1px solid #34495e; padding-top: 20px;">
                                    <p style="color: #95a5a6; font-size: 12px; margin: 0; line-height: 1.4;">
                                        © 2024 Radio Oxígeno 88.1 FM. Todos los derechos reservados.<br>
                                        Este es un mensaje automático, por favor no responder.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `🎵 Radio Oxígeno 88.1 FM\n\nHola ${user.user_name},\n\nEl enlace de verificación que recibiste anteriormente ha expirado por seguridad. No te preocupes, hemos generado uno nuevo para que puedas completar tu registro en Radio Oxígeno 88.1 FM.\n\nNuevo enlace de verificación:\n${PAGE_URL}/verify/${userId}/${newToken}\n\nEste enlace estará activo por 24 horas.\n\nSi no has solicitado este registro, por favor ignora este mensaje.\n\nEquipo de Radio Oxígeno 88.1 FM\nTu música, tu oxígeno`
            });

            return {
                success: false,
                status: 400,
                message: 'El link expiró. Se ha enviado un nuevo link de verificación a su correo'
            };
        }

        // Para otros tipos de errores
        return {
            success: false,
            status: 500,
            message: 'Error interno del servidor'
        };
    }
}

// Actualizar rol del usuario
const updateUserRole = async (userId, roleData) => {
    try {
        const { role_id, role_name } = roleData;

        // Validar que se proporcione algún identificador del rol
        if (!role_id && !role_name) {
            return {
                success: false,
                status: 400,
                message: 'Se requiere role_id o role_name para actualizar el rol'
            };
        }

        // Verificar que el usuario existe
        const user = await User.getUserById(userId);
        if (!user) {
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }

        let roleIdToAssign;

        // Si se proporciona role_name, buscar el ID correspondiente
        if (role_name) {
            const role = await Role.getRoleByName(role_name);
            if (!role) {
                return {
                    success: false,
                    status: 404,
                    message: 'Rol no encontrado'
                };
            }
            roleIdToAssign = role.role_id;
        } else {
            // Si se proporciona role_id, verificar que existe
            const role = await Role.getRoleById(role_id);
            if (!role) {
                return {
                    success: false,
                    status: 404,
                    message: 'Rol no encontrado'
                };
            }
            roleIdToAssign = role_id;
        }

        // Actualizar el rol del usuario
        const updatedUser = await User.updateUser(userId, {
            role_id: roleIdToAssign,
            // Mantener los demás datos del usuario
            user_name: user.user_name,
            user_lastname: user.user_lastname,
            user_email: user.user_email,
            user_address: user.user_address,
            user_phone: user.user_phone,
            user_age: user.user_age,
            user_status: user.user_status,
            user_verify: user.user_verify
        });

        return {
            success: true,
            status: 200,
            data: {
                user_id: updatedUser.user_id,
                user_email: updatedUser.user_email,
                role_id: updatedUser.role_id,
                role_name: (await Role.getRoleById(roleIdToAssign)).role_name
            },
            message: 'Rol de usuario actualizado exitosamente'
        };

    } catch (error) {
        console.error('Error en servicio de usuario:', error);
        return {
            success: false,
            status: 500,
            message: 'Error interno del servidor'
        };
    }
}

// Obtener perfil del usuario actual (sin información sensible)
const getUserProfile = async (userId) => {
    try {
        const user = await User.getUserById(userId);
        if (!user) {
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }

        // Omitir información sensible en la respuesta
        const { user_password, user_verify, role_id, ...userProfile } = user;
        
        return {
            success: true,
            data: userProfile,
            status: 200
        };
    } catch (error) {
        console.error('Error en getUserProfile:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
}

// Actualizar perfil del usuario (datos básicos)
const updateUserProfile = async (userId, userData) => {
    try {
        const { user_name, user_lastname, user_email, user_address, user_phone, user_age } = userData;

        // Verificar que el usuario existe
        const existingUser = await User.getUserById(userId);
        if (!existingUser) {
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }

        // Si se está cambiando el email, verificar que no esté en uso
        if (user_email && user_email !== existingUser.user_email) {
            const emailExists = await User.getUserByEmail(user_email);
            if (emailExists && emailExists.user_id !== userId) {
                return {
                    success: false,
                    status: 400,
                    message: 'El email ya está en uso por otro usuario'
                };
            }
        }

        // Validar formato de email si se proporciona
        if (user_email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(user_email)) {
                return {
                    success: false,
                    status: 400,
                    message: 'Formato de email inválido'
                };
            }
        }

        // Preparar datos para actualizar (solo datos que el usuario puede modificar)
        // Usar los valores enviados si están presentes en el request, de lo contrario mantener los existentes
        const updateData = {
            user_name: user_name !== undefined ? user_name.trim() : existingUser.user_name,
            user_lastname: user_lastname !== undefined ? user_lastname.trim() : existingUser.user_lastname,
            user_email: user_email !== undefined ? user_email.trim() : existingUser.user_email,
            user_address: user_address !== undefined ? (user_address ? user_address.trim() : null) : existingUser.user_address,
            user_phone: user_phone !== undefined ? user_phone.trim() : existingUser.user_phone,
            user_age: user_age !== undefined ? user_age : existingUser.user_age,
            // Mantener los campos que el usuario no puede modificar desde el perfil
            user_status: existingUser.user_status,
            user_verify: existingUser.user_verify,
            role_id: existingUser.role_id
        };
        
        console.log('📝 Datos recibidos del frontend:', userData);
        console.log('📝 Datos preparados para actualizar:', updateData);

        // Actualizar usuario
        const updatedUser = await User.updateUser(userId, updateData);

        // Omitir información sensible en la respuesta
        const { user_password, ...userWithoutPassword } = updatedUser;

        return {
            success: true,
            status: 200,
            message: 'Perfil actualizado exitosamente',
            data: userWithoutPassword
        };

    } catch (error) {
        console.error('Error en updateUserProfile:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
}

// Cambiar contraseña desde el perfil del usuario
const changePassword = async (userId, passwordData) => {
    try {
        const { newPassword, confirmPassword } = passwordData;

        // Validar que se proporcionen las nuevas contraseñas
        if (!newPassword || !confirmPassword) {
            return {
                success: false,
                status: 400,
                message: 'La nueva contraseña y su confirmación son requeridas'
            };
        }

        // Verificar que las nuevas contraseñas coincidan
        if (newPassword !== confirmPassword) {
            return {
                success: false,
                status: 400,
                message: 'Las nuevas contraseñas no coinciden'
            };
        }

        // Obtener el usuario
        const user = await User.getUserById(userId);
        if (!user) {
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }

        // Validar fortaleza de la nueva contraseña
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(newPassword)) {
            return {
                success: false,
                status: 400,
                message: 'La nueva contraseña debe tener al menos 6 caracteres, incluyendo letras mayúsculas, letras minúsculas y números'
            };
        }

        // Encriptar la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Actualizar la contraseña en la base de datos
        const updatedUser = await User.updateUserPassword(userId, hashedPassword);

        if (!updatedUser) {
            return {
                success: false,
                status: 500,
                message: 'Error al actualizar la contraseña'
            };
        }

        // Cerrar sesión del usuario (actualizar estado a offline)
        await User.updateUserStatus(userId, false);
        console.log(`✅ Sesión cerrada para usuario ${userId} después de cambiar contraseña`);

        // Enviar correo de notificación de cambio de contraseña con la nueva contraseña
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Radio Oxígeno 88.1 FM" <${process.env.EMAIL_USER}>`,
            to: user.user_email,
            subject: '🔒 Contraseña actualizada - Radio Oxígeno 88.1 FM',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Contraseña Actualizada - Radio Oxígeno 88.1 FM</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header con gradiente verde -->
                        <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 40px 20px; text-align: center; position: relative; overflow: hidden;">
                            <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                            <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                            
                            <div style="position: relative; z-index: 2;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                    🎵 Radio Oxígeno
                                </h1>
                                <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">
                                    88.1 FM
                                </p>
                                <div style="background: rgba(255,255,255,0.2); height: 2px; width: 80px; margin: 20px auto; border-radius: 1px;"></div>
                            </div>
                        </div>
                        
                        <!-- Contenido principal -->
                        <div style="padding: 40px 30px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);">
                                    <span style="font-size: 32px; color: white;">🔒</span>
                                </div>
                                <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: 600;">
                                    Contraseña actualizada
                                </h2>
                            </div>
                            
                            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #27ae60;">
                                <p style="font-size: 16px; color: #155724; margin: 0 0 15px 0; line-height: 1.6;">
                                    Hola <strong style="color: #27ae60;">${user.user_name}</strong>,
                                </p>
                                <p style="font-size: 16px; color: #155724; margin: 0 0 15px 0; line-height: 1.6;">
                                    Tu contraseña ha sido actualizada exitosamente. Por seguridad, tu sesión ha sido cerrada y deberás iniciar sesión nuevamente con tu nueva contraseña.
                                </p>
                                <p style="font-size: 16px; color: #155724; margin: 0; line-height: 1.6;">
                                    Si no realizaste este cambio, por favor contacta inmediatamente con nuestro soporte.
                                </p>
                            </div>
                            
                            <!-- Nueva contraseña -->
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #ffc107;">
                                <p style="font-size: 14px; color: #856404; margin: 0 0 10px 0; font-weight: 600;">
                                    🔑 Tu nueva contraseña:
                                </p>
                                <div style="background: #f8f9fa; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; text-align: center; margin: 15px 0;">
                                    <p style="font-size: 18px; color: #856404; margin: 0; font-family: 'Courier New', monospace; font-weight: 600; letter-spacing: 2px;">
                                        ${newPassword}
                                    </p>
                                </div>
                                <p style="font-size: 12px; color: #856404; margin: 15px 0 0 0; line-height: 1.5; font-style: italic;">
                                    ⚠️ Por seguridad, guarda esta contraseña en un lugar seguro. Te recomendamos cambiarla después de iniciar sesión si lo consideras necesario.
                                </p>
                            </div>
                            
                            <!-- Información de seguridad -->
                            <div style="background: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <p style="font-size: 14px; color: #0c5460; margin: 0 0 10px 0; font-weight: 600;">
                                    🔐 Consejos de seguridad:
                                </p>
                                <ul style="font-size: 14px; color: #0c5460; margin: 0; padding-left: 20px; line-height: 1.5;">
                                    <li>Usa una contraseña única para cada cuenta</li>
                                    <li>No compartas tu contraseña con nadie</li>
                                    <li>Cambia tu contraseña regularmente</li>
                                    <li>Tu sesión ha sido cerrada automáticamente por seguridad</li>
                                </ul>
                            </div>
                            
                            <p style="font-size: 14px; color: #6c757d; text-align: center; margin: 30px 0 0 0; line-height: 1.5;">
                                Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #2c3e50; padding: 30px; text-align: center;">
                            <div style="margin-bottom: 20px;">
                                <h3 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                                    🎵 Radio Oxígeno 88.1 FM
                                </h3>
                                <p style="color: #bdc3c7; margin: 5px 0 0 0; font-size: 14px;">
                                    Tu música, tu oxígeno
                                </p>
                            </div>
                            
                            <div style="border-top: 1px solid #34495e; padding-top: 20px;">
                                <p style="color: #95a5a6; font-size: 12px; margin: 0; line-height: 1.4;">
                                    © 2024 Radio Oxígeno 88.1 FM. Todos los derechos reservados.<br>
                                    Este es un mensaje automático, por favor no responder.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `🎵 Radio Oxígeno 88.1 FM\n\nHola ${user.user_name},\n\nTu contraseña ha sido actualizada exitosamente. Por seguridad, tu sesión ha sido cerrada y deberás iniciar sesión nuevamente con tu nueva contraseña.\n\n🔑 Tu nueva contraseña: ${newPassword}\n\n⚠️ Por seguridad, guarda esta contraseña en un lugar seguro.\n\nSi no realizaste este cambio, por favor contacta inmediatamente con nuestro soporte.\n\nConsejos de seguridad:\n• Usa una contraseña única para cada cuenta\n• No compartas tu contraseña con nadie\n• Cambia tu contraseña regularmente\n• Tu sesión ha sido cerrada automáticamente por seguridad\n\nSi tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.\n\nEquipo de Radio Oxígeno 88.1 FM\nTu música, tu oxígeno`
        });

        return {
            success: true,
            status: 200,
            message: 'Contraseña actualizada exitosamente. Tu sesión ha sido cerrada por seguridad.',
            requiresLogout: true, // Flag para indicar que debe cerrar sesión
            data: {
                user_id: updatedUser.user_id,
                user_email: updatedUser.user_email
            }
        };

    } catch (error) {
        console.error('Error en changePassword:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
}

// Obtener información básica del perfil para formularios
const getProfileForEdit = async (userId) => {
    try {
        const user = await User.getUserById(userId);
        if (!user) {
            return {
                success: false,
                status: 404,
                message: 'Usuario no encontrado'
            };
        }

        // Solo devolver los campos que el usuario puede editar
        const editableProfile = {
            user_id: user.user_id,
            user_name: user.user_name,
            user_lastname: user.user_lastname,
            user_email: user.user_email,
            user_address: user.user_address,
            user_phone: user.user_phone,
            user_age: user.user_age
        };
        
        return {
            success: true,
            data: editableProfile,
            status: 200
        };
    } catch (error) {
        console.error('Error en getProfileForEdit:', error);
        return {
            success: false,
            message: error.message,
            status: 500
        };
    }
}
module.exports = {
    createUser,
    updatedUserToken,
    getAllUsers,
    updateUserRole,
    getUserProfile,
    getProfileForEdit,
    changePassword,
    updateUserProfile
};