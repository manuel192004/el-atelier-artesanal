// Archivo: frontend/src/components/homepage/CollectionsShowcase.jsx

import React from 'react';
import './../../styles/_collections-showcase.scss';

const CollectionsShowcase = () => {
  return (
    <section className="collections-showcase">
      <div className="container">
        <h2 className="section-title">Nuestras Colecciones</h2>
        <p className="section-subtitle">
          Cada pieza es una historia. Explora nuestras colecciones insignias o inspírate para crear la tuya.
        </p>
        <div className="collections-grid">
          <div className="collection-card">
            <div className="collection-image-placeholder"></div>
            <h3>Anillos de Compromiso</h3>
          </div>
          <div className="collection-card">
            <div className="collection-image-placeholder"></div>
            <h3>Cadenas y Collares</h3>
          </div>
          <div className="collection-card">
            <div className="collection-image-placeholder"></div>
            <h3>Piezas Únicas</h3>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollectionsShowcase;