'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        today: 0,
        pending: 0,
        nextOpenDayCount: 0,
        nextOpenDayLabel: 'Próximo día abierto',
        todayDate: '',
        nextOpenDayDate: ''
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/reservations').then(res => res.json()),
            fetch('/api/settings').then(res => res.json())
        ]).then(([reservations, settings]) => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // 1. Stats for Today
            const todayCount = reservations.filter((r: any) => r.date.startsWith(todayStr)).length;
            const pendingCount = reservations.filter((r: any) => r.status === 'PENDING').length;

            // 2. Find Next Open Day
            let nextDay = new Date(today);
            nextDay.setDate(nextDay.getDate() + 1); // Start checking from tomorrow

            const daysOpen = settings.daysOpen || [1, 2, 3, 4, 5, 6]; // Default default

            // Limit search to 14 days to avoid infinite loop if config is weird
            for (let i = 0; i < 14; i++) {
                // getDay(): 0=Sun, 1=Mon...
                if (daysOpen.includes(nextDay.getDay())) {
                    break;
                }
                nextDay.setDate(nextDay.getDate() + 1);
            }

            const nextDayStr = nextDay.toISOString().split('T')[0];
            const nextDayReservations = reservations.filter((r: any) => r.date.startsWith(nextDayStr)).length;

            // Format nice label
            const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(nextDay);
            const dateShort = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(nextDay);

            setStats({
                today: todayCount,
                pending: pendingCount,
                nextOpenDayCount: nextDayReservations,
                nextOpenDayLabel: `Reservas ${dayName} ${dateShort}`,
                todayDate: todayStr,
                nextOpenDayDate: nextDayStr
            });

        }).catch(err => console.error(err));
    }, []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Panel de Administración</h1>
                <p className={styles.subtitle}>Bienvenido. Aquí tienes el resumen de hoy.</p>
            </header>

            <div className={styles.statsGrid}>
                <Link href={`/admin/reservations?date=${stats.todayDate}`} style={{ textDecoration: 'none' }}>
                    <div className={styles.statCard} style={{ cursor: 'pointer' }}>
                        <span className={styles.statValue}>{stats.today}</span>
                        <span className={styles.statLabel}>Reservas Hoy</span>
                    </div>
                </Link>

                <Link href="/admin/reservations?status=PENDING" style={{ textDecoration: 'none' }}>
                    <div className={styles.statCard} style={{ border: stats.pending > 0 ? '2px solid var(--md-sys-color-primary)' : 'none', cursor: 'pointer' }}>
                        <span className={styles.statValue}>{stats.pending}</span>
                        <span className={styles.statLabel}>Reservas por Confirmar</span>
                        {stats.pending > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-primary)', fontWeight: 'bold' }}>¡Requiere Atención!</span>}
                    </div>
                </Link>

                <Link href={`/admin/reservations?date=${stats.nextOpenDayDate}`} style={{ textDecoration: 'none' }}>
                    <div className={styles.statCard} style={{ cursor: 'pointer' }}>
                        <span className={styles.statValue}>{stats.nextOpenDayCount}</span>
                        <span className={styles.statLabel} style={{ textTransform: 'capitalize' }}>{stats.nextOpenDayLabel}</span>
                    </div>
                </Link>
            </div>

            <nav className={styles.menuGrid}>
                <Link href="/admin/reservations" className={styles.menuCard}>
                    <span className={styles.menuTitle}>Listado de Reservas</span>
                    <span className={styles.menuDesc}>Ver, modificar y cancelar reservas existentes.</span>
                </Link>
                <Link href="/admin/settings" className={styles.menuCard}>
                    <span className={styles.menuTitle}>Ajustes</span>
                    <span className={styles.menuDesc}>Disponibilidad, Horarios y Plantillas de Email.</span>
                </Link>
                <div className={styles.menuCard} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                    <span className={styles.menuTitle}>Analytics</span>
                    <span className={styles.menuDesc}>Estadísticas y tendencias de ocupación (Próximamente).</span>
                </div>
            </nav>
        </div>
    );
}
