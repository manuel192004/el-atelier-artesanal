const { COLLECTIONS, COLLECTION_COPY, PRODUCT_CATALOG } = require('./catalog');

const DETAIL_PROMPTS = {
  occasion: [
    { label: 'Es para compromiso', message: 'Es para compromiso' },
    { label: 'Es para regalo', message: 'Es para regalo especial' },
  ],
  jewelryType: [
    { label: 'Quiero un anillo', message: 'Quiero un anillo' },
    { label: 'Prefiero aretes', message: 'Prefiero aretes' },
  ],
  style: [
    { label: 'Me gusta minimalista', message: 'Me gusta un estilo minimalista' },
    { label: 'Quiero algo romantico', message: 'Quiero algo romantico y delicado' },
  ],
  budget: [
    { label: 'Hasta 500 mil', message: 'Busco algo hasta 500 mil' },
    { label: 'Hasta 1.5 millones', message: 'Tengo un presupuesto de 500 mil a 1.5 millones' },
  ],
  metal: [
    { label: 'Prefiero oro amarillo', message: 'Prefiero oro amarillo' },
    { label: 'Prefiero oro blanco', message: 'Prefiero oro blanco' },
  ],
};

const DETAIL_LABELS = {
  occasion: 'ocasion',
  jewelryType: 'tipo de joya',
  style: 'estilo',
  budget: 'presupuesto',
  metal: 'metal',
};

function sanitizeText(value, maxLength = 500) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeText(value) {
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
    .slice(-8)
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      text: sanitizeText(entry?.text, 240),
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
      metal: '',
      gemstone: '',
      deadline: '',
    };
  }

  return {
    occasion: sanitizeText(memory.occasion, 80),
    jewelryType: sanitizeText(memory.jewelryType, 80),
    budget: sanitizeText(memory.budget, 120),
    style: sanitizeText(memory.style, 80),
    metal: sanitizeText(memory.metal, 80),
    gemstone: sanitizeText(memory.gemstone, 80),
    deadline: sanitizeText(memory.deadline, 80),
  };
}

function sanitizeAccountContext(accountContext) {
  if (!accountContext || typeof accountContext !== 'object') {
    return {
      summaryLine: '',
      topCollectionSlug: '',
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
    topCollectionSlug: Object.values(COLLECTIONS).includes(accountContext.topCollectionSlug)
      ? accountContext.topCollectionSlug
      : '',
    favoriteCollections: sanitizeArray(accountContext.favoriteCollections, (item) =>
      Object.values(COLLECTIONS).includes(item) ? item : '',
    ),
    favorites: sanitizeArray(accountContext.favorites, (item) => ({
      name: sanitizeText(item?.name, 120),
      reference: sanitizeText(item?.reference, 80),
      slug: sanitizeText(item?.slug, 80),
      category: sanitizeText(item?.category, 80),
    })),
    savedDesigns: sanitizeArray(accountContext.savedDesigns, (item) => ({
      title: sanitizeText(item?.title, 120),
      reference: sanitizeText(item?.reference, 80),
      prompt: sanitizeText(item?.prompt, 260),
      category: sanitizeText(item?.category, 80),
    })),
    quotes: sanitizeArray(accountContext.quotes, (item) => ({
      quoteId: sanitizeText(item?.quoteId, 80),
      title: sanitizeText(item?.title, 120),
      status: sanitizeText(item?.status, 80),
    })),
    appointments: sanitizeArray(accountContext.appointments, (item) => ({
      appointmentId: sanitizeText(item?.appointmentId, 80),
      reason: sanitizeText(item?.reason, 160),
      status: sanitizeText(item?.status, 80),
    })),
  };
}

function sanitizeClientContext(clientContext) {
  if (!clientContext || typeof clientContext !== 'object') {
    return {
      currentPath: '',
      currentCollectionSlug: '',
    };
  }

  const currentCollectionSlug = Object.values(COLLECTIONS).includes(clientContext.currentCollectionSlug)
    ? clientContext.currentCollectionSlug
    : '';

  return {
    currentPath: sanitizeText(clientContext.currentPath, 160),
    currentCollectionSlug,
  };
}

function detectOccasion(text) {
  if (/(compromiso|pedida|matrimonio|promesa)/.test(text)) return 'compromiso';
  if (/(aniversario|meses|anos juntos)/.test(text)) return 'aniversario';
  if (/(regalo|regalar|cumpleanos|sorpresa|dia de la madre|dia de las madres|mama|madre|novia|pareja|amiga|hija)/.test(text)) return 'regalo';
  if (/(diario|uso diario|oficina|trabajo)/.test(text)) return 'diario';
  if (/(evento|fiesta|boda|grado|graduacion|gala|cena)/.test(text)) return 'evento';
  return '';
}

function detectJewelryType(text) {
  if (/(anillo|sortija|aro)/.test(text)) return 'anillo';
  if (/(arete|aretes|topo|candonga|argolla)/.test(text)) return 'aretes';
  if (/(cadena|collar|gargantilla|dije|colgante)/.test(text)) return 'cadena';
  if (/(pulsera|brazalete)/.test(text)) return 'pulsera';
  return '';
}

function detectBudget(text) {
  if (/(500 mil|quinientos mil|economico|barato|bajo presupuesto)/.test(text)) {
    return 'hasta 500 mil';
  }

  if (/(2 millones|3 millones|lujo|alta joyeria|alto presupuesto|premium)/.test(text)) {
    return 'mas de 1.5 millones';
  }

  if (/(1 millon|millon|millones|800 mil|900 mil|entre 500)/.test(text)) {
    return '500 mil a 1.5 millones';
  }

  return '';
}

function detectStyle(text) {
  if (/(minimalista|limpio|sobrio|sencillo|discreto)/.test(text)) return 'minimalista';
  if (/(romantico|delicado|floral|perla|femenino)/.test(text)) return 'romantico';
  if (/(moderno|contemporaneo|actual|geometrico)/.test(text)) return 'moderno';
  if (/(clasico|tradicional|vintage|atemporal)/.test(text)) return 'clasico';
  if (/(statement|protagonista|llamativo|brillante|imponente)/.test(text)) return 'statement';
  return '';
}

function detectMetal(text) {
  if (/(oro blanco)/.test(text)) return 'oro blanco';
  if (/(oro amarillo|dorado)/.test(text)) return 'oro amarillo';
  if (/(oro rosado)/.test(text)) return 'oro rosado';
  if (/(plata)/.test(text)) return 'plata';
  return '';
}

function detectGemstone(text) {
  if (/(diamante|brillante|pave)/.test(text)) return 'diamante';
  if (/(perla)/.test(text)) return 'perla';
  if (/(esmeralda)/.test(text)) return 'esmeralda';
  if (/(zafiro)/.test(text)) return 'zafiro';
  if (/(rubi|ruby)/.test(text)) return 'rubi';
  return '';
}

function detectDeadline(text) {
  if (/(urgente|esta semana|manana|manana mismo)/.test(text)) return 'urgente';
  if (/(proximo mes|en un mes)/.test(text)) return 'proximo mes';
  if (/(navidad|diciembre)/.test(text)) return 'diciembre';
  return '';
}

function detectIntent(text) {
  if (/(whatsapp|humana|asesora|persona real)/.test(text)) return 'handoff_whatsapp';
  if (/(cita|agendar|agenda|asesoria|visita|reservar)/.test(text)) return 'schedule_appointment';
  if (/(diseno|disenar|personaliz|a medida|configurador)/.test(text)) return 'design_custom';
  if (/(precio|cotizacion|cotizar|cuanto cuesta|valor)/.test(text)) return 'quote_request';
  if (/(ver|coleccion|catalogo|opciones|mostrar)/.test(text)) return 'browse_collection';
  if (/(hola|busco|quiero|recomienda|recomendacion|ayuda)/.test(text)) return 'recommend_jewelry';
  return 'unknown';
}

function isGreetingOnly(text) {
  return /^(hola|hola hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hello)\b[!. ]*$/i.test(
    sanitizeText(text, 120),
  );
}

function inferCollectionSlug(jewelryType, occasion, currentCollectionSlug) {
  if (jewelryType === 'anillo') return COLLECTIONS.anillos;
  if (jewelryType === 'aretes') return COLLECTIONS.aretes;
  if (jewelryType === 'cadena') return COLLECTIONS.cadenas;
  if (jewelryType === 'pulsera') return COLLECTIONS.pulseras;
  if (occasion === 'compromiso' || occasion === 'aniversario') return COLLECTIONS.anillos;
  if (occasion === 'regalo') return COLLECTIONS.aretes;
  if (occasion === 'diario') return COLLECTIONS.cadenas;
  if (occasion === 'evento') return COLLECTIONS.pulseras;
  return currentCollectionSlug || '';
}

function buildConfiguratorHint(extracted) {
  return [
    extracted.jewelryType ? `Quiero una propuesta de ${extracted.jewelryType}.` : 'Quiero una joya personalizada.',
    extracted.occasion ? `La ocasion es ${extracted.occasion}.` : '',
    extracted.style ? `Me interesa un estilo ${extracted.style}.` : '',
    extracted.budget ? `Considera un presupuesto de ${extracted.budget}.` : '',
    extracted.metal ? `Prefiero ${extracted.metal}.` : '',
    extracted.gemstone ? `Quiero detalle en ${extracted.gemstone}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildAction(type, extra = {}) {
  return {
    type,
    label: extra.label || '',
    collectionSlug: extra.collectionSlug || '',
    productReference: extra.productReference || '',
    productName: extra.productName || '',
    reason: extra.reason || '',
    notes: extra.notes || '',
    promptHint: extra.promptHint || '',
  };
}

function buildFavoriteCollectionAction(accountContext) {
  const collectionSlug = accountContext.topCollectionSlug || accountContext.favoriteCollections[0] || '';

  if (!collectionSlug) {
    return null;
  }

  const collectionTitle = COLLECTION_COPY[collectionSlug]?.title || 'coleccion';

  return buildAction('open_collection', {
    label: `Ver ${collectionTitle}`,
    collectionSlug,
    reason: 'La sugerencia parte de las piezas y familias que ya te interesaron dentro de tu cuenta.',
  });
}

function buildSavedDesignAction(accountContext, extracted) {
  const savedDesign = accountContext.savedDesigns[0];

  if (!savedDesign) {
    return null;
  }

  return buildAction('open_configurator', {
    label: 'Retomar diseno guardado',
    reason: 'Ya tienes una propuesta iniciada, asi que conviene retomarla en vez de empezar desde cero.',
    promptHint:
      savedDesign.prompt ||
      [
        extracted.jewelryType ? `Quiero una propuesta de ${extracted.jewelryType}.` : '',
        extracted.style ? `Me interesa un estilo ${extracted.style}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
  });
}

function buildConciergeLead(accountContext, profile) {
  const name = sanitizeText(profile?.fullName, 80).split(' ')[0];

  if (!name) {
    return '';
  }

  if (accountContext.savedDesigns.length) {
    return `Hola ${name}, ya puedo retomar lo que venias construyendo.`;
  }

  if (accountContext.favoriteCollections.length) {
    return `Hola ${name}, ya tengo una lectura inicial de tus gustos.`;
  }

  if (accountContext.quotes.length || accountContext.appointments.length) {
    return `Hola ${name}, ya puedo orientarte usando tu historial en Orviane.`;
  }

  return '';
}

function mergeQuickReplies(...groups) {
  const seen = new Set();
  const merged = [];

  groups
    .flat()
    .filter((item) => item && item.label && item.message)
    .forEach((item) => {
      const key = `${item.label}::${item.message}`;

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push(item);
    });

  return merged.slice(0, 4);
}

function buildKnownDetails(extracted) {
  return [
    extracted.occasion ? `Ocasion: ${extracted.occasion}` : '',
    extracted.jewelryType ? `Joya: ${extracted.jewelryType}` : '',
    extracted.style ? `Estilo: ${extracted.style}` : '',
    extracted.metal ? `Metal: ${extracted.metal}` : '',
    extracted.gemstone ? `Piedra: ${extracted.gemstone}` : '',
    extracted.budget ? `Presupuesto: ${extracted.budget}` : '',
  ].filter(Boolean);
}

function buildMissingDetailKeys(extracted, intent, product, collectionSlug) {
  const missing = [];

  if (!extracted.occasion && intent !== 'browse_collection') {
    missing.push('occasion');
  }

  if (!extracted.jewelryType && !collectionSlug) {
    missing.push('jewelryType');
  }

  if (!extracted.style && !product) {
    missing.push('style');
  }

  if (!extracted.budget && (intent === 'quote_request' || intent === 'schedule_appointment' || intent === 'design_custom')) {
    missing.push('budget');
  }

  if (!extracted.metal && (intent === 'design_custom' || Boolean(product))) {
    missing.push('metal');
  }

  return missing.slice(0, 3);
}

function buildDiscoveryReplies(missingDetailKeys) {
  return missingDetailKeys.flatMap((key) => DETAIL_PROMPTS[key] || []);
}

function buildGuidanceCard({ suggestedAction, collectionSlug, product, extracted }) {
  if (suggestedAction.type === 'open_product' && product) {
    return {
      eyebrow: 'Pieza sugerida',
      title: `${product.name} (${product.reference})`,
      summary: 'Es la referencia mas clara para empezar y luego ajustar detalles sin abrir demasiadas opciones a la vez.',
      bullets: [
        extracted.occasion ? `Funciona bien para ${extracted.occasion}.` : '',
        extracted.style ? `Mantiene una lectura ${extracted.style}.` : '',
        extracted.metal ? `Ya va alineada con ${extracted.metal}.` : '',
      ].filter(Boolean),
    };
  }

  if (suggestedAction.type === 'open_collection' && collectionSlug) {
    const collectionCopy = COLLECTION_COPY[collectionSlug];

    if (!collectionCopy) {
      return null;
    }

    return {
      eyebrow: 'Coleccion sugerida',
      title: collectionCopy.title,
      summary: collectionCopy.shortReason,
      bullets: [
        extracted.occasion ? `La consulta apunta a ${extracted.occasion}.` : '',
        extracted.jewelryType ? `Tu foco actual esta en ${extracted.jewelryType}.` : '',
        extracted.style ? `Podemos afinar desde un lenguaje ${extracted.style}.` : '',
      ].filter(Boolean),
    };
  }

  if (suggestedAction.type === 'open_configurator') {
    return {
      eyebrow: 'Ruta sugerida',
      title: 'Configurador',
      summary: 'Tu idea ya tiene suficiente forma para convertirla en un brief editable y no seguir solo en conversacion.',
      bullets: [
        extracted.jewelryType ? `Pieza base: ${extracted.jewelryType}.` : '',
        extracted.style ? `Direccion visual: ${extracted.style}.` : '',
        extracted.budget ? `Presupuesto de referencia: ${extracted.budget}.` : '',
      ].filter(Boolean),
    };
  }

  if (suggestedAction.type === 'open_appointment') {
    return {
      eyebrow: 'Ruta sugerida',
      title: 'Cita corta',
      summary: 'Conviene resolver tiempos, materiales y presupuesto con acompanamiento para no adivinar.',
      bullets: [
        extracted.occasion ? `Motivo: ${extracted.occasion}.` : '',
        extracted.deadline ? `Tiempo: ${extracted.deadline}.` : '',
        extracted.budget ? `Presupuesto actual: ${extracted.budget}.` : '',
      ].filter(Boolean),
    };
  }

  if (suggestedAction.type === 'open_whatsapp') {
    return {
      eyebrow: 'Escala humana',
      title: 'WhatsApp directo',
      summary: 'Es el mejor paso cuando ya quieres trato mas directo o necesitas cerrar dudas rapido.',
      bullets: [],
    };
  }

  return null;
}

function recommendProduct(extracted, collectionSlug) {
  const scored = PRODUCT_CATALOG
    .map((product) => {
      let score = 0;

      if (collectionSlug && product.collectionSlug === collectionSlug) score += 2;
      if (extracted.jewelryType && product.type === extracted.jewelryType) score += 4;
      if (extracted.occasion && product.occasions.includes(extracted.occasion)) score += 3;
      if (extracted.style && product.style === extracted.style) score += 2;
      if (extracted.metal && product.metal === extracted.metal) score += 2;
      if (extracted.gemstone && product.gemstones.includes(extracted.gemstone)) score += 1;

      return { product, score };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.score > 2 ? scored[0].product : null;
}

function buildProductRecommendationMessage(product, extracted, isMothersDayIntent) {
  if (isMothersDayIntent) {
    return `Para el Dia de las Madres buscaria algo elegante, facil de usar y con brillo delicado. La referencia mas clara para empezar es ${product.name} (${product.reference}); desde ahi podemos ajustar metal, tamano o nivel de protagonismo.`;
  }

  if (extracted.occasion === 'regalo') {
    return `Para regalo conviene una pieza bonita pero facil de acertar. Empezaria por ${product.name} (${product.reference}) y luego afinamos estilo, presupuesto o si prefieres algo mas discreto.`;
  }

  if (extracted.jewelryType === 'anillo') {
    return `Si buscas un anillo, empezaria por ${product.name} (${product.reference}) porque da una base clara para comparar estilo, metal y protagonismo.`;
  }

  return `La referencia mas clara para empezar es ${product.name} (${product.reference}). Desde ahi podemos afinar estilo, metal o personalizacion.`;
}

function findReferencedProduct(text) {
  const match = sanitizeText(text, 600).toUpperCase().match(/\b[A-Z]{3}-\d{3}\b/);

  if (!match) {
    return null;
  }

  return PRODUCT_CATALOG.find((product) => product.reference === match[0]) || null;
}

function buildQuickReplies(intent, collectionSlug, suggestedAction, missingDetailKeys, greetingOnly = false) {
  const discoveryReplies = buildDiscoveryReplies(missingDetailKeys);

  if (greetingOnly) {
    return mergeQuickReplies([
      { label: 'Ver colecciones', message: 'Quiero ver colecciones' },
      { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
      { label: 'Quiero un regalo', message: 'Quiero una joya para regalo especial' },
      { label: 'Diseno a medida', message: 'Quiero una joya personalizada' },
    ]);
  }

  if (suggestedAction.type === 'open_product') {
    return mergeQuickReplies(discoveryReplies, [
      { label: 'Ver esta pieza', message: `Quiero ver la referencia ${suggestedAction.productReference}` },
      { label: 'Personalizar esta idea', message: 'Quiero personalizar esta idea' },
      { label: 'Agendar asesoria', message: 'Quiero agendar una cita' },
    ]);
  }

  if (intent === 'schedule_appointment') {
    return mergeQuickReplies(discoveryReplies, [
      { label: 'Abrir cita', message: 'Quiero agendar una cita' },
      { label: 'Ir a WhatsApp', message: 'Quiero hablar por WhatsApp' },
      { label: 'Seguir viendo', message: 'Prefiero seguir viendo opciones' },
    ]);
  }

  if (intent === 'design_custom') {
    return mergeQuickReplies(discoveryReplies, [
      { label: 'Abrir configurador', message: 'Llevame al configurador' },
      { label: 'Definir estilo', message: 'Quiero ayuda para definir estilo y materiales' },
      { label: 'Pedir asesoria', message: 'Quiero una asesoria personalizada' },
    ]);
  }

  if (collectionSlug) {
    const collectionTitle = COLLECTION_COPY[collectionSlug]?.title || 'coleccion';

    return mergeQuickReplies(discoveryReplies, [
      { label: `Ver ${collectionTitle}`, message: `Quiero ver ${collectionTitle.toLowerCase()}` },
      { label: 'Personalizar idea', message: 'Quiero una joya personalizada' },
      { label: 'Agendar asesoria', message: 'Quiero agendar una cita' },
    ]);
  }

  return mergeQuickReplies(discoveryReplies, [
    { label: 'Ver colecciones', message: 'Quiero ver colecciones' },
    { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
    { label: 'Quiero un regalo', message: 'Quiero una joya para regalo especial' },
    { label: 'Necesito asesoria', message: 'Necesito ayuda para elegir una joya' },
  ]);
}

function buildReplyFromSignals({ message, conversation, memory, clientContext, accountContext, profile }) {
  const safeConversation = sanitizeConversation(conversation);
  const safeMemory = sanitizeMemory(memory);
  const safeClientContext = sanitizeClientContext(clientContext);
  const safeAccountContext = sanitizeAccountContext(accountContext);
  const currentMessage = normalizeText(message);
  const userSignalText = normalizeText(
    `${safeConversation
      .filter((entry) => entry.role === 'user')
      .map((entry) => entry.text)
      .join(' ')} ${message}`,
  );
  const extracted = {
    occasion: detectOccasion(userSignalText) || safeMemory.occasion,
    jewelryType: detectJewelryType(userSignalText) || safeMemory.jewelryType,
    budget: detectBudget(userSignalText) || safeMemory.budget,
    style: detectStyle(userSignalText) || safeMemory.style,
    metal: detectMetal(userSignalText) || safeMemory.metal,
    gemstone: detectGemstone(userSignalText) || safeMemory.gemstone,
    deadline: detectDeadline(userSignalText) || safeMemory.deadline,
  };
  const intent = detectIntent(currentMessage);
  const collectionSlug = inferCollectionSlug(
    extracted.jewelryType,
    extracted.occasion,
    safeClientContext.currentCollectionSlug || safeAccountContext.topCollectionSlug,
  );
  const isMothersDayIntent = /(dia de la madre|dia de las madres|mama|madre)/.test(userSignalText);
  const referencedProduct = findReferencedProduct(message);
  const product = referencedProduct || recommendProduct(extracted, collectionSlug);
  const favoriteCollectionAction = buildFavoriteCollectionAction(safeAccountContext);
  const savedDesignAction = buildSavedDesignAction(safeAccountContext, extracted);
  const missingDetailKeys = buildMissingDetailKeys(extracted, intent, product, collectionSlug);
  const greetingOnly = isGreetingOnly(message);

  let assistantMessage = 'Puedo ayudarte a aterrizar la mejor ruta entre colecciones, configurador y cita.';
  let suggestedAction = buildAction('none', {
    label: 'Seguir conversando',
  });

  if (greetingOnly) {
    assistantMessage = 'Hola. Puedo ayudarte a elegir una joya, ver colecciones, personalizar una idea o agendar una asesoria. Si quieres, empezamos por tipo de joya, ocasion o estilo.';
    suggestedAction = buildAction('none', {
      label: 'Explorar opciones',
    });
  } else if ((/retomar|mi diseno/.test(currentMessage)) && savedDesignAction) {
    assistantMessage = 'Lo mas eficiente es retomar tu diseno guardado y afinarlo desde ahi.';
    suggestedAction = savedDesignAction;
  } else if ((/favorit/.test(currentMessage) || /segun mis favoritos/.test(currentMessage)) && favoriteCollectionAction) {
    assistantMessage = 'Tomando como referencia lo que ya guardaste, te conviene seguir por esa familia.';
    suggestedAction = favoriteCollectionAction;
  } else if (intent === 'handoff_whatsapp') {
    assistantMessage = 'Te conviene pasar a WhatsApp para continuar con una asesora humana sin perder el contexto.';
    suggestedAction = buildAction('open_whatsapp', {
      label: 'Abrir WhatsApp',
      reason: 'Continuar con una asesora humana.',
    });
  } else if (intent === 'schedule_appointment' || extracted.deadline === 'urgente') {
    assistantMessage = 'Lo mejor aqui es abrir una cita corta para aterrizar materiales, tiempos y presupuesto sin adivinar.';
    suggestedAction = buildAction('open_appointment', {
      label: 'Abrir cita',
      reason: 'Aterrizar el proyecto con acompanamiento.',
      notes: [
        extracted.occasion ? `Ocasion: ${extracted.occasion}.` : '',
        extracted.jewelryType ? `Tipo de joya: ${extracted.jewelryType}.` : '',
        extracted.budget ? `Presupuesto: ${extracted.budget}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    });
  } else if (intent === 'quote_request') {
    assistantMessage = product
      ? `Para cotizar con precision, usemos la referencia ${product.name} (${product.reference}) y llevemos ese contexto a WhatsApp.`
      : 'Para cotizar bien necesito al menos tipo de joya, ocasion y material. Si ya tienes eso, te llevo a WhatsApp con el contexto.';
    suggestedAction = product
      ? buildAction('open_product', {
          label: `Ver ${product.name}`,
          collectionSlug: product.collectionSlug,
          productReference: product.reference,
          productName: product.name,
          reason: 'Primero conviene cotizar sobre una referencia concreta.',
          promptHint: buildConfiguratorHint(extracted),
        })
      : buildAction('open_whatsapp', {
          label: 'Cotizar por WhatsApp',
          reason: 'Enviar la solicitud de precio con contexto.',
          notes: [
            extracted.occasion ? `Ocasion: ${extracted.occasion}.` : '',
            extracted.jewelryType ? `Tipo de joya: ${extracted.jewelryType}.` : '',
            extracted.budget ? `Presupuesto: ${extracted.budget}.` : '',
          ]
            .filter(Boolean)
            .join(' '),
        });
  } else if (intent === 'design_custom') {
    assistantMessage = 'Tu idea ya pide configurador: ahi podemos convertirla en un brief mucho mas claro.';
    suggestedAction = buildAction('open_configurator', {
      label: 'Abrir configurador',
      reason: 'Pasar de idea a propuesta editable.',
      promptHint: buildConfiguratorHint(extracted),
    });
  } else if (product) {
    assistantMessage = buildProductRecommendationMessage(product, extracted, isMothersDayIntent);
    suggestedAction = buildAction('open_product', {
      label: `Ver ${product.name}`,
      collectionSlug: product.collectionSlug,
      productReference: product.reference,
      productName: product.name,
      reason: 'Es la referencia que mejor cruza tipo de joya, ocasion y estilo.',
      promptHint: buildConfiguratorHint(extracted),
    });
  } else if (favoriteCollectionAction && (intent === 'recommend_jewelry' || intent === 'unknown' || intent === 'browse_collection')) {
    assistantMessage = 'Ya tengo una buena base con lo que te ha gustado antes, asi que puedo orientarte sin hacerte empezar de cero.';
    suggestedAction = favoriteCollectionAction;
  } else if (collectionSlug) {
    const collectionCopy = COLLECTION_COPY[collectionSlug];
    assistantMessage =
      isMothersDayIntent && extracted.occasion === 'regalo'
        ? `Para el Dia de las Madres, la mejor familia para empezar es ${collectionCopy.title}. Te ayuda a encontrar algo elegante, facil de regalar y con muy buena salida para esa ocasion.`
        : `La mejor familia para empezar es ${collectionCopy.title}: ${collectionCopy.shortReason}.`;
    suggestedAction = buildAction('open_collection', {
      label: `Ver ${collectionCopy.title}`,
      collectionSlug,
      reason: 'Es la coleccion mas alineada con lo que contaste.',
    });
  } else {
    assistantMessage = 'Para orientarte mejor dime al menos una de estas tres cosas: ocasion, tipo de joya o estilo.';
  }

  const conciergeLead = buildConciergeLead(safeAccountContext, profile);

  if (conciergeLead) {
    assistantMessage = `${conciergeLead} ${assistantMessage}`.trim();
  }

  if (!greetingOnly && missingDetailKeys.length && suggestedAction.type === 'none') {
    assistantMessage = `${assistantMessage} Si quieres, afinamos ${missingDetailKeys
      .map((key) => DETAIL_LABELS[key])
      .filter(Boolean)
      .join(', ')} para recomendar con mas precision.`;
  }

  const guidanceCard = buildGuidanceCard({
    suggestedAction,
    collectionSlug,
    product,
    extracted,
  });

  return {
    assistantMessage,
    detectedIntent: intent,
    suggestedAction,
    quickReplies: buildQuickReplies(intent, collectionSlug, suggestedAction, missingDetailKeys, greetingOnly),
    memory: extracted,
    guidanceCard,
    diagnostics: {
      knownDetails: buildKnownDetails(extracted),
      missingDetails: missingDetailKeys.map((key) => DETAIL_LABELS[key]).filter(Boolean),
      route: suggestedAction.type,
    },
    accountContext: safeAccountContext,
    provider: 'assistant-v2-rules',
    model: '',
  };
}

function createAssistantV2Reply(payload) {
  return buildReplyFromSignals(payload || {});
}

module.exports = {
  createAssistantV2RulesReply: createAssistantV2Reply,
  createAssistantV2Reply,
};
