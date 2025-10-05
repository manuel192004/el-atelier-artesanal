// Archivo: frontend/src/components/common/Header.jsx (Versión Final)

import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Importamos Link para una navegación rápida

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Función para cerrar el menú al hacer clic en un enlace
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo" onClick={closeMenu}>
          {/* Usamos una ruta directa a la carpeta 'public' */}
          <img src="/logo-atelier.png" alt="El Atelier Artesanal Logo" />
        </Link>

        {/* --- Menú para Escritorio --- */}
        <nav className="header-nav desktop-nav">
          <ul>
            <li><Link to="/" className="nav-link">Inicio</Link></li>
            <li><Link to="/atelier" className="nav-link">El Atelier</Link></li>
            <li><Link to="/#collections" className="nav-link">Colecciones</Link></li>
          </ul>
        </nav>
        
        <Link to="/configurador" className="header-cta desktop-nav">
          Diseña Tu Joya
        </Link>
        {/* --------------------------- */}


        {/* --- Botón de Hamburguesa para Móvil --- */}
        <button className="hamburger-button" onClick={() => setMenuOpen(!menuOpen)}>
          {/* Cambia el ícono si el menú está abierto o cerrado */}
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* --- Menú Desplegable para Móvil --- */}
      {menuOpen && (
        <div className="mobile-menu">
          <nav className="mobile-nav-links">
            <Link to="/" className="nav-link" onClick={closeMenu}>Inicio</Link>
            <Link to="/atelier" className="nav-link" onClick={closeMenu}>El Atelier</Link>
            <Link to="/#collections" className="nav-link" onClick={closeMenu}>Colecciones</Link>
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