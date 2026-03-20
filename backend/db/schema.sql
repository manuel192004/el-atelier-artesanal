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

CREATE INDEX IF NOT EXISTS idx_registrants_email ON registrants(email);
CREATE INDEX IF NOT EXISTS idx_generations_registrant_id ON design_generations(registrant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_registrant_id ON quote_requests(registrant_id);
