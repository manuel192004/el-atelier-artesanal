import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/_collections-showcase.scss';

const homeCollections = [
  {
    title: 'Anillos',
    intent: 'Compromiso y simbolos',
    copy: 'Piezas con presencia clara para promesas, aniversarios y decisiones importantes.',
    image: '/orviane-rings-card.png',
    alt: 'Coleccion de anillos de Orviane',
    to: '/colecciones/anillos',
  },
  {
    title: 'Aretes',
    intent: 'Luz inmediata',
    copy: 'Detalles que iluminan el rostro con brillo controlado y uso facil.',
    image: '/orviane-earrings-card.png',
    alt: 'Coleccion de aretes de Orviane',
    to: '/colecciones/aretes',
  },
  {
    title: 'Cadenas',
    intent: 'Uso diario premium',
    copy: 'Opciones elegantes para capas, regalos refinados y piezas de permanencia.',
    image: '/orviane-chains-card.png',
    alt: 'Coleccion de cadenas de Orviane',
    to: '/colecciones/cadenas',
  },
  {
    title: 'Pulseras',
    intent: 'Acento artesanal',
    copy: 'Gestos finos para regalo, complemento de look o pieza protagonista.',
    image: '/orviane-bracelets-card.png',
    alt: 'Coleccion de pulseras de Orviane',
    to: '/colecciones/pulseras',
  },
];

const CollectionsShowcase = () => {
  return (
    <section id="collections" className="collections-showcase">
      <div className="container">
        <span className="collections-kicker">Compra por tipo de joya</span>
        <h2 className="section-title">Colecciones pensadas para decidir mas rapido</h2>
        <p className="section-subtitle">
          Entra por la familia correcta, revisa referencias reales y pasa a cotizacion con una idea mas clara.
        </p>
        <div className="showcase-collections-grid">
          {homeCollections.map((collection) => (
            <Link key={collection.title} to={collection.to} className="showcase-collection-card">
              <img src={collection.image} alt={collection.alt} className="showcase-collection-image" />
              <div className="showcase-collection-overlay">
                <span className="showcase-collection-eyebrow">{collection.intent}</span>
                <h3>{collection.title}</h3>
                <p>{collection.copy}</p>
                <strong className="showcase-collection-cta">Explorar referencias</strong>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CollectionsShowcase;
