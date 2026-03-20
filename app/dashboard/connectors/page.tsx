'use client'

interface Connector {
  id: string
  name: string
  description: string
  status: 'active' | 'coming_soon'
  category: string
  icon: string
  detail?: string
}

const CONNECTORS: Connector[] = [
  {
    id: 'csv',
    name: 'Import CSV',
    description: 'Importez vos rapports AR en format CSV depuis n\'importe quel logiciel comptable.',
    status: 'active',
    category: 'Import',
    icon: '⬆',
    detail: 'Colonnes: client_name, amount_owing, days_overdue, client_email, client_language, invoice_number',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Synchronisez automatiquement vos comptes clients et factures en souffrance.',
    status: 'coming_soon',
    category: 'Comptabilité',
    icon: '⬡',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Connectez votre Xero pour importer les AR en temps réel.',
    status: 'coming_soon',
    category: 'Comptabilité',
    icon: '⬡',
  },
  {
    id: 'sage',
    name: 'Sage 50',
    description: 'Intégration native avec Sage 50 pour les PME canadiennes.',
    status: 'coming_soon',
    category: 'Comptabilité',
    icon: '⬡',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Envoyez les emails de recouvrement directement depuis votre compte Gmail.',
    status: 'coming_soon',
    category: 'Email',
    icon: '✉',
  },
  {
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    description: 'Intégration Office 365 pour les environnements Microsoft.',
    status: 'coming_soon',
    category: 'Email',
    icon: '✉',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Recevez les notifications d\'approbation directement dans votre workspace Slack.',
    status: 'coming_soon',
    category: 'Notifications',
    icon: '◈',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Notifications et approbations via Teams pour les équipes Microsoft.',
    status: 'coming_soon',
    category: 'Notifications',
    icon: '◈',
  },
]

const CATEGORIES = ['Import', 'Comptabilité', 'Email', 'Notifications']

export default function ConnectorsPage() {
  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Connecteurs
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Intégrez BASTION à vos outils existants pour automatiser l&apos;ingestion et la livraison.
        </p>
      </div>

      {CATEGORIES.map(cat => {
        const items = CONNECTORS.filter(c => c.category === cat)
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
            }}>
              {cat}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {items.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${c.status === 'active' ? 'rgba(63,185,80,0.25)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '16px 18px',
                    opacity: c.status === 'coming_soon' ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: c.status === 'active' ? 'rgba(63,185,80,0.1)' : 'var(--surface-2)',
                        border: `1px solid ${c.status === 'active' ? 'rgba(63,185,80,0.2)' : 'var(--border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        color: c.status === 'active' ? '#3fb950' : 'var(--text-muted)',
                      }}>
                        {c.icon}
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{c.name}</p>
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-block',
                      background: c.status === 'active' ? 'rgba(63,185,80,0.1)' : 'var(--surface-2)',
                      border: `1px solid ${c.status === 'active' ? 'rgba(63,185,80,0.25)' : 'var(--border)'}`,
                      borderRadius: 5,
                      padding: '2px 7px',
                      color: c.status === 'active' ? '#3fb950' : 'var(--text-muted)',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>
                      {c.status === 'active' ? 'Actif' : 'Bientôt'}
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, marginBottom: c.detail ? 8 : 0 }}>
                    {c.description}
                  </p>

                  {c.detail && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 }}>
                      {c.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div style={{
        marginTop: 8,
        padding: '14px 18px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ color: '#58a6ff', fontSize: 14 }}>◈</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          Vous avez besoin d&apos;un connecteur spécifique?{' '}
          <span style={{ color: '#58a6ff' }}>Contactez-nous</span>
          {' '}— nous intégrons sur demande pour les clients Growth et Enterprise.
        </p>
      </div>
    </div>
  )
}
