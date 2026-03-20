'use client'

import { useEffect, useState, useCallback } from 'react'
import type { AuditEntry } from '@/lib/types'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  account_ingested:    { label: 'Comptes importés',        color: '#58a6ff', icon: '↓' },
  account_segmented:   { label: 'Segmentation',            color: '#8b949e', icon: '◈' },
  draft_generated:     { label: 'Draft généré',            color: '#58a6ff', icon: '✦' },
  policy_evaluated:    { label: 'Politique évaluée',       color: '#8b949e', icon: '⬡' },
  approval_requested:  { label: 'Approbation demandée',    color: '#e3b341', icon: '◷' },
  approved:            { label: 'Approuvé',                color: '#3fb950', icon: '✓' },
  rejected:            { label: 'Rejeté',                  color: '#f85149', icon: '✗' },
  escalated:           { label: 'Escaladé',                color: '#d29922', icon: '⬆' },
  email_sent:          { label: 'Email envoyé',            color: '#3fb950', icon: '→' },
  blocked:             { label: 'Bloqué',                  color: '#f85149', icon: '⊘' },
  emergency_stop:      { label: 'Arrêt d\'urgence',        color: '#f85149', icon: '■' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `il y a ${days}j`
}

function DetailRow({ k, v }: { k: string; v: unknown }) {
  const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 3 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 140, fontFamily: 'monospace' }}>{k}</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{val}</span>
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = EVENT_CONFIG[entry.event_type] ?? { label: entry.event_type, color: '#8b949e', icon: '·' }
  const hasDetail = Object.keys(entry.detail ?? {}).length > 0

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.1s',
    }}>
      <div
        onClick={() => hasDetail && setExpanded(e => !e)}
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 140px 140px 100px',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          cursor: hasDetail ? 'pointer' : 'default',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: `${cfg.color}18`,
          border: `1px solid ${cfg.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: cfg.color,
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {cfg.icon}
        </div>

        {/* Event + actor */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
              {cfg.label}
            </span>
            {entry.policy_outcome && (
              <span style={{
                display: 'inline-block',
                background: entry.policy_outcome === 'block' ? 'rgba(248,81,73,0.1)' : 'rgba(63,185,80,0.1)',
                border: `1px solid ${entry.policy_outcome === 'block' ? 'rgba(248,81,73,0.3)' : 'rgba(63,185,80,0.3)'}`,
                borderRadius: 4,
                padding: '1px 6px',
                color: entry.policy_outcome === 'block' ? '#f85149' : '#3fb950',
                fontSize: 10,
                fontWeight: 600,
              }}>
                {entry.policy_outcome}
              </span>
            )}
          </div>
          {entry.actor_name && (
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {entry.actor_type === 'omni' ? 'OMNI' : entry.actor_name}
            </span>
          )}
        </div>

        {/* Account detail */}
        <div>
          {entry.detail?.client_name ? (
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {String(entry.detail.client_name)}
            </span>
          ) : entry.detail?.count !== undefined ? (
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {String(entry.detail.count)} compte{Number(entry.detail.count) > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        {/* Actor type badge */}
        <div>
          <span style={{
            display: 'inline-block',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '2px 7px',
            color: entry.actor_type === 'omni' ? '#58a6ff' : entry.actor_type === 'system' ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            {entry.actor_type}
          </span>
        </div>

        {/* Time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {timeAgo(entry.created_at)}
          </span>
          {hasDetail && (
            <span style={{ color: 'var(--text-muted)', fontSize: 10, transform: expanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div style={{
          padding: '8px 16px 12px 56px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border)',
        }}>
          {Object.entries(entry.detail).map(([k, v]) => (
            <DetailRow key={k} k={k} v={v} />
          ))}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            <DetailRow k="id" v={entry.id} />
            <DetailRow k="created_at" v={new Date(entry.created_at).toLocaleString('fr-CA')} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  const loadEntries = useCallback(async () => {
    if (!WORKSPACE_ID) { setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams({
      workspace_id: WORKSPACE_ID,
      limit: String(LIMIT),
      offset: String(offset),
    })
    const res = await fetch(`/api/audit?${params}`)
    const data = await res.json()
    setEntries(data.entries ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [offset])

  useEffect(() => { loadEntries() }, [loadEntries])

  const filtered = filter === 'all' ? entries : entries.filter(e => e.event_type === filter)

  const FILTER_OPTIONS = [
    { key: 'all', label: 'Tous' },
    { key: 'email_sent', label: 'Envoyés' },
    { key: 'approved', label: 'Approuvés' },
    { key: 'rejected', label: 'Rejetés' },
    { key: 'blocked', label: 'Bloqués' },
    { key: 'draft_generated', label: 'Drafts' },
  ]

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Audit Trail
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Journal immuable de toutes les actions — {total} entrée{total > 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`/api/audit/export?workspace_id=${WORKSPACE_ID}`}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              padding: '7px 14px',
              color: 'var(--text-secondary)',
              fontSize: 12,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            ↓ Exporter CSV
          </a>
          <button
            onClick={loadEntries}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              padding: '7px 14px',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? 'var(--surface-2)' : 'transparent',
              border: `1px solid ${filter === f.key ? 'var(--border-2)' : 'transparent'}`,
              borderRadius: 7,
              padding: '5px 12px',
              color: filter === f.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: filter === f.key ? 500 : 400,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 140px 140px 100px',
          gap: 12,
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {['', 'Événement', 'Compte', 'Acteur', 'Quand'].map((h, i) => (
            <div key={i} style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: i === 4 ? 'right' : 'left',
            }}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 6 }}>Aucune entrée</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Les actions de l'opérateur apparaîtront ici en temps réel.
            </p>
          </div>
        ) : (
          filtered.map(entry => <AuditRow key={entry.id} entry={entry} />)
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            disabled={offset === 0}
            onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: '6px 14px',
              color: offset === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 12,
              cursor: offset === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Précédent
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, padding: '6px 0', alignSelf: 'center' }}>
            {offset + 1}–{Math.min(offset + LIMIT, total)} / {total}
          </span>
          <button
            disabled={offset + LIMIT >= total}
            onClick={() => setOffset(o => o + LIMIT)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: '6px 14px',
              color: offset + LIMIT >= total ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 12,
              cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer',
            }}
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Immutability notice */}
      <div style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--text-muted)',
        fontSize: 11,
      }}>
        <span style={{ color: '#3fb950' }}>⬡</span>
        Journal immuable — aucune entrée ne peut être modifiée ou supprimée. Conforme Loi 25 / PIPEDA.
      </div>
    </div>
  )
}
