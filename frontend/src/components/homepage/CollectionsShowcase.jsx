// Archivo: frontend/src/components/homepage/CollectionsShowcase.jsx (Corregido)

import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/_collections-showcase.scss';

const CollectionsShowcase = () => {
  return (
    <section id="collections" className="collections-showcase">
      <div className="container">
        <h2 className="section-title">Nuestras Colecciones</h2>
        <p className="section-subtitle">
          Cada pieza es una historia. Explora nuestras colecciones insignias o inspírate para crear la tuya.
        </p>
        <div className="collections-grid">

          {/* --- Tarjeta de Anillos --- */}
          <Link to="/colecciones/anillos" className="collection-card">
            {/* Usamos la imagen que me indicaste */}
            <img src="/anillos.jpg" alt="Colección de Anillos de Compromiso" className="collection-image" />
            <div className="collection-overlay">
              <h3>Anillos</h3>
            </div>
          </Link>

          {/* --- Tarjeta de Collares --- */}
          <Link to="/colecciones/collares" className="collection-card">
            {/* Usamos la imagen que me indicaste */}
            <img src="/collares.jpg" alt="Colección de Cadenas y Collares" className="collection-image" />
            <div className="collection-overlay">
              <h3>Collares</h3>
            </div>
          </Link>

          {/* --- Tarjeta de Piezas Únicas --- */}
          <Link to="/colecciones/unicas" className="collection-card">
            {/* Usamos la imagen que me indicaste */}
            <img src="/unicas.jpg" alt="Colección de Piezas Únicas" className="collection-image" />
            <div className="collection-overlay">
              <h3>Piezas Únicas</h3>
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
};

export default CollectionsShowcase;