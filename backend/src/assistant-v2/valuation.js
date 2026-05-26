const DEFAULT_METAL_PRICE_COP_BY_GRAM = {
  'oro amarillo 18k': 399000,
  'oro blanco 18k': 419000,
  'oro rosado 18k': 399000,
  'oro amarillo 14k': 310000,
  'oro blanco 14k': 325000,
  'oro rosado 14k': 310000,
  'oro 24k': 532000,
  'plata 925': 8200,
  'plata pura': 8900,
  platino: 227000,
  paladio: 159000,
  cobre: 50,
  aluminio: 15,
};

const MARKET_REFERENCE = {
  asOf: '2026-05-26',
  currency: 'COP',
  usdCop: 3667.06,
  note: 'Base aproximada con spot internacional y TRM. No reemplaza cotización formal de proveedor.',
};

const LABOR_RANGE_COP = {
  anillo: [320000, 950000],
  aretes: [260000, 780000],
  cadena: [360000, 1100000],
  pulsera: [380000, 1250000],
  joya: [320000, 950000],
};

const WEIGHT_RANGE_BY_TYPE = {
  anillo: [3.2, 6.2],
  aretes: [2.0, 5.0],
  cadena: [4.5, 12.0],
  pulsera: [5.5, 16.0],
  joya: [3.0, 9.0],
};

const GEMSTONE_PRICE_PROFILES_COP = {
  diamante: {
    unit: 'quilate',
    defaultTier: 'fine',
    drivers: '4C: quilates, color, claridad, corte, fluorescencia y certificado.',
    tiers: {
      commercial: [3600000, 11000000],
      fine: [9000000, 30000000],
      premium: [30000000, 65000000],
      lab: [900000, 4500000],
      melee: [1200000, 6500000],
    },
  },
  esmeralda: {
    unit: 'quilate',
    defaultTier: 'fine',
    drivers: 'color verde, transparencia, aceite/tratamiento, origen colombiano y certificado.',
    tiers: {
      commercial: [750000, 5500000],
      fine: [2900000, 18300000],
      premium: [11000000, 73300000],
      muzo: [22000000, 183000000],
    },
  },
  zafiro: {
    unit: 'quilate',
    defaultTier: 'fine',
    drivers: 'color, origen, tratamiento térmico, claridad y corte.',
    tiers: {
      commercial: [730000, 5500000],
      fine: [5500000, 18300000],
      premium: [18300000, 73300000],
      teal: [2900000, 22000000],
    },
  },
  rubi: {
    unit: 'quilate',
    defaultTier: 'fine',
    drivers: 'rojo, origen, tratamiento, claridad y tamaño; sube fuerte sobre 1 quilate.',
    tiers: {
      commercial: [1800000, 18300000],
      fine: [7300000, 36700000],
      premium: [18300000, 183000000],
    },
  },
  perla: {
    unit: 'pieza',
    defaultTier: 'freshwater',
    drivers: 'tipo, diámetro en milímetros, lustre, forma, superficie y pareja/calce.',
    tiers: {
      freshwater: [80000, 750000],
      akoya: [450000, 3300000],
      edison: [650000, 9200000],
      tahitian: [900000, 16000000],
      southSea: [1200000, 66000000],
    },
  },
};

const GEMSTONE_LABELS = {
  diamante: 'diamante',
  esmeralda: 'esmeralda',
  zafiro: 'zafiro',
  rubi: 'rubí',
  perla: 'perla',
};

const GEMSTONE_TIER_LABELS = {
  commercial: 'comercial',
  fine: 'fino',
  premium: 'premium',
  lab: 'de laboratorio',
  melee: 'de acento o pavé',
  muzo: 'Muzo o extra fino',
  teal: 'teal',
  freshwater: 'agua dulce',
  akoya: 'Akoya',
  edison: 'Edison',
  tahitian: 'Tahitiana',
  southSea: 'Mar del Sur',
};

function sanitizeText(value, maxLength = 500) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeText(value) {
  return sanitizeText(value, 700)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseNumber(value) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function roundMoney(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 1000000) {
    return Math.round(value / 100000) * 100000;
  }

  if (value >= 100000) {
    return Math.round(value / 1000) * 1000;
  }

  if (value >= 10000) {
    return Math.round(value / 1000) * 1000;
  }

  if (value >= 1000) {
    return Math.round(value / 100) * 100;
  }

  return Math.round(value);
}

function formatCop(value) {
  const rounded = roundMoney(value);
  return `$${rounded.toLocaleString('es-CO')} pesos colombianos`;
}

function readMetalPriceOverrides() {
  const rawJson = sanitizeText(process.env.ORVIA_VALUATION_METAL_PRICES_COP_JSON, 3000);

  if (!rawJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [normalizeText(key), parseNumber(value)])
        .filter(([, value]) => value > 0),
    );
  } catch {
    return {};
  }
}

function getMetalPriceTable() {
  return {
    ...Object.fromEntries(
      Object.entries(DEFAULT_METAL_PRICE_COP_BY_GRAM).map(([key, value]) => [normalizeText(key), value]),
    ),
    ...readMetalPriceOverrides(),
  };
}

function detectPurity(text) {
  const normalized = normalizeText(text);

  if (/(24k|24 k|24 quilates|24 kilates|999\b|oro puro)/.test(normalized)) return '24k';
  if (/(18k|18 k|18 quilates|18 kilates|750\b)/.test(normalized)) return '18k';
  if (/(14k|14 k|14 quilates|14 kilates|585\b)/.test(normalized)) return '14k';
  if (/(plata 925|925\b|sterling)/.test(normalized)) return '925';
  return '';
}

function formatPurityForSpeech(purity) {
  if (purity === '24k') return '24 quilates';
  if (purity === '18k') return '18 quilates';
  if (purity === '14k') return '14 quilates';
  if (purity === '925') return 'ley 925';
  return purity;
}

function formatMaterialDescriptor(metal, purityLabel) {
  const normalized = normalizeText(metal);

  if (!normalized) {
    return '';
  }

  if (normalized.includes('oro')) {
    return `${metal} de ${purityLabel || '18 quilates'}`;
  }

  if (normalized.includes('plata')) {
    return `plata ${purityLabel || 'ley 925'}`;
  }

  return metal;
}

function formatMaterialSubject(metal, purityLabel) {
  const descriptor = formatMaterialDescriptor(metal, purityLabel);
  const normalized = normalizeText(metal);

  if (!descriptor) {
    return '';
  }

  return normalized.includes('plata') ? `la ${descriptor}` : `el ${descriptor}`;
}

function detectMetalFromText(text, fallbackMetal = '') {
  const normalized = normalizeText(`${text} ${fallbackMetal}`);

  if (/(platino)/.test(normalized)) return 'platino';
  if (/(paladio)/.test(normalized)) return 'paladio';
  if (/(cobre)/.test(normalized)) return 'cobre';
  if (/(aluminio)/.test(normalized)) return 'aluminio';
  if (/(plata)/.test(normalized)) return 'plata';
  if (/(oro blanco)/.test(normalized)) return 'oro blanco';
  if (/(oro rosado|oro rosa)/.test(normalized)) return 'oro rosado';
  if (/(oro amarillo|dorado|oro)/.test(normalized)) return 'oro amarillo';
  return normalizeText(fallbackMetal);
}

function detectGemstoneFromText(text, fallbackGemstone = '') {
  const normalized = normalizeText(`${text} ${fallbackGemstone}`);

  if (/(diamante|brillante|pave)/.test(normalized)) return 'diamante';
  if (/(perla|akoya|tahitian|tahitiana|south sea|mar del sur|edison|freshwater|agua dulce)/.test(normalized)) return 'perla';
  if (/(esmeralda)/.test(normalized)) return 'esmeralda';
  if (/(zafiro)/.test(normalized)) return 'zafiro';
  if (/(rubi|ruby)/.test(normalized)) return 'rubi';
  return normalizeText(fallbackGemstone);
}

function detectGrams(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d+(?:[\.,]\d+)?)\s*(?:g|gr|gramo|gramos)\b/);
  return match ? parseNumber(match[1]) : 0;
}

function detectStoneCarats(text) {
  const normalized = normalizeText(text);
  const matches = Array.from(normalized.matchAll(/(\d+(?:[\.,]\d+)?)\s*(?:ct|cts|quilate|quilates|kilate|kilates)\b/g));

  if (!matches.length) {
    return 0;
  }

  for (const match of matches) {
    const before = normalized.slice(Math.max(0, match.index - 30), match.index);
    const after = normalized.slice(match.index, match.index + 46);
    const nearby = `${before} ${after}`;
    const value = parseNumber(match[1]);

    if (!value) {
      continue;
    }

    if (/(oro|18k|14k|750|585)/.test(before) && !/(diamante|esmeralda|zafiro|rubi|perla)/.test(before)) {
      continue;
    }

    if (/(diamante|esmeralda|zafiro|rubi|perla)/.test(nearby)) {
      return value;
    }
  }

  return 0;
}

function getMetalPriceKey(metal, purity) {
  const normalizedMetal = normalizeText(metal);

  if (normalizedMetal.includes('platino')) return 'platino';
  if (normalizedMetal.includes('paladio')) return 'paladio';
  if (normalizedMetal.includes('cobre')) return 'cobre';
  if (normalizedMetal.includes('aluminio')) return 'aluminio';
  if (normalizedMetal.includes('plata')) return 'plata 925';
  if (normalizedMetal.includes('oro') && purity === '24k') return 'oro 24k';
  if (normalizedMetal.includes('oro blanco')) return `oro blanco ${purity === '14k' ? '14k' : '18k'}`;
  if (normalizedMetal.includes('oro rosado')) return `oro rosado ${purity === '14k' ? '14k' : '18k'}`;
  if (normalizedMetal.includes('oro')) return `oro amarillo ${purity === '14k' ? '14k' : '18k'}`;
  return '';
}

function getWeightRange(jewelryType, product, grams) {
  if (grams) {
    return [Math.max(0.2, grams * 0.9), grams * 1.1];
  }

  const type = product?.type || jewelryType || 'joya';
  let range = WEIGHT_RANGE_BY_TYPE[type] || WEIGHT_RANGE_BY_TYPE.joya;
  const displayType = normalizeText(product?.displayType || product?.name || '');
  const protagonism = normalizeText(product?.protagonism || '');

  if (displayType.includes('solitario') || displayType.includes('topos') || displayType.includes('delicad')) {
    range = [range[0] * 0.75, range[1] * 0.82];
  }

  if (displayType.includes('banda') || displayType.includes('gruesa') || displayType.includes('rigid') || protagonism.includes('alto')) {
    range = [range[0] * 1.15, range[1] * 1.28];
  }

  return range.map((value) => Number(value.toFixed(1)));
}

function getComplexityMultiplier(product, extracted) {
  const signals = normalizeText([
    product?.name,
    product?.displayType,
    product?.protagonism,
    extracted?.style,
    extracted?.gemstone,
  ].filter(Boolean).join(' '));

  if (/(pave|halo|cluster|eternidad|statement|alto|diamante|esmeralda)/.test(signals)) {
    return 1.28;
  }

  if (/(trenzad|cordon|textur|bicolor|personaliz)/.test(signals)) {
    return 1.16;
  }

  if (/(minimalista|delicad|topos|solitario)/.test(signals)) {
    return 0.92;
  }

  return 1;
}

function detectGemstoneTier(gemstone, text, product) {
  const normalized = normalizeText(`${text} ${product?.name || ''} ${product?.displayType || ''}`);

  if (gemstone === 'diamante') {
    if (/(laboratorio|lab grown|lab-grown|sintetico|sintético)/.test(normalized)) return 'lab';
    if (/(pave|pavé|melee|micro|chispas|acento)/.test(normalized)) return 'melee';
    if (/(premium|excelente|vvs|if|d color|certificado gia|gia|ideal)/.test(normalized)) return 'premium';
    if (/(comercial|si1|si2|i1|economico|económico)/.test(normalized)) return 'commercial';
    return 'fine';
  }

  if (gemstone === 'esmeralda') {
    if (/(muzo|gota de aceite|extra fina|extra fine|premium)/.test(normalized)) return 'muzo';
    if (/(comercial|incluida|aceite moderado|pesada|economica|económica)/.test(normalized)) return 'commercial';
    if (/(fine|fina|vs|colombiana|colombia|certificada)/.test(normalized)) return 'fine';
    return 'fine';
  }

  if (gemstone === 'zafiro') {
    if (/(royal|kashmir|sin tratamiento|unheated|premium|padparadscha)/.test(normalized)) return 'premium';
    if (/(teal|parti|bicolor|bi color)/.test(normalized)) return 'teal';
    if (/(comercial|tratado|heated|economico|económico)/.test(normalized)) return 'commercial';
    return 'fine';
  }

  if (gemstone === 'rubi') {
    if (/(pigeon|sangre de paloma|burma|birmania|sin tratamiento|unheated|premium)/.test(normalized)) return 'premium';
    if (/(comercial|tratado|heated|economico|económico)/.test(normalized)) return 'commercial';
    return 'fine';
  }

  if (gemstone === 'perla') {
    if (/(south sea|mar del sur|australiana)/.test(normalized)) return 'southSea';
    if (/(tahitian|tahitiana|tahití|tahiti)/.test(normalized)) return 'tahitian';
    if (/(akoya|japonesa|japon)/.test(normalized)) return 'akoya';
    if (/(edison)/.test(normalized)) return 'edison';
    return 'freshwater';
  }

  return '';
}

function getGemstoneValuation(gemstone, carats, product, text) {
  const stone = normalizeText(gemstone);
  const profile = GEMSTONE_PRICE_PROFILES_COP[stone];

  if (!stone || !profile) {
    return null;
  }

  const tier = detectGemstoneTier(stone, text, product) || profile.defaultTier;
  const perUnitRange = profile.tiers[tier] || profile.tiers[profile.defaultTier];

  let quantity = stone === 'perla' ? 1 : carats || 0;
  let range = perUnitRange;

  const productSignal = normalizeText(`${product?.name || ''} ${product?.displayType || ''}`);

  if (stone === 'diamante' && !carats && /(pave|eternidad|media eternidad)/.test(productSignal)) {
    range = [250000, 1800000];
    quantity = 1;
  } else if (stone === 'diamante' && !carats && /(solitario|halo)/.test(productSignal)) {
    range = [1400000, 9000000];
    quantity = 1;
  } else if (stone === 'perla') {
    quantity = 1;
  } else if (!quantity) {
    quantity = 1;
  }

  return {
    gemstone: stone,
    label: GEMSTONE_LABELS[stone] || stone,
    tier,
    tierLabel: GEMSTONE_TIER_LABELS[tier] || tier,
    unit: profile.unit,
    drivers: profile.drivers,
    quantity,
    perUnitRange,
    range: [range[0] * quantity, range[1] * quantity],
  };
}

function buildValuationEstimate({ message, extracted, product }) {
  const normalizedMessage = normalizeText(message);
  const jewelryType = product?.type || extracted?.jewelryType || '';
  const metal = detectMetalFromText(message, product?.metal || extracted?.metal || '');
  const gemstone = detectGemstoneFromText(message, product?.gemstone || extracted?.gemstone || '');
  const purity = detectPurity(message) || (metal.includes('plata') ? '925' : metal.includes('oro') ? '18k' : '');
  const grams = detectGrams(message);
  const stoneCarats = detectStoneCarats(message);
  const metalPriceKey = getMetalPriceKey(metal, purity);
  const priceTable = getMetalPriceTable();
  const pricePerGram = priceTable[normalizeText(metalPriceKey)] || 0;
  const hasValuationSignal = /(precio|cotiz|cuanto cuesta|cuanto vale|cuanto esta|valor|valora|avalu|avaluo|estimar|estimacion|calcular|mineral|gramo|gramos|quilate|quilates|kilate|kilates|\bct\b|\bcts\b|material|gema|piedra)/.test(normalizedMessage);

  if (!hasValuationSignal) {
    return null;
  }

  const isMetalPriceOnly = /(precio|valor|cuanto esta|cuanto vale|gramo|mineral)/.test(normalizedMessage) &&
    /(oro|plata|platino|paladio|cobre|aluminio)/.test(normalizedMessage) &&
    !/(anillo|arete|aretes|cadena|collar|pulsera|brazalete|joya|pieza)/.test(normalizedMessage);
  const gemstoneValuation = getGemstoneValuation(gemstone, stoneCarats, product, message);
  const isGemstonePriceOnly = Boolean(gemstoneValuation) &&
    /(precio|valor|cuanto cuesta|cuanto vale|valora|avalu|estimacion|estimación|mineral|quilate|kilate|gema|piedra)/.test(normalizedMessage) &&
    !/(anillo|arete|aretes|cadena|collar|pulsera|brazalete|joya|pieza)/.test(normalizedMessage) &&
    !/(oro|plata|platino|paladio|cobre|aluminio)/.test(normalizedMessage);

  const missing = [];

  if (!isGemstonePriceOnly && (!metalPriceKey || !pricePerGram)) {
    missing.push('metal');
  }

  if (!jewelryType && !product && !isMetalPriceOnly && !isGemstonePriceOnly) {
    missing.push('tipo de joya');
  }

  const weightRange = getWeightRange(jewelryType, product, grams);
  const complexity = getComplexityMultiplier(product, extracted || {});
  const laborBase = LABOR_RANGE_COP[jewelryType || product?.type] || LABOR_RANGE_COP.joya;
  const laborRange = laborBase.map((value) => value * complexity);
  const metalCostRange = pricePerGram
    ? [weightRange[0] * pricePerGram, weightRange[1] * pricePerGram]
    : [0, 0];
  const gemstoneRange = gemstoneValuation?.range || [0, 0];
  const subtotalRange = [
    metalCostRange[0] + laborRange[0] + gemstoneRange[0],
    metalCostRange[1] + laborRange[1] + gemstoneRange[1],
  ];
  const totalRange = [
    subtotalRange[0] * 1.18,
    subtotalRange[1] * 1.48,
  ];

  return {
    ready: missing.length === 0,
    isMetalPriceOnly,
    isGemstonePriceOnly,
    missing,
    type: isMetalPriceOnly ? 'metal' : isGemstonePriceOnly ? 'piedra' : jewelryType || 'joya',
    metal,
    purity,
    purityLabel: formatPurityForSpeech(purity),
    materialDescriptor: formatMaterialDescriptor(metal, formatPurityForSpeech(purity)),
    materialSubject: formatMaterialSubject(metal, formatPurityForSpeech(purity)),
    metalPriceKey,
    pricePerGram,
    grams,
    estimatedWeightRange: weightRange,
    gemstone,
    stoneCarats,
    gemstoneValuation,
    metalCostRange: metalCostRange.map(roundMoney),
    gemstoneRange: gemstoneRange.map(roundMoney),
    laborRange: laborRange.map(roundMoney),
    totalRange: totalRange.map(roundMoney),
    lowFormatted: formatCop(totalRange[0]),
    highFormatted: formatCop(totalRange[1]),
    pricePerGramFormatted: pricePerGram ? formatCop(pricePerGram) : '',
    marketReference: MARKET_REFERENCE,
    basis: [
      metalPriceKey && pricePerGram ? `${metalPriceKey.replace('24k', '24 quilates').replace('18k', '18 quilates').replace('14k', '14 quilates')}: ${formatCop(pricePerGram)} por gramo de referencia interna` : '',
      grams ? `peso indicado: ${grams} g` : `peso estimado: ${weightRange[0]}-${weightRange[1]} g`,
      gemstoneValuation
        ? `${gemstoneValuation.label}${stoneCarats ? ` aprox. ${stoneCarats} quilates` : ''}, nivel ${gemstoneValuation.tierLabel}`
        : gemstone ? `${gemstone}${stoneCarats ? ` aprox. ${stoneCarats} quilates` : ''}` : 'sin piedra confirmada',
      'mano de obra, merma, engaste, acabado y complejidad',
    ].filter(Boolean),
  };
}

function buildValuationMessage(valuation) {
  if (!valuation) {
    return '';
  }

  if (!valuation.ready) {
    return `Puedo hacer una valoración preliminar, pero me falta ${valuation.missing.join(' y ')}. Dime algo como: "anillo en oro de 18 quilates, 4 gramos, con diamante de 0.20 quilates" y te doy un rango mucho más aterrizado.`;
  }

  if (valuation.isMetalPriceOnly) {
    return [
      `Como referencia interna, ${valuation.materialSubject} está en ${valuation.pricePerGramFormatted} por gramo.`,
      'Ese es solo el punto de partida del material: una joya terminada también suma merma, aleación, engaste, acabado, complejidad y mano de obra.',
      `Referencia de mercado: ${valuation.marketReference.asOf}, TRM ${valuation.marketReference.usdCop.toLocaleString('es-CO')} pesos por dólar.`,
      'Si me dices qué pieza quieres y cuántos gramos tendría, te calculo un rango más realista.',
    ].join(' ');
  }

  if (valuation.isGemstonePriceOnly && valuation.gemstoneValuation) {
    const gem = valuation.gemstoneValuation;
    const perUnitLow = formatCop(gem.perUnitRange[0]);
    const perUnitHigh = formatCop(gem.perUnitRange[1]);
    const totalLow = formatCop(gem.range[0]);
    const totalHigh = formatCop(gem.range[1]);
    const unitCopy = gem.unit === 'pieza' ? 'por pieza' : 'por quilate';
    const quantityCopy = gem.unit === 'pieza'
      ? ''
      : valuation.stoneCarats ? ` Para ${valuation.stoneCarats} quilates, el rango aproximado sería ${totalLow} a ${totalHigh}.` : '';

    return [
      `Para ${gem.label}, usaría como referencia ${perUnitLow} a ${perUnitHigh} ${unitCopy} en nivel ${gem.tierLabel}.`,
      quantityCopy.trim(),
      `El rango cambia bastante por ${gem.drivers}`,
      'Para precio final hay que confirmar certificado, tratamiento, medidas y calidad real de la piedra.',
    ].filter(Boolean).join(' ');
  }

  const article = valuation.type === 'anillo' ? 'un' : 'una';

  return [
    `Como estimación preliminar, ${article} ${valuation.type} en ${valuation.materialDescriptor} estaría entre ${valuation.lowFormatted} y ${valuation.highFormatted}.`,
    `Lo calculo con ${valuation.basis.join('; ')}.`,
    'No lo tomaría como precio final todavía: para cerrar cotización faltan peso real, ley del metal, calidad de piedra y acabado elegido.',
  ].join(' ');
}

function buildValuationQuickReplies(valuation) {
  if (!valuation?.ready) {
    return [
      { label: 'Es oro 18 quilates', message: 'Es oro de 18 quilates' },
      { label: 'Tengo el peso', message: 'La joya pesa 4 gramos' },
      { label: 'Con diamante', message: 'La quiero con diamante de 0.20 quilates' },
    ];
  }

  if (valuation.isMetalPriceOnly) {
    return [
      { label: 'Calcular anillo', message: `Quiero valorar un anillo en ${valuation.materialDescriptor} de 4 gramos` },
      { label: 'Comparar metal', message: 'Quiero comparar oro, plata y platino' },
      { label: 'Cotizar exacto', message: 'Quiero cotizar exacto por WhatsApp' },
    ];
  }

  if (valuation.isGemstonePriceOnly) {
    const gemstoneLabel = valuation.gemstoneValuation?.label || valuation.gemstone;

    return [
      { label: 'Indicar quilates', message: `Quiero valorar ${gemstoneLabel} de 0.50 quilates` },
      { label: 'Comparar calidad', message: `Quiero comparar calidades de ${gemstoneLabel}` },
      { label: 'Cotizar exacto', message: 'Quiero cotizar exacto por WhatsApp' },
    ];
  }

  return [
    { label: 'Ajustar peso', message: 'Quiero ajustar el peso de la joya' },
    { label: 'Cambiar metal', message: 'Quiero comparar con otro metal' },
    { label: 'Cotizar exacto', message: 'Quiero cotizar exacto por WhatsApp' },
  ];
}

module.exports = {
  buildValuationEstimate,
  buildValuationMessage,
  buildValuationQuickReplies,
};
