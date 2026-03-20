import Anthropic from '@anthropic-ai/sdk'
import type { ARAccount, Language } from '../types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface GeneratedDraft {
  subject: string
  body: string
  language: Language
  sequence_number: number
}

function getSequenceNumber(daysOverdue: number): number {
  if (daysOverdue <= 35) return 1
  if (daysOverdue <= 65) return 2
  return 3
}

function buildPrompt(account: ARAccount, lang: Language, seq: number): string {
  const currency = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(account.amount_owing)
  const seqLabels = {
    fr: ['premier rappel', 'deuxième rappel', 'avis d\'escalade'],
    en: ['first reminder', 'second reminder', 'escalation notice'],
  }
  const seqLabel = lang === 'fr' ? seqLabels.fr[seq - 1] : seqLabels.en[seq - 1]

  if (lang === 'fr') {
    return `Tu es un assistant de recouvrement professionnel pour une entreprise canadienne.

Rédige un email de ${seqLabel} en français formel pour le compte suivant :
- Client : ${account.client_name}
- Montant dû : ${currency}
- Jours en souffrance : ${account.days_overdue} jours
${account.invoice_number ? `- Numéro de facture : ${account.invoice_number}` : ''}

Règles absolues :
- Ton professionnel, ferme mais respectueux
- Ne jamais menacer ou employer un ton agressif
- Rappeler le montant exact et la durée de retard
- Proposer de contacter pour régler la situation
- Format : sujet sur la première ligne (préfixé par "SUJET:"), puis corps complet de l'email
- Signer "L'équipe de facturation"
- Maximum 150 mots pour le corps`
  }

  return `You are a professional collections assistant for a Canadian business.

Write a ${seqLabel} collection email in formal English for the following account:
- Client: ${account.client_name}
- Amount owing: ${currency}
- Days overdue: ${account.days_overdue} days
${account.invoice_number ? `- Invoice number: ${account.invoice_number}` : ''}

Absolute rules:
- Professional tone, firm but respectful
- Never threaten or use aggressive language
- State the exact amount and overdue duration
- Offer to connect to resolve the matter
- Format: subject on first line (prefixed with "SUBJECT:"), then full email body
- Sign as "The Billing Team"
- Maximum 150 words for the body`
}

export async function generateDraft(account: ARAccount): Promise<GeneratedDraft> {
  const lang = account.client_language as Language
  const seq = getSequenceNumber(account.days_overdue)
  const prompt = buildPrompt(account, lang, seq)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const lines = raw.trim().split('\n')

  const subjectLine = lines.find(l =>
    l.startsWith('SUJET:') || l.startsWith('SUBJECT:')
  ) ?? ''
  const subject = subjectLine.replace(/^(SUJET:|SUBJECT:)\s*/i, '').trim()

  const bodyStart = lines.findIndex(l =>
    l.startsWith('SUJET:') || l.startsWith('SUBJECT:')
  )
  const body = lines.slice(bodyStart + 1).join('\n').trim()

  return { subject, body, language: lang, sequence_number: seq }
}

export async function generateBulkDrafts(
  accounts: ARAccount[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, GeneratedDraft>> {
  const results = new Map<string, GeneratedDraft>()

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]
    try {
      const draft = await generateDraft(account)
      results.set(account.id, draft)
    } catch (err) {
      console.error(`[OMNI] Failed to generate draft for account ${account.id}:`, err)
    }
    onProgress?.(i + 1, accounts.length)
  }

  return results
}
