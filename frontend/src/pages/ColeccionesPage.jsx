// Archivo: frontend/src/pages/ColeccionesPage.jsx (Actualizado)

import React, { useState } from 'react';
import "../styles/_coleccionespage.scss";

// --- Tus Datos Reales ---
const allItems = [
  // Anillos de Oro Amarillo
  { id: 1, name: "Anillo de Oro Amarillo #1", image: "/anillo-oro-amarillo1.png", category: "Oro Amarillo" },
  { id: 2, name: "Anillo de Oro Amarillo #2", image: "/anillo-oro-amarillo2.png", category: "Oro Amarillo" },
  { id: 3, name: "Anillo de Oro Amarillo #3", image: "/anillo-oro-amarillo3.png", category: "Oro Amarillo" },
  { id: 4, name: "Anillo de Oro Amarillo #4", image: "/anillo-oro-amarillo4.png", category: "Oro Amarillo" },
  { id: 5, name: "Anillo de Oro Amarillo #5", image: "/anillo-oro-amarillo5.png", category: "Oro Amarillo" },
  { id: 6, name: "Anillo de Oro Amarillo #6", image: "/anillo-oro-amarillo6.png", category: "Oro Amarillo" },
  { id: 7, name: "Anillo de Oro Amarillo #7", image: "/anillo-oro-amarillo7.png", category: "Oro Amarillo" },
  { id: 8, name: "Anillo de Oro Amarillo #8", image: "/anillo-oro-amarillo8.png", category: "Oro Amarillo" },
  // Anillos de Oro Blanco
  { id: 9, name: "Anillo de Oro Blanco #1", image: "/anillo-oro-blanco1.png", category: "Oro Blanco" },
  { id: 10, name: "Anillo de Oro Blanco #2", image: "/anillo-oro-blanco2.png", category: "Oro Blanco" },
  { id: 11, name: "Anillo de Oro Blanco #3", image: "/anillo-oro-blanco3.png", category: "Oro Blanco" },
  { id: 12, name: "Anillo de Oro Blanco #4", image: "/anillo-oro-blanco4.png", category: "Oro Blanco" },
  { id: 13, name: "Anillo de Oro Blanco #5", image: "/anillo-oro-blanco5.png", category: "Oro Blanco" },
  { id: 14, name: "Anillo de Oro Blanco #6", image: "/anillo-oro-blanco6.png", category: "Oro Blanco" },
  { id: 15, name: "Anillo de Oro Blanco #7", image: "/anillo-oro-blanco7.png", category: "Oro Blanco" },
  { id: 16, name: "Anillo de Oro Blanco #8", image: "/anillo-oro-blanco8.png", category: "Oro Blanco" },
];

// Categorías para los filtros, basadas en tus datos
const filterCategories = ['Todos', 'Oro Amarillo', 'Oro Blanco'];

// --- Componentes de la página ---
const CollectionsHero = ({ title, subtitle, backgroundImage }) => (
  <section 
    className="collections-hero" 
    style={{ backgroundImage: `url(${backgroundImage})` }}
  >
    <div className="collections-hero-content">
      <h1 className="collections-hero-title">{title}</h1>
      <p className="collections-hero-subtitle">{subtitle}</p>
    </div>
  </section>
);

const CollectionsDescription = ({ text }) => (
  <section className="collections-description">
    <p>{text}</p>
  </section>
);

const CollectionsFilters = ({ categories, activeCategory, onSelectCategory }) => (
  <div className="collections-filters">
    {categories.map((category) => (
      <button
        key={category}
        className={`filter-button ${activeCategory === category ? 'active' : ''}`}
        onClick={() => onSelectCategory(category)}
      >
        {category}
      </button>
    ))}
  </div>
);

// --- Componente Principal de la Página ---
const ColeccionesPage = () => {
  const [activeFilter, setActiveFilter] = useState('Todos');

  const filteredItems = activeFilter === 'Todos'
    ? allItems
    : allItems.filter(item => item.category === activeFilter);

  const heroData = {
    title: "Anillos de Compromiso",
    subtitle: "Promesas forjadas en metal noble y gemas eternas, esperando contar tu historia.",
    backgroundImage: "/hero-anillos.png", // Necesitarás esta imagen en /public/
  };

  return (
    <div className="colecciones-page fade-in-section">
      <CollectionsHero {...heroData} />
      <CollectionsDescription 
        text="Cada anillo es el inicio de una historia de amor única, el reflejo de un compromiso eterno. Descubre nuestra exclusiva selección de diseños, donde la artesanía y la pasión se unen para crear la pieza perfecta que sellará vuestro camino juntos." 
      />

      <div className="collections-main-content">
        <CollectionsFilters 
          categories={filterCategories}
          activeCategory={activeFilter}
          onSelectCategory={setActiveFilter}
        />

        <div className="collections-grid">
          {filteredItems.map((item) => (
            <div key={item.id} className="collection-item">
              <img src={item.image} alt={item.name} className="item-image" />
              <div className="item-overlay">
                <h3 className="item-name">{item.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColeccionesPage;