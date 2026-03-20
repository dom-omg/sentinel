'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import type { CSVRow } from '@/lib/types'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''
const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? ''

const EXPECTED_COLUMNS = ['client_name', 'amount_owing', 'days_overdue']

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState<{ ingested: number } | null>(null)

  function handleFile(file: File) {
    setError('')
    setSuccess(null)
    setFileName(file.name)

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? []
        const missing = EXPECTED_COLUMNS.filter(c => !headers.includes(c))
        if (missing.length > 0) {
          setError(`Colonnes manquantes: ${missing.join(', ')}`)
          return
        }
        const parsed = results.data.filter(r =>
          r.client_name && r.amount_owing && r.days_overdue
        )
        setRows(parsed)
      },
      error: () => {
        setError('Impossible de lire le fichier CSV')
      },
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleIngest() {
    if (!rows.length || !WORKSPACE_ID) return
    setUploading(true)
    setError('')

    try {
      const res = await fetch('/api/accounts/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: WORKSPACE_ID, org_id: ORG_ID, rows }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setSuccess({ ingested: data.ingested })
    } catch {
      setError('Erreur réseau')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Importer un rapport AR
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Uploadez votre rapport de comptes en souffrance en format CSV
        </p>
      </div>

      {/* Format hint */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 20,
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Format attendu (colonnes CSV)
        </p>
        <code style={{ color: '#58a6ff', fontSize: 12, display: 'block', fontFamily: 'monospace' }}>
          client_name, client_email, client_language, amount_owing, days_overdue, invoice_number
        </code>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
          Colonnes obligatoires: client_name, amount_owing, days_overdue · client_language: &quot;fr&quot; ou &quot;en&quot;
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${rows.length ? '#238636' : 'var(--border-2)'}`,
          borderRadius: 12,
          padding: '40px 28px',
          textAlign: 'center',
          cursor: 'pointer',
          background: rows.length ? 'rgba(35, 134, 54, 0.05)' : 'var(--surface)',
          transition: 'all 0.2s',
          marginBottom: 20,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {rows.length > 0 ? (
          <>
            <p style={{ color: '#3fb950', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {rows.length} comptes prêts à importer
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fileName}</p>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>
              Glissez votre fichier CSV ici
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>ou cliquez pour sélectionner</p>
          </>
        )}
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
              Aperçu (5 premières lignes)
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{rows.length} total</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Client', 'Montant dû', 'Jours', 'Email', 'Langue'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontSize: 12 }}>{row.client_name}</td>
                    <td style={{ padding: '9px 14px', color: '#3fb950', fontSize: 12, fontFamily: 'monospace' }}>
                      ${Number(String(row.amount_owing).replace(/[$,\s]/g, '')).toLocaleString('fr-CA')}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>
                      <span style={{
                        color: Number(row.days_overdue) > 90 ? '#f85149' : Number(row.days_overdue) > 60 ? '#d29922' : 'var(--text-secondary)',
                        fontWeight: Number(row.days_overdue) > 90 ? 600 : 400,
                      }}>
                        {row.days_overdue}j
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{row.client_email ?? '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{row.client_language ?? 'fr'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(248, 81, 73, 0.08)',
          border: '1px solid rgba(248, 81, 73, 0.2)',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#f85149',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {success ? (
        <div style={{
          background: 'rgba(63, 185, 80, 0.08)',
          border: '1px solid rgba(63, 185, 80, 0.2)',
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 16,
        }}>
          <p style={{ color: '#3fb950', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            {success.ingested} comptes importés avec succès
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            SENTINEL a segmenté et scoré chaque compte. Vous pouvez maintenant générer les drafts.
          </p>
          <button
            onClick={() => router.push('/dashboard/accounts')}
            style={{
              marginTop: 14,
              background: '#3fb950',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Voir les comptes →
          </button>
        </div>
      ) : (
        <button
          onClick={handleIngest}
          disabled={!rows.length || uploading}
          style={{
            background: rows.length ? '#3fb950' : 'var(--surface-2)',
            color: rows.length ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: rows.length && !uploading ? 'pointer' : 'not-allowed',
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? 'Import en cours...' : `Importer ${rows.length} compte${rows.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
