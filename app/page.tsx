import Link from 'next/link'

function ShieldIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 1.5L17 5.5V12.5C17 16 14 17.5 10 19C6 17.5 3 16 3 12.5V5.5L10 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="7" y="10.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 10.5V8.5C8 7.1 8.9 6.2 10 6.2C11.1 6.2 12 7.1 12 8.5V10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 8L6.5 11.5L13 5" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const FEATURES = [
  {
    icon: '⬡',
    title: 'Policy Engine',
    desc: 'Chaque action IA est évaluée contre vos politiques avant exécution. Autoriser, logger, exiger approbation, ou bloquer — vous décidez.',
  },
  {
    icon: '◷',
    title: 'Approbation Humaine',
    desc: 'Aucun email client ne part sans que vous l\'ayez vu. Queue d\'approbation claire, actions en un clic, expiry automatique.',
  },
  {
    icon: '◈',
    title: 'Audit Trail Immuable',
    desc: 'Journal complet de chaque action : qui, quoi, quand, quelle politique, pourquoi. Conforme Loi 25 / PIPEDA.',
  },
  {
    icon: '⬤',
    title: 'Bilingue FR/EN',
    desc: 'Détection automatique de la langue client. Français pour le Québec, anglais pour l\'Ontario. Ton configurable.',
  },
  {
    icon: '▣',
    title: 'Workspaces Isolés',
    desc: 'Chaque équipe opère dans son propre espace. Politiques, données, accès — tout est isolé et contrôlé.',
  },
  {
    icon: '◉',
    title: 'Hébergé au Canada',
    desc: 'Données stockées en ca-central-1. Souveraineté numérique. Aucune donnée ne quitte le Canada sans autorisation explicite.',
  },
]

const WORKFLOW = [
  'Admin importe le rapport AR',
  'L\'IA segmente par risque et langue',
  'OMNI génère les brouillons FR/EN',
  'Le Policy Engine évalue chaque action',
  'L\'approbateur valide avant envoi',
  'Audit trail complet enregistré',
]

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 48px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'rgba(8, 11, 15, 0.9)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30,
            height: 30,
            background: 'linear-gradient(135deg, #3fb950, #238636)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <ShieldIcon size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>BASTION</span>
          <span style={{
            display: 'inline-block',
            background: 'rgba(63,185,80,0.1)',
            border: '1px solid rgba(63,185,80,0.25)',
            borderRadius: 4,
            padding: '2px 7px',
            color: '#3fb950',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginLeft: 4,
          }}>
            BETA
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Collections Operator V1</span>
          <Link
            href="/login"
            style={{
              background: '#3fb950',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Accéder →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 48px 80px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(63,185,80,0.08)',
          border: '1px solid rgba(63,185,80,0.2)',
          borderRadius: 20,
          padding: '6px 14px',
          marginBottom: 36,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
          <span style={{ color: '#3fb950', fontSize: 12, fontWeight: 600 }}>Canada-first · Québec/Ontario · Conforme Loi 25</span>
        </div>

        <h1 style={{
          fontSize: 58,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          marginBottom: 24,
          background: 'linear-gradient(180deg, #e6edf3 0%, #8b949e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Déployez l'IA dans vos workflows.
          <br />Restez en contrôle.
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 18,
          lineHeight: 1.7,
          maxWidth: 620,
          margin: '0 auto 40px',
        }}>
          BASTION permet aux équipes canadiennes de déployer des opérateurs IA dans leurs
          workflows — avec politiques d'accès, approbations humaines, audit trail, et support
          bilingue FR/EN intégré.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#3fb950',
              color: '#fff',
              borderRadius: 10,
              padding: '13px 28px',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Accéder à la console →
          </Link>
          <a
            href="#workflow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              color: 'var(--text-primary)',
              borderRadius: 10,
              padding: '13px 28px',
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Voir le workflow
          </a>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '24px 48px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 24,
        maxWidth: 1000,
        margin: '0 auto',
      }}>
        {[
          { value: '100%', label: 'Approbation humaine avant envoi' },
          { value: '0', label: 'Actions sans audit trail' },
          { value: 'FR/EN', label: 'Bilingue natif' },
          { value: '🇨🇦', label: 'Données hébergées au Canada' },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 6 }}>
              {value}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Workflow section */}
      <section id="workflow" style={{ padding: '80px 48px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Collections Operator
          </p>
          <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 14 }}>
            De l'aging report à l'email envoyé
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
            Le workflow complet — de l'ingestion du rapport AR à l'approbation humaine et l'envoi sécurisé.
          </p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {WORKFLOW.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '18px 24px',
                borderBottom: i < WORKFLOW.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: i === 4 ? 'rgba(63,185,80,0.12)' : 'var(--surface-2)',
                border: `1px solid ${i === 4 ? 'rgba(63,185,80,0.3)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: i === 4 ? '#3fb950' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{
                color: i === 4 ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: i === 4 ? 600 : 400,
              }}>
                {step}
              </span>
              {i === 4 && (
                <span style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(63,185,80,0.1)',
                  border: '1px solid rgba(63,185,80,0.25)',
                  borderRadius: 5,
                  padding: '3px 8px',
                  color: '#3fb950',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  <CheckIcon /> Contrôle humain
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '40px 48px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 14 }}>
            Construit pour la confiance
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Pas un chatbot. Un système d'exécution sécurisé pour opérations réelles.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
        }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '22px 22px',
              }}
            >
              <div style={{
                fontSize: 20,
                color: '#3fb950',
                marginBottom: 12,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
                {f.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        margin: '0 48px 80px',
        maxWidth: 860,
        marginLeft: 'auto',
        marginRight: 'auto',
        background: 'linear-gradient(135deg, rgba(63,185,80,0.06) 0%, rgba(88,166,255,0.04) 100%)',
        border: '1px solid rgba(63,185,80,0.15)',
        borderRadius: 16,
        padding: '52px 48px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, #3fb950, #238636)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <ShieldIcon size={22} />
          </div>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12 }}>
          Prêt à déployer votre Collections Operator?
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          Importez votre rapport AR et laissez BASTION gérer les relances — sous votre contrôle total.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#3fb950',
            color: '#fff',
            borderRadius: 10,
            padding: '13px 28px',
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Accéder à la console →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22,
            height: 22,
            background: 'linear-gradient(135deg, #3fb950, #238636)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <ShieldIcon size={12} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>BASTION</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Powered by OMNI · Données hébergées au Canada · Conforme Loi 25 / PIPEDA
        </p>
        <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>
          Connexion →
        </Link>
      </footer>
    </div>
  )
}
