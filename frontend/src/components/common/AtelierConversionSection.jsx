import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const defaultSignals = [
  { label: 'WhatsApp', value: '+57 315 634 7878' },
  { label: 'Ubicacion', value: 'Sincelejo, Sucre, Colombia' },
  { label: 'Horario', value: 'Lunes a sabado, 9:00 a.m. a 6:00 p.m.' },
];

const defaultSlots = [
  '9:00 a.m. - 11:00 a.m.',
  '11:00 a.m. - 1:00 p.m.',
  '2:00 p.m. - 4:00 p.m.',
  '4:00 p.m. - 6:00 p.m.',
];

function buildToday() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialForm(user, defaultReason, source) {
  return {
    clientName: user?.fullName || '',
    email: user?.email || '',
    whatsapp: user?.whatsapp || '',
    preferredDate: buildToday(),
    preferredSlot: defaultSlots[1],
    reason: defaultReason,
    notes: '',
    source,
  };
}

function renderAction(action, className) {
  if (!action) {
    return null;
  }

  if (action.to) {
    return (
      <Link to={action.to} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <a href={action.href} target={action.external ? '_blank' : undefined} rel={action.external ? 'noreferrer' : undefined} className={className}>
      {action.label}
    </a>
  );
}

const AtelierConversionSection = ({
  kicker = 'Asesoria Atelier',
  title,
  copy,
  highlights = [],
  signals = defaultSignals,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  formTitle = 'Solicita una cita corta',
  formCopy = 'Comparte tus datos y una preferencia de horario. Nosotros retomamos contigo con mas contexto y menos friccion.',
  defaultReason = 'Asesoria para compra o personalizacion',
  source = 'phase1-conversion',
  className = '',
}) => {
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState(() => buildInitialForm(user, defaultReason, source));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setForm((current) => ({
      ...current,
      clientName: current.clientName || user?.fullName || '',
      email: current.email || user?.email || '',
      whatsapp: current.whatsapp || user?.whatsapp || '',
      reason: current.reason || defaultReason,
      source,
    }));
  }, [defaultReason, source, user]);

  const actions = useMemo(
    () => [primaryAction, secondaryAction, tertiaryAction].filter(Boolean),
    [primaryAction, secondaryAction, tertiaryAction],
  );

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const data = await apiFetch('/api/appointments', {
        method: 'POST',
        body: form,
      });

      setSuccess(`${data.message} Referencia ${data.appointmentId}.`);
      setForm((current) => ({
        ...buildInitialForm(isAuthenticated ? user : null, defaultReason, source),
        notes: '',
        preferredDate: current.preferredDate || buildToday(),
      }));
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || 'No fue posible registrar tu solicitud de cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`conversion-section ${className}`.trim()}>
      <div className="conversion-shell">
        <div className="conversion-copy-card">
          <span className="conversion-kicker">{kicker}</span>
          <h2 className="section-title">{title}</h2>
          <p className="conversion-copy">{copy}</p>

          {highlights.length ? (
            <div className="conversion-highlight-list">
              {highlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}

          <div className="conversion-signal-grid">
            {signals.map((item) => (
              <div key={item.label} className="conversion-signal-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          {actions.length ? (
            <div className="conversion-actions">
              {renderAction(actions[0], 'conversion-primary-cta')}
              {actions.slice(1).map((action) => renderAction(action, 'conversion-secondary-cta'))}
            </div>
          ) : null}
        </div>

        <div className="conversion-form-card">
          <span className="conversion-form-kicker">Agenda sin friccion</span>
          <h3>{formTitle}</h3>
          <p>{formCopy}</p>

          <form className="conversion-form-grid" onSubmit={handleSubmit}>
            <label className="conversion-field">
              <span>Nombre</span>
              <input
                type="text"
                value={form.clientName}
                onChange={handleFieldChange('clientName')}
                autoComplete="name"
                placeholder="Tu nombre completo"
                required
              />
            </label>

            <label className="conversion-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={handleFieldChange('email')}
                autoComplete="email"
                placeholder="tuemail@ejemplo.com"
                required
              />
            </label>

            <label className="conversion-field">
              <span>WhatsApp</span>
              <input
                type="text"
                value={form.whatsapp}
                onChange={handleFieldChange('whatsapp')}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+57 300 000 0000"
                required
              />
            </label>

            <label className="conversion-field">
              <span>Horario</span>
              <select value={form.preferredSlot} onChange={handleFieldChange('preferredSlot')}>
                {defaultSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>

            <label className="conversion-field">
              <span>Fecha sugerida</span>
              <input type="date" min={buildToday()} value={form.preferredDate} onChange={handleFieldChange('preferredDate')} required />
            </label>

            <label className="conversion-field">
              <span>Motivo</span>
              <input
                type="text"
                value={form.reason}
                onChange={handleFieldChange('reason')}
                placeholder="Ej: anillo de compromiso, regalo especial..."
                required
              />
            </label>

            <label className="conversion-field conversion-field-wide">
              <span>Notas</span>
              <textarea
                value={form.notes}
                onChange={handleFieldChange('notes')}
                placeholder="Si ya viste una pieza o tienes un presupuesto aproximado, cuentanoslo aqui."
              />
            </label>

            {error ? <p className="conversion-form-error">{error}</p> : null}
            {success ? <p className="conversion-form-success">{success}</p> : null}

            <div className="conversion-form-actions">
              <button type="submit" className="conversion-primary-cta" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando solicitud...' : 'Solicitar cita'}
              </button>
              <a
                href="https://wa.me/573156347878?text=Hola,%20quiero%20una%20asesoria%20con%20El%20Atelier%20Artesanal."
                target="_blank"
                rel="noreferrer"
                className="conversion-secondary-cta"
              >
                Ir por WhatsApp
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AtelierConversionSection;
