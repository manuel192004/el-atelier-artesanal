// Archivo: frontend/src/pages/HomePage.jsx (Versión Corregida y Final)

import React from 'react';
import './../styles/_homepage.scss';

const HomePage = () => {
  return (
    <div className="home-layout">
      {/* --- COLUMNA IZQUIERDA: HERO (sin cambios) --- */}
      <div className="hero-column">
        <div className="hero-content">
          <h1 className="hero-headline">Donde el oro toma la forma de tus sueños.</h1>
          <p className="hero-subheadline">
            Diseña una joya única que cuente tu historia. Creada a mano, solo para ti.
          </p>
          <a href="/configurador" className="hero-cta">
            Empezar a Diseñar
          </a>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: COLECCIONES (VERSIÓN CORREGIDA) --- */}
      <div className="collections-column">
        {/* Cada tarjeta es un enlace '<a>' y tiene un div '.collection-bg' adentro */}
        <a href="/colecciones/anillos" className="collection-card">
          <div className="collection-bg" style={{ backgroundImage: `url(/anillos.jpg)` }}></div>
          <h3>Anillos de Compromiso</h3>
        </a>
        <a href="/colecciones/collares" className="collection-card">
          <div className="collection-bg" style={{ backgroundImage: `url(/collares.jpg)` }}></div>
          <h3>Cadenas y Collares</h3>
        </a>
        <a href="/colecciones/unicas" className="collection-card">
          <div className="collection-bg" style={{ backgroundImage: `url(/unicas.jpg)` }}></div>
          <h3>Piezas Únicas</h3>
        </a>
      </div>
    </div>
  );
};

export default HomePage;