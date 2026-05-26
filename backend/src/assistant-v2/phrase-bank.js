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

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2);
}

function addPhrase(bank, phrase, intent, signals = {}) {
  const text = sanitizeText(phrase, 180);

  if (!text) {
    return;
  }

  bank.push({
    text,
    normalized: normalizeText(text),
    tokens: tokenize(text),
    intent,
    signals,
  });
}

function buildPhraseBank() {
  const bank = [];

  [
    'hola',
    'hola orvia',
    'buenas',
    'buen dia',
    'buenos dias',
    'buenas tardes',
    'buenas noches',
    'hey',
    'hello',
    'necesito ayuda',
    'me ayudas',
  ].forEach((phrase) => addPhrase(bank, phrase, 'recommend_jewelry'));

  [
    'gracias',
    'muchas gracias',
    'mil gracias',
    'te agradezco',
    'como estas',
    'que tal',
    'como vas',
    'todo bien',
    'perfecto',
    'listo',
    'ok',
    'vale',
    'de acuerdo',
    'excelente',
    'chao',
    'hasta luego',
  ].forEach((phrase) => addPhrase(bank, phrase, 'smalltalk'));

  const openings = [
    'quiero',
    'busco',
    'necesito',
    'me gustaria',
    'estoy buscando',
    'me interesa',
    'ayudame a elegir',
    'recomiendame',
    'quiero ver',
    'quiero comprar',
  ];
  const jewelryTypes = [
    { text: 'un anillo', jewelryType: 'anillo' },
    { text: 'anillos', jewelryType: 'anillo' },
    { text: 'unos aretes', jewelryType: 'aretes' },
    { text: 'aretes', jewelryType: 'aretes' },
    { text: 'una cadena', jewelryType: 'cadena' },
    { text: 'un collar', jewelryType: 'cadena' },
    { text: 'una pulsera', jewelryType: 'pulsera' },
    { text: 'un brazalete', jewelryType: 'pulsera' },
    { text: 'una joya', jewelryType: '' },
    { text: 'una pieza', jewelryType: '' },
  ];
  const occasions = [
    { text: 'para compromiso', occasion: 'compromiso' },
    { text: 'para pedir matrimonio', occasion: 'compromiso' },
    { text: 'para aniversario', occasion: 'aniversario' },
    { text: 'para regalo', occasion: 'regalo' },
    { text: 'para regalar', occasion: 'regalo' },
    { text: 'para mi mama', occasion: 'regalo', recipient: 'mama' },
    { text: 'para el dia de las madres', occasion: 'regalo', recipient: 'mama' },
    { text: 'para mi novia', occasion: 'regalo', recipient: 'pareja' },
    { text: 'para uso diario', occasion: 'diario' },
    { text: 'para una boda', occasion: 'evento' },
    { text: 'para un evento', occasion: 'evento' },
    { text: 'para una ocasion especial', occasion: 'evento' },
  ];
  const styles = [
    { text: 'delicada', style: 'romantico' },
    { text: 'romantica', style: 'romantico' },
    { text: 'minimalista', style: 'minimalista' },
    { text: 'sobria', style: 'minimalista' },
    { text: 'clasica', style: 'clasico' },
    { text: 'elegante', style: 'clasico' },
    { text: 'moderna', style: 'moderno' },
    { text: 'llamativa', style: 'statement' },
    { text: 'premium', style: 'statement' },
  ];
  const metals = [
    { text: 'en oro amarillo', metal: 'oro amarillo' },
    { text: 'en oro blanco', metal: 'oro blanco' },
    { text: 'en oro rosado', metal: 'oro rosado' },
    { text: 'en plata', metal: 'plata' },
    { text: 'en platino', metal: 'platino' },
    { text: 'en paladio', metal: 'paladio' },
    { text: 'con diamantes', gemstone: 'diamante' },
    { text: 'con perlas', gemstone: 'perla' },
    { text: 'con esmeralda', gemstone: 'esmeralda' },
    { text: 'con zafiro', gemstone: 'zafiro' },
    { text: 'con rubí', gemstone: 'rubi' },
  ];

  for (const opening of openings) {
    for (const type of jewelryTypes) {
      addPhrase(bank, `${opening} ${type.text}`, 'recommend_jewelry', {
        jewelryType: type.jewelryType,
      });

      for (const occasion of occasions) {
        addPhrase(bank, `${opening} ${type.text} ${occasion.text}`, 'recommend_jewelry', {
          jewelryType: type.jewelryType,
          occasion: occasion.occasion,
          recipient: occasion.recipient || '',
        });
      }

      for (const style of styles) {
        addPhrase(bank, `${opening} ${type.text} ${style.text}`, 'recommend_jewelry', {
          jewelryType: type.jewelryType,
          style: style.style,
        });
      }

      for (const occasion of occasions.slice(0, 9)) {
        for (const style of styles.slice(0, 7)) {
          addPhrase(bank, `${opening} ${type.text} ${style.text} ${occasion.text}`, 'recommend_jewelry', {
            jewelryType: type.jewelryType,
            occasion: occasion.occasion,
            style: style.style,
            recipient: occasion.recipient || '',
          });
        }
      }
    }
  }

  for (const opening of ['quiero cotizar', 'cuanto cuesta', 'precio de', 'valor de', 'me das precio de', 'quiero valorar', 'cuanto vale', 'estimame el precio']) {
    for (const type of jewelryTypes) {
      for (const style of styles.slice(0, 6)) {
        addPhrase(bank, `${opening} ${type.text} ${style.text}`, 'quote_request', {
          jewelryType: type.jewelryType,
          style: style.style,
        });
      }

      for (const metal of metals.slice(0, 4)) {
        addPhrase(bank, `${opening} ${type.text} ${metal.text}`, 'quote_request', {
          jewelryType: type.jewelryType,
          metal: metal.metal || '',
        });
      }
    }
  }

  for (const phrase of [
    'quiero valorar una joya por gramos',
    'calcular precio por gramo de oro',
    'estimar valor con precio del mineral',
    'avaluar un anillo en oro 18k',
    'cuanto cuesta un anillo de 4 gramos',
    'cuanto vale una cadena de oro 18k',
    'precio de oro por gramo para una joya',
    'valora una pulsera en plata 925',
    'precio del oro de 24 quilates',
    'precio del platino por gramo',
    'precio del paladio por gramo',
    'precio del diamante por quilate',
    'cuanto vale una esmeralda colombiana',
    'precio de un zafiro natural',
    'precio de un rubi natural',
    'cuanto vale una perla akoya',
  ]) {
    addPhrase(bank, phrase, 'quote_request');
  }

  for (const opening of ['quiero disenar', 'quiero personalizar', 'hacer a medida', 'crear desde cero', 'usar el configurador']) {
    for (const type of jewelryTypes) {
      for (const metal of metals.slice(0, 5)) {
        addPhrase(bank, `${opening} ${type.text} ${metal.text}`, 'design_custom', {
          jewelryType: type.jewelryType,
          metal: metal.metal || '',
          gemstone: metal.gemstone || '',
        });
      }
    }
  }

  for (const phrase of [
    'quiero agendar una cita',
    'necesito una asesoria',
    'quiero una cita corta',
    'quiero visitar la joyeria',
    'quiero hablar con alguien para una cita',
    'me pueden asesorar por cita',
    'quiero reservar una asesoria',
    'necesito aterrizar materiales tiempos y presupuesto',
  ]) {
    addPhrase(bank, phrase, 'schedule_appointment');
  }

  for (const phrase of [
    'quiero hablar por whatsapp',
    'pasame a whatsapp',
    'quiero una asesora humana',
    'quiero hablar con una persona',
    'necesito contacto directo',
    'abrir whatsapp',
    'seguir por whatsapp',
  ]) {
    addPhrase(bank, phrase, 'handoff_whatsapp');
  }

  for (const collection of [
    'ver colecciones',
    'ver catalogo',
    'mostrar opciones',
    'quiero ver anillos',
    'quiero ver aretes',
    'quiero ver cadenas',
    'quiero ver pulseras',
    'abre la coleccion',
  ]) {
    addPhrase(bank, collection, 'browse_collection');
  }

  return bank;
}

const PHRASE_BANK = buildPhraseBank();
const PHRASE_BANK_MINIMUM = 1000;

function scorePhrase(inputTokens, inputNormalized, phrase) {
  if (!inputTokens.length || !phrase.tokens.length) {
    return inputNormalized === phrase.normalized ? 1 : 0;
  }

  if (inputNormalized === phrase.normalized) {
    return 1;
  }

  if (inputNormalized.includes(phrase.normalized) || phrase.normalized.includes(inputNormalized)) {
    return 0.92;
  }

  const inputSet = new Set(inputTokens);
  const phraseSet = new Set(phrase.tokens);
  const overlap = phrase.tokens.filter((token) => inputSet.has(token)).length;
  const reverseOverlap = inputTokens.filter((token) => phraseSet.has(token)).length;
  const precision = overlap / phrase.tokens.length;
  const recall = reverseOverlap / inputTokens.length;

  if (!precision && !recall) {
    return 0;
  }

  return (2 * precision * recall) / (precision + recall);
}

function classifyWithPhraseBank(message) {
  const inputNormalized = normalizeText(message);
  const inputTokens = tokenize(message);
  let bestMatch = null;

  for (const phrase of PHRASE_BANK) {
    const score = scorePhrase(inputTokens, inputNormalized, phrase);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        score,
        intent: phrase.intent,
        phrase: phrase.text,
        signals: phrase.signals || {},
      };
    }
  }

  return bestMatch || {
    score: 0,
    intent: 'unknown',
    phrase: '',
    signals: {},
  };
}

function getPhraseBankStats() {
  const byIntent = PHRASE_BANK.reduce((stats, item) => {
    stats[item.intent] = (stats[item.intent] || 0) + 1;
    return stats;
  }, {});

  return {
    total: PHRASE_BANK.length,
    minimum: PHRASE_BANK_MINIMUM,
    ready: PHRASE_BANK.length >= PHRASE_BANK_MINIMUM,
    byIntent,
  };
}

module.exports = {
  PHRASE_BANK,
  PHRASE_BANK_MINIMUM,
  classifyWithPhraseBank,
  getPhraseBankStats,
};
