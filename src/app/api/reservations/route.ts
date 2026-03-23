import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendReservationEmail } from '@/lib/email';

const reservationSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeSlot: z.string(),
    shift: z.enum(['LUNCH', 'DINNER']),
    guests: z.number().min(1).max(20),
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().min(1, "Last Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional(),
    allergies: z.string().optional(),
    notes: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = reservationSchema.parse(body);

        // 1. Fetch Settings to check directConfirmation
        const settings: any = await prisma.settings.findFirst();
        const autoConfirm = settings?.directConfirmation !== false; // default true
        const status = autoConfirm ? 'CONFIRMED' : 'PENDING';

        // 2. Create Reservation
        const newReservation = await prisma.reservation.create({
            data: {
                date: new Date(data.date),
                timeSlot: data.timeSlot,
                shift: data.shift,
                guests: data.guests,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                allergies: data.allergies,
                notes: data.notes,
                status: status
            }
        });

        // 3. Send Email
        await sendReservationEmail(newReservation, status);

        return NextResponse.json({
            success: true,
            id: newReservation.id,
            message: autoConfirm ? 'Reservation confirmed' : 'Request received',
            status: status
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors }, { status: 400 });
        }
        console.error('Reservation Create Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
