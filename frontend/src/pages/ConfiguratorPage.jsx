import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './../styles/_configuratorpage.scss';
import PromptDesigner from '../components/configurator/PromptDesigner';
import AtelierConversionSection from '../components/common/AtelierConversionSection';
import PageMeta from '../components/common/PageMeta';

const ConfiguratorPage = () => {
  const location = useLocation();
  const conversionRef = useRef(null);
  const sourceProductName = location.state?.productName || '';
  const sourceReference = location.state?.reference || '';
  const focusConversion = Boolean(location.state?.focusConversion);
  const journeyTitle = useMemo(() => {
    if (!sourceProductName) {
      return 'Pasa de idea a propuesta con una ruta mas clara.';
    }

    return `Estas trabajando sobre ${sourceProductName}.`;
  }, [sourceProductName]);

  const journeyCopy = useMemo(() => {
    if (!sourceProductName) {
      return 'Primero afina la idea en el configurador y luego, si quieres, baja a cita para aterrizar materiales, tiempos y presupuesto.';
    }

    return `${sourceProductName}${sourceReference ? ` (${sourceReference})` : ''} ya llega como punto de partida. Puedes personalizarlo y luego pasar directo a una cita guiada.`;
  }, [sourceProductName, sourceReference]);

  useEffect(() => {
    if (!focusConversion || !conversionRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      conversionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [focusConversion]);

  return (
    <div className="configurator-page-ia">
      <PageMeta
        title="Disenador de Joyas | Configurador personalizado de El Atelier Artesanal"
        description="Construye una propuesta visual de joya personalizada con categoria, materiales, estilo y ocasion dentro del configurador de El Atelier Artesanal."
        path="/configurador"
        image="/hero-background1.jpg"
      />
      <div className="configurator-main-panel">
        <div className="configurator-hero-card">
          <span className="configurator-kicker">Diseno guiado</span>
          <h1 className="configurator-title">Disenador Asistido por IA</h1>
          <p className="configurator-intro">
            Construye una propuesta visual mas clara a partir de categoria, materiales, estilo, ocasion y un brief libre.
            Luego puedes guardar el render o solicitar cotizacion.
          </p>
          <div className="configurator-journey-card">
            <span className="configurator-journey-kicker">Ruta sugerida</span>
            <strong>{journeyTitle}</strong>
            <p>{journeyCopy}</p>
            <div className="configurator-journey-steps">
              <span>1. Ajusta la pieza</span>
              <span>2. Guarda o cotiza</span>
              <span>3. Agenda si quieres acompanamiento</span>
            </div>
            <button
              type="button"
              className="configurator-journey-link"
              onClick={() => conversionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Ir a cita guiada
            </button>
          </div>
        </div>
        <PromptDesigner
          initialPrompt={location.state?.initialPrompt || ''}
          sourceReference={sourceReference}
          sourceProductName={sourceProductName}
        />

        <div ref={conversionRef}>
          <AtelierConversionSection
            className="configurator-conversion-section"
          kicker="Prefieres una ruta asistida"
          title="Si el configurador te ayuda a imaginar, la cita ayuda a decidir mejor"
          copy="Puedes seguir generando propuestas visuales por tu cuenta o dejar una solicitud para que el atelier revise contigo materiales, tiempos y nivel de personalizacion."
          highlights={['Brief mas claro', 'Cotizacion con contexto', 'Paso natural de render a asesoria']}
          primaryAction={{
            label: 'Hablar por WhatsApp',
            href: 'https://wa.me/573156347878?text=Hola,%20quiero%20asesoria%20sobre%20una%20joya%20personalizada.',
            external: true,
          }}
          secondaryAction={{ label: 'Ver colecciones', to: '/colecciones' }}
            formTitle="Agenda una revision de tu idea"
            formCopy="Ideal si ya generaste una direccion visual y quieres aterrizar presupuesto, ocasion o acabados con alguien del atelier."
            defaultReason={sourceProductName ? `Revision de ${sourceProductName}${sourceReference ? ` (${sourceReference})` : ''}` : 'Revision de una joya personalizada'}
            source={sourceReference ? `configurator-${sourceReference}` : 'configurator-page'}
          />
        </div>
      </div>
    </div>
  );
};

export default ConfiguratorPage;
