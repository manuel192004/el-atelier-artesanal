const { COLLECTIONS, COLLECTION_COPY, PRODUCT_CATALOG } = require('./catalog');
const {
  classifyWithPhraseBank,
  getPhraseBankStats,
} = require('./phrase-bank');
const {
  buildValuationEstimate,
  buildValuationMessage,
  buildValuationQuickReplies,
  parseBudgetToMaxCop,
} = require('./valuation');

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
    { label: 'Quiero algo romántico', message: 'Quiero algo romántico y delicado' },
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
  occasion: 'ocasión',
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
      valuationSummary: '',
      lastIntent: '',
      lastCollectionSlug: '',
      lastProductReference: '',
      // Nuevos campos para restricciones
      avoidedFeatures: [],
      budgetMaxCop: null,
    };
  }

  const avoided = Array.isArray(memory.avoidedFeatures)
    ? memory.avoidedFeatures.map((f) => sanitizeText(f, 60)).filter(Boolean)
    : [];

  return {
    occasion: sanitizeText(memory.occasion, 80),
    jewelryType: sanitizeText(memory.jewelryType, 80),
    budget: sanitizeText(memory.budget, 120),
    style: sanitizeText(memory.style, 80),
    metal: sanitizeText(memory.metal, 80),
    gemstone: sanitizeText(memory.gemstone, 80),
    deadline: sanitizeText(memory.deadline, 80),
    valuationSummary: sanitizeText(memory.valuationSummary, 240),
    lastIntent: sanitizeText(memory.lastIntent, 80),
    lastCollectionSlug: sanitizeText(memory.lastCollectionSlug, 80),
    lastProductReference: sanitizeText(memory.lastProductReference, 80),
    avoidedFeatures: avoided,
    budgetMaxCop: Number.isFinite(memory.budgetMaxCop) ? memory.budgetMaxCop : null,
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

function detectAvoidedFeatures(text) {
  const normalized = normalizeText(text);
  const avoided = [];

  if (/(no.*(pave|brillante|mucho brillo|statement|llamativo))/i.test(normalized)) avoided.push('pave');
  if (/(no.*(diamante|brillantes grandes|muchos diamantes))/i.test(normalized)) avoided.push('diamantes grandes');
  if (/(no.*(amarillo|dorado))/i.test(normalized) && !normalized.includes('oro amarillo')) avoided.push('oro amarillo');
  if (/(prefiero.*(discreto|delicado|minimal|sobrio|simple))/i.test(normalized)) avoided.push('estilo llamativo');
  if (/(no.*(grueso|gruesa|pesado|pesada|voluminoso))/i.test(normalized)) avoided.push('piezas pesadas');
  if (/(no.*(moderno|contemporaneo|geometrico))/i.test(normalized)) avoided.push('estilo moderno');
  if (/(evito|evitar|odio|no quiero|nada de|sin|rechazo).*(pave|diamante|brillo|amarillo|grueso)/i.test(normalized)) {
    // Captura genérica adicional
    if (normalized.includes('pave')) avoided.push('pave');
    if (normalized.includes('diamante')) avoided.push('diamantes grandes');
  }

  return Array.from(new Set(avoided));
}

function detectStyle(text) {
  if (/(minimalista|limpio|sobrio|sencillo|discreto)/.test(text)) return 'minimalista';
  if (/(romantico|romantica|romanticos|romanticas|delicado|delicada|delicados|delicadas|floral|perla|femenino|femenina)/.test(text)) return 'romantico';
  if (/(moderno|moderna|modernos|modernas|contemporaneo|contemporanea|actual|geometrico|geometrica)/.test(text)) return 'moderno';
  if (/(clasico|clasica|clasicos|clasicas|tradicional|vintage|atemporal|elegante|elegantes)/.test(text)) return 'clasico';
  if (/(statement|protagonista|llamativo|llamativa|llamativos|llamativas|brillante|brillantes|imponente)/.test(text)) return 'statement';
  return '';
}

function detectMetal(text) {
  if (/(platino)/.test(text)) return 'platino';
  if (/(paladio)/.test(text)) return 'paladio';
  if (/(cobre)/.test(text)) return 'cobre';
  if (/(aluminio)/.test(text)) return 'aluminio';
  if (/(oro blanco)/.test(text)) return 'oro blanco';
  if (/(oro amarillo|dorado)/.test(text)) return 'oro amarillo';
  if (/(oro rosado)/.test(text)) return 'oro rosado';
  if (/(oro)/.test(text)) return 'oro amarillo';
  if (/(plata)/.test(text)) return 'plata';
  return '';
}

function detectGemstone(text) {
  if (/(diamante|brillante|pave)/.test(text)) return 'diamante';
  if (/(perla|akoya|tahitian|tahitiana|south sea|mar del sur|edison|freshwater|agua dulce)/.test(text)) return 'perla';
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

function detectRefinement(text) {
  const normalized = normalizeText(text);

  if (/(mas grande|mas grande|agrandar|mas grande|mas amplio|mas pesado|mas grueso|mas voluminoso)/.test(normalized)) return 'larger';
  if (/(mas pequeno|mas chico|mas delgado|mas fino|mas delicado|mas ligero)/.test(normalized)) return 'smaller';
  if (/(mas discreto|mas sobrio|menos brillante|mas minimal|mas sencillo)/.test(normalized)) return 'more_discreet';
  if (/(mas brillante|mas llamativo|mas grande|con mas brillo|con pave)/.test(normalized)) return 'more_shiny';
  if (/(mas barato|mas economico|opcion mas baja|menos presupuesto)/.test(normalized)) return 'cheaper';
  if (/(otra version|otra opcion|algo diferente|otra pieza|otro estilo|en otro metal)/.test(normalized)) return 'different_version';
  if (/(mas elegante|mas fino|mas premium|mas refinado)/.test(normalized)) return 'more_elegant';

  return '';
}

function detectStrongReset(text) {
  const normalized = normalizeText(text);
  if (/(olvida|olvidate|borra|borrar|empecemos de nuevo|nuevo|reset|deja lo anterior|no lo anterior)/.test(normalized)) {
    return true;
  }
  return false;
}

function detectIntent(text) {
  if (/(whatsapp|humana|asesora|persona real)/.test(text)) return 'handoff_whatsapp';
  if (/(cita|agendar|agenda|asesoria|visita|reservar)/.test(text)) return 'schedule_appointment';
  if (/(diseno|disenar|personaliz|a medida|configurador)/.test(text)) return 'design_custom';
  if (/(precio|cotizacion|cotizar|cuanto cuesta|cuanto vale|cuanto esta|valor|valora|avalu|avaluo|estimar|estimacion|calcular|mineral|gramo|gramos|quilate|quilates|kilate|kilates|\bct\b|\bcts\b|gema|piedra|oro|plata|platino|paladio|cobre|aluminio|diamante|esmeralda|zafiro|rubi|perla)/.test(text)) return 'quote_request';
  if (/(ver|coleccion|catalogo|opciones|mostrar)/.test(text)) return 'browse_collection';
  if (/(hola|busco|quiero|recomienda|recomendacion|ayuda)/.test(text)) return 'recommend_jewelry';
  return 'unknown';
}

function getCourtesyType(text) {
  const normalized = normalizeText(text);

  // Saludos puros o con pregunta cordial
  if (/^(hola|hola hola|buenos dias|buen dia|buenas tardes|buenas noches|hey|hello|buenas)\b[!. ]*$/.test(normalized)) return 'greeting';
  if (/^(buenos dias|buen dia|buenas tardes|buenas noches)?\s*(como estas|que tal|como vas|como te va|todo bien|como andas)(\s*(tu|orvia|todo bien|como estas))?/.test(normalized)) return 'wellbeing';

  // Agradecimientos
  if (/^(gracias|muchas gracias|mil gracias|super gracias|te agradezco|ok gracias|listo gracias|perfecto gracias|vale gracias|gracias por todo)[!. ]*$/.test(normalized)) return 'thanks';

  // Reconocimientos
  if (/^(perfecto|listo|ok|okay|vale|de acuerdo|me parece bien|super|excelente|esta bien|genial|me gusta|bueno)[!. ]*$/.test(normalized)) return 'acknowledge';

  // Despedidas
  if (/^(adios|chao|hasta luego|nos vemos|bye|cuídate|que te vaya bien)[!. ]*$/.test(normalized)) return 'goodbye';

  // Elogios
  if (/(me gusta|me encanto|muy bonito|que bonito|esta hermoso|esta linda|esta precioso|me fascina|queda precioso|es hermoso)/.test(normalized)) return 'compliment';

  // Preguntas sobre ella misma o conversación ligera
  if (/(como estas|que tal|como vas|todo bien|que cuentas|que haces|como te llamas)/.test(normalized)) return 'wellbeing';

  return '';
}

function buildCourtesyMessage(courtesyType, extracted = {}) {
  const memoryHint = extracted.jewelryType
    ? ` Tengo presente lo del ${extracted.jewelryType}.`
    : extracted.valuationSummary
    ? ` Recuerdo la última valoración que hicimos.`
    : '';

  const hasContext = extracted.jewelryType || extracted.valuationSummary || extracted.metal || extracted.style;

  if (courtesyType === 'greeting') {
    const greetings = [
      `Hola. Qué gusto saludarte. ¿En qué te puedo ayudar hoy?${hasContext ? ' Si quieres retomamos lo que veníamos hablando.' : ''}`,
      `Buenos días. Estoy aquí para ayudarte con gusto. ¿Buscas algo en particular o solo quieres explorar?`,
      `Hola, ¿qué tal? Me alegra que estés aquí. Cuéntame, ¿qué te trae por Orviane hoy?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (courtesyType === 'thanks') {
    return `Con mucho gusto. Me alegra poder ayudarte.${memoryHint} Estoy aquí cuando quieras seguir mirando opciones, ajustar algo o agendar una cita.`;
  }

  if (courtesyType === 'wellbeing') {
    const wellbeingReplies = [
      `Muy bien, gracias por preguntar. Lista y con ganas de ayudarte a encontrar algo bonito.${memoryHint}`,
      `Estoy excelente, gracias. ¿Y tú cómo estás? Cuéntame, ¿en qué te puedo orientar hoy con las joyas?`,
      `Muy bien, por aquí todo en orden. Me encanta poder conversar contigo. ¿Qué te gustaría ver o ajustar hoy?`
    ];
    return wellbeingReplies[Math.floor(Math.random() * wellbeingReplies.length)];
  }

  if (courtesyType === 'acknowledge') {
    return `Perfecto. ${memoryHint} Cuando quieras seguimos. ¿Quieres que comparemos opciones, miremos otra pieza o afinemos algo de lo que ya vimos?`;
  }

  if (courtesyType === 'goodbye') {
    return `Gracias por tu tiempo. Fue un gusto hablar contigo. Cuando quieras, aquí estoy para seguir ayudándote con tu joya. Que tengas un excelente día.`;
  }

  if (courtesyType === 'compliment') {
    return `¡Qué alegría que te haya gustado! ${memoryHint} Si quieres, podemos buscar algo similar pero en otro metal, más discreto, más brillante o totalmente diferente. ¿Qué te parece?`;
  }

  return '';
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
    extracted.occasion ? `La ocasión es ${extracted.occasion}.` : '',
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
    label: 'Retomar diseño guardado',
    reason: 'Ya tienes una propuesta iniciada, así que conviene retomarla en vez de empezar desde cero.',
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
    return `Hola ${name}, ya puedo retomar lo que venías construyendo.`;
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
  const base = [
    extracted.occasion ? `Ocasión: ${extracted.occasion}` : '',
    extracted.jewelryType ? `Joya: ${extracted.jewelryType}` : '',
    extracted.style ? `Estilo: ${extracted.style}` : '',
    extracted.metal ? `Metal: ${extracted.metal}` : '',
    extracted.gemstone ? `Piedra: ${extracted.gemstone}` : '',
    extracted.budget ? `Presupuesto: ${extracted.budget}` : '',
  ].filter(Boolean);

  if (Array.isArray(extracted.avoidedFeatures) && extracted.avoidedFeatures.length > 0) {
    base.push(`Evita: ${extracted.avoidedFeatures.join(', ')}`);
  }

  return base;
}

function buildValuationMemorySummary(valuation) {
  if (!valuation?.ready) {
    return '';
  }

  if (valuation.isMetalPriceOnly) {
    return `${valuation.materialSubject} a ${valuation.pricePerGramFormatted} por gramo`;
  }

  if (valuation.isGemstonePriceOnly && valuation.gemstoneValuation) {
    const gem = valuation.gemstoneValuation;
    const unitCopy = gem.unit === 'pieza' ? 'pieza' : 'quilate';
    return `${gem.label} nivel ${gem.tierLabel}, referencia ${gem.perUnitRange.map((value) => `$${value.toLocaleString('es-CO')}`).join(' a ')} COP por ${unitCopy}`;
  }

  return `${valuation.type} en ${valuation.materialDescriptor}, rango ${valuation.lowFormatted} a ${valuation.highFormatted}`;
}

function describeStyle(style) {
  return {
    moderno: 'moderna',
    romantico: 'romantica',
    minimalista: 'minimalista',
    clasico: 'clasica',
    statement: 'protagonista',
  }[style] || style;
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
      summary: 'Es la referencia más clara para empezar y luego ajustar detalles sin abrir demasiadas opciones a la vez.',
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
      eyebrow: 'Colección sugerida',
      title: collectionCopy.title,
      summary: collectionCopy.shortReason,
      bullets: [
        extracted.occasion ? `La consulta apunta a ${extracted.occasion}.` : '',
        extracted.jewelryType ? `Tu foco actual está en ${extracted.jewelryType}.` : '',
        extracted.style ? `Podemos afinar desde un lenguaje ${extracted.style}.` : '',
      ].filter(Boolean),
    };
  }

  if (suggestedAction.type === 'open_configurator') {
    return {
      eyebrow: 'Ruta sugerida',
      title: 'Configurador',
      summary: 'Tu idea ya tiene suficiente forma para convertirla en un brief editable y no seguir solo en conversación.',
      bullets: [
        extracted.jewelryType ? `Pieza base: ${extracted.jewelryType}.` : '',
        extracted.style ? `Dirección visual: ${extracted.style}.` : '',
        extracted.budget ? `Presupuesto de referencia: ${extracted.budget}.` : '',
      ].filter(Boolean),
    };
  }

  if (suggestedAction.type === 'open_appointment') {
    return {
      eyebrow: 'Ruta sugerida',
      title: 'Cita corta',
      summary: 'Conviene resolver tiempos, materiales y presupuesto con acompañamiento para no adivinar.',
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
  const avoided = Array.isArray(extracted.avoidedFeatures) ? extracted.avoidedFeatures : [];
  const budgetMax = extracted.budgetMaxCop || null;

  // Mapeo aproximado de priceLevel a rangos en COP
  const priceRange = {
    entry: [250000, 650000],
    mid: [550000, 1200000],
    premium: [950000, 2500000],
    high: [2200000, 5500000],
  };

  const scored = PRODUCT_CATALOG
    .map((product) => {
      let score = 0;

      if (collectionSlug && product.collectionSlug === collectionSlug) score += 2;
      if (extracted.jewelryType && product.type === extracted.jewelryType) score += 4;
      if (extracted.occasion && product.occasions.includes(extracted.occasion)) score += 3;
      if (extracted.style && product.style === extracted.style) score += 2;
      if (extracted.metal && product.metal === extracted.metal) score += 2;
      if (extracted.gemstone && product.gemstones.includes(extracted.gemstone)) score += 1;

      // Penalización fuerte por restricciones negativas
      const productText = `${product.name} ${product.displayType || ''} ${product.styleLabel || ''}`.toLowerCase();
      let penalty = 0;

      avoided.forEach((feature) => {
        if (feature.includes('pave') && (productText.includes('pave') || productText.includes('brillante'))) penalty += 8;
        if (feature.includes('diamante') && product.gemstones.includes('diamante')) penalty += 7;
        if (feature.includes('amarillo') && product.metal.includes('amarillo')) penalty += 5;
        if (feature.includes('llamativo') && (product.protagonism === 'Alto' || productText.includes('statement'))) penalty += 6;
        if (feature.includes('pesado') && (product.protagonism === 'Alto' || productText.includes('grues'))) penalty += 4;
      });

      score -= penalty;

      // Enforcement real de presupuesto usando priceLevel
      if (budgetMax && product.priceLevel) {
        const [low, high] = priceRange[product.priceLevel] || priceRange.mid;

        if (high > budgetMax * 1.4) {
          penalty += 15; // Fuertemente penalizar si excede bastante el presupuesto
        } else if (high > budgetMax) {
          penalty += 9;
        }

        // Si el presupuesto es muy bajo, penalizar todo lo que no sea entry
        if (budgetMax < 600000 && product.priceLevel !== 'entry') {
          penalty += 12;
        }
      }

      score -= penalty;

      return { product, score };
    })
    .sort((left, right) => right.score - left.score);

  // Solo devolver producto si el score es positivo después de penalizaciones
  return scored[0] && scored[0].score > 0 ? scored[0].product : null;
}

function buildProductRecommendationMessage(product, extracted, isMothersDayIntent) {
  if (isMothersDayIntent) {
    return `Para el Día de las Madres buscaría algo elegante, fácil de usar y con brillo delicado. Empezaría por ${product.name} (${product.reference}); desde ahí podemos ajustar metal, tamaño o nivel de protagonismo.`;
  }

  if (extracted.occasion === 'regalo') {
    return `Para regalo conviene una pieza bonita, fácil de usar y difícil de fallar. Yo miraría primero ${product.name} (${product.reference}) y luego afinamos si la quieres más discreta, más brillante o más personal.`;
  }

  if (extracted.jewelryType === 'anillo') {
    return `Si buscas un anillo, empezaría por ${product.name} (${product.reference}); da una base clara para comparar estilo, metal y protagonismo sin perderte entre demasiadas opciones.`;
  }

  return `La referencia más clara para empezar es ${product.name} (${product.reference}). Desde ahí podemos afinar estilo, metal o personalización.`;
}

function findReferencedProduct(text) {
  const match = sanitizeText(text, 600).toUpperCase().match(/\b[A-Z]{3}-\d{3}\b/);

  if (!match) {
    return null;
  }

  return PRODUCT_CATALOG.find((product) => product.reference === match[0]) || null;
}

function buildQuickReplies(intent, collectionSlug, suggestedAction, missingDetailKeys, greetingOnly = false, valuation = null) {
  if (intent === 'smalltalk') {
    return mergeQuickReplies([
      { label: 'Valorar una pieza', message: 'Quiero valorar un anillo en oro de 18 quilates de 4 gramos' },
      { label: 'Ver colecciones', message: 'Quiero ver colecciones' },
      { label: 'Quiero un regalo', message: 'Quiero una joya para regalo especial' },
      { label: 'Diseño a medida', message: 'Quiero una joya personalizada' },
    ]);
  }

  if (valuation) {
    const productReply = suggestedAction.productReference && !valuation.isMetalPriceOnly && !valuation.isGemstonePriceOnly
      ? [{ label: 'Ver referencia', message: `Quiero ver la referencia ${suggestedAction.productReference}` }]
      : [];

    return mergeQuickReplies(buildValuationQuickReplies(valuation), productReply);
  }

  const discoveryReplies = buildDiscoveryReplies(missingDetailKeys);

  if (greetingOnly) {
    return mergeQuickReplies([
      { label: 'Ver colecciones', message: 'Quiero ver colecciones' },
      { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
      { label: 'Quiero un regalo', message: 'Quiero una joya para regalo especial' },
      { label: 'Diseño a medida', message: 'Quiero una joya personalizada' },
    ]);
  }

  if (suggestedAction.type === 'open_product') {
    return mergeQuickReplies(discoveryReplies, [
      { label: 'Ver esta pieza', message: `Quiero ver la referencia ${suggestedAction.productReference}` },
      { label: 'Personalizar esta idea', message: 'Quiero personalizar esta idea' },
      { label: 'Agendar asesoría', message: 'Quiero agendar una cita' },
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
      { label: 'Pedir asesoría', message: 'Quiero una asesoría personalizada' },
    ]);
  }

  if (collectionSlug) {
    const collectionTitle = COLLECTION_COPY[collectionSlug]?.title || 'coleccion';

    return mergeQuickReplies(discoveryReplies, [
      { label: `Ver ${collectionTitle}`, message: `Quiero ver ${collectionTitle.toLowerCase()}` },
      { label: 'Personalizar idea', message: 'Quiero una joya personalizada' },
      { label: 'Agendar asesoría', message: 'Quiero agendar una cita' },
    ]);
  }

  return mergeQuickReplies(discoveryReplies, [
    { label: 'Ver colecciones', message: 'Quiero ver colecciones' },
    { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
    { label: 'Quiero un regalo', message: 'Quiero una joya para regalo especial' },
    { label: 'Necesito asesoría', message: 'Necesito ayuda para elegir una joya' },
  ]);
}

function buildReplyFromSignals({ message, conversation, memory, clientContext, accountContext, profile }) {
  const safeConversation = sanitizeConversation(conversation);
  let safeMemory = sanitizeMemory(memory);

  const isStrongReset = detectStrongReset(message);

  // Si el usuario dice algo como "olvídate de lo anterior", limpiamos bastante memoria
  if (isStrongReset) {
    safeMemory = {
      ...safeMemory,
      avoidedFeatures: [],
      budget: '',
      budgetMaxCop: null,
      lastProductReference: '',
      refinement: '',
      jewelryType: '',
      metal: '',
      style: '',
      gemstone: '',
    };
  }

  const safeClientContext = sanitizeClientContext(clientContext);
  const safeAccountContext = sanitizeAccountContext(accountContext);
  const currentMessage = normalizeText(message);
  const userSignalText = normalizeText(
    `${safeConversation
      .filter((entry) => entry.role === 'user')
      .map((entry) => entry.text)
      .join(' ')} ${message}`,
  );
  const phraseMatch = classifyWithPhraseBank(message);
  const phraseSignals = phraseMatch.score >= 0.78 ? phraseMatch.signals || {} : {};
  const newAvoided = detectAvoidedFeatures(userSignalText);
  const mergedAvoided = Array.from(new Set([
    ...(safeMemory.avoidedFeatures || []),
    ...newAvoided,
  ]));

  const rawBudget = detectBudget(userSignalText) || safeMemory.budget;
  const parsedBudgetMax = parseBudgetToMaxCop(rawBudget) || safeMemory.budgetMaxCop || null;

  const extracted = {
    occasion: detectOccasion(userSignalText) || phraseSignals.occasion || safeMemory.occasion,
    jewelryType: detectJewelryType(userSignalText) || phraseSignals.jewelryType || safeMemory.jewelryType,
    budget: rawBudget,
    style: detectStyle(userSignalText) || phraseSignals.style || safeMemory.style,
    metal: detectMetal(userSignalText) || phraseSignals.metal || safeMemory.metal,
    gemstone: detectGemstone(userSignalText) || phraseSignals.gemstone || safeMemory.gemstone,
    deadline: detectDeadline(userSignalText) || safeMemory.deadline,
    refinement: detectRefinement(userSignalText),
    avoidedFeatures: mergedAvoided,
    budgetMaxCop: parsedBudgetMax,
  };
  const ruleIntent = detectIntent(currentMessage);
  const intent = ruleIntent !== 'unknown'
    ? ruleIntent
    : phraseMatch.score >= 0.58 && phraseMatch.intent !== 'recommend_jewelry'
    ? phraseMatch.intent
    : ruleIntent;
  const collectionSlug = inferCollectionSlug(
    extracted.jewelryType,
    extracted.occasion,
    safeClientContext.currentCollectionSlug || safeAccountContext.topCollectionSlug,
  );
  const isMothersDayIntent = /(dia de la madre|dia de las madres|mama|madre)/.test(userSignalText);
  const referencedProduct = findReferencedProduct(message);
  const product = referencedProduct || recommendProduct(extracted, collectionSlug);
  const valuation = buildValuationEstimate({ message, extracted, product });
  const valuationSummary = buildValuationMemorySummary(valuation) || safeMemory.valuationSummary;
  const favoriteCollectionAction = buildFavoriteCollectionAction(safeAccountContext);
  const savedDesignAction = buildSavedDesignAction(safeAccountContext, extracted);
  const missingDetailKeys = buildMissingDetailKeys(extracted, intent, product, collectionSlug);
  const greetingOnly = isGreetingOnly(message);
  const courtesyType = getCourtesyType(message);
  const wantsMemoryResume = /(retomar|lo anterior|eso|sigamos|sigue|continuemos|continua|donde ibamos|en que ibamos)/.test(currentMessage);

  let assistantMessage = 'Puedo ayudarte a aterrizar la mejor ruta entre colecciones, configurador y cita.';
  let suggestedAction = buildAction('none', {
    label: 'Seguir conversando',
  });

  // Manejo especial de reset fuerte (debe ir después de declarar las variables)
  if (isStrongReset) {
    assistantMessage = 'Entendido, borramos lo anterior. ¿Qué estás buscando ahora? Puedo ayudarte desde cero.';
    suggestedAction = buildAction('none', { label: 'Empezar de nuevo' });
  }

  if (courtesyType) {
    assistantMessage = buildCourtesyMessage(courtesyType, extracted);
    suggestedAction = buildAction('none', {
      label: 'Seguir conversando',
    });
  } else if (greetingOnly) {
    assistantMessage = 'Hola. Qué gusto que estés aquí. Puedo ayudarte a elegir una joya, ver colecciones, crear algo personalizado en el configurador o agendar una asesoría. ¿Qué te llama más la atención hoy?';
    suggestedAction = buildAction('none', {
      label: 'Explorar opciones',
    });
  } else if ((/retomar|mi diseno/.test(currentMessage)) && savedDesignAction) {
    assistantMessage = 'Lo más eficiente es retomar tu diseño guardado y afinarlo desde ahí.';
    suggestedAction = savedDesignAction;
  } else if (wantsMemoryResume && valuationSummary) {
    assistantMessage = `Tengo presente esto: ${valuationSummary}. Podemos ajustar peso, metal, piedra o llevarlo a una cotización más exacta.`;
    suggestedAction = buildAction('none', {
      label: 'Seguir afinando',
    });
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
    assistantMessage = 'Lo mejor aquí es abrir una cita corta para aterrizar materiales, tiempos y presupuesto sin adivinar.';
    suggestedAction = buildAction('open_appointment', {
      label: 'Abrir cita',
      reason: 'Aterrizar el proyecto con acompanamiento.',
      notes: [
        extracted.occasion ? `Ocasión: ${extracted.occasion}.` : '',
        extracted.jewelryType ? `Tipo de joya: ${extracted.jewelryType}.` : '',
        extracted.budget ? `Presupuesto: ${extracted.budget}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    });
  } else if (intent === 'quote_request') {
    assistantMessage = buildValuationMessage(valuation, extracted.budget) || (product
          ? `Para cotizar con precisión, usemos la referencia ${product.name} (${product.reference}) y llevemos ese contexto a WhatsApp.`
          : 'Para cotizar bien necesito al menos tipo de joya, material y peso aproximado. Si ya tienes eso, te doy un rango preliminar antes de llevarlo a WhatsApp.');
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
            extracted.occasion ? `Ocasión: ${extracted.occasion}.` : '',
            extracted.jewelryType ? `Tipo de joya: ${extracted.jewelryType}.` : '',
            extracted.budget ? `Presupuesto: ${extracted.budget}.` : '',
          ]
            .filter(Boolean)
            .join(' '),
        });
  } else if (intent === 'design_custom') {
    assistantMessage = 'Tu idea ya pide configurador: ahí podemos convertirla en un brief mucho más claro.';
    suggestedAction = buildAction('open_configurator', {
      label: 'Abrir configurador',
      reason: 'Pasar de idea a propuesta editable.',
      promptHint: buildConfiguratorHint(extracted),
    });

  // Manejo de refinamientos (más grande, más discreto, otra versión, etc.)
  } else if (extracted.refinement) {
    const refinementMap = {
      larger: 'entiendo que quieres algo más grande o con más presencia',
      smaller: 'entiendo que prefieres algo más delicado o ligero',
      more_discreet: 'entiendo que buscas algo más discreto y sobrio',
      more_shiny: 'entiendo que te gustaría más brillo o protagonismo',
      cheaper: 'entiendo que buscas una opción más accesible',
      different_version: 'entiendo que quieres ver otra versión o estilo',
      more_elegant: 'entiendo que buscas algo más refinado y elegante',
    };

    const refinementText = refinementMap[extracted.refinement] || 'entiendo el ajuste que quieres hacer';

    const previousRef = safeMemory.lastProductReference;

    assistantMessage = `${refinementText}. Puedo mostrarte opciones diferentes a ${previousRef || 'la anterior'}, abrir el configurador para ajustar el diseño, o sugerirte alternativas concretas. ¿Qué prefieres?`;
    suggestedAction = buildAction('open_configurator', {
      label: 'Abrir configurador para ajustar',
      reason: previousRef ? `Cambio respecto a ${previousRef}` : 'Ajustar según lo pedido',
      promptHint: buildConfiguratorHint(extracted),
    });

  } else if (product) {
    assistantMessage = buildProductRecommendationMessage(product, extracted, isMothersDayIntent);
    suggestedAction = buildAction('open_product', {
      label: `Ver ${product.name}`,
      collectionSlug: product.collectionSlug,
      productReference: product.reference,
      productName: product.name,
      reason: 'Es la referencia que mejor cruza tipo de joya, ocasión y estilo.',
      promptHint: buildConfiguratorHint(extracted),
    });
  } else if (favoriteCollectionAction && (intent === 'recommend_jewelry' || intent === 'unknown' || intent === 'browse_collection')) {
    assistantMessage = 'Ya tengo una buena base con lo que te ha gustado antes, asi que puedo orientarte sin hacerte empezar de cero.';
    suggestedAction = favoriteCollectionAction;
  } else if (collectionSlug) {
    const collectionCopy = COLLECTION_COPY[collectionSlug];
    assistantMessage =
      isMothersDayIntent && extracted.occasion === 'regalo'
        ? `Para el Día de las Madres, la mejor familia para empezar es ${collectionCopy.title}. Te ayuda a encontrar algo elegante, fácil de regalar y con muy buena salida para esa ocasión.`
        : `La mejor familia para empezar es ${collectionCopy.title}: ${collectionCopy.shortReason}.`;
    suggestedAction = buildAction('open_collection', {
      label: `Ver ${collectionCopy.title}`,
      collectionSlug,
      reason: 'Es la colección más alineada con lo que contaste.',
    });
  } else {
    // Respuesta más inteligente y proactiva cuando falta información
    if (extracted.style && !extracted.jewelryType) {
      assistantMessage = `Ya tengo una dirección ${describeStyle(extracted.style)}. Para recomendar mejor, dime si prefieres anillo, aretes, cadena o pulsera.`;
    } else if (extracted.jewelryType) {
      assistantMessage = `Para un ${extracted.jewelryType}, puedo orientarte mejor si me dices la ocasión (compromiso, regalo, uso diario...) o el estilo que buscas. ¿Quieres que te muestre opciones de la colección o prefieres que vayamos al configurador?`;
    } else if (extracted.occasion) {
      assistantMessage = `Para ${extracted.occasion}, las piezas más recomendadas suelen ser anillos o aretes. ¿Quieres que te muestre las colecciones más adecuadas o prefieres describir más cómo te la imaginas?`;
    } else if (extracted.budget || extracted.metal || extracted.gemstone) {
      assistantMessage = `Con lo que me has contado ya tengo una idea. ¿Quieres que te proponga algunas referencias concretas o prefieres que afinemos más detalles primero?`;
    } else {
      // Último recurso - más cálido que antes
      assistantMessage = 'Con gusto te ayudo. Para darte recomendaciones más precisas, ¿buscas algo para una ocasión especial, para uso diario, o prefieres que te muestre las colecciones para que explores?';
    }
  }

  const conciergeLead = buildConciergeLead(safeAccountContext, profile);

  if (conciergeLead) {
    assistantMessage = `${conciergeLead} ${assistantMessage}`.trim();
  }

  const shouldAskMissingDetails =
    !greetingOnly &&
    !courtesyType &&
    !wantsMemoryResume &&
    !valuation &&
    missingDetailKeys.length &&
    suggestedAction.type === 'none' &&
    !assistantMessage.includes('dime si prefieres');

  if (shouldAskMissingDetails) {
    assistantMessage = `${assistantMessage} Si quieres, afinamos ${missingDetailKeys
      .map((key) => DETAIL_LABELS[key])
      .filter(Boolean)
      .join(', ')} para recomendar con más precisión.`;
  }

  const guidanceCard = buildGuidanceCard({
    suggestedAction,
    collectionSlug,
    product,
    extracted,
  });

  return {
    assistantMessage,
    detectedIntent: courtesyType ? 'smalltalk' : intent,
    suggestedAction,
    quickReplies: buildQuickReplies(courtesyType ? 'smalltalk' : intent, collectionSlug, suggestedAction, missingDetailKeys, greetingOnly, valuation),
    memory: {
      ...extracted,
      valuationSummary,
      lastIntent: courtesyType ? 'smalltalk' : intent,
      lastCollectionSlug: suggestedAction.collectionSlug || safeMemory.lastCollectionSlug,
      lastProductReference: suggestedAction.productReference || safeMemory.lastProductReference,
    },
    guidanceCard,
    diagnostics: {
      knownDetails: buildKnownDetails(extracted),
      missingDetails: missingDetailKeys.map((key) => DETAIL_LABELS[key]).filter(Boolean),
      route: suggestedAction.type,
      valuation: valuation
        ? {
            ready: valuation.ready,
            type: valuation.type,
            metal: valuation.metal,
            purity: valuation.purity,
            estimatedRange: valuation.ready ? `${valuation.lowFormatted} - ${valuation.highFormatted}` : '',
            missing: valuation.missing,
            summary: valuationSummary,
          }
        : null,
      phraseBank: {
        matchedPhrase: phraseMatch.phrase,
        score: Number(phraseMatch.score.toFixed(3)),
        ready: getPhraseBankStats().ready,
      },
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
