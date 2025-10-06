// Archivo: frontend/src/components/common/Header.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/_header.scss'; // Asegúrate de que este archivo de estilos exista

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo" onClick={closeMenu}>
          <img src="/logo-atelier.png" alt="El Atelier Artesanal Logo" />
        </Link>

        {/* --- Menú para Escritorio --- */}
        <nav className="header-nav desktop-nav">
          <ul>
            <li><Link to="/" className="nav-link">Inicio</Link></li>
            <li><Link to="/atelier" className="nav-link">El Atelier</Link></li>
            {/* --- ENLACE CORREGIDO --- */}
            <li><Link to="/colecciones/anillos" className="nav-link">Colecciones</Link></li>
          </ul>
        </nav>
        
        <Link to="/configurador" className="header-cta desktop-nav">
          Diseña Tu Joya
        </Link>
        {/* --------------------------- */}


        {/* --- Botón de Hamburguesa para Móvil --- */}
        <button className="hamburger-button" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* --- Menú Desplegable para Móvil --- */}
      {menuOpen && (
        <div className="mobile-menu">
          <nav className="mobile-nav-links">
            <Link to="/" className="nav-link" onClick={closeMenu}>Inicio</Link>
            <Link to="/atelier" className="nav-link" onClick={closeMenu}>El Atelier</Link>
            {/* --- ENLACE CORREGIDO --- */}
            <Link to="/colecciones/anillos" className="nav-link" onClick={closeMenu}>Colecciones</Link>
            <Link to="/configurador" className="nav-link special-link" onClick={closeMenu}>
              Diseña Tu Joya
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;