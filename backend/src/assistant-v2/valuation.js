const DEFAULT_METAL_PRICE_COP_BY_GRAM = {
  'oro amarillo 18k': 395000,
  'oro blanco 18k': 415000,
  'oro rosado 18k': 395000,
  'oro amarillo 14k': 310000,
  'oro blanco 14k': 325000,
  'oro rosado 14k': 310000,
  'plata 925': 8500,
  platino: 185000,
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

const GEMSTONE_RANGE_COP = {
  diamante: [900000, 5200000],
  perla: [80000, 550000],
  esmeralda: [350000, 4200000],
  zafiro: [300000, 3200000],
  rubi: [300000, 3600000],
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
    return Math.round(value / 50000) * 50000;
  }

  return Math.round(value / 10000) * 10000;
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

  if (/(18k|18 k|18 quilates|18 kilates|750\b)/.test(normalized)) return '18k';
  if (/(14k|14 k|14 quilates|14 kilates|585\b)/.test(normalized)) return '14k';
  if (/(plata 925|925\b|sterling)/.test(normalized)) return '925';
  return '';
}

function formatPurityForSpeech(purity) {
  if (purity === '18k') return '18 quilates';
  if (purity === '14k') return '14 quilates';
  if (purity === '925') return 'ley 925';
  return purity;
}

function detectMetalFromText(text, fallbackMetal = '') {
  const normalized = normalizeText(`${text} ${fallbackMetal}`);

  if (/(platino)/.test(normalized)) return 'platino';
  if (/(plata)/.test(normalized)) return 'plata';
  if (/(oro blanco)/.test(normalized)) return 'oro blanco';
  if (/(oro rosado|oro rosa)/.test(normalized)) return 'oro rosado';
  if (/(oro amarillo|dorado|oro)/.test(normalized)) return 'oro amarillo';
  return normalizeText(fallbackMetal);
}

function detectGemstoneFromText(text, fallbackGemstone = '') {
  const normalized = normalizeText(`${text} ${fallbackGemstone}`);

  if (/(diamante|brillante|pave)/.test(normalized)) return 'diamante';
  if (/(perla)/.test(normalized)) return 'perla';
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
  if (normalizedMetal.includes('plata')) return 'plata 925';
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

function getGemstoneRange(gemstone, carats, product) {
  const stone = normalizeText(gemstone);

  if (!stone || !GEMSTONE_RANGE_COP[stone]) {
    return [0, 0];
  }

  const baseRange = GEMSTONE_RANGE_COP[stone];

  if (carats) {
    return [baseRange[0] * carats, baseRange[1] * carats];
  }

  const productSignal = normalizeText(`${product?.name || ''} ${product?.displayType || ''}`);

  if (stone === 'diamante' && /(pave|eternidad|media eternidad)/.test(productSignal)) {
    return [250000, 1800000];
  }

  if (stone === 'diamante' && /(solitario|halo)/.test(productSignal)) {
    return [1400000, 7000000];
  }

  if (stone === 'perla') {
    return [baseRange[0], baseRange[1]];
  }

  return [baseRange[0] * 0.25, baseRange[1] * 0.75];
}

function buildValuationEstimate({ message, extracted, product }) {
  const normalizedMessage = normalizeText(message);
  const jewelryType = product?.type || extracted?.jewelryType || '';
  const metal = detectMetalFromText(message, product?.metal || extracted?.metal || '');
  const gemstone = detectGemstoneFromText(message, product?.gemstone || extracted?.gemstone || '');
  const purity = detectPurity(message) || (metal.includes('plata') ? '925' : '18k');
  const grams = detectGrams(message);
  const stoneCarats = detectStoneCarats(message);
  const metalPriceKey = getMetalPriceKey(metal, purity);
  const priceTable = getMetalPriceTable();
  const pricePerGram = priceTable[normalizeText(metalPriceKey)] || 0;
  const hasValuationSignal = /(precio|cotiz|cuanto cuesta|cuanto vale|valor|valora|avalu|avaluo|estimar|estimacion|calcular|mineral|gramo|gramos|quilate|quilates|kilate|kilates|\bct\b|\bcts\b|material)/.test(normalizedMessage);

  if (!hasValuationSignal) {
    return null;
  }

  const isMetalPriceOnly = /(precio|valor|cuanto esta|cuanto vale|gramo|mineral)/.test(normalizedMessage) &&
    /(oro|plata|platino)/.test(normalizedMessage) &&
    !/(anillo|arete|aretes|cadena|collar|pulsera|brazalete|joya|pieza)/.test(normalizedMessage);

  const missing = [];

  if (!metalPriceKey || !pricePerGram) {
    missing.push('metal');
  }

  if (!jewelryType && !product && !isMetalPriceOnly) {
    missing.push('tipo de joya');
  }

  const weightRange = getWeightRange(jewelryType, product, grams);
  const complexity = getComplexityMultiplier(product, extracted || {});
  const laborBase = LABOR_RANGE_COP[jewelryType || product?.type] || LABOR_RANGE_COP.joya;
  const laborRange = laborBase.map((value) => value * complexity);
  const metalCostRange = pricePerGram
    ? [weightRange[0] * pricePerGram, weightRange[1] * pricePerGram]
    : [0, 0];
  const gemstoneRange = getGemstoneRange(gemstone, stoneCarats, product);
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
    missing,
    type: isMetalPriceOnly ? 'metal' : jewelryType || 'joya',
    metal,
    purity,
    purityLabel: formatPurityForSpeech(purity),
    metalPriceKey,
    pricePerGram,
    grams,
    estimatedWeightRange: weightRange,
    gemstone,
    stoneCarats,
    metalCostRange: metalCostRange.map(roundMoney),
    gemstoneRange: gemstoneRange.map(roundMoney),
    laborRange: laborRange.map(roundMoney),
    totalRange: totalRange.map(roundMoney),
    lowFormatted: formatCop(totalRange[0]),
    highFormatted: formatCop(totalRange[1]),
    pricePerGramFormatted: pricePerGram ? formatCop(pricePerGram) : '',
    basis: [
      metalPriceKey && pricePerGram ? `${metalPriceKey.replace('18k', '18 quilates').replace('14k', '14 quilates')}: ${formatCop(pricePerGram)} por gramo de referencia interna` : '',
      grams ? `peso indicado: ${grams} g` : `peso estimado: ${weightRange[0]}-${weightRange[1]} g`,
      gemstone ? `${gemstone}${stoneCarats ? ` aprox. ${stoneCarats} quilates` : ''}` : 'sin piedra confirmada',
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
      `Como referencia interna, el ${valuation.metal} de ${valuation.purityLabel} está en ${valuation.pricePerGramFormatted} por gramo.`,
      'Ese es solo el punto de partida del material: una joya terminada también suma merma, aleación, engaste, acabado, complejidad y mano de obra.',
      'Si me dices qué pieza quieres y cuántos gramos tendría, te calculo un rango más realista.',
    ].join(' ');
  }

  const article = valuation.type === 'anillo' ? 'un' : 'una';

  return [
    `Como estimación preliminar, ${article} ${valuation.type} en ${valuation.metal} de ${valuation.purityLabel} estaría entre ${valuation.lowFormatted} y ${valuation.highFormatted}.`,
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
