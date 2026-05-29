const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const DATABASE_SSL = String(process.env.DATABASE_SSL || 'false').trim().toLowerCase() === 'true';
const DATA_DIR = path.join(__dirname, '..', 'data');
const OPERATIONS_CONTACTS_FILE = path.join(DATA_DIR, 'crm-contacts.ndjson');
const OPERATIONS_INTERACTIONS_FILE = path.join(DATA_DIR, 'crm-interactions.ndjson');
const OPERATIONS_TRANSACTIONS_FILE = path.join(DATA_DIR, 'crm-transactions.ndjson');
const OPERATIONS_TASKS_FILE = path.join(DATA_DIR, 'crm-tasks.ndjson');
const OPERATIONS_EVENTS_FILE = path.join(DATA_DIR, 'automation-events.ndjson');
const OPERATIONS_LINKTREE_FILE = path.join(DATA_DIR, 'linktree-links.ndjson');

let pool = null;
let databaseReady = false;
let databaseLastError = '';

const schemaStatements = [
  `
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
  `,
  `
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
  `,
  `
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
  `,
  `
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
      status TEXT NOT NULL DEFAULT 'received',
      source_ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS appointment_requests (
      id BIGSERIAL PRIMARY KEY,
      appointment_id TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      preferred_date DATE NOT NULL,
      preferred_slot TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      source_ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS assistant_memories (
      user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      occasion TEXT NOT NULL DEFAULT '',
      jewelry_type TEXT NOT NULL DEFAULT '',
      budget TEXT NOT NULL DEFAULT '',
      style TEXT NOT NULL DEFAULT '',
      last_intent TEXT NOT NULL DEFAULT '',
      last_collection_slug TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
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
  `,
  `
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
  `,
  `
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
  `,
  `
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
  `,
  `
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
  `,
  `
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
  `,
  "ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'received';",
  'ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;',
  'ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;',
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS metal TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS gemstone TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS ring_size TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS recipient TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS deadline TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS budget_range TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS last_product_reference TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS valuation_summary TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';",
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users ((LOWER(email)));',
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL AND google_sub <> '';",
  'CREATE INDEX IF NOT EXISTS idx_registrants_email ON registrants(email);',
  'CREATE INDEX IF NOT EXISTS idx_generations_registrant_id ON design_generations(registrant_id);',
  'CREATE INDEX IF NOT EXISTS idx_quotes_registrant_id ON quote_requests(registrant_id);',
  'CREATE INDEX IF NOT EXISTS idx_appointments_preferred_date ON appointment_requests(preferred_date);',
  'DROP INDEX IF EXISTS idx_crm_contacts_email_lower;',
  'DROP INDEX IF EXISTS idx_crm_contacts_whatsapp_lower;',
  "CREATE INDEX IF NOT EXISTS idx_crm_contacts_email_lower ON crm_contacts ((LOWER(email))) WHERE email <> '';",
  "CREATE INDEX IF NOT EXISTS idx_crm_contacts_whatsapp_lower ON crm_contacts ((LOWER(whatsapp))) WHERE whatsapp <> '';",
  'CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status);',
  'CREATE INDEX IF NOT EXISTS idx_crm_transactions_occurred_at ON crm_transactions(occurred_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_crm_transactions_contact_id ON crm_transactions(contact_id);',
  'CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);',
  'CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);',
  'CREATE INDEX IF NOT EXISTS idx_automation_events_created_at ON automation_events(created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_linktree_links_sort_order ON linktree_links(sort_order);',
];

function buildUserId() {
  return `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    whatsapp: row.whatsapp,
    passwordHash: row.password_hash,
    googleSub: row.google_sub || '',
    role: row.role || 'customer',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function isDatabaseConfigured() {
  return Boolean(DATABASE_URL);
}

function getPool() {
  if (!pool && isDatabaseConfigured()) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

function ensureOperationsStoreFile(filePath) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
}

function ensureOperationsStore() {
  [
    OPERATIONS_CONTACTS_FILE,
    OPERATIONS_INTERACTIONS_FILE,
    OPERATIONS_TRANSACTIONS_FILE,
    OPERATIONS_TASKS_FILE,
    OPERATIONS_EVENTS_FILE,
    OPERATIONS_LINKTREE_FILE,
  ].forEach(ensureOperationsStoreFile);
}

async function readOperationsRecords(filePath) {
  ensureOperationsStoreFile(filePath);
  const raw = await fs.promises.readFile(filePath, 'utf8');

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeOperationsRecords(filePath, records) {
  ensureOperationsStoreFile(filePath);
  const serialized = records.map((record) => JSON.stringify(record)).join('\n');
  await fs.promises.writeFile(filePath, serialized ? `${serialized}\n` : '', 'utf8');
}

async function initDatabase() {
  if (!isDatabaseConfigured()) {
    databaseReady = false;
    databaseLastError = '';
    return;
  }

  try {
    const currentPool = getPool();
    await currentPool.query('SELECT 1');

    for (const statement of schemaStatements) {
      await currentPool.query(statement);
    }

    databaseReady = true;
    databaseLastError = '';
  } catch (error) {
    databaseReady = false;
    databaseLastError = error.message || 'No se pudo inicializar PostgreSQL.';
    console.error('[database-init-error]', error);
  }
}

function getDatabaseStatus() {
  return {
    configured: isDatabaseConfigured(),
    ready: databaseReady,
    lastError: databaseLastError,
  };
}

async function findUserByEmailInDatabase(email) {
  if (!databaseReady) {
    return null;
  }

  const { rows } = await getPool().query(
    `
      SELECT user_id, full_name, email, whatsapp, password_hash, google_sub, role, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [String(email || '').trim()],
  );

  return mapUserRow(rows[0]);
}

async function findUserByGoogleSubInDatabase(googleSub) {
  if (!databaseReady) {
    return null;
  }

  const { rows } = await getPool().query(
    `
      SELECT user_id, full_name, email, whatsapp, password_hash, google_sub, role, created_at, updated_at
      FROM users
      WHERE google_sub = $1
      LIMIT 1
    `,
    [String(googleSub || '').trim()],
  );

  return mapUserRow(rows[0]);
}

async function findUserByIdInDatabase(userId) {
  if (!databaseReady) {
    return null;
  }

  const { rows } = await getPool().query(
    `
      SELECT user_id, full_name, email, whatsapp, password_hash, google_sub, role, created_at, updated_at
      FROM users
      WHERE user_id = $1
      LIMIT 1
    `,
    [String(userId || '').trim()],
  );

  return mapUserRow(rows[0]);
}

async function upsertUserInDatabase(record) {
  if (!databaseReady) {
    return null;
  }

  const userId = String(record.userId || '').trim() || buildUserId();
  const createdAt = record.createdAt || new Date().toISOString();
  const updatedAt = record.updatedAt || null;
  const googleSub = String(record.googleSub || '').trim();

  const { rows } = await getPool().query(
    `
      INSERT INTO users (
        user_id,
        full_name,
        email,
        whatsapp,
        password_hash,
        google_sub,
        role,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        whatsapp = EXCLUDED.whatsapp,
        password_hash = EXCLUDED.password_hash,
        google_sub = EXCLUDED.google_sub,
        role = EXCLUDED.role,
        updated_at = COALESCE(EXCLUDED.updated_at, NOW())
      RETURNING user_id, full_name, email, whatsapp, password_hash, google_sub, role, created_at, updated_at
    `,
    [
      userId,
      record.fullName,
      record.email,
      record.whatsapp || '',
      record.passwordHash,
      googleSub || null,
      String(record.role || 'customer').trim() || 'customer',
      createdAt,
      updatedAt,
    ],
  );

  return mapUserRow(rows[0]);
}

async function persistRegistrationToDatabase(record) {
  if (!databaseReady) {
    return false;
  }

  await getPool().query(
    `
      INSERT INTO registrants (
        registrant_id,
        full_name,
        email,
        whatsapp,
        city,
        occasion,
        interest,
        notes,
        marketing_consent,
        source_ip,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (registrant_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        whatsapp = EXCLUDED.whatsapp,
        city = EXCLUDED.city,
        occasion = EXCLUDED.occasion,
        interest = EXCLUDED.interest,
        notes = EXCLUDED.notes,
        marketing_consent = EXCLUDED.marketing_consent,
        source_ip = EXCLUDED.source_ip
    `,
    [
      record.registrantId,
      record.fullName,
      record.email,
      record.whatsapp,
      record.city,
      record.occasion,
      record.interest,
      record.notes,
      record.marketingConsent,
      record.sourceIp,
      record.createdAt,
    ],
  );

  return true;
}

async function persistGenerationToDatabase(record) {
  if (!databaseReady) {
    return false;
  }

  await getPool().query(
    `
      INSERT INTO design_generations (
        registrant_id,
        registrant_name,
        registrant_email,
        registrant_whatsapp,
        category,
        design_name,
        metal,
        gemstone,
        style,
        occasion,
        render_intent,
        camera_angle,
        silhouette,
        detail_level,
        background_mood,
        prompt,
        prompt_used,
        model,
        provider,
        source_ip,
        generated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    `,
    [
      record.registrantId,
      record.registrantName,
      record.registrantEmail,
      record.registrantWhatsapp,
      record.category,
      record.designName,
      record.metal,
      record.gemstone,
      record.style,
      record.occasion,
      record.renderIntent,
      record.cameraAngle,
      record.silhouette,
      record.detailLevel,
      record.backgroundMood,
      record.prompt,
      record.promptUsed,
      record.model,
      record.provider,
      record.sourceIp,
      record.generatedAt,
    ],
  );

  return true;
}

async function persistQuoteToDatabase(record) {
  if (!databaseReady) {
    return false;
  }

  await getPool().query(
    `
      INSERT INTO quote_requests (
        quote_id,
        registrant_id,
        client_name,
        email,
        whatsapp,
        preferred_contact,
        budget,
        timeline,
        notes,
        prompt,
        category,
        design_name,
        preferred_metal,
        preferred_stone,
        style,
        occasion,
        reference,
        has_generated_preview,
        status,
        source_ip,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      ON CONFLICT (quote_id) DO NOTHING
    `,
    [
      record.quoteId,
      record.registrantId || null,
      record.clientName,
      record.email,
      record.whatsapp,
      record.preferredContact,
      record.budget,
      record.timeline,
      record.notes,
      record.prompt,
      record.category,
      record.designName,
      record.preferredMetal,
      record.preferredStone,
      record.style,
      record.occasion,
      record.reference,
      record.hasGeneratedPreview,
      record.status || 'received',
      record.sourceIp,
      record.createdAt,
      record.updatedAt || null,
    ],
  );

  return true;
}

async function persistAppointmentToDatabase(record) {
  if (!databaseReady) {
    return false;
  }

  await getPool().query(
    `
      INSERT INTO appointment_requests (
        appointment_id,
        client_name,
        email,
        whatsapp,
        preferred_date,
        preferred_slot,
        reason,
        notes,
        source,
        status,
        source_ip,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (appointment_id) DO NOTHING
    `,
    [
      record.appointmentId,
      record.clientName,
      record.email,
      record.whatsapp,
      record.preferredDate,
      record.preferredSlot,
      record.reason,
      record.notes,
      record.source,
      record.status || 'pending',
      record.sourceIp,
      record.createdAt,
      record.updatedAt || null,
    ],
  );

  return true;
}

function mapGenerationRow(row) {
  if (!row) {
    return null;
  }

  return {
    registrantId: row.registrant_id || '',
    registrantName: row.registrant_name || '',
    registrantEmail: row.registrant_email || '',
    registrantWhatsapp: row.registrant_whatsapp || '',
    category: row.category || '',
    designName: row.design_name || '',
    metal: row.metal || '',
    gemstone: row.gemstone || '',
    style: row.style || '',
    occasion: row.occasion || '',
    renderIntent: row.render_intent || '',
    cameraAngle: row.camera_angle || '',
    silhouette: row.silhouette || '',
    detailLevel: row.detail_level || '',
    backgroundMood: row.background_mood || '',
    prompt: row.prompt || '',
    promptUsed: row.prompt_used || '',
    model: row.model || '',
    provider: row.provider || '',
    generatedAt: row.generated_at ? new Date(row.generated_at).toISOString() : '',
  };
}

function mapQuoteRow(row) {
  if (!row) {
    return null;
  }

  return {
    quoteId: row.quote_id,
    registrantId: row.registrant_id || '',
    clientName: row.client_name || '',
    email: row.email || '',
    whatsapp: row.whatsapp || '',
    preferredContact: row.preferred_contact || '',
    budget: row.budget || '',
    timeline: row.timeline || '',
    notes: row.notes || '',
    prompt: row.prompt || '',
    category: row.category || '',
    designName: row.design_name || '',
    preferredMetal: row.preferred_metal || '',
    preferredStone: row.preferred_stone || '',
    style: row.style || '',
    occasion: row.occasion || '',
    reference: row.reference || '',
    hasGeneratedPreview: Boolean(row.has_generated_preview),
    status: row.status || 'received',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function mapAppointmentRow(row) {
  if (!row) {
    return null;
  }

  return {
    appointmentId: row.appointment_id,
    clientName: row.client_name || '',
    email: row.email || '',
    whatsapp: row.whatsapp || '',
    preferredDate: row.preferred_date ? new Date(row.preferred_date).toISOString() : '',
    preferredSlot: row.preferred_slot || '',
    reason: row.reason || '',
    notes: row.notes || '',
    source: row.source || '',
    status: row.status || 'pending',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function mapAssistantMemoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    occasion: row.occasion || '',
    jewelryType: row.jewelry_type || '',
    budget: row.budget || '',
    style: row.style || '',
    metal: row.metal || '',
    gemstone: row.gemstone || '',
    ringSize: row.ring_size || '',
    recipient: row.recipient || '',
    deadline: row.deadline || '',
    budgetRange: row.budget_range || '',
    valuationSummary: row.valuation_summary || '',
    lastIntent: row.last_intent || '',
    lastCollectionSlug: row.last_collection_slug || '',
    lastProductReference: row.last_product_reference || '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function mapContactRow(row) {
  if (!row) {
    return null;
  }

  return {
    contactId: row.contact_id,
    contactKey: row.contact_key || '',
    fullName: row.full_name || '',
    email: row.email || '',
    whatsapp: row.whatsapp || '',
    city: row.city || '',
    source: row.source || 'manual',
    status: row.status || 'lead',
    segment: row.segment || '',
    tags: row.tags || '',
    notes: row.notes || '',
    lastTouchAt: row.last_touch_at ? new Date(row.last_touch_at).toISOString() : '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function mapInteractionRow(row) {
  if (!row) {
    return null;
  }

  return {
    interactionId: row.interaction_id,
    contactId: row.contact_id || '',
    channel: row.channel || '',
    direction: row.direction || 'inbound',
    title: row.title || '',
    body: row.body || '',
    source: row.source || 'make',
    externalRef: row.external_ref || '',
    payload: row.payload || {},
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
  };
}

function mapTransactionRow(row) {
  if (!row) {
    return null;
  }

  return {
    transactionId: row.transaction_id,
    transactionKey: row.transaction_key || '',
    contactId: row.contact_id || '',
    transactionType: row.transaction_type || '',
    amount: Number(row.amount || 0),
    currency: row.currency || 'COP',
    channel: row.channel || '',
    status: row.status || 'posted',
    source: row.source || 'manual',
    externalRef: row.external_ref || '',
    description: row.description || '',
    category: row.category || '',
    payload: row.payload || {},
    occurredAt: row.occurred_at ? new Date(row.occurred_at).toISOString() : '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
  };
}

function mapTaskRow(row) {
  if (!row) {
    return null;
  }

  return {
    taskId: row.task_id,
    taskKey: row.task_key || '',
    contactId: row.contact_id || '',
    title: row.title || '',
    owner: row.owner || '',
    status: row.status || 'todo',
    priority: row.priority || 'medium',
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : '',
    source: row.source || 'trello',
    externalRef: row.external_ref || '',
    notes: row.notes || '',
    payload: row.payload || {},
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function mapAutomationEventRow(row) {
  if (!row) {
    return null;
  }

  return {
    eventId: row.event_id,
    eventKey: row.event_key || '',
    pipeline: row.pipeline || '',
    eventType: row.event_type || '',
    source: row.source || 'make',
    status: row.status || 'queued',
    contactId: row.contact_id || '',
    transactionId: row.transaction_id || '',
    taskId: row.task_id || '',
    payload: row.payload || {},
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
  };
}

function mapLinktreeRow(row) {
  if (!row) {
    return null;
  }

  return {
    linkId: row.link_id,
    linkKey: row.link_key || '',
    label: row.label || '',
    url: row.url || '',
    description: row.description || '',
    category: row.category || '',
    icon: row.icon || '',
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function buildContactKey(record) {
  const email = String(record.email || '').trim().toLowerCase();
  const whatsapp = String(record.whatsapp || '').trim().toLowerCase();

  if (email) {
    return `email:${email}`;
  }

  if (whatsapp) {
    return `whatsapp:${whatsapp}`;
  }

  return String(record.contactId || '').trim().toLowerCase() || `contact:${crypto.randomBytes(6).toString('hex')}`;
}

function buildTransactionKey(record) {
  const externalRef = String(record.externalRef || '').trim().toLowerCase();
  if (externalRef) {
    return `external:${externalRef}`;
  }

  return String(record.transactionId || '').trim().toLowerCase() || `transaction:${crypto.randomBytes(6).toString('hex')}`;
}

function buildTaskKey(record) {
  const externalRef = String(record.externalRef || '').trim().toLowerCase();
  if (externalRef) {
    return `external:${externalRef}`;
  }

  return String(record.taskId || '').trim().toLowerCase() || `task:${crypto.randomBytes(6).toString('hex')}`;
}

function buildEventKey(record) {
  const externalRef = String(record.externalRef || '').trim().toLowerCase();
  if (externalRef) {
    return `external:${externalRef}`;
  }

  return String(record.eventId || '').trim().toLowerCase() || `event:${crypto.randomBytes(6).toString('hex')}`;
}

function buildLinkKey(record) {
  const base = String(record.linkKey || record.label || '').trim().toLowerCase();
  return base || `link:${crypto.randomBytes(6).toString('hex')}`;
}

async function listGenerationsByEmail(email, limit = 12) {
  if (!databaseReady) {
    return [];
  }

  const { rows } = await getPool().query(
    `
      SELECT
        registrant_id, registrant_name, registrant_email, registrant_whatsapp, category,
        design_name, metal, gemstone, style, occasion, render_intent, camera_angle,
        silhouette, detail_level, background_mood, prompt, prompt_used, model, provider, generated_at
      FROM design_generations
      WHERE LOWER(registrant_email) = LOWER($1)
      ORDER BY generated_at DESC
      LIMIT $2
    `,
    [String(email || '').trim(), Number(limit)],
  );

  return rows.map(mapGenerationRow);
}

async function listQuotesByEmail(email, limit = 12) {
  if (!databaseReady) {
    return [];
  }

  const { rows } = await getPool().query(
    `
      SELECT
        quote_id, registrant_id, client_name, email, whatsapp, preferred_contact, budget, timeline,
        notes, prompt, category, design_name, preferred_metal, preferred_stone, style,
        occasion, reference, has_generated_preview, status, created_at, updated_at
      FROM quote_requests
      WHERE LOWER(email) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [String(email || '').trim(), Number(limit)],
  );

  return rows.map(mapQuoteRow);
}

async function listAppointmentsByEmail(email, limit = 12) {
  if (!databaseReady) {
    return [];
  }

  const { rows } = await getPool().query(
    `
      SELECT
        appointment_id, client_name, email, whatsapp, preferred_date, preferred_slot, reason,
        notes, source, status, created_at, updated_at
      FROM appointment_requests
      WHERE LOWER(email) = LOWER($1)
      ORDER BY preferred_date DESC, created_at DESC
      LIMIT $2
    `,
    [String(email || '').trim(), Number(limit)],
  );

  return rows.map(mapAppointmentRow);
}

async function getAssistantMemoryByUserId(userId) {
  if (!databaseReady) {
    return null;
  }

  const { rows } = await getPool().query(
    `
      SELECT
        user_id, occasion, jewelry_type, budget, style, metal, gemstone, ring_size, recipient,
        deadline, budget_range, valuation_summary, last_intent, last_collection_slug, last_product_reference, updated_at
      FROM assistant_memories
      WHERE user_id = $1
      LIMIT 1
    `,
    [String(userId || '').trim()],
  );

  return mapAssistantMemoryRow(rows[0]);
}

async function upsertAssistantMemory(record) {
  if (!databaseReady) {
    return null;
  }

  const { rows } = await getPool().query(
    `
      INSERT INTO assistant_memories (
        user_id,
        occasion,
        jewelry_type,
        budget,
        style,
        metal,
        gemstone,
        ring_size,
        recipient,
        deadline,
        budget_range,
        valuation_summary,
        last_intent,
        last_collection_slug,
        last_product_reference,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (user_id) DO UPDATE SET
        occasion = EXCLUDED.occasion,
        jewelry_type = EXCLUDED.jewelry_type,
        budget = EXCLUDED.budget,
        style = EXCLUDED.style,
        metal = EXCLUDED.metal,
        gemstone = EXCLUDED.gemstone,
        ring_size = EXCLUDED.ring_size,
        recipient = EXCLUDED.recipient,
        deadline = EXCLUDED.deadline,
        budget_range = EXCLUDED.budget_range,
        valuation_summary = EXCLUDED.valuation_summary,
        last_intent = EXCLUDED.last_intent,
        last_collection_slug = EXCLUDED.last_collection_slug,
        last_product_reference = EXCLUDED.last_product_reference,
        updated_at = EXCLUDED.updated_at
      RETURNING
        user_id, occasion, jewelry_type, budget, style, metal, gemstone, ring_size, recipient,
        deadline, budget_range, valuation_summary, last_intent, last_collection_slug, last_product_reference, updated_at
    `,
    [
      record.userId,
      record.occasion || '',
      record.jewelryType || '',
      record.budget || '',
      record.style || '',
      record.metal || '',
      record.gemstone || '',
      record.ringSize || '',
      record.recipient || '',
      record.deadline || '',
      record.budgetRange || '',
      record.valuationSummary || '',
      record.lastIntent || '',
      record.lastCollectionSlug || '',
      record.lastProductReference || '',
      record.updatedAt || new Date().toISOString(),
    ],
  );

  return mapAssistantMemoryRow(rows[0]);
}

async function upsertCrmContact(record) {
  const contactId = String(record.contactId || '').trim() || `CON-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const contactKey = buildContactKey({ ...record, contactId });
  const createdAt = record.createdAt || new Date().toISOString();
  const updatedAt = record.updatedAt || new Date().toISOString();

  if (!databaseReady) {
    ensureOperationsStore();
    const contacts = await readOperationsRecords(OPERATIONS_CONTACTS_FILE);
    const nextContact = {
      contactId,
      contactKey,
      fullName: record.fullName || '',
      email: record.email || '',
      whatsapp: record.whatsapp || '',
      city: record.city || '',
      source: record.source || 'manual',
      status: record.status || 'lead',
      segment: record.segment || '',
      tags: record.tags || '',
      notes: record.notes || '',
      lastTouchAt: record.lastTouchAt || '',
      createdAt,
      updatedAt,
    };
    const index = contacts.findIndex((item) => item.contactKey === contactKey);
    if (index === -1) {
      contacts.push(nextContact);
    } else {
      contacts[index] = { ...contacts[index], ...nextContact };
    }
    await writeOperationsRecords(OPERATIONS_CONTACTS_FILE, contacts);
    return nextContact;
  }

  const { rows } = await getPool().query(
    `
      INSERT INTO crm_contacts (
        contact_id,
        contact_key,
        full_name,
        email,
        whatsapp,
        city,
        source,
        status,
        segment,
        tags,
        notes,
        last_touch_at,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (contact_key) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        whatsapp = EXCLUDED.whatsapp,
        city = EXCLUDED.city,
        source = EXCLUDED.source,
        status = EXCLUDED.status,
        segment = EXCLUDED.segment,
        tags = EXCLUDED.tags,
        notes = EXCLUDED.notes,
        last_touch_at = EXCLUDED.last_touch_at,
        updated_at = COALESCE(EXCLUDED.updated_at, NOW())
      RETURNING *
    `,
    [
      contactId,
      contactKey,
      record.fullName || '',
      record.email || '',
      record.whatsapp || '',
      record.city || '',
      record.source || 'manual',
      record.status || 'lead',
      record.segment || '',
      record.tags || '',
      record.notes || '',
      record.lastTouchAt || null,
      createdAt,
      record.updatedAt || updatedAt,
    ],
  );

  return mapContactRow(rows[0]);
}

async function persistInteractionToDatabase(record) {
  const interactionId = String(record.interactionId || '').trim() || `INT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const createdAt = record.createdAt || new Date().toISOString();

  if (!databaseReady) {
    ensureOperationsStore();
    const interactions = await readOperationsRecords(OPERATIONS_INTERACTIONS_FILE);
    const nextInteraction = {
      interactionId,
      contactId: record.contactId || '',
      channel: record.channel || 'whatsapp',
      direction: record.direction || 'inbound',
      title: record.title || '',
      body: record.body || '',
      source: record.source || 'make',
      externalRef: record.externalRef || '',
      payload: record.payload || {},
      createdAt,
    };
    const index = interactions.findIndex((item) => item.interactionId === interactionId);
    if (index === -1) {
      interactions.push(nextInteraction);
    } else {
      interactions[index] = { ...interactions[index], ...nextInteraction };
    }
    await writeOperationsRecords(OPERATIONS_INTERACTIONS_FILE, interactions);
    return nextInteraction;
  }

  const { rows } = await getPool().query(
    `
      INSERT INTO crm_interactions (
        interaction_id,
        contact_id,
        channel,
        direction,
        title,
        body,
        source,
        external_ref,
        payload,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (interaction_id) DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        channel = EXCLUDED.channel,
        direction = EXCLUDED.direction,
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        source = EXCLUDED.source,
        external_ref = EXCLUDED.external_ref,
        payload = EXCLUDED.payload
      RETURNING *
    `,
    [
      interactionId,
      record.contactId || null,
      record.channel || 'whatsapp',
      record.direction || 'inbound',
      record.title || '',
      record.body || '',
      record.source || 'make',
      record.externalRef || '',
      record.payload || {},
      createdAt,
    ],
  );

  return mapInteractionRow(rows[0]);
}

async function persistTransactionToDatabase(record) {
  const transactionId = String(record.transactionId || '').trim() || `MOV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const transactionKey = buildTransactionKey({ ...record, transactionId });
  const createdAt = record.createdAt || new Date().toISOString();
  const occurredAt = record.occurredAt || createdAt;

  if (!databaseReady) {
    ensureOperationsStore();
    const transactions = await readOperationsRecords(OPERATIONS_TRANSACTIONS_FILE);
    const nextTransaction = {
      transactionId,
      transactionKey,
      contactId: record.contactId || '',
      transactionType: record.transactionType || 'sale',
      amount: Number(record.amount || 0),
      currency: record.currency || 'COP',
      channel: record.channel || '',
      status: record.status || 'posted',
      source: record.source || 'manual',
      externalRef: record.externalRef || '',
      description: record.description || '',
      category: record.category || '',
      payload: record.payload || {},
      occurredAt,
      createdAt,
    };
    const index = transactions.findIndex((item) => item.transactionKey === transactionKey);
    if (index === -1) {
      transactions.push(nextTransaction);
    } else {
      transactions[index] = { ...transactions[index], ...nextTransaction };
    }
    await writeOperationsRecords(OPERATIONS_TRANSACTIONS_FILE, transactions);
    return nextTransaction;
  }

  const { rows } = await getPool().query(
    `
      INSERT INTO crm_transactions (
        transaction_id,
        transaction_key,
        contact_id,
        transaction_type,
        amount,
        currency,
        channel,
        status,
        source,
        external_ref,
        description,
        category,
        payload,
        occurred_at,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (transaction_key) DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        transaction_type = EXCLUDED.transaction_type,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        channel = EXCLUDED.channel,
        status = EXCLUDED.status,
        source = EXCLUDED.source,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        payload = EXCLUDED.payload,
        occurred_at = EXCLUDED.occurred_at
      RETURNING *
    `,
    [
      transactionId,
      transactionKey,
      record.contactId || null,
      record.transactionType || 'sale',
      Number(record.amount || 0),
      record.currency || 'COP',
      record.channel || '',
      record.status || 'posted',
      record.source || 'manual',
      record.externalRef || '',
      record.description || '',
      record.category || '',
      record.payload || {},
      occurredAt,
      createdAt,
    ],
  );

  return mapTransactionRow(rows[0]);
}

async function persistTaskToDatabase(record) {
  const taskId = String(record.taskId || '').trim() || `TSK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const taskKey = buildTaskKey({ ...record, taskId });
  const createdAt = record.createdAt || new Date().toISOString();
  const updatedAt = record.updatedAt || createdAt;

  if (!databaseReady) {
    ensureOperationsStore();
    const tasks = await readOperationsRecords(OPERATIONS_TASKS_FILE);
    const nextTask = {
      taskId,
      taskKey,
      contactId: record.contactId || '',
      title: record.title || '',
      owner: record.owner || '',
      status: record.status || 'todo',
      priority: record.priority || 'medium',
      dueDate: record.dueDate || '',
      source: record.source || 'trello',
      externalRef: record.externalRef || '',
      notes: record.notes || '',
      payload: record.payload || {},
      createdAt,
      updatedAt,
    };
    const index = tasks.findIndex((item) => item.taskKey === taskKey);
    if (index === -1) {
      tasks.push(nextTask);
    } else {
      tasks[index] = { ...tasks[index], ...nextTask };
    }
    await writeOperationsRecords(OPERATIONS_TASKS_FILE, tasks);
    return nextTask;
  }

  const { rows } = await getPool().query(
    `
      INSERT INTO crm_tasks (
        task_id,
        task_key,
        contact_id,
        title,
        owner,
        status,
        priority,
        due_date,
        source,
        external_ref,
        notes,
        payload,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (task_key) DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        title = EXCLUDED.title,
        owner = EXCLUDED.owner,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        due_date = EXCLUDED.due_date,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      taskId,
      taskKey,
      record.contactId || null,
      record.title || '',
      record.owner || '',
      record.status || 'todo',
      record.priority || 'medium',
      record.dueDate || null,
      record.source || 'trello',
      record.externalRef || '',
      record.notes || '',
      record.payload || {},
      createdAt,
      updatedAt,
    ],
  );

  return mapTaskRow(rows[0]);
}

async function persistAutomationEventToDatabase(record) {
  const eventId = String(record.eventId || '').trim() || `EVT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const eventKey = buildEventKey({ ...record, eventId });
  const createdAt = record.createdAt || new Date().toISOString();

  if (!databaseReady) {
    ensureOperationsStore();
    const events = await readOperationsRecords(OPERATIONS_EVENTS_FILE);
    const nextEvent = {
      eventId,
      eventKey,
      pipeline: record.pipeline || 'make',
      eventType: record.eventType || 'webhook',
      source: record.source || 'make',
      status: record.status || 'queued',
      contactId: record.contactId || '',
      transactionId: record.transactionId || '',
      taskId: record.taskId || '',
      payload: record.payload || {},
      createdAt,
    };
    const index = events.findIndex((item) => item.eventKey === eventKey);
    if (index === -1) {
      events.push(nextEvent);
    } else {
      events[index] = { ...events[index], ...nextEvent };
    }
    await writeOperationsRecords(OPERATIONS_EVENTS_FILE, events);
    return nextEvent;
  }

  const { rows } = await getPool().query(
    `
      INSERT INTO automation_events (
        event_id,
        event_key,
        pipeline,
        event_type,
        source,
        status,
        contact_id,
        transaction_id,
        task_id,
        payload,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (event_key) DO UPDATE SET
        pipeline = EXCLUDED.pipeline,
        event_type = EXCLUDED.event_type,
        source = EXCLUDED.source,
        status = EXCLUDED.status,
        contact_id = EXCLUDED.contact_id,
        transaction_id = EXCLUDED.transaction_id,
        task_id = EXCLUDED.task_id,
        payload = EXCLUDED.payload
      RETURNING *
    `,
    [
      eventId,
      eventKey,
      record.pipeline || 'make',
      record.eventType || 'webhook',
      record.source || 'make',
      record.status || 'queued',
      record.contactId || null,
      record.transactionId || null,
      record.taskId || null,
      record.payload || {},
      createdAt,
    ],
  );

  return mapAutomationEventRow(rows[0]);
}

async function upsertLinktreeLink(record) {
  const linkId = String(record.linkId || '').trim() || `LNK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const linkKey = buildLinkKey({ ...record, linkId });
  const createdAt = record.createdAt || new Date().toISOString();
  const updatedAt = record.updatedAt || createdAt;

  if (!databaseReady) {
    ensureOperationsStore();
    const links = await readOperationsRecords(OPERATIONS_LINKTREE_FILE);
    const nextLink = {
      linkId,
      linkKey,
      label: record.label || '',
      url: record.url || '',
      description: record.description || '',
      category: record.category || '',
      icon: record.icon || '',
      sortOrder: Number(record.sortOrder || 0),
      active: record.active !== false,
      createdAt,
      updatedAt,
    };
    const index = links.findIndex((item) => item.linkKey === linkKey);
    if (index === -1) {
      links.push(nextLink);
    } else {
      links[index] = { ...links[index], ...nextLink };
    }
    await writeOperationsRecords(OPERATIONS_LINKTREE_FILE, links);
    return nextLink;
  }

  const { rows } = await getPool().query(
    `
      INSERT INTO linktree_links (
        link_id,
        link_key,
        label,
        url,
        description,
        category,
        icon,
        sort_order,
        active,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (link_key) DO UPDATE SET
        label = EXCLUDED.label,
        url = EXCLUDED.url,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      linkId,
      linkKey,
      record.label || '',
      record.url || '',
      record.description || '',
      record.category || '',
      record.icon || '',
      Number(record.sortOrder || 0),
      record.active !== false,
      createdAt,
      updatedAt,
    ],
  );

  return mapLinktreeRow(rows[0]);
}

async function listCrmContacts(limit = 20) {
  if (!databaseReady) {
    ensureOperationsStore();
    return (await readOperationsRecords(OPERATIONS_CONTACTS_FILE))
      .sort((left, right) => new Date(right.lastTouchAt || right.updatedAt || right.createdAt || 0).getTime() - new Date(left.lastTouchAt || left.updatedAt || left.createdAt || 0).getTime())
      .slice(0, Number(limit))
      .map((item) => ({
        contactId: item.contactId || '',
        contactKey: item.contactKey || '',
        fullName: item.fullName || '',
        email: item.email || '',
        whatsapp: item.whatsapp || '',
        city: item.city || '',
        source: item.source || 'manual',
        status: item.status || 'lead',
        segment: item.segment || '',
        tags: item.tags || '',
        notes: item.notes || '',
        lastTouchAt: item.lastTouchAt || '',
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      }));
  }

  const { rows } = await getPool().query(
    `
      SELECT *
      FROM crm_contacts
      ORDER BY COALESCE(last_touch_at, updated_at, created_at) DESC, created_at DESC
      LIMIT $1
    `,
    [Number(limit)],
  );

  return rows.map(mapContactRow);
}

async function listCrmTransactions(limit = 20) {
  if (!databaseReady) {
    ensureOperationsStore();
    return (await readOperationsRecords(OPERATIONS_TRANSACTIONS_FILE))
      .sort((left, right) => new Date(right.occurredAt || right.createdAt || 0).getTime() - new Date(left.occurredAt || left.createdAt || 0).getTime())
      .slice(0, Number(limit))
      .map((item) => ({
        transactionId: item.transactionId || '',
        transactionKey: item.transactionKey || '',
        contactId: item.contactId || '',
        transactionType: item.transactionType || '',
        amount: Number(item.amount || 0),
        currency: item.currency || 'COP',
        channel: item.channel || '',
        status: item.status || 'posted',
        source: item.source || 'manual',
        externalRef: item.externalRef || '',
        description: item.description || '',
        category: item.category || '',
        payload: item.payload || {},
        occurredAt: item.occurredAt || '',
        createdAt: item.createdAt || '',
      }));
  }

  const { rows } = await getPool().query(
    `
      SELECT *
      FROM crm_transactions
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT $1
    `,
    [Number(limit)],
  );

  return rows.map(mapTransactionRow);
}

async function listCrmTasks(limit = 20) {
  if (!databaseReady) {
    ensureOperationsStore();
    return (await readOperationsRecords(OPERATIONS_TASKS_FILE))
      .sort((left, right) => {
        const leftRank = left.status === 'done' ? 3 : left.status === 'doing' ? 2 : 1;
        const rightRank = right.status === 'done' ? 3 : right.status === 'doing' ? 2 : 1;
        if (leftRank !== rightRank) return rightRank - leftRank;
        return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
      })
      .slice(0, Number(limit))
      .map((item) => ({
        taskId: item.taskId || '',
        taskKey: item.taskKey || '',
        contactId: item.contactId || '',
        title: item.title || '',
        owner: item.owner || '',
        status: item.status || 'todo',
        priority: item.priority || 'medium',
        dueDate: item.dueDate || '',
        source: item.source || 'trello',
        externalRef: item.externalRef || '',
        notes: item.notes || '',
        payload: item.payload || {},
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      }));
  }

  const { rows } = await getPool().query(
    `
      SELECT *
      FROM crm_tasks
      ORDER BY
        CASE status
          WHEN 'done' THEN 3
          WHEN 'doing' THEN 2
          ELSE 1
        END,
        COALESCE(due_date, CURRENT_DATE + INTERVAL '365 days'),
        updated_at DESC,
        created_at DESC
      LIMIT $1
    `,
    [Number(limit)],
  );

  return rows.map(mapTaskRow);
}

async function listAutomationEvents(limit = 20) {
  if (!databaseReady) {
    ensureOperationsStore();
    return (await readOperationsRecords(OPERATIONS_EVENTS_FILE))
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, Number(limit))
      .map((item) => ({
        eventId: item.eventId || '',
        eventKey: item.eventKey || '',
        pipeline: item.pipeline || '',
        eventType: item.eventType || '',
        source: item.source || 'make',
        status: item.status || 'queued',
        contactId: item.contactId || '',
        transactionId: item.transactionId || '',
        taskId: item.taskId || '',
        payload: item.payload || {},
        createdAt: item.createdAt || '',
      }));
  }

  const { rows } = await getPool().query(
    `
      SELECT *
      FROM automation_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [Number(limit)],
  );

  return rows.map(mapAutomationEventRow);
}

async function listLinktreeLinks(activeOnly = true) {
  if (!databaseReady) {
    ensureOperationsStore();
    const links = await readOperationsRecords(OPERATIONS_LINKTREE_FILE);
    return links
      .filter((item) => !activeOnly || item.active !== false)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
      .map((item) => ({
        linkId: item.linkId || '',
        linkKey: item.linkKey || '',
        label: item.label || '',
        url: item.url || '',
        description: item.description || '',
        category: item.category || '',
        icon: item.icon || '',
        sortOrder: Number(item.sortOrder || 0),
        active: item.active !== false,
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      }));
  }

  const { rows } = await getPool().query(
    `
      SELECT *
      FROM linktree_links
      ${activeOnly ? 'WHERE active = TRUE' : ''}
      ORDER BY sort_order ASC, created_at ASC
    `,
  );

  return rows.map(mapLinktreeRow);
}

async function getOperationsDashboard() {
  if (!databaseReady) {
    const [contacts, transactions, tasks, events, links] = await Promise.all([
      listCrmContacts(6),
      listCrmTransactions(8),
      listCrmTasks(8),
      listAutomationEvents(8),
      listLinktreeLinks(true),
    ]);

    const sales = transactions.reduce((sum, item) => {
      if (['sale', 'income'].includes(item.transactionType)) {
        return sum + Number(item.amount || 0);
      }
      return sum;
    }, 0);
    const expenses = transactions.reduce((sum, item) => {
      if (['expense', 'refund'].includes(item.transactionType)) {
        return sum + Number(item.amount || 0);
      }
      return sum;
    }, 0);

    return {
      ready: false,
      summary: {
        contacts: contacts.length,
        transactions: transactions.length,
        sales,
        expenses,
        balance: sales - expenses,
        tasks: tasks.length,
        overdueTasks: tasks.filter((item) => item.status !== 'done' && item.dueDate && new Date(item.dueDate).getTime() < Date.now()).length,
        events: events.length,
      },
      recentContacts: contacts,
      recentTransactions: transactions,
      recentTasks: tasks,
      recentEvents: events,
      linktreeLinks: links,
    };
  }

  const [
    contactCountResult,
    transactionStatsResult,
    taskCountResult,
    overdueTaskResult,
    eventCountResult,
    recentContacts,
    recentTransactions,
    recentTasks,
    recentEvents,
    linktreeLinks,
  ] = await Promise.all([
    getPool().query('SELECT COUNT(*)::int AS count FROM crm_contacts'),
    getPool().query(
      `
        SELECT
          COUNT(*)::int AS count,
          COALESCE(SUM(CASE WHEN transaction_type IN ('sale', 'income') THEN amount ELSE 0 END), 0) AS sales,
          COALESCE(SUM(CASE WHEN transaction_type IN ('expense', 'refund') THEN amount ELSE 0 END), 0) AS expenses,
          COALESCE(SUM(
            CASE
              WHEN transaction_type IN ('sale', 'income') THEN amount
              WHEN transaction_type IN ('expense', 'refund') THEN -amount
              ELSE amount
            END
          ), 0) AS balance
        FROM crm_transactions
      `,
    ),
    getPool().query('SELECT COUNT(*)::int AS count FROM crm_tasks'),
    getPool().query("SELECT COUNT(*)::int AS count FROM crm_tasks WHERE status <> 'done' AND due_date IS NOT NULL AND due_date < CURRENT_DATE"),
    getPool().query('SELECT COUNT(*)::int AS count FROM automation_events'),
    listCrmContacts(6),
    listCrmTransactions(8),
    listCrmTasks(8),
    listAutomationEvents(8),
    listLinktreeLinks(true),
  ]);

  return {
    ready: true,
    summary: {
      contacts: Number(contactCountResult.rows[0]?.count || 0),
      transactions: Number(transactionStatsResult.rows[0]?.count || 0),
      sales: Number(transactionStatsResult.rows[0]?.sales || 0),
      expenses: Number(transactionStatsResult.rows[0]?.expenses || 0),
      balance: Number(transactionStatsResult.rows[0]?.balance || 0),
      tasks: Number(taskCountResult.rows[0]?.count || 0),
      overdueTasks: Number(overdueTaskResult.rows[0]?.count || 0),
      events: Number(eventCountResult.rows[0]?.count || 0),
    },
    recentContacts,
    recentTransactions,
    recentTasks,
    recentEvents,
    linktreeLinks,
  };
}

module.exports = {
  initDatabase,
  getDatabaseStatus,
  findUserByEmailInDatabase,
  findUserByGoogleSubInDatabase,
  findUserByIdInDatabase,
  upsertUserInDatabase,
  persistRegistrationToDatabase,
  persistGenerationToDatabase,
  persistQuoteToDatabase,
  persistAppointmentToDatabase,
  listGenerationsByEmail,
  listQuotesByEmail,
  listAppointmentsByEmail,
  getAssistantMemoryByUserId,
  upsertAssistantMemory,
  upsertCrmContact,
  persistInteractionToDatabase,
  persistTransactionToDatabase,
  persistTaskToDatabase,
  persistAutomationEventToDatabase,
  upsertLinktreeLink,
  listCrmContacts,
  listCrmTransactions,
  listCrmTasks,
  listAutomationEvents,
  listLinktreeLinks,
  getOperationsDashboard,
};
