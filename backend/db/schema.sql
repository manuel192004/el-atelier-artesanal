CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  google_sub TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS registrants (
  registrant_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  city TEXT,
  occasion TEXT,
  interest TEXT,
  notes TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  source_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_generations (
  id BIGSERIAL PRIMARY KEY,
  registrant_id TEXT REFERENCES registrants(registrant_id) ON DELETE SET NULL,
  registrant_name TEXT,
  registrant_email TEXT,
  registrant_whatsapp TEXT,
  category TEXT,
  design_name TEXT,
  metal TEXT,
  gemstone TEXT,
  style TEXT,
  occasion TEXT,
  render_intent TEXT,
  camera_angle TEXT,
  silhouette TEXT,
  detail_level TEXT,
  background_mood TEXT,
  prompt TEXT,
  prompt_used TEXT,
  model TEXT,
  provider TEXT,
  source_ip TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id BIGSERIAL PRIMARY KEY,
  quote_id TEXT UNIQUE NOT NULL,
  registrant_id TEXT REFERENCES registrants(registrant_id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  preferred_contact TEXT,
  budget TEXT,
  timeline TEXT,
  notes TEXT,
  prompt TEXT,
  category TEXT,
  design_name TEXT,
  preferred_metal TEXT,
  preferred_stone TEXT,
  style TEXT,
  occasion TEXT,
  reference TEXT,
  has_generated_preview BOOLEAN NOT NULL DEFAULT FALSE,
  source_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  contact_id TEXT PRIMARY KEY,
  contact_key TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  city TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'lead',
  segment TEXT,
  tags TEXT NOT NULL DEFAULT '',
  notes TEXT,
  last_touch_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_interactions (
  interaction_id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES crm_contacts(contact_id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'make',
  external_ref TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_transactions (
  transaction_id TEXT PRIMARY KEY,
  transaction_key TEXT UNIQUE NOT NULL,
  contact_id TEXT REFERENCES crm_contacts(contact_id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'COP',
  channel TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'posted',
  source TEXT NOT NULL DEFAULT 'manual',
  external_ref TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  task_id TEXT PRIMARY KEY,
  task_key TEXT UNIQUE NOT NULL,
  contact_id TEXT REFERENCES crm_contacts(contact_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  source TEXT NOT NULL DEFAULT 'trello',
  external_ref TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS automation_events (
  event_id TEXT PRIMARY KEY,
  event_key TEXT UNIQUE NOT NULL,
  pipeline TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'make',
  status TEXT NOT NULL DEFAULT 'queued',
  contact_id TEXT REFERENCES crm_contacts(contact_id) ON DELETE SET NULL,
  transaction_id TEXT REFERENCES crm_transactions(transaction_id) ON DELETE SET NULL,
  task_id TEXT REFERENCES crm_tasks(task_id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linktree_links (
  link_id TEXT PRIMARY KEY,
  link_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_registrants_email ON registrants(email);
CREATE INDEX IF NOT EXISTS idx_generations_registrant_id ON design_generations(registrant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_registrant_id ON quote_requests(registrant_id);
DROP INDEX IF EXISTS idx_crm_contacts_email_lower;
DROP INDEX IF EXISTS idx_crm_contacts_whatsapp_lower;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email_lower ON crm_contacts ((LOWER(email))) WHERE email <> '';
CREATE INDEX IF NOT EXISTS idx_crm_contacts_whatsapp_lower ON crm_contacts ((LOWER(whatsapp))) WHERE whatsapp <> '';
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_transactions_occurred_at ON crm_transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_transactions_contact_id ON crm_transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_automation_events_created_at ON automation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linktree_links_sort_order ON linktree_links(sort_order);
