import React from 'react';
import HeroSection from '../components/homepage/HeroSection';
import CollectionsShowcase from '../components/homepage/CollectionsShowcase';
import HomeCommercialSections from '../components/homepage/HomeCommercialSections';
import PageMeta from '../components/common/PageMeta';

const HomePage = () => {
  return (
    <div className="homepage fade-in-section">
      <PageMeta
        title="El Atelier Artesanal | Joyeria artesanal, citas y diseno personalizado"
        description="Descubre colecciones de alta joyeria artesanal, agenda una asesoria y disena una pieza personalizada en El Atelier Artesanal."
        path="/"
        image="/hero-background.png"
      />
      <HeroSection />
      <CollectionsShowcase />
      <HomeCommercialSections />
    </div>
  );
};

export default HomePage;
