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
    try {
        // Fetch settings using Prisma ORM to ensure correct mapping
        const settings: any = await prisma.settings.findFirst();

        if (!settings) {
            console.error("No settings found for email sending.");
            return false;
        }

        if (!settings) {
            console.error("No settings found for email sending.");
            return false;
        }

        if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
            console.warn("SMTP settings incomplete. skipping email.");
            return false;
        }

        const smtpPort = Number(settings.smtpPort) || 587;
        const isSecure = smtpPort === 465;

        const transporter = nodemailer.createTransport({
            host: settings.smtpHost.trim(),
            port: smtpPort,
            secure: isSecure,
            auth: {
                user: settings.smtpUser.trim(),
                pass: settings.smtpPass.trim()
            },
            tls: {
                rejectUnauthorized: false // Sometimes helpful for self-signed certs or strict firewalls
            }
        });

        // Template Selection
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

        // Replace variables
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

        console.log(`Sending email via ${settings.smtpHost}...`);

        let logoPath = path.join(process.cwd(), 'src', 'app', 'media', 'loremar.jpg');
        const logoCid = 'restaurant-logo';
        let logoFilename = 'loremar.jpg';

        if (settings.logoPath) {
            // stored as /uploads/filename.ext
            // remove leading slash for path.join safely if needed, or just let join handle it
            // path.join(cwd, 'public', '/uploads/...') might work or might double slash. 
            // safest is to strip leading slash.
            const relativePath = settings.logoPath.startsWith('/') ? settings.logoPath.substring(1) : settings.logoPath;
            logoPath = path.join(process.cwd(), 'public', relativePath);
            logoFilename = path.basename(logoPath);
        }

        const attachments: any[] = [];

        // Only attach if we think it exists? Or try/catch? 
        // Nodemailer might error if file not found. 
        // Let's assume it exists if set.
        attachments.push({
            filename: logoFilename,
            path: logoPath,
            cid: logoCid
        });

        const mailOptions: any = {
            from: `"${settings.restaurantName || 'Reservas'}" <${settings.smtpUser}>`,
            to: reservation.email,
            subject: subject,
            text: text, // Plain text body
            html: text, // Allow user to provide full HTML in the template
            attachments: attachments,
            icalEvent: {
                filename: 'invite.ics',
                method: 'request',
                content: icsContent
            }
        };

        // 1. Send Client Email
        await transporter.sendMail(mailOptions);

        // 2. Send Admin Notification (Internal)
        if (settings.adminEmail) {
            const adminSubject = `🔔 Nueva Reserva: ${reservation.firstName} ${reservation.lastName} (${reservation.guests} pax)`;
            const adminText = `
Confirmación de Nueva Reserva:

Cliente: ${reservation.firstName} ${reservation.lastName}
Email: ${reservation.email}
Teléfono: ${reservation.phone || 'No indicado'}

Fecha: ${new Date(reservation.date).toLocaleDateString("es-ES")}
Hora: ${reservation.timeSlot}
Comensales: ${reservation.guests}

Alergias: ${reservation.allergies || 'Ninguna'}
Notas: ${reservation.notes || 'Ninguna'}

Gestionar en el panel de administración.
            `;

            await transporter.sendMail({
                from: `"${settings.restaurantName || 'Reservas'}" <${settings.smtpUser}>`,
                to: settings.adminEmail,
                subject: adminSubject,
                text: adminText,
                html: adminText.replace(/\n/g, '<br>')
            });
            console.log(`Admin notification sent to ${settings.adminEmail}`);
        }

        console.log(`Email sent successfully to ${reservation.email}`);

        // Mark as sent in DB
        // Use raw query to update if needed, but model might work for simple invalidation
        try {
            await prisma.reservation.update({
                where: { id: reservation.id },
                data: { emailSent: true }
            });
        } catch (e) { /* ignore loop update error */ }

        return true;

    } catch (error) {
        console.error("Email sending failed:", error);
        return false;
    }
}
