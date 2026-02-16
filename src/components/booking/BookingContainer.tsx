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

    const steps = [1, 2, 3];
    const currentStep = 1;

    // ... (keep existing handleBook logic if needed, or adapt for multi-step later)
    // For now, we are just restyling the single page flow to look like the design.

    // Helper to format date for header
    const headerDate = selectedDate ? format(selectedDate, 'MMMM yyyy', { locale: es }) : '';

    return (
        <div className={styles.container}>
            {/* Top Navigation */}
            <div className={styles.headerNav} style={{ justifyContent: 'center' }}>
                <span className={styles.navTitle}>Hacer Reserva</span>
            </div>

            {/* Step Indicator */}
            <div className={styles.stepIndicator}>
                <div className={styles.stepHeader}>
                    <span>Paso 1 de 3</span>
                    <span>Fecha y Hora</span>
                </div>
                <div className={styles.progressBar}>
                    <div className={clsx(styles.progressSegment, styles.progressActive)}></div>
                    <div className={styles.progressSegment}></div>
                    <div className={styles.progressSegment}></div>
                </div>
            </div>

            <div className={styles.content}>
                {/* Calendar Card */}
                <div className={styles.calendarCard}>
                    <div className={styles.sectionHeader} style={{ justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                        {headerDate.charAt(0).toUpperCase() + headerDate.slice(1)}
                    </div>
                    <style>{`
                      .rdp-nav_button { color: var(--md-sys-color-primary); }
                      .rdp-head_cell { color: var(--md-sys-color-secondary); font-size: 0.75rem; text-transform: uppercase; }
                      .rdp-caption { display: none; } /* Hide default caption as we added custom one */
                    `}</style>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDaySelect}
                            locale={es}
                            disabled={{ before: new Date() }}
                            required
                            classNames={{
                                day_selected: "rdp-day_selected",
                                day_today: "rdp-day_today",
                            }}
                        />
                    </div>
                </div>

                {/* Time Slots - Lunch */}
                {date && (
                    <>
                        {loadingSlots ? <div style={{ textAlign: 'center', color: '#888' }}>Cargando horarios...</div> :
                            availabilityMessage ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '32px',
                                    color: '#EBC45D',
                                    background: 'rgba(235, 196, 93, 0.05)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(235, 196, 93, 0.2)',
                                    marginTop: '24px'
                                }}>
                                    <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>⚠️</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{availabilityMessage}</span>
                                </div>
                            ) : (
                                <>
                                    {/* Lunch Section */}
                                    <div>
                                        <div className={styles.sectionHeader}>
                                            <span>☀️</span>
                                            <span>Comida</span>
                                            <div className={styles.separator}></div>
                                        </div>
                                        <div className={styles.timeGrid}>
                                            {lunchSlots.length > 0 ? lunchSlots.map(slot => (
                                                <button
                                                    key={slot.time}
                                                    disabled={!slot.available}
                                                    className={clsx(styles.timeButton, {
                                                        [styles.timeButtonSelected]: selectedTime === slot.time
                                                    })}
                                                    onClick={() => setSelectedTime(slot.time)}
                                                >
                                                    {slot.time}
                                                </button>
                                            )) : <span style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>No disponible</span>}
                                        </div>
                                    </div>

                                    {/* Dinner Section */}
                                    <div>
                                        <div className={styles.sectionHeader}>
                                            <span>🌙</span>
                                            <span>Cena</span>
                                            <div className={styles.separator}></div>
                                        </div>
                                        <div className={styles.timeGrid}>
                                            {dinnerSlots.length > 0 ? dinnerSlots.map(slot => (
                                                <button
                                                    key={slot.time}
                                                    disabled={!slot.available}
                                                    className={clsx(styles.timeButton, {
                                                        [styles.timeButtonSelected]: selectedTime === slot.time
                                                    })}
                                                    onClick={() => setSelectedTime(slot.time)}
                                                >
                                                    {slot.time}
                                                </button>
                                            )) : <span style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>No disponible</span>}
                                        </div>
                                    </div>
                                </>
                            )}
                    </>
                )}

                {/* User Data Form */}
                {selectedTime && (
                    <div id="guest-details" style={{ marginTop: '40px', borderTop: '1px solid #333', paddingTop: '40px' }}>
                        <h3 className={styles.sectionHeader}>Detalles del Invitado</h3>
                        {/* Guest Count */}
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>COMENSALES</label>
                            <div className={styles.guestGrid}>
                                {[1, 2, 3, 4, 5, 6].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        className={clsx(styles.timeButton, { [styles.timeButtonSelected]: guests === num })}
                                        onClick={() => setGuests(num)}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name Fields */}
                        <div className={styles.nameRow}>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>NOMBRE *</label>
                                <input className={styles.input} required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>APELLIDO *</label>
                                <input className={styles.input} required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>EMAIL *</label>
                            <input type="email" className={styles.input} required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>TELÉFONO</label>
                            <input type="tel" className={styles.input} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>

                        <div className={styles.inputGroup} style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: hasAllergies ? '16px' : '0' }}>
                                <input type="checkbox" id="allergyCheck" checked={hasAllergies} onChange={e => setHasAllergies(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }} />
                                <label htmlFor="allergyCheck" className={styles.inputLabel} style={{ marginBottom: 0, cursor: 'pointer', color: hasAllergies ? 'var(--md-sys-color-primary)' : 'inherit' }}>
                                    ¿Tienes alguna alergia o intolerancia?
                                </label>
                            </div>

                            {hasAllergies && (
                                <div style={{ animation: 'fadeIn 0.3s' }}>
                                    <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#ccc' }}>Selecciona los alérgenos:</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {COMMON_ALLERGENS.map(allergen => (
                                            <label key={allergen} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', color: '#eee' }}>
                                                <input type="checkbox" checked={selectedAllergens.includes(allergen)} onChange={() => toggleAllergen(allergen)} style={{ accentColor: 'var(--md-sys-color-primary)' }} />
                                                {allergen}
                                            </label>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '12px' }}>
                                        <input placeholder="Otros alérgenos..." className={styles.input} value={otherAllergy} onChange={e => setOtherAllergy(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>COMENTARIOS</label>
                            <textarea className={styles.input} rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            {/* Make padding for footer visibility */}
                            <div style={{ height: '60px' }}></div>
                        </div>

                        {/* Submit is now handled by the footer button if we treat it as "Confirm", 
                            but for UX flow, let's keep a specific confirm button here too or use the footer 
                            dynamically.
                        */}
                    </div>
                )
                }
            </div >

            {/* Sticky Footer */}
            {
                selectedTime && (
                    <div className={styles.footer}>
                        <div className={styles.footerContent}>
                            <div className={styles.footerInfo}>
                                <div>
                                    <span className={styles.infoLabel}>SELECCIÓN</span>
                                    <span className={styles.infoValue}>
                                        {selectedDate ? format(selectedDate, 'EEE, d MMM', { locale: es }) : ''} • {selectedTime}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className={styles.infoLabel}>DURACIÓN EST.</span>
                                    <span className={styles.infoValue}>90 Minutos</span>
                                </div>
                            </div>
                            <button className={styles.continueButton} onClick={(e) => {
                                // If form is visible/filled, submit. If not, scroll to it.
                                const formEl = document.getElementById('guest-details');
                                if (formEl) {
                                    // logic to submit if already filled, or just scroll
                                    if (!formData.firstName || !formData.email) {
                                        formEl.scrollIntoView({ behavior: 'smooth' });
                                        // Focus first input
                                        const input = formEl.querySelector('input') as HTMLInputElement;
                                        if (input) input.focus();
                                    } else {
                                        handleBook(e);
                                    }
                                }
                            }}>
                                <span>Confirmar Reserva</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
