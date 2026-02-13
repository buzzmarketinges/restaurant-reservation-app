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
        const reservation: any[] = await prisma.$queryRaw`SELECT * FROM Reservation WHERE id = ${id}`;

        if (!reservation[0]) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        const currentStatus = reservation[0].status;

        // Update Status using Raw Query
        await prisma.$executeRaw`UPDATE Reservation SET status = ${status} WHERE id = ${id}`;

        // Trigger Email
        if (status !== currentStatus) {
            // Re-fetch updated or just pass object with new status
            const updatedRev = { ...reservation[0], status };
            await sendReservationEmail(updatedRev, status);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Update Status Error:', error);
        return NextResponse.json({ error: `Failed to update: ${error.message}` }, { status: 500 });
    }
}
