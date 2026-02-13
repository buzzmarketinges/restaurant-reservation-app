'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminHeader() {
    const { data: session } = useSession();
    const pathname = usePathname();

    // Don't show on login page if it accidentally loads there
    if (pathname.includes('/auth/login')) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            zIndex: 100
        }}>
            {session?.user && (
                <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.9rem' }}>
                    {session.user.email}
                </span>
            )}
            <button
                onClick={() => signOut({ callbackUrl: '/' })}
                style={{
                    background: 'none',
                    border: '1px solid var(--md-sys-color-outline)',
                    color: 'var(--md-sys-color-primary)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}
            >
                Cerrar Sesión
            </button>
        </div>
    );
}
