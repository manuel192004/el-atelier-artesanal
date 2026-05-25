const { COLLECTION_COPY, PRODUCT_CATALOG } = require('./catalog');
const { createAssistantV2RulesReply } = require('./service');
const { getPhraseBankStats } = require('./phrase-bank');

const ALLOWED_ACTION_TYPES = new Set([
  'none',
  'open_collection',
  'open_product',
  'open_configurator',
  'open_appointment',
  'open_whatsapp',
]);

const ALLOWED_INTENTS = new Set([
  'handoff_whatsapp',
  'schedule_appointment',
  'design_custom',
  'quote_request',
  'browse_collection',
  'recommend_jewelry',
  'unknown',
  'out_of_scope',
]);

function sanitizeText(value, maxLength = 500) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function parseJsonText(text) {
  const rawText = sanitizeText(text, 12000);
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const source = fencedMatch ? fencedMatch[1] : rawText;

  return JSON.parse(source);
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const textParts = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const part of content) {
      if (typeof part?.text === 'string') {
        textParts.push(part.text);
      }
    }
  }

  return textParts.join('\n').trim();
}

function sanitizeMemory(memory) {
  return {
    occasion: sanitizeText(memory?.occasion, 80),
    jewelryType: sanitizeText(memory?.jewelryType, 80),
    budget: sanitizeText(memory?.budget, 120),
    style: sanitizeText(memory?.style, 80),
    metal: sanitizeText(memory?.metal, 80),
    gemstone: sanitizeText(memory?.gemstone, 80),
    deadline: sanitizeText(memory?.deadline, 80),
  };
}

function buildCatalogDigest() {
  return PRODUCT_CATALOG.map((product) => {
    const collectionTitle = COLLECTION_COPY[product.collectionSlug]?.title || product.collectionSlug;
    const gemstones = Array.isArray(product.gemstones) && product.gemstones.length
      ? product.gemstones.join(', ')
      : 'sin piedra destacada';

    return [
      `${product.reference}: ${product.name}`,
      `coleccion=${collectionTitle}`,
      `tipo=${product.type}`,
      `ocasiones=${product.occasions.join(', ')}`,
      `estilo=${product.style}`,
      `metal=${product.metal}`,
      `piedras=${gemstones}`,
      `ideal_para=${product.idealFor || ''}`,
      `resumen=${product.summary || ''}`,
    ].join(' | ');
  }).join('\n');
}

function buildConversationDigest(conversation) {
  if (!Array.isArray(conversation) || !conversation.length) {
    return 'Sin historial previo.';
  }

  return conversation
    .slice(-8)
    .map((entry) => `${entry.role === 'assistant' ? 'Orvia' : 'Cliente'}: ${sanitizeText(entry.text, 220)}`)
    .join('\n');
}

function buildAccountDigest(accountContext) {
  if (!accountContext || typeof accountContext !== 'object') {
    return 'Sin contexto de cuenta.';
  }

  return JSON.stringify({
    summaryLine: sanitizeText(accountContext.summaryLine, 220),
    topCollectionSlug: sanitizeText(accountContext.topCollectionSlug, 80),
    favoriteCollections: Array.isArray(accountContext.favoriteCollections)
      ? accountContext.favoriteCollections.slice(0, 4)
      : [],
    favorites: Array.isArray(accountContext.favorites)
      ? accountContext.favorites.slice(0, 3).map((item) => ({
          name: sanitizeText(item?.name, 120),
          reference: sanitizeText(item?.reference, 80),
          slug: sanitizeText(item?.slug, 80),
        }))
      : [],
    savedDesigns: Array.isArray(accountContext.savedDesigns)
      ? accountContext.savedDesigns.slice(0, 2).map((item) => ({
          title: sanitizeText(item?.title, 120),
          reference: sanitizeText(item?.reference, 80),
          prompt: sanitizeText(item?.prompt, 220),
        }))
      : [],
    quotes: Array.isArray(accountContext.quotes)
      ? accountContext.quotes.slice(0, 2).map((item) => ({
          quoteId: sanitizeText(item?.quoteId, 80),
          title: sanitizeText(item?.title, 120),
          status: sanitizeText(item?.status, 80),
        }))
      : [],
    appointments: Array.isArray(accountContext.appointments)
      ? accountContext.appointments.slice(0, 2).map((item) => ({
          appointmentId: sanitizeText(item?.appointmentId, 80),
          reason: sanitizeText(item?.reason, 120),
          status: sanitizeText(item?.status, 80),
        }))
      : [],
  });
}

function buildSystemInstruction() {
  return [
    'Eres Orvia, asesora digital de alta joyeria de Orviane.',
    'Hablas como una asesora humana: breve, calida, concreta y segura. No suenes como robot ni como vendedora intensa.',
    'Tu objetivo es entender la ocasion, tipo de joya, estilo, presupuesto y urgencia; despues recomiendas la ruta mas util.',
    'Haz maximo una pregunta por turno. Si ya hay suficiente informacion, recomienda una pieza, coleccion, configurador, WhatsApp o cita.',
    'No fuerces cita. Solo sugierela cuando el usuario pide agendar, hay urgencia, presupuesto complejo o necesita decision humana.',
    'No inventes precios exactos, disponibilidad, tiempos garantizados, materiales no confirmados ni referencias fuera del catalogo.',
    'Devuelve siempre JSON valido con la estructura indicada.',
  ].join(' ');
}

function buildUserPrompt(payload, rulesReply) {
  return [
    'Responde como Orvia y escoge la accion mas indicada.',
    'Usuario actual:',
    JSON.stringify({
      message: sanitizeText(payload.message, 500),
      memory: sanitizeMemory(payload.memory),
      clientContext: payload.clientContext || {},
      profile: payload.profile
        ? {
            fullName: sanitizeText(payload.profile.fullName, 80),
            email: sanitizeText(payload.profile.email, 120),
          }
        : null,
    }),
    'Historial reciente:',
    buildConversationDigest(payload.conversation),
    'Contexto de cuenta:',
    buildAccountDigest(payload.accountContext),
    'Banco de frases:',
    JSON.stringify(getPhraseBankStats()),
    'Catalogo permitido:',
    buildCatalogDigest(),
    'Acciones permitidas:',
    JSON.stringify(Array.from(ALLOWED_ACTION_TYPES)),
    'Propuesta base validada por reglas:',
    JSON.stringify({
      assistantMessage: rulesReply.assistantMessage,
      detectedIntent: rulesReply.detectedIntent,
      suggestedAction: rulesReply.suggestedAction,
      diagnostics: rulesReply.diagnostics,
      guidanceCard: rulesReply.guidanceCard,
    }),
    'Reglas de calidad:',
    [
      'Si el usuario saluda, saluda y ofrece rutas sin vender de mas.',
      'Si pide regalo, recomienda aretes/cadenas o una pieza concreta segun catalogo.',
      'Si pide anillo, recomienda una referencia de anillos o la coleccion.',
      'Si pide personalizacion, manda al configurador con brief.',
      'Si pide precio, lleva a cotizacion con referencia concreta o WhatsApp.',
      'Si pide cita o WhatsApp, respeta esa intencion.',
      'Si falta informacion critica, pregunta solo una cosa.',
    ].join(' '),
  ].join('\n\n');
}

function buildResponseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['assistantMessage', 'detectedIntent', 'suggestedAction', 'quickReplies', 'memory', 'guidanceCard', 'diagnostics'],
    properties: {
      assistantMessage: { type: 'string' },
      detectedIntent: { type: 'string' },
      suggestedAction: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'label', 'collectionSlug', 'productReference', 'productName', 'reason', 'notes', 'promptHint'],
        properties: {
          type: { type: 'string' },
          label: { type: 'string' },
          collectionSlug: { type: 'string' },
          productReference: { type: 'string' },
          productName: { type: 'string' },
          reason: { type: 'string' },
          notes: { type: 'string' },
          promptHint: { type: 'string' },
        },
      },
      quickReplies: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'message'],
          properties: {
            label: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
      memory: {
        type: 'object',
        additionalProperties: false,
        required: ['occasion', 'jewelryType', 'budget', 'style', 'metal', 'gemstone', 'deadline'],
        properties: {
          occasion: { type: 'string' },
          jewelryType: { type: 'string' },
          budget: { type: 'string' },
          style: { type: 'string' },
          metal: { type: 'string' },
          gemstone: { type: 'string' },
          deadline: { type: 'string' },
        },
      },
      guidanceCard: {
        type: 'object',
        additionalProperties: false,
        required: ['eyebrow', 'title', 'summary', 'bullets'],
        properties: {
          eyebrow: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          bullets: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      diagnostics: {
        type: 'object',
        additionalProperties: false,
        required: ['knownDetails', 'missingDetails', 'route'],
        properties: {
          knownDetails: {
            type: 'array',
            items: { type: 'string' },
          },
          missingDetails: {
            type: 'array',
            items: { type: 'string' },
          },
          route: { type: 'string' },
        },
      },
    },
  };
}

function sanitizeQuickReplies(quickReplies, fallbackReplies) {
  const items = Array.isArray(quickReplies) ? quickReplies : [];
  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const label = sanitizeText(item?.label, 40);
    const message = sanitizeText(item?.message, 120);
    const key = `${label}::${message}`;

    if (!label || !message || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push({ label, message });

    if (unique.length >= 4) {
      break;
    }
  }

  return unique.length ? unique : fallbackReplies;
}

function sanitizeGuidanceCard(guidanceCard, fallbackCard) {
  const next = guidanceCard && typeof guidanceCard === 'object' ? guidanceCard : fallbackCard;

  if (!next || typeof next !== 'object') {
    return {
      eyebrow: '',
      title: '',
      summary: '',
      bullets: [],
    };
  }

  return {
    eyebrow: sanitizeText(next.eyebrow, 40),
    title: sanitizeText(next.title, 120),
    summary: sanitizeText(next.summary, 280),
    bullets: Array.isArray(next.bullets)
      ? next.bullets.map((item) => sanitizeText(item, 120)).filter(Boolean).slice(0, 4)
      : [],
  };
}

function sanitizeDiagnostics(diagnostics, fallbackDiagnostics, route) {
  const next = diagnostics && typeof diagnostics === 'object' ? diagnostics : fallbackDiagnostics;

  return {
    knownDetails: Array.isArray(next?.knownDetails)
      ? next.knownDetails.map((item) => sanitizeText(item, 80)).filter(Boolean).slice(0, 6)
      : [],
    missingDetails: Array.isArray(next?.missingDetails)
      ? next.missingDetails.map((item) => sanitizeText(item, 80)).filter(Boolean).slice(0, 4)
      : [],
    route: sanitizeText(next?.route, 40) || route,
  };
}

function sanitizeDetectedIntent(intent, fallbackIntent) {
  const nextIntent = sanitizeText(intent, 80);
  return ALLOWED_INTENTS.has(nextIntent) ? nextIntent : fallbackIntent;
}

function findProductByReference(reference) {
  const safeReference = sanitizeText(reference, 80);
  return PRODUCT_CATALOG.find((item) => item.reference === safeReference) || null;
}

function sanitizeSuggestedAction(action, fallbackAction) {
  const next = action && typeof action === 'object' ? action : fallbackAction;
  const type = sanitizeText(next?.type, 40);

  if (!ALLOWED_ACTION_TYPES.has(type)) {
    return fallbackAction;
  }

  if (type === 'open_collection') {
    const collectionSlug = sanitizeText(next?.collectionSlug, 80);

    if (!COLLECTION_COPY[collectionSlug]) {
      return fallbackAction;
    }

    return {
      type,
      label: sanitizeText(next?.label, 80) || fallbackAction.label,
      collectionSlug,
      productReference: '',
      productName: '',
      reason: sanitizeText(next?.reason, 220) || fallbackAction.reason,
      notes: sanitizeText(next?.notes, 280),
      promptHint: sanitizeText(next?.promptHint, 260),
    };
  }

  if (type === 'open_product') {
    const product = findProductByReference(next?.productReference);

    if (!product) {
      return fallbackAction;
    }

    return {
      type,
      label: sanitizeText(next?.label, 80) || `Ver ${product.name}`,
      collectionSlug: product.collectionSlug,
      productReference: product.reference,
      productName: product.name,
      reason: sanitizeText(next?.reason, 220) || fallbackAction.reason,
      notes: sanitizeText(next?.notes, 280),
      promptHint: sanitizeText(next?.promptHint, 260),
    };
  }

  return {
    type,
    label: sanitizeText(next?.label, 80) || fallbackAction.label,
    collectionSlug: '',
    productReference: '',
    productName: '',
    reason: sanitizeText(next?.reason, 220) || fallbackAction.reason,
    notes: sanitizeText(next?.notes, 280),
    promptHint: sanitizeText(next?.promptHint, 260),
  };
}

function sanitizeModelReply(modelReply, rulesReply, model) {
  const detectedIntent = sanitizeDetectedIntent(modelReply?.detectedIntent, rulesReply.detectedIntent);
  const suggestedAction = sanitizeSuggestedAction(modelReply?.suggestedAction, rulesReply.suggestedAction);

  return {
    assistantMessage: sanitizeText(modelReply?.assistantMessage, 420) || rulesReply.assistantMessage,
    detectedIntent,
    suggestedAction,
    quickReplies: sanitizeQuickReplies(modelReply?.quickReplies, rulesReply.quickReplies),
    memory: {
      ...rulesReply.memory,
      ...sanitizeMemory(modelReply?.memory),
    },
    guidanceCard: sanitizeGuidanceCard(modelReply?.guidanceCard, rulesReply.guidanceCard),
    diagnostics: sanitizeDiagnostics(modelReply?.diagnostics, rulesReply.diagnostics, suggestedAction.type),
    accountContext: rulesReply.accountContext,
    provider: 'openai',
    model,
  };
}

function isAssistantV2OpenAIConfigured(config) {
  return Boolean(config?.apiKey && config?.model);
}

async function createAssistantV2OpenAIReply(payload, config) {
  const rulesReply = createAssistantV2RulesReply(payload);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      instructions: buildSystemInstruction(),
      input: buildUserPrompt(payload, rulesReply),
      text: {
        format: {
          type: 'json_schema',
          name: 'orvia_reply',
          strict: true,
          schema: buildResponseSchema(),
        },
      },
      max_output_tokens: 900,
    }),
  });

  const responsePayload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      responsePayload?.error?.message ||
      responsePayload?.message ||
      'OpenAI no pudo responder para Orvia.';
    throw new Error(message);
  }

  const responseText = extractResponseText(responsePayload);

  if (!responseText) {
    throw new Error('OpenAI no devolvio texto util para Orvia.');
  }

  const parsedReply = parseJsonText(responseText);
  return sanitizeModelReply(parsedReply, rulesReply, config.model);
}

module.exports = {
  createAssistantV2OpenAIReply,
  isAssistantV2OpenAIConfigured,
};
