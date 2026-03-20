const crypto = require('crypto');
const { Pool } = require('pg');

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const DATABASE_SSL = String(process.env.DATABASE_SSL || 'false').trim().toLowerCase() === 'true';

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
  "ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'received';",
  'ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;',
  'ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users ((LOWER(email)));',
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL AND google_sub <> '';",
  'CREATE INDEX IF NOT EXISTS idx_registrants_email ON registrants(email);',
  'CREATE INDEX IF NOT EXISTS idx_generations_registrant_id ON design_generations(registrant_id);',
  'CREATE INDEX IF NOT EXISTS idx_quotes_registrant_id ON quote_requests(registrant_id);',
  'CREATE INDEX IF NOT EXISTS idx_appointments_preferred_date ON appointment_requests(preferred_date);',
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
      SELECT user_id, full_name, email, whatsapp, password_hash, google_sub, created_at, updated_at
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
      SELECT user_id, full_name, email, whatsapp, password_hash, google_sub, created_at, updated_at
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
      SELECT user_id, full_name, email, whatsapp, password_hash, google_sub, created_at, updated_at
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
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        whatsapp = EXCLUDED.whatsapp,
        password_hash = EXCLUDED.password_hash,
        google_sub = EXCLUDED.google_sub,
        updated_at = COALESCE(EXCLUDED.updated_at, NOW())
      RETURNING user_id, full_name, email, whatsapp, password_hash, google_sub, created_at, updated_at
    `,
    [
      userId,
      record.fullName,
      record.email,
      record.whatsapp || '',
      record.passwordHash,
      googleSub || null,
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
    lastIntent: row.last_intent || '',
    lastCollectionSlug: row.last_collection_slug || '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
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
        user_id, occasion, jewelry_type, budget, style, last_intent, last_collection_slug, updated_at
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
        last_intent,
        last_collection_slug,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id) DO UPDATE SET
        occasion = EXCLUDED.occasion,
        jewelry_type = EXCLUDED.jewelry_type,
        budget = EXCLUDED.budget,
        style = EXCLUDED.style,
        last_intent = EXCLUDED.last_intent,
        last_collection_slug = EXCLUDED.last_collection_slug,
        updated_at = EXCLUDED.updated_at
      RETURNING
        user_id, occasion, jewelry_type, budget, style, last_intent, last_collection_slug, updated_at
    `,
    [
      record.userId,
      record.occasion || '',
      record.jewelryType || '',
      record.budget || '',
      record.style || '',
      record.lastIntent || '',
      record.lastCollectionSlug || '',
      record.updatedAt || new Date().toISOString(),
    ],
  );

  return mapAssistantMemoryRow(rows[0]);
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
};
