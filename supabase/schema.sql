-- SENTINEL V1 — Schema SQL complet
-- Run this in Supabase SQL editor

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  language_default TEXT DEFAULT 'fr' CHECK (language_default IN ('fr','en')),
  tone TEXT DEFAULT 'formal' CHECK (tone IN ('formal','informal')),
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter','team','studio','enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language_default TEXT DEFAULT 'fr' CHECK (language_default IN ('fr','en')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','approver','viewer')),
  language TEXT DEFAULT 'fr' CHECK (language IN ('fr','en')),
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','approver','viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

-- CONNECTORS
CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('quickbooks','xero','gmail','outlook','csv')),
  name TEXT NOT NULL,
  credentials JSONB,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AR ACCOUNTS
CREATE TABLE IF NOT EXISTS ar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  external_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_language TEXT DEFAULT 'fr' CHECK (client_language IN ('fr','en')),
  amount_owing NUMERIC(12,2) NOT NULL,
  days_overdue INTEGER NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('30','60','90','120+')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  risk_score INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','draft_ready','pending_approval','sent','resolved','escalated','blocked')),
  source TEXT NOT NULL DEFAULT 'csv' CHECK (source IN ('quickbooks','xero','csv','manual')),
  invoice_number TEXT,
  notes TEXT,
  raw_data JSONB,
  last_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- POLICIES
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  condition_action TEXT NOT NULL,
  condition_risk_level TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('allow','allow_with_log','require_approval','block')),
  approver_role TEXT CHECK (approver_role IN ('admin','approver')),
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DRAFTS
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ar_accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  sequence_number INTEGER DEFAULT 1,
  language TEXT NOT NULL CHECK (language IN ('fr','en')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  edited_body TEXT,
  generated_by TEXT DEFAULT 'omni',
  risk_level TEXT NOT NULL,
  policy_id UUID REFERENCES policies(id),
  policy_outcome TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','pending_approval','approved','rejected','sent','edited','blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- APPROVAL REQUESTS
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES ar_accounts(id),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated','expired')),
  decision_at TIMESTAMPTZ,
  decision_by UUID REFERENCES users(id),
  reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '48 hours',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AUDIT LOG (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  org_id UUID NOT NULL,
  account_id UUID,
  draft_id UUID,
  approval_id UUID,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system','omni','user')),
  actor_id UUID,
  actor_name TEXT,
  policy_id UUID,
  policy_outcome TEXT,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent updates and deletes on audit_log
CREATE OR REPLACE RULE audit_log_no_update AS
  ON UPDATE TO audit_log DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_log_no_delete AS
  ON DELETE TO audit_log DO INSTEAD NOTHING;

-- SESSIONS (simple JWT tracking)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_ar_accounts_workspace ON ar_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ar_accounts_status ON ar_accounts(status);
CREATE INDEX IF NOT EXISTS idx_ar_accounts_bucket ON ar_accounts(bucket);
CREATE INDEX IF NOT EXISTS idx_drafts_account ON drafts(account_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_workspace ON approval_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- Function: auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ar_accounts_updated_at
  BEFORE UPDATE ON ar_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
