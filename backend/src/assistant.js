const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_ASSISTANT_MODEL = String(process.env.OPENAI_ASSISTANT_MODEL || 'gpt-5.4-mini').trim();
const AZURE_OPENAI_API_KEY = String(process.env.AZURE_OPENAI_API_KEY || '').trim();
const AZURE_OPENAI_ENDPOINT = String(process.env.AZURE_OPENAI_ENDPOINT || '').trim().replace(/\/+$/, '');
const AZURE_OPENAI_DEPLOYMENT = String(process.env.AZURE_OPENAI_DEPLOYMENT || '').trim();
const AZURE_OPENAI_API_VERSION = String(process.env.AZURE_OPENAI_API_VERSION || '2024-10-21').trim();

const COLLECTIONS = {
  anillos: 'anillos',
  aretes: 'aretes',
  cadenas: 'cadenas',
  pulseras: 'pulseras',
};

const OCCASION_TO_COLLECTION = {
  compromiso: COLLECTIONS.anillos,
  aniversario: COLLECTIONS.anillos,
  regalo: COLLECTIONS.aretes,
  diario: COLLECTIONS.cadenas,
  evento: COLLECTIONS.pulseras,
};

const COLLECTION_GUIDE = {
  anillos: {
    title: 'Anillos',
    bestFor: ['compromiso', 'aniversario'],
    tone: 'simbolo fuerte, propuesta emocional, presencia clara',
    products: ['Solitario Oro Amarillo', 'Solitario Oro Blanco', 'Halo Oro Amarillo', 'Media Eternidad Oro Blanco'],
  },
  aretes: {
    title: 'Aretes',
    bestFor: ['regalo', 'evento'],
    tone: 'regalo versatil, brillo ligero, lectura inmediata',
    products: ['Topos Redondos', 'Flores con Brillo', 'Argollas Pave', 'Perla Colgante'],
  },
  cadenas: {
    title: 'Cadenas',
    bestFor: ['diario', 'regalo'],
    tone: 'uso diario elegante, layering, sobriedad premium',
    products: ['Cadena Delicada', 'Cadena Plana', 'Eslabon Ovalado', 'Eslabon Pulido'],
  },
  pulseras: {
    title: 'Pulseras',
    bestFor: ['evento', 'regalo', 'aniversario'],
    tone: 'gesto artesanal, pieza protagonista, presencia marcada',
    products: ['Cordon Clasico', 'Brazalete Rigido', 'Pulsera de Esferas', 'Eslabon Pave Doble'],
  },
};

const FAQ_ENTRIES = [
  {
    key: 'garantia',
    keywords: ['garantia', 'garantias', 'respaldo'],
    answer:
      'Cada pieza del atelier se entrega con acompanamiento y revision artesanal. Si necesitas revisar ajuste o acabado, lo mejor es escribirnos para orientarte segun la joya y el momento de entrega.',
    actionType: 'open_whatsapp',
    label: 'Hablar por garantia',
  },
  {
    key: 'envios',
    keywords: ['envio', 'envios', 'domicilio', 'nacional', 'ciudad'],
    answer:
      'Podemos orientarte sobre entrega local y envio nacional segun la pieza y el destino. Para no prometer algo impreciso, conviene confirmarlo contigo antes de cerrar el pedido.',
    actionType: 'open_whatsapp',
    label: 'Consultar envio',
  },
  {
    key: 'tiempos',
    keywords: ['tiempo', 'tiempos', 'demora', 'entrega', 'cuanto tardan'],
    answer:
      'Los tiempos dependen de si eliges una pieza del catalogo, una variacion o un diseno completamente personalizado. Si quieres, podemos aterrizarlo en asesoria para darte una ruta mas clara.',
    actionType: 'open_appointment',
    label: 'Aterrizar tiempos',
  },
  {
    key: 'materiales',
    keywords: ['material', 'materiales', 'oro', 'plata', 'acabado', 'acabados', 'piedras'],
    answer:
      'Trabajamos una lectura premium de materiales, acabados y detalles para que cada pieza se sienta noble y bien resuelta. Si me dices ocasion o estilo, te puedo orientar hacia una familia concreta.',
    actionType: 'none',
    label: 'Seguir explorando',
  },
  {
    key: 'ajustes',
    keywords: ['ajuste', 'ajustes', 'talla', 'redimensionar', 'arreglo'],
    answer:
      'Los ajustes dependen del tipo de pieza y de como fue construida. En anillos y joyas personalizadas conviene revisarlo contigo para cuidar proporciones, estructura y acabado.',
    actionType: 'open_whatsapp',
    label: 'Consultar ajuste',
  },
  {
    key: 'horario',
    keywords: ['horario', 'horarios', 'atienden', 'ubicacion', 'direccion', 'donde estan'],
    answer:
      'Si quieres coordinar visita, asesoria o resolver una duda puntual, te conviene dejar una cita o escribirnos directo para darte la atencion correcta segun tu proyecto.',
    actionType: 'open_appointment',
    label: 'Pedir cita',
  },
];

const assistantResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assistantMessage: { type: 'string' },
    detectedIntent: {
      type: 'string',
      enum: [
        'browse_collection',
        'recommend_jewelry',
        'design_custom',
        'schedule_appointment',
        'quote_request',
        'faq',
        'account_help',
        'unknown',
      ],
    },
    confidence: { type: 'number' },
    extracted: {
      type: 'object',
      additionalProperties: false,
      properties: {
        occasion: { type: 'string' },
        jewelryType: { type: 'string' },
        budget: { type: 'string' },
        style: { type: 'string' },
      },
      required: ['occasion', 'jewelryType', 'budget', 'style'],
    },
    suggestedAction: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['open_collection', 'open_configurator', 'open_appointment', 'open_whatsapp', 'open_account', 'none'],
        },
        label: { type: 'string' },
        collectionSlug: { type: 'string' },
        reason: { type: 'string' },
        notes: { type: 'string' },
        promptHint: { type: 'string' },
      },
      required: ['type', 'label', 'collectionSlug', 'reason', 'notes', 'promptHint'],
    },
    quickReplies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['label', 'message'],
      },
    },
  },
  required: ['assistantMessage', 'detectedIntent', 'confidence', 'extracted', 'suggestedAction', 'quickReplies'],
};

function sanitizeText(value, maxLength = 500) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeSpanish(value) {
  return sanitizeText(value, 500)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function sanitizeConversation(conversation) {
  if (!Array.isArray(conversation)) {
    return [];
  }

  return conversation
    .slice(-10)
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      text: sanitizeText(entry?.text, 400),
    }))
    .filter((entry) => entry.text);
}

function sanitizeMemory(memory) {
  if (!memory || typeof memory !== 'object') {
    return {
      occasion: '',
      jewelryType: '',
      budget: '',
      style: '',
      lastIntent: '',
      lastCollectionSlug: '',
    };
  }

  return {
    occasion: sanitizeText(memory.occasion, 80),
    jewelryType: sanitizeText(memory.jewelryType, 80),
    budget: sanitizeText(memory.budget, 120),
    style: sanitizeText(memory.style, 80),
    lastIntent: sanitizeText(memory.lastIntent, 80),
    lastCollectionSlug: sanitizeText(memory.lastCollectionSlug, 80),
  };
}

function sanitizeAccountContext(accountContext) {
  if (!accountContext || typeof accountContext !== 'object') {
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

  const sanitizeArray = (items, mapper, limit = 4) =>
    Array.isArray(items)
      ? items.slice(0, limit).map(mapper).filter(Boolean)
      : [];

  return {
    summaryLine: sanitizeText(accountContext.summaryLine, 240),
    topCollectionSlug: sanitizeText(accountContext.topCollectionSlug, 80),
    topOccasion: sanitizeText(accountContext.topOccasion, 80),
    favoriteCollections: sanitizeArray(accountContext.favoriteCollections, (item) => sanitizeText(item, 80)),
    favorites: sanitizeArray(accountContext.favorites, (item) => ({
      name: sanitizeText(item?.name, 120),
      reference: sanitizeText(item?.reference, 80),
      slug: sanitizeText(item?.slug, 80),
      category: sanitizeText(item?.category, 80),
    })),
    savedDesigns: sanitizeArray(accountContext.savedDesigns, (item) => ({
      title: sanitizeText(item?.title, 120),
      category: sanitizeText(item?.category, 80),
      occasion: sanitizeText(item?.occasion, 80),
      reference: sanitizeText(item?.reference, 80),
      prompt: sanitizeText(item?.prompt, 260),
    })),
    quotes: sanitizeArray(accountContext.quotes, (item) => ({
      quoteId: sanitizeText(item?.quoteId, 80),
      title: sanitizeText(item?.title, 120),
      status: sanitizeText(item?.status, 80),
      occasion: sanitizeText(item?.occasion, 80),
      budget: sanitizeText(item?.budget, 120),
    })),
    appointments: sanitizeArray(accountContext.appointments, (item) => ({
      appointmentId: sanitizeText(item?.appointmentId, 80),
      reason: sanitizeText(item?.reason, 160),
      status: sanitizeText(item?.status, 80),
      preferredDate: sanitizeText(item?.preferredDate, 40),
    })),
  };
}

function mergeMemoryLayers(memory, persistentMemory) {
  const current = sanitizeMemory(memory);
  const persisted = sanitizeMemory(persistentMemory);

  return {
    occasion: current.occasion || persisted.occasion || '',
    jewelryType: current.jewelryType || persisted.jewelryType || '',
    budget: current.budget || persisted.budget || '',
    style: current.style || persisted.style || '',
    lastIntent: current.lastIntent || persisted.lastIntent || '',
    lastCollectionSlug: current.lastCollectionSlug || persisted.lastCollectionSlug || '',
  };
}

function detectOccasion(text) {
  if (/(compromiso|pedida|matrimonio)/.test(text)) return 'compromiso';
  if (/(aniversario)/.test(text)) return 'aniversario';
  if (/(regalo|cumpleanos|cumple|sorpresa)/.test(text)) return 'regalo';
  if (/(diario|todos los dias|uso diario)/.test(text)) return 'diario';
  if (/(evento|fiesta|boda|graduacion|grado)/.test(text)) return 'evento';
  return '';
}

function detectJewelryType(text) {
  if (/(anillo|aro)/.test(text)) return 'anillo';
  if (/(arete|topo|argolla)/.test(text)) return 'aretes';
  if (/(cadena|collar)/.test(text)) return 'cadena';
  if (/(pulsera|brazalete)/.test(text)) return 'pulsera';
  return '';
}

function detectBudget(text) {
  if (!text) {
    return '';
  }

  if (/(hasta\s*\$?\s*500|500 mil|quinientos mil|economico|barato)/.test(text)) {
    return 'hasta 500 mil';
  }

  if (/(1\.5 millones|1,5 millones|millon|millones|500 mil a 1\.5|500 mil a 1,5)/.test(text)) {
    return '500 mil a 1.5 millones';
  }

  if (/(premium|alto presupuesto|mas de 1\.5|mas de 1,5|lujo|alta joyeria)/.test(text)) {
    return 'mas de 1.5 millones';
  }

  return '';
}

function detectStyle(text) {
  if (/(minimalista|limpio|sobrio)/.test(text)) return 'minimalista';
  if (/(romantico|delicado|femenino)/.test(text)) return 'romantico';
  if (/(moderno|contemporaneo)/.test(text)) return 'moderno';
  if (/(vintage|clasico)/.test(text)) return 'clasico';
  if (/(lujoso|statement|protagonista)/.test(text)) return 'statement';
  return '';
}

function detectIntent(text) {
  if (/(cita|agendar|agendo|asesoria|asesoria)/.test(text)) return 'schedule_appointment';
  if (/(personaliz|diseno|disenar|diseñar|retomar mi diseno|a medida|hecha a medida|configurador)/.test(text)) return 'design_custom';
  if (/(precio|cotizacion|cotizar|cuanto cuesta|presupuesto)/.test(text)) return 'quote_request';
  if (/(cuenta|login|iniciar sesion|registrar|registro|google|favoritos|guardado)/.test(text)) return 'account_help';
  if (/(garantia|envio|domicilio|tiempo|entrega|material|oro|plata|acabado|ajuste|talla|ubicacion|direccion|horario|atienden|cuidado)/.test(text)) return 'faq';
  if (/(ver|coleccion|catalogo|anillos|aretes|cadenas|pulseras)/.test(text)) return 'browse_collection';
  if (/(hola|buenas|ayuda|recomienda|recomendacion|busco|quiero)/.test(text)) return 'recommend_jewelry';
  return 'unknown';
}

function inferCollectionSlug(jewelryType, occasion) {
  if (jewelryType === 'anillo') return COLLECTIONS.anillos;
  if (jewelryType === 'aretes') return COLLECTIONS.aretes;
  if (jewelryType === 'cadena') return COLLECTIONS.cadenas;
  if (jewelryType === 'pulsera') return COLLECTIONS.pulseras;
  return OCCASION_TO_COLLECTION[occasion] || '';
}

function buildConfiguratorHint(extracted) {
  const parts = [
    extracted.jewelryType ? `Quiero una propuesta de ${extracted.jewelryType}.` : 'Quiero una joya personalizada.',
    extracted.occasion ? `La ocasion es ${extracted.occasion}.` : '',
    extracted.style ? `Me interesa un estilo ${extracted.style}.` : '',
    extracted.budget ? `Quiero que tenga en cuenta un presupuesto de ${extracted.budget}.` : '',
  ].filter(Boolean);

  return parts.join(' ');
}

function buildQuickReplies(intent, collectionSlug, accountContext) {
  const context = sanitizeAccountContext(accountContext);

  if (context.savedDesigns.length && (intent === 'design_custom' || intent === 'unknown')) {
    return [
      { label: 'Retomar mi diseno', message: 'Quiero retomar mi diseno guardado' },
      { label: 'Crear uno nuevo', message: 'Quiero una joya personalizada nueva' },
      { label: 'Agendar asesoria', message: 'Quiero una asesoria personalizada' },
    ];
  }

  if (intent === 'faq') {
    return [
      { label: 'Consultar materiales', message: 'Quiero saber sobre materiales y acabados' },
      { label: 'Revisar tiempos', message: 'Quiero saber tiempos de entrega' },
      { label: 'Pedir asesoria', message: 'Quiero una asesoria personalizada' },
    ];
  }

  if (intent === 'schedule_appointment') {
    return [
      { label: 'Agendar cita', message: 'Quiero agendar una cita' },
      { label: 'Hablar por WhatsApp', message: 'Prefiero hablar por WhatsApp' },
      { label: 'Ver colecciones', message: 'Quiero ver colecciones primero' },
    ];
  }

  if (intent === 'design_custom') {
    return [
      { label: 'Abrir configurador', message: 'Llevame al configurador' },
      { label: 'Agendar asesoria', message: 'Quiero una asesoria personalizada' },
      { label: 'Ver colecciones', message: 'Primero quiero ver colecciones' },
    ];
  }

  if (collectionSlug) {
    return [
      { label: 'Ver coleccion sugerida', message: `Quiero ver ${collectionSlug}` },
      { label: 'Diseno personalizado', message: 'Quiero un diseno personalizado' },
      { label: 'Agendar cita', message: 'Quiero agendar una cita' },
    ];
  }

  if (context.favoriteCollections.length) {
    return [
      { label: 'Seguir con mis favoritos', message: 'Quiero seguir con mis favoritos' },
      { label: 'Ver recomendacion', message: 'Que me recomiendas segun mis favoritos' },
      { label: 'Agendar cita', message: 'Quiero agendar una cita' },
    ];
  }

  return [
    { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
    { label: 'Quiero regalar algo', message: 'Busco un regalo especial' },
    { label: 'Necesito asesoria', message: 'Necesito asesoria para elegir una joya' },
  ];
}

function buildCollectionAction(collectionSlug, label, reason) {
  return {
    type: 'open_collection',
    label,
    collectionSlug,
    reason,
    notes: '',
    promptHint: '',
  };
}

function buildCatalogPolicy(occasion, jewelryType, budget) {
  if (jewelryType === 'anillo') {
    return {
      collectionSlug: COLLECTIONS.anillos,
      label: 'Ver anillos sugeridos',
      reason: 'Los anillos son la mejor ruta cuando el cliente ya piensa en una pieza con simbolo fuerte o compromiso.',
    };
  }

  if (jewelryType === 'aretes') {
    return {
      collectionSlug: COLLECTIONS.aretes,
      label: 'Ver aretes sugeridos',
      reason: 'Los aretes funcionan muy bien cuando el cliente quiere brillo, regalo versatil o una lectura inmediata.',
    };
  }

  if (jewelryType === 'cadena') {
    return {
      collectionSlug: COLLECTIONS.cadenas,
      label: 'Ver cadenas sugeridas',
      reason: 'Las cadenas suelen encajar mejor cuando el objetivo es uso diario elegante o una pieza facil de combinar.',
    };
  }

  if (jewelryType === 'pulsera') {
    return {
      collectionSlug: COLLECTIONS.pulseras,
      label: 'Ver pulseras sugeridas',
      reason: 'Las pulseras son una buena ruta cuando el cliente busca una pieza con gesto artesanal o mas presencia en la muneca.',
    };
  }

  if (occasion === 'compromiso') {
    return {
      collectionSlug: COLLECTIONS.anillos,
      label: 'Ver anillos para compromiso',
      reason: 'Para compromiso siempre conviene empezar por anillos antes de abrir otras familias.',
    };
  }

  if (occasion === 'diario') {
    return {
      collectionSlug: COLLECTIONS.cadenas,
      label: 'Ver cadenas para diario',
      reason: 'Para uso diario, las cadenas suelen dar la mejor combinacion entre elegancia, versatilidad y facilidad de uso.',
    };
  }

  if (occasion === 'regalo') {
    return budget === 'mas de 1.5 millones'
      ? {
          collectionSlug: COLLECTIONS.pulseras,
          label: 'Ver pulseras para regalo',
          reason: 'Con un presupuesto mas alto, una pulsera puede sentirse mas protagonista y especial como regalo.',
        }
      : {
          collectionSlug: COLLECTIONS.aretes,
          label: 'Ver aretes para regalo',
          reason: 'Para regalo sin tipo definido, conviene empezar por aretes porque suelen ser la opcion mas versatil y facil de acertar.',
        };
  }

  if (occasion === 'aniversario') {
    return {
      collectionSlug: COLLECTIONS.anillos,
      label: 'Ver anillos para aniversario',
      reason: 'Para aniversario, los anillos suelen comunicar mejor simbolo, permanencia y lectura emocional.',
    };
  }

  if (occasion === 'evento') {
    return {
      collectionSlug: COLLECTIONS.aretes,
      label: 'Ver aretes para evento',
      reason: 'Para evento especial, los aretes suelen elevar el gesto del look con mas rapidez y lectura visual.',
    };
  }

  return null;
}

function applyRecommendationPolicy(reply) {
  const occasion = sanitizeText(reply?.extracted?.occasion, 80);
  const jewelryType = sanitizeText(reply?.extracted?.jewelryType, 80);
  const budget = sanitizeText(reply?.extracted?.budget, 120);
  const policy = buildCatalogPolicy(occasion, jewelryType, budget);

  if (!policy) {
    return reply;
  }

  if (reply.detectedIntent === 'recommend_jewelry' || reply.detectedIntent === 'browse_collection') {
    return {
      ...reply,
      suggestedAction: buildCollectionAction(policy.collectionSlug, policy.label, policy.reason),
    };
  }

  return reply;
}

function createNeutralAction() {
  return {
    type: 'none',
    label: 'Seguir conversando',
    collectionSlug: '',
    reason: '',
    notes: '',
    promptHint: '',
  };
}

function findFaqMatch(text) {
  return FAQ_ENTRIES.find((entry) => entry.keywords.some((keyword) => text.includes(keyword))) || null;
}

function buildFaqAction(entry, extracted) {
  if (!entry || entry.actionType === 'none') {
    return createNeutralAction();
  }

  if (entry.actionType === 'open_appointment') {
    return {
      type: 'open_appointment',
      label: entry.label,
      collectionSlug: '',
      reason: 'Asesoria para aterrizar detalles del proyecto',
      notes: `Ocasion: ${extracted.occasion || 'por definir'}. Tipo de joya: ${extracted.jewelryType || 'por definir'}.`,
      promptHint: '',
    };
  }

  return {
    type: 'open_whatsapp',
    label: entry.label,
    collectionSlug: '',
    reason: 'Te llevo al canal directo para resolver este detalle con contexto real.',
    notes: '',
    promptHint: '',
  };
}

function buildFavoriteCollectionAction(accountContext) {
  const context = sanitizeAccountContext(accountContext);
  const collectionSlug = context.topCollectionSlug || context.favoriteCollections[0] || '';

  if (!collectionSlug) {
    return null;
  }

  return buildCollectionAction(
    collectionSlug,
    'Ver sugerencia basada en tus favoritos',
    'La recomendacion toma como punto de partida las familias y piezas que ya has guardado en tu cuenta.',
  );
}

function buildAccountContextSummary(accountContext) {
  const context = sanitizeAccountContext(accountContext);
  const lines = [];

  if (context.summaryLine) {
    lines.push(context.summaryLine);
  }

  if (context.favorites.length) {
    lines.push(`Favoritos recientes: ${context.favorites.map((item) => item.name).filter(Boolean).join(', ')}.`);
  }

  if (context.savedDesigns.length) {
    lines.push(`Ultimo diseno guardado: ${context.savedDesigns[0].title}.`);
  }

  if (context.quotes.length) {
    const quote = context.quotes[0];
    lines.push(`Cotizacion reciente: ${quote.title || quote.quoteId} con estado ${quote.status || 'recibida'}.`);
  }

  if (context.appointments.length) {
    const appointment = context.appointments[0];
    lines.push(`Cita reciente: ${appointment.reason} con estado ${appointment.status || 'pendiente'}.`);
  }

  return lines.join(' ');
}

function buildFaqKnowledgeSummary() {
  return FAQ_ENTRIES.map((entry) => `${entry.key}: ${entry.answer}`).join(' ');
}

function buildConciergeLead(accountContext, extracted, detectedIntent) {
  const context = sanitizeAccountContext(accountContext);

  if (detectedIntent === 'faq') {
    return '';
  }

  if (context.savedDesigns.length && /^(design_custom|unknown|recommend_jewelry)$/.test(detectedIntent)) {
    return 'Como ya tienes un diseno guardado, puedo ayudarte a retomarlo o a abrir una variacion nueva sin empezar de cero.';
  }

  if (context.favoriteCollections.length) {
    const leadCollection = context.favoriteCollections[0];
    const occasionHint = extracted.occasion || context.topOccasion;

    return `Viendo que te has inclinado por ${leadCollection}, puedo afinar la recomendacion${occasionHint ? ` para ${occasionHint}` : ''} y llevarte a una ruta mas directa.`;
  }

  return '';
}

function buildMemorySummary(memory) {
  const parts = [
    memory.occasion ? `Ocasion recordada: ${memory.occasion}.` : '',
    memory.jewelryType ? `Tipo de joya recordado: ${memory.jewelryType}.` : '',
    memory.budget ? `Presupuesto recordado: ${memory.budget}.` : '',
    memory.style ? `Estilo recordado: ${memory.style}.` : '',
    memory.lastCollectionSlug ? `Ultima coleccion sugerida: ${memory.lastCollectionSlug}.` : '',
    memory.lastIntent ? `Ultima intencion detectada: ${memory.lastIntent}.` : '',
  ].filter(Boolean);

  return parts.join(' ');
}

function inferCurrentMessageSignals(message) {
  const normalized = normalizeSpanish(message);

  return {
    occasion: detectOccasion(normalized),
    jewelryType: detectJewelryType(normalized),
    budget: detectBudget(normalized),
    style: detectStyle(normalized),
  };
}

function mergeExtractedWithMemory(extracted, memory) {
  return {
    occasion: extracted.occasion || memory.occasion || '',
    jewelryType: extracted.jewelryType || memory.jewelryType || '',
    budget: extracted.budget || memory.budget || '',
    style: extracted.style || memory.style || '',
  };
}

function buildFallbackReply(message, conversation, memory, accountContext) {
  const lastContext = sanitizeConversation(conversation)
    .map((entry) => entry.text)
    .join(' ');
  const normalized = normalizeSpanish(`${lastContext} ${message}`);
  const context = sanitizeAccountContext(accountContext);
  const extracted = mergeExtractedWithMemory(
    {
      occasion: detectOccasion(normalized),
      jewelryType: detectJewelryType(normalized),
      budget: detectBudget(normalized),
      style: detectStyle(normalized),
    },
    sanitizeMemory(memory),
  );
  const occasion = extracted.occasion;
  const jewelryType = extracted.jewelryType;
  const budget = extracted.budget;
  const style = extracted.style;
  const detectedIntent = detectIntent(normalized);
  const collectionSlug = inferCollectionSlug(jewelryType, occasion);
  const faqMatch = findFaqMatch(normalized);

  let suggestedAction = createNeutralAction();

  let assistantMessage = 'Puedo ayudarte a filtrar la mejor ruta entre colecciones, diseno personalizado y cita.';

  if ((/retomar/.test(normalized) || /mi diseno/.test(normalized)) && context.savedDesigns.length) {
    const savedDesign = context.savedDesigns[0];

    suggestedAction = {
      type: 'open_configurator',
      label: 'Retomar diseno guardado',
      collectionSlug: '',
      reason: 'Ya tienes una propuesta previa y conviene retomarla en vez de comenzar desde cero.',
      notes: '',
      promptHint: savedDesign.prompt || buildConfiguratorHint({ occasion, jewelryType, budget, style }),
    };
    assistantMessage = `Podemos retomar ${savedDesign.title} y afinarla desde el configurador con la memoria de lo que ya venias construyendo.`;
  } else if ((/favorit/.test(normalized) || /segun mis favoritos/.test(normalized)) && buildFavoriteCollectionAction(context)) {
    suggestedAction = buildFavoriteCollectionAction(context);
    assistantMessage = 'Tomando como referencia lo que ya guardaste, te conviene seguir por esa familia para mantener coherencia con tu gusto.';
  } else if (detectedIntent === 'faq' && faqMatch) {
    suggestedAction = buildFaqAction(faqMatch, extracted);
    assistantMessage = faqMatch.answer;
  } else if (detectedIntent === 'schedule_appointment') {
    suggestedAction = {
      type: 'open_appointment',
      label: 'Abrir agenda',
      collectionSlug: '',
      reason: 'Asesoria personalizada para elegir una joya',
      notes: `Ocasion: ${occasion || 'por definir'}. Tipo de joya: ${jewelryType || 'por definir'}. Presupuesto: ${budget || 'por definir'}.`,
      promptHint: '',
    };
    assistantMessage = 'Lo mejor aqui es dejar lista una cita para orientarte con calma y aterrizar materiales, estilo y presupuesto.';
  } else if (detectedIntent === 'design_custom') {
    suggestedAction = {
      type: 'open_configurator',
      label: 'Abrir configurador',
      collectionSlug: '',
      reason: '',
      notes: '',
      promptHint: buildConfiguratorHint({ occasion, jewelryType, budget, style }),
    };
    assistantMessage = 'Por lo que me cuentas, te conviene pasar al configurador para construir una propuesta mas precisa y luego cotizarla.';
  } else if (detectedIntent === 'account_help') {
    suggestedAction = {
      type: 'open_account',
      label: 'Ir a mi cuenta',
      collectionSlug: '',
      reason: '',
      notes: '',
      promptHint: '',
    };
    assistantMessage = 'Para temas de acceso, registro, favoritos o piezas guardadas, te llevo directo al area de cuenta.';
  } else if (detectedIntent === 'quote_request' && (budget === 'mas de 1.5 millones' || occasion === 'compromiso')) {
    suggestedAction = {
      type: 'open_appointment',
      label: 'Agendar asesoria',
      collectionSlug: '',
      reason: 'Asesoria para cotizacion personalizada',
      notes: `Ocasion: ${occasion || 'por definir'}. Tipo de joya: ${jewelryType || 'por definir'}. Presupuesto: ${budget || 'por definir'}.`,
      promptHint: '',
    };
    assistantMessage = 'Para una cotizacion mas fina y una pieza importante, lo mejor es pasar por asesoria para definir materiales, acabados y tiempos.';
  } else if (collectionSlug) {
    suggestedAction = {
      type: 'open_collection',
      label: 'Ver coleccion sugerida',
      collectionSlug,
      reason: '',
      notes: '',
      promptHint: '',
    };

    const introMap = {
      anillos: 'Te recomiendo empezar por anillos.',
      aretes: 'Te recomiendo empezar por aretes.',
      cadenas: 'Te recomiendo empezar por cadenas.',
      pulseras: 'Te recomiendo empezar por pulseras.',
    };

    const occasionHint = occasion ? ` Para ${occasion}, esa familia suele funcionar muy bien.` : '';
    const budgetHint = budget ? ` Con un presupuesto de ${budget}, podemos partir por piezas bien resueltas y luego ajustar el nivel de personalizacion.` : '';
    assistantMessage = `${introMap[collectionSlug]}${occasionHint}${budgetHint}`;
  } else if (buildFavoriteCollectionAction(context)) {
    suggestedAction = buildFavoriteCollectionAction(context);
    assistantMessage = 'Ya tengo una lectura inicial de tus gustos por lo que has guardado. Puedo seguir desde ahi para no hacerte empezar de cero.';
  }

  const conciergeLead = buildConciergeLead(context, extracted, detectedIntent);

  if (conciergeLead) {
    assistantMessage = `${conciergeLead} ${assistantMessage}`.trim();
  }

  return {
    assistantMessage,
    detectedIntent,
    confidence: 0.72,
    extracted,
    suggestedAction,
    quickReplies: buildQuickReplies(detectedIntent, collectionSlug || context.topCollectionSlug, context),
  };
}

function buildCatalogGuideSummary() {
  return Object.entries(COLLECTION_GUIDE)
    .map(
      ([slug, guide]) =>
        `${guide.title} (${slug}): mejor para ${guide.bestFor.join(', ')}; tono ${guide.tone}; piezas clave ${guide.products.join(', ')}.`,
    )
    .join(' ');
}

function buildSystemPrompt(memory, accountContext, profile) {
  const safeProfileName = sanitizeText(profile?.fullName, 80);

  return [
    'Eres la asesora virtual de El Atelier Artesanal.',
    'Responde siempre en espanol claro, calido, elegante y orientado a conversion.',
    'Devuelve solo JSON valido que cumpla exactamente el schema solicitado.',
    'No inventes precios exactos, tiempos cerrados ni disponibilidad garantizada.',
    'Si el cliente habla de compromiso, cotizacion importante o alto presupuesto, prioriza sugerir cita.',
    'Si el cliente quiere una pieza a medida, prioriza open_configurator.',
    'Si el cliente pide ver opciones, usa open_collection solo con estos slugs validos: anillos, aretes, cadenas, pulseras.',
    'Si el usuario pregunta por registro, login o guardar piezas, usa open_account.',
    'Si el usuario pide hablar directamente, usa open_whatsapp.',
    'Prioriza criterio comercial y consistencia del catalogo sobre creatividad libre.',
    'Politica de recomendacion: compromiso -> anillos. Uso diario -> cadenas. Regalo sin tipo definido -> aretes primero; si el presupuesto es alto, tambien puedes sugerir pulseras. Evento especial -> aretes o pulseras segun protagonismo. Aniversario -> anillos y luego pulseras como alternativa.',
    `Catalogo visible actual: ${buildCatalogGuideSummary()}`,
    `Conocimiento de negocio y FAQs: ${buildFaqKnowledgeSummary()}`,
    safeProfileName ? `Nombre del cliente autenticado: ${safeProfileName}.` : '',
    `Contexto real del cliente: ${buildAccountContextSummary(accountContext)}`,
    buildMemorySummary(memory),
    'Quick replies: entrega entre 2 y 4 opciones utiles y concretas.',
    'Si el cliente ya tiene favoritos, disenos guardados, cotizaciones o citas, usalos para responder como concierge y para evitar que empiece de cero.',
    'Si no estas seguro, detecta recommend_jewelry u unknown y sugiere la mejor siguiente accion sin inventar.',
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

function extractStructuredContent(payload) {
  const rawContent = payload?.choices?.[0]?.message?.content;

  if (Array.isArray(rawContent)) {
    const textBlock = rawContent.find((item) => item?.type === 'text');

    if (typeof textBlock?.text === 'string') {
      return JSON.parse(textBlock.text);
    }
  }

  if (typeof rawContent === 'string') {
    return JSON.parse(rawContent);
  }

  return null;
}

async function createOpenAIAssistantReply(message, conversation, memory, accountContext, profile) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_ASSISTANT_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: buildSystemPrompt(memory, accountContext, profile) },
        ...sanitizeConversation(conversation).map((entry) => ({
          role: entry.role,
          content: entry.text,
        })),
        { role: 'user', content: sanitizeText(message, 500) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'atelier_assistant_reply',
          strict: true,
          schema: assistantResponseSchema,
        },
      },
    }),
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'No se pudo completar la respuesta del asistente.');
  }

  const parsedContent = extractStructuredContent(payload);

  if (!parsedContent) {
    throw new Error('El asistente no devolvio una respuesta estructurada valida.');
  }

  return parsedContent;
}

async function createAzureAssistantReply(message, conversation, memory, accountContext, profile) {
  const response = await fetch(
    `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        temperature: 0.4,
        messages: [
          { role: 'system', content: buildSystemPrompt(memory, accountContext, profile) },
          ...sanitizeConversation(conversation).map((entry) => ({
            role: entry.role,
            content: entry.text,
          })),
          { role: 'user', content: sanitizeText(message, 500) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'atelier_assistant_reply',
            strict: true,
            schema: assistantResponseSchema,
          },
        },
      }),
    },
  );

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Azure OpenAI no pudo responder.');
  }

  const parsedContent = extractStructuredContent(payload);

  if (!parsedContent) {
    throw new Error('Azure OpenAI no devolvio una respuesta estructurada valida.');
  }

  return parsedContent;
}

function isAzureAssistantConfigured() {
  return Boolean(AZURE_OPENAI_API_KEY && AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_DEPLOYMENT);
}

function isOpenAIAssistantConfigured() {
  return Boolean(OPENAI_API_KEY);
}

function sanitizeAssistantReply(reply, fallback, memory, currentSignals) {
  if (!reply || typeof reply !== 'object') {
    return fallback;
  }

  const extracted = mergeExtractedWithMemory(
    {
      occasion: currentSignals.occasion || sanitizeText(reply?.extracted?.occasion, 80),
      jewelryType: currentSignals.jewelryType || sanitizeText(reply?.extracted?.jewelryType, 80),
      budget: currentSignals.budget || sanitizeText(reply?.extracted?.budget, 120),
      style: currentSignals.style || sanitizeText(reply?.extracted?.style, 80),
    },
    sanitizeMemory(memory),
  );

  const suggestedType = sanitizeText(reply?.suggestedAction?.type, 80);
  const normalizedCollectionSlug = Object.values(COLLECTIONS).includes(reply?.suggestedAction?.collectionSlug)
    ? reply.suggestedAction.collectionSlug
    : '';

  return applyRecommendationPolicy({
    assistantMessage: sanitizeText(reply.assistantMessage, 1200) || fallback.assistantMessage,
    detectedIntent: sanitizeText(reply.detectedIntent, 80) || fallback.detectedIntent,
    confidence: Number(reply.confidence) || fallback.confidence,
    extracted,
    suggestedAction: {
      type: suggestedType || 'none',
      label: sanitizeText(reply?.suggestedAction?.label, 120),
      collectionSlug: normalizedCollectionSlug,
      reason: sanitizeText(reply?.suggestedAction?.reason, 300),
      notes: sanitizeText(reply?.suggestedAction?.notes, 400),
      promptHint: sanitizeText(reply?.suggestedAction?.promptHint, 400),
    },
    quickReplies: Array.isArray(reply.quickReplies) && reply.quickReplies.length
      ? reply.quickReplies.slice(0, 4).map((item) => ({
          label: sanitizeText(item?.label, 60),
          message: sanitizeText(item?.message, 140),
        }))
      : fallback.quickReplies,
  });
}

function buildNextMemory(existingMemory, reply) {
  const safeExisting = sanitizeMemory(existingMemory);

  return {
    occasion: sanitizeText(reply?.extracted?.occasion, 80) || safeExisting.occasion,
    jewelryType: sanitizeText(reply?.extracted?.jewelryType, 80) || safeExisting.jewelryType,
    budget: sanitizeText(reply?.extracted?.budget, 120) || safeExisting.budget,
    style: sanitizeText(reply?.extracted?.style, 80) || safeExisting.style,
    lastIntent: sanitizeText(reply?.detectedIntent, 80) || safeExisting.lastIntent,
    lastCollectionSlug: sanitizeText(reply?.suggestedAction?.collectionSlug, 80) || safeExisting.lastCollectionSlug,
  };
}

async function createAssistantReply({ message, conversation, memory, persistentMemory, accountContext, profile }) {
  const combinedMemory = mergeMemoryLayers(memory, persistentMemory);
  const safeAccountContext = sanitizeAccountContext(accountContext);
  const currentSignals = inferCurrentMessageSignals(message);
  const fallback = applyRecommendationPolicy(buildFallbackReply(message, conversation, combinedMemory, safeAccountContext));

  if (isAzureAssistantConfigured()) {
    try {
      const reply = await createAzureAssistantReply(message, conversation, combinedMemory, safeAccountContext, profile);
      const sanitizedReply = sanitizeAssistantReply(reply, fallback, combinedMemory, currentSignals);

      return {
        ...sanitizedReply,
        memory: buildNextMemory(combinedMemory, sanitizedReply),
        provider: 'azure-openai',
        model: AZURE_OPENAI_DEPLOYMENT,
      };
    } catch (error) {
      console.error('[assistant-azure-error]', error);
    }
  }

  if (isOpenAIAssistantConfigured()) {
    try {
      const reply = await createOpenAIAssistantReply(message, conversation, combinedMemory, safeAccountContext, profile);
      const sanitizedReply = sanitizeAssistantReply(reply, fallback, combinedMemory, currentSignals);

      return {
        ...sanitizedReply,
        memory: buildNextMemory(combinedMemory, sanitizedReply),
        provider: 'openai',
        model: OPENAI_ASSISTANT_MODEL,
      };
    } catch (error) {
      console.error('[assistant-openai-error]', error);
    }
  }

  return {
    ...fallback,
    memory: buildNextMemory(combinedMemory, fallback),
    provider: 'rules-fallback',
    model: '',
  };
}

function isAssistantConfigured() {
  return isAzureAssistantConfigured() || isOpenAIAssistantConfigured();
}

module.exports = {
  createAssistantReply,
  sanitizeAccountContext,
  isAssistantConfigured,
};
