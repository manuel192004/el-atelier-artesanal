import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { getCollectionCatalog, getCollectionInsights } from '../../lib/catalog';
import '../../styles/_assistant-v2.scss';

const slotOptions = [
  'Manana entre 9:00 y 11:00',
  'Mediodia entre 11:00 y 13:00',
  'Tarde entre 14:00 y 16:00',
  'Tarde entre 16:00 y 18:00',
];

const starterReplies = [
  { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
  { label: 'Quiero un regalo', message: 'Quiero una joya para regalo especial' },
  { label: 'Diseno a medida', message: 'Quiero una joya personalizada' },
];

const defaultWelcomeText = 'Hola, soy Orvia. Te ayudo a elegir coleccion, pieza, configurador o cita sin enredarte.';

const emptyAccountContext = {
  summaryLine: '',
  topCollectionSlug: '',
  favoriteCollections: [],
  favorites: [],
  savedDesigns: [],
  quotes: [],
  appointments: [],
};

const emptyDiagnostics = {
  knownDetails: [],
  missingDetails: [],
  route: 'none',
};

function buildToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createAppointmentState(user) {
  return {
    clientName: user?.fullName || '',
    email: user?.email || '',
    whatsapp: user?.whatsapp || '',
    preferredDate: buildToday(),
    preferredSlot: slotOptions[0],
    reason: 'Asesoria para elegir una joya',
    notes: '',
    source: 'assistant-v2-widget',
  };
}

function createMemory() {
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

function buildWhatsappHref(message) {
  return `https://wa.me/573156347878?text=${encodeURIComponent(message)}`;
}

function createWelcomeMessages() {
  return [
    {
      id: 'welcome',
      role: 'assistant',
      text: defaultWelcomeText,
    },
  ];
}

function MemoryPills({ memory }) {
  const items = [
    memory.occasion ? `Ocasion: ${memory.occasion}` : '',
    memory.jewelryType ? `Joya: ${memory.jewelryType}` : '',
    memory.style ? `Estilo: ${memory.style}` : '',
    memory.metal ? `Metal: ${memory.metal}` : '',
    memory.gemstone ? `Detalle: ${memory.gemstone}` : '',
    memory.budget ? `Presupuesto: ${memory.budget}` : '',
  ].filter(Boolean);

  if (!items.length) {
    return null;
  }

  return (
    <div className="assistant-v2-pills">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function MessageBubble({ role, text }) {
  return <div className={`assistant-v2-message assistant-v2-message-${role}`}>{text}</div>;
}

function buildActionPreview(action) {
  if (!action?.type) {
    return null;
  }

  if (action.type === 'open_collection' && action.collectionSlug) {
    const collection = getCollectionCatalog(action.collectionSlug);

    if (!collection) {
      return null;
    }

    const insights = getCollectionInsights(collection);

    return {
      image: collection.cardImage || collection.backgroundImage || '',
      eyebrow: 'Coleccion curada',
      title: collection.title,
      summary: collection.subtitle,
      meta: [
        insights.topOccasions[0] || '',
        insights.topStyles[0] || '',
      ].filter(Boolean),
    };
  }

  if (action.type === 'open_product' && action.collectionSlug && action.productReference) {
    const collection = getCollectionCatalog(action.collectionSlug);
    const product = collection?.items.find((item) => item.reference === action.productReference);

    if (!collection || !product) {
      return null;
    }

    return {
      image: product.image || collection.cardImage || '',
      eyebrow: 'Pieza sugerida',
      title: product.name,
      summary: `${product.reference} • ${product.type} • ${product.style}`,
      meta: [
        product.metal || '',
        product.occasions?.[0] || '',
      ].filter(Boolean),
    };
  }

  if (action.type === 'open_configurator') {
    return {
      image: '/orviane-collections-hero.png',
      eyebrow: 'Ruta creativa',
      title: 'Configurador Orviane',
      summary: 'Pasa de una intuicion a una propuesta visual con materiales, estilo y ocasion.',
      meta: ['Brief visual', 'Variaciones guiadas'],
    };
  }

  if (action.type === 'open_appointment') {
    return {
      image: '/orviane-story-atelier.png',
      eyebrow: 'Asesoria guiada',
      title: 'Cita corta',
      summary: 'Aterriza materiales, tiempos y presupuesto con acompanamiento humano.',
      meta: ['Contexto real', 'Siguiente paso claro'],
    };
  }

  return null;
}

function ActionPreviewCard({ action }) {
  const preview = buildActionPreview(action);

  if (!preview) {
    return null;
  }

  return (
    <div className="assistant-v2-preview-card">
      {preview.image ? (
        <img
          src={preview.image}
          alt={preview.title}
          className="assistant-v2-preview-image"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className="assistant-v2-preview-copy">
        <span className="assistant-v2-meta">{preview.eyebrow}</span>
        <strong>{preview.title}</strong>
        <p>{preview.summary}</p>
        {preview.meta?.length ? (
          <div className="assistant-v2-preview-meta">
            {preview.meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GuidanceMessageCard({ guidanceCard }) {
  if (!guidanceCard) {
    return null;
  }

  return (
    <div className="assistant-v2-sidecard">
      <span className="assistant-v2-meta">{guidanceCard.eyebrow}</span>
      <strong>{guidanceCard.title}</strong>
      <p>{guidanceCard.summary}</p>
      {Array.isArray(guidanceCard.bullets) && guidanceCard.bullets.length ? (
        <div className="assistant-v2-preview-meta">
          {guidanceCard.bullets.slice(0, 2).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SuggestedActionMessage({ action, onOpen, onDismiss }) {
  if (!action) {
    return null;
  }

  return (
    <div className="assistant-v2-sidecard assistant-v2-sidecard-highlight">
      <span className="assistant-v2-meta">{getActionEyebrow(action)}</span>
      <strong>{action.label || 'Siguiente paso sugerido'}</strong>
      <p>{getActionCopy(action)}</p>
      <ActionPreviewCard action={action} />
      <div className="assistant-v2-cta-row">
        <button
          type="button"
          className="assistant-v2-chip assistant-v2-chip-primary"
          onClick={onOpen}
        >
          {getActionButtonLabel(action)}
        </button>
        <button type="button" className="assistant-v2-chip assistant-v2-chip-subtle" onClick={onDismiss}>
          Ocultar
        </button>
      </div>
    </div>
  );
}

function getActionEyebrow(action) {
  if (!action?.type) {
    return 'Siguiente paso';
  }

  if (action.type === 'open_collection') return 'Coleccion sugerida';
  if (action.type === 'open_product') return 'Pieza sugerida';
  if (action.type === 'open_configurator') return 'Ruta recomendada';
  if (action.type === 'open_appointment') return 'Acompanamiento sugerido';
  if (action.type === 'open_whatsapp') return 'Continuidad humana';
  return 'Siguiente paso';
}

function getActionCopy(action) {
  if (!action?.type) {
    return 'Te llevo directo al siguiente paso util.';
  }

  if (action.reason) {
    return action.reason;
  }

  if (action.type === 'open_collection') {
    return 'Entra directo a la coleccion mas alineada con lo que acabas de pedir.';
  }

  if (action.type === 'open_product') {
    return 'Abre una referencia concreta para que no tengas que filtrar desde cero.';
  }

  if (action.type === 'open_configurator') {
    return 'Convierte tu idea en una propuesta visual mas clara desde el configurador.';
  }

  if (action.type === 'open_appointment') {
    return 'Pasa a una cita corta para aterrizar materiales, tiempos y presupuesto.';
  }

  if (action.type === 'open_whatsapp') {
    return 'Continua con una asesora humana sin perder el contexto de esta conversacion.';
  }

  return 'Te llevo directo al siguiente paso util.';
}

function getActionButtonLabel(action) {
  if (!action?.type) {
    return 'Continuar';
  }

  if (action.type === 'open_collection') return 'Abrir coleccion';
  if (action.type === 'open_product') return 'Ver pieza';
  if (action.type === 'open_configurator') return 'Abrir configurador';
  if (action.type === 'open_appointment') return 'Ir a cita';
  if (action.type === 'open_whatsapp') return 'Abrir WhatsApp';
  return 'Continuar';
}

function buildGuestFallbackReply(message) {
  const normalized = String(message || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const isGiftIntent =
    /(regalo|regalar|cumpleanos|aniversario|sorpresa|dia de la madre|dia de las madres|madre|mama|mamá)/.test(normalized);
  const isRingIntent = /(anillo|compromiso|sortija|aro)/.test(normalized);
  const isCustomIntent = /(personaliz|a medida|configurador|disen)/.test(normalized);
  const isAppointmentIntent = /(cita|agendar|asesoria|whatsapp)/.test(normalized);
  const isMothersDayIntent = /(dia de la madre|dia de las madres|madre|mama|mamá)/.test(normalized);

  if (/^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hello)\b/.test(normalized)) {
    return {
      assistantMessage:
        'Hola. Puedo ayudarte a elegir una joya, ver colecciones, personalizar una idea o agendar una asesoria. Si quieres, empezamos por tipo de joya, ocasion o estilo.',
      quickReplies: [
        { label: 'Ver colecciones', message: 'Quiero ver colecciones' },
        ...starterReplies,
      ],
      suggestedAction: null,
      guidanceCard: null,
      diagnostics: emptyDiagnostics,
      memory: createMemory(),
    };
  }

  if (isRingIntent) {
    return {
      assistantMessage:
        'Perfecto. Si buscas un anillo, la ruta mas clara es empezar por la coleccion de anillos y desde ahi afinar estilo, metal o personalizacion.',
      quickReplies: [
        { label: 'Ver anillos', message: 'Quiero ver anillos' },
        { label: 'Quiero algo sobrio', message: 'Quiero un anillo sobrio' },
        { label: 'Personalizar idea', message: 'Quiero una joya personalizada' },
      ],
      suggestedAction: {
        type: 'open_collection',
        label: 'Ver anillos',
        collectionSlug: 'anillos',
      },
      guidanceCard: null,
      diagnostics: emptyDiagnostics,
      memory: createMemory(),
    };
  }

  if (isGiftIntent) {
    return {
      assistantMessage:
        isMothersDayIntent
          ? 'Si es para el Dia de las Madres, te conviene empezar por aretes o cadenas delicadas. Son regalos faciles de acertar, elegantes y muy bien recibidos para esa ocasion.'
          : 'Si es para regalo, la ruta mas clara es empezar por aretes o cadenas y luego afinar estilo, presupuesto o nivel de protagonismo.',
      quickReplies: [
        { label: 'Ver aretes', message: 'Quiero ver aretes' },
        { label: 'Ver cadenas', message: 'Quiero ver cadenas' },
        isMothersDayIntent
          ? { label: 'Quiero algo para mama', message: 'Quiero algo delicado para mama' }
          : { label: 'Quiero algo delicado', message: 'Quiero algo delicado para regalo' },
      ],
      suggestedAction: {
        type: 'open_collection',
        label: 'Ver aretes',
        collectionSlug: 'aretes',
      },
      guidanceCard: null,
      diagnostics: emptyDiagnostics,
      memory: createMemory(),
    };
  }

  if (isCustomIntent) {
    return {
      assistantMessage:
        'Tu idea ya suena a personalizacion. Te conviene pasar al configurador para convertirla en un brief mas claro y luego decidir si necesitas cita.',
      quickReplies: [
        { label: 'Abrir configurador', message: 'Llevame al configurador' },
        { label: 'Definir estilo', message: 'Quiero ayuda para definir estilo y materiales' },
        { label: 'Agendar asesoria', message: 'Quiero agendar una cita' },
      ],
      suggestedAction: {
        type: 'open_configurator',
        label: 'Abrir configurador',
      },
      guidanceCard: null,
      diagnostics: emptyDiagnostics,
      memory: createMemory(),
    };
  }

  if (isAppointmentIntent) {
    return {
      assistantMessage:
        'Claro. Podemos seguir por cita o por WhatsApp. Si quieres, te llevo al siguiente paso.',
      quickReplies: [
        { label: 'Agendar cita', message: 'Quiero agendar una cita' },
        { label: 'Hablar por WhatsApp', message: 'Quiero hablar por WhatsApp' },
        { label: 'Seguir viendo', message: 'Prefiero seguir viendo opciones' },
      ],
      suggestedAction: null,
      guidanceCard: null,
      diagnostics: emptyDiagnostics,
      memory: createMemory(),
    };
  }

  return {
    assistantMessage:
      'Puedo ayudarte mejor si me dices una de estas cosas: si buscas un anillo, un regalo, una pieza personalizada o una asesoria. Con eso ya te llevo por una ruta mucho mas clara.',
    quickReplies: [
      { label: 'Ver colecciones', message: 'Quiero ver colecciones' },
      ...starterReplies,
    ],
    suggestedAction: null,
    guidanceCard: null,
    diagnostics: emptyDiagnostics,
    memory: createMemory(),
  };
}

const AtelierAssistantV2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState(() => createWelcomeMessages());
  const [quickReplies, setQuickReplies] = useState(starterReplies);
  const [inputValue, setInputValue] = useState('');
  const [memory, setMemory] = useState(createMemory());
  const [accountContext, setAccountContext] = useState(emptyAccountContext);
  const [pendingAction, setPendingAction] = useState(null);
  const [guidanceCard, setGuidanceCard] = useState(null);
  const [diagnostics, setDiagnostics] = useState(emptyDiagnostics);
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [loadedContextKey, setLoadedContextKey] = useState('');
  const [appointmentForm, setAppointmentForm] = useState(() => createAppointmentState(user));
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  const clientContext = useMemo(() => {
    const collectionMatch = location.pathname.match(/^\/colecciones\/([^/]+)/);

    return {
      currentPath: location.pathname,
      currentCollectionSlug: collectionMatch?.[1] || '',
      sessionType: 'guest',
    };
  }, [location.pathname]);

  const whatsappHref = useMemo(
    () => buildWhatsappHref('Hola, quiero continuar con una asesoria de Orviane.'),
    [],
  );

  const trackAssistantEvent = (eventName, extra = {}) => {
    apiFetch('/api/assistant-v2/event', {
      method: 'POST',
      body: {
        eventName,
        currentPath: location.pathname,
        sessionType: 'guest',
        ...extra,
      },
    }).catch((error) => {
      console.error(error);
    });
  };

  useEffect(() => {
    setAppointmentForm((current) => ({
      ...current,
      clientName: current.clientName || user?.fullName || '',
      email: current.email || user?.email || '',
      whatsapp: current.whatsapp || user?.whatsapp || '',
    }));
  }, [user]);

  useEffect(() => {
    setLoadedContextKey('');
    setAccountContext(emptyAccountContext);
    setIsLoadingContext(false);
  }, []);

  useEffect(() => {
    if (!isOpen || mode !== 'chat') {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isOpen, mode]);

  const appendMessages = (nextMessages) => {
    setMessages((current) => [...current, ...nextMessages]);
  };

  const resetConversation = async () => {
    trackAssistantEvent('brief_reset', {
      source: 'widget',
    });
    setMode('chat');
    setMessages(createWelcomeMessages());
    setQuickReplies(starterReplies);
    setInputValue('');
    setMemory(createMemory());
    setPendingAction(null);
    setGuidanceCard(null);
    setDiagnostics(emptyDiagnostics);
    setChatError('');
    setFormError('');
    setSuccessMessage('');
    setAppointmentForm(createAppointmentState(user));

    return;
  };

  const openSavedDesignShortcut = () => {
    const savedDesign = accountContext.savedDesigns?.[0];

    if (!savedDesign) {
      return;
    }

    trackAssistantEvent('action_opened', {
      route: 'open_configurator',
      source: 'saved_design_shortcut',
      productReference: savedDesign.reference || '',
    });

    navigate('/configurador', {
      state: {
        initialPrompt: savedDesign.prompt || '',
        productName: savedDesign.title,
        reference: savedDesign.reference,
      },
    });
    setIsOpen(false);
  };

  const openQuoteShortcut = () => {
    const quote = accountContext.quotes?.[0];

    if (!quote) {
      return;
    }

    trackAssistantEvent('action_opened', {
      route: 'open_whatsapp',
      source: 'quote_shortcut',
      productReference: quote.quoteId || '',
    });

    window.open(
      buildWhatsappHref(`Hola, quiero revisar la cotizacion ${quote.quoteId} de mi cuenta.`),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const openAction = (action, source = 'assistant_suggestion') => {
    if (!action || action.type === 'none') {
      return;
    }

    trackAssistantEvent('action_opened', {
      route: action.type,
      source,
      collectionSlug: action.collectionSlug || '',
      productReference: action.productReference || '',
    });

    if (action.type === 'open_collection' && action.collectionSlug) {
      navigate(`/colecciones/${action.collectionSlug}`);
      setPendingAction(null);
      setIsOpen(false);
      return;
    }

    if (action.type === 'open_product' && action.collectionSlug) {
      navigate(`/colecciones/${action.collectionSlug}`, {
        state: {
          selectedReference: action.productReference,
        },
      });
      setPendingAction(null);
      setIsOpen(false);
      return;
    }

    if (action.type === 'open_configurator') {
      navigate('/configurador', {
        state: {
          initialPrompt: action.promptHint || '',
          focusConversion: false,
        },
      });
      setPendingAction(null);
      setIsOpen(false);
      return;
    }

    if (action.type === 'open_appointment') {
      setAppointmentForm((current) => ({
        ...current,
        reason: action.reason || current.reason,
        notes: action.notes || current.notes,
      }));
      setMode('appointment');
      return;
    }

    if (action.type === 'open_whatsapp') {
      window.open(whatsappHref, '_blank', 'noopener,noreferrer');
      return;
    }
  };

  const applyAssistantReply = (data) => {
    appendMessages([{ id: `${Date.now()}-assistant`, role: 'assistant', text: data.assistantMessage }]);
    setQuickReplies(Array.isArray(data.quickReplies) && data.quickReplies.length ? data.quickReplies : starterReplies);
    setPendingAction(data.suggestedAction?.type && data.suggestedAction.type !== 'none' ? data.suggestedAction : null);
    setGuidanceCard(data.guidanceCard || null);
    setDiagnostics((data.diagnostics && typeof data.diagnostics === 'object')
      ? {
          knownDetails: Array.isArray(data.diagnostics.knownDetails) ? data.diagnostics.knownDetails : [],
          missingDetails: Array.isArray(data.diagnostics.missingDetails) ? data.diagnostics.missingDetails : [],
          route: data.diagnostics.route || 'none',
        }
      : emptyDiagnostics);
    setMemory((current) => ({
      ...current,
      ...(data.memory || {}),
    }));
    if (data.accountContext) {
      setAccountContext(data.accountContext);
    }
  };

  const submitPrompt = async (rawText, metadata = {}) => {
    const message = String(rawText || '').trim();

    if (!message) {
      return;
    }

    if (metadata.source === 'quick_reply') {
      trackAssistantEvent('quick_reply_click', {
        source: 'quick_reply',
        label: metadata.label || '',
        message,
      });
    }

    const conversation = messages.map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));

    appendMessages([{ id: `${Date.now()}-user`, role: 'user', text: message }]);
    setInputValue('');
    setIsThinking(true);
    setChatError('');
    setSuccessMessage('');

    try {
      const requestBody = {
        message,
        conversation,
        memory,
        clientContext,
      };

      try {
        const data = await apiFetch('/api/assistant-v2/chat', {
          method: 'POST',
          body: requestBody,
        });

        applyAssistantReply(data);
      } catch (requestError) {
        console.error(requestError);
        applyAssistantReply(buildGuestFallbackReply(message));
      }
    } catch (error) {
      console.error(error);
      applyAssistantReply(buildGuestFallbackReply(message));
    } finally {
      setIsThinking(false);
    }
  };

  const handleAppointmentFieldChange = (field) => (event) => {
    setAppointmentForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleAppointmentSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const data = await apiFetch('/api/appointments', {
        method: 'POST',
        body: appointmentForm,
      });

      setSuccessMessage(data.message);
      appendMessages([
        { id: `${Date.now()}-user`, role: 'user', text: 'Quiero agendar una cita' },
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: `Perfecto. Tu solicitud quedo registrada con la referencia ${data.appointmentId}.`,
        },
      ]);
      setMode('chat');
      setPendingAction(null);
      setQuickReplies(starterReplies);
      setAppointmentForm(createAppointmentState(user));
      trackAssistantEvent('appointment_submitted', {
        route: 'open_appointment',
        source: 'assistant_form',
      });
    } catch (error) {
      setFormError(error.message || 'No pude registrar la cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`assistant-v2-shell ${isOpen ? 'is-open' : ''}`}>
      {isOpen ? (
        <button
          type="button"
          className="assistant-v2-backdrop"
          aria-label="Cerrar Orvia"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      {isOpen ? (
        <div className="assistant-v2-layout">
          {mode === 'chat' && (guidanceCard || pendingAction) ? (
            <aside className="assistant-v2-sidecar" aria-label="Sugerencias de Orvia">
              {guidanceCard ? <GuidanceMessageCard guidanceCard={guidanceCard} /> : null}
              {pendingAction ? (
                <SuggestedActionMessage
                  action={pendingAction}
                  onOpen={() => openAction(pendingAction, 'pending_action_continue')}
                  onDismiss={() => setPendingAction(null)}
                />
              ) : null}
            </aside>
          ) : null}

          <section className="assistant-v2-panel" aria-label="Orvia">
            <header className="assistant-v2-header">
              <div className="assistant-v2-header-copy">
                <span className="assistant-v2-kicker">Orvia</span>
                <h2>Elige sin enredos</h2>
              </div>
              <button type="button" className="assistant-v2-close" onClick={() => setIsOpen(false)} aria-label="Cerrar">
                x
              </button>
            </header>

            <div className="assistant-v2-body">
              {messages.map((message) => (
                <MessageBubble key={message.id} role={message.role} text={message.text} />
              ))}
              {isThinking ? (
                <div className="assistant-v2-message assistant-v2-message-assistant">
                  Estoy aterrizando la mejor ruta para ti...
                </div>
              ) : null}
            </div>

            <div className="assistant-v2-actions">
              {mode === 'chat' ? (
                <>
                  <form
                    className="assistant-v2-composer"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitPrompt(inputValue, { source: 'free_text' });
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      className="assistant-v2-input"
                      placeholder="Ejemplo: regalo delicado para aniversario"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                    />
                    <button type="submit" className="assistant-v2-chip assistant-v2-chip-primary" disabled={isThinking}>
                      {isThinking ? 'Pensando...' : 'Enviar'}
                    </button>
                  </form>

                  {chatError ? <p className="assistant-v2-error">{chatError}</p> : null}

                  <div className="assistant-v2-quick-replies" aria-label="Recomendaciones rapidas">
                    {quickReplies.map((reply) => (
                      <button
                        key={`${reply.label}-${reply.message}`}
                        type="button"
                        className="assistant-v2-chip assistant-v2-chip-compact"
                        onClick={() => submitPrompt(reply.message, {
                          source: 'quick_reply',
                          label: reply.label,
                        })}
                      >
                        {reply.label}
                      </button>
                    ))}
                    <button type="button" className="assistant-v2-chip assistant-v2-chip-compact assistant-v2-chip-subtle" onClick={resetConversation}>
                      Reiniciar
                    </button>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="assistant-v2-link assistant-v2-chip-compact"
                      onClick={() => trackAssistantEvent('action_opened', {
                        route: 'open_whatsapp',
                        source: 'direct_link',
                      })}
                    >
                      WhatsApp
                    </a>
                  </div>
                </>
              ) : null}

              {mode === 'appointment' ? (
                <form className="assistant-v2-form" onSubmit={handleAppointmentSubmit}>
                  <label>
                    <span>Nombre</span>
                    <input type="text" value={appointmentForm.clientName} onChange={handleAppointmentFieldChange('clientName')} required />
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" value={appointmentForm.email} onChange={handleAppointmentFieldChange('email')} required />
                  </label>
                  <label>
                    <span>WhatsApp</span>
                    <input type="text" value={appointmentForm.whatsapp} onChange={handleAppointmentFieldChange('whatsapp')} required />
                  </label>
                  <label>
                    <span>Fecha</span>
                    <input type="date" min={buildToday()} value={appointmentForm.preferredDate} onChange={handleAppointmentFieldChange('preferredDate')} required />
                  </label>
                  <label>
                    <span>Horario</span>
                    <select value={appointmentForm.preferredSlot} onChange={handleAppointmentFieldChange('preferredSlot')}>
                      {slotOptions.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Motivo</span>
                    <input type="text" value={appointmentForm.reason} onChange={handleAppointmentFieldChange('reason')} required />
                  </label>
                  <label className="assistant-v2-form-wide">
                    <span>Notas</span>
                    <textarea value={appointmentForm.notes} onChange={handleAppointmentFieldChange('notes')} />
                  </label>
                  {formError ? <p className="assistant-v2-error">{formError}</p> : null}
                  {successMessage ? <p className="assistant-v2-success">{successMessage}</p> : null}
                  <div className="assistant-v2-grid">
                    <button type="submit" className="assistant-v2-chip assistant-v2-chip-primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Enviando...' : 'Solicitar cita'}
                    </button>
                    <button type="button" className="assistant-v2-chip" onClick={() => setMode('chat')}>
                      Volver al chat
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      <button
        type="button"
        className="assistant-v2-launcher"
        onClick={() =>
          setIsOpen((current) => {
            const next = !current;

            if (next) {
              trackAssistantEvent('launcher_opened', {
                source: 'floating_launcher',
              });
            }

            return next;
          })
        }
      >
        {isOpen ? 'Cerrar Orvia' : 'Abrir Orvia'}
      </button>
    </div>
  );
};

export default AtelierAssistantV2;
