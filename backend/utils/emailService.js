const nodemailer = require('nodemailer');
const { path } = require('pdfkit');

// Verify email configuration on startup
if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[EmailService] CRITICAL: Missing email configuration in environment variables!');
    console.error('[EmailService] EMAIL_SERVICE:', process.env.EMAIL_SERVICE ? 'SET' : 'MISSING');
    console.error('[EmailService] EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'MISSING');
    console.error('[EmailService] EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET (hidden)' : 'MISSING');
}

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify transporter configuration on startup
transporter.verify(function (error, success) {
    if (error) {
        console.error('[EmailService] Transporter verification failed:', error);
    } else {
        console.log('[EmailService] Email transporter is ready to send messages');
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        return true;

    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

const sendAppointmentConfirmation = async (appointment, visitor, host, qrCodeDataURL) => {
    console.log('[EmailService] sendAppointmentConfirmation called');
    console.log('[EmailService] Visitor email:', visitor?.email);
    console.log('[EmailService] Host name:', host?.name);
    console.log('[EmailService] QR Code provided:', !!qrCodeDataURL);
    
    if (!visitor || !visitor.email) {
        console.error('[EmailService] Cannot send email: visitor or visitor email is missing');
        throw new Error('Visitor email is required');
    }

    const html = `
        <h2>Appointment Confirmation</h2>
        <p>Dear ${visitor.name},</p>
        <p>Your appointment has been scheduled:</p>
        <ul>
            <li><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${appointment.appointmentTime}</li>
      <li><strong>Host:</strong> ${host.name}</li>
      <li><strong>Location:</strong> ${appointment.location}</li>
      <li><strong>Purpose:</strong> ${appointment.purpose}</li>
    </ul>
    <p>Please show this QR code at the entrance for a quick check-in:</p>
    ${qrCodeDataURL ? '<img src="cid:qrcode" alt="QR Code for your appointment"/>' : ''}
    <p>Please arrive 10 minutes early for check-in.</p>
  `;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: visitor.email,
        subject: 'Appointment Confirmation & QR Code',
        html,
        attachments: []
    };

    // Attach QR code correctly. `generateQRCode` returns a data URL (data:image/png;base64,....)
    try {
        if (qrCodeDataURL) {
            if (typeof qrCodeDataURL === 'string' && qrCodeDataURL.startsWith('data:')) {
                // data:[<mediatype>][;base64],<data>
                const match = qrCodeDataURL.match(/^data:(image\/[^;]+);base64,(.+)$/);
                if (match) {
                    const mimeType = match[1];
                    const base64Data = match[2];
                    mailOptions.attachments.push({
                        filename: 'qrcode.png',
                        content: Buffer.from(base64Data, 'base64'),
                        contentType: mimeType,
                        cid: 'qrcode'
                    });
                } else {
                    // Fallback: attach raw data URL as content (may not be ideal)
                    mailOptions.attachments.push({
                        filename: 'qrcode.png',
                        content: qrCodeDataURL,
                        cid: 'qrcode'
                    });
                }
            } else {
                // Assume it's a filesystem path or URL that nodemailer can handle
                mailOptions.attachments.push({
                    filename: 'qrcode.png',
                    path: qrCodeDataURL,
                    cid: 'qrcode'
                });
            }
        }

        console.log('[EmailService] Attempting to send email to:', mailOptions.to);
        console.log('[EmailService] Email subject:', mailOptions.subject);
        console.log('[EmailService] Attachments count:', mailOptions.attachments.length);
        
        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] ✓ Email sent successfully! Message ID:', info.messageId);
        console.log('[EmailService] Response:', info.response);
        return true;
    } catch (error) {
        console.error('[EmailService] ✗ CRITICAL: Error sending appointment confirmation email:', error.message);
        console.error('[EmailService] Error code:', error.code);
        console.error('[EmailService] Error command:', error.command);
        try {
            console.error('[EmailService] Mail Options at time of error:', JSON.stringify({
                to: mailOptions.to,
                subject: mailOptions.subject,
                attachments: mailOptions.attachments.map(a => ({ filename: a.filename, path: a.path || null, hasContent: !!a.content }))
            }, null, 2));
        } catch (e) {
            console.error('[EmailService] Failed to serialize mail options for logging', e);
        }
        throw error;
    }
};

const sendPassDetails  = async (pass, visitor, pdfPath) => {
    const html = `
        <h2>Your Visitor Pass</h2>
    <p>Dear ${visitor.name},</p>
    <p>Your visitor pass has been issued:</p>
    <ul>
      <li><strong>Pass Number:</strong> ${pass.passNumber}</li>
      <li><strong>Valid From:</strong> ${new Date(pass.validFrom).toLocaleString()}</li>
      <li><strong>Valid Until:</strong> ${new Date(pass.validUntil).toLocaleString()}</li>
    </ul>
    <p>Please find your visitor pass attached. Show this at the entrance.</p>
  `;

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: visitor.email,
            subject: 'Your Visitor Pass Details',
            html,
            attachments: pdfPath ? [{
                filename: `Visitor_Pass_${pass.passNumber}.pdf`,
                path: pdfPath,
            }] : [],
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending pass details email:', error);
       return false;
    }
};

module.exports = {
    sendEmail,
    sendAppointmentConfirmation,
    sendPassDetails,
};