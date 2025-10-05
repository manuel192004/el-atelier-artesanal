// Archivo: frontend/src/components/configurator/PromptDesigner.jsx (Versión Simplificada)

import React, { useState } from 'react';
import ShareModal from './ShareModal';

const PromptDesigner = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // La función handleQuoteRequest que subía la imagen ha sido eliminada.

  const handleGenerate = async () => {
    // ... (esta función no cambia)
    if (!prompt) return;
    setIsLoading(true);
    setGeneratedImage(null);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/generate-jewelry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt }),
      });
      if (!response.ok) throw new Error('Algo salió mal en el servidor.');
      const data = await response.json();
      setGeneratedImage(data.imageBase64); 
    } catch (err) {
      console.error(err);
      setError('No se pudo generar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="prompt-designer">
      <h2>Describe la Joya de tus Sueños</h2>
      <p className="prompt-subtitle">Usa tu imaginación. Sé tan descriptivo como quieras y nuestra IA le dará vida.</p>
      
      <textarea
        className="prompt-textarea"
        placeholder="Ej: 'Un anillo de oro blanco con un diseño de enredadera...'"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      
      <button className="generate-button" onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? 'Generando...' : 'Dar Vida a mi Idea'}
      </button>

      <div className="generated-image-container">
        {isLoading && <div className="loader"></div>}
        {error && !isLoading && <p className="error-text">{error}</p>}
        
        {generatedImage && !isLoading && (
          <div className="fade-in">
            <img src={`data:image/png;base64,${generatedImage}`} alt="Joya generada por IA" />
            <p className="result-text">¡Aquí está tu creación!</p>
            
            {/* El botón ahora simplemente abre el modal */}
            <button className="quote-button" onClick={() => setIsModalOpen(true)}>
              Solicitar Cotización de este Diseño
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ShareModal 
          onClose={() => setIsModalOpen(false)}
          // Ya no pasamos el imageUrl
        />
      )}
    </div>
  );
};

export default PromptDesigner;