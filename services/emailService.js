const nodemailer = require('nodemailer');

// Configurar el transporter de email
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

// Enviar email de confirmación de lectura de contacto
const sendContactReadConfirmation = async (contactData) => {
    try {
        const transporter = createTransporter();
        
        const { contact_name, contact_lastname, contact_email, contact_message } = contactData;
        
        await transporter.sendMail({
            from: `"Radio Oxígeno 88.1 FM" <${process.env.EMAIL_USER}>`,
            to: contact_email,
            subject: '✅ Hemos recibido tu mensaje - Radio Oxígeno 88.1 FM',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Confirmación de Recepción - Radio Oxígeno 88.1 FM</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header con gradiente verde -->
                        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center; position: relative; overflow: hidden;">
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
                                <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);">
                                    <span style="font-size: 32px; color: white;">✅</span>
                                </div>
                                <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: 600;">
                                    ¡Mensaje recibido y leído!
                                </h2>
                            </div>
                            
                            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #28a745;">
                                <p style="font-size: 16px; color: #2c3e50; margin: 0 0 15px 0; line-height: 1.6;">
                                    Estimado/a <strong style="color: #28a745;">${contact_name} ${contact_lastname}</strong>,
                                </p>
                                <p style="font-size: 16px; color: #5a6c7d; margin: 0 0 15px 0; line-height: 1.6;">
                                    Hemos recibido y leído tu mensaje. Te agradecemos por contactarnos y por tu interés en Radio Oxígeno 88.1 FM.
                                </p>
                                <p style="font-size: 16px; color: #5a6c7d; margin: 0; line-height: 1.6;">
                                    <strong>Nos pondremos en contacto contigo a la brevedad posible</strong> para responder a tu consulta y brindarte la información que necesitas.
                                </p>
                            </div>
                            
                            <!-- Resumen del mensaje -->
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e9ecef;">
                                <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                    📝 Resumen de tu mensaje:
                                </h3>
                                <div style="background: #ffffff; padding: 20px; border-radius: 8px; border-left: 3px solid #28a745;">
                                    <p style="font-size: 14px; color: #6c757d; margin: 0 0 8px 0; font-weight: 600;">
                                        Tu mensaje:
                                    </p>
                                    <p style="font-size: 15px; color: #2c3e50; margin: 0; line-height: 1.5; font-style: italic;">
                                        "${contact_message}"
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Información adicional -->
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                                <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                    🎧 ¡Síguenos en nuestras redes!
                                </h3>
                                <p style="color: #ffffff; margin: 0; font-size: 14px; opacity: 0.9; line-height: 1.5;">
                                    Mantente al día con la mejor música y noticias en Radio Oxígeno 88.1 FM
                                </p>
                            </div>
                            
                            <!-- Footer -->
                            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                                    Este es un mensaje automático, por favor no respondas a este correo.
                                </p>
                                <p style="font-size: 12px; color: #adb5bd; margin: 0;">
                                    © ${new Date().getFullYear()} Radio Oxígeno 88.1 FM. Todos los derechos reservados.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log(`✅ Email de confirmación enviado a: ${contact_email}`);
        return { success: true, message: 'Email enviado exitosamente' };
        
    } catch (error) {
        console.error('❌ Error enviando email de confirmación:', error);
        throw new Error(`Error enviando email: ${error.message}`);
    }
};

// Enviar email de notificación a administradores (opcional)
const sendAdminNotification = async (contactData, action) => {
    try {
        const transporter = createTransporter();
        
        const { contact_name, contact_lastname, contact_email, contact_message } = contactData;
        
        await transporter.sendMail({
            from: `"Radio Oxígeno 88.1 FM" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER, // Email del administrador
            subject: `📧 ${action === 'read' ? 'Contacto marcado como leído' : 'Nuevo contacto'} - ${contact_name} ${contact_lastname}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Notificación de Contacto - Radio Oxígeno 88.1 FM</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                                🎵 Radio Oxígeno 88.1 FM
                            </h1>
                            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">
                                Panel de Administración
                            </p>
                        </div>
                        
                        <!-- Contenido -->
                        <div style="padding: 30px;">
                            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 20px;">
                                ${action === 'read' ? '✅ Contacto marcado como leído' : '📧 Nuevo contacto recibido'}
                            </h2>
                            
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d;"><strong>Nombre:</strong> ${contact_name} ${contact_lastname}</p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d;"><strong>Email:</strong> ${contact_email}</p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d;"><strong>Acción:</strong> ${action === 'read' ? 'Marcado como leído' : 'Nuevo mensaje'}</p>
                                <p style="margin: 0; font-size: 14px; color: #6c757d;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
                            </div>
                            
                            <div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
                                <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">Mensaje:</h3>
                                <p style="margin: 0; font-size: 14px; color: #495057; line-height: 1.5; font-style: italic;">
                                    "${contact_message}"
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log(`✅ Notificación de administrador enviada para: ${contact_name} ${contact_lastname}`);
        return { success: true, message: 'Notificación enviada exitosamente' };
        
    } catch (error) {
        console.error('❌ Error enviando notificación de administrador:', error);
        throw new Error(`Error enviando notificación: ${error.message}`);
    }
};

// Enviar email a empresa cuando se publique su imagen de publicidad
const sendAdvertisingImagePublished = async (advertisingData) => {
    try {
        const transporter = createTransporter();
        
        const { 
            company_name, 
            email, 
            start_date, 
            end_date, 
            advertising_days,
            advertising_image,
            rif,
            phone
        } = advertisingData;

        // Formatear fechas
        const formatDate = (dateString) => {
            if (!dateString) return 'No especificada';
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        };

        const imageUrl = advertising_image 
            ? `${process.env.PAGE_URL || 'http://localhost:3000'}/api/advertising/images/${advertising_image}`
            : null;
        
        await transporter.sendMail({
            from: `"Radio Oxígeno 88.1 FM" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '📢 ¡Tu publicidad ha sido publicada! - Radio Oxígeno 88.1 FM',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Publicidad Publicada - Radio Oxígeno 88.1 FM</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header con gradiente azul -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; position: relative; overflow: hidden;">
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
                                    <span style="font-size: 32px; color: white;">📢</span>
                                </div>
                                <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: 600;">
                                    ¡Tu publicidad está en el aire!
                                </h2>
                            </div>
                            
                            <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #667eea;">
                                <p style="font-size: 16px; color: #2c3e50; margin: 0 0 15px 0; line-height: 1.6;">
                                    Estimados representantes de <strong style="color: #667eea;">${company_name}</strong>,
                                </p>
                                <p style="font-size: 16px; color: #5a6c7d; margin: 0 0 15px 0; line-height: 1.6;">
                                    Nos complace informarles que <strong>su publicidad ha sido publicada exitosamente</strong> en Radio Oxígeno 88.1 FM y ya está siendo transmitida a nuestra audiencia.
                                </p>
                                <p style="font-size: 16px; color: #5a6c7d; margin: 0; line-height: 1.6;">
                                    Su mensaje publicitario está llegando a miles de oyentes en nuestra frecuencia.
                                </p>
                            </div>
                            
                            <!-- Detalles de la publicidad -->
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e9ecef;">
                                <h3 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                                    📋 Detalles de su publicidad:
                                </h3>
                                <div style="background: #ffffff; padding: 20px; border-radius: 8px; border-left: 3px solid #667eea;">
                                    <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                                        <strong style="color: #2c3e50;">Empresa:</strong> ${company_name}
                                    </p>
                                    <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                                        <strong style="color: #2c3e50;">RIF:</strong> ${rif}
                                    </p>
                                    <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                                        <strong style="color: #2c3e50;">Fecha de inicio:</strong> ${formatDate(start_date)}
                                    </p>
                                    <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                                        <strong style="color: #2c3e50;">Fecha de finalización:</strong> ${formatDate(end_date)}
                                    </p>
                                    <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                                        <strong style="color: #2c3e50;">Duración:</strong> ${advertising_days} día${advertising_days > 1 ? 's' : ''}
                                    </p>
                                    ${imageUrl ? `
                                    <p style="font-size: 14px; color: #6c757d; margin: 15px 0 0 0;">
                                        <strong style="color: #2c3e50;">Imagen de publicidad:</strong>
                                    </p>
                                    <div style="margin-top: 15px; text-align: center;">
                                        <img src="${imageUrl}" alt="Imagen de publicidad" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Información de contacto -->
                            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                                <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                    📞 ¿Necesitas ayuda?
                                </h3>
                                <p style="color: #ffffff; margin: 0; font-size: 14px; opacity: 0.9; line-height: 1.5;">
                                    Si tienes alguna pregunta o necesitas realizar algún cambio en tu publicidad, no dudes en contactarnos.
                                </p>
                            </div>
                            
                            <!-- Footer -->
                            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                                    Gracias por confiar en Radio Oxígeno 88.1 FM para promocionar su negocio.
                                </p>
                                <p style="font-size: 12px; color: #adb5bd; margin: 0;">
                                    © ${new Date().getFullYear()} Radio Oxígeno 88.1 FM. Todos los derechos reservados.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log(`✅ Email de publicidad publicada enviado a: ${email}`);
        return { success: true, message: 'Email enviado exitosamente' };
        
    } catch (error) {
        console.error('❌ Error enviando email de publicidad publicada:', error);
        throw new Error(`Error enviando email: ${error.message}`);
    }
};

module.exports = {
    sendContactReadConfirmation,
    sendAdminNotification,
    sendAdvertisingImagePublished
};
