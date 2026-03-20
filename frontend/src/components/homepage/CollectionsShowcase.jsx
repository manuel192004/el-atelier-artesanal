import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/_collections-showcase.scss';

const CollectionsShowcase = () => {
  return (
    <section id="collections" className="collections-showcase">
      <div className="container">
        <h2 className="section-title">Nuestras Colecciones</h2>
        <p className="section-subtitle">
          Cada pieza es una historia. Explora nuestras colecciones insignia o inspirate para crear la tuya.
        </p>
        <div className="collections-grid">
          <Link to="/colecciones/anillos" className="collection-card">
            <img src="/anillos-catalogo.png" alt="Coleccion de Anillos de Compromiso" className="collection-image" />
            <div className="collection-overlay">
              <h3>Anillos</h3>
              <p>Piezas para compromiso, aniversario y simbolos con mas presencia.</p>
            </div>
          </Link>

          <Link to="/colecciones/cadenas" className="collection-card">
            <img src="/cadenas-catalogo.png" alt="Coleccion de Cadenas y Collares" className="collection-image" />
            <div className="collection-overlay">
              <h3>Cadenas</h3>
              <p>Opciones elegantes para uso diario, capas y regalos refinados.</p>
            </div>
          </Link>

          <Link to="/colecciones/pulseras" className="collection-card">
            <img src="/pulseras-catalogo.png" alt="Coleccion de Pulseras" className="collection-image" />
            <div className="collection-overlay">
              <h3>Pulseras</h3>
              <p>Propuestas con gesto artesanal para regalo o acento protagonista.</p>
            </div>
          </Link>

          <Link to="/colecciones/aretes" className="collection-card">
            <img src="/aretes-hero.png" alt="Coleccion de Aretes" className="collection-image" />
            <div className="collection-overlay">
              <h3>Aretes</h3>
              <p>Detalles que iluminan el rostro con lectura clara y brillo controlado.</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CollectionsShowcase;
