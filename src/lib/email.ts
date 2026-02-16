import nodemailer from 'nodemailer';
import path from 'path';
import { prisma } from './prisma';

// Simplified ICS generator
function generateICS(reservation: any, settings: any) {
    const { date, timeSlot, guests, id } = reservation;
    const { restaurantName, address } = settings;

    const [hour, minute] = timeSlot.split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(hour, minute, 0);

    const endDate = new Date(startDate);
    endDate.setHours(hour + 1, minute + 30); // Default 1.5h duration

    const formatDate = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RestauranteAI//Rez//EN
BEGIN:VEVENT
UID:${id}@restaurante-ai.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Reserva en ${restaurantName || 'Restaurante'}
DESCRIPTION:Reserva para ${guests} personas. Código: ${id}
LOCATION:${address || ''}
BEGIN:VALARM
TRIGGER:-PT60M
ACTION:DISPLAY
DESCRIPTION:Recordatorio de reserva en 1 hora
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

export async function sendReservationEmail(reservation: any, type: 'PENDING' | 'CONFIRMED' | 'CANCELED') {
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    };
    const errorLog = (msg: string, err?: any) => {
        console.error(msg, err);
        logs.push(`ERROR: ${msg} ${err ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : ''}`);
    };

    log(`[Email] Starting process for Reservation ${reservation.id} (${type})`);

    try {
        const settings: any = await prisma.settings.findFirst();

        if (!settings) {
            errorLog("No settings found in DB.");
            return { success: false, logs };
        }

        log(`[Email] Settings loaded. Host: ${settings.smtpHost}, User: ${settings.smtpUser}, Admin: ${settings.adminEmail}`);

        if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
            errorLog("SMTP settings incomplete. Aborting.");
            return { success: false, logs };
        }

        const smtpPort = Number(settings.smtpPort) || 587;
        const isSecure = smtpPort === 465;

        log(`[Email] Config: Host=${settings.smtpHost?.trim()}, Port=${smtpPort}, Secure=${isSecure}`);

        const transporter = nodemailer.createTransport({
            host: settings.smtpHost.trim(),
            port: smtpPort,
            secure: isSecure,
            auth: {
                user: settings.smtpUser.trim(),
                pass: settings.smtpPass.trim()
            },
            tls: { rejectUnauthorized: false }
        });

        try {
            await transporter.verify();
            log("[Email] SMTP Connection verified.");
        } catch (connError) {
            errorLog("SMTP Connection verification failed", connError);
            return { success: false, logs };
        }

        // ... Template logic ...
        let subject = "";
        let text = "";

        switch (type) {
            case 'PENDING':
                subject = settings.emailSubjectPending || "Reserva Recibida";
                text = settings.emailTemplatePending || "Hemos recibido tu reserva...";
                break;
            case 'CANCELED':
                subject = settings.emailSubjectCanceled || "Reserva Cancelada";
                text = settings.emailTemplateCanceled || "Tu reserva ha sido cancelada.";
                break;
            case 'CONFIRMED':
            default:
                subject = settings.emailSubjectConfirmed || "Reserva Confirmada";
                text = settings.emailTemplateConfirmed || "Tu reserva está confirmada.";
                break;
        }

        const vars: Record<string, string> = {
            '%firstName%': reservation.firstName,
            '%lastName%': reservation.lastName,
            '%guests%': reservation.guests.toString(),
            '%date%': new Date(reservation.date).toLocaleDateString("es-ES"),
            '%time%': reservation.timeSlot,
            '%restaurantName%': settings.restaurantName || "Restaurante"
        };

        Object.keys(vars).forEach(key => {
            const regex = new RegExp(key, 'g');
            subject = subject.replace(regex, vars[key]);
            text = text.replace(regex, vars[key]);
        });

        const icsContent = generateICS(reservation, settings);

        // Attachments logic
        let logoPath = path.join(process.cwd(), 'src', 'app', 'media', 'loremar.jpg');
        let logoFilename = 'loremar.jpg';

        if (settings.logoPath) {
            const relativePath = settings.logoPath.startsWith('/') ? settings.logoPath.substring(1) : settings.logoPath;
            logoPath = path.join(process.cwd(), 'public', relativePath);
            logoFilename = path.basename(logoPath);
        }

        const attachments = [{
            filename: logoFilename,
            path: logoPath,
            cid: 'restaurant-logo'
        }];

        const mailOptions: any = {
            from: `"${settings.restaurantName || 'Reservas'}" <${settings.smtpUser}>`,
            to: reservation.email,
            subject: subject,
            text: text,
            html: text,
            attachments: attachments,
            icalEvent: {
                filename: 'invite.ics',
                method: 'request',
                content: icsContent
            }
        };

        try {
            await transporter.sendMail(mailOptions);
            log(`[Email] Client email sent to ${reservation.email}`);
        } catch (clientErr) {
            errorLog("Failed to send to Client", clientErr);
        }

        if (settings.adminEmail) {
            log(`[Email] Sending Admin Notification to ${settings.adminEmail}`);
            const adminSubject = `🔔 Nueva Reserva: ${reservation.firstName} (${reservation.guests} pax)`;
            const adminText = `Nueva reserva de ${reservation.firstName} ${reservation.lastName} para el ${new Date(reservation.date).toLocaleDateString()} a las ${reservation.timeSlot}.`;

            try {
                await transporter.sendMail({
                    from: `"${settings.restaurantName}" <${settings.smtpUser}>`,
                    to: settings.adminEmail,
                    subject: adminSubject,
                    text: adminText,
                    html: adminText.replace(/\n/g, '<br>')
                });
                log(`[Email] Admin notification sent.`);
            } catch (adminErr) {
                errorLog("Failed to send to Admin", adminErr);
            }
        } else {
            log("[Email] Admin email not configured.");
        }

        try {
            await prisma.reservation.update({
                where: { id: reservation.id },
                data: { emailSent: true }
            });
            log("[Email] DB marked as sent.");
        } catch (e) {
            errorLog("Failed to update DB status", e);
        }

        return { success: true, logs };

    } catch (error) {
        errorLog("CRITICAL FAILURE", error);
        return { success: false, logs };
    }
}
