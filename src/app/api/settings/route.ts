import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import * as crypto from 'crypto';

const settingsSchema = z.object({
    lunchStart: z.string(),
    lunchEnd: z.string(),
    dinnerStart: z.string(),
    dinnerEnd: z.string(),
    daysOpen: z.array(z.number()),

    restaurantName: z.string().optional(),
    address: z.string().optional(),
    logoPath: z.string().optional(),

    // Email Templates
    emailSubjectPending: z.string().optional(),
    emailTemplatePending: z.string().optional(),
    emailSubjectConfirmed: z.string().optional(),
    emailTemplateConfirmed: z.string().optional(),
    emailSubjectCanceled: z.string().optional(),
    emailTemplateCanceled: z.string().optional(),

    // SMTP
    smtpHost: z.string().optional(),
    smtpPort: z.coerce.number().optional(),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional()
});

const DEFAULT_CONFIG = {
    daysOpen: [1, 2, 3, 4, 5, 6],
    lunch: { start: "13:00", end: "16:00" },
    dinner: { start: "20:00", end: "23:00" },
    interval: 30
};

export async function GET() {
    try {
        // Use RAW query to bypass stale Prisma Client definitions
        const result: any[] = await prisma.$queryRaw`SELECT * FROM Settings LIMIT 1`;
        const settings = result[0];

        if (!settings) {
            return NextResponse.json(DEFAULT_CONFIG);
        }

        // Parse the JSON config for availability
        let config = DEFAULT_CONFIG;
        try {
            config = JSON.parse(settings.availabilityConfig);
        } catch (e) { }

        return NextResponse.json({
            ...config,
            restaurantName: settings.restaurantName || "",
            address: settings.address || "",
            logoPath: settings.logoPath || "",

            emailSubjectPending: settings.emailSubjectPending || "",
            emailTemplatePending: settings.emailTemplatePending || "",
            emailSubjectConfirmed: settings.emailSubjectConfirmed || "",
            emailTemplateConfirmed: settings.emailTemplateConfirmed || "",
            emailSubjectCanceled: settings.emailSubjectCanceled || "",
            emailTemplateCanceled: settings.emailTemplateCanceled || "",

            smtpHost: settings.smtpHost || "",
            smtpPort: settings.smtpPort || 587,
            smtpUser: settings.smtpUser || "",
            smtpPass: settings.smtpPass || ""
        });
    } catch (error) {
        console.error('Settings GET Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = settingsSchema.parse(body);

        const configToStore = {
            daysOpen: data.daysOpen,
            lunch: { start: data.lunchStart, end: data.lunchEnd },
            dinner: { start: data.dinnerStart, end: data.dinnerEnd },
            interval: 30
        };

        const jsonConfig = JSON.stringify(configToStore);
        const updatedAt = new Date().toISOString();

        // Check for existing settings
        const existingResult: any[] = await prisma.$queryRaw`SELECT id FROM Settings LIMIT 1`;
        const existing = existingResult[0];

        if (existing) {
            // Raw Update
            await prisma.$executeRaw`
                UPDATE Settings SET 
                    availabilityConfig = ${jsonConfig},
                    restaurantName = ${data.restaurantName ?? ""},
                    address = ${data.address ?? ""},
                    logoPath = ${data.logoPath ?? ""},
                    
                    emailSubjectPending = ${data.emailSubjectPending ?? ""},
                    emailTemplatePending = ${data.emailTemplatePending ?? ""},
                    emailSubjectConfirmed = ${data.emailSubjectConfirmed ?? ""},
                    emailTemplateConfirmed = ${data.emailTemplateConfirmed ?? ""},
                    emailSubjectCanceled = ${data.emailSubjectCanceled ?? ""},
                    emailTemplateCanceled = ${data.emailTemplateCanceled ?? ""},
                    
                    smtpHost = ${data.smtpHost ?? ""},
                    smtpPort = ${data.smtpPort ?? 587},
                    smtpUser = ${data.smtpUser ?? ""},
                    smtpPass = ${data.smtpPass ?? ""},
                    updatedAt = ${updatedAt}
                WHERE id = ${existing.id}
            `;
        } else {
            // Raw Insert
            const newId = crypto.randomUUID();
            await prisma.$executeRaw`
                INSERT INTO Settings (
                    id, 
                    createdAt, 
                    updatedAt, 
                    availabilityConfig, 
                    restaurantName, 
                    address,
                    logoPath,
                    
                    emailSubjectPending,
                    emailTemplatePending,
                    emailSubjectConfirmed,
                    emailTemplateConfirmed,
                    emailSubjectCanceled,
                    emailTemplateCanceled,
                    
                    smtpHost,
                    smtpPort,
                    smtpUser,
                    smtpPass
                ) VALUES (
                    ${newId},
                    ${updatedAt},
                    ${updatedAt},
                    ${jsonConfig},
                    ${data.restaurantName ?? ""},
                    ${data.address ?? ""},
                    ${data.logoPath ?? ""},
                    
                    ${data.emailSubjectPending ?? ""},
                    ${data.emailTemplatePending ?? ""},
                    ${data.emailSubjectConfirmed ?? ""},
                    ${data.emailTemplateConfirmed ?? ""},
                    ${data.emailSubjectCanceled ?? ""},
                    ${data.emailTemplateCanceled ?? ""},
                    
                    ${data.smtpHost ?? ""},
                    ${data.smtpPort ?? 587},
                    ${data.smtpUser ?? ""},
                    ${data.smtpPass ?? ""}
                )
            `;
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Settings POST Error:', error);
        return NextResponse.json({ error: `Failed to save settings: ${error.message}` }, { status: 500 });
    }
}
