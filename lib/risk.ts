import type { ARBucket, RiskLevel, Language } from './types'

export function computeBucket(daysOverdue: number): ARBucket {
  if (daysOverdue <= 30) return '30'
  if (daysOverdue <= 60) return '60'
  if (daysOverdue <= 90) return '90'
  return '120+'
}

export function computeRiskScore(amount: number, days: number): number {
  let score = 0

  // Days weight (0-50 pts)
  if (days <= 30) score += 10
  else if (days <= 60) score += 25
  else if (days <= 90) score += 40
  else score += 50

  // Amount weight (0-50 pts)
  if (amount < 500) score += 5
  else if (amount < 2000) score += 15
  else if (amount < 10000) score += 30
  else if (amount < 50000) score += 42
  else score += 50

  return Math.min(score, 100)
}

export function computeRiskLevel(score: number): RiskLevel {
  if (score < 20) return 'low'
  if (score < 50) return 'medium'
  if (score < 75) return 'high'
  return 'critical'
}

export function detectLanguage(email?: string, name?: string): Language {
  if (!email && !name) return 'fr'

  const frPatterns = [
    /\.(qc|qc\.ca)$/i,
    /@.*\.(ca)$/i,
  ]

  const frNamePatterns = [
    /é|è|ê|à|â|ô|û|î|ù|ç/i,
  ]

  if (name && frNamePatterns.some(p => p.test(name))) return 'fr'
  if (email && frPatterns.some(p => p.test(email))) return 'fr'

  return 'fr' // default FR for Quebec-first
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'text-emerald-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
}

export const RISK_BG: Record<RiskLevel, string> = {
  low: 'bg-emerald-400/10 border-emerald-400/20',
  medium: 'bg-yellow-400/10 border-yellow-400/20',
  high: 'bg-orange-400/10 border-orange-400/20',
  critical: 'bg-red-400/10 border-red-400/20',
}

export const RISK_LABELS: Record<RiskLevel, { fr: string; en: string }> = {
  low: { fr: 'Faible', en: 'Low' },
  medium: { fr: 'Moyen', en: 'Medium' },
  high: { fr: 'Élevé', en: 'High' },
  critical: { fr: 'Critique', en: 'Critical' },
}
