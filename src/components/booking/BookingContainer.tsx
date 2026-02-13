'use client';

import { useState, useEffect } from 'react';
import styles from './booking.module.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface Slot {
    time: string;
    available: boolean;
    type: 'LUNCH' | 'DINNER';
}

const COMMON_ALLERGENS = [
    'Gluten', 'Lácteos', 'Huevos', 'Pescado', 'Cacahuetes',
    'Soja', 'Frutos Secos', 'Apio', 'Mostaza', 'Sésamo'
];

export default function BookingContainer() {
    // State
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [date, setDate] = useState<string>(''); // Used for API calls 'YYYY-MM-DD'
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [selectedTime, setSelectedTime] = useState<string>('');
    const [guests, setGuests] = useState(2);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        notes: ''
    });

    // Allergen State
    const [hasAllergies, setHasAllergies] = useState(false);
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
    const [otherAllergy, setOtherAllergy] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [confirmedId, setConfirmedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-set today on mount if needed, or stick to initial state
    useEffect(() => {
        if (selectedDate) {
            setDate(format(selectedDate, 'yyyy-MM-dd'));
        }
    }, [selectedDate]);

    const [availabilityMessage, setAvailabilityMessage] = useState('');

    const [apiError, setApiError] = useState(false);

    // Fetch availability when date changes
    useEffect(() => {
        if (!date) return;

        async function fetchAvailability() {
            setLoadingSlots(true);
            setSelectedTime(''); // Reset time
            setAvailabilityMessage('');
            setApiError(false);
            setSlots([]); // Clear slots while loading
            try {
                const res = await fetch(`/api/availability?date=${date}`);
                if (!res.ok) {
                    throw new Error(`Error ${res.status}`);
                }
                const data = await res.json();

                if (data.message) {
                    setAvailabilityMessage(data.message);
                }

                if (data.slots) {
                    setSlots(data.slots);
                }
            } catch (err) {
                console.error(err);
                setApiError(true);
                setAvailabilityMessage('Error en el sistema. Intenta más tarde.');
            } finally {
                setLoadingSlots(false);
            }
        }

        fetchAvailability();
    }, [date]);

    // Group slots
    const lunchSlots = slots.filter(s => s.type === 'LUNCH');
    const dinnerSlots = slots.filter(s => s.type === 'DINNER');

    const toggleAllergen = (allergen: string) => {
        setSelectedAllergens(prev =>
            prev.includes(allergen)
                ? prev.filter(a => a !== allergen)
                : [...prev, allergen]
        );
    };

    const handleDaySelect = (day: Date | undefined) => {
        setSelectedDate(day);
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const selectedSlotObj = slots.find(s => s.time === selectedTime);

            let finalAllergies = '';
            if (hasAllergies) {
                const list = [...selectedAllergens];
                if (otherAllergy.trim()) list.push(`Otro: ${otherAllergy}`);
                finalAllergies = list.join(', ');
            }

            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    timeSlot: selectedTime,
                    shift: selectedSlotObj?.type || 'LUNCH',
                    guests,
                    ...formData,
                    allergies: finalAllergies
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al reservar');
            setConfirmedId(data.id);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (confirmedId) {
        return (
            <div className={styles.container}>
                <div className={styles.card} style={{ textAlign: 'center', padding: '48px' }}>
                    <h2 className={styles.title} style={{ color: 'var(--md-sys-color-primary)' }}>¡Reserva Confirmada!</h2>
                    <p>Tu código de reserva es: <strong>{confirmedId}</strong></p>
                    <p>Hemos enviado un correo a {formData.email} con los detalles.</p>
                    <button className={styles.submitButton} onClick={() => window.location.reload()} style={{ marginTop: '24px' }}>
                        Nueva Reserva
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Reserva tu mesa</h1>
                    <p>Vive una experiencia gastronómica inolvidable</p>
                </header>

                <form className={styles.content} onSubmit={handleBook}>

                    {/* 1. Date */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>1. Elige una fecha</h3>
                        <div className={styles.calendarWrapper}>
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDaySelect}
                                locale={es}
                                disabled={{ before: new Date() }}
                                required
                            />
                        </div>
                    </section>

                    {/* 2. Time */}
                    {date && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>2. Selecciona hora</h3>

                            {loadingSlots ? <p>Cargando disponibilidad...</p> : (
                                <>
                                    {(lunchSlots.length === 0 && dinnerSlots.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '24px', color: apiError ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-secondary)' }}>
                                            <p>{availabilityMessage || "No hay disponibilidad para esta fecha."}</p>
                                            {!apiError && <small>Por favor, prueba con otro día.</small>}
                                        </div>
                                    )}

                                    {lunchSlots.length > 0 && (
                                        <div className={styles.formGroup}>
                                            <span className={styles.label}>Comida</span>
                                            <div className={styles.grid}>
                                                {lunchSlots.map(slot => (
                                                    <button
                                                        key={slot.time}
                                                        type="button"
                                                        disabled={!slot.available}
                                                        className={clsx(styles.button, {
                                                            [styles.buttonSelected]: selectedTime === slot.time
                                                        })}
                                                        onClick={() => setSelectedTime(slot.time)}
                                                    >
                                                        {slot.time}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {dinnerSlots.length > 0 && (
                                        <div className={styles.formGroup}>
                                            <span className={styles.label}>Cena</span>
                                            <div className={styles.grid}>
                                                {dinnerSlots.map(slot => (
                                                    <button
                                                        key={slot.time}
                                                        type="button"
                                                        disabled={!slot.available}
                                                        className={clsx(styles.button, {
                                                            [styles.buttonSelected]: selectedTime === slot.time
                                                        })}
                                                        onClick={() => setSelectedTime(slot.time)}
                                                    >
                                                        {slot.time}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    )}

                    {/* 3. Details (Reveal only if time selected) */}
                    {selectedTime && (
                        <section className={styles.section} style={{ animation: 'fadeIn 0.5s' }}>
                            <h3 className={styles.sectionTitle}>3. Tus Datos</h3>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Comensales</label>
                                <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(6, 1fr)', maxWidth: '360px' }}>
                                    {[1, 2, 3, 4, 5, 6].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            className={clsx(styles.button, {
                                                [styles.buttonSelected]: guests === num
                                            })}
                                            onClick={() => setGuests(num)}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Nombre *</label>
                                    <input className={styles.input} required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Apellido *</label>
                                    <input className={styles.input} required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email *</label>
                                <input type="email" className={styles.input} required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Teléfono</label>
                                <input type="tel" className={styles.input} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>

                            <div className={styles.formGroup} style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: hasAllergies ? '16px' : '0' }}>
                                    <input type="checkbox" id="allergyCheck" checked={hasAllergies} onChange={e => setHasAllergies(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                    <label htmlFor="allergyCheck" className={styles.label} style={{ marginBottom: 0, cursor: 'pointer', color: hasAllergies ? 'var(--md-sys-color-primary)' : 'inherit' }}>
                                        ¿Tienes alguna alergia o intolerancia?
                                    </label>
                                </div>

                                {hasAllergies && (
                                    <div style={{ animation: 'fadeIn 0.3s' }}>
                                        <p style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--md-sys-color-secondary)' }}>Selecciona los alérgenos:</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {COMMON_ALLERGENS.map(allergen => (
                                                <label key={allergen} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={selectedAllergens.includes(allergen)} onChange={() => toggleAllergen(allergen)} />
                                                    {allergen}
                                                </label>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '12px' }}>
                                            <input placeholder="Otros alérgenos (Especifique)" className={styles.input} value={otherAllergy} onChange={e => setOtherAllergy(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Comentarios adicionales</label>
                                <textarea className={styles.textarea} rows={2} placeholder="¿Alguna petición especial?" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>

                            {error && <p style={{ color: 'var(--md-sys-color-error)' }}>{error}</p>}

                            <button type="submit" className={styles.submitButton} disabled={submitting}>
                                {submitting ? 'Confirmando...' : 'Confirmar Reserva'}
                            </button>
                        </section>
                    )}

                </form>
            </div>
        </div>
    );
}
