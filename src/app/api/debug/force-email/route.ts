import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReservationEmail } from '@/lib/email';

export async function GET() {
    try {
        // Fetch the most recent reservation
        const reservation = await prisma.reservation.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!reservation) {
            return NextResponse.json({ error: 'No reservations found to test with.' });
        }

        // Attempt to send email
        const result = await sendReservationEmail(reservation, 'CONFIRMED');

        return NextResponse.json({
            status: 'Diagnostic Run Complete',
            reservationId: reservation.id,
            emailResult: result
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
