import React from 'react';
import { Link } from 'react-router-dom';

const clientRoutes = [
  {
    title: 'Quiero Comprar',
    copy: 'Entra al catalogo, compara familias, guarda favoritos y pasa a cotizacion con una referencia clara.',
    ctaLabel: 'Explorar Catalogo',
    to: '/colecciones',
  },
  {
    title: 'Quiero Personalizar',
    copy: 'Construye una propuesta a medida con el configurador y llega a la conversacion con un brief mucho mas preciso.',
    ctaLabel: 'Disenar Mi Joya',
    to: '/configurador',
  },
  {
    title: 'Quiero Agendar Cita',
    copy: 'Si necesitas una decision importante o una pieza especial, te conviene pasar por asesoria directa del atelier.',
    ctaLabel: 'Hablar por WhatsApp',
    href: 'https://wa.me/573156347878?text=Hola,%20quiero%20agendar%20una%20asesoria%20con%20El%20Atelier%20Artesanal.',
  },
];

const commercialPolicies = [
  {
    title: 'Garantia y Ajustes',
    text: 'Acompanamos el proceso posterior a la entrega con ajustes razonables, recomendaciones de cuidado y seguimiento directo segun el tipo de pieza.',
    points: ['Ajustes razonables segun la pieza', 'Orientacion de cuidado y uso', 'Seguimiento directo despues de entrega'],
  },
  {
    title: 'Tiempos Claros',
    text: 'Cada propuesta se cotiza con una lectura mas realista de elaboracion, para que el cliente sepa si conviene una ruta inmediata o un desarrollo mas fino.',
    points: ['Lectura realista de elaboracion', 'Priorizacion segun ocasion', 'Evita promesas vagas o genericas'],
  },
  {
    title: 'Envios y Entrega',
    text: 'Coordinamos entrega local y orientacion sobre envio segun destino, con una comunicacion mas humana y menos impersonal que una tienda generica.',
    points: ['Entrega coordinada de forma directa', 'Orientacion de envio segun destino', 'Acompanamiento antes y despues de recibir'],
  },
  {
    title: 'Cotizacion Personal',
    text: 'No empujamos una tarifa cerrada sin contexto. Primero entendemos ocasion, materiales, nivel de detalle y viabilidad de la pieza.',
    points: ['Presupuesto con contexto real', 'Lectura de materiales y detalle', 'Ruta clara entre catalogo, cita o personalizacion'],
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

const atelierStories = [
  {
    occasion: 'Compromiso',
    client: 'Historia preparada para testimonio real',
    piece: 'Solitario en oro con lectura emocional',
    text: 'Espacio editorial pensado para mostrar nombre, ocasion y foto final de una clienta real cuando nos compartas el testimonio autorizado.',
    image: '/anillos/anillos-01-solitario-oro-amarillo.png',
  },
  {
    occasion: 'Aniversario',
    client: 'Caso frecuente del atelier',
    piece: 'Cadena o pieza con narrativa de permanencia',
    text: 'Mientras reunimos testimonios publicados, mostramos el tipo de historia que mejor conversa con regalos de aniversario y piezas con mas permanencia.',
    image: '/cadenas/cadenas-09-cadena-delicada.png',
  },
  {
    occasion: 'Regalo Especial',
    client: 'Espacio listo para foto de pieza',
    piece: 'Aretes y pulseras faciles de acertar',
    text: 'Este bloque ya queda listo para cargar testimonios con nombre y foto real de pieza sin rehacer el diseno cuando nos pases ese material.',
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
            <h2 className="section-title">Elige el camino que mejor encaja con tu momento</h2>
            <p className="section-subtitle">
              La web no deberia obligarte a adivinar el siguiente paso. Aqui puedes entrar por compra, personalizacion
              o asesoria directa.
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
            <h2 className="section-title">Lo que hace que la experiencia se sienta seria y bien cuidada</h2>
            <p className="section-subtitle">
              Queremos que el cliente perciba claridad, acompanamiento y criterio desde el primer vistazo, no solo una
              galeria bonita.
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
            <h2 className="section-title">Una lectura mas premium de metales, textura y presencia</h2>
            <p className="section-subtitle">
              No se trata solo de listar materiales, sino de explicar por que una pieza se siente refinada, viable y
              bien resuelta.
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
            <span className="home-section-kicker">Historias y Ocasiones</span>
            <h2 className="section-title">Un bloque editorial listo para testimonios reales y piezas destacadas</h2>
            <p className="section-subtitle">
              No voy a inventar testimonios. Por eso dejamos esta seccion preparada con la estructura profesional para
              cargar nombre, ocasion y foto real de pieza apenas nos compartas ese material.
            </p>
          </div>

          <div className="home-story-grid">
            {atelierStories.map((story) => (
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
            <h2 className="section-title">Respuestas mas utiles, menos genericas</h2>
            <p className="section-subtitle">
              Esta base reduce friccion antes de escribir por WhatsApp o pasar a una cita.
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
            <h2 className="section-title">Habla con el atelier por la via que te resulte mas natural</h2>
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
              href="https://wa.me/573156347878?text=Hola,%20quiero%20una%20asesoria%20con%20El%20Atelier%20Artesanal."
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
