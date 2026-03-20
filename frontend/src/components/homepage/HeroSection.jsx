import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/_hero-section.scss';

const HeroSection = () => {
  return (
    <section className="hero-section">
      <img src="/hero-background.png" alt="Fondo de taller de joyeria" className="hero-background" />
      <div className="hero-content">
        <span className="hero-kicker">Alta joyeria personalizada</span>
        <h1>Joyas con presencia real, detalles legibles y una experiencia mas guiada.</h1>
        <p>
          Descubre colecciones, crea una pieza a medida y ahora tambien agenda una cita directa con el atelier
          desde la web.
        </p>
        <div className="hero-actions">
          <Link to="/colecciones" className="hero-button">
            Quiero Comprar
          </Link>
          <Link to="/configurador" className="hero-button">
            Quiero Personalizar
          </Link>
          <a href="#contacto-home" className="hero-button hero-button-secondary">
            Quiero Agendar Cita
          </a>
        </div>
        <div className="hero-highlights">
          <span>Citas directas</span>
          <span>Asesoria guiada</span>
          <span>Diseno personalizado</span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
