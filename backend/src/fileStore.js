const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.ndjson');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorite-items.ndjson');
const CART_FILE = path.join(DATA_DIR, 'cart-items.ndjson');
const SAVED_DESIGNS_FILE = path.join(DATA_DIR, 'saved-designs.ndjson');

function ensureStoreFile(filePath) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
}

function ensureAccountStore() {
  [USERS_FILE, FAVORITES_FILE, CART_FILE, SAVED_DESIGNS_FILE].forEach(ensureStoreFile);
}

async function readRecords(filePath) {
  ensureStoreFile(filePath);
  const raw = await fs.promises.readFile(filePath, 'utf8');

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeRecords(filePath, records) {
  ensureStoreFile(filePath);
  const serialized = records.map((record) => JSON.stringify(record)).join('\n');
  await fs.promises.writeFile(filePath, serialized ? `${serialized}\n` : '', 'utf8');
}

function buildId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function findUserByEmail(email) {
  const users = await readRecords(USERS_FILE);
  return users.find((user) => user.email.toLowerCase() === String(email || '').toLowerCase()) || null;
}

async function listUsers() {
  return readRecords(USERS_FILE);
}

async function findUserByGoogleSub(googleSub) {
  const users = await readRecords(USERS_FILE);
  return users.find((user) => user.googleSub && user.googleSub === googleSub) || null;
}

async function findUserById(userId) {
  const users = await readRecords(USERS_FILE);
  return users.find((user) => user.userId === userId) || null;
}

async function createUser(record) {
  const users = await readRecords(USERS_FILE);
  const newUser = {
    userId: record.userId || buildId('USR'),
    createdAt: record.createdAt || new Date().toISOString(),
    ...record,
  };
  users.push(newUser);
  await writeRecords(USERS_FILE, users);
  return newUser;
}

async function upsertUser(record) {
  const users = await readRecords(USERS_FILE);
  const index = users.findIndex((user) => user.userId === record.userId);
  const nextUser = {
    userId: record.userId || buildId('USR'),
    createdAt: record.createdAt || users[index]?.createdAt || new Date().toISOString(),
    ...users[index],
    ...record,
  };

  if (index === -1) {
    users.push(nextUser);
  } else {
    users[index] = nextUser;
  }

  await writeRecords(USERS_FILE, users);
  return nextUser;
}

async function updateUser(userId, updater) {
  const users = await readRecords(USERS_FILE);
  const index = users.findIndex((user) => user.userId === userId);

  if (index === -1) {
    return null;
  }

  users[index] = {
    ...users[index],
    ...updater,
    updatedAt: new Date().toISOString(),
  };

  await writeRecords(USERS_FILE, users);
  return users[index];
}

async function listFavorites(userId) {
  const favorites = await readRecords(FAVORITES_FILE);
  return favorites.filter((item) => item.userId === userId);
}

async function addFavorite(record) {
  const favorites = await readRecords(FAVORITES_FILE);
  const existing = favorites.find(
    (item) => item.userId === record.userId && item.reference === record.reference && item.name === record.name,
  );

  if (existing) {
    return existing;
  }

  const newFavorite = {
    favoriteId: buildId('FAV'),
    createdAt: new Date().toISOString(),
    ...record,
  };
  favorites.push(newFavorite);
  await writeRecords(FAVORITES_FILE, favorites);
  return newFavorite;
}

async function removeFavorite(userId, favoriteId) {
  const favorites = await readRecords(FAVORITES_FILE);
  const nextFavorites = favorites.filter((item) => !(item.userId === userId && item.favoriteId === favoriteId));
  await writeRecords(FAVORITES_FILE, nextFavorites);
}

async function listCartItems(userId) {
  const items = await readRecords(CART_FILE);
  return items.filter((item) => item.userId === userId);
}

async function addCartItem(record) {
  const items = await readRecords(CART_FILE);
  const existing = items.find(
    (item) => item.userId === record.userId && item.reference === record.reference && item.name === record.name,
  );

  if (existing) {
    return existing;
  }

  const newItem = {
    cartItemId: buildId('CART'),
    createdAt: new Date().toISOString(),
    ...record,
  };
  items.push(newItem);
  await writeRecords(CART_FILE, items);
  return newItem;
}

async function removeCartItem(userId, cartItemId) {
  const items = await readRecords(CART_FILE);
  const nextItems = items.filter((item) => !(item.userId === userId && item.cartItemId === cartItemId));
  await writeRecords(CART_FILE, nextItems);
}

async function listSavedDesigns(userId) {
  const designs = await readRecords(SAVED_DESIGNS_FILE);
  return designs.filter((item) => item.userId === userId);
}

async function addSavedDesign(record) {
  const designs = await readRecords(SAVED_DESIGNS_FILE);
  const newDesign = {
    designId: buildId('DSN'),
    createdAt: new Date().toISOString(),
    ...record,
  };
  designs.push(newDesign);
  await writeRecords(SAVED_DESIGNS_FILE, designs);
  return newDesign;
}

async function removeSavedDesign(userId, designId) {
  const designs = await readRecords(SAVED_DESIGNS_FILE);
  const nextDesigns = designs.filter((item) => !(item.userId === userId && item.designId === designId));
  await writeRecords(SAVED_DESIGNS_FILE, nextDesigns);
}

module.exports = {
  ensureAccountStore,
  listUsers,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  createUser,
  upsertUser,
  updateUser,
  listFavorites,
  addFavorite,
  removeFavorite,
  listCartItems,
  addCartItem,
  removeCartItem,
  listSavedDesigns,
  addSavedDesign,
  removeSavedDesign,
};
