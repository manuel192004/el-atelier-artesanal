const COLLECTIONS = {
  anillos: 'anillos',
  aretes: 'aretes',
  cadenas: 'cadenas',
  pulseras: 'pulseras',
};

const rawCollectionConfig = {
  [COLLECTIONS.anillos]: {
    title: 'Anillos',
    subtitle: 'Promesas forjadas en metal noble y gemas eternas, esperando contar tu historia.',
    description:
      'Cada anillo es el inicio de una historia de amor unica, el reflejo de un compromiso eterno.',
    items: [
      { id: 1, name: 'Solitario Oro Amarillo', image: '/anillos/anillos-01-solitario-oro-amarillo.png', category: 'Oro Amarillo' },
      { id: 2, name: 'Bisel Bicolor', image: '/anillos/anillos-02-bisel-bicolor.png', category: 'Bicolor' },
      { id: 3, name: 'Solitario Oro Blanco', image: '/anillos/anillos-03-solitario-oro-blanco.png', category: 'Oro Blanco' },
      { id: 4, name: 'Media Eternidad Oro Blanco', image: '/anillos/anillos-04-media-eternidad-oro-blanco.png', category: 'Oro Blanco' },
      { id: 5, name: 'Cluster Floral', image: '/anillos/anillos-05-cluster-floral.png', category: 'Oro Blanco' },
      { id: 6, name: 'Banda Pave Ancha', image: '/anillos/anillos-06-banda-pave-ancha.png', category: 'Oro Blanco' },
      { id: 7, name: 'Eternidad Oro Amarillo', image: '/anillos/anillos-07-eternidad-oro-amarillo.png', category: 'Oro Amarillo' },
      { id: 8, name: 'Eternidad Oro Blanco', image: '/anillos/anillos-08-eternidad-oro-blanco.png', category: 'Oro Blanco' },
      { id: 9, name: 'Banda Oro Amarillo', image: '/anillos/anillos-09-banda-oro-amarillo.png', category: 'Oro Amarillo' },
      { id: 10, name: 'Eternidad Redonda', image: '/anillos/anillos-10-eternidad-redonda.png', category: 'Oro Blanco' },
      { id: 11, name: 'Media Eternidad Redonda', image: '/anillos/anillos-11-media-eternidad-redonda.png', category: 'Oro Blanco' },
      { id: 12, name: 'Halo Oro Amarillo', image: '/anillos/anillos-12-halo-oro-amarillo.png', category: 'Oro Amarillo' },
    ],
  },
  [COLLECTIONS.aretes]: {
    title: 'Aretes',
    subtitle: 'Detalles ligeros, clasicos y colgantes para elevar cada gesto con brillo y movimiento.',
    description:
      'Esta coleccion reune aretes esenciales y colgantes delicados en oro con acentos brillantes.',
    items: [
      { id: 1, name: 'Aretes Argollas Lisas', image: '/aretes/aretes-01-argollas-lisas.png', category: 'Todos' },
      { id: 2, name: 'Topos Redondos', image: '/aretes/aretes-02-topos-redondos.png', category: 'Todos' },
      { id: 3, name: 'Aretes Gota Colgante', image: '/aretes/aretes-03-gotas-colgantes.png', category: 'Todos' },
      { id: 4, name: 'Flores con Brillo', image: '/aretes/aretes-04-flores-diamante.png', category: 'Todos' },
      { id: 5, name: 'Cadenas Colgantes', image: '/aretes/aretes-05-cadenas-colgantes.png', category: 'Todos' },
      { id: 6, name: 'Argollas Trenzadas', image: '/aretes/aretes-06-argollas-trenzadas.png', category: 'Todos' },
      { id: 7, name: 'Argollas Pave', image: '/aretes/aretes-07-argollas-pave.png', category: 'Todos' },
      { id: 8, name: 'Doble Aro Colgante', image: '/aretes/aretes-08-doble-aro-colgante.png', category: 'Todos' },
      { id: 9, name: 'Perla Colgante', image: '/aretes/aretes-09-perla-colgante.png', category: 'Todos' },
      { id: 10, name: 'Cuff con Cadena y Estrella', image: '/aretes/aretes-10-cuff-cadena-estrella.png', category: 'Todos' },
    ],
  },
  [COLLECTIONS.cadenas]: {
    title: 'Cadenas',
    subtitle: 'Piezas que enmarcan el gesto y elevan la presencia con elegancia atemporal.',
    description:
      'Nuestra linea de cadenas reune presencia, caida y detalles delicados para complementar momentos especiales y looks cotidianos.',
    items: [
      { id: 1, name: 'Eslabon Ovalado', image: '/cadenas/cadenas-01-eslabon-ovalado.png', category: 'Todos' },
      { id: 2, name: 'Cordon Delgado', image: '/cadenas/cadenas-02-cordon-delgado.png', category: 'Todos' },
      { id: 3, name: 'Eslabon Trenzado', image: '/cadenas/cadenas-03-eslabon-trenzado.png', category: 'Todos' },
      { id: 4, name: 'Eslabon Abierto', image: '/cadenas/cadenas-04-eslabon-abierto.png', category: 'Todos' },
      { id: 5, name: 'Eslabon Fino', image: '/cadenas/cadenas-05-eslabon-fino.png', category: 'Todos' },
      { id: 6, name: 'Cadena Mixta', image: '/cadenas/cadenas-06-cadena-mixta.png', category: 'Todos' },
      { id: 7, name: 'Cadena Plana', image: '/cadenas/cadenas-07-cadena-plana.png', category: 'Todos' },
      { id: 8, name: 'Eslabon Pulido', image: '/cadenas/cadenas-08-eslabon-pulido.png', category: 'Todos' },
      { id: 9, name: 'Cadena Delicada', image: '/cadenas/cadenas-09-cadena-delicada.png', category: 'Todos' },
      { id: 10, name: 'Brazalete Liso', image: '/cadenas/cadenas-10-brazalete-liso.png', category: 'Todos' },
      { id: 11, name: 'Bolitas Delicadas', image: '/cadenas/cadenas-11-bolitas-delicadas.png', category: 'Todos' },
      { id: 12, name: 'Eslabon Rectangular', image: '/cadenas/cadenas-12-eslabon-rectangular.png', category: 'Todos' },
    ],
  },
  [COLLECTIONS.pulseras]: {
    title: 'Pulseras',
    subtitle: 'Brazaletes y piezas de pulso con caracter, textura y presencia artesanal.',
    description:
      'La categoria de pulseras muestra cada diseno de forma independiente y con lectura mas clara para asesorar mejor.',
    items: [
      { id: 1, name: 'Eslabon Pave Doble', image: '/pulseras/pulseras-01-eslabon-pave-doble.png', category: 'Todos' },
      { id: 2, name: 'Cordon Clasico', image: '/pulseras/pulseras-02-cordon-clasico.png', category: 'Todos' },
      { id: 3, name: 'Media Eternidad Rigida', image: '/pulseras/pulseras-03-media-eternidad-rigida.png', category: 'Todos' },
      { id: 4, name: 'Cordon Brillante', image: '/pulseras/pulseras-04-cordon-brillante.png', category: 'Todos' },
      { id: 5, name: 'Eslabon Redondo', image: '/pulseras/pulseras-05-eslabon-redondo.png', category: 'Todos' },
      { id: 6, name: 'Cadena Gruesa', image: '/pulseras/pulseras-06-cadena-gruesa.png', category: 'Todos' },
      { id: 7, name: 'Brazalete Rigido', image: '/pulseras/pulseras-07-brazalete-rigido.png', category: 'Todos' },
      { id: 8, name: 'Cordon Pave con Cierre', image: '/pulseras/pulseras-08-cordon-pave-cierre.png', category: 'Todos' },
      { id: 9, name: 'Pulsera de Esferas', image: '/pulseras/pulseras-09-pulsera-esferas.png', category: 'Todos' },
    ],
  },
};

function createReference(slug, id) {
  return `${slug.slice(0, 3).toUpperCase()}-${String(id).padStart(3, '0')}`;
}

function inferMetal(slug, item) {
  if (slug === COLLECTIONS.anillos) {
    if (item.category === 'Oro Blanco') return 'oro blanco';
    if (item.category === 'Bicolor') return 'bicolor';
    return 'oro amarillo';
  }

  return 'oro amarillo';
}

function inferType(slug, itemName) {
  const name = itemName.toLowerCase();

  if (slug === COLLECTIONS.anillos) return 'anillo';
  if (slug === COLLECTIONS.aretes) return 'aretes';
  if (slug === COLLECTIONS.cadenas) return name.includes('brazalete') ? 'pulsera' : 'cadena';
  return 'pulsera';
}

function inferDisplayType(slug, itemName) {
  const name = itemName.toLowerCase();

  if (slug === COLLECTIONS.anillos) {
    if (name.includes('solitario')) return 'Solitario';
    if (name.includes('halo')) return 'Halo';
    if (name.includes('cluster')) return 'Cluster';
    if (name.includes('media eternidad')) return 'Media eternidad';
    if (name.includes('eternidad')) return 'Eternidad';
    if (name.includes('banda')) return 'Banda';
    if (name.includes('bisel')) return 'Bisel';
    return 'Anillo';
  }

  if (slug === COLLECTIONS.aretes) {
    if (name.includes('topos')) return 'Topos';
    if (name.includes('argollas')) return 'Argollas';
    if (name.includes('cuff')) return 'Cuff';
    if (name.includes('perla')) return 'Perla';
    if (name.includes('colgante') || name.includes('cadenas') || name.includes('gota')) return 'Colgantes';
    return 'Aretes de autor';
  }

  if (slug === COLLECTIONS.cadenas) {
    if (name.includes('brazalete')) return 'Brazalete';
    if (name.includes('bolitas')) return 'Bolitas';
    if (name.includes('cordon')) return 'Cordon';
    if (name.includes('mixta')) return 'Mixta';
    if (name.includes('cadena')) return 'Cadena';
    return 'Eslabon';
  }

  if (name.includes('rigid')) return 'Rigida';
  if (name.includes('cordon')) return 'Cordon';
  if (name.includes('esferas')) return 'Esferas';
  if (name.includes('cadena')) return 'Cadena';
  return 'Eslabon';
}

function inferStyleLabel(slug, itemName) {
  const name = itemName.toLowerCase();

  if (name.includes('pave') || name.includes('brillo') || name.includes('halo')) return 'Brillante';
  if (name.includes('floral') || name.includes('perla')) return 'Romantico';
  if (name.includes('trenzad') || name.includes('cordon')) return 'Texturizado';
  if (name.includes('rectangular') || name.includes('cuff') || name.includes('rigid')) return 'Statement';
  if (name.includes('delicad') || name.includes('topos') || name.includes('solitario')) return 'Delicado';
  if (slug === COLLECTIONS.anillos) return 'Clasico';
  if (slug === COLLECTIONS.aretes) return 'Ligero';
  if (slug === COLLECTIONS.cadenas) return 'Versatil';
  return 'Clasico';
}

function normalizeStyle(styleLabel) {
  const style = String(styleLabel || '').toLowerCase();

  if (style.includes('romant')) return 'romantico';
  if (style.includes('statement') || style.includes('brillante')) return 'statement';
  if (style.includes('textur') || style.includes('versatil')) return 'moderno';
  if (style.includes('delic') || style.includes('ligero')) return 'minimalista';
  return 'clasico';
}

function inferProtagonism(itemName) {
  const name = itemName.toLowerCase();

  if (name.includes('halo') || name.includes('cluster') || name.includes('ancha') || name.includes('doble') || name.includes('gruesa')) {
    return 'Alto';
  }

  if (name.includes('delicad') || name.includes('topos') || name.includes('solitario') || name.includes('perla')) {
    return 'Bajo';
  }

  return 'Medio';
}

function inferOccasionLabels(slug, itemName) {
  const name = itemName.toLowerCase();

  if (slug === COLLECTIONS.anillos) {
    if (name.includes('solitario') || name.includes('halo')) return ['Compromiso', 'Aniversario'];
    if (name.includes('eternidad')) return ['Aniversario', 'Regalo especial'];
    return ['Uso diario', 'Regalo especial'];
  }

  if (slug === COLLECTIONS.aretes) {
    if (name.includes('perla') || name.includes('gota') || name.includes('flores')) return ['Evento', 'Regalo especial'];
    if (name.includes('topos')) return ['Uso diario', 'Regalo especial'];
    return ['Uso diario', 'Evento'];
  }

  if (slug === COLLECTIONS.cadenas) {
    if (name.includes('brazalete')) return ['Evento', 'Uso diario'];
    if (name.includes('delicada') || name.includes('bolitas')) return ['Uso diario', 'Regalo especial'];
    return ['Layering', 'Uso diario'];
  }

  if (name.includes('media eternidad') || name.includes('pave')) return ['Evento', 'Regalo especial'];
  if (name.includes('esferas')) return ['Uso diario', 'Regalo especial'];
  return ['Uso diario', 'Evento'];
}

function normalizeOccasions(occasionLabels) {
  const values = new Set();

  occasionLabels.forEach((occasion) => {
    const normalized = String(occasion || '').toLowerCase();

    if (normalized.includes('compromiso')) values.add('compromiso');
    if (normalized.includes('aniversario')) values.add('aniversario');
    if (normalized.includes('regalo')) values.add('regalo');
    if (normalized.includes('uso diario')) values.add('diario');
    if (normalized.includes('evento')) values.add('evento');
    if (normalized.includes('layering')) values.add('diario');
  });

  return Array.from(values);
}

function inferMaterial(slug, item) {
  if (slug === COLLECTIONS.anillos) {
    if (item.category === 'Oro Blanco') return 'Oro blanco con brillo espejo';
    if (item.category === 'Bicolor') return 'Combinacion de oro amarillo y blanco';
    return 'Oro amarillo con pulido fino';
  }

  if (slug === COLLECTIONS.cadenas) {
    if (item.name.includes('Brazalete')) return 'Oro amarillo con estructura rigida';
    if (item.name.includes('Bolitas')) return 'Oro amarillo con esferas pulidas';
    return 'Oro amarillo trabajado en eslabones artesanales';
  }

  if (slug === COLLECTIONS.pulseras) {
    if (item.name.includes('Pave') || item.name.includes('Eternidad')) return 'Oro amarillo con acentos brillantes';
    if (item.name.includes('Rigido')) return 'Oro amarillo en formato brazalete';
    return 'Oro amarillo con textura artesanal';
  }

  if (item.name.includes('Perla')) return 'Oro amarillo con perla protagonista';
  if (item.name.includes('Pave') || item.name.includes('Brillo') || item.name.includes('Topos')) return 'Oro amarillo con detalle brillante';
  return 'Oro amarillo con caida ligera';
}

function inferFinish(slug, itemName) {
  const name = itemName.toLowerCase();

  if (name.includes('pave') || name.includes('brillo') || name.includes('eternidad')) return 'Pulido alto con detalle de brillo';
  if (name.includes('perla')) return 'Brillo suave con protagonismo central';
  if (name.includes('trenzad') || name.includes('cordon')) return 'Textura trenzada y terminacion pulida';
  if (slug === COLLECTIONS.cadenas) return 'Perfil limpio con caida ligera';
  if (slug === COLLECTIONS.pulseras) return 'Pulido espejo y presencia marcada';
  return 'Pulido fino de alta presencia';
}

function inferIdealFor(slug, displayType, occasionLabels, protagonism) {
  if (slug === COLLECTIONS.anillos) {
    if (displayType === 'Solitario' || displayType === 'Halo') return 'Compromiso, aniversario o una declaracion con mucha carga simbolica.';
    if (displayType.includes('Eternidad')) return 'Aniversarios, regalos con permanencia o stacking refinado.';
    return 'Regalo especial o una pieza de simbolo personal con lectura elegante.';
  }

  if (slug === COLLECTIONS.cadenas) {
    return protagonism === 'Bajo'
      ? 'Uso diario elevado, layering delicado o regalo versatil.'
      : 'Capas mas visibles, looks de presencia o eventos con una lectura mas marcada.';
  }

  if (slug === COLLECTIONS.pulseras) {
    return 'Pulso con caracter para evento, regalo especial o uso continuo con mas presencia.';
  }

  return occasionLabels.includes('Uso diario')
    ? 'Uso diario con un acento refinado o regalo facil de acertar.'
    : 'Eventos, regalo especial o una pieza para iluminar mas el gesto.';
}

function inferCombinesWith(slug, displayType, styleLabel) {
  if (slug === COLLECTIONS.anillos) {
    if (displayType === 'Solitario') return 'Se complementa bien con bandas finas o medias eternidades de lectura sobria.';
    if (displayType.includes('Eternidad')) return 'Funciona muy bien junto a solitarios y composiciones de stacking delicado.';
    return 'Conviene combinarlo con aretes ligeros o una cadena limpia para no competir en exceso.';
  }

  if (slug === COLLECTIONS.aretes) {
    if (styleLabel === 'Delicado' || styleLabel === 'Ligero') return 'Combinan muy bien con cadenas finas o anillos sobrios.';
    return 'Se ven mejor con una cadena simple o una pulsera limpia que deje respirar la pieza.';
  }

  if (slug === COLLECTIONS.cadenas) {
    return 'Se integran bien con aretes pequenos, anillos clasicos o una pulsera de pulido limpio.';
  }

  return 'Puedes elevarla con aretes discretos o una cadena ligera, segun la ocasion.';
}

function inferGemstones(itemName) {
  const name = itemName.toLowerCase();
  const gemstones = [];

  if (name.includes('perla')) gemstones.push('perla');
  if (
    name.includes('pave') ||
    name.includes('brillo') ||
    name.includes('halo') ||
    name.includes('solitario') ||
    name.includes('cluster') ||
    name.includes('eternidad') ||
    name.includes('topos')
  ) {
    gemstones.push('diamante');
  }

  return Array.from(new Set(gemstones));
}

function buildSummary(collection, itemName, idealFor) {
  return `${itemName} pertenece a la coleccion ${collection.title.toLowerCase()} y mantiene un lenguaje elegante, artesanal y de joyeria fina. ${idealFor}`;
}

function buildConfiguratorPrompt(collection, itemName) {
  return `Quiero una propuesta inspirada en ${itemName.toLowerCase()} de la coleccion ${collection.title.toLowerCase()}, con un lenguaje elegante y artesanal. Me interesa explorar variaciones de material, proporciones y acabados sin perder la esencia de una joya fina hecha a mano.`;
}

function enrichItem(collectionSlug, collection, item) {
  const displayType = inferDisplayType(collectionSlug, item.name);
  const occasionLabels = inferOccasionLabels(collectionSlug, item.name);
  const styleLabel = inferStyleLabel(collectionSlug, item.name);
  const style = normalizeStyle(styleLabel);
  const protagonism = inferProtagonism(item.name);
  const material = inferMaterial(collectionSlug, item);
  const finish = inferFinish(collectionSlug, item.name);
  const metal = inferMetal(collectionSlug, item);
  const occasions = normalizeOccasions(occasionLabels);
  const type = inferType(collectionSlug, item.name);
  const idealFor = inferIdealFor(collectionSlug, displayType, occasionLabels, protagonism);
  const combinesWith = inferCombinesWith(collectionSlug, displayType, styleLabel);
  const gemstones = inferGemstones(item.name);
  const reference = createReference(collectionSlug, item.id);
  const summary = buildSummary(collection, item.name, idealFor);

  return {
    ...item,
    collectionSlug,
    collectionTitle: collection.title,
    reference,
    metal,
    material,
    finish,
    type,
    displayType,
    style,
    styleLabel,
    protagonism,
    occasions,
    occasionLabels,
    gemstones,
    idealFor,
    combinesWith,
    summary,
    prompt: buildConfiguratorPrompt(collection, item.name),
  };
}

const COLLECTION_COPY = Object.fromEntries(
  Object.entries(rawCollectionConfig).map(([slug, collection]) => [
    slug,
    {
      title: collection.title,
      shortReason: collection.subtitle,
    },
  ]),
);

const PRODUCT_CATALOG = Object.entries(rawCollectionConfig).flatMap(([slug, collection]) =>
  collection.items.map((item) => enrichItem(slug, collection, item)),
);

module.exports = {
  COLLECTIONS,
  COLLECTION_COPY,
  PRODUCT_CATALOG,
};
