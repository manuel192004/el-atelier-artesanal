import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import '../styles/_operationspage.scss';

const initialContactForm = {
  fullName: '',
  email: '',
  whatsapp: '',
  city: '',
  tags: 'lead',
  notes: '',
};

const initialTransactionForm = {
  transactionType: 'sale',
  amount: '',
  currency: 'COP',
  description: '',
  category: '',
};

const initialTaskForm = {
  title: '',
  owner: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  notes: '',
};

const initialLinkForm = {
  label: '',
  url: '',
  description: '',
  category: '',
};

const initialOperationsLoginForm = {
  email: '',
  password: '',
};

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return 'Sin fecha';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function MetricCard({ label, value, tone = 'neutral', helper = '' }) {
  return (
    <article className={`ops-metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
    </article>
  );
}

function DataList({ title, eyebrow, items, renderItem, emptyLabel }) {
  return (
    <section className="ops-panel">
      <div className="ops-panel-head">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {items.length ? (
        <div className="ops-list">{items.map(renderItem)}</div>
      ) : (
        <p className="ops-empty">{emptyLabel}</p>
      )}
    </section>
  );
}

function ConnectorCard({ title, description, accent, bullets }) {
  return (
    <article className="ops-connector-card" data-accent={accent}>
      <span>{title}</span>
      <p>{description}</p>
      <ul>
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </article>
  );
}

function OperationsPage() {
  const { login, user, isAuthenticated, isBootstrapping } = useAuth();

  const isAdmin = user?.role === 'admin';

  // Token operativo (para Make / operaciones)
  const [operationsToken, setOperationsToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('orvianeOperationsToken') || '';
  });
  const [tokenDraft, setTokenDraft] = useState(operationsToken);

  const handleTokenSubmit = (event) => {
    event.preventDefault();
    const nextToken = tokenDraft.trim();
    setOperationsToken(nextToken);
    if (typeof window !== 'undefined') {
      if (nextToken) {
        window.localStorage.setItem('orvianeOperationsToken', nextToken);
      } else {
        window.localStorage.removeItem('orvianeOperationsToken');
      }
    }
    loadDashboard(nextToken);
  };

  const handleTokenClear = () => {
    setTokenDraft('');
    setOperationsToken('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('orvianeOperationsToken');
    }
    loadDashboard('');
  };

  const buildOperationsHeaders = (token) => {
    return token ? { 'x-orviane-operations-token': token } : {};
  };
  const [dashboard, setDashboard] = useState({
    ready: false,
    summary: {
      contacts: 0,
      transactions: 0,
      sales: 0,
      expenses: 0,
      balance: 0,
      tasks: 0,
      overdueTasks: 0,
      events: 0,
    },
    recentContacts: [],
    recentTransactions: [],
    recentTasks: [],
    recentEvents: [],
    linktreeLinks: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [contactForm, setContactForm] = useState(initialContactForm);
  const [transactionForm, setTransactionForm] = useState(initialTransactionForm);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [linkForm, setLinkForm] = useState(initialLinkForm);
  const [activeAction, setActiveAction] = useState('');

  // Estado para el login de administrador
  const [operationsLoginForm, setOperationsLoginForm] = useState(initialOperationsLoginForm);
  const [operationsLoginError, setOperationsLoginError] = useState('');
  const [operationsLoginSuccess, setOperationsLoginSuccess] = useState('');

  const handleOperationsLoginChange = (field) => (event) => {
    setOperationsLoginForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleOperationsLoginSubmit = async (event) => {
    event.preventDefault();
    setOperationsLoginError('');
    setOperationsLoginSuccess('');

    try {
      await login(operationsLoginForm);
      setOperationsLoginSuccess('Sesión iniciada correctamente.');
    } catch (loginError) {
      setOperationsLoginError(loginError.message || 'No se pudo iniciar sesión.');
    }
  };

  const loadDashboard = async (token = operationsToken) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await apiFetch('/api/operations/dashboard', {
        headers: buildOperationsHeaders(token),
      });
      setDashboard(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Do not auto-load on mount without token to avoid errors
  }, []);

  const handleSubmit = (kind, formState, resetForm) => async (event) => {
    event.preventDefault();
    setActiveAction(kind);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/api/operations/ingest', {
        method: 'POST',
        headers: buildOperationsHeaders(operationsToken),
        body: {
          kind,
          data: formState,
        },
      });

      setMessage(`${response.kind === 'event' ? 'Evento' : response.kind} guardado correctamente.`);
      resetForm();
      await loadDashboard();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setActiveAction('');
    }
  };

  const activeLinks = dashboard.linktreeLinks;

  // ==================== AUTH GATE ====================
  if (isBootstrapping) {
    return (
      <div className="operations-page">
        <PageMeta title="Centro Operativo | Orviane" path="/operaciones" noIndex />
        <section className="ops-hero fade-in-section">
          <div className="ops-hero-copy">
            <h1>Verificando acceso...</h1>
          </div>
        </section>
      </div>
    );
  }

  // Si no está logueado como administrador → mostrar pantalla de login limpia
  if (!isAdmin) {
    return (
      <div className="operations-page">
        <PageMeta
          title="Acceso Restringido | Orviane"
          description="Inicio de sesión requerido para el centro operativo."
          path="/operaciones"
          noIndex
        />

        <div style={{ maxWidth: '420px', margin: '80px auto', padding: '0 20px' }}>
          <div className="ops-panel" style={{ padding: '2rem' }}>
            <div className="ops-panel-head" style={{ marginBottom: '1.5rem' }}>
              <div>
                <span style={{ color: '#c9a227' }}>Acceso Privado</span>
                <h2>Centro Operativo</h2>
              </div>
            </div>

            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Ingresa con tu cuenta de administrador para continuar.
            </p>

            <form onSubmit={handleOperationsLoginSubmit}>
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Correo electrónico</span>
                <input
                  type="email"
                  value={operationsLoginForm.email}
                  onChange={handleOperationsLoginChange('email')}
                  placeholder="operaciones@orviane.com"
                  required
                  style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '1.5rem' }}>
                <span style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Contraseña</span>
                <input
                  type="password"
                  value={operationsLoginForm.password}
                  onChange={handleOperationsLoginChange('password')}
                  required
                  style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                />
              </label>

              {operationsLoginError && (
                <p style={{ color: '#c33', marginBottom: '1rem', fontSize: '0.9rem' }}>{operationsLoginError}</p>
              )}
              {operationsLoginSuccess && (
                <p style={{ color: '#2a7', marginBottom: '1rem', fontSize: '0.9rem' }}>{operationsLoginSuccess}</p>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#111',
                  color: 'white',
                  border: 'none',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                Iniciar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==================== CONTENIDO PRINCIPAL (solo admins) ====================
  return (
    <div className="operations-page">
      <PageMeta
        title="Centro Operativo | Orviane"
        description="Panel interno para CRM, ventas, gastos, tareas y ventana Linktree."
        path="/operaciones"
        image="/logo-orviane.png"
        noIndex
      />

      <section className="ops-hero fade-in-section">
        <div className="ops-hero-copy">
          <span className="ops-eyebrow">Operaciones</span>
          <h1>Un solo centro para leads, ventas, gastos y seguimiento.</h1>
          <p>
            Esta capa esta pensada para que <strong>Make</strong> alimente una base unica y, desde ahi, podamos
            coordinar CRM, WhatsApp, ERP, Trello, Power BI y Linktree sin duplicar procesos.
          </p>
          <div className="ops-hero-actions">
            <a className="ops-primary-button" href="https://wa.me/573156347878?text=Hola,%20quiero%20activar%20el%20flujo%20operativo%20de%20Orviane." target="_blank" rel="noreferrer">
              Activar WhatsApp
            </a>
            <a className="ops-secondary-button" href="/linktree">
              Ver Linktree publico
            </a>
          </div>
        </div>

        <div className="ops-hero-summary">
          <span>Estado general</span>
          <strong>{dashboard.ready ? 'Base conectada' : 'Modo demostracion'}</strong>
          <p>{dashboard.ready ? 'Los webhooks ya pueden escribir en PostgreSQL.' : 'La API responde, pero la base no esta lista todavia.'}</p>
          <div className="ops-summary-pills">
            <span>Make</span>
            <span>CRM</span>
            <span>ERP</span>
            <span>Trello</span>
            <span>Power BI</span>
          </div>
        </div>
      </section>

      {/* Token operativo - simple mode (no login required) */}
      <section className="ops-token-panel" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleTokenSubmit}>
          <label>
            <span>Token operativo</span>
            <input
              type="password"
              value={tokenDraft}
              onChange={(event) => setTokenDraft(event.target.value)}
              placeholder="Pega aquí el token largo de operaciones"
            />
          </label>
          <div className="ops-token-actions">
            <button type="submit">Aplicar</button>
            <button type="button" onClick={handleTokenClear}>Quitar</button>
          </div>
        </form>
      </section>

      {isLoading ? <p className="ops-status">Cargando panel...</p> : null}
      {error ? <p className="ops-status is-error">{error}</p> : null}
      {message ? <p className="ops-status is-success">{message}</p> : null}

      <section className="ops-metrics-grid">
        <MetricCard label="Contactos" value={dashboard.summary.contacts} tone="gold" helper="Leads y clientes detectados." />
        <MetricCard label="Ventas" value={formatCurrency(dashboard.summary.sales)} tone="green" helper="Ingreso bruto acumulado." />
        <MetricCard label="Gastos" value={formatCurrency(dashboard.summary.expenses)} tone="red" helper="Salidas registradas." />
        <MetricCard label="Balance" value={formatCurrency(dashboard.summary.balance)} tone="blue" helper="Saldo neto calculado." />
        <MetricCard label="Tareas" value={dashboard.summary.tasks} tone="neutral" helper="Agenda y responsabilidades." />
        <MetricCard label="Atrasadas" value={dashboard.summary.overdueTasks} tone="amber" helper="Puntos que necesitan seguimiento." />
      </section>

      <section className="ops-layout">
        <div className="ops-column">
          <section className="ops-panel">
            <div className="ops-panel-head">
              <div>
                <span>Entrada rapida</span>
                <h2>Captura datos desde Make o manualmente</h2>
              </div>
            </div>

            <div className="ops-form-grid">
              <form className="ops-form-card" onSubmit={handleSubmit('contact', contactForm, () => setContactForm(initialContactForm))}>
                <h3>Cliente o lead</h3>
                <label>
                  <span>Nombre</span>
                  <input value={contactForm.fullName} onChange={(event) => setContactForm((current) => ({ ...current, fullName: event.target.value }))} required />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} required />
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input value={contactForm.whatsapp} onChange={(event) => setContactForm((current) => ({ ...current, whatsapp: event.target.value }))} required />
                </label>
                <label>
                  <span>Ciudad</span>
                  <input value={contactForm.city} onChange={(event) => setContactForm((current) => ({ ...current, city: event.target.value }))} />
                </label>
                <label>
                  <span>Etiquetas</span>
                  <input value={contactForm.tags} onChange={(event) => setContactForm((current) => ({ ...current, tags: event.target.value }))} />
                </label>
                <label>
                  <span>Notas</span>
                  <textarea rows="3" value={contactForm.notes} onChange={(event) => setContactForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <button type="submit" disabled={activeAction === 'contact'}>
                  {activeAction === 'contact' ? 'Guardando...' : 'Guardar cliente'}
                </button>
              </form>

              <form className="ops-form-card" onSubmit={handleSubmit('transaction', transactionForm, () => setTransactionForm(initialTransactionForm))}>
                <h3>Venta o gasto</h3>
                <label>
                  <span>Tipo</span>
                  <select value={transactionForm.transactionType} onChange={(event) => setTransactionForm((current) => ({ ...current, transactionType: event.target.value }))}>
                    <option value="sale">Venta</option>
                    <option value="expense">Gasto</option>
                    <option value="refund">Reembolso</option>
                  </select>
                </label>
                <label>
                  <span>Monto</span>
                  <input type="number" min="0" step="1" value={transactionForm.amount} onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))} required />
                </label>
                <label>
                  <span>Moneda</span>
                  <input value={transactionForm.currency} onChange={(event) => setTransactionForm((current) => ({ ...current, currency: event.target.value }))} />
                </label>
                <label>
                  <span>Categoria</span>
                  <input value={transactionForm.category} onChange={(event) => setTransactionForm((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label>
                  <span>Descripcion</span>
                  <textarea rows="4" value={transactionForm.description} onChange={(event) => setTransactionForm((current) => ({ ...current, description: event.target.value }))} required />
                </label>
                <button type="submit" disabled={activeAction === 'transaction'}>
                  {activeAction === 'transaction' ? 'Guardando...' : 'Registrar movimiento'}
                </button>
              </form>

              <form className="ops-form-card" onSubmit={handleSubmit('task', taskForm, () => setTaskForm(initialTaskForm))}>
                <h3>Tarea operativa</h3>
                <label>
                  <span>Titulo</span>
                  <input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} required />
                </label>
                <label>
                  <span>Responsable</span>
                  <input value={taskForm.owner} onChange={(event) => setTaskForm((current) => ({ ...current, owner: event.target.value }))} />
                </label>
                <label>
                  <span>Estado</span>
                  <select value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value }))}>
                    <option value="todo">Por hacer</option>
                    <option value="doing">En proceso</option>
                    <option value="done">Hecho</option>
                  </select>
                </label>
                <label>
                  <span>Prioridad</span>
                  <select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </label>
                <label>
                  <span>Fecha limite</span>
                  <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
                </label>
                <label>
                  <span>Notas</span>
                  <textarea rows="3" value={taskForm.notes} onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <button type="submit" disabled={activeAction === 'task'}>
                  {activeAction === 'task' ? 'Guardando...' : 'Crear tarea'}
                </button>
              </form>

              <form className="ops-form-card" onSubmit={handleSubmit('linktree', linkForm, () => setLinkForm(initialLinkForm))}>
                <h3>Linktree</h3>
                <label>
                  <span>Etiqueta</span>
                  <input value={linkForm.label} onChange={(event) => setLinkForm((current) => ({ ...current, label: event.target.value }))} required />
                </label>
                <label>
                  <span>URL</span>
                  <input value={linkForm.url} onChange={(event) => setLinkForm((current) => ({ ...current, url: event.target.value }))} required />
                </label>
                <label>
                  <span>Categoria</span>
                  <input value={linkForm.category} onChange={(event) => setLinkForm((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label>
                  <span>Descripcion</span>
                  <textarea rows="3" value={linkForm.description} onChange={(event) => setLinkForm((current) => ({ ...current, description: event.target.value }))} />
                </label>
                <button type="submit" disabled={activeAction === 'linktree'}>
                  {activeAction === 'linktree' ? 'Guardando...' : 'Publicar link'}
                </button>
              </form>
            </div>
          </section>

          <section className="ops-panel">
            <div className="ops-panel-head">
              <div>
                <span>Flujo recomendado</span>
                <h2>Como deberia moverse la informacion</h2>
              </div>
            </div>

            <div className="ops-connector-grid">
              <ConnectorCard
                title="Make"
                accent="gold"
                description="Recibe webhooks y decide si crear cliente, venta, gasto, tarea o link."
                bullets={['Webhook unico', 'Manda a Postgres', 'Dispara notificaciones']}
              />
              <ConnectorCard
                title="WhatsApp"
                accent="green"
                description="Canal de cierre y seguimiento para clientes con respuestas rapidas."
                bullets={['Avisos automáticos', 'Seguimiento humano', 'Confirmación de citas']}
              />
              <ConnectorCard
                title="ERP"
                accent="blue"
                description="Aqui se reflejan las transacciones que luego alimentan el balance."
                bullets={['Ventas', 'Gastos', 'Resumen financiero']}
              />
              <ConnectorCard
                title="Trello"
                accent="amber"
                description="Tareas y responsables, ideal para producción, entregas y soporte."
                bullets={['Pendientes', 'Prioridades', 'Fechas límite']}
              />
              <ConnectorCard
                title="Power BI"
                accent="violet"
                description="Visualiza margen, conversion y flujo operativo con el balance final."
                bullets={['Dashboards', 'KPI', 'Tendencias']}
              />
              <ConnectorCard
                title="Linktree"
                accent="rose"
                description="Ventana publica de acceso rapido para vender desde mobile."
                bullets={['WhatsApp', 'Catálogo', 'Citas']}
              />
            </div>
          </section>
        </div>

        <aside className="ops-column">
          <section className="ops-panel">
            <div className="ops-panel-head">
              <div>
                <span>Linktree publico</span>
                <h2>Ventana de acceso rapido</h2>
              </div>
            </div>

            <div className="ops-linktree-preview">
              {activeLinks.length ? (
                activeLinks.slice(0, 6).map((link) => (
                  <a key={link.linkId} href={link.url} className="ops-linktree-item" target={link.url.startsWith('http') ? '_blank' : '_self'} rel={link.url.startsWith('http') ? 'noreferrer' : undefined}>
                    <strong>{link.label}</strong>
                    <span>{link.description || link.category || 'Acceso rapido'}</span>
                  </a>
                ))
              ) : (
                <p className="ops-empty">Aun no hay enlaces configurados.</p>
              )}
            </div>
          </section>

          <DataList
            eyebrow="Clientes recientes"
            title="Contactos y leads"
            items={dashboard.recentContacts}
            emptyLabel="Todavia no hay clientes recientes."
            renderItem={(item) => (
              <article key={item.contactId} className="ops-item-card">
                <div>
                  <strong>{item.fullName}</strong>
                  <span>{item.email || item.whatsapp}</span>
                </div>
                <p>{[item.status, item.city, item.tags].filter(Boolean).join(' • ') || 'Sin detalle adicional'}</p>
              </article>
            )}
          />

          <DataList
            eyebrow="Movimientos"
            title="Ventas y gastos"
            items={dashboard.recentTransactions}
            emptyLabel="Sin transacciones registradas."
            renderItem={(item) => (
              <article key={item.transactionId} className="ops-item-card">
                <div>
                  <strong>{item.description || item.category || item.transactionType}</strong>
                  <span>{formatDate(item.occurredAt)}</span>
                </div>
                <p>
                  {item.transactionType} • {formatCurrency(item.amount)} • {item.currency}
                </p>
              </article>
            )}
          />

          <DataList
            eyebrow="Tareas"
            title="Responsabilidades"
            items={dashboard.recentTasks}
            emptyLabel="No hay tareas activas."
            renderItem={(item) => (
              <article key={item.taskId} className="ops-item-card">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.owner || 'Sin responsable'}</span>
                </div>
                <p>
                  {item.status} • {item.priority}
                  {item.dueDate ? ` • ${formatDate(item.dueDate)}` : ''}
                </p>
              </article>
            )}
          />

          <DataList
            eyebrow="Actividad"
            title="Bitacora automatica"
            items={dashboard.recentEvents}
            emptyLabel="Aun no llegan eventos de automatizacion."
            renderItem={(item) => (
              <article key={item.eventId} className="ops-item-card">
                <div>
                  <strong>{item.eventType}</strong>
                  <span>{item.pipeline}</span>
                </div>
                <p>{formatDate(item.createdAt)}</p>
              </article>
            )}
          />
        </aside>
      </section>
    </div>
  );
}

export default OperationsPage;
