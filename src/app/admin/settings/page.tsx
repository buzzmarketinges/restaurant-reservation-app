'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './settings.module.css';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Ensure standard schedule covers all days 0-6
const DEFAULT_SCHEDULE = {
    isOpen: true,
    lunch: { start: '13:00', end: '16:00' },
    dinner: { start: '20:00', end: '23:00' }
};

const DAYS = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
];

type Tab = 'info' | 'schedule' | 'special' | 'email';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    // Main Forms
    const [form, setForm] = useState<any>({
        // Info
        restaurantName: '',
        address: '',
        logoPath: '',

        // Email
        emailSubjectPending: '',
        emailTemplatePending: '',
        emailSubjectConfirmed: '',
        emailTemplateConfirmed: '',
        emailSubjectCanceled: '',
        emailTemplateCanceled: '',

        // SMTP
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',

        // Per-Day Schedule (0-6 keys)
        schedules: {}
    });

    // Special Days State
    const [specialDays, setSpecialDays] = useState<any[]>([]);
    const [specialDayModalOpen, setSpecialDayModalOpen] = useState(false);
    const [selectedSpecialDay, setSelectedSpecialDay] = useState<Date | undefined>(undefined);
    const [specialDayForm, setSpecialDayForm] = useState({
        isClosed: false,
        lunchStart: '13:00',
        lunchEnd: '16:00',
        dinnerStart: '20:00',
        dinnerEnd: '23:00'
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/settings').then(res => res.json()),
            fetch('/api/settings/special-days').then(res => res.json())
        ]).then(([settingsData, specialDaysData]) => {
            // Init schedules if empty
            let schedules = settingsData.schedules || {};
            DAYS.forEach(d => {
                if (!schedules[d.id]) {
                    schedules[d.id] = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
                    // Legacy fallback
                    if (settingsData.daysOpen && !settingsData.daysOpen.includes(d.id)) {
                        schedules[d.id].isOpen = false;
                    }
                }
            });

            setForm({ ...settingsData, schedules });
            if (Array.isArray(specialDaysData)) {
                setSpecialDays(specialDaysData);
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("La imagen es demasiado grande. Máximo 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm((prev: any) => ({ ...prev, logoPath: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');

        // Prepare payload (convert schedules 0-6 to the format API expects in 'schedules' field)
        // We also keep daysOpen/lunchStart etc for legacy if needed, but we rely on schedules mostly now.
        // Let's populate legacy fields based on Monday just in case backend validates them.
        const monday = form.schedules[1];
        const legacyPayload = {
            ...form,
            lunchStart: monday?.lunch?.start || "13:00",
            lunchEnd: monday?.lunch?.end || "16:00",
            dinnerStart: monday?.dinner?.start || "20:00",
            dinnerEnd: monday?.dinner?.end || "23:00",
            daysOpen: DAYS.filter(d => form.schedules[d.id]?.isOpen).map(d => d.id),
        };

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(legacyPayload)
            });
            if (res.ok) setMsg('Configuración guardada.');
            else setMsg('Error al guardar.');
        } catch (err) {
            setMsg('Error de conexión.');
        } finally {
            setSaving(false);
        }
    };

    // Schedule Helpers
    const updateSchedule = (dayId: number, field: string, value: any) => {
        setForm((prev: any) => ({
            ...prev,
            schedules: {
                ...prev.schedules,
                [dayId]: { ...prev.schedules[dayId], [field]: value }
            }
        }));
    };

    const updateScheduleTime = (dayId: number, shift: 'lunch' | 'dinner', type: 'start' | 'end', val: string) => {
        setForm((prev: any) => ({
            ...prev,
            schedules: {
                ...prev.schedules,
                [dayId]: {
                    ...prev.schedules[dayId],
                    [shift]: { ...prev.schedules[dayId][shift], [type]: val }
                }
            }
        }));
    };

    const copyMonday = () => {
        const mondayConfig = form.schedules[1];
        const newSchedules = { ...form.schedules };
        DAYS.forEach(d => {
            if (d.id !== 1) {
                newSchedules[d.id] = JSON.parse(JSON.stringify(mondayConfig));
            }
        });
        setForm((prev: any) => ({ ...prev, schedules: newSchedules }));
    };

    // Special Days Helpers
    const handleDayClick = (day: Date | undefined) => {
        if (!day) return;

        // Check if exists
        const existing = specialDays.find(sd => new Date(sd.date).toDateString() === day.toDateString());

        setSelectedSpecialDay(day);

        if (existing) {
            setSpecialDayForm({
                isClosed: existing.isClosed,
                lunchStart: existing.lunchStart || '13:00',
                lunchEnd: existing.lunchEnd || '16:00',
                dinnerStart: existing.dinnerStart || '20:00',
                dinnerEnd: existing.dinnerEnd || '23:00'
            });
        } else {
            setSpecialDayForm({
                isClosed: false,
                lunchStart: '13:00',
                lunchEnd: '16:00',
                dinnerStart: '20:00',
                dinnerEnd: '23:00'
            });
        }

        setSpecialDayModalOpen(true);
    };

    const saveSpecialDay = async () => {
        if (!selectedSpecialDay) return;
        setSaving(true);

        const payload = {
            date: format(selectedSpecialDay, 'yyyy-MM-dd'),
            ...specialDayForm
        };

        try {
            const res = await fetch('/api/settings/special-days', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const saved = await res.json();
                setSpecialDays(prev => {
                    const filtered = prev.filter(d => new Date(d.date).toDateString() !== selectedSpecialDay.toDateString());
                    return [...filtered, saved];
                });
                setSpecialDayModalOpen(false);
            } else {
                const err = await res.json();
                alert('Error al guardar: ' + (err.error || 'Desconocido'));
            }
        } catch (err) {
            alert('Error al guardar día especial (conexión)');
        } finally {
            setSaving(false);
        }
    };

    const deleteSpecialDay = async () => {
        if (!selectedSpecialDay) return;
        const existing = specialDays.find(sd => new Date(sd.date).toDateString() === selectedSpecialDay.toDateString());
        if (!existing) return;

        if (!confirm('¿Borrar configuración especial para este día?')) return;

        try {
            await fetch(`/api/settings/special-days?id=${existing.id}`, { method: 'DELETE' });
            setSpecialDays(prev => prev.filter(d => d.id !== existing.id));
            setSpecialDayModalOpen(false);
        } catch (e) { alert('Error al borrar'); }
    };

    if (loading) return <div style={{ padding: '40px', color: '#fff' }}>Cargando...</div>;

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', color: 'var(--md-sys-color-on-background)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--md-sys-color-primary)', margin: 0 }}>Configuración</h1>
                <Link href="/admin/dashboard" style={{
                    color: 'var(--md-sys-color-primary)',
                    textDecoration: 'none',
                    fontWeight: 500,
                    border: '1px solid var(--md-sys-color-outline)',
                    padding: '8px 16px',
                    borderRadius: '8px'
                }}>
                    ← Volver al Panel
                </Link>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', width: '100%', marginBottom: '32px', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                {[
                    { key: 'info', label: 'Información' },
                    { key: 'schedule', label: 'Horarios' },
                    { key: 'special', label: 'Días Especiales' },
                    { key: 'email', label: 'Email & SMTP' }
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key as Tab)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '16px 0',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: activeTab === t.key ? 'bold' : 'normal',
                            color: activeTab === t.key ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                            borderBottom: activeTab === t.key ? '3px solid var(--md-sys-color-primary)' : '3px solid transparent',
                            flex: '1 1 0px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSaveSettings}>
                {activeTab === 'info' && (
                    <div className={styles.section}>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label className={styles.label}>Nombre</label>
                                <input className={styles.input} value={form.restaurantName} onChange={e => setForm({ ...form, restaurantName: e.target.value })} />
                            </div>
                            <div>
                                <label className={styles.label}>Dirección</label>
                                <input className={styles.input} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                            </div>
                            <div>
                                <label className={styles.label}>Logo</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                                    {form.logoPath && (
                                        <img src={form.logoPath} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', borderRadius: '8px' }} />
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ color: '#fff' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className={styles.section}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 className={styles.sectionTitle}>Horario Semanal</h3>
                            <button type="button" onClick={copyMonday} style={{
                                padding: '8px 16px', background: 'var(--md-sys-color-surface-variant)',
                                border: 'none', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer'
                            }}>
                                Copiar Lunes a todos
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {DAYS.map(day => {
                                const sched = form.schedules[day.id] || DEFAULT_SCHEDULE;
                                return (
                                    <div key={day.id} style={{
                                        background: 'var(--md-sys-color-surface)', padding: '16px', borderRadius: '12px',
                                        border: sched.isOpen ? '1px solid var(--md-sys-color-outline)' : '1px solid transparent',
                                        opacity: sched.isOpen ? 1 : 0.6
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--md-sys-color-primary)' }}>{day.label}</span>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <span>{sched.isOpen ? 'Abierto' : 'Cerrado'}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={sched.isOpen}
                                                    onChange={e => updateSchedule(day.id, 'isOpen', e.target.checked)}
                                                    style={{ width: '20px', height: '20px', accentColor: 'var(--md-sys-color-primary)' }}
                                                />
                                            </label>
                                        </div>

                                        {sched.isOpen && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--md-sys-color-secondary)' }}>Comida</span>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input type="time" className={styles.input} style={{ padding: '8px' }} value={sched.lunch?.start} onChange={e => updateScheduleTime(day.id, 'lunch', 'start', e.target.value)} />
                                                        <span>-</span>
                                                        <input type="time" className={styles.input} style={{ padding: '8px' }} value={sched.lunch?.end} onChange={e => updateScheduleTime(day.id, 'lunch', 'end', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--md-sys-color-secondary)' }}>Cena</span>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input type="time" className={styles.input} style={{ padding: '8px' }} value={sched.dinner?.start} onChange={e => updateScheduleTime(day.id, 'dinner', 'start', e.target.value)} />
                                                        <span>-</span>
                                                        <input type="time" className={styles.input} style={{ padding: '8px' }} value={sched.dinner?.end} onChange={e => updateScheduleTime(day.id, 'dinner', 'end', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'special' && (
                    <div className={styles.section} style={{ minHeight: '400px' }}>
                        <h3 className={styles.sectionTitle}>Días Especiales y Festivos</h3>
                        <p style={{ color: 'var(--md-sys-color-secondary)', marginBottom: '24px' }}>
                            Selecciona un día en el calendario para configurar un horario personalizado o cerrarlo por festivo.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div className={styles.calendarWrapper}> {/* Reuse Booking Style */}
                                <DayPicker
                                    mode="single"
                                    selected={selectedSpecialDay}
                                    onSelect={handleDayClick}
                                    locale={es}
                                    modifiers={{
                                        special: specialDays.map(sd => new Date(sd.date))
                                    }}
                                    modifiersStyles={{
                                        special: {
                                            border: '2px solid var(--md-sys-color-tertiary)',
                                            color: 'var(--md-sys-color-tertiary)',
                                            fontWeight: 'bold'
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '32px' }}>
                            <h4>Días configurados:</h4>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                                {specialDays.map(sd => (
                                    <div key={sd.id} style={{
                                        padding: '8px 16px', borderRadius: '8px',
                                        background: 'var(--md-sys-color-surface-variant)',
                                        borderLeft: sd.isClosed ? '4px solid var(--md-sys-color-error)' : '4px solid var(--md-sys-color-primary)'
                                    }}>
                                        <div>{format(new Date(sd.date), 'dd/MM/yyyy')}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                            {sd.isClosed ? 'CERRADO' : 'Horario especial'}
                                        </div>
                                    </div>
                                ))}
                                {specialDays.length === 0 && <span style={{ opacity: 0.5 }}>No hay días especiales configurados.</span>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className={styles.section}>
                        {/* Existing Email Fields */}
                        <h4 style={{ color: 'var(--md-sys-color-primary)', marginTop: '24px' }}>Plantillas</h4>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <input className={styles.input} placeholder="Asunto Pendiente" value={form.emailSubjectPending} onChange={e => setForm({ ...form, emailSubjectPending: e.target.value })} />
                            <input className={styles.input} placeholder="Asunto Confirmada" value={form.emailSubjectConfirmed} onChange={e => setForm({ ...form, emailSubjectConfirmed: e.target.value })} />
                            <input className={styles.input} placeholder="Asunto Cancelada" value={form.emailSubjectCanceled} onChange={e => setForm({ ...form, emailSubjectCanceled: e.target.value })} />
                        </div>

                        <h4 style={{ color: 'var(--md-sys-color-primary)', marginTop: '24px' }}>SMTP</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <input className={styles.input} placeholder="Host" value={form.smtpHost} onChange={e => setForm({ ...form, smtpHost: e.target.value })} />
                            <input className={styles.input} placeholder="Port" value={form.smtpPort} onChange={e => setForm({ ...form, smtpPort: e.target.value })} />
                            <input className={styles.input} placeholder="User" value={form.smtpUser} onChange={e => setForm({ ...form, smtpUser: e.target.value })} />
                            <input className={styles.input} type="password" placeholder="Pass" value={form.smtpPass} onChange={e => setForm({ ...form, smtpPass: e.target.value })} />
                        </div>
                    </div>
                )}

                {msg && <p className={styles.message} style={{ marginTop: '24px', textAlign: 'center' }}>{msg}</p>}

                {activeTab !== 'special' && (
                    <div className={styles.actions} style={{ marginTop: '32px' }}>
                        <button type="submit" className={styles.saveButton} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                )}
            </form>

            {/* Special Day Modal */}
            {specialDayModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'var(--md-sys-color-surface)', padding: '32px', borderRadius: '24px',
                        width: '90%', maxWidth: '500px', border: '1px solid var(--md-sys-color-outline)'
                    }}>
                        <h3 style={{ color: 'var(--md-sys-color-primary)', marginBottom: '24px' }}>
                            Configurar {selectedSpecialDay && format(selectedSpecialDay, 'dd/MM/yyyy')}
                        </h3>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', cursor: 'pointer', fontSize: '1.2rem' }}>
                            <input
                                type="checkbox"
                                checked={specialDayForm.isClosed}
                                onChange={e => setSpecialDayForm({ ...specialDayForm, isClosed: e.target.checked })}
                                style={{ width: '24px', height: '24px', accentColor: 'var(--md-sys-color-error)' }}
                            />
                            <span>CERRADO ESTE DÍA</span>
                        </label>

                        {!specialDayForm.isClosed && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label className={styles.label}>Horario Comida</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="time" className={styles.input} value={specialDayForm.lunchStart} onChange={e => setSpecialDayForm({ ...specialDayForm, lunchStart: e.target.value })} />
                                        <input type="time" className={styles.input} value={specialDayForm.lunchEnd} onChange={e => setSpecialDayForm({ ...specialDayForm, lunchEnd: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className={styles.label}>Horario Cena</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="time" className={styles.input} value={specialDayForm.dinnerStart} onChange={e => setSpecialDayForm({ ...specialDayForm, dinnerStart: e.target.value })} />
                                        <input type="time" className={styles.input} value={specialDayForm.dinnerEnd} onChange={e => setSpecialDayForm({ ...specialDayForm, dinnerEnd: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button onClick={saveSpecialDay} className={styles.submitButton} style={{ flex: 1, padding: '12px', margin: 0 }}>Guardar</button>
                            <button onClick={deleteSpecialDay} style={{
                                flex: 1, background: 'transparent', border: '1px solid var(--md-sys-color-error)',
                                color: 'var(--md-sys-color-error)', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold'
                            }}>
                                Borrar / Reset
                            </button>
                            <button onClick={() => setSpecialDayModalOpen(false)} style={{
                                flex: 1, background: 'transparent', border: '1px solid var(--md-sys-color-outline)',
                                color: 'var(--md-sys-color-on-surface)', borderRadius: '100px', cursor: 'pointer'
                            }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
