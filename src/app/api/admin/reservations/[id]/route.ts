import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReservationEmail } from '@/lib/email';
import { z } from 'zod';

const updateSchema = z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELED'])
});

export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = params.id;

        const body = await request.json();
        const { status } = updateSchema.parse(body);

        // Fetch current status
        const reservation = await prisma.reservation.findUnique({
            where: { id }
        });

        if (!reservation) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        const currentStatus = reservation.status;

        // Update Status using Prisma Client
        const updatedReservation = await prisma.reservation.update({
            where: { id },
            data: { status }
        });

        // Trigger Email
        if (status !== currentStatus) {
            await sendReservationEmail(updatedReservation, status);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Update Status Error:', error);
        return NextResponse.json({ error: `Failed to update: ${error.message}` }, { status: 500 });
    }
}
