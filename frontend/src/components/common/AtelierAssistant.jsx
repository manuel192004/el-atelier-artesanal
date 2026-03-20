import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import '../../styles/_assistant.scss';

const ASSISTANT_SESSION_KEY = 'atelierAssistantSession';

const slotOptions = [
  'Manana entre 9:00 y 11:00',
  'Mediodia entre 11:00 y 13:00',
  'Tarde entre 14:00 y 16:00',
  'Tarde entre 16:00 y 18:00',
];

const starterReplies = [
  { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
  { label: 'Quiero regalar algo', message: 'Quiero una joya para regalo especial' },
  { label: 'Diseno personalizado', message: 'Quiero una joya personalizada' },
];

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Hola, soy Atel-IA, tu asistente virtual. Cuentame que buscas.',
  },
];

function buildToday() {
  return new Date().toISOString().split('T')[0];
}

const createAppointmentState = () => ({
  clientName: '',
  email: '',
  whatsapp: '',
  preferredDate: buildToday(),
  preferredSlot: slotOptions[0],
  reason: 'Asesoria para elegir una joya',
  notes: '',
  source: 'assistant-widget',
});

const createAssistantMemory = () => ({
  occasion: '',
  jewelryType: '',
  budget: '',
  style: '',
  lastIntent: '',
  lastCollectionSlug: '',
});

const createAssistantContext = () => ({
  summaryLine: '',
  topCollectionSlug: '',
  topOccasion: '',
  favoriteCollections: [],
  favorites: [],
  savedDesigns: [],
  quotes: [],
  appointments: [],
});

function getAssistantSessionKey(userId) {
  return `${ASSISTANT_SESSION_KEY}:${userId || 'guest'}`;
}

function firstName(name) {
  return String(name || '').trim().split(' ')[0] || 'atelier';
}

function buildWhatsappHref(message) {
  return `https://wa.me/573156347878?text=${encodeURIComponent(message)}`;
}

function buildConciergeWelcome(profile, accountContext) {
  if (!profile?.fullName) {
    return '';
  }

  const name = firstName(profile.fullName);

  if (accountContext.savedDesigns?.length) {
    return `Hola ${name}, ya puedo ayudarte a retomar tus disenos guardados o convertirlos en una siguiente propuesta mas aterrizada.`;
  }

  if (accountContext.favoriteCollections?.length) {
    return `Hola ${name}, ya tengo como referencia las piezas que te gustaron. Puedo orientarte con base en tus favoritos para que no empieces desde cero.`;
  }

  if (accountContext.quotes?.length || accountContext.appointments?.length) {
    return `Hola ${name}, ya puedo usar tu historial del atelier para orientarte mejor y llevarte al siguiente paso adecuado.`;
  }

  return `Hola ${name}, ya puedo recordar tus preferencias dentro de tu cuenta y usarlas para recomendarte mejor.`;
}

function MessageBubble({ role, text }) {
  return <div className={`assistant-message assistant-message-${role}`}>{text}</div>;
}

function MemoryPills({ memory }) {
  const items = [
    memory.occasion ? `Ocasion: ${memory.occasion}` : '',
    memory.jewelryType ? `Joya: ${memory.jewelryType}` : '',
    memory.budget ? `Presupuesto: ${memory.budget}` : '',
    memory.style ? `Estilo: ${memory.style}` : '',
  ].filter(Boolean);

  if (!items.length) {
    return null;
  }

  return (
    <div className="assistant-memory-pills">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

const AtelierAssistant = () => {
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useAuth();
  const bodyRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [quickReplies, setQuickReplies] = useState(starterReplies);
  const [pendingAction, setPendingAction] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState(createAppointmentState());
  const [assistantMemory, setAssistantMemory] = useState(createAssistantMemory());
  const [accountContext, setAccountContext] = useState(createAssistantContext());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [chatError, setChatError] = useState('');
  const [loadedContextKey, setLoadedContextKey] = useState('');
  const sessionStorageKey = useMemo(() => getAssistantSessionKey(user?.userId), [user?.userId]);

  const whatsappHref = useMemo(() => {
    return buildWhatsappHref('Hola, quiero una asesoria personalizada con El Atelier Artesanal.');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.sessionStorage.getItem(sessionStorageKey);

    if (!stored) {
      setMessages(initialMessages);
      setQuickReplies(starterReplies);
      setPendingAction(null);
      setMode('chat');
      setAppointmentForm(createAppointmentState());
      setAssistantMemory(createAssistantMemory());
      setAccountContext(createAssistantContext());
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed.messages) && parsed.messages.length) {
        setMessages(parsed.messages);
      }

      if (Array.isArray(parsed.quickReplies) && parsed.quickReplies.length) {
        setQuickReplies(parsed.quickReplies);
      }

      if (parsed.pendingAction) {
        setPendingAction(parsed.pendingAction);
      }

      if (parsed.mode === 'appointment' || parsed.mode === 'chat') {
        setMode(parsed.mode);
      }

      if (parsed.appointmentForm) {
        setAppointmentForm((current) => ({
          ...current,
          ...parsed.appointmentForm,
          preferredDate: parsed.appointmentForm.preferredDate || current.preferredDate,
        }));
      }

      if (parsed.assistantMemory) {
        setAssistantMemory((current) => ({
          ...current,
          ...parsed.assistantMemory,
        }));
      }

      if (parsed.accountContext) {
        setAccountContext((current) => ({
          ...current,
          ...parsed.accountContext,
        }));
      }
    } catch (error) {
      console.error(error);
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(
      sessionStorageKey,
      JSON.stringify({
        mode,
        messages,
        quickReplies,
        pendingAction,
        appointmentForm,
        assistantMemory,
        accountContext,
      }),
    );
  }, [mode, messages, quickReplies, pendingAction, appointmentForm, assistantMemory, accountContext, sessionStorageKey]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoadedContextKey('');
      return;
    }

    setAppointmentForm((current) => ({
      ...current,
      clientName: current.clientName || user.fullName || '',
      email: current.email || user.email || '',
      whatsapp: current.whatsapp || user.whatsapp || '',
    }));
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !token || !user?.userId || loadedContextKey === user.userId) {
      return;
    }

    let cancelled = false;
    setIsLoadingContext(true);

    apiFetch('/api/assistant/context', { token })
      .then((data) => {
        if (cancelled) {
          return;
        }

        setAssistantMemory((current) => ({
          ...current,
          ...data.memory,
        }));
        setAccountContext((current) => ({
          ...current,
          ...(data.accountContext || {}),
        }));
        setAppointmentForm((current) => ({
          ...current,
          clientName: data.profile?.fullName || current.clientName,
          email: data.profile?.email || current.email,
          whatsapp: data.profile?.whatsapp || current.whatsapp,
        }));
        setLoadedContextKey(user.userId);

        const conciergeWelcome = buildConciergeWelcome(data.profile, data.accountContext || {});

        if (conciergeWelcome) {
          setMessages((current) => {
            if (!(current.length === 1 && current[0].id === 'welcome')) {
              return current;
            }

            return [
              {
                id: 'welcome-personalized',
                role: 'assistant',
                text: conciergeWelcome,
              },
            ];
          });
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingContext(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isAuthenticated, token, user?.userId, loadedContextKey]);

  const scrollConversationToBottom = () => {
    window.setTimeout(() => {
      bodyRef.current?.scrollTo({
        top: bodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 20);
  };

  const appendMessages = (nextMessages) => {
    setMessages((current) => [...current, ...nextMessages]);
    scrollConversationToBottom();
  };

  const openSavedDesignShortcut = () => {
    const savedDesign = accountContext.savedDesigns?.[0];

    if (!savedDesign) {
      return;
    }

    navigate('/configurador', {
      state: {
        initialPrompt: savedDesign.prompt || '',
        productName: savedDesign.title,
        reference: savedDesign.reference,
      },
    });
  };

  const openQuoteShortcut = () => {
    const quote = accountContext.quotes?.[0];

    if (!quote) {
      return;
    }

    window.open(
      buildWhatsappHref(`Hola, quiero revisar la cotizacion ${quote.quoteId} de mi cuenta.`),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const openAction = (action) => {
    if (!action || action.type === 'none') {
      return;
    }

    if (action.type === 'open_collection' && action.collectionSlug) {
      navigate(`/colecciones/${action.collectionSlug}`);
      setPendingAction(null);
      return;
    }

    if (action.type === 'open_configurator') {
      navigate('/configurador', {
        state: {
          initialPrompt: action.promptHint || '',
        },
      });
      setPendingAction(null);
      return;
    }

    if (action.type === 'open_account') {
      navigate('/cuenta');
      setPendingAction(null);
      return;
    }

    if (action.type === 'open_whatsapp') {
      window.open(whatsappHref, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action.type === 'open_appointment') {
      setAppointmentForm((current) => ({
        ...current,
        reason: action.reason || current.reason,
        notes: action.notes || current.notes,
      }));
      setMode('appointment');
    }
  };

  const submitAssistantPrompt = async (text) => {
    const message = String(text || '').trim();

    if (!message) {
      return;
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
      const data = await apiFetch('/api/assistant/chat', {
        method: 'POST',
        token,
        body: {
          message,
          conversation,
          memory: assistantMemory,
        },
      });

      appendMessages([{ id: `${Date.now()}-assistant`, role: 'assistant', text: data.assistantMessage }]);
      setQuickReplies(Array.isArray(data.quickReplies) && data.quickReplies.length ? data.quickReplies : starterReplies);
      setPendingAction(data.suggestedAction?.type && data.suggestedAction.type !== 'none' ? data.suggestedAction : null);
      setAssistantMemory((current) => ({
        ...current,
        ...(data.memory || {}),
      }));
      if (data.accountContext) {
        setAccountContext((current) => ({
          ...current,
          ...data.accountContext,
        }));
      }

      if (data.suggestedAction?.type === 'open_appointment') {
        setAppointmentForm((current) => ({
          ...current,
          reason: data.suggestedAction.reason || current.reason,
          notes: data.suggestedAction.notes || current.notes,
        }));
      }
    } catch (error) {
      setChatError(error.message || 'No se pudo responder desde la asesora.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    await submitAssistantPrompt(inputValue);
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

      appendMessages([
        { id: `${Date.now()}-user`, role: 'user', text: 'Quiero dejar agendada mi cita' },
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: `Tu solicitud quedo registrada con la referencia ${data.appointmentId}. Te contactaremos para confirmar el horario.`,
        },
      ]);
      setSuccessMessage(data.message);
      setAppointmentForm((current) => ({
        ...createAppointmentState(),
        clientName: current.clientName,
        email: current.email,
        whatsapp: current.whatsapp,
      }));
      setMode('chat');
      setPendingAction(null);
      setQuickReplies(accountContext.favoriteCollections?.length ? [
        { label: 'Seguir con mis favoritos', message: 'Quiero seguir con mis favoritos' },
        { label: 'Ver recomendacion', message: 'Que me recomiendas segun mis favoritos' },
        { label: 'Diseno personalizado', message: 'Quiero una joya personalizada' },
      ] : starterReplies);
    } catch (error) {
      setFormError(error.message || 'No se pudo registrar la cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`assistant-widget ${isOpen ? 'is-open' : ''}`}>
      {isOpen ? <button type="button" className="assistant-backdrop" aria-label="Cerrar asistente" onClick={() => setIsOpen(false)} /> : null}

      {isOpen ? (
        <section className="assistant-panel" aria-label="Atel-IA">
          <header className="assistant-panel-header">
            <div>
              <span className="assistant-kicker">Atel-IA</span>
              <h2>Elige, disena o agenda</h2>
            </div>
            <button type="button" className="assistant-close" onClick={() => setIsOpen(false)} aria-label="Cerrar Atel-IA">
              x
            </button>
          </header>

          <div className="assistant-panel-body" ref={bodyRef}>
            {messages.map((message) => (
              <MessageBubble key={message.id} role={message.role} text={message.text} />
            ))}
            {isThinking ? <div className="assistant-message assistant-message-assistant">Estoy pensando la mejor recomendacion para ti...</div> : null}
          </div>

          <div className="assistant-panel-actions">
            {mode === 'chat' ? (
              <>
                {isAuthenticated && (accountContext.summaryLine || isLoadingContext) ? (
                  <div className="assistant-context-card">
                    <strong>Modo concierge</strong>
                    <p>
                      {isLoadingContext
                        ? 'Estoy cargando tu contexto guardado para recomendarte mejor.'
                        : accountContext.summaryLine || 'Estoy usando tu cuenta como contexto para orientarte mejor.'}
                    </p>
                    <div className="assistant-action-grid">
                      {accountContext.topCollectionSlug ? (
                        <button
                          type="button"
                          className="assistant-chip"
                          onClick={() => openAction({
                            type: 'open_collection',
                            label: 'Ver sugerencia base',
                            collectionSlug: accountContext.topCollectionSlug,
                          })}
                        >
                          Ver tu linea sugerida
                        </button>
                      ) : null}
                      {accountContext.savedDesigns?.length ? (
                        <button type="button" className="assistant-chip" onClick={openSavedDesignShortcut}>
                          Retomar diseno
                        </button>
                      ) : null}
                      {accountContext.quotes?.length ? (
                        <button type="button" className="assistant-chip" onClick={openQuoteShortcut}>
                          Revisar cotizacion
                        </button>
                      ) : null}
                      {accountContext.appointments?.length ? (
                        <button type="button" className="assistant-chip" onClick={() => navigate('/cuenta')}>
                          Ver mi cuenta
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {pendingAction ? (
                  <div className="assistant-result-card">
                    <strong>{pendingAction.label || 'Siguiente paso sugerido'}</strong>
                    <p>
                      {pendingAction.reason
                        || 'Puedo llevarte directo al siguiente paso para que el recorrido sea mas claro.'}
                    </p>
                    <div className="assistant-action-grid">
                      <button type="button" className="assistant-chip assistant-chip-primary" onClick={() => openAction(pendingAction)}>
                        {pendingAction.label || 'Continuar'}
                      </button>
                      <button type="button" className="assistant-chip assistant-chip-secondary" onClick={() => setPendingAction(null)}>
                        Seguir hablando
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="assistant-advisor">
                  <p className="assistant-step-label">Escribe lo que buscas o toca una sugerencia.</p>
                  <MemoryPills memory={assistantMemory} />
                  {isAuthenticated ? <p className="assistant-memory-note">Tu memoria del asistente se esta guardando en tu cuenta.</p> : null}

                  <div className="assistant-action-grid">
                    {quickReplies.map((reply) => (
                      <button key={`${reply.label}-${reply.message}`} type="button" className="assistant-chip" onClick={() => submitAssistantPrompt(reply.message)}>
                        {reply.label}
                      </button>
                    ))}
                    <a href={whatsappHref} target="_blank" rel="noreferrer" className="assistant-link-action">
                      Hablar por WhatsApp
                    </a>
                  </div>

                  <form className="assistant-composer" onSubmit={handleChatSubmit}>
                    <input
                      type="text"
                      className="assistant-input"
                      placeholder="Ej: Busco un anillo de compromiso con presupuesto de 1 millon"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                    />
                    <button type="submit" className="assistant-chip assistant-chip-primary" disabled={isThinking}>
                      {isThinking ? 'Pensando...' : 'Enviar'}
                    </button>
                  </form>
                </div>

                {chatError ? <p className="assistant-form-error">{chatError}</p> : null}
              </>
            ) : null}

            {mode === 'appointment' ? (
              <form className="assistant-form" onSubmit={handleAppointmentSubmit}>
                <label>
                  <span>Nombre</span>
                  <input type="text" value={appointmentForm.clientName} onChange={handleAppointmentFieldChange('clientName')} autoComplete="name" required />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={appointmentForm.email} onChange={handleAppointmentFieldChange('email')} autoComplete="email" required />
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input type="text" value={appointmentForm.whatsapp} onChange={handleAppointmentFieldChange('whatsapp')} autoComplete="tel" required />
                </label>
                <label>
                  <span>Fecha</span>
                  <input type="date" min={buildToday()} value={appointmentForm.preferredDate} onChange={handleAppointmentFieldChange('preferredDate')} required />
                </label>
                <label>
                  <span>Horario preferido</span>
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
                <label className="assistant-form-wide">
                  <span>Notas</span>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={handleAppointmentFieldChange('notes')}
                    placeholder="Cuentanos si buscas anillo, regalo, diseno personalizado o asesoria."
                  />
                </label>
                {formError ? <p className="assistant-form-error">{formError}</p> : null}
                {successMessage ? <p className="assistant-form-success">{successMessage}</p> : null}
                <div className="assistant-form-actions">
                  <button type="submit" className="assistant-chip assistant-chip-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Solicitar cita'}
                  </button>
                  <button type="button" className="assistant-chip assistant-chip-secondary" onClick={() => setMode('chat')}>
                    Volver al chat
                  </button>
                </div>
              </form>
            ) : null}

            <p className="assistant-helper">
              Atel-IA entiende ocasion, presupuesto y tipo de joya. En tu cuenta tambien usa favoritos, disenos y solicitudes previas.
            </p>
          </div>
        </section>
      ) : null}

      <button type="button" className="assistant-launcher" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? 'Cerrar' : 'Atel-IA'}
      </button>
    </div>
  );
};

export default AtelierAssistant;
