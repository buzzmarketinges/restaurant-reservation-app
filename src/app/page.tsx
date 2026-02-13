export default function Home() {
  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px'
    }}>
      <h1 style={{
        font: 'var(--md-sys-typescale-display-large-font)',
        fontSize: 'var(--md-sys-typescale-display-large-size)',
        color: 'var(--md-sys-color-primary)'
      }}>Restaurante AI</h1>

      <a href="/booking" style={{
        padding: '12px 24px',
        backgroundColor: 'var(--md-sys-color-primary)',
        color: 'var(--md-sys-color-on-primary)',
        borderRadius: 'var(--md-sys-shape-corner-full)',
        font: 'var(--md-sys-typescale-body-large-font)'
      }}>
        Reservar Mesa
      </a>

      <a href="/admin/dashboard" style={{
        color: 'var(--md-sys-color-secondary)'
      }}>
        Acceso Admin
      </a>
    </main>
  )
}
