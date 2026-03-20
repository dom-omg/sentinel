import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 0,
    }}>
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, #1a6b28, #3fb950 50%, #9dffb2)',
        borderRadius: 14, display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 24,
        boxShadow: '0 0 30px rgba(63,185,80,0.25)',
      }}>
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <path d="M10 1.5L17 5.5V12.5C17 16 14 17.5 10 19C6 17.5 3 16 3 12.5V5.5L10 1.5Z" stroke="rgba(3,6,8,0.9)" strokeWidth="1.4" strokeLinejoin="round"/>
          <rect x="7" y="10.5" width="6" height="4.5" rx="1" stroke="rgba(3,6,8,0.9)" strokeWidth="1.2"/>
          <path d="M8 10.5V8.5C8 7.1 8.9 6.2 10 6.2C11.1 6.2 12 7.1 12 8.5V10.5" stroke="rgba(3,6,8,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      <p style={{
        fontSize: 72, fontWeight: 800, letterSpacing: '-0.04em',
        background: 'linear-gradient(110deg, #0b2e12 0%, #1a6b28 18%, #3fb950 38%, #9dffb2 52%, #3fb950 66%, #1a6b28 82%, #0b2e12 100%)',
        backgroundSize: '300% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 8,
      }}>
        404
      </p>

      <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        Page introuvable
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32, textAlign: 'center', maxWidth: 320 }}>
        Cette page n&apos;existe pas ou a été déplacée.<br/>
        Retournez à la console BASTION.
      </p>

      <Link href="/dashboard" style={{
        background: '#3fb950', color: '#030608',
        borderRadius: 9, padding: '11px 24px',
        fontSize: 14, fontWeight: 700, textDecoration: 'none',
      }}>
        Retour au dashboard
      </Link>
    </div>
  )
}
