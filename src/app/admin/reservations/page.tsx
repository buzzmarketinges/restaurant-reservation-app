'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reservation {
    id: string;
    date: string;
    timeSlot: string;
    guests: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    allergies?: string;
    notes?: string;
}

function ReservationsContent() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewAnchorDate, setViewAnchorDate] = useState<Date>(new Date());

    const searchParams = useSearchParams();

    // Filter
    const statusFilter = searchParams.get('status');

    useEffect(() => {
        let url = '/api/admin/reservations?';
        const params = new URLSearchParams();

        if (statusFilter) {
            params.append('status', statusFilter);
        }

        if (selectedDate) {
            params.append('date', format(selectedDate, 'yyyy-MM-dd'));
        }

        fetch(url + params.toString())
            .then(res => res.json())
            .then(data => setReservations(data))
            .catch(err => console.error(err));
    }, [statusFilter, selectedDate]);

    // Generate 7 days centered on viewAnchorDate (Static view logic)
    const daysWindow = [-3, -2, -1, 0, 1, 2, 3].map(offset => addDays(viewAnchorDate, offset));

    const handlePrevWeek = () => setViewAnchorDate(prev => addDays(prev, -7));
    const handleNextWeek = () => setViewAnchorDate(prev => addDays(prev, 7));

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        if (!confirm(`¿Cambiar estado a ${newStatus} y enviar email?`)) return;

        setUpdating(id);
        try {
            const res = await fetch(`/api/admin/reservations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
            } else {
                const data = await res.json();
                alert(`Error al actualizar: ${data.error || 'Desconocido'}`);
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        } finally {
            setUpdating(null);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return { bg: '#e8def8', color: '#1d192b' }; // Purple
            case 'PENDING': return { bg: '#fff8be', color: '#1d1b06' }; // Yellow
            case 'CANCELED': return { bg: '#ffdad6', color: '#410002' }; // Red
            default: return { bg: '#e7e0ec', color: '#49454f' };
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', background: 'var(--md-sys-color-background)', minHeight: '100vh', color: 'var(--md-sys-color-on-background)' }}>

            {/* Header with Integrated Date Slider */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ minWidth: '300px' }}>
                    <h1 style={{
                        fontFamily: 'var(--md-sys-typescale-headline-medium-font)',
                        fontSize: '32px',
                        color: 'var(--md-sys-color-primary)',
                        marginBottom: '4px'
                    }}>Gestión de Reservas</h1>
                    <p style={{ color: 'var(--md-sys-color-secondary)' }}>
                        {statusFilter ? `Mostrando solo: ${statusFilter}` : 'Visualiza y gestiona todas las entradas.'}
                    </p>
                </div>

                {/* Centered Date Slider */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <button
                        onClick={handlePrevWeek}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--md-sys-color-outline)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: 'var(--md-sys-color-primary)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem',
                            flexShrink: 0
                        }}
                    >
                        &lt;
                    </button>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', paddingTop: '10px', paddingBottom: '10px' }}>
                        {daysWindow.map((day, i) => {
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());

                            let bg = 'var(--md-sys-color-surface)';
                            let border = '1px solid var(--md-sys-color-outline-variant)';
                            let color = 'var(--md-sys-color-on-surface)';

                            if (isToday) {
                                bg = 'rgba(76, 175, 80, 0.15)';
                                border = '1px solid rgba(76, 175, 80, 0.4)';
                                color = '#81c784';
                            }

                            if (isSelected) {
                                bg = 'rgba(var(--md-sys-color-primary-rgb), 0.1)';
                                border = '2px solid var(--md-sys-color-primary)';
                                color = 'var(--md-sys-color-primary)';
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '56px',
                                        height: '56px',
                                        padding: '2px',
                                        borderRadius: '12px',
                                        border: border,
                                        background: bg,
                                        color: color,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        scale: isSelected ? '1.1' : '1',
                                        flexShrink: 0
                                    }}
                                >
                                    <span style={{ fontSize: '0.7rem', textTransform: 'capitalize', opacity: 0.8 }}>
                                        {format(day, 'EEE', { locale: es })}
                                    </span>
                                    <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                        {format(day, 'd')}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <button
                        onClick={handleNextWeek}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--md-sys-color-outline)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: 'var(--md-sys-color-primary)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem',
                            flexShrink: 0
                        }}
                    >
                        &gt;
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', minWidth: '300px', justifyContent: 'flex-end' }}>
                    {statusFilter && (
                        <Link href="/admin/reservations" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '10px 24px',
                            color: 'var(--md-sys-color-secondary)',
                            fontWeight: '500',
                            textDecoration: 'underline'
                        }}>
                            Ver Todas
                        </Link>
                    )}
                    <Link href="/admin/dashboard" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '10px 24px',
                        borderRadius: '100px',
                        border: '1px solid var(--md-sys-color-outline)',
                        color: 'var(--md-sys-color-primary)',
                        background: 'transparent',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                    }}>
                        ← Volver al Panel
                    </Link>
                </div>
            </div>

            {/* Table Card */}
            <div style={{
                background: 'var(--md-sys-color-surface)',
                borderRadius: '24px',
                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 4px 8px 3px rgba(0,0,0,0.05)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', tableLayout: 'fixed' }}>
                        <thead style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            <tr>
                                <th style={{ padding: '24px', fontWeight: 'bold', width: '15%' }}>FECHA</th>
                                <th style={{ padding: '24px', fontWeight: 'bold', width: '10%' }}>HORA</th>
                                <th style={{ padding: '24px', fontWeight: 'bold', width: '30%' }}>CLIENTE</th>
                                <th style={{ padding: '24px', fontWeight: 'bold', width: '15%' }}>COMENSALES</th>
                                <th style={{ padding: '24px', fontWeight: 'bold', width: '30%' }}>ESTADO (Acción)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.map(res => {
                                const statusStyle = getStatusStyle(res.status);
                                const dateObj = new Date(res.date);
                                const isLoading = updating === res.id;

                                const hasAllergies = res.allergies && res.allergies.length > 0;
                                const hasNotes = res.notes && res.notes.length > 0;

                                let rowStyle: React.CSSProperties = {
                                    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                                    transition: 'all 0.2s'
                                };

                                // Visual Cues
                                if (hasAllergies) {
                                    rowStyle.borderLeft = '6px solid var(--md-sys-color-error)';
                                    rowStyle.background = 'linear-gradient(90deg, rgba(186, 26, 26, 0.05) 0%, transparent 100%)';
                                }

                                if (hasNotes) {
                                    if (!hasAllergies) { // If both, Red takes precedence for border, but we can mix background
                                        rowStyle.borderLeft = '6px solid var(--md-sys-color-tertiary)';
                                        rowStyle.background = 'linear-gradient(90deg, rgba(125, 82, 96, 0.05) 0%, transparent 100%)';
                                    } else {
                                        // Both: Red border, but maybe a mixed hint? Keeping it simple: Allergy is critical.
                                    }
                                }

                                return (
                                    <tr key={res.id} style={rowStyle}>
                                        <td style={{ padding: '24px', fontSize: '1.05rem', fontWeight: '500' }}>
                                            {dateObj.toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '24px', color: 'var(--md-sys-color-secondary)' }}>
                                            {res.timeSlot}
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    background: 'var(--md-sys-color-primary)', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '18px'
                                                }}>
                                                    {res.firstName[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{res.firstName} {res.lastName}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-secondary)' }}>{res.email}</div>
                                                    {hasAllergies && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-error)', fontWeight: 'bold', marginTop: '4px' }}>
                                                            ⚠️ Alergias: {res.allergies}
                                                        </div>
                                                    )}
                                                    {hasNotes && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-tertiary)', fontStyle: 'italic', marginTop: '2px' }}>
                                                            📝 Nota: {res.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                background: 'var(--md-sys-color-background)',
                                                borderRadius: '16px',
                                                fontWeight: '500'
                                            }}>
                                                👥 {res.guests}
                                            </span>
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            {isLoading ? (
                                                <span style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-secondary)' }}>Actualizando...</span>
                                            ) : (
                                                <select
                                                    value={res.status}
                                                    onChange={(e) => handleUpdateStatus(res.id, e.target.value)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${statusStyle.bg}`, // Subtle border match
                                                        backgroundColor: statusStyle.bg,
                                                        color: statusStyle.color,
                                                        fontWeight: 'bold',
                                                        fontFamily: 'inherit',
                                                        cursor: 'pointer',
                                                        width: '100%',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    <option value="PENDING">Pendiente</option>
                                                    <option value="CONFIRMED">Confirmada</option>
                                                    <option value="CANCELED">Cancelada</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {reservations.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--md-sys-color-secondary)' }}>
                                        {statusFilter
                                            ? 'No hay reservas con este estado.'
                                            : 'No hay reservas registradas aún.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function ReservationsList() {
    return (
        <Suspense fallback={
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--md-sys-color-secondary)',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                Cargando...
            </div>
        }>
            <ReservationsContent />
        </Suspense>
    );
}
