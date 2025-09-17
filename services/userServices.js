const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { PAGE_URL } = require('../config');

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
            from: `"${process.env.EMAIL_NAME || 'Tu App'}" <${process.env.EMAIL_USER}>`,
            to: data.user_email,
            subject: '¡Por favor verifica tu correo electrónico! ✔',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 5px; overflow: hidden;">
                    <div style="background: #4a6bff; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">¡Bienvenido a nuestra plataforma!</h1>
                    </div>
                    
                    <div style="padding: 20px;">
                        <p style="font-size: 16px;">Hola <strong>${data.user_name}</strong>,</p>
                        <p style="font-size: 16px;">Gracias por registrarte en nuestro servicio. Para completar tu registro, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${PAGE_URL}/verify/${savedUser.user_id}/${token}" 
                                style="background: #4a6bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                                Verificar mi correo
                            </a>
                        </div>
                        
                        <p style="font-size: 16px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                        <p style="font-size: 14px; color: #666; word-break: break-all;">${PAGE_URL}/verify/${savedUser.user_id}/${token}</p>
                        
                        <p style="font-size: 16px;">Si no has solicitado este registro, por favor ignora este mensaje.</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
                            <p style="font-size: 14px; color: #666;">Equipo de Soporte<br>${process.env.EMAIL_NAME || 'Tu App'}</p>
                        </div>
                    </div>
                </div>
            `,
            text: `Hola ${data.user_name},\n\nGracias por registrarte en nuestro servicio. Para completar tu registro, por favor verifica tu dirección de correo electrónico visitando este enlace:\n\n${PAGE_URL}/verify/${savedUser.user_id}/${token}\n\nSi no has solicitado este registro, por favor ignora este mensaje.\n\nEquipo de Soporte,\n${process.env.EMAIL_NAME || 'Tu App'}`
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

module.exports = {
    createUser
};