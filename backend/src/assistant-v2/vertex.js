const { COLLECTION_COPY, PRODUCT_CATALOG } = require('./catalog');
const { createAssistantV2RulesReply } = require('./service');

const ALLOWED_ACTION_TYPES = new Set([
  'none',
  'open_collection',
  'open_product',
  'open_configurator',
  'open_appointment',
  'open_whatsapp',
]);

const ALLOWED_INTENTS = new Set([
  'smalltalk',
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

function extractCandidateText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .map((part) => sanitizeText(part?.text, 12000))
      .filter(Boolean)
      .join('\n')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
}

function buildSystemInstruction() {
  return [
    'Eres Orvia, asesora digital de Orviane.',
    'Tu unico dominio es joyeria fina, asesorias de Orviane, colecciones, configurador, citas, WhatsApp y piezas del catalogo dado.',
    'No respondas como asistente general. Si el usuario pide algo ajeno a joyeria o a Orviane, redirigelo con amabilidad al contexto de joyas.',
    'No inventes precios exactos, tiempos garantizados, stock, politicas, materiales no confirmados ni referencias inexistentes.',
    'Si el usuario solo dice gracias, cómo estás, perfecto u otra cortesía, responde cordialmente sin pedir ocasión, tipo de joya ni estilo.',
    'Si pide precio del oro, responde el valor por gramo disponible en la propuesta base. Di "18 quilates" o "14 quilates"; nunca digas "18k" en el mensaje final.',
    'Si la propuesta base trae una valoracion preliminar, usala como base y no inventes rangos distintos.',
    'Solo puedes sugerir colecciones, productos y acciones permitidas en el contexto recibido.',
    'La respuesta debe ser breve, comercial, clara y util, en espanol neutro.',
    'Debes devolver un JSON valido y nada mas.',
  ].join(' ');
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
      `tipo_comercial=${product.displayType || product.type}`,
      `ocasiones=${product.occasions.join(', ')}`,
      `estilo=${product.style}`,
      `estilo_comercial=${product.styleLabel || product.style}`,
      `metal=${product.metal}`,
      `piedras=${gemstones}`,
      `material=${product.material || ''}`,
      `acabado=${product.finish || ''}`,
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
    .slice(-6)
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

function buildUserPrompt(payload, rulesReply) {
  return [
    'Tarea: responder como asesora de joyeria de Orviane y escoger la mejor ruta permitida.',
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
    'Catalogo permitido:',
    buildCatalogDigest(),
    'Acciones permitidas:',
    JSON.stringify(Array.from(ALLOWED_ACTION_TYPES)),
    'Propuesta base por reglas:',
    JSON.stringify({
      assistantMessage: rulesReply.assistantMessage,
      detectedIntent: rulesReply.detectedIntent,
      suggestedAction: rulesReply.suggestedAction,
      diagnostics: rulesReply.diagnostics,
      guidanceCard: rulesReply.guidanceCard,
    }),
    'Devuelve SIEMPRE JSON con esta estructura exacta:',
    JSON.stringify({
      assistantMessage: 'string breve',
      detectedIntent: 'recommend_jewelry',
      suggestedAction: {
        type: 'open_collection',
        label: 'string',
        collectionSlug: 'string',
        productReference: 'string',
        productName: 'string',
        reason: 'string',
        notes: 'string',
        promptHint: 'string',
      },
      quickReplies: [
        {
          label: 'string',
          message: 'string',
        },
      ],
      memory: {
        occasion: 'string',
        jewelryType: 'string',
        budget: 'string',
        style: 'string',
        metal: 'string',
        gemstone: 'string',
        deadline: 'string',
      },
      guidanceCard: {
        eyebrow: 'string',
        title: 'string',
        summary: 'string',
        bullets: ['string'],
      },
      diagnostics: {
        knownDetails: ['string'],
        missingDetails: ['string'],
        route: 'string',
      },
    }),
  ].join('\n\n');
}

function buildResponseSchema() {
  return {
    type: 'OBJECT',
    additionalProperties: false,
    required: ['assistantMessage', 'detectedIntent', 'suggestedAction', 'quickReplies', 'memory', 'guidanceCard', 'diagnostics'],
    properties: {
      assistantMessage: { type: 'STRING' },
      detectedIntent: { type: 'STRING' },
      suggestedAction: {
        type: 'OBJECT',
        additionalProperties: false,
        required: ['type', 'label', 'collectionSlug', 'productReference', 'productName', 'reason', 'notes', 'promptHint'],
        properties: {
          type: { type: 'STRING' },
          label: { type: 'STRING' },
          collectionSlug: { type: 'STRING' },
          productReference: { type: 'STRING' },
          productName: { type: 'STRING' },
          reason: { type: 'STRING' },
          notes: { type: 'STRING' },
          promptHint: { type: 'STRING' },
        },
      },
      quickReplies: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          additionalProperties: false,
          required: ['label', 'message'],
          properties: {
            label: { type: 'STRING' },
            message: { type: 'STRING' },
          },
        },
      },
      memory: {
        type: 'OBJECT',
        additionalProperties: false,
        required: ['occasion', 'jewelryType', 'budget', 'style', 'metal', 'gemstone', 'deadline'],
        properties: {
          occasion: { type: 'STRING' },
          jewelryType: { type: 'STRING' },
          budget: { type: 'STRING' },
          style: { type: 'STRING' },
          metal: { type: 'STRING' },
          gemstone: { type: 'STRING' },
          deadline: { type: 'STRING' },
        },
      },
      guidanceCard: {
        type: 'OBJECT',
        additionalProperties: false,
        required: ['eyebrow', 'title', 'summary', 'bullets'],
        properties: {
          eyebrow: { type: 'STRING' },
          title: { type: 'STRING' },
          summary: { type: 'STRING' },
          bullets: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
      },
      diagnostics: {
        type: 'OBJECT',
        additionalProperties: false,
        required: ['knownDetails', 'missingDetails', 'route'],
        properties: {
          knownDetails: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          missingDetails: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          route: { type: 'STRING' },
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
    return null;
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

function sanitizeAssistantMessage(message, fallbackMessage, detectedIntent) {
  const nextMessage = sanitizeText(message, 420);

  if (detectedIntent === 'out_of_scope') {
    return 'Puedo ayudarte con joyas, colecciones, personalizacion, citas y WhatsApp de Orviane. Si quieres, te oriento por tipo de joya, ocasion o estilo.';
  }

  return nextMessage || fallbackMessage;
}

function chooseAssistantMessage(message, rulesReply, detectedIntent) {
  if (rulesReply?.detectedIntent === 'smalltalk') {
    return rulesReply.assistantMessage;
  }

  const valuation = rulesReply?.diagnostics?.valuation;
  const nextMessage = sanitizeText(message, 420);

  if (valuation && rulesReply?.assistantMessage) {
    return rulesReply.assistantMessage;
  }

  return sanitizeAssistantMessage(nextMessage, rulesReply.assistantMessage, detectedIntent);
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

function sanitizeModelReply(modelReply, rulesReply) {
  const detectedIntent = sanitizeDetectedIntent(modelReply?.detectedIntent, rulesReply.detectedIntent);
  const suggestedAction = sanitizeSuggestedAction(modelReply?.suggestedAction, rulesReply.suggestedAction);

  return {
    assistantMessage: chooseAssistantMessage(
      modelReply?.assistantMessage,
      rulesReply,
      detectedIntent,
    ),
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
    provider: 'vertex-ai',
    model: '',
  };
}

function isAssistantV2AiConfigured(config) {
  return Boolean(config?.projectId && config?.location && config?.publisher && config?.model && typeof config?.getAccessToken === 'function');
}

async function createAssistantV2VertexReply(payload, config) {
  const rulesReply = createAssistantV2RulesReply(payload);
  const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/${config.publisher}/models/${config.model}:generateContent`;
  const token = await config.getAccessToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      systemInstruction: {
        role: 'system',
        parts: [{ text: buildSystemInstruction() }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildUserPrompt(payload, rulesReply) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        candidateCount: 1,
        maxOutputTokens: 900,
        responseMimeType: 'application/json',
        responseSchema: buildResponseSchema(),
      },
      labels: {
        app: 'atelia_v2',
        surface: 'chat',
      },
    }),
  });

  const responsePayload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      responsePayload?.error?.message ||
      responsePayload?.message ||
      'Gemini no pudo responder para Orvia.';
    throw new Error(message);
  }

  const responseText = extractCandidateText(responsePayload);

  if (!responseText) {
    throw new Error('Gemini no devolvio texto util para Orvia.');
  }

  const parsedReply = parseJsonText(responseText);
  const sanitized = sanitizeModelReply(parsedReply, rulesReply);

  return {
    ...sanitized,
    provider: 'vertex-ai',
    model: config.model,
  };
}

module.exports = {
  createAssistantV2VertexReply,
  isAssistantV2AiConfigured,
};
