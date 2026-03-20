import React from 'react';
import { Link } from 'react-router-dom';
import './../../styles/_footer.scss';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section footer-brand">
          <h3 className="footer-title">El Atelier Artesanal</h3>
          <p>Alta joyeria hecha a mano en el corazon de Sucre.</p>

          <div className="footer-socials">
            <a href="https://www.instagram.com/elatelierartesanal?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://wa.me/qr/JXM3LVGEI75HC1" target="_blank" rel="noopener noreferrer" title="WhatsApp">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </a>
            <a href="https://www.facebook.com/elatelierartesanal/about" target="_blank" rel="noopener noreferrer" title="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0.01-1.5 1.5-1.5H18V2h-3.5C10.04 2 9 4.03 9 6.5V9.5H6v4h3v8h5v-8z"></path></svg>
            </a>
          </div>
        </div>

        <div className="footer-section footer-links">
          <h3 className="footer-title">Navegacion</h3>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/atelier">El Taller</Link></li>
            <li><Link to="/colecciones">Colecciones</Link></li>
            <li><Link to="/configurador">Disena tu Joya</Link></li>
            <li><Link to="/cuenta">Mi Cuenta</Link></li>
          </ul>
        </div>

        <div className="footer-section footer-contact">
          <h3 className="footer-title">Contacto</h3>
          <p>Listo para crear tu pieza unica?</p>
          <p><strong>Email:</strong> sebassolorzano2004@gmail.com</p>
          <p><strong>Ubicacion:</strong> Sincelejo, Sucre, Colombia</p>
          <p><strong>Horario:</strong> Lunes a sabado, 9:00 a.m. a 6:00 p.m.</p>
          <div className="footer-cta-group">
            <a href="https://wa.me/573156347878?text=Hola,%20quiero%20una%20asesoria%20con%20El%20Atelier%20Artesanal." target="_blank" rel="noopener noreferrer" className="footer-cta-link">
              Agendar por WhatsApp
            </a>
            <Link to="/configurador" className="footer-cta-link footer-cta-link-secondary">
              Personalizar una joya
            </Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} El Atelier Artesanal. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
