require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleAuth, OAuth2Client } = require('google-auth-library');
const {
  initDatabase,
  getDatabaseStatus,
  persistRegistrationToDatabase,
  persistGenerationToDatabase,
  persistQuoteToDatabase,
  persistAppointmentToDatabase,
  listGenerationsByEmail,
  listQuotesByEmail,
  listAppointmentsByEmail,
  getAssistantMemoryByUserId,
  upsertAssistantMemory,
} = require('./db');
const {
  ensureAccountStore,
  listFavorites,
  addFavorite,
  removeFavorite,
  listCartItems,
  addCartItem,
  removeCartItem,
  listSavedDesigns,
  addSavedDesign,
  removeSavedDesign,
} = require('./fileStore');
const {
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  createUser,
  updateUser,
  migrateLegacyUsers,
  getUserStoreStatus,
} = require('./userStore');
const { createAssistantReply, isAssistantConfigured } = require('./assistant');

const app = express();
app.disable('x-powered-by');

function sanitizeText(value, maxLength = 500) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function resolveGoogleApplicationCredentials() {
  const explicitPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();

  if (explicitPath) {
    return explicitPath;
  }

  const inlineJson = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  const inlineBase64 = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 || '').trim();

  if (!inlineJson && !inlineBase64) {
    return '';
  }

  try {
    const rawJson = inlineBase64
      ? Buffer.from(inlineBase64, 'base64').toString('utf8')
      : inlineJson;
    const parsed = JSON.parse(rawJson);
    const secretsDir = path.join(__dirname, '..', 'secrets');
    const credentialsPath = path.join(secretsDir, 'gcp-service-account.runtime.json');

    fs.mkdirSync(secretsDir, { recursive: true });
    fs.writeFileSync(credentialsPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

    return credentialsPath;
  } catch (error) {
    console.warn('No se pudo preparar la credencial inline de Google Cloud.');
    return '';
  }
}

const PORT = Number(process.env.PORT || 3001);
const PROJECT_ID = sanitizeText(process.env.GOOGLE_CLOUD_PROJECT_ID, 120) || 'atelier-personal-ia';
const LOCATION = sanitizeText(process.env.GOOGLE_CLOUD_LOCATION, 80) || 'us-central1';
const PUBLISHER = sanitizeText(process.env.GOOGLE_CLOUD_PUBLISHER, 40) || 'google';
const MODEL = sanitizeText(process.env.GOOGLE_CLOUD_MODEL, 120) || 'imagen-3.0-generate-002';
const GOOGLE_APPLICATION_CREDENTIALS = sanitizeText(resolveGoogleApplicationCredentials(), 400);
const AUTH_JWT_SECRET = sanitizeText(process.env.AUTH_JWT_SECRET, 200) || 'atelier-local-dev-secret';
const GOOGLE_CLIENT_ID = sanitizeText(process.env.GOOGLE_CLIENT_ID, 200);
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS ||
  'http://localhost:5173,https://el-atelier-artesanal.netlify.app')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const QUOTES_DIR = path.join(__dirname, '..', 'data');
const QUOTES_FILE = path.join(QUOTES_DIR, 'quote-requests.ndjson');
const REGISTRATIONS_FILE = path.join(QUOTES_DIR, 'design-registrations.ndjson');
const GENERATIONS_FILE = path.join(QUOTES_DIR, 'design-generations.ndjson');
const APPOINTMENTS_FILE = path.join(QUOTES_DIR, 'appointment-requests.ndjson');
const allowedOrigins = new Set(FRONTEND_ORIGINS);
const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  ...(GOOGLE_APPLICATION_CREDENTIALS ? { keyFilename: GOOGLE_APPLICATION_CREDENTIALS } : {}),
});
const googleOAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function isLocalFrontendOrigin(origin) {
  return /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i.test(String(origin || '').trim());
}

function ensureQuoteStore() {
  if (!fs.existsSync(QUOTES_DIR)) {
    fs.mkdirSync(QUOTES_DIR, { recursive: true });
  }

  if (!fs.existsSync(QUOTES_FILE)) {
    fs.writeFileSync(QUOTES_FILE, '', 'utf8');
  }

  if (!fs.existsSync(REGISTRATIONS_FILE)) {
    fs.writeFileSync(REGISTRATIONS_FILE, '', 'utf8');
  }

  if (!fs.existsSync(GENERATIONS_FILE)) {
    fs.writeFileSync(GENERATIONS_FILE, '', 'utf8');
  }

  if (!fs.existsSync(APPOINTMENTS_FILE)) {
    fs.writeFileSync(APPOINTMENTS_FILE, '', 'utf8');
  }
}

function readNdjsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function getAccountGenerations(email) {
  const databaseStatus = getDatabaseStatus();

  if (databaseStatus.ready) {
    return listGenerationsByEmail(email, 12);
  }

  return readNdjsonFile(GENERATIONS_FILE)
    .filter((item) => String(item.registrantEmail || '').toLowerCase() === String(email || '').toLowerCase())
    .slice(-12)
    .reverse();
}

async function getAccountQuotes(email) {
  const databaseStatus = getDatabaseStatus();

  if (databaseStatus.ready) {
    return listQuotesByEmail(email, 12);
  }

  return readNdjsonFile(QUOTES_FILE)
    .filter((item) => String(item.email || '').toLowerCase() === String(email || '').toLowerCase())
    .slice(-12)
    .reverse()
    .map((item) => ({
      ...item,
      status: item.status || 'received',
      updatedAt: item.updatedAt || '',
    }));
}

async function getAccountAppointments(email) {
  const databaseStatus = getDatabaseStatus();

  if (databaseStatus.ready) {
    return listAppointmentsByEmail(email, 12);
  }

  return readNdjsonFile(APPOINTMENTS_FILE)
    .filter((item) => String(item.email || '').toLowerCase() === String(email || '').toLowerCase())
    .slice(-12)
    .reverse()
    .map((item) => ({
      ...item,
      status: item.status || 'pending',
      updatedAt: item.updatedAt || '',
    }));
}

function getTopValue(values) {
  const counts = new Map();

  values.filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || '';
}

function inferCollectionSlugFromText(value) {
  const normalized = sanitizeText(value, 120).toLowerCase();

  if (normalized.includes('anillo')) return 'anillos';
  if (normalized.includes('arete') || normalized.includes('topo') || normalized.includes('argolla')) return 'aretes';
  if (normalized.includes('cadena') || normalized.includes('collar')) return 'cadenas';
  if (normalized.includes('pulsera') || normalized.includes('brazalete')) return 'pulseras';
  return '';
}

async function buildAssistantAccountContext(user) {
  if (!user?.userId || !user?.email) {
    return {
      summaryLine: '',
      topCollectionSlug: '',
      topOccasion: '',
      favoriteCollections: [],
      favorites: [],
      savedDesigns: [],
      quotes: [],
      appointments: [],
    };
  }

  const favorites = await listFavorites(user.userId);
  const savedDesigns = await listSavedDesigns(user.userId);
  const quotes = await getAccountQuotes(user.email);
  const appointments = await getAccountAppointments(user.email);

  const favoriteCollections = favorites
    .map((item) => sanitizeText(item.slug || '', 80))
    .filter(Boolean);

  const topCollectionSlug = getTopValue([
    ...favoriteCollections,
    ...savedDesigns.map((item) => inferCollectionSlugFromText(item.category || item.title || '')),
    ...quotes.map((item) => inferCollectionSlugFromText(item.category || item.designName || '')),
  ]);
  const topOccasion = getTopValue([
    ...savedDesigns.map((item) => sanitizeText(item.occasion, 80)),
    ...quotes.map((item) => sanitizeText(item.occasion, 80)),
  ]);

  const summaryBits = [];

  if (favorites.length) {
    summaryBits.push(`${favorites.length} favoritos guardados`);
  }

  if (savedDesigns.length) {
    summaryBits.push(`${savedDesigns.length} disenos guardados`);
  }

  if (quotes.length) {
    summaryBits.push(`${quotes.length} cotizaciones previas`);
  }

  if (appointments.length) {
    summaryBits.push(`${appointments.length} citas registradas`);
  }

  return {
    summaryLine: summaryBits.length
      ? `Cliente autenticado con ${summaryBits.join(', ')}.`
      : 'Cliente autenticado sin historial previo visible.',
    topCollectionSlug,
    topOccasion,
    favoriteCollections: favoriteCollections.slice(0, 4),
    favorites: favorites.slice(0, 4).map((item) => ({
      name: item.name,
      reference: item.reference,
      slug: item.slug,
      category: item.category,
    })),
    savedDesigns: savedDesigns.slice(0, 3).map((item) => ({
      title: item.title,
      category: item.category,
      occasion: item.occasion,
      reference: item.reference,
      prompt: item.prompt,
    })),
    quotes: quotes.slice(0, 3).map((item) => ({
      quoteId: item.quoteId,
      title: item.designName || item.category || 'Solicitud personalizada',
      status: item.status,
      occasion: item.occasion,
      budget: item.budget,
    })),
    appointments: appointments.slice(0, 2).map((item) => ({
      appointmentId: item.appointmentId,
      reason: item.reason,
      status: item.status,
      preferredDate: item.preferredDate,
    })),
  };
}

function buildAssistantMemory(baseMemory, reply) {
  const seed = {
    occasion: sanitizeText(baseMemory?.occasion, 80),
    jewelryType: sanitizeText(baseMemory?.jewelryType, 80),
    budget: sanitizeText(baseMemory?.budget, 120),
    style: sanitizeText(baseMemory?.style, 80),
    lastIntent: sanitizeText(baseMemory?.lastIntent, 80),
    lastCollectionSlug: sanitizeText(baseMemory?.lastCollectionSlug, 80),
  };

  return {
    occasion: sanitizeText(reply?.memory?.occasion, 80) || seed.occasion,
    jewelryType: sanitizeText(reply?.memory?.jewelryType, 80) || seed.jewelryType,
    budget: sanitizeText(reply?.memory?.budget, 120) || seed.budget,
    style: sanitizeText(reply?.memory?.style, 80) || seed.style,
    lastIntent: sanitizeText(reply?.memory?.lastIntent, 80) || sanitizeText(reply?.detectedIntent, 80) || seed.lastIntent,
    lastCollectionSlug:
      sanitizeText(reply?.memory?.lastCollectionSlug, 80)
      || sanitizeText(reply?.suggestedAction?.collectionSlug, 80)
      || seed.lastCollectionSlug,
  };
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return request.socket.remoteAddress || 'unknown';
}

function createRateLimiter(windowMs, maxRequests) {
  const store = new Map();

  return (request, response, next) => {
    const ip = getClientIp(request);
    const now = Date.now();
    const entries = store.get(ip) || [];
    const validEntries = entries.filter((entry) => now - entry < windowMs);

    validEntries.push(now);
    store.set(ip, validEntries);

    if (validEntries.length > maxRequests) {
      return response.status(429).json({
        error: 'Demasiadas solicitudes en poco tiempo. Intenta de nuevo en unos minutos.',
      });
    }

    return next();
  };
}

function isImageGenerationConfigured() {
  return Boolean(GOOGLE_APPLICATION_CREDENTIALS && PROJECT_ID);
}

function validateGeneratePayload(body) {
  const payload = {
    registrantId: sanitizeText(body.registrantId, 80),
    registrantName: sanitizeText(body.registrantName, 120),
    registrantEmail: sanitizeText(body.registrantEmail, 160),
    registrantWhatsapp: sanitizeText(body.registrantWhatsapp, 40),
    prompt: sanitizeText(body.prompt, 1400),
    category: sanitizeText(body.category, 80),
    designName: sanitizeText(body.designName, 120),
    metal: sanitizeText(body.metal, 120),
    gemstone: sanitizeText(body.gemstone, 120),
    style: sanitizeText(body.style, 120),
    occasion: sanitizeText(body.occasion, 120),
    silhouette: sanitizeText(body.silhouette, 120),
    detailLevel: sanitizeText(body.detailLevel, 120),
    reference: sanitizeText(body.reference, 80),
    backgroundMood: sanitizeText(body.backgroundMood, 120),
    cameraAngle: sanitizeText(body.cameraAngle, 120),
    renderIntent: sanitizeText(body.renderIntent, 120),
  };

  const signal = [
    payload.prompt,
    payload.category,
    payload.designName,
    payload.metal,
    payload.gemstone,
    payload.style,
    payload.occasion,
    payload.silhouette,
    payload.detailLevel,
    payload.cameraAngle,
    payload.renderIntent,
  ]
    .join(' ')
    .trim();

  if (signal.length < 16) {
    throw new Error('Necesitamos un brief un poco mas claro para generar una joya convincente.');
  }

  if (!payload.registrantId) {
    throw new Error('Debes completar el registro antes de generar una joya.');
  }

  if (!payload.registrantName || payload.registrantName.length < 2) {
    throw new Error('Debes registrarte con tu nombre antes de generar.');
  }

  if (!payload.registrantEmail.includes('@')) {
    throw new Error('Debes registrarte con un email valido antes de generar.');
  }

  return payload;
}

function validateRegistrationPayload(body) {
  const payload = {
    fullName: sanitizeText(body.fullName, 120),
    email: sanitizeText(body.email, 160),
    whatsapp: sanitizeText(body.whatsapp, 40),
    city: sanitizeText(body.city, 120),
    occasion: sanitizeText(body.occasion, 120),
    interest: sanitizeText(body.interest, 120),
    notes: sanitizeText(body.notes, 600),
    marketingConsent: Boolean(body.marketingConsent),
  };

  if (!payload.fullName || payload.fullName.length < 2) {
    throw new Error('Ingresa tu nombre para continuar.');
  }

  if (!payload.email.includes('@')) {
    throw new Error('Ingresa un email valido para continuar.');
  }

  if (!payload.whatsapp || payload.whatsapp.length < 7) {
    throw new Error('Ingresa un WhatsApp valido para continuar.');
  }

  return payload;
}

function validateUserRegistrationPayload(body) {
  const payload = {
    fullName: sanitizeText(body.fullName, 120),
    email: sanitizeText(body.email, 160),
    password: String(body.password || '').trim(),
    whatsapp: sanitizeText(body.whatsapp, 40),
  };

  if (!payload.fullName || payload.fullName.length < 2) {
    throw new Error('Ingresa tu nombre para crear la cuenta.');
  }

  if (!payload.email.includes('@')) {
    throw new Error('Ingresa un email valido para crear la cuenta.');
  }

  if (payload.password.length < 6) {
    throw new Error('La contrasena debe tener al menos 6 caracteres.');
  }

  if (!payload.whatsapp || payload.whatsapp.length < 7) {
    throw new Error('Ingresa un WhatsApp valido para crear la cuenta.');
  }

  return payload;
}

function validateLoginPayload(body) {
  const payload = {
    email: sanitizeText(body.email, 160),
    password: String(body.password || '').trim(),
  };

  if (!payload.email.includes('@')) {
    throw new Error('Ingresa un email valido.');
  }

  if (!payload.password) {
    throw new Error('Ingresa tu contrasena.');
  }

  return payload;
}

function validateGoogleAuthPayload(body) {
  const credential = String(body.credential || '').trim();

  if (!credential) {
    throw new Error('No recibimos la credencial de Google.');
  }

  if (!googleOAuthClient || !GOOGLE_CLIENT_ID) {
    throw new Error('Google login no esta configurado todavia en el servidor.');
  }

  return credential;
}

function validateFavoritePayload(body) {
  const payload = {
    category: sanitizeText(body.category, 80),
    name: sanitizeText(body.name, 160),
    image: sanitizeText(body.image, 400),
    reference: sanitizeText(body.reference, 80),
    slug: sanitizeText(body.slug, 80),
  };

  if (!payload.name || !payload.image) {
    throw new Error('La pieza no tiene informacion suficiente para guardarse en favoritos.');
  }

  return payload;
}

function validateCartPayload(body) {
  const payload = {
    category: sanitizeText(body.category, 80),
    name: sanitizeText(body.name, 160),
    image: sanitizeText(body.image, 400),
    reference: sanitizeText(body.reference, 80),
    slug: sanitizeText(body.slug, 80),
    notes: sanitizeText(body.notes, 400),
  };

  if (!payload.name || !payload.image) {
    throw new Error('La pieza no tiene informacion suficiente para entrar a la canasta.');
  }

  return payload;
}

function validateSavedDesignPayload(body) {
  const payload = {
    title: sanitizeText(body.title, 160),
    imageDataUrl: sanitizeText(body.imageDataUrl, 2000000),
    prompt: sanitizeText(body.prompt, 4000),
    category: sanitizeText(body.category, 80),
    metal: sanitizeText(body.metal, 120),
    gemstone: sanitizeText(body.gemstone, 120),
    style: sanitizeText(body.style, 120),
    occasion: sanitizeText(body.occasion, 120),
    reference: sanitizeText(body.reference, 80),
  };

  if (!payload.title || !payload.imageDataUrl) {
    throw new Error('Necesitamos nombre e imagen para guardar el diseno.');
  }

  return payload;
}

function validateAssistantPayload(body) {
  const message = sanitizeText(body.message, 500);
  const conversation = Array.isArray(body.conversation)
    ? body.conversation
        .slice(-10)
        .map((entry) => ({
          role: entry?.role === 'assistant' ? 'assistant' : 'user',
          text: sanitizeText(entry?.text, 400),
        }))
        .filter((entry) => entry.text)
    : [];
  const memory = body.memory && typeof body.memory === 'object'
    ? {
        occasion: sanitizeText(body.memory.occasion, 80),
        jewelryType: sanitizeText(body.memory.jewelryType, 80),
        budget: sanitizeText(body.memory.budget, 120),
        style: sanitizeText(body.memory.style, 80),
        lastIntent: sanitizeText(body.memory.lastIntent, 80),
        lastCollectionSlug: sanitizeText(body.memory.lastCollectionSlug, 80),
      }
    : {
        occasion: '',
        jewelryType: '',
        budget: '',
        style: '',
        lastIntent: '',
        lastCollectionSlug: '',
      };

  if (!message || message.length < 2) {
    throw new Error('Escribe un mensaje para que la asesora pueda orientarte.');
  }

  return {
    message,
    conversation,
    memory,
  };
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    whatsapp: user.whatsapp,
    googleLinked: Boolean(user.googleSub),
    createdAt: user.createdAt,
  };
}

function createAuthToken(user) {
  return jwt.sign(
    {
      sub: user.userId,
      email: user.email,
    },
    AUTH_JWT_SECRET,
    {
      expiresIn: '30d',
    },
  );
}

async function authenticateRequest(request, response, next) {
  try {
    const authorization = String(request.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

    if (!token) {
      return response.status(401).json({ error: 'Necesitas iniciar sesion para continuar.' });
    }

    const decoded = jwt.verify(token, AUTH_JWT_SECRET);
    const user = await findUserById(decoded.sub);

    if (!user) {
      return response.status(401).json({ error: 'La sesion ya no es valida. Inicia sesion nuevamente.' });
    }

    request.user = user;
    return next();
  } catch (error) {
    return response.status(401).json({ error: 'La sesion no es valida o vencio.' });
  }
}

async function getOptionalAuthenticatedUser(request) {
  try {
    const authorization = String(request.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, AUTH_JWT_SECRET);
    return await findUserById(decoded.sub);
  } catch {
    return null;
  }
}

function buildGoogleTempPassword() {
  return crypto.randomBytes(12).toString('hex');
}

function getCategoryDirection(category) {
  const normalized = category.toLowerCase();

  if (normalized.includes('anillo')) {
    return 'Mostrar un solo anillo heroico, con lectura clara del aro completo, la cabeza principal y el engaste. Priorizar una posicion elegante de tres cuartos y proporcion refinada de alta joyeria.';
  }

  if (normalized.includes('arete')) {
    return 'Mostrar el par de aretes de forma simetrica, bien separado y perfectamente alineado. Deben leerse como una pareja premium, sin deformaciones ni diferencias entre lado izquierdo y derecho.';
  }

  if (normalized.includes('pulsera') || normalized.includes('brazalete')) {
    return 'Mostrar la pulsera cerrada o semiabierta en forma limpia y creible, con una silueta continua y proporcion realista de joyeria terminada.';
  }

  if (normalized.includes('cadena') || normalized.includes('collar')) {
    return 'Mostrar la cadena o collar con una caida elegante, limpia y ordenada, evitando nudos, cruces confusos o composiciones enredadas.';
  }

  return 'Mostrar una sola pieza heroica, completamente visible, con composicion de producto premium y lectura clara de forma, material y acabados.';
}

function getStyleDirection(style) {
  const normalized = style.toLowerCase();

  if (normalized.includes('minimalista')) {
    return 'Mantener lineas limpias, proporciones contenidas y una presencia sofisticada sin exceso de ornamento.';
  }

  if (normalized.includes('romantico')) {
    return 'Favorecer curvas suaves, delicadeza visual y una lectura refinada, femenina y luminosa.';
  }

  if (normalized.includes('statement')) {
    return 'Dar protagonismo a la presencia escultorica, volumen controlado y un lenguaje de lujo llamativo pero creible.';
  }

  if (normalized.includes('vintage')) {
    return 'Sugerir una elegancia clasica inspirada en alta joyeria atemporal, con detalle fino y acabado noble.';
  }

  if (normalized.includes('organico')) {
    return 'Usar curvas naturales, transiciones suaves y una sensacion escultorica contemporanea.';
  }

  return 'Mantener una direccion de alta joyeria sobria, elegante y muy bien proporcionada.';
}

function getMetalDirection(metal) {
  const normalized = metal.toLowerCase();

  if (normalized.includes('oro blanco')) {
    return 'El metal debe verse como oro blanco autentico, con brillo frio, reflejos controlados y aspecto de joya fina de gran calidad.';
  }

  if (normalized.includes('oro rosado')) {
    return 'El metal debe leerse claramente como oro rosado noble, con calidez suave y acabado premium.';
  }

  if (normalized.includes('plata')) {
    return 'El metal debe parecer plata premium o platino visual, con reflejo sobrio y textura limpia.';
  }

  if (normalized.includes('bicolor')) {
    return 'La combinacion bicolor debe verse intencional, armoniosa y perfectamente resuelta, sin cortes toscos entre metales.';
  }

  return 'El metal debe parecer oro amarillo fino, rico en tono, con pulido premium y reflejos elegantes.';
}

function getGemstoneDirection(gemstone) {
  const normalized = gemstone.toLowerCase();

  if (normalized.includes('diam')) {
    return 'Las piedras deben verse como diamantes reales, con chispa controlada, facetado creible y brillo fino, nunca exagerado.';
  }

  if (normalized.includes('esmeralda')) {
    return 'La piedra debe leerse como esmeralda natural de alta gama, con verde profundo, elegancia y transparencia creible.';
  }

  if (normalized.includes('zaf')) {
    return 'La piedra debe parecer zafiro noble, con azul profundo, lujo sobrio y talla realista.';
  }

  if (normalized.includes('rub')) {
    return 'La piedra debe parecer rubi fino, con rojo profundo, saturacion rica y alto nivel de joyeria.';
  }

  if (normalized.includes('perla')) {
    return 'La perla debe verse natural, luminosa, con lustre delicado y acabado de joya premium.';
  }

  if (normalized.includes('sin piedras')) {
    return 'La pieza no debe incluir piedras visibles; el protagonismo debe recaer en la forma, el metal y el acabado.';
  }

  return 'Si hay piedras, deben verse autenticas, finas y coherentes con una pieza de alta joyeria.';
}

function getRenderIntentDirection(renderIntent) {
  const normalized = renderIntent.toLowerCase();

  if (normalized.includes('catalogo')) {
    return 'La imagen debe sentirse como fotografia de catalogo premium: limpia, centrada, elegante y muy clara para venta.';
  }

  if (normalized.includes('campana')) {
    return 'La imagen debe sentirse como una campana editorial de alta joyeria, con atmosfera refinada pero manteniendo total legibilidad del producto.';
  }

  if (normalized.includes('macro')) {
    return 'La toma debe priorizar sensacion de detalle fino, microtextura de metal y nitidez de engastes sin perder la lectura general de la pieza.';
  }

  return 'La imagen debe equilibrar presencia comercial, elegancia editorial y lectura precisa del producto.';
}

function getCameraAngleDirection(cameraAngle) {
  const normalized = cameraAngle.toLowerCase();

  if (normalized.includes('frontal')) {
    return 'Usar una vista frontal limpia y simetrica, ideal para leer el diseno principal de la joya.';
  }

  if (normalized.includes('tres cuartos')) {
    return 'Usar un angulo de tres cuartos para dar profundidad, lujo y mejor lectura del volumen.';
  }

  if (normalized.includes('superior')) {
    return 'Usar una vista superior controlada, limpia y precisa, sin deformaciones de perspectiva.';
  }

  if (normalized.includes('detalle')) {
    return 'Usar un encuadre cercano o macro elegante, resaltando acabados, piedras y texturas de manera premium.';
  }

  return 'Usar un angulo de producto premium con perspectiva refinada y lectura clara de forma y volumen.';
}

function validateQuotePayload(body) {
  const payload = {
    registrantId: sanitizeText(body.registrantId, 80),
    clientName: sanitizeText(body.clientName, 120),
    email: sanitizeText(body.email, 160),
    whatsapp: sanitizeText(body.whatsapp, 40),
    preferredContact: sanitizeText(body.preferredContact, 30) || 'whatsapp',
    budget: sanitizeText(body.budget, 120),
    timeline: sanitizeText(body.timeline, 120),
    notes: sanitizeText(body.notes, 1200),
    prompt: sanitizeText(body.prompt, 1400),
    category: sanitizeText(body.category, 80),
    designName: sanitizeText(body.designName, 120),
    preferredMetal: sanitizeText(body.preferredMetal, 120),
    preferredStone: sanitizeText(body.preferredStone, 120),
    style: sanitizeText(body.style, 120),
    occasion: sanitizeText(body.occasion, 120),
    reference: sanitizeText(body.reference, 80),
    hasGeneratedPreview: Boolean(body.hasGeneratedPreview),
  };

  if (!payload.clientName || payload.clientName.length < 2) {
    throw new Error('Necesitamos el nombre del cliente para registrar la cotizacion.');
  }

  if (!payload.email.includes('@')) {
    throw new Error('Ingresa un email valido para continuar.');
  }

  if (!payload.whatsapp || payload.whatsapp.length < 7) {
    throw new Error('Ingresa un numero o contacto de WhatsApp valido.');
  }

  if (!payload.prompt || payload.prompt.length < 16) {
    throw new Error('La solicitud necesita un brief creativo mas claro.');
  }

  return payload;
}

function validateAppointmentPayload(body) {
  const payload = {
    clientName: sanitizeText(body.clientName, 120),
    email: sanitizeText(body.email, 160),
    whatsapp: sanitizeText(body.whatsapp, 40),
    preferredDate: sanitizeText(body.preferredDate, 20),
    preferredSlot: sanitizeText(body.preferredSlot, 80),
    reason: sanitizeText(body.reason, 160),
    notes: sanitizeText(body.notes, 1000),
    source: sanitizeText(body.source, 80) || 'web-bot',
  };

  if (!payload.clientName || payload.clientName.length < 2) {
    throw new Error('Necesitamos tu nombre para agendar la cita.');
  }

  if (!payload.email.includes('@')) {
    throw new Error('Ingresa un email valido para la cita.');
  }

  if (!payload.whatsapp || payload.whatsapp.length < 7) {
    throw new Error('Ingresa un WhatsApp valido para la cita.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.preferredDate)) {
    throw new Error('Selecciona una fecha valida para la cita.');
  }

  if (!payload.preferredSlot) {
    throw new Error('Selecciona un horario preferido.');
  }

  if (!payload.reason) {
    throw new Error('Cuentanos brevemente el motivo de la cita.');
  }

  return payload;
}

function buildVisualPrompt(payload) {
  const creativeContext = [
    payload.category ? `Tipo de joya: ${payload.category}.` : '',
    payload.designName ? `Pieza o referencia base: ${payload.designName}.` : '',
    payload.reference ? `Referencia interna: ${payload.reference}.` : '',
    payload.metal ? `Metal principal: ${payload.metal}.` : '',
    payload.gemstone ? `Piedra o acento principal: ${payload.gemstone}.` : '',
    payload.style ? `Estilo deseado: ${payload.style}.` : '',
    payload.silhouette ? `Silueta o estructura: ${payload.silhouette}.` : '',
    payload.detailLevel ? `Detalle protagonista: ${payload.detailLevel}.` : '',
    payload.occasion ? `Ocasion de uso: ${payload.occasion}.` : '',
    payload.backgroundMood ? `Ambiente visual sugerido: ${payload.backgroundMood}.` : '',
    payload.cameraAngle ? `Angulo deseado: ${payload.cameraAngle}.` : '',
    payload.renderIntent ? `Intencion del render: ${payload.renderIntent}.` : '',
    payload.prompt ? `Brief del cliente: ${payload.prompt}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return [
    'Fotografia editorial ultra realista de una sola joya de lujo.',
    'La pieza debe verse viable para produccion real, con proporciones creibles, material noble y acabados premium.',
    'Mostrar solamente la joya, completa, centrada y totalmente visible.',
    'Sin manos, sin rostro, sin modelo humano, sin caja, sin soporte, sin collage, sin texto, sin marca de agua y sin elementos extra.',
    'Iluminacion de estudio suave, fondo oscuro refinado, textura autentica del metal precioso, reflejos controlados, nitidez alta y look de alta joyeria para e-commerce premium.',
    'Evitar aspecto fantasioso, caricaturesco o visualmente imposible.',
    getCategoryDirection(payload.category || ''),
    getStyleDirection(payload.style || ''),
    getMetalDirection(payload.metal || ''),
    getGemstoneDirection(payload.gemstone || ''),
    getRenderIntentDirection(payload.renderIntent || ''),
    getCameraAngleDirection(payload.cameraAngle || ''),
    creativeContext,
  ]
    .filter(Boolean)
    .join(' ');
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractImageBase64(predictions) {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return '';
  }

  const firstPrediction = predictions[0];
  return (
    firstPrediction?.bytesBase64Encoded ||
    firstPrediction?.image?.bytesBase64Encoded ||
    firstPrediction?.images?.[0]?.bytesBase64Encoded ||
    ''
  );
}

async function getGoogleAccessToken() {
  const client = await googleAuth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error('No fue posible obtener un access token de Google Cloud.');
  }

  return token;
}

async function generateImageWithVertex(prompt) {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/${PUBLISHER}/models/${MODEL}:predict`;
  const token = await getGoogleAccessToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      instances: [
        {
          prompt,
        },
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        personGeneration: 'dont_allow',
        enhancePrompt: true,
      },
    }),
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      'Vertex AI no pudo generar la imagen con la configuracion actual.';
    throw new Error(message);
  }

  const imageBase64 = extractImageBase64(payload?.predictions);

  if (!imageBase64) {
    throw new Error('Vertex AI no devolvio una imagen valida.');
  }

  return {
    imageBase64,
    rawPayload: payload,
  };
}

function buildQuoteId() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(2, 12);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `EA-${timestamp}-${suffix}`;
}

function buildRegistrantId() {
  return `REG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function buildAppointmentId() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(2, 12);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `APT-${timestamp}-${suffix}`;
}

async function persistQuote(record) {
  ensureQuoteStore();
  const databaseStatus = getDatabaseStatus();

  if (databaseStatus.ready) {
    await persistQuoteToDatabase(record);
    return;
  }

  await fs.promises.appendFile(QUOTES_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

async function persistRegistration(record) {
  ensureQuoteStore();
  const databaseStatus = getDatabaseStatus();

  if (databaseStatus.ready) {
    await persistRegistrationToDatabase(record);
    return;
  }

  await fs.promises.appendFile(REGISTRATIONS_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

async function persistGeneration(record) {
  ensureQuoteStore();
  const databaseStatus = getDatabaseStatus();

  if (databaseStatus.ready) {
    await persistGenerationToDatabase(record);
    return;
  }

  await fs.promises.appendFile(GENERATIONS_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

async function persistAppointment(record) {
  ensureQuoteStore();
  const databaseStatus = getDatabaseStatus();

  if (databaseStatus.ready) {
    await persistAppointmentToDatabase(record);
    return;
  }

  await fs.promises.appendFile(APPOINTMENTS_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

app.use((request, response, next) => {
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isLocalFrontendOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origen no autorizado por CORS.'));
    },
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/', (request, response) => {
  response.json({
    service: 'El Atelier Artesanal API',
    status: 'ok',
    provider: 'vertex-ai',
  });
});

app.get('/api/public-config', (request, response) => {
  response.json({
    googleClientId: GOOGLE_CLIENT_ID || '',
    googleSignInEnabled: Boolean(GOOGLE_CLIENT_ID),
  });
});

app.get('/api/health', (request, response) => {
  const databaseStatus = getDatabaseStatus();
  const userStoreStatus = getUserStoreStatus();

  response.json({
    status: 'ok',
    provider: 'vertex-ai',
    model: MODEL,
    projectId: PROJECT_ID,
    storageMode: databaseStatus.ready ? 'postgresql' : 'ndjson-fallback',
    databaseConfigured: databaseStatus.configured,
    databaseReady: databaseStatus.ready,
    databaseLastError: databaseStatus.lastError || '',
    userStorageMode: userStoreStatus.mode,
    userDualWriteFile: userStoreStatus.dualWriteFile,
    userFileFallbackReads: userStoreStatus.fileFallbackReads,
    quoteStoreReady: fs.existsSync(QUOTES_FILE),
    registrationStoreReady: fs.existsSync(REGISTRATIONS_FILE),
    generationStoreReady: fs.existsSync(GENERATIONS_FILE),
    appointmentStoreReady: fs.existsSync(APPOINTMENTS_FILE),
    imageGenerationReady: isImageGenerationConfigured(),
    assistantAiConfigured: isAssistantConfigured(),
  });
});

app.get('/api/assistant/context', authenticateRequest, async (request, response, next) => {
  try {
    const memory = (await getAssistantMemoryByUserId(request.user.userId)) || buildAssistantMemory({}, {});
    const accountContext = await buildAssistantAccountContext(request.user);

    return response.json({
      profile: toPublicUser(request.user),
      memory,
      accountContext,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/assistant/chat', createRateLimiter(10 * 60 * 1000, 40), async (request, response, next) => {
  try {
    const payload = validateAssistantPayload(request.body);
    const requestUser = await getOptionalAuthenticatedUser(request);
    const persistedMemory = requestUser ? await getAssistantMemoryByUserId(requestUser.userId) : null;
    const accountContext = requestUser ? await buildAssistantAccountContext(requestUser) : null;
    const reply = await createAssistantReply({
      ...payload,
      persistentMemory: persistedMemory,
      accountContext,
      profile: requestUser ? toPublicUser(requestUser) : null,
    });
    const nextMemory = buildAssistantMemory({ ...persistedMemory, ...payload.memory }, reply);

    if (requestUser) {
      await upsertAssistantMemory({
        userId: requestUser.userId,
        ...nextMemory,
        updatedAt: new Date().toISOString(),
      });
    }

    return response.json({
      ...reply,
      memory: nextMemory,
      accountContext: accountContext || undefined,
      isPersonalized: Boolean(requestUser),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/register', createRateLimiter(60 * 60 * 1000, 20), async (request, response, next) => {
  try {
    const payload = validateUserRegistrationPayload(request.body);
    const existingUser = await findUserByEmail(payload.email);

    if (existingUser) {
      return response.status(409).json({
        error: 'Ya existe una cuenta con este email. Intenta iniciar sesion.',
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await createUser({
      fullName: payload.fullName,
      email: payload.email,
      whatsapp: payload.whatsapp,
      passwordHash,
      googleSub: '',
    });

    const token = createAuthToken(user);

    return response.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', createRateLimiter(30 * 60 * 1000, 30), async (request, response, next) => {
  try {
    const payload = validateLoginPayload(request.body);
    const user = await findUserByEmail(payload.email);

    if (!user || !user.passwordHash) {
      return response.status(401).json({ error: 'Email o contrasena invalidos.' });
    }

    const isMatch = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isMatch) {
      return response.status(401).json({ error: 'Email o contrasena invalidos.' });
    }

    const token = createAuthToken(user);

    return response.json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/google', createRateLimiter(30 * 60 * 1000, 30), async (request, response, next) => {
  try {
    const credential = validateGoogleAuthPayload(request.body);
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const googlePayload = ticket.getPayload();

    if (!googlePayload?.email || !googlePayload?.sub) {
      throw new Error('No fue posible validar el perfil de Google.');
    }

    let user = await findUserByGoogleSub(googlePayload.sub);

    if (!user) {
      const byEmail = await findUserByEmail(googlePayload.email);

      if (byEmail) {
        user = await updateUser(byEmail.userId, {
          googleSub: googlePayload.sub,
          fullName: byEmail.fullName || googlePayload.name || googlePayload.email,
        });
      } else {
        user = await createUser({
          fullName: googlePayload.name || googlePayload.email,
          email: googlePayload.email,
          whatsapp: '',
          passwordHash: await bcrypt.hash(buildGoogleTempPassword(), 10),
          googleSub: googlePayload.sub,
        });
      }
    }

    const token = createAuthToken(user);

    return response.json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', authenticateRequest, async (request, response) => {
  response.json({
    user: toPublicUser(request.user),
  });
});

app.get('/api/account/overview', authenticateRequest, async (request, response) => {
  const favorites = await listFavorites(request.user.userId);
  const cart = await listCartItems(request.user.userId);
  const savedDesigns = await listSavedDesigns(request.user.userId);
  const generations = await getAccountGenerations(request.user.email);
  const quotes = await getAccountQuotes(request.user.email);
  const appointments = await getAccountAppointments(request.user.email);

  const activeProjects = [
    ...savedDesigns.map((item) => ({
      kind: 'saved-design',
      key: item.designId,
      title: item.title,
      subtitle: item.category || 'Joya personalizada',
      reference: item.reference || '',
      status: 'draft',
      createdAt: item.createdAt || '',
      prompt: item.prompt || '',
    })),
    ...quotes.map((item) => ({
      kind: 'quote',
      key: item.quoteId,
      title: item.designName || item.category || 'Solicitud personalizada',
      subtitle: item.reference || item.occasion || 'Cotizacion enviada',
      reference: item.quoteId,
      status: item.status || 'received',
      createdAt: item.createdAt || '',
      prompt: item.prompt || '',
    })),
  ]
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    .slice(0, 8);

  response.json({
    profile: toPublicUser(request.user),
    favorites,
    cart,
    savedDesigns,
    generations,
    quotes,
    appointments,
    activeProjects,
    stats: {
      favorites: favorites.length,
      cart: cart.length,
      savedDesigns: savedDesigns.length,
      generations: generations.length,
      quotes: quotes.length,
      appointments: appointments.length,
      activeProjects: activeProjects.length,
    },
  });
});

app.get('/api/account/favorites', authenticateRequest, async (request, response) => {
  response.json({
    items: await listFavorites(request.user.userId),
  });
});

app.post('/api/account/favorites', authenticateRequest, async (request, response, next) => {
  try {
    const payload = validateFavoritePayload(request.body);
    const favorite = await addFavorite({
      userId: request.user.userId,
      ...payload,
    });

    response.status(201).json({ item: favorite });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/account/favorites/:favoriteId', authenticateRequest, async (request, response, next) => {
  try {
    await removeFavorite(request.user.userId, request.params.favoriteId);
    response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/account/cart', authenticateRequest, async (request, response) => {
  response.json({
    items: await listCartItems(request.user.userId),
  });
});

app.post('/api/account/cart', authenticateRequest, async (request, response, next) => {
  try {
    const payload = validateCartPayload(request.body);
    const item = await addCartItem({
      userId: request.user.userId,
      ...payload,
    });

    response.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/account/cart/:cartItemId', authenticateRequest, async (request, response, next) => {
  try {
    await removeCartItem(request.user.userId, request.params.cartItemId);
    response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/account/saved-designs', authenticateRequest, async (request, response) => {
  response.json({
    items: await listSavedDesigns(request.user.userId),
  });
});

app.post('/api/account/saved-designs', authenticateRequest, async (request, response, next) => {
  try {
    const payload = validateSavedDesignPayload(request.body);
    const item = await addSavedDesign({
      userId: request.user.userId,
      ...payload,
    });

    response.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/account/saved-designs/:designId', authenticateRequest, async (request, response, next) => {
  try {
    await removeSavedDesign(request.user.userId, request.params.designId);
    response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.post('/api/design-registrations', createRateLimiter(60 * 60 * 1000, 30), async (request, response, next) => {
  try {
    const payload = validateRegistrationPayload(request.body);
    const registrantId = buildRegistrantId();
    const createdAt = new Date().toISOString();
    const record = {
      registrantId,
      createdAt,
      ...payload,
      sourceIp: getClientIp(request),
    };

    await persistRegistration(record);

    return response.status(201).json({
      registrantId,
      fullName: payload.fullName,
      email: payload.email,
      whatsapp: payload.whatsapp,
      city: payload.city,
      occasion: payload.occasion,
      interest: payload.interest,
      marketingConsent: payload.marketingConsent,
      message: 'Registro completado. Ya puedes generar tu joya.',
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/generate-jewelry', createRateLimiter(10 * 60 * 1000, 10), async (request, response, next) => {
  try {
    if (!isImageGenerationConfigured()) {
      return response.status(503).json({
        error:
          'La generacion visual no esta configurada todavia. Falta GOOGLE_APPLICATION_CREDENTIALS o una credencial inline de Google Cloud.',
      });
    }

    const payload = validateGeneratePayload(request.body);
    const fullPrompt = buildVisualPrompt(payload);
    const result = await generateImageWithVertex(fullPrompt);

    await persistGeneration({
      generatedAt: new Date().toISOString(),
      registrantId: payload.registrantId,
      registrantName: payload.registrantName,
      registrantEmail: payload.registrantEmail,
      registrantWhatsapp: payload.registrantWhatsapp,
      category: payload.category,
      designName: payload.designName,
      metal: payload.metal,
      gemstone: payload.gemstone,
      style: payload.style,
      occasion: payload.occasion,
      renderIntent: payload.renderIntent,
      cameraAngle: payload.cameraAngle,
      silhouette: payload.silhouette,
      detailLevel: payload.detailLevel,
      backgroundMood: payload.backgroundMood,
      prompt: payload.prompt,
      promptUsed: fullPrompt,
      model: MODEL,
      provider: 'vertex-ai',
      sourceIp: getClientIp(request),
    });

    return response.json({
      imageBase64: result.imageBase64,
      promptUsed: fullPrompt,
      provider: 'vertex-ai',
      model: MODEL,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/quote-request', createRateLimiter(30 * 60 * 1000, 20), async (request, response, next) => {
  try {
    const payload = validateQuotePayload(request.body);
    const quoteId = buildQuoteId();
    const createdAt = new Date().toISOString();
    const record = {
      quoteId,
      createdAt,
      ...payload,
      sourceIp: getClientIp(request),
    };

    await persistQuote(record);

    return response.status(201).json({
      quoteId,
      message:
        'Recibimos tu solicitud y ya tenemos la referencia del proyecto. Te responderemos por el canal que indicaste.',
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/appointments', createRateLimiter(30 * 60 * 1000, 20), async (request, response, next) => {
  try {
    const payload = validateAppointmentPayload(request.body);
    const appointmentId = buildAppointmentId();
    const createdAt = new Date().toISOString();

    await persistAppointment({
      appointmentId,
      createdAt,
      ...payload,
      status: 'pending',
      sourceIp: getClientIp(request),
    });

    return response.status(201).json({
      appointmentId,
      message: 'Tu solicitud de cita quedo registrada. Te contactaremos para confirmar el horario.',
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, request, response, next) => {
  const status = error.message === 'Origen no autorizado por CORS.' ? 403 : 500;
  const safeMessage =
    status === 500
      ? error.message || 'Ocurrio un problema interno. Intenta nuevamente o revisa la configuracion del servidor.'
      : error.message;

  console.error('[server-error]', error);
  response.status(status).json({ error: safeMessage });
});

ensureQuoteStore();
ensureAccountStore();
initDatabase()
  .then(async () => {
    const migration = await migrateLegacyUsers();

    if (migration.attempted) {
      console.log(
        `[user-migration] migrated=${migration.migrated} skipped=${migration.skipped} mode=${getUserStoreStatus().mode}`,
      );
    }
  })
  .catch((error) => {
    console.error('[database-startup-error]', error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      const databaseStatus = getDatabaseStatus();
      const storageMode = databaseStatus.ready ? 'postgresql' : 'ndjson-fallback';
      console.log(`Servidor escuchando en el puerto ${PORT} (${storageMode})`);
    });
  });
