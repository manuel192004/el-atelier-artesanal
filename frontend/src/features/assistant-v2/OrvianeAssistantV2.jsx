import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { getCollectionCatalog, getCollectionInsights } from '../../lib/catalog';
import '../../styles/_assistant-v2.scss';

const slotOptions = [
  'Mañana entre 9:00 y 11:00',
  'Mediodía entre 11:00 y 13:00',
  'Tarde entre 14:00 y 16:00',
  'Tarde entre 16:00 y 18:00',
];

const starterReplies = [
  { label: 'Busco un anillo', message: 'Busco un anillo para compromiso' },
  { label: 'Quiero un regalo', message: 'Quiero una joya para regalo especial' },
  { label: 'Diseño a medida', message: 'Quiero una joya personalizada' },
];

const defaultWelcomeText = 'Hola, soy Orvia. Te ayudo a elegir colección, pieza, configurador o cita sin enredarte.';

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
    reason: 'Asesoría para elegir una joya',
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
    budgetRange: '',
    valuationSummary: '',
    lastIntent: '',
    lastCollectionSlug: '',
    lastProductReference: '',
    // Nuevos campos para restricciones fuertes
    avoidedFeatures: [],
    budgetMaxCop: null,
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

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function isSpeechSynthesisAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function isRealtimeVoiceAvailable() {
  return typeof window !== 'undefined' &&
    'RTCPeerConnection' in window &&
    Boolean(navigator.mediaDevices?.getUserMedia);
}

function buildVoiceAvailabilityLabel(isRealtimeVoice = false) {
  if (isRealtimeVoice) {
    return 'Voz OpenAI en vivo';
  }

  const canListen = Boolean(getSpeechRecognitionConstructor());
  const canSpeak = isSpeechSynthesisAvailable();

  if (canListen && canSpeak) {
    return 'Voz activa';
  }

  if (canListen) {
    return 'Micrófono activo';
  }

  if (canSpeak) {
    return 'Respuesta hablada';
  }

  return 'Chat escrito';
}

function waitForIceGathering(peerConnection) {
  if (!peerConnection || peerConnection.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let timeout;
    const finish = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      peerConnection.removeEventListener('icegatheringstatechange', handleStateChange);
      resolve();
    };

    const handleStateChange = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        finish();
      }
    };

    timeout = window.setTimeout(finish, 1400);
    peerConnection.addEventListener('icegatheringstatechange', handleStateChange);
  });
}

function createRealtimeTextEvent(text) {
  return {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text,
        },
      ],
    },
  };
}

function buildRealtimeMemoryInstruction(memory) {
  const details = [
    memory.occasion ? `ocasión ${memory.occasion}` : '',
    memory.jewelryType ? `joya ${memory.jewelryType}` : '',
    memory.style ? `estilo ${memory.style}` : '',
    memory.metal ? `metal ${memory.metal}` : '',
    memory.gemstone ? `piedra ${memory.gemstone}` : '',
    memory.budget ? `presupuesto ${memory.budget}` : '',
    memory.valuationSummary ? `última valoración: ${memory.valuationSummary}` : '',
  ].filter(Boolean);

  return details.length
    ? `Ten presente este contexto del cliente: ${details.join('; ')}.`
    : 'No hay contexto firme todavía; escucha y pregunta solo lo indispensable.';
}

function MemoryPills({ memory }) {
  const items = [
    memory.occasion ? `Ocasión: ${memory.occasion}` : '',
    memory.jewelryType ? `Joya: ${memory.jewelryType}` : '',
    memory.style ? `Estilo: ${memory.style}` : '',
    memory.metal ? `Metal: ${memory.metal}` : '',
    memory.gemstone ? `Detalle: ${memory.gemstone}` : '',
    memory.budget ? `Presupuesto: ${memory.budget}` : '',
  ].filter(Boolean);

  if (Array.isArray(memory.avoidedFeatures) && memory.avoidedFeatures.length > 0) {
    items.push(`Evita: ${memory.avoidedFeatures.join(', ')}`);
  }

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
      summary: 'Pasa de una intuición a una propuesta visual con materiales, estilo y ocasión.',
      meta: ['Brief visual', 'Variaciones guiadas'],
    };
  }

  if (action.type === 'open_appointment') {
    return {
      image: '/orviane-story-atelier.png', // TODO: Renombrar imagen sin 'atelier'
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

  if (action.type === 'open_collection') return 'Colección sugerida';
  if (action.type === 'open_product') return 'Pieza sugerida';
  if (action.type === 'open_configurator') return 'Ruta recomendada';
  if (action.type === 'open_appointment') return 'Acompañamiento sugerido';
  if (action.type === 'open_whatsapp') return 'Continuidad humana';
  return 'Siguiente paso';
}

function getActionCopy(action) {
  if (!action?.type) {
    return 'Te llevo directo al siguiente paso útil.';
  }

  if (action.reason) {
    return action.reason;
  }

  if (action.type === 'open_collection') {
    return 'Entra directo a la colección más alineada con lo que acabas de pedir.';
  }

  if (action.type === 'open_product') {
    return 'Abre una referencia concreta para que no tengas que filtrar desde cero.';
  }

  if (action.type === 'open_configurator') {
    return 'Convierte tu idea en una propuesta visual más clara desde el configurador.';
  }

  if (action.type === 'open_appointment') {
    return 'Pasa a una cita corta para aterrizar materiales, tiempos y presupuesto.';
  }

  if (action.type === 'open_whatsapp') {
    return 'Continúa con una asesora humana sin perder el contexto de esta conversación.';
  }

  return 'Te llevo directo al siguiente paso útil.';
}

function getActionButtonLabel(action) {
  if (!action?.type) {
    return 'Continuar';
  }

  if (action.type === 'open_collection') return 'Abrir colección';
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
        'Hola. Puedo ayudarte a elegir una joya, ver colecciones, personalizar una idea o agendar una asesoría. Si quieres, empezamos por tipo de joya, ocasión o estilo.',
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
        'Perfecto. Si buscas un anillo, la ruta más clara es empezar por la colección de anillos y desde ahí afinar estilo, metal o personalización.',
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
          ? 'Si es para el Día de las Madres, te conviene empezar por aretes o cadenas delicadas. Son regalos fáciles de acertar, elegantes y muy bien recibidos para esa ocasión.'
          : 'Si es para regalo, la ruta más clara es empezar por aretes o cadenas y luego afinar estilo, presupuesto o nivel de protagonismo.',
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
        'Tu idea ya suena a personalización. Te conviene pasar al configurador para convertirla en un brief más claro y luego decidir si necesitas cita.',
      quickReplies: [
        { label: 'Abrir configurador', message: 'Llévame al configurador' },
        { label: 'Definir estilo', message: 'Quiero ayuda para definir estilo y materiales' },
        { label: 'Agendar asesoría', message: 'Quiero agendar una cita' },
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
      'Puedo ayudarte mejor si me dices una de estas cosas: si buscas un anillo, un regalo, una pieza personalizada o una asesoría. Con eso ya te llevo por una ruta mucho más clara.',
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

const OrvianeAssistantV2 = () => {
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
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRealtimeVoice, setIsRealtimeVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Lista para llamada');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceModeRef = useRef(false);
  const voiceTranscriptRef = useRef('');
  const voiceRecognitionHadErrorRef = useRef(false);
  const voiceRestartTimerRef = useRef(null);
  const realtimePeerRef = useRef(null);
  const realtimeDataChannelRef = useRef(null);
  const realtimeAudioRef = useRef(null);
  const realtimeStreamRef = useRef(null);
  const realtimeAssistantTextRef = useRef('');
  const realtimeUserTextRef = useRef('');
  const realtimeUserItemsRef = useRef(new Set());
  const realtimeIsActiveRef = useRef(false);

  const clientContext = useMemo(() => {
    const collectionMatch = location.pathname.match(/^\/colecciones\/([^/]+)/);

    return {
      currentPath: location.pathname,
      currentCollectionSlug: collectionMatch?.[1] || '',
      sessionType: 'guest',
    };
  }, [location.pathname]);

  const whatsappHref = useMemo(
    () => buildWhatsappHref('Hola, quiero continuar con una asesoría de Orviane.'),
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
    voiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    return () => {
      if (voiceRestartTimerRef.current) {
        window.clearTimeout(voiceRestartTimerRef.current);
      }

      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort?.();
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      if (realtimeDataChannelRef.current) {
        realtimeDataChannelRef.current.close();
      }

      if (realtimePeerRef.current) {
        realtimePeerRef.current.close();
      }

      if (realtimeStreamRef.current) {
        realtimeStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (realtimeAudioRef.current) {
        realtimeAudioRef.current.pause();
        realtimeAudioRef.current.srcObject = null;
        realtimeAudioRef.current.remove();
      }
    };
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

  const sendRealtimeEvent = (event) => {
    const channel = realtimeDataChannelRef.current;

    if (!channel || channel.readyState !== 'open') {
      return false;
    }

    channel.send(JSON.stringify(event));
    return true;
  };

  const appendRealtimeAssistantTranscript = (text) => {
    const transcript = String(text || '').trim();

    if (!transcript) {
      return;
    }

    appendMessages([{ id: `${Date.now()}-realtime-assistant`, role: 'assistant', text: transcript }]);
    setVoiceStatus('Te escucho en vivo. Puedes hablar sin pulsar botones.');
    setIsSpeaking(false);
  };

  const handleRealtimeEvent = (rawEvent) => {
    let event;

    try {
      event = JSON.parse(rawEvent.data);
    } catch (error) {
      console.error(error);
      return;
    }

    if (event.type === 'session.created' || event.type === 'session.updated') {
      setVoiceStatus('Llamada conectada. Habla normal; Orvia detecta cuando terminas.');
      return;
    }

    if (event.type === 'input_audio_buffer.speech_started') {
      realtimeUserTextRef.current = '';
      setIsListening(true);
      setIsSpeaking(false);
      setVoiceStatus('Te escucho en vivo.');
      return;
    }

    if (event.type === 'input_audio_buffer.speech_stopped') {
      setIsListening(false);
      setVoiceStatus('Orvia está entendiendo tu idea.');
      return;
    }

    if (event.type === 'conversation.item.input_audio_transcription.delta') {
      realtimeUserTextRef.current = `${realtimeUserTextRef.current}${event.delta || ''}`;
      setVoiceTranscript(realtimeUserTextRef.current.trim());
      return;
    }

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = String(event.transcript || realtimeUserTextRef.current || '').trim();
      const itemId = event.item_id || `${Date.now()}-${transcript}`;
      realtimeUserTextRef.current = '';
      setVoiceTranscript(transcript);

      if (transcript && !realtimeUserItemsRef.current.has(itemId)) {
        realtimeUserItemsRef.current.add(itemId);
        appendMessages([{ id: `${Date.now()}-realtime-user`, role: 'user', text: transcript }]);
      }

      return;
    }

    if (event.type === 'response.created') {
      realtimeAssistantTextRef.current = '';
      setIsSpeaking(true);
      setVoiceStatus('Orvia está respondiendo.');
      return;
    }

    if (event.type === 'response.output_audio_transcript.delta') {
      realtimeAssistantTextRef.current = `${realtimeAssistantTextRef.current}${event.delta || ''}`;
      return;
    }

    if (event.type === 'response.output_audio_transcript.done') {
      appendRealtimeAssistantTranscript(event.transcript || realtimeAssistantTextRef.current);
      realtimeAssistantTextRef.current = '';
      return;
    }

    if (event.type === 'response.done') {
      appendRealtimeAssistantTranscript(realtimeAssistantTextRef.current);
      realtimeAssistantTextRef.current = '';
      setIsSpeaking(false);
      return;
    }

    if (event.type === 'error') {
      console.error(event.error || event);
      setVoiceStatus(event.error?.message || 'La llamada tuvo un corte. Puedes seguir por chat o reiniciarla.');
    }
  };

  const stopRealtimeVoiceCall = () => {
    realtimeIsActiveRef.current = false;
    setIsRealtimeVoice(false);

    if (realtimeDataChannelRef.current) {
      realtimeDataChannelRef.current.close();
      realtimeDataChannelRef.current = null;
    }

    if (realtimePeerRef.current) {
      realtimePeerRef.current.close();
      realtimePeerRef.current = null;
    }

    if (realtimeStreamRef.current) {
      realtimeStreamRef.current.getTracks().forEach((track) => track.stop());
      realtimeStreamRef.current = null;
    }

    if (realtimeAudioRef.current) {
      realtimeAudioRef.current.pause();
      realtimeAudioRef.current.srcObject = null;
      realtimeAudioRef.current.remove();
      realtimeAudioRef.current = null;
    }

    realtimeAssistantTextRef.current = '';
    realtimeUserTextRef.current = '';
    realtimeUserItemsRef.current = new Set();
  };

  const sendRealtimeTextMessage = (text) => {
    const message = String(text || '').trim();

    if (!message) {
      return false;
    }

    const sentMessage = sendRealtimeEvent(createRealtimeTextEvent(message));
    const sentResponse = sendRealtimeEvent({
      type: 'response.create',
      response: {
        instructions: `${buildRealtimeMemoryInstruction(memory)} Responde como Orvia con voz natural, breve y concreta. Reconoce el mensaje del cliente y avanza un paso útil.`,
      },
    });

    return sentMessage && sentResponse;
  };

  const startRealtimeVoiceCall = async () => {
    if (!isRealtimeVoiceAvailable()) {
      throw new Error('Realtime voice is not available in this browser.');
    }

    setVoiceStatus('Preparando llamada de voz en vivo.');

    const tokenData = await apiFetch('/api/assistant-v2/realtime-client-secret', {
      method: 'POST',
      body: {
        currentPath: location.pathname,
        clientContext,
        memory,
        conversation: messages.slice(-8).map((entry) => ({
          role: entry.role,
          text: entry.text,
        })),
      },
    });
    const ephemeralKey = tokenData.clientSecret || tokenData.value;

    if (!ephemeralKey) {
      throw new Error('No se recibio token temporal de OpenAI Realtime.');
    }

    setVoiceStatus('Activa el permiso de micrófono para hablar con Orvia.');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const peerConnection = new RTCPeerConnection();
    const audioElement = document.createElement('audio');
    const dataChannel = peerConnection.createDataChannel('oai-events');

    realtimePeerRef.current = peerConnection;
    realtimeStreamRef.current = stream;
    realtimeAudioRef.current = audioElement;
    realtimeDataChannelRef.current = dataChannel;
    realtimeIsActiveRef.current = true;
    setIsRealtimeVoice(true);

    audioElement.autoplay = true;
    audioElement.playsInline = true;
    audioElement.setAttribute('playsinline', 'true');

    peerConnection.ontrack = (event) => {
      audioElement.srcObject = event.streams[0];
      audioElement.play().catch((error) => {
        console.error(error);
        setVoiceStatus('La llamada está conectada; toca la pantalla si el audio no se reproduce.');
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setVoiceStatus('Llamada en vivo. Habla normal, sin tocar Hablar.');
        return;
      }

      if (['failed', 'disconnected', 'closed'].includes(peerConnection.connectionState)) {
        setIsListening(false);
        setIsSpeaking(false);
        setVoiceStatus('La llamada se desconecto. Puedes iniciarla otra vez o seguir por chat.');
      }
    };

    dataChannel.addEventListener('open', () => {
      setVoiceStatus('Llamada en vivo. Orvia te saluda y queda escuchando.');
      sendRealtimeEvent({
        type: 'response.create',
        response: {
          instructions: `${buildRealtimeMemoryInstruction(memory)} Saluda en una frase como Orvia. Si ya hay contexto, menciona que lo tienes presente; si no, di que puedes ayudar a elegir regalo, anillo, colección o diseño a medida. Luego espera al cliente.`,
        },
      });
    });
    dataChannel.addEventListener('message', handleRealtimeEvent);
    dataChannel.addEventListener('close', () => {
      setIsListening(false);
      setIsSpeaking(false);
    });

    stream.getAudioTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await waitForIceGathering(peerConnection);

    const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      body: peerConnection.localDescription?.sdp || offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        'Content-Type': 'application/sdp',
      },
    });

    const answerSdp = await sdpResponse.text();

    if (!sdpResponse.ok) {
      throw new Error(answerSdp || 'No se pudo conectar la llamada Realtime de OpenAI.');
    }

    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp,
    });

    trackAssistantEvent('voice_realtime_connected', {
      source: 'openai_realtime',
      model: tokenData.model || '',
      voice: tokenData.voice || '',
    });

    return true;
  };

  const stopVoiceListening = () => {
    if (realtimeIsActiveRef.current) {
      setIsListening(false);
      return;
    }

    if (voiceRestartTimerRef.current) {
      window.clearTimeout(voiceRestartTimerRef.current);
      voiceRestartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.abort?.();
      recognitionRef.current = null;
    }

    voiceTranscriptRef.current = '';
    voiceRecognitionHadErrorRef.current = false;
    setIsListening(false);
  };

  const stopVoiceOutput = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  };

  const endVoiceCall = () => {
    voiceModeRef.current = false;
    setIsVoiceMode(false);
    stopRealtimeVoiceCall();
    stopVoiceListening();
    stopVoiceOutput();
    setVoiceTranscript('');
    setVoiceStatus('Llamada finalizada. Puedes seguir por chat cuando quieras.');
  };

  const speakAssistantText = (text, options = {}) => {
    const spokenText = String(text || '').trim();

    if (!spokenText || !voiceModeRef.current) {
      return;
    }

    if (realtimeIsActiveRef.current) {
      return;
    }

    if (!isSpeechSynthesisAvailable()) {
      setVoiceStatus('Tu navegador permite leer el chat, pero no reproducir voz en esta sesión.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(spokenText);
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find((voice) => /^es(-|_)/i.test(voice.lang));

    utterance.lang = 'es-CO';
    utterance.rate = 0.94;
    utterance.pitch = 0.98;

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setVoiceStatus('Orvia está respondiendo.');
    };

    utterance.onend = () => {
      setIsSpeaking(false);

      if (options.resumeListening && voiceModeRef.current) {
        setVoiceStatus('Te escucho de nuevo en un momento.');
        voiceRestartTimerRef.current = window.setTimeout(() => {
          startVoiceListening();
        }, 450);
        return;
      }

      if (voiceModeRef.current) {
        setVoiceStatus('Pulsa Hablar para continuar la llamada.');
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceStatus('No pude reproducir la voz, pero la respuesta quedó escrita en el chat.');
    };

    window.speechSynthesis.speak(utterance);
  };

  const startVoiceListening = () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (realtimeIsActiveRef.current) {
      setVoiceStatus('La llamada en vivo ya está escuchando. Habla normal, sin pulsar Hablar.');
      return;
    }

    if (isThinking || isSpeaking) {
      setVoiceStatus('Espera un momento y continuamos.');
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setIsVoiceMode(true);
      voiceModeRef.current = true;
      setVoiceStatus('Este navegador no permite dictado por voz. Puedes seguir escribiendo en el chat.');
      return;
    }

    stopVoiceListening();
    setVoiceTranscript('');
    voiceTranscriptRef.current = '';
    voiceRecognitionHadErrorRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('Te escucho. Habla con calma y Orvia responde.');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript || '';

        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        voiceTranscriptRef.current = `${voiceTranscriptRef.current} ${finalTranscript}`.trim();
      }

      setVoiceTranscript((finalTranscript || interimTranscript).trim());
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      voiceRecognitionHadErrorRef.current = true;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceStatus('Activa el permiso de micrófono para usar la llamada. El chat escrito sigue disponible.');
        return;
      }

      if (event.error === 'no-speech') {
        setVoiceStatus('No alcance a escucharte. Pulsa Hablar e intenta otra vez.');
        return;
      }

      setVoiceStatus('No pude tomar audio en este intento. Puedes volver a pulsar Hablar.');
    };

    recognition.onend = () => {
      setIsListening(false);
      const capturedText = voiceTranscriptRef.current.trim();
      voiceTranscriptRef.current = '';

      if (voiceRecognitionHadErrorRef.current) {
        voiceRecognitionHadErrorRef.current = false;
        return;
      }

      if (!voiceModeRef.current) {
        return;
      }

      if (capturedText) {
        setVoiceTranscript(capturedText);
        submitPrompt(capturedText, { source: 'voice_call', speak: true });
        return;
      }

      setVoiceStatus('Pulsa Hablar para continuar la llamada.');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
      setIsListening(false);
      setVoiceStatus('El micrófono ya estaba ocupado. Espera un segundo y vuelve a intentar.');
    }
  };

  const startVoiceCall = async () => {
    setIsOpen(true);
    setMode('chat');
    setIsVoiceMode(true);
    voiceModeRef.current = true;
    setChatError('');
    setVoiceTranscript('');
    stopVoiceListening();
    stopVoiceOutput();
    stopRealtimeVoiceCall();
    setVoiceStatus('Conectando llamada con Orvia.');
    trackAssistantEvent('voice_call_started', {
      source: 'voice_call_button',
    });

    try {
      await startRealtimeVoiceCall();
      return;
    } catch (error) {
      console.error(error);
      stopRealtimeVoiceCall();
      setIsVoiceMode(true);
      voiceModeRef.current = true;
      setVoiceStatus('No pude abrir voz en vivo con OpenAI. Activo el modo de voz seguro del navegador.');
      trackAssistantEvent('voice_realtime_fallback', {
        source: 'openai_realtime',
        reason: error.message || 'realtime_unavailable',
      });
    }

    const intro = 'Hola, soy Orvia. Te escucho para ayudarte a elegir una joya, una colección, una cita o una pieza personalizada.';

    window.setTimeout(() => {
      if (isSpeechSynthesisAvailable()) {
        speakAssistantText(intro, { resumeListening: true });
        return;
      }

      startVoiceListening();
    }, 120);
  };

  const closeAssistant = () => {
    if (voiceModeRef.current) {
      endVoiceCall();
    }

    setIsOpen(false);
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
    closeAssistant();
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
      buildWhatsappHref(`Hola, quiero revisar la cotización ${quote.quoteId} de mi cuenta.`),
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
      closeAssistant();
      return;
    }

    if (action.type === 'open_product' && action.collectionSlug) {
      navigate(`/colecciones/${action.collectionSlug}`, {
        state: {
          selectedReference: action.productReference,
        },
      });
      setPendingAction(null);
      closeAssistant();
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
      closeAssistant();
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
    const assistantMessage = data.assistantMessage || 'Puedo seguir orientándote por colección, pieza, configurador o cita.';

    appendMessages([{ id: `${Date.now()}-assistant`, role: 'assistant', text: assistantMessage }]);
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

    return assistantMessage;
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

    if (metadata.source === 'voice_call') {
      trackAssistantEvent('voice_message_submitted', {
        source: 'voice_call',
      });
    }

    const conversation = messages.map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));

    if (realtimeIsActiveRef.current && metadata.source !== 'voice_call') {
      if (sendRealtimeTextMessage(message)) {
        appendMessages([{ id: `${Date.now()}-user`, role: 'user', text: message }]);
        setInputValue('');
        setVoiceStatus('Le pase tu mensaje a Orvia en la llamada.');
        return;
      }

      setVoiceStatus('No pude pasarlo a la llamada, lo intento por chat.');
    }

    appendMessages([{ id: `${Date.now()}-user`, role: 'user', text: message }]);
    setInputValue('');
    setIsThinking(true);
    setChatError('');
    setSuccessMessage('');

    if (metadata.speak) {
      setVoiceStatus('Orvia está pensando la respuesta.');
    }

    try {
      const requestBody = {
        message,
        conversation,
        memory,
        clientContext,
      };
      let replyData;

      try {
        replyData = await apiFetch('/api/assistant-v2/chat', {
          method: 'POST',
          body: requestBody,
        });
      } catch (requestError) {
        console.error(requestError);
        replyData = buildGuestFallbackReply(message);
      }

      const spokenText = applyAssistantReply(replyData);

      if (metadata.speak) {
        speakAssistantText(spokenText, { resumeListening: true });
      }
    } catch (error) {
      console.error(error);
      const fallbackReply = buildGuestFallbackReply(message);
      const spokenText = applyAssistantReply(fallbackReply);

      if (metadata.speak) {
        speakAssistantText(spokenText, { resumeListening: true });
      }
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
          text: `Perfecto. Tu solicitud quedó registrada con la referencia ${data.appointmentId}.`,
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
          onClick={closeAssistant}
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
              <div className="assistant-v2-header-actions">
                <button
                  type="button"
                  className={`assistant-v2-call-mini ${isVoiceMode ? 'is-active' : ''}`}
                  onClick={isVoiceMode ? endVoiceCall : startVoiceCall}
                >
                  {isVoiceMode ? 'En llamada' : 'Llamar'}
                </button>
                <button type="button" className="assistant-v2-close" onClick={closeAssistant} aria-label="Cerrar">
                  x
                </button>
              </div>
            </header>

            <div className="assistant-v2-body">
              {memory && (memory.avoidedFeatures?.length > 0 || memory.budget || memory.budgetMaxCop) && (
                <div style={{
                  background: '#f8f1e9',
                  border: '1px solid #d4b89e',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#5c4636',
                  marginBottom: '12px',
                  lineHeight: '1.4'
                }}>
                  <strong>Lo que recuerdo de ti:</strong><br />
                  {memory.budget ? `• Presupuesto: ${memory.budget}.` : ''}
                  {memory.avoidedFeatures?.length > 0 ? ` • Evitas: ${memory.avoidedFeatures.join(', ')}.` : ''}
                  {memory.budgetMaxCop ? ` (Máximo aprox. ${memory.budgetMaxCop.toLocaleString('es-CO')} COP)` : ''}
                  <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                    (Puedes decir "olvídate de lo anterior" si quieres empezar de nuevo)
                  </div>
                </div>
              )}

              {isVoiceMode ? (
                <div className={`assistant-v2-call-card ${isListening ? 'is-listening' : ''} ${isSpeaking ? 'is-speaking' : ''} ${isRealtimeVoice ? 'is-realtime' : ''}`}>
                  <div className="assistant-v2-call-orb" aria-hidden="true">
                    <span />
                  </div>
                  <div className="assistant-v2-call-copy">
                    <span>{buildVoiceAvailabilityLabel(isRealtimeVoice)}</span>
                    <strong>
                      {isRealtimeVoice ? 'Llamada en vivo' : isListening ? 'Te estoy escuchando' : isSpeaking ? 'Orvia responde' : 'Llamada lista'}
                    </strong>
                    <p>{voiceStatus}</p>
                    {voiceTranscript ? <small>Escuché: {voiceTranscript}</small> : null}
                  </div>
                </div>
              ) : null}

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

                  <div className={`assistant-v2-call-controls ${isRealtimeVoice ? 'is-realtime' : ''}`} aria-label="Controles de llamada con Orvia">
                    <button
                      type="button"
                      className={`assistant-v2-call-button ${isVoiceMode ? 'is-active' : ''}`}
                      onClick={isVoiceMode ? endVoiceCall : startVoiceCall}
                    >
                      {isVoiceMode ? 'Finalizar llamada' : 'Iniciar llamada'}
                    </button>
                    {isVoiceMode && !isRealtimeVoice ? (
                      <button
                        type="button"
                        className="assistant-v2-call-button assistant-v2-call-button-secondary"
                        onClick={isSpeaking ? stopVoiceOutput : startVoiceListening}
                        disabled={isListening || isThinking}
                      >
                        {isListening ? 'Escuchando...' : isSpeaking ? 'Detener voz' : 'Hablar'}
                      </button>
                    ) : null}
                  </div>

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
        onClick={() => {
          if (isOpen) {
            closeAssistant();
            return;
          }

          trackAssistantEvent('launcher_opened', {
            source: 'floating_launcher',
          });
          setIsOpen(true);
        }}
      >
        {isOpen ? 'Cerrar Orvia' : 'Abrir Orvia'}
      </button>
    </div>
  );
};

export default OrvianeAssistantV2;
