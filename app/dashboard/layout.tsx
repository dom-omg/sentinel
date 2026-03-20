'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

const NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Vue d\'ensemble',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/accounts',
    label: 'Comptes AR',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/approvals',
    label: 'Approbations',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M13 2L6 9L3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8" cy="10" r="5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/audit',
    label: 'Audit Trail',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/policies',
    label: 'Politiques',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="13" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/upload',
    label: 'Importer AR',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 10V2M5 5L8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) setUser(d.user)
        else router.push('/login')
      })
      .catch(() => router.push('/login'))
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 28,
            height: 28,
            background: 'linear-gradient(135deg, #3fb950, #238636)',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <ShieldIcon />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            SENTINEL
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
          <div style={{ marginBottom: 4 }}>
            <p style={{ padding: '4px 8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Collections Operator
            </p>
          </div>
          {NAV.map(item => {
            const active = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '7px 8px',
                  borderRadius: 7,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  marginBottom: 2,
                  transition: 'all 0.1s',
                  position: 'relative',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
                {item.href === '/dashboard/approvals' && pendingCount > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#f85149',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: '1px 5px',
                    minWidth: 16,
                    textAlign: 'center',
                  }}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        {user && (
          <div style={{
            padding: '12px 12px',
            borderTop: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--surface-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {user.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '5px 10px',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Déconnexion
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
