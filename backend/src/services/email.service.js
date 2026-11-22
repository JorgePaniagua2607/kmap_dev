const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (env.EMAIL_MODE === 'smtp' && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  }
  return transporter;
}

async function sendTeacherCredentials({
  nombre_completo,
  correo_electronico,
  carnet_identidad
}) {
  const username = correo_electronico.split('@')[0];
  const subject = 'Bienvenido a Plan Kmap — Credenciales de Acceso Docente';
  const textBody = [
    `Hola ${nombre_completo},`,
    '',
    'El Administrador de Plan Kmap ha creado tu cuenta de Docente.',
    'Tus credenciales iniciales de acceso son:',
    `  - Correo / Usuario: ${correo_electronico} (alias: ${username})`,
    `  - Contraseña inicial (Carnet): ${carnet_identidad}`,
    '',
    'IMPORTANTE: Por seguridad, el sistema te solicitará cambiar tu contraseña en tu primer inicio de sesión.',
    '',
    'Atentamente,',
    'Equipo Plan Kmap'
  ].join('\n');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <h2 style="color: #1e293b;">Bienvenido a Plan Kmap</h2>
      <p>Hola <strong>${nombre_completo}</strong>,</p>
      <p>Se ha registrado tu cuenta con el rol de <strong>DOCENTE</strong>. Tus credenciales iniciales son:</p>
      <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #cbd5e1;">
        <p style="margin: 4px 0;"><strong>Correo / Usuario:</strong> ${correo_electronico}</p>
        <p style="margin: 4px 0;"><strong>Contraseña inicial (tu Carnet):</strong> <code>${carnet_identidad}</code></p>
      </div>
      <p style="color: #b45309; font-size: 13px; margin-top: 12px;">
        * Al iniciar sesión por primera vez deberás cambiar tu contraseña por defecto.
      </p>
    </div>
  `;

  const smtp = getTransporter();
  if (env.EMAIL_MODE === 'smtp' && smtp) {
    const info = await smtp.sendMail({
      from: env.EMAIL_FROM,
      to: correo_electronico,
      subject,
      text: textBody,
      html: htmlBody
    });
    return {
      sent: true,
      mode: 'smtp',
      messageId: info.messageId,
      to: correo_electronico
    };
  }

  // Fallback a consola en desarrollo para facilitar pruebas E2E
  console.log('\n================ [EMAIL SERVICE - CONSOLE FALLBACK] ================');
  console.log(`PARA:    ${correo_electronico}`);
  console.log(`ASUNTO:  ${subject}`);
  console.log('--------------------------------------------------------------------');
  console.log(textBody);
  console.log('====================================================================\n');

  return {
    sent: true,
    mode: 'console',
    to: correo_electronico,
    subject,
    preview: {
      usuario: correo_electronico,
      passwordInicial: carnet_identidad,
      mustChangePassword: true
    }
  };
}

module.exports = {
  sendTeacherCredentials
};
