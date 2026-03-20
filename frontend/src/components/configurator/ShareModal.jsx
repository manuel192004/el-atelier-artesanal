import React, { useState } from 'react';

const ShareModal = ({
  onClose,
  apiBaseUrl,
  briefSummary,
  promptUsed,
  category,
  metal,
  gemstone,
  style,
  occasion,
  reference,
  designName,
  hasGeneratedPreview,
  registrant,
}) => {
  const [form, setForm] = useState({
    clientName: registrant?.fullName || '',
    email: registrant?.email || '',
    whatsapp: registrant?.whatsapp || '',
    preferredContact: 'whatsapp',
    budget: '',
    timeline: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptUsed);
      setIsCopied(true);
    } catch (copyError) {
      console.error(copyError);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/quote-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          registrantId: registrant?.registrantId || '',
          prompt: promptUsed,
          category,
          designName,
          preferredMetal: metal,
          preferredStone: gemstone,
          style,
          occasion,
          reference,
          hasGeneratedPreview,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo registrar la cotizacion.');
      }

      setSuccess(data);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || 'No se pudo registrar la cotizacion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-large" onClick={(event) => event.stopPropagation()}>
        <h2>Solicitar Cotizacion</h2>
        <p className="modal-subtitle">
          Esta solicitud guardara el brief creativo y tus datos para continuar la conversacion por el canal que prefieras.
        </p>

        {!success ? (
          <>
            <div className="quote-brief-card">
              <h3>Resumen del diseno</h3>
              <p>{briefSummary}</p>

              <div className="quote-brief-tags">
                <span>{category}</span>
                <span>{metal}</span>
                <span>{gemstone}</span>
                <span>{style}</span>
                <span>{occasion}</span>
                {reference ? <span>{reference}</span> : null}
              </div>

              <button type="button" className={`quote-inline-button ${isCopied ? 'is-success' : ''}`} onClick={handleCopy}>
                {isCopied ? 'Brief copiado' : 'Copiar brief interno'}
              </button>
            </div>

            <form className="quote-form" onSubmit={handleSubmit}>
              <label className="prompt-field">
                <span>Nombre</span>
                <input type="text" value={form.clientName} onChange={handleChange('clientName')} autoComplete="name" required />
              </label>

              <label className="prompt-field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={handleChange('email')} autoComplete="email" required />
              </label>

              <label className="prompt-field">
                <span>WhatsApp</span>
                <input type="text" value={form.whatsapp} onChange={handleChange('whatsapp')} autoComplete="tel" required />
              </label>

              <label className="prompt-field">
                <span>Canal preferido</span>
                <select value={form.preferredContact} onChange={handleChange('preferredContact')}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </label>

              <label className="prompt-field">
                <span>Presupuesto estimado</span>
                <input type="text" value={form.budget} onChange={handleChange('budget')} placeholder="Ej: entre 1 y 2 millones" />
              </label>

              <label className="prompt-field">
                <span>Tiempo ideal</span>
                <input type="text" value={form.timeline} onChange={handleChange('timeline')} placeholder="Ej: en 3 semanas" />
              </label>

              <label className="prompt-field prompt-field-wide">
                <span>Notas adicionales</span>
                <textarea
                  className="prompt-textarea prompt-textarea-compact"
                  value={form.notes}
                  onChange={handleChange('notes')}
                  placeholder="Medida, tipo de uso, si es un regalo, cambios de color, version mas delicada, etc."
                />
              </label>

              {error && <p className="error-text modal-error">{error}</p>}

              <div className="modal-actions">
                <button type="submit" className="modal-option modal-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>

                <button type="button" className="modal-close-button" onClick={onClose}>
                  Cancelar
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="quote-success">
            <h3>Solicitud registrada</h3>
            <p>{success.message}</p>
            <p className="quote-success-reference">Referencia: {success.quoteId}</p>
            <button type="button" className="modal-option modal-submit" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
