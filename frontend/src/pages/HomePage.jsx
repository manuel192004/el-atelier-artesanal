import React from 'react';
import HeroSection from '../components/homepage/HeroSection';
import CollectionsShowcase from '../components/homepage/CollectionsShowcase';
import HomeCommercialSections from '../components/homepage/HomeCommercialSections';
import PageMeta from '../components/common/PageMeta';

const HomePage = () => {
  return (
    <div className="homepage fade-in-section">
      <PageMeta
        title="Orviane | Alta joyeria personalizada, citas y diseno a medida"
        description="Descubre colecciones de alta joyeria personalizada, agenda una asesoria y disena una pieza a medida con Orviane."
        path="/"
        image="/orviane-home-hero.png"
      />
      <HeroSection />
      <CollectionsShowcase />
      <HomeCommercialSections />
    </div>
  );
};

export default HomePage;
