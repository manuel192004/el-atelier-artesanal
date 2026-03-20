import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/_atelierpage.scss';
import AtelierConversionSection from '../components/common/AtelierConversionSection';
import PageMeta from '../components/common/PageMeta';

const AtelierPage = () => {
  return (
    <div className="atelier-page fade-in-section">
      <PageMeta
        title="El Atelier | Historia, proceso y artesania de El Atelier Artesanal"
        description="Conoce la historia, el proceso creativo y la fusion entre artesania y tecnologia que define a El Atelier Artesanal."
        path="/atelier"
        image="/fondo-atelier.jpg"
      />
      <div className="atelier-container">
        <h1 className="atelier-title">El Corazon del Artesano</h1>

        <div className="atelier-content">
          <div className="atelier-text">
            <h2>Nuestra Historia</h2>
            <p>
              El Atelier Artesanal nacio del eco de un martillo sobre plata, en el pequeno
              taller de mi abuelo. Creci entre el brillo de gemas en bruto y el aroma a
              metal pulido, aprendiendo que cada joya no es un objeto, sino el guardian de
              una historia.
            </p>

            <h2>El Proceso Creativo</h2>
            <p>
              Nuestro trabajo comienza mucho antes de tocar el metal. Comienza con una
              conversacion, una idea, un sueno. Seleccionamos a mano cada gema, sintiendo
              su historia y potencial. El oro y la plata son moldeados con tecnicas que han
              pasado de generacion en generacion.
            </p>

            <h2>Una Fusion de Tradicion y Futuro</h2>
            <p>
              Creemos que la artesania no debe estar anclada en el pasado. Por eso, hemos
              abrazado la tecnologia no como un reemplazo, sino como un puente. Nuestro
              disenador de IA es el interprete de tus suenos.
            </p>
          </div>

          <div className="atelier-image">
            <img src="/fondo-atelier.jpg" alt="El artesano en el taller de El Atelier Artesanal" loading="lazy" decoding="async" />
          </div>
        </div>

        <div className="atelier-values">
          <div className="value-card">
            <div className="value-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <h3>Artesania Pura</h3>
            <p>Tecnicas tradicionales aplicadas con maestria para crear piezas con alma.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h3>Materiales Nobles</h3>
            <p>Solo utilizamos metales y gemas de alta calidad, obtenidas de forma responsable.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <h3>Diseno sin Limites</h3>
            <p>Fusionamos la tradicion con la IA para hacer realidad cualquier idea.</p>
          </div>
        </div>

        <div className="cta-section">
          <h2 className="cta-title">Donde el Oro<br />Toma la Forma de tus Suenos</h2>
          <p className="cta-subtitle">
            Si ya conectaste con la historia del atelier, el siguiente paso puede ser catalogo, personalizacion o una
            conversacion corta para definir mejor la pieza.
          </p>
          <div className="cta-button-row">
            <Link to="/colecciones" className="cta-button cta-button-secondary">
              Ver Colecciones
            </Link>
            <Link to="/configurador" className="cta-button">
              Empezar a Disenar
            </Link>
          </div>
        </div>

        <AtelierConversionSection
          className="atelier-conversion-section"
          kicker="Atencion mas personal"
          title="Cuando la pieza tiene peso emocional, conviene hablarla bien"
          copy="Compromisos, aniversarios, regalos simbolicos o ideas aun borrosas suelen resolverse mejor con una conversacion corta que ordene referencias, materiales y siguiente paso."
          highlights={['Asesoria para piezas simbolicas', 'Lectura de materiales y acabados', 'Seguimiento humano del atelier']}
          primaryAction={{ label: 'Ir al configurador', to: '/configurador' }}
          secondaryAction={{
            label: 'Agendar por WhatsApp',
            href: 'https://wa.me/573156347878?text=Hola,%20quiero%20una%20asesoria%20con%20El%20Atelier%20Artesanal.',
            external: true,
          }}
          formTitle="Pide una cita para hablar tu idea"
          formCopy="Deja tu preferencia y retomamos contigo con una conversacion mas enfocada en ocasion, estilo y viabilidad real."
          defaultReason="Asesoria sobre una joya personalizada"
          source="atelier-page"
        />
      </div>
    </div>
  );
};

export default AtelierPage;
