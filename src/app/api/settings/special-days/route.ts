import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const specialDaySchema = z.object({
    date: z.string(), // ISO String or YYYY-MM-DD
    isClosed: z.boolean(),
    lunchStart: z.string().optional(),
    lunchEnd: z.string().optional(),
    dinnerStart: z.string().optional(),
    dinnerEnd: z.string().optional(),
});

export async function GET(request: Request) {
    try {
        const days = await prisma.specialDay.findMany({
            orderBy: { date: 'asc' }
        });
        return NextResponse.json(days);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener días especiales' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = specialDaySchema.parse(body);
        const dateObj = new Date(data.date);

        // Upsert
        const day = await prisma.specialDay.upsert({
            where: { date: dateObj },
            update: {
                isClosed: data.isClosed,
                lunchStart: data.lunchStart,
                lunchEnd: data.lunchEnd,
                dinnerStart: data.dinnerStart,
                dinnerEnd: data.dinnerEnd,
            },
            create: {
                date: dateObj,
                isClosed: data.isClosed,
                lunchStart: data.lunchStart,
                lunchEnd: data.lunchEnd,
                dinnerStart: data.dinnerStart,
                dinnerEnd: data.dinnerEnd,
            }
        });

        return NextResponse.json(day);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error al guardar día especial' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    try {
        await prisma.specialDay.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }
}
