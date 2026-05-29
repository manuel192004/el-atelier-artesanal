import React from 'react';
import { Link } from 'react-router-dom';

const clientRoutes = [
  {
    title: 'Comprar una referencia',
    copy: 'Explora piezas reales, elige una familia y llega a WhatsApp con referencia y contexto.',
    ctaLabel: 'Ver colecciones',
    to: '/colecciones',
  },
  {
    title: 'Crear desde una idea',
    copy: 'Convierte ocasion, estilo y materiales en un brief visual antes de cotizar la pieza.',
    ctaLabel: 'Abrir configurador',
    to: '/configurador',
  },
  {
    title: 'Resolver con asesoria',
    copy: 'Para regalos importantes, compromiso o dudas de presupuesto, conviene una guia directa.',
    ctaLabel: 'Agendar por WhatsApp',
    href: 'https://wa.me/573156347878?text=Hola,%20quiero%20agendar%20una%20asesoria%20con%20Orviane.',
  },
];

const commercialPolicies = [
  {
    title: 'Garantia y Ajustes',
    text: 'Acompanamiento despues de la entrega con orientacion de cuidado y ajustes segun la pieza.',
    points: ['Cuidado de la joya', 'Seguimiento directo'],
  },
  {
    title: 'Tiempos Claros',
    text: 'Cada solicitud se lee segun ocasion, complejidad y ruta de compra para evitar promesas vagas.',
    points: ['Prioridad por ocasion', 'Ruta viable'],
  },
  {
    title: 'Envios y Entrega',
    text: 'Entrega coordinada y comunicacion directa para que el cliente sepa que sigue.',
    points: ['Entrega local', 'Orientacion de envio'],
  },
  {
    title: 'Cotizacion Personal',
    text: 'Primero entendemos ocasion, materiales y nivel de detalle; luego se define la mejor ruta.',
    points: ['Presupuesto con contexto', 'Lectura de materiales'],
  },
];

const materialNotes = [
  {
    title: 'Metales Nobles',
    text: 'Trabajamos propuestas en oro amarillo, oro blanco, bicolor y lineas con lectura premium que respetan la pieza final y su presencia real.',
    note: 'Segun la pieza, el metal cambia peso visual, temperatura y presencia.',
  },
  {
    title: 'Acabados y Brillo',
    text: 'El pulido, la textura, el peso visual y la proporcion se cuidan para que la joya se vea refinada tanto en fotografia como en uso real.',
    note: 'El acabado no es un detalle menor: define si la pieza se siente fina o comun.',
  },
  {
    title: 'Piedras y Acentos',
    text: 'Diamantes, perlas y acentos brillantes se integran con criterio de alta joyeria, evitando excesos y buscando una lectura mas elegante.',
    note: 'La idea no es recargar, sino dar el acento correcto con mejor lectura de lujo.',
  },
];

const orbiaStories = [
  {
    occasion: 'Compromiso',
    client: 'Decision simbolica',
    piece: 'Anillo con intencion clara',
    text: 'Cuando la pieza comunica promesa, conviene revisar proporciones, metal y brillo con mas cuidado.',
    image: '/anillos/anillos-01-solitario-oro-amarillo.png',
  },
  {
    occasion: 'Aniversario',
    client: 'Regalo de permanencia',
    piece: 'Cadena o pulsera con uso real',
    text: 'Una joya que se usa muchas veces necesita equilibrio entre presencia, comodidad y significado.',
    image: '/cadenas/cadenas-09-cadena-delicada.png',
  },
  {
    occasion: 'Regalo Especial',
    client: 'Acierto rapido',
    piece: 'Aretes y detalles faciles de elegir',
    text: 'Para regalo, una recomendacion guiada reduce dudas de estilo, tamano y ocasion.',
    image: '/aretes/aretes-03-gotas-colgantes.png',
  },
];

const trustPills = [
  'Atencion por WhatsApp o cita',
  'Cotizacion con contexto',
  'Personalizacion guiada',
  'Seguimiento posterior',
];

const faqItems = [
  {
    question: 'Como funciona el proceso si quiero una joya personalizada?',
    answer:
      'Puedes empezar desde el configurador para aterrizar estilo, materiales y ocasion, o pasar directo a una asesoria cuando la pieza requiere una decision mas importante.',
  },
  {
    question: 'Puedo cotizar una pieza del catalogo y luego pedir cambios?',
    answer:
      'Si. El catalogo sirve como punto de partida visual, y desde ahi se pueden revisar variaciones de metal, acabado, proporciones o nivel de detalle segun la idea del cliente.',
  },
  {
    question: 'Que me conviene mas: ver catalogo o agendar cita?',
    answer:
      'Si buscas una compra mas directa, conviene empezar por colecciones. Si es una pieza simbolica, un presupuesto alto o una idea aun difusa, suele rendir mejor agendar asesoria.',
  },
  {
    question: 'Trabajan envios y seguimiento despues de la compra?',
    answer:
      'Si. La coordinacion de entrega y el seguimiento posterior se manejan de forma directa para resolver dudas de cuidado, tiempos, ajustes o siguiente paso del proceso.',
  },
];

const contactSignals = [
  { label: 'WhatsApp', value: '+57 315 634 7878' },
  { label: 'Ubicacion', value: 'Sincelejo, Sucre, Colombia' },
  { label: 'Horario', value: 'Lunes a sabado, 9:00 a.m. a 6:00 p.m.' },
  { label: 'Atencion', value: 'Cita previa o seguimiento por WhatsApp' },
];

const HomeCommercialSections = () => {
  return (
    <>
      <section className="home-section home-routes-section">
        <div className="home-shell">
          <div className="home-section-heading">
            <span className="home-section-kicker">Rutas claras</span>
            <h2 className="section-title">Tres caminos, una decision mas facil</h2>
            <p className="section-subtitle">
              La experiencia te deja entrar por compra, personalizacion o asesoria sin obligarte a registrarte primero.
            </p>
          </div>

          <div className="home-route-grid">
            {clientRoutes.map((route) => (
              <article key={route.title} className="home-route-card">
                <h3>{route.title}</h3>
                <p>{route.copy}</p>
                {route.to ? (
                  <Link to={route.to} className="home-primary-cta">
                    {route.ctaLabel}
                  </Link>
                ) : (
                  <a href={route.href} target="_blank" rel="noreferrer" className="home-primary-cta">
                    {route.ctaLabel}
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-trust-section">
        <div className="home-shell">
          <div className="home-section-heading">
            <span className="home-section-kicker">Confianza Comercial</span>
            <h2 className="section-title">Lo esencial para comprar con mas seguridad</h2>
            <p className="section-subtitle">
              Menos ruido comercial y mas senales utiles: tiempos, entrega, seguimiento y cotizacion con contexto.
            </p>
          </div>

          <div className="home-policy-grid">
            {commercialPolicies.map((policy) => (
              <article key={policy.title} className="home-info-card">
                <h3>{policy.title}</h3>
                <p>{policy.text}</p>
                <div className="home-inline-pills">
                  {policy.points.map((point) => (
                    <span key={point}>{point}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-materials-section">
        <div className="home-shell home-two-column">
          <div className="home-copy-panel">
            <span className="home-section-kicker">Materiales y Acabados</span>
            <h2 className="section-title">La diferencia esta en proporciones, textura y brillo</h2>
            <p className="section-subtitle">
              Orviane no vende solo material: ayuda a leer como se vera la pieza en foto, mano y uso real.
            </p>
          </div>

          <div className="home-material-grid">
            {materialNotes.map((item) => (
              <article key={item.title} className="home-info-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <strong className="home-note-highlight">{item.note}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-stories-section">
        <div className="home-shell">
          <div className="home-section-heading">
            <span className="home-section-kicker">Compra por ocasion</span>
            <h2 className="section-title">Recomendaciones pensadas para el momento correcto</h2>
            <p className="section-subtitle">
              La pieza cambia cuando cambia la intencion: compromiso, aniversario, regalo o uso diario.
            </p>
          </div>

          <div className="home-story-grid">
            {orbiaStories.map((story) => (
              <article key={story.occasion} className="home-story-card">
                <div className="home-story-image-wrap">
                  <img src={story.image} alt={story.piece} className="home-story-image" />
                </div>
                <div className="home-story-copy">
                  <span>{story.occasion}</span>
                  <strong>{story.client}</strong>
                  <h3>{story.piece}</h3>
                  <p>{story.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="home-inline-pills home-inline-pills-center">
            {trustPills.map((pill) => (
              <span key={pill}>{pill}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-faq-section">
        <div className="home-shell home-two-column">
          <div className="home-copy-panel">
            <span className="home-section-kicker">Preguntas Frecuentes</span>
            <h2 className="section-title">Respuestas utiles antes de escribir</h2>
            <p className="section-subtitle">
              Aclara el siguiente paso antes de pasar a WhatsApp, catalogo o configurador.
            </p>
          </div>

          <div className="home-faq-list">
            {faqItems.map((item) => (
              <details key={item.question} className="home-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto-home" className="home-section home-contact-section">
        <div className="home-shell home-contact-card">
          <div className="home-contact-copy">
            <span className="home-section-kicker">Contacto Visible</span>
            <h2 className="section-title">Habla con Orviane por la via que te resulte mas natural</h2>
            <p className="section-subtitle">
              Si ya sabes lo que buscas, podemos ir directo a catalogo o configurador. Si necesitas contexto, mejor
              pasar por una conversacion corta.
            </p>
          </div>

          <div className="home-contact-signals">
            {contactSignals.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="home-contact-actions">
            <a
              href="https://wa.me/573156347878?text=Hola,%20quiero%20una%20asesoria%20con%20Orviane."
              target="_blank"
              rel="noreferrer"
              className="home-primary-cta"
            >
              Escribir por WhatsApp
            </a>
            <Link to="/colecciones" className="home-secondary-cta">
              Ver Catalogo
            </Link>
            <Link to="/configurador" className="home-secondary-cta">
              Ir al Configurador
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomeCommercialSections;
