'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './settings.module.css';

const DAYS = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
];

type Tab = 'info' | 'schedule' | 'email';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const [form, setForm] = useState({
        // Schedule
        lunchStart: '13:00',
        lunchEnd: '15:30',
        dinnerStart: '20:00',
        dinnerEnd: '23:00',
        daysOpen: [1, 2, 3, 4, 5, 6],
        // Info
        restaurantName: '',
        address: '',
        logoPath: '',

        // Email Templates
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
        smtpPass: ''
    });

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setForm(prev => ({
                        ...prev,
                        ...data,
                        daysOpen: data.daysOpen || prev.daysOpen,
                        logoPath: data.logoPath || '',

                        // Default Fallbacks if DB is empty
                        emailSubjectPending: data.emailSubjectPending || 'Reserva Recibida',
                        emailTemplatePending: data.emailTemplatePending || 'Hola %firstName%, hemos recibido...',
                        emailSubjectConfirmed: data.emailSubjectConfirmed || 'Reserva Confirmada',
                        emailTemplateConfirmed: data.emailTemplateConfirmed || 'Tu reserva está confirmada...',
                        emailSubjectCanceled: data.emailSubjectCanceled || 'Reserva Cancelada',
                        emailTemplateCanceled: data.emailTemplateCanceled || 'Tu reserva ha sido cancelada...',
                    }));
                }
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, []);

    const toggleDay = (dayId: number) => {
        setForm(prev => {
            const isOpen = prev.daysOpen.includes(dayId);
            const newDays = isOpen
                ? prev.daysOpen.filter((d: number) => d !== dayId)
                : [...prev.daysOpen, dayId];
            return { ...prev, daysOpen: newDays };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/settings/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                // Determine full path or relative?
                // backend returned filename and publicUrl.
                // We should store the relative path for the emailer (public/uploads/...) or just filename?
                // The emailer needs filesystem path: join(process.cwd(), 'public', 'uploads', filename)
                // The frontend needs public URL: /uploads/filename
                // Let's store just the 'filename' in the DB as logoPath (or full relative path)
                // Actually if I store '/uploads/filename.jpg', I can use it directly in frontend.
                // And in backend I can just join(process.cwd(), 'public', logoPath).
                setForm(prev => ({ ...prev, logoPath: `/uploads/${data.filename}` }));
            } else {
                alert('Falló la subida del logo');
            }
        } catch (err) {
            console.error(err);
            alert('Error al subir imagen');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (res.ok) {
                setMsg('Configuración guardada correctamente.');
            } else {
                setMsg(data.error || 'Error al guardar.');
            }
        } catch (err) {
            setMsg('Error de conexión.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: 'var(--md-sys-color-on-background)' }}>Cargando...</div>;

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: 'var(--md-sys-color-on-background)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--md-sys-color-primary)', margin: 0 }}>Configuración</h1>
                <Link href="/admin/dashboard" style={{
                    color: 'var(--md-sys-color-primary)',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '1rem',
                    border: '1px solid var(--md-sys-color-outline)',
                    padding: '8px 16px',
                    borderRadius: '8px'
                }}>
                    ← Volver al Panel
                </Link>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', width: '100%', marginBottom: '32px', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                {['info', 'schedule', 'email'].map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t as Tab)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '16px 0',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: activeTab === t ? 'bold' : 'normal',
                            color: activeTab === t ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                            borderBottom: activeTab === t ? '3px solid var(--md-sys-color-primary)' : '3px solid transparent',
                            flex: '1 1 0px', // Forces equal width ignoring text content
                            textAlign: 'center',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t === 'info' && 'Información'}
                        {t === 'schedule' && 'Horarios'}
                        {t === 'email' && 'Email & SMTP'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {activeTab === 'info' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className={styles.label}>Nombre del Restaurante</label>
                            <input
                                className={styles.input}
                                value={form.restaurantName}
                                onChange={e => setForm({ ...form, restaurantName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Dirección</label>
                            <input
                                className={styles.input}
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Logo del Restaurante</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                                {form.logoPath && (
                                    <img
                                        src={form.logoPath}
                                        alt="Logo Preview"
                                        style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #333' }}
                                    />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ color: 'var(--md-sys-color-on-surface)' }}
                                />
                            </div>
                            <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>Sube una imagen (JPG, PNG). Se guardará automáticamente.</small>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Días de Apertura</h3>
                        <div className={styles.daysGrid}>
                            {DAYS.map(day => (
                                <button
                                    key={day.id}
                                    type="button"
                                    className={`${styles.dayButton} ${form.daysOpen.includes(day.id) ? styles.dayActive : ''}`}
                                    onClick={() => toggleDay(day.id)}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>

                        <hr className={styles.divider} />

                        <h3 className={styles.sectionTitle}>Turno de Comida</h3>
                        <div className={styles.timeGroup}>
                            <div>
                                <label className={styles.label}>Apertura</label>
                                <input
                                    type="time"
                                    className={styles.input}
                                    value={form.lunchStart}
                                    onChange={e => setForm({ ...form, lunchStart: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Última Reserva</label>
                                <input
                                    type="time"
                                    className={styles.input}
                                    value={form.lunchEnd}
                                    onChange={e => setForm({ ...form, lunchEnd: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <h3 className={styles.sectionTitle}>Turno de Cena</h3>
                        <div className={styles.timeGroup}>
                            <div>
                                <label className={styles.label}>Apertura</label>
                                <input
                                    type="time"
                                    className={styles.input}
                                    value={form.dinnerStart}
                                    onChange={e => setForm({ ...form, dinnerStart: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Última Reserva</label>
                                <input
                                    type="time"
                                    className={styles.input}
                                    value={form.dinnerEnd}
                                    onChange={e => setForm({ ...form, dinnerEnd: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Plantillas de Correo</h3>
                        <p className={styles.label} style={{ marginBottom: '24px' }}>Variables: %firstName%, %lastName%, %guests%, %date%, %time%, %restaurantName%</p>

                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ marginBottom: '12px', color: 'var(--md-sys-color-primary)' }}>1. Estado: PENDIENTE</h4>
                            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                                <input className={styles.input} placeholder="Asunto" value={form.emailSubjectPending} onChange={e => setForm({ ...form, emailSubjectPending: e.target.value })} />
                                <textarea className={styles.input} rows={3} placeholder="Mensaje..." value={form.emailTemplatePending} onChange={e => setForm({ ...form, emailTemplatePending: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ marginBottom: '12px', color: 'var(--md-sys-color-primary)' }}>2. Estado: CONFIRMADA</h4>
                            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                                <input className={styles.input} placeholder="Asunto" value={form.emailSubjectConfirmed} onChange={e => setForm({ ...form, emailSubjectConfirmed: e.target.value })} />
                                <textarea className={styles.input} rows={3} placeholder="Mensaje..." value={form.emailTemplateConfirmed} onChange={e => setForm({ ...form, emailTemplateConfirmed: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ marginBottom: '12px', color: 'var(--md-sys-color-primary)' }}>3. Estado: CANCELADA</h4>
                            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                                <input className={styles.input} placeholder="Asunto" value={form.emailSubjectCanceled} onChange={e => setForm({ ...form, emailSubjectCanceled: e.target.value })} />
                                <textarea className={styles.input} rows={3} placeholder="Mensaje..." value={form.emailTemplateCanceled} onChange={e => setForm({ ...form, emailTemplateCanceled: e.target.value })} />
                            </div>
                        </div>

                        <hr className={styles.divider} />

                        <h3 className={styles.sectionTitle}>Configuración SMTP</h3>
                        <div className={styles.timeGroup}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className={styles.label}>Host</label>
                                <input className={styles.input} value={form.smtpHost} onChange={e => setForm({ ...form, smtpHost: e.target.value })} />
                            </div>
                            <div>
                                <label className={styles.label}>Puerto</label>
                                <input type="number" className={styles.input} value={form.smtpPort} onChange={e => setForm({ ...form, smtpPort: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className={styles.label}>Usuario</label>
                                <input className={styles.input} value={form.smtpUser} onChange={e => setForm({ ...form, smtpUser: e.target.value })} />
                            </div>
                            <div>
                                <label className={styles.label}>Pass</label>
                                <input type="password" className={styles.input} value={form.smtpPass} onChange={e => setForm({ ...form, smtpPass: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {msg && <p className={styles.message}>{msg}</p>}

                <div className={styles.actions}>
                    <button type="submit" className={styles.saveButton} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <Link href="/admin/dashboard" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: '1px solid var(--md-sys-color-outline)',
                        color: 'var(--md-sys-color-primary)',
                        textDecoration: 'none',
                        fontWeight: '500'
                    }}>
                        Cancelar
                    </Link>
                </div>

            </form>
        </div>
    );
}
