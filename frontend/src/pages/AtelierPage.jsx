// Archivo: frontend/src/pages/AtelierPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/_atelierpage.scss';

const AtelierPage = () => {
  return (
    <div className="atelier-page fade-in-section">
      <div className="atelier-container">
        <h1 className="atelier-title">El Corazón del Artesano</h1>
        
        <div className="atelier-content">
          <div className="atelier-text">
            <h2>Nuestra Historia</h2>
            <p>
              El Atelier Artesanal nació del eco de un martillo sobre plata, en el pequeño taller de mi abuelo. Crecí entre el brillo de gemas en bruto y el aroma a metal pulido, aprendiendo que cada joya no es un objeto, sino el guardián de una historia. Esa herencia es el alma de cada pieza que creamos hoy: un tributo a la paciencia, la precisión y la pasión que solo un artesano puede ofrecer.
            </p>
            
            <h2>El Proceso Creativo</h2>
            <p>
              Nuestro trabajo comienza mucho antes de tocar el metal. Comienza con una conversación, una idea, un sueño. Seleccionamos a mano cada gema, sintiendo su historia y potencial. El oro y la plata son moldeados con técnicas que han pasado de generación en generación, pero con una mirada siempre puesta en la perfección. Cada pulido, cada engaste, es un paso en un baile de creación donde la excelencia es la única pareja posible.
            </p>

            <h2>Una Fusión de Tradición y Futuro</h2>
            <p>
              Creemos que la artesanía no debe estar anclada en el pasado. Por eso, hemos abrazado la tecnología no como un reemplazo, sino como un puente. Nuestro diseñador de IA es el intérprete de tus sueños; una herramienta que traduce la imaginación más abstracta en un diseño tangible que luego nuestras manos expertas transforman en una joya eterna. Es la perfecta simbiosis entre el alma del arte y la precisión del futuro.
            </p>
          </div>
          
          <div className="atelier-image">
            <img src="/fondo-atelier.jpg" alt="El artesano en el taller de El Atelier Artesanal" />
          </div>
        </div>

        {/* --- SECCIÓN DE VALORES --- */}
        <div className="atelier-values">
          <div className="value-card">
            <div className="value-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <h3>Artesanía Pura</h3>
            <p>Técnicas tradicionales aplicadas con maestría para crear piezas con alma.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h3>Materiales Nobles</h3>
            <p>Solo utilizamos metales y gemas de la más alta calidad, obtenidas de forma responsable.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <h3>Diseño sin Límites</h3>
            <p>Fusionamos la tradición con la IA para hacer realidad cualquier idea que puedas imaginar.</p>
          </div>
        </div>

        {/* --- SECCIÓN DE LLAMADA A LA ACCIÓN --- */}
        <div className="cta-section">
          <h2 className="cta-title">Donde el Oro<br/>Toma la Forma de tus Sueños</h2>
          <p className="cta-subtitle">
            ¿Listo para empezar? Da el primer paso para crear una joya única que cuente tu historia.
          </p>
          <Link to="/configurador" className="cta-button">
            Empezar a Diseñar
          </Link>
        </div>

      </div>
    </div>
  );
};

export default AtelierPage;