// Archivo: frontend/src/components/configurator/ShareModal.jsx (Versión Simplificada)
import React from 'react';

const ShareModal = ({ onClose }) => {
  // Mensaje genérico para iniciar la conversación
  const message = encodeURIComponent(`¡Hola! Quisiera cotizar un diseño que creé con la IA de su página.`);

  // --- CONFIGURA TUS DATOS AQUÍ ---
  const whatsappNumber = "573001234567"; // Reemplaza con tu número de WhatsApp
  const instagramUser = "elatelierartesanal"; // Reemplaza con tu usuario de Instagram
  const facebookPageName = "elatelierartesanal"; // Reemplaza con tu nombre de usuario/página de Facebook
  // ---------------------------------

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Contactar para Cotizar</h2>
        <p className="modal-subtitle">Elige tu plataforma preferida.<br/>Puedes enviarnos una captura de pantalla del diseño.</p>
        
        <div className="modal-options">
          {/* WhatsApp */}
          <a href={`https://wa.me/${whatsappNumber}?text=${message}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="modal-option">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>WhatsApp</span>
          </a>

          {/* Instagram */}
          <a href={`https://www.instagram.com/${instagramUser}`} target="_blank" rel="noopener noreferrer" title="Instagram" className="modal-option">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
               <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
               <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
             </svg>
            <span>Instagram</span>
          </a>

          {/* Facebook */}
          <a href={`http://m.me/${facebookPageName}`} target="_blank" rel="noopener noreferrer" title="Facebook" className="modal-option">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0.01-1.5 1.5-1.5H18V2h-3.5C10.04 2 9 4.03 9 6.5V9.5H6v4h3v8h5v-8z"></path></svg>
            <span>Facebook Messenger</span>
          </a>
        </div>

        <button className="modal-close-button" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
};

export default ShareModal;