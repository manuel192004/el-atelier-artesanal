// Archivo: frontend/src/pages/AtelierPage.jsx

import React from 'react';
import './../styles/_atelierpage.scss';

const AtelierPage = () => {
  return (
    <div className="atelier-page">
      <section className="atelier-hero">
        <div className="container">
          <h1 className="atelier-title">El Corazón del Artesano</h1>
          <p className="atelier-subtitle">
            Cada joya es un pacto entre el metal, el fuego y la pasión. En nuestro taller en Sincelejo, no solo forjamos oro; damos forma a historias y creamos legados.
          </p>
        </div>
      </section>

      <section className="atelier-process">
        <div className="container">
          <h2 className="section-title">Nuestro Proceso</h2>
          <div className="process-grid">
            <div className="process-step">
              <h3>1. El Diseño</h3>
              <p>Todo comienza contigo. Escuchamos tu visión y la plasmamos en un boceto que captura la esencia de tu idea, combinando tradición con estética moderna.</p>
            </div>
            <div className="process-step">
              <h3>2. La Forja</h3>
              <p>Seleccionamos solo oro de la más alta calidad. Manos expertas lo funden, martillan y moldean, respetando las técnicas ancestrales de la orfebrería colombiana.</p>
            </div>
            <div className="process-step">
              <h3>3. El Engaste</h3>
              <p>Con precisión milimétrica, cada gema es cuidadosamente posicionada y asegurada en su lugar, garantizando no solo su belleza, sino también su permanencia.</p>
            </div>
            <div className="process-step">
              <h3>4. El Pulido Final</h3>
              <p>La etapa final donde la pieza revela todo su esplendor. Un pulido meticuloso asegura que tu joya brille desde cada ángulo, lista para ser parte de tu vida.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AtelierPage;