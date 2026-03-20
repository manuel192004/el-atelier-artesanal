import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import '../styles/_accountpage.scss';
import AtelierConversionSection from '../components/common/AtelierConversionSection';
import PageMeta from '../components/common/PageMeta';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const createRegisterState = () => ({
  fullName: '',
  email: '',
  whatsapp: '',
  password: '',
});

const createLoginState = () => ({
  email: '',
  password: '',
});

const emptyOverview = {
  profile: null,
  favorites: [],
  cart: [],
  savedDesigns: [],
  generations: [],
  quotes: [],
  appointments: [],
  activeProjects: [],
  stats: {
    favorites: 0,
    cart: 0,
    savedDesigns: 0,
    generations: 0,
    quotes: 0,
    appointments: 0,
    activeProjects: 0,
  },
};

function firstName(name) {
  return String(name || '').trim().split(' ')[0] || 'Atelier';
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const rawValue = String(value).trim();
  const dateOnlyMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const utcMidnightMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/);

  if (dateOnlyMatch || utcMidnightMatch) {
    const [, year, month, day] = dateOnlyMatch || utcMidnightMatch;
    const safeDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));

    return safeDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  return new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getQuoteStatusMeta(status) {
  if (status === 'approved') {
    return { label: 'Aprobada', tone: 'success' };
  }

  if (status === 'in_review') {
    return { label: 'En revision', tone: 'warning' };
  }

  return { label: 'Recibida', tone: 'neutral' };
}

function getAppointmentStatusMeta(status) {
  if (status === 'confirmed') {
    return { label: 'Confirmada', tone: 'success' };
  }

  if (status === 'cancelled') {
    return { label: 'Cancelada', tone: 'danger' };
  }

  return { label: 'Pendiente de confirmar', tone: 'warning' };
}

function buildWhatsappHref(message) {
  return `https://wa.me/573156347878?text=${encodeURIComponent(message)}`;
}

function StatCard({ value, label }) {
  return (
    <div className="account-stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ title, copy, ctaLabel, to }) {
  return (
    <div className="account-empty-state">
      <h3>{title}</h3>
      <p>{copy}</p>
      {ctaLabel && to ? (
        <Link to={to} className="account-inline-link">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <section className="account-section-card">
      <div className="account-section-head">
        <h2>{title}</h2>
        {action || null}
      </div>
      {children}
    </section>
  );
}

function StatusChip({ label, tone }) {
  return <span className={`account-chip account-chip-${tone}`}>{label}</span>;
}

function getProjectSectionMeta(kind) {
  if (kind === 'quote') {
    return {
      label: 'Cotizacion',
      tone: 'warning',
    };
  }

  return {
    label: 'Diseno guardado',
    tone: 'neutral',
  };
}

const AccountPage = () => {
  const {
    token,
    user,
    isAuthenticated,
    isBootstrapping,
    register,
    login,
    loginWithGoogleCredential,
    logout,
  } = useAuth();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(createLoginState());
  const [registerForm, setRegisterForm] = useState(createRegisterState());
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overview, setOverview] = useState(emptyOverview);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoadingKey, setActionLoadingKey] = useState('');
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setOverview(emptyOverview);
      return;
    }

    let cancelled = false;
    setIsLoadingOverview(true);
    setOverviewError('');

    apiFetch('/api/account/overview', { token })
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setOverviewError(error.message || 'No se pudo cargar tu cuenta.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOverview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isAuthenticated || !GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      return;
    }

    let isMounted = true;
    let retries = 0;

    const renderGoogleButton = () => {
      if (!isMounted || !window.google?.accounts?.id) {
        return false;
      }

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            setAuthError('Google no devolvio una credencial valida.');
            return;
          }

          setAuthError('');
          setAuthSuccess('');
          setIsSubmitting(true);

          try {
            await loginWithGoogleCredential(response.credential);
            setAuthSuccess('Acceso con Google listo.');
          } catch (error) {
            console.error(error);
            setAuthError(error.message || 'No se pudo iniciar sesion con Google.');
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });

      return true;
    };

    const intervalId = window.setInterval(() => {
      retries += 1;
      if (renderGoogleButton() || retries > 20) {
        window.clearInterval(intervalId);
      }
    }, 300);

    renderGoogleButton();

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, loginWithGoogleCredential]);

  const reloadOverview = async () => {
    if (!token) {
      return;
    }

    const data = await apiFetch('/api/account/overview', { token });
    setOverview(data);
  };

  const handleLoginChange = (field) => (event) => {
    setLoginForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleRegisterChange = (field) => (event) => {
    setRegisterForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(loginForm);
        setAuthSuccess('Sesion iniciada correctamente.');
      } else {
        await register(registerForm);
        setAuthSuccess('Cuenta creada correctamente.');
      }
    } catch (error) {
      console.error(error);
      setAuthError(error.message || 'No fue posible completar el acceso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemDelete = async (path, loadingKey, successMessage) => {
    setActionLoadingKey(loadingKey);
    setActionError('');
    setActionMessage('');

    try {
      await apiFetch(path, {
        method: 'DELETE',
        token,
      });
      await reloadOverview();
      setActionMessage(successMessage);
    } catch (error) {
      console.error(error);
      setActionError(error.message || 'No se pudo completar la accion.');
    } finally {
      setActionLoadingKey('');
    }
  };

  if (isBootstrapping) {
    return (
      <div className="account-page">
        <div className="account-shell">
          <p className="account-loading-copy">Cargando tu cuenta del atelier...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="account-page">
        <PageMeta
          title="Mi Cuenta | Registro, acceso y seguimiento en El Atelier Artesanal"
          description="Crea tu cuenta, inicia sesion con email o Google y guarda favoritos, disenos, citas y cotizaciones en El Atelier Artesanal."
          path="/cuenta"
          image="/logo-atelier.png"
        />
        <div className="account-shell">
          <div className="account-auth-shell">
            <div className="account-auth-copy">
              <span className="account-eyebrow">Area de cliente</span>
              <h1>Guarda favoritos, canasta y disenos personalizados.</h1>
              <p>
                Desde tu cuenta puedes volver a ver tus creaciones, reunir piezas que te gustaron, construir una
                canasta de cotizacion y seguir el historial de solicitudes del atelier.
              </p>

              <div className="account-feature-list">
                <span>Favoritos del catalogo</span>
                <span>Canasta para cotizar</span>
                <span>Disenos generados guardados</span>
                <span>Historial de solicitudes</span>
              </div>
            </div>

            <div className="account-auth-card">
              <div className="account-auth-switch">
                <button
                  type="button"
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                >
                  Iniciar sesion
                </button>
                <button
                  type="button"
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => setMode('register')}
                >
                  Crear cuenta
                </button>
              </div>

              <form className="account-auth-form" onSubmit={handleSubmit}>
                {mode === 'register' ? (
                  <>
                    <label className="account-field">
                      <span>Nombre completo</span>
                      <input
                        type="text"
                        value={registerForm.fullName}
                        onChange={handleRegisterChange('fullName')}
                        placeholder="Como quieres que te atendamos"
                        required
                      />
                    </label>

                    <label className="account-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={handleRegisterChange('email')}
                        placeholder="tuemail@ejemplo.com"
                        required
                      />
                    </label>

                    <label className="account-field">
                      <span>WhatsApp</span>
                      <input
                        type="text"
                        value={registerForm.whatsapp}
                        onChange={handleRegisterChange('whatsapp')}
                        inputMode="tel"
                        placeholder="+57 300 000 0000"
                        required
                      />
                    </label>

                    <label className="account-field">
                      <span>Contrasena</span>
                      <input
                        type="password"
                        value={registerForm.password}
                        onChange={handleRegisterChange('password')}
                        placeholder="Minimo 6 caracteres"
                        required
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="account-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={handleLoginChange('email')}
                        placeholder="tuemail@ejemplo.com"
                        required
                      />
                    </label>

                    <label className="account-field">
                      <span>Contrasena</span>
                      <input
                        type="password"
                        value={loginForm.password}
                        onChange={handleLoginChange('password')}
                        placeholder="Tu contrasena"
                        required
                      />
                    </label>
                  </>
                )}

                {authError ? <p className="account-error">{authError}</p> : null}
                {authSuccess ? <p className="account-success">{authSuccess}</p> : null}

                <button type="submit" className="account-primary-button" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Procesando...'
                    : mode === 'login'
                      ? 'Entrar a mi cuenta'
                      : 'Crear mi cuenta'}
                </button>
              </form>

              <div className="account-divider">
                <span>o entra con Google</span>
              </div>

              {GOOGLE_CLIENT_ID ? (
                <div className="account-google-button" ref={googleButtonRef}></div>
              ) : (
                <p className="account-helper-copy">
                  Falta pegar tu OAuth client id web de Google en <code>frontend/.env</code> como <code>VITE_GOOGLE_CLIENT_ID</code> y en <code>backend/.env</code> como <code>GOOGLE_CLIENT_ID</code>.
                </p>
              )}
            </div>
          </div>

          <AtelierConversionSection
            className="account-conversion-section"
            kicker="Prefieres hablar primero"
            title="Tambien puedes entrar al atelier sin crear cuenta de inmediato"
            copy="Si todavia estas comparando opciones o quieres una compra mas asistida, puedes pedir una cita corta y retomar el registro despues, ya con una ruta mas clara."
            highlights={['Cuenta para guardar favoritos', 'Cita para orientar la decision', 'WhatsApp directo si prefieres rapidez']}
            primaryAction={{
              label: 'Hablar por WhatsApp',
              href: 'https://wa.me/573156347878?text=Hola,%20quiero%20una%20asesoria%20con%20El%20Atelier%20Artesanal.',
              external: true,
            }}
            secondaryAction={{ label: 'Ver colecciones', to: '/colecciones' }}
            formTitle="Solicita una cita antes de registrarte"
            formCopy="Si aun no estas listo para abrir cuenta, deja tu solicitud y te ayudamos a decidir que camino seguir."
            defaultReason="Asesoria previa antes de crear cuenta"
            source="account-auth"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <PageMeta
        title="Mi Cuenta | Area de cliente de El Atelier Artesanal"
        description="Revisa favoritos, canasta, disenos guardados, citas y cotizaciones desde tu area de cliente de El Atelier Artesanal."
        path="/cuenta"
        image="/logo-atelier.png"
      />
      <div className="account-shell">
        <section className="account-hero">
          <div>
            <span className="account-eyebrow">Mi cuenta</span>
            <h1>Hola, {firstName(user.fullName)}.</h1>
            <p>
              Desde aqui puedes revisar tus gustos, armar tu canasta de cotizacion, volver a ver disenos guardados
              y seguir el rastro de tus solicitudes con el atelier.
            </p>
          </div>

          <div className="account-hero-actions">
            <Link to="/colecciones" className="account-secondary-button">
              Explorar colecciones
            </Link>
            <Link to="/configurador" className="account-primary-button">
              Disenar otra joya
            </Link>
            <button type="button" className="account-ghost-button" onClick={logout}>
              Cerrar sesion
            </button>
          </div>
        </section>

        {isLoadingOverview ? <p className="account-loading-copy">Cargando tus datos...</p> : null}
        {overviewError ? <p className="account-error">{overviewError}</p> : null}
        {actionError ? <p className="account-error">{actionError}</p> : null}
        {actionMessage ? <p className="account-success">{actionMessage}</p> : null}

        <section className="account-stats-grid">
          <StatCard value={overview.stats.favorites} label="Favoritos" />
          <StatCard value={overview.stats.cart} label="Canasta" />
          <StatCard value={overview.stats.appointments} label="Citas" />
          <StatCard value={overview.stats.activeProjects} label="Propuestas activas" />
          <StatCard value={overview.stats.savedDesigns} label="Disenos guardados" />
          <StatCard value={overview.stats.quotes} label="Cotizaciones" />
        </section>

        <div className="account-layout">
          <SectionCard title="Mi perfil">
            <div className="account-profile-grid">
              <div>
                <span>Nombre</span>
                <strong>{overview.profile?.fullName || user.fullName}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{overview.profile?.email || user.email}</strong>
              </div>
              <div>
                <span>WhatsApp</span>
                <strong>{overview.profile?.whatsapp || 'Pendiente'}</strong>
              </div>
              <div>
                <span>Acceso</span>
                <strong>{user.googleLinked ? 'Email + Google' : 'Email y contrasena'}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Retomar propuestas"
            action={
              <Link to="/configurador" className="account-inline-link">
                Crear una nueva
              </Link>
            }
          >
            {overview.activeProjects.length ? (
              <div className="account-list">
                {overview.activeProjects.map((item) => {
                  const isQuote = item.kind === 'quote';
                  const isSavedDesign = item.kind === 'saved-design';
                  const projectMeta = getProjectSectionMeta(item.kind);
                  const whatsappMessage = isQuote
                    ? `Hola, quiero retomar la cotizacion ${item.reference} de ${item.title}.`
                    : `Hola, quiero retomar una propuesta guardada en mi cuenta: ${item.title}.`;

                  return (
                    <article key={`${item.kind}-${item.key}`} className="account-list-item account-list-item-highlight">
                      <div className="account-list-copy">
                        <strong>{item.title}</strong>
                        <span>{item.reference || item.subtitle}</span>
                        <div className="account-list-meta-row">
                          <StatusChip label={projectMeta.label} tone={projectMeta.tone} />
                          <p className="account-list-meta">Ultimo movimiento: {formatDateTime(item.createdAt)}</p>
                        </div>
                        <p>{item.subtitle}</p>
                      </div>
                      <div className="account-list-actions">
                        <StatusChip
                          label={isQuote ? getQuoteStatusMeta(item.status).label : 'Borrador guardado'}
                          tone={isQuote ? getQuoteStatusMeta(item.status).tone : 'neutral'}
                        />
                        {isSavedDesign ? (
                          <Link
                            to="/configurador"
                            state={{
                              initialPrompt: item.prompt,
                              productName: item.title,
                              reference: item.reference,
                            }}
                            className="account-inline-link"
                          >
                            Retomar en configurador
                          </Link>
                        ) : (
                          <a href={buildWhatsappHref(whatsappMessage)} target="_blank" rel="noreferrer" className="account-inline-link">
                            Continuar por WhatsApp
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Aun no tienes propuestas activas."
                copy="Cuando guardes un render o envies una cotizacion, podras retomarla aqui sin volver a empezar."
                ctaLabel="Ir al configurador"
                to="/configurador"
              />
            )}
          </SectionCard>

          <SectionCard
            title="Citas y asesoria"
            action={
              <a
                href={buildWhatsappHref('Hola, quiero solicitar una cita con El Atelier Artesanal.')}
                target="_blank"
                rel="noreferrer"
                className="account-inline-link"
              >
                Pedir otra cita
              </a>
            }
          >
            {overview.appointments.length ? (
              <div className="account-list">
                {overview.appointments.map((item) => {
                  const statusMeta = getAppointmentStatusMeta(item.status);

                  return (
                    <article key={item.appointmentId} className="account-list-item">
                      <div className="account-list-copy">
                        <strong>{item.reason}</strong>
                        <span>{item.appointmentId}</span>
                        <p className="account-list-meta">
                          Registrada: {formatDateTime(item.createdAt)} | Actualizada: {formatDateTime(item.updatedAt || item.createdAt)}
                        </p>
                        <p>
                          Fecha sugerida: {formatDate(item.preferredDate)} | Horario: {item.preferredSlot}
                        </p>
                        <p>{item.notes || 'Solicitud registrada para asesoria del atelier.'}</p>
                      </div>
                      <div className="account-list-actions">
                        <StatusChip label={statusMeta.label} tone={statusMeta.tone} />
                        <a
                          href={buildWhatsappHref(`Hola, quiero consultar mi cita ${item.appointmentId} para ${item.reason}.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="account-inline-link"
                        >
                          Consultar cita
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Aun no hay citas registradas."
                copy="Cuando pidas una asesoria desde la web o el bot, la veras aqui con su estado."
              />
            )}
          </SectionCard>

          <SectionCard title="Estado de cotizacion">
            {overview.quotes.length ? (
              <div className="account-list">
                {overview.quotes.map((item) => {
                  const statusMeta = getQuoteStatusMeta(item.status);
                  const summaryBits = [item.reference, item.budget, item.timeline].filter(Boolean).join(' | ');

                  return (
                    <article key={item.quoteId} className="account-list-item">
                      <div className="account-list-copy">
                        <strong>{item.designName || item.category || 'Solicitud personalizada'}</strong>
                        <span>{item.quoteId}</span>
                        <p className="account-list-meta">
                          Enviada: {formatDateTime(item.createdAt)} | Actualizada: {formatDateTime(item.updatedAt || item.createdAt)}
                        </p>
                        <p>{summaryBits || item.occasion || 'Cotizacion recibida por el atelier.'}</p>
                        <p>{item.notes || item.prompt}</p>
                      </div>
                      <div className="account-list-actions">
                        <StatusChip label={statusMeta.label} tone={statusMeta.tone} />
                        <a
                          href={buildWhatsappHref(`Hola, quiero revisar el estado de mi cotizacion ${item.quoteId}.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="account-inline-link"
                        >
                          Revisar por WhatsApp
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Aun no hay cotizaciones enviadas."
                copy="Cuando envies una solicitud desde una pieza o desde el configurador, aqui veras su estado."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Favoritos"
            action={
              <Link to="/colecciones" className="account-inline-link">
                Agregar piezas
              </Link>
            }
          >
            {overview.favorites.length ? (
              <div className="account-item-grid">
                {overview.favorites.map((item) => (
                  <article key={item.favoriteId} className="account-piece-card">
                    <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                    <div className="account-piece-copy">
                      <span>{item.reference || item.category}</span>
                      <h3>{item.name}</h3>
                      <p>{item.category}</p>
                      <div className="account-piece-actions">
                        <Link to={`/colecciones/${item.slug || 'anillos'}`} className="account-inline-link">
                          Ver coleccion
                        </Link>
                        <button
                          type="button"
                          className="account-ghost-button"
                          disabled={actionLoadingKey === item.favoriteId}
                          onClick={() =>
                            handleItemDelete(
                              `/api/account/favorites/${item.favoriteId}`,
                              item.favoriteId,
                              'Pieza eliminada de favoritos.',
                            )
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Aun no guardas piezas."
                copy="Explora las colecciones y marca las joyas que quieras revisar luego."
                ctaLabel="Ir a colecciones"
                to="/colecciones"
              />
            )}
          </SectionCard>

          <SectionCard
            title="Canasta de cotizacion"
            action={
              <Link to="/colecciones" className="account-inline-link">
                Seguir agregando
              </Link>
            }
          >
            {overview.cart.length ? (
              <div className="account-list">
                {overview.cart.map((item) => (
                  <article key={item.cartItemId} className="account-list-item">
                    <div className="account-list-copy">
                      <strong>{item.name}</strong>
                      <span>{item.reference || item.category}</span>
                      <p>{item.notes || 'Lista para cotizar con el atelier.'}</p>
                    </div>
                    <div className="account-list-actions">
                      <Link to={`/colecciones/${item.slug || 'anillos'}`} className="account-inline-link">
                        Ver pieza
                      </Link>
                      <button
                        type="button"
                        className="account-ghost-button"
                        disabled={actionLoadingKey === item.cartItemId}
                        onClick={() =>
                          handleItemDelete(
                            `/api/account/cart/${item.cartItemId}`,
                            item.cartItemId,
                            'Pieza eliminada de la canasta.',
                          )
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Tu canasta esta vacia."
                copy="Agrega piezas del catalogo para reunir una cotizacion mas clara."
                ctaLabel="Ver colecciones"
                to="/colecciones"
              />
            )}
          </SectionCard>

          <SectionCard
            title="Mis disenos guardados"
            action={
              <Link to="/configurador" className="account-inline-link">
                Crear otro
              </Link>
            }
          >
            {overview.savedDesigns.length ? (
              <div className="account-item-grid">
                {overview.savedDesigns.map((item) => (
                  <article key={item.designId} className="account-piece-card">
                    <img src={item.imageDataUrl} alt={item.title} loading="lazy" decoding="async" />
                    <div className="account-piece-copy">
                      <span>{formatDate(item.createdAt)}</span>
                      <h3>{item.title}</h3>
                      <p>{item.category || 'Joya personalizada'}</p>
                      <div className="account-piece-actions">
                        <Link
                          to="/configurador"
                          state={{
                            initialPrompt: item.prompt,
                            productName: item.title,
                            reference: item.reference,
                          }}
                          className="account-inline-link"
                        >
                          Volver a editar
                        </Link>
                        <button
                          type="button"
                          className="account-ghost-button"
                          disabled={actionLoadingKey === item.designId}
                          onClick={() =>
                            handleItemDelete(
                              `/api/account/saved-designs/${item.designId}`,
                              item.designId,
                              'Diseno eliminado de tu cuenta.',
                            )
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Aun no guardas renders."
                copy="Genera una joya en el configurador y guardala para volver a ella cuando quieras."
                ctaLabel="Ir al configurador"
                to="/configurador"
              />
            )}
          </SectionCard>

          <SectionCard title="Generaciones recientes">
            {overview.generations.length ? (
              <div className="account-list">
                {overview.generations.map((item) => (
                  <article key={`${item.generatedAt}-${item.promptUsed}`} className="account-list-item">
                    <div className="account-list-copy">
                      <strong>{item.designName || item.category || 'Joya generada'}</strong>
                      <span>{formatDate(item.generatedAt)}</span>
                      <p>{item.prompt || item.promptUsed}</p>
                    </div>
                    <div className="account-list-actions">
                      <span className="account-chip">{item.model}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="Sin generaciones recientes." copy="Tus renders apareceran aqui despues de usar Disena tu Joya." />
            )}
          </SectionCard>
        </div>

        <AtelierConversionSection
          className="account-conversion-section"
          kicker="Siguiente paso"
          title="Tu cuenta ya organiza tus gustos; ahora podemos llevarlos a una conversacion real"
          copy="Usa lo que ya guardaste en favoritos, canasta o disenos como punto de partida para una cita mas productiva con el atelier."
          highlights={['Retomar piezas guardadas', 'Revisar presupuesto con contexto', 'Aterrizar una propuesta mas fina']}
          primaryAction={{ label: 'Seguir en colecciones', to: '/colecciones' }}
          secondaryAction={{ label: 'Volver al configurador', to: '/configurador' }}
          formTitle="Agenda una cita usando tu cuenta como referencia"
          formCopy="Podemos revisar contigo favoritos, renders o solicitudes previas para que la siguiente conversacion ya arranque con base real."
          defaultReason="Asesoria a partir de mi cuenta y mis piezas guardadas"
          source="account-member"
        />
      </div>
    </div>
  );
};

export default AccountPage;
