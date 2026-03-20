import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ShareModal from './ShareModal';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, apiFetch } from '../../lib/api';

const REGISTRATION_STORAGE_KEY = 'atelierRegistrantProfile';

const categoryOptions = ['Anillo', 'Aretes', 'Cadena', 'Pulsera', 'Collar', 'Pieza unica'];
const metalOptions = ['Oro amarillo', 'Oro blanco', 'Oro rosado', 'Plata', 'Bicolor', 'No definido'];
const gemstoneOptions = ['Diamantes', 'Esmeralda', 'Zafiro', 'Rubies', 'Perla', 'Sin piedras', 'A definir'];
const styleOptions = ['Clasico elegante', 'Moderno minimalista', 'Romantico delicado', 'Statement de lujo', 'Vintage refinado', 'Contemporaneo organico'];
const occasionOptions = ['Compromiso', 'Aniversario', 'Regalo especial', 'Uso diario premium', 'Evento especial', 'Coleccion personal'];
const renderIntentOptions = ['Catalogo premium', 'Editorial de campana', 'Macro de detalle'];
const cameraAngleOptions = ['Tres cuartos heroico', 'Frontal limpio', 'Superior refinado', 'Detalle cercano'];
const refinementPresets = [
  { label: 'Mas delicado', field: 'detailLevel', value: 'lineas finas, pave delicado, presencia ligera y refinada' },
  { label: 'Mas lujoso', field: 'prompt', value: 'Quiero una lectura mas exclusiva, engaste limpio, acabados impecables y una presencia de alta joyeria mas rica.' },
  { label: 'Mas moderno', field: 'style', value: 'Moderno minimalista' },
  { label: 'Mas editorial', field: 'renderIntent', value: 'Editorial de campana' },
];

const createInitialState = (initialPrompt, sourceProductName) => ({
  category: sourceProductName?.toLowerCase().includes('arete')
    ? 'Aretes'
    : sourceProductName?.toLowerCase().includes('pulsera')
      ? 'Pulsera'
      : sourceProductName?.toLowerCase().includes('cadena')
        ? 'Cadena'
        : sourceProductName?.toLowerCase().includes('collar')
          ? 'Collar'
          : 'Anillo',
  metal: 'Oro amarillo',
  gemstone: 'Diamantes',
  style: 'Clasico elegante',
  occasion: 'Regalo especial',
  renderIntent: 'Catalogo premium',
  cameraAngle: 'Tres cuartos heroico',
  silhouette: '',
  detailLevel: '',
  backgroundMood: 'Fondo oscuro refinado',
  prompt: initialPrompt || '',
});

const createRegistrationState = () => ({
  fullName: '',
  email: '',
  whatsapp: '',
  city: '',
  occasion: '',
  interest: '',
  notes: '',
  marketingConsent: true,
});

const PromptDesigner = ({ initialPrompt = '', sourceReference = '', sourceProductName = '' }) => {
  const { token, user, isAuthenticated } = useAuth();
  const [form, setForm] = useState(createInitialState(initialPrompt, sourceProductName));
  const [registrant, setRegistrant] = useState(null);
  const [registrationForm, setRegistrationForm] = useState(createRegistrationState());
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatedPromptUsed, setGeneratedPromptUsed] = useState('');
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSavingDesign, setIsSavingDesign] = useState(false);

  useEffect(() => {
    setForm(createInitialState(initialPrompt, sourceProductName));
  }, [initialPrompt, sourceProductName]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedRegistrant = window.localStorage.getItem(REGISTRATION_STORAGE_KEY);

    if (!storedRegistrant) {
      return;
    }

    try {
      const parsedRegistrant = JSON.parse(storedRegistrant);
      setRegistrant(parsedRegistrant);
      setRegistrationForm((current) => ({
        ...current,
        fullName: parsedRegistrant.fullName || '',
        email: parsedRegistrant.email || '',
        whatsapp: parsedRegistrant.whatsapp || '',
        city: parsedRegistrant.city || '',
        occasion: parsedRegistrant.occasion || '',
        interest: parsedRegistrant.interest || '',
      }));
    } catch (storageError) {
      console.error(storageError);
    }
  }, []);

  useEffect(() => {
    if (!user || registrant?.registrantId) {
      return;
    }

    setRegistrationForm((current) => ({
      ...current,
      fullName: current.fullName || user.fullName || '',
      email: current.email || user.email || '',
      whatsapp: current.whatsapp || user.whatsapp || '',
    }));
  }, [registrant?.registrantId, user]);

  const hasCatalogStartingPoint = useMemo(
    () => Boolean(initialPrompt.trim() || sourceReference.trim() || sourceProductName.trim()),
    [initialPrompt, sourceProductName, sourceReference],
  );

  const creativeSummary = useMemo(() => {
    return [
      form.category ? `${form.category} de alta joyeria` : '',
      form.metal && form.metal !== 'No definido' ? `en ${form.metal.toLowerCase()}` : '',
      form.gemstone && form.gemstone !== 'A definir' ? `con ${form.gemstone.toLowerCase()}` : '',
      form.style ? `estilo ${form.style.toLowerCase()}` : '',
      form.occasion ? `pensado para ${form.occasion.toLowerCase()}` : '',
      form.renderIntent ? `en clave ${form.renderIntent.toLowerCase()}` : '',
      form.cameraAngle ? `con vista ${form.cameraAngle.toLowerCase()}` : '',
      form.silhouette ? `con silueta ${form.silhouette.toLowerCase()}` : '',
      form.detailLevel ? `y detalle protagonista ${form.detailLevel.toLowerCase()}` : '',
      form.prompt ? `Brief: ${form.prompt}` : '',
    ]
      .filter(Boolean)
      .join(', ')
      .replace(', Brief:', '. Brief:');
  }, [form]);

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleRegistrationFieldChange = (field) => (event) => {
    const value = field === 'marketingConsent' ? event.target.checked : event.target.value;

    setRegistrationForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();
    setRegistrationError('');
    setRegistrationSuccess('');
    setIsRegistering(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/design-registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo completar el registro.');
      }

      setRegistrant(data);
      setRegistrationSuccess(data.message || 'Registro completado.');

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (requestError) {
      console.error(requestError);
      setRegistrationError(requestError.message || 'No se pudo completar el registro.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRefine = (preset) => {
    setForm((current) => {
      if (preset.field === 'prompt') {
        return {
          ...current,
          prompt: current.prompt ? `${current.prompt} ${preset.value}` : preset.value,
        };
      }

      return {
        ...current,
        [preset.field]: preset.value,
      };
    });
    setGeneratedImage(null);
    setGeneratedPromptUsed('');
    setSaveMessage('');
    setSaveError('');
  };

  const handleGenerate = async () => {
    if (!registrant?.registrantId) {
      setError('Primero completa tu registro para desbloquear la generacion.');
      return;
    }

    if (creativeSummary.trim().length < 18) {
      setError('Necesitamos un poco mas de informacion para generar una joya convincente.');
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);
    setGeneratedPromptUsed('');
    setError(null);
    setSaveMessage('');
    setSaveError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-jewelry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrantId: registrant.registrantId,
          registrantName: registrant.fullName,
          registrantEmail: registrant.email,
          registrantWhatsapp: registrant.whatsapp,
          prompt: form.prompt,
          category: form.category,
          designName: sourceProductName,
          metal: form.metal,
          gemstone: form.gemstone,
          style: form.style,
          occasion: form.occasion,
          renderIntent: form.renderIntent,
          cameraAngle: form.cameraAngle,
          silhouette: form.silhouette,
          detailLevel: form.detailLevel,
          backgroundMood: form.backgroundMood,
          reference: sourceReference,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Algo salio mal en el servidor.');
      }

      setGeneratedImage(data.imageBase64);
      setGeneratedPromptUsed(data.promptUsed || '');
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || 'No se pudo generar la imagen. Intentalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!generatedImage) {
      return;
    }

    if (!isAuthenticated || !token) {
      setSaveError('Inicia sesion en Mi Cuenta para guardar este render.');
      return;
    }

    setIsSavingDesign(true);
    setSaveMessage('');
    setSaveError('');

    try {
      await apiFetch('/api/account/saved-designs', {
        method: 'POST',
        token,
        body: {
          title: sourceProductName || `${form.category} ${form.style}`.trim(),
          imageDataUrl: `data:image/png;base64,${generatedImage}`,
          prompt: generatedPromptUsed || creativeSummary,
          category: form.category,
          metal: form.metal,
          gemstone: form.gemstone,
          style: form.style,
          occasion: form.occasion,
          reference: sourceReference,
        },
      });

      setSaveMessage('Diseno guardado en tu cuenta.');
    } catch (requestError) {
      console.error(requestError);
      setSaveError(requestError.message || 'No se pudo guardar el diseno.');
    } finally {
      setIsSavingDesign(false);
    }
  };

  return (
    <div className="prompt-designer">
      <h2>Describe la Joya de tus Suenos</h2>
      <p className="prompt-subtitle">
        Construyamos un brief mejor para que el render se vea mas realista, elegante y cercano a lo que imagina tu cliente.
      </p>

      <div className="registration-gate">
        <div className="registration-copy">
          <h3>Registro previo obligatorio</h3>
          <p>
            Para generar una joya pedimos un registro rapido. Asi desbloqueas la experiencia y al mismo tiempo el atelier
            va construyendo una base de datos real de interesados, briefs y solicitudes.
          </p>
        </div>

        {!registrant ? (
          <form className="quote-form registration-form" onSubmit={handleRegistrationSubmit}>
            <label className="prompt-field">
              <span>Nombre completo</span>
              <input type="text" value={registrationForm.fullName} onChange={handleRegistrationFieldChange('fullName')} required />
            </label>

            <label className="prompt-field">
              <span>Email</span>
              <input type="email" value={registrationForm.email} onChange={handleRegistrationFieldChange('email')} required />
            </label>

            <label className="prompt-field">
              <span>WhatsApp</span>
              <input type="text" value={registrationForm.whatsapp} onChange={handleRegistrationFieldChange('whatsapp')} required />
            </label>

            <label className="prompt-field">
              <span>Ciudad</span>
              <input type="text" value={registrationForm.city} onChange={handleRegistrationFieldChange('city')} placeholder="Ej: Sincelejo" />
            </label>

            <label className="prompt-field">
              <span>Que buscas hoy</span>
              <input type="text" value={registrationForm.interest} onChange={handleRegistrationFieldChange('interest')} placeholder="Ej: anillo de compromiso" />
            </label>

            <label className="prompt-field">
              <span>Ocasion</span>
              <input type="text" value={registrationForm.occasion} onChange={handleRegistrationFieldChange('occasion')} placeholder="Ej: aniversario" />
            </label>

            <label className="prompt-field prompt-field-wide">
              <span>Notas</span>
              <textarea
                className="prompt-textarea prompt-textarea-compact"
                value={registrationForm.notes}
                onChange={handleRegistrationFieldChange('notes')}
                placeholder="Cuentanos si buscas un regalo, una fecha especial o una idea base."
              />
            </label>

            <label className="prompt-checkbox prompt-field-wide">
              <input
                type="checkbox"
                checked={registrationForm.marketingConsent}
                onChange={handleRegistrationFieldChange('marketingConsent')}
              />
              <span>Acepto que el atelier me contacte para seguimiento de esta solicitud.</span>
            </label>

            {registrationError && <p className="error-text modal-error">{registrationError}</p>}
            {registrationSuccess && <p className="success-text">{registrationSuccess}</p>}

            <button type="submit" className="generate-button registration-submit" disabled={isRegistering}>
              {isRegistering ? 'Registrando...' : 'Registrarme y desbloquear'}
            </button>
          </form>
        ) : (
          <div className="registration-success-card">
            <h4>Registro activo</h4>
            <p>
              <strong>{registrant.fullName}</strong>
              {' - '}
              {registrant.email}
              {' - '}
              {registrant.whatsapp}
            </p>
            <p>Tu perfil ya esta habilitado. Ahora puedes generar, refinar y cotizar tus propuestas.</p>
          </div>
        )}
      </div>

      {hasCatalogStartingPoint && (
        <div className="prompt-prefill-note">
          <strong>Punto de partida cargado.</strong>
          <span>
            {sourceProductName ? ` Base sugerida: ${sourceProductName}.` : ''}
            {sourceReference ? ` Referencia: ${sourceReference}.` : ''}
            {' '}Puedes conservar esa base o transformarla por completo.
          </span>
        </div>
      )}

      <div className="prompt-form-grid">
        <label className="prompt-field">
          <span>Categoria</span>
          <select value={form.category} onChange={handleFieldChange('category')}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="prompt-field">
          <span>Metal</span>
          <select value={form.metal} onChange={handleFieldChange('metal')}>
            {metalOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="prompt-field">
          <span>Piedra principal</span>
          <select value={form.gemstone} onChange={handleFieldChange('gemstone')}>
            {gemstoneOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="prompt-field">
          <span>Estilo</span>
          <select value={form.style} onChange={handleFieldChange('style')}>
            {styleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="prompt-field">
          <span>Ocasion</span>
          <select value={form.occasion} onChange={handleFieldChange('occasion')}>
            {occasionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="prompt-field">
          <span>Intencion visual</span>
          <select value={form.renderIntent} onChange={handleFieldChange('renderIntent')}>
            {renderIntentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="prompt-field">
          <span>Angulo del render</span>
          <select value={form.cameraAngle} onChange={handleFieldChange('cameraAngle')}>
            {cameraAngleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="prompt-field">
          <span>Ambiente visual</span>
          <input
            type="text"
            value={form.backgroundMood}
            onChange={handleFieldChange('backgroundMood')}
            placeholder="Ej: editorial oscuro y refinado"
          />
        </label>

        <label className="prompt-field prompt-field-wide">
          <span>Silueta o forma</span>
          <input
            type="text"
            value={form.silhouette}
            onChange={handleFieldChange('silhouette')}
            placeholder="Ej: banda fina, gota colgante, eslabon ovalado, halo central"
          />
        </label>

        <label className="prompt-field prompt-field-wide">
          <span>Detalle protagonista</span>
          <input
            type="text"
            value={form.detailLevel}
            onChange={handleFieldChange('detailLevel')}
            placeholder="Ej: pave delicado, piedra central grande, textura trenzada, cierre invisible"
          />
        </label>
      </div>

      <label className="prompt-field prompt-field-block">
        <span>Descripcion libre</span>
        <textarea
          className="prompt-textarea"
          placeholder="Ej: Quiero una joya femenina y refinada, con presencia elegante pero util para uso real. Me interesa que se vea artesanal, premium y fotografiada como una pieza de alta joyeria."
          value={form.prompt}
          onChange={handleFieldChange('prompt')}
        />
      </label>

      <div className="prompt-brief-preview">
        <h3>Resumen creativo</h3>
        <p>{creativeSummary || 'Completa algunos campos para construir un brief mas fuerte.'}</p>
      </div>

      <div className="prompt-hints">
        <p>Consejo: para joyeria premium suelen funcionar mejor frases como "proporcion refinada", "engaste limpio", "brillo controlado" y "pieza viable para produccion real".</p>
      </div>

      <button type="button" className="generate-button" onClick={handleGenerate} disabled={isLoading || !registrant}>
        {isLoading ? 'Generando render...' : registrant ? 'Generar Render con IA' : 'Registrate para generar'}
      </button>

      <div className="generated-image-container">
        {isLoading && <div className="loader"></div>}
        {error && !isLoading && <p className="error-text">{error}</p>}

        {generatedImage && !isLoading && (
          <div className="generated-result fade-in">
            <img src={`data:image/png;base64,${generatedImage}`} alt="Joya generada por IA" />
            <p className="result-text">Aqui esta la propuesta visual generada para esta idea.</p>

            <div className="refinement-toolbar">
              {refinementPresets.map((preset) => (
                <button key={preset.label} type="button" className="refinement-chip" onClick={() => handleRefine(preset)}>
                  {preset.label}
                </button>
              ))}
            </div>

            {generatedPromptUsed && (
              <div className="prompt-engine-notes">
                <h3>Direccion visual aplicada</h3>
                <p>{generatedPromptUsed}</p>
              </div>
            )}

            <button type="button" className="quote-button" onClick={() => setIsModalOpen(true)}>
              Solicitar Cotizacion de este Diseno
            </button>

            {isAuthenticated ? (
              <button type="button" className="quote-button quote-button-secondary" onClick={handleSaveDesign} disabled={isSavingDesign}>
                {isSavingDesign ? 'Guardando...' : 'Guardar en Mi Cuenta'}
              </button>
            ) : (
              <Link to="/cuenta" className="quote-inline-button">
                Inicia sesion para guardar
              </Link>
            )}

            {saveMessage ? <p className="success-text">{saveMessage}</p> : null}
            {saveError ? <p className="error-text">{saveError}</p> : null}
          </div>
        )}
      </div>

      {isModalOpen && (
        <ShareModal
          onClose={() => setIsModalOpen(false)}
          apiBaseUrl={API_BASE_URL}
          briefSummary={creativeSummary}
          promptUsed={generatedPromptUsed || creativeSummary}
          category={form.category}
          metal={form.metal}
          gemstone={form.gemstone}
          style={form.style}
          occasion={form.occasion}
          reference={sourceReference}
          designName={sourceProductName}
          hasGeneratedPreview={Boolean(generatedImage)}
          registrant={registrant}
        />
      )}
    </div>
  );
};

export default PromptDesigner;
