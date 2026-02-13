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

        // 1. Double check availability (Simplified)
        // In a real app, you'd use a transaction or checking logic here.

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
                status: 'PENDING'
            }
        });

        // 3. Send Email
        await sendReservationEmail(newReservation, 'PENDING');

        return NextResponse.json({
            success: true,
            id: newReservation.id,
            message: 'Reservation confirmed'
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors }, { status: 400 });
        }
        console.error('Reservation Create Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
