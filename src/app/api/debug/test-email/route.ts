import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function GET() {
    try {
        const settings: any = await prisma.settings.findFirst();
        if (!settings) return NextResponse.json({ error: 'No settings found' }, { status: 400 });

        const smtpPort = Number(settings.smtpPort) || 587;
        const transporter = nodemailer.createTransport({
            host: settings.smtpHost.trim(),
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: settings.smtpUser.trim(),
                pass: settings.smtpPass.trim()
            },
            tls: { rejectUnauthorized: false }
        });

        // Verify connection configuration
        try {
            await transporter.verify();
        } catch (verifyError: any) {
            return NextResponse.json({
                status: 'Verify Failed',
                error: verifyError.message,
                code: verifyError.code,
                response: verifyError.response
            }, { status: 500 });
        }

        // Try sending
        const info = await transporter.sendMail({
            from: `"${settings.restaurantName}" <${settings.smtpUser}>`,
            to: settings.adminEmail || settings.smtpUser, // Fallback to self
            subject: 'Test Email form Debugger',
            text: 'If you receive this, SMTP is working.'
        });

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        return NextResponse.json({
            error: error.message || 'Unknown Error',
            details: error
        }, { status: 500 });
    }
}
