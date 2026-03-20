/**
 * SENTINEL — Seed script
 * Creates demo org + workspace + admin user + sample AR accounts
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEMO_PASSWORD = 'bastion2026'
const passwordHash = crypto.createHash('sha256').update(DEMO_PASSWORD).digest('hex')

async function seed() {
  console.log('🔵 BASTION Seed — démarrage\n')

  // 1. Organization
  console.log('📦 Création de l\'organisation...')
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: 'QreativeLab Demo',
      slug: 'qreativelab-demo',
      language_default: 'fr',
      tone: 'formal',
      plan: 'team',
    })
    .select()
    .single()

  if (orgErr) { console.error('❌ Org:', orgErr.message); process.exit(1) }
  console.log(`   ✅ Org: ${org.name} (${org.id})`)

  // 2. Workspace
  console.log('📁 Création du workspace...')
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      org_id: org.id,
      name: 'Collections QC',
      language_default: 'fr',
    })
    .select()
    .single()

  if (wsErr) { console.error('❌ Workspace:', wsErr.message); process.exit(1) }
  console.log(`   ✅ Workspace: ${ws.name} (${ws.id})`)

  // 3. Admin user
  console.log('👤 Création de l\'utilisateur admin...')
  const { data: adminUser, error: adminErr } = await supabase
    .from('users')
    .insert({
      org_id: org.id,
      email: 'admin@sentinel.demo',
      name: 'Marie Tremblay',
      role: 'admin',
      language: 'fr',
      password_hash: passwordHash,
    })
    .select()
    .single()

  if (adminErr) { console.error('❌ Admin user:', adminErr.message); process.exit(1) }
  console.log(`   ✅ Admin: ${adminUser.email} / mot de passe: ${DEMO_PASSWORD}`)

  // 4. Approver user
  const { data: approverUser } = await supabase
    .from('users')
    .insert({
      org_id: org.id,
      email: 'approbateur@sentinel.demo',
      name: 'Jean-François Bergeron',
      role: 'approver',
      language: 'fr',
      password_hash: passwordHash,
    })
    .select()
    .single()
  console.log(`   ✅ Approbateur: ${approverUser?.email}`)

  // 5. Workspace members
  await supabase.from('workspace_members').insert([
    { workspace_id: ws.id, user_id: adminUser.id, role: 'admin' },
    { workspace_id: ws.id, user_id: approverUser!.id, role: 'approver' },
  ])

  // 6. System policies for this workspace
  console.log('📋 Insertion des politiques système...')
  const policies = [
    {
      workspace_id: ws.id,
      name: 'Lecture comptes autorisée',
      description: "L'IA peut lire les comptes AR",
      condition_action: 'read_accounts',
      outcome: 'allow',
      priority: 10,
      is_active: true,
      is_system: true,
    },
    {
      workspace_id: ws.id,
      name: 'Génération de drafts autorisée',
      description: "L'IA peut générer des drafts",
      condition_action: 'generate_draft',
      outcome: 'allow_with_log',
      priority: 20,
      is_active: true,
      is_system: true,
    },
    {
      workspace_id: ws.id,
      name: 'Envoi soumis à approbation',
      description: "Aucun email ne part sans approbation humaine",
      condition_action: 'send_email',
      outcome: 'require_approval',
      approver_role: 'approver',
      priority: 30,
      is_active: true,
      is_system: true,
    },
    {
      workspace_id: ws.id,
      name: 'Comptes critiques → approbation admin',
      description: "Les comptes critiques requièrent un admin",
      condition_action: 'send_email',
      condition_risk_level: 'critical',
      outcome: 'require_approval',
      approver_role: 'admin',
      priority: 25,
      is_active: true,
      is_system: true,
    },
    {
      workspace_id: ws.id,
      name: 'Export bloqué',
      description: "L'IA ne peut pas exporter la liste des comptes",
      condition_action: 'export_accounts',
      outcome: 'block',
      priority: 5,
      is_active: true,
      is_system: true,
    },
    {
      workspace_id: ws.id,
      name: 'Suppression bloquée',
      description: "L'IA ne peut pas supprimer de données",
      condition_action: 'delete',
      outcome: 'block',
      priority: 5,
      is_active: true,
      is_system: true,
    },
  ]
  await supabase.from('policies').insert(policies)
  console.log(`   ✅ ${policies.length} politiques insérées`)

  // 7. Sample AR accounts (realistic QC construction / services companies)
  console.log('📊 Insertion des comptes AR de démonstration...')
  const sampleAccounts = [
    { client_name: 'Construction Larivière Inc.', client_email: 'comptabilite@lariviere.ca', client_language: 'fr', amount_owing: 14750.00, days_overdue: 67, invoice_number: '2024-0892' },
    { client_name: 'Gestion Immobilière ABC', client_email: 'info@gestionabc.ca', client_language: 'fr', amount_owing: 8200.00, days_overdue: 45, invoice_number: '2024-0901' },
    { client_name: 'Clinique Santé Montréal', client_email: 'admin@cliniquesante.ca', client_language: 'fr', amount_owing: 3450.00, days_overdue: 28, invoice_number: '2024-0915' },
    { client_name: 'Toitures Expert Plus', client_email: null, client_language: 'fr', amount_owing: 22100.00, days_overdue: 95, invoice_number: '2024-0845' },
    { client_name: 'Électrique Gagnon & Fils', client_email: 'facturation@electriquegagnon.ca', client_language: 'fr', amount_owing: 6800.00, days_overdue: 32, invoice_number: '2024-0908' },
    { client_name: 'Plomberie Beauchamp', client_email: null, client_language: 'fr', amount_owing: 1200.00, days_overdue: 15, invoice_number: '2024-0922' },
    { client_name: 'Ottawa Property Group', client_email: 'billing@ottawapg.com', client_language: 'en', amount_owing: 31500.00, days_overdue: 128, invoice_number: '2024-0811' },
    { client_name: 'Toronto Tech Solutions', client_email: 'accounts@torontotech.ca', client_language: 'en', amount_owing: 9900.00, days_overdue: 54, invoice_number: '2024-0887' },
    { client_name: 'Menuiserie Gendron', client_email: 'paul@menuiseriegendron.ca', client_language: 'fr', amount_owing: 4100.00, days_overdue: 71, invoice_number: '2024-0878' },
    { client_name: 'Excavation Mercier', client_email: null, client_language: 'fr', amount_owing: 47800.00, days_overdue: 142, invoice_number: '2024-0799' },
    { client_name: 'Services Conseil Perreault', client_email: 'facturation@perreaultconseil.ca', client_language: 'fr', amount_owing: 5600.00, days_overdue: 38, invoice_number: '2024-0899' },
    { client_name: 'Paysagement Vert Nature', client_email: 'info@vertnature.ca', client_language: 'fr', amount_owing: 2300.00, days_overdue: 22, invoice_number: '2024-0918' },
  ]

  function computeBucket(days: number): string {
    if (days <= 30) return '30'
    if (days <= 60) return '60'
    if (days <= 90) return '90'
    return '120+'
  }

  function computeRiskScore(amount: number, days: number): number {
    let score = 0
    if (days <= 30) score += 10
    else if (days <= 60) score += 25
    else if (days <= 90) score += 40
    else score += 50
    if (amount < 500) score += 5
    else if (amount < 2000) score += 15
    else if (amount < 10000) score += 30
    else if (amount < 50000) score += 42
    else score += 50
    return Math.min(score, 100)
  }

  function computeRiskLevel(score: number): string {
    if (score < 20) return 'low'
    if (score < 50) return 'medium'
    if (score < 75) return 'high'
    return 'critical'
  }

  const accountsToInsert = sampleAccounts.map(a => {
    const score = computeRiskScore(a.amount_owing, a.days_overdue)
    return {
      workspace_id: ws.id,
      ...a,
      bucket: computeBucket(a.days_overdue),
      risk_score: score,
      risk_level: computeRiskLevel(score),
      status: 'open',
      source: 'csv',
    }
  })

  const { error: accErr } = await supabase.from('ar_accounts').insert(accountsToInsert)
  if (accErr) { console.error('❌ Accounts:', accErr.message); process.exit(1) }
  console.log(`   ✅ ${sampleAccounts.length} comptes AR insérés`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ BASTION seed complété!\n')
  console.log('📋 Variables à ajouter dans .env.local:')
  console.log(`   NEXT_PUBLIC_DEFAULT_WORKSPACE_ID=${ws.id}`)
  console.log(`   NEXT_PUBLIC_DEFAULT_ORG_ID=${org.id}`)
  console.log('\n🔐 Connexion demo:')
  console.log(`   Admin:       admin@sentinel.demo / ${DEMO_PASSWORD}`)
  console.log(`   Approbateur: approbateur@sentinel.demo / ${DEMO_PASSWORD}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
