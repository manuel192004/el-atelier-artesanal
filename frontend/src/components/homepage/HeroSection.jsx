import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/_hero-section.scss';

const HeroSection = () => {
  return (
    <section className="hero-section">
      <img src="/orviane-home-hero.png" alt="Escena editorial de alta joyeria Orviane" className="hero-background" />
      <div className="hero-content">
        <span className="hero-kicker">Alta joyeria personalizada</span>
        <h1>Orviane</h1>
        <p className="hero-statement">
          Joyas a medida, colecciones listas y asesoria directa para elegir con criterio, no por impulso.
        </p>
        <div className="hero-actions">
          <Link to="/colecciones" className="hero-button">
            Ver colecciones
          </Link>
          <Link to="/configurador" className="hero-button">
            Crear una pieza
          </Link>
          <a href="#contacto-home" className="hero-button hero-button-secondary">
            Agendar asesoria
          </a>
        </div>
        <div className="hero-route-strip" aria-label="Rutas principales">
          <Link to="/colecciones">
            <span>01</span>
            <strong>Comprar con referencia real</strong>
          </Link>
          <Link to="/configurador">
            <span>02</span>
            <strong>Personalizar con brief visual</strong>
          </Link>
          <a href="#contacto-home">
            <span>03</span>
            <strong>Resolver por WhatsApp o cita</strong>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
