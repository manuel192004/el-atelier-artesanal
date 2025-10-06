// Archivo: frontend/src/components/home/HeroSection.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/_hero-section.scss';

const HeroSection = () => {
  return (
    <section className="hero-section">
      <img src="/hero-background.png" alt="Fondo de taller de joyería" className="hero-background" />
      <div className="hero-content">
        
        {/* --- Texto eliminado --- */}
        
        <Link to="/configurador" className="hero-button">
          Empezar a Diseñar
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;