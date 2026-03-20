'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function doLogin(e: string, p: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password: p }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur de connexion'); return }
      router.push('/dashboard')
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    await doLogin(email, password)
  }

  async function demoLogin() {
    setEmail('admin@sentinel.demo')
    setPassword('bastion2026')
    await doLogin('admin@sentinel.demo', 'bastion2026')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #3fb950, #238636)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L13.5 4.5V10.5C13.5 13 11 14.5 8 15.5C5 14.5 2.5 13 2.5 10.5V4.5L8 1.5Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="5.5" y="8" width="5" height="3.5" rx="0.75" stroke="white" strokeWidth="1.2"/>
                <path d="M6.5 8V6.5C6.5 5.4 7.1 4.8 8 4.8C8.9 4.8 9.5 5.4 9.5 6.5V8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em' }}>
              BASTION
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            AI Workforce Control Plane
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 28,
        }}>
          <h1 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
            Connexion
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
            Accès sécurisé à votre console d'opérateurs
          </p>

          {/* Demo shortcut */}
          <button
            type="button"
            onClick={demoLogin}
            disabled={loading}
            style={{
              width: '100%',
              background: 'rgba(63,185,80,0.08)',
              border: '1px solid rgba(63,185,80,0.3)',
              borderRadius: 8,
              padding: '10px 16px',
              color: '#3fb950',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 20,
              letterSpacing: '-0.01em',
            }}
          >
            ⚡ Accès démo — 1 clic
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>ou connexion manuelle</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                Courriel
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="vous@entreprise.ca"
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(248, 81, 73, 0.1)',
                border: '1px solid rgba(248, 81, 73, 0.2)',
                borderRadius: 8,
                padding: '9px 12px',
                color: '#f85149',
                fontSize: 13,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#238636' : '#3fb950',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Données hébergées au Canada · Conforme Loi 25 / PIPEDA
          </p>
        </div>
      </div>
    </div>
  )
}
