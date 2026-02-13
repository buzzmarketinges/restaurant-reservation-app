import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const dateStr = searchParams.get('date');

    try {
        let whereClause: any = {};

        if (status) {
            whereClause.status = status;
        }

        if (dateStr) {
            const targetDate = new Date(dateStr);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            whereClause.date = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        // If specific date selected, sort by time. Otherwise by created recently.
        const orderBy = dateStr
            ? { timeSlot: 'asc' }
            : { createdAt: 'desc' };

        // Use raw query or prisma? Prisma is safer for Date ranges.
        // If we had issues with prisma before, we might need raw.
        // But the previous fix was for "Settings" table schema mismatch. "Reservation" table seems fine with Prisma based on `api/reservations/route.ts` working.
        // Let's try native Prisma first. If it fails due to the previous "schema loaded from ..." error, we might need raw.
        // However, the user said "Ya funciona ese apartado" referring to settings/availability.
        // Let's stick to Prisma which is cleaner, but if it fails I'll switch to Raw.
        // Actually, to be safe and consistent with the previous "fix", I should probably check if I need to use Raw.
        // But `api/availability` used Raw for Settings, but `findMany` for Reservations (wrapped in try-catch).
        // Let's use Prisma but wrap in Try-Catch properly or fallback?
        // No, let's use Prisma. The schema matches the DB for Reservations table mostly.

        const reservations = await prisma.reservation.findMany({
            where: whereClause,
            orderBy: (orderBy as any)
        });

        return NextResponse.json(reservations);
    } catch (error) {
        console.error('Admin Reservations Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
    }
}
