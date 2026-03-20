const crypto = require('crypto');
const { getDatabaseStatus, findUserByEmailInDatabase, findUserByGoogleSubInDatabase, findUserByIdInDatabase, upsertUserInDatabase } = require('./db');
const {
  listUsers,
  findUserByEmail: findUserByEmailInFile,
  findUserByGoogleSub: findUserByGoogleSubInFile,
  findUserById: findUserByIdInFile,
  createUser: createUserInFile,
  upsertUser: upsertUserInFile,
  updateUser: updateUserInFile,
} = require('./fileStore');

const USERS_DUAL_WRITE_FILE = String(process.env.USERS_DUAL_WRITE_FILE || 'true').trim().toLowerCase() !== 'false';
const USERS_FILE_FALLBACK_READS = String(process.env.USERS_FILE_FALLBACK_READS || 'true').trim().toLowerCase() !== 'false';

function isDatabaseReady() {
  return getDatabaseStatus().ready;
}

function buildUserId() {
  return `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function normalizeUser(record) {
  return {
    userId: String(record.userId || '').trim() || buildUserId(),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || '',
    fullName: String(record.fullName || '').trim(),
    email: String(record.email || '').trim(),
    whatsapp: String(record.whatsapp || '').trim(),
    passwordHash: String(record.passwordHash || ''),
    googleSub: String(record.googleSub || '').trim(),
  };
}

async function mirrorUserToFile(user) {
  if (!USERS_DUAL_WRITE_FILE) {
    return;
  }

  await upsertUserInFile(normalizeUser(user));
}

async function migrateLegacyUserIfNeeded(legacyUser) {
  if (!legacyUser || !isDatabaseReady()) {
    return legacyUser || null;
  }

  const migrated = await upsertUserInDatabase(normalizeUser(legacyUser));
  await mirrorUserToFile(migrated);
  return migrated;
}

async function findUserByEmail(email) {
  if (isDatabaseReady()) {
    const user = await findUserByEmailInDatabase(email);

    if (user) {
      return user;
    }

    if (USERS_FILE_FALLBACK_READS) {
      return migrateLegacyUserIfNeeded(await findUserByEmailInFile(email));
    }

    return null;
  }

  return findUserByEmailInFile(email);
}

async function findUserByGoogleSub(googleSub) {
  if (isDatabaseReady()) {
    const user = await findUserByGoogleSubInDatabase(googleSub);

    if (user) {
      return user;
    }

    if (USERS_FILE_FALLBACK_READS) {
      return migrateLegacyUserIfNeeded(await findUserByGoogleSubInFile(googleSub));
    }

    return null;
  }

  return findUserByGoogleSubInFile(googleSub);
}

async function findUserById(userId) {
  if (isDatabaseReady()) {
    const user = await findUserByIdInDatabase(userId);

    if (user) {
      return user;
    }

    if (USERS_FILE_FALLBACK_READS) {
      return migrateLegacyUserIfNeeded(await findUserByIdInFile(userId));
    }

    return null;
  }

  return findUserByIdInFile(userId);
}

async function createUser(record) {
  const nextUser = normalizeUser(record);

  if (isDatabaseReady()) {
    const savedUser = await upsertUserInDatabase(nextUser);
    await mirrorUserToFile(savedUser);
    return savedUser;
  }

  return createUserInFile(nextUser);
}

async function updateUser(userId, updater) {
  if (isDatabaseReady()) {
    const existingUser = (await findUserByIdInDatabase(userId)) || (USERS_FILE_FALLBACK_READS ? await findUserByIdInFile(userId) : null);

    if (!existingUser) {
      return null;
    }

    const nextUser = normalizeUser({
      ...existingUser,
      ...updater,
      userId,
      createdAt: existingUser.createdAt,
      updatedAt: new Date().toISOString(),
    });
    const savedUser = await upsertUserInDatabase(nextUser);
    await mirrorUserToFile(savedUser);
    return savedUser;
  }

  return updateUserInFile(userId, updater);
}

async function migrateLegacyUsers() {
  if (!isDatabaseReady()) {
    return {
      attempted: false,
      migrated: 0,
      skipped: 0,
    };
  }

  const legacyUsers = await listUsers();
  let migrated = 0;
  let skipped = 0;

  for (const user of legacyUsers) {
    if (!user?.userId || !user?.email || !user?.passwordHash) {
      skipped += 1;
      continue;
    }

    await upsertUserInDatabase(normalizeUser(user));

    if (USERS_DUAL_WRITE_FILE) {
      await upsertUserInFile(normalizeUser(user));
    }

    migrated += 1;
  }

  return {
    attempted: true,
    migrated,
    skipped,
  };
}

function getUserStoreStatus() {
  return {
    mode: isDatabaseReady() ? 'postgresql-primary' : 'ndjson-only',
    dualWriteFile: USERS_DUAL_WRITE_FILE,
    fileFallbackReads: USERS_FILE_FALLBACK_READS,
  };
}

module.exports = {
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  createUser,
  updateUser,
  migrateLegacyUsers,
  getUserStoreStatus,
};
