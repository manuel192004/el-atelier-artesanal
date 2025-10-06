// Archivo: frontend/src/pages/HomePage.jsx (Corregido)

import React from 'react';
import HeroSection from '../components/homepage/HeroSection';
import CollectionsShowcase from '../components/homepage/CollectionsShowcase';

const HomePage = () => {
  return (
    <div className="homepage fade-in-section">
      <HeroSection />
      <CollectionsShowcase />
    </div>
  );
};

export default HomePage;