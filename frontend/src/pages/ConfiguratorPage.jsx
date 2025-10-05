// Archivo: frontend/src/pages/ConfiguratorPage.jsx (Versión IA)

import React from 'react';
import './../styles/_configuratorpage.scss';
import PromptDesigner from '../components/configurator/PromptDesigner';

const ConfiguratorPage = () => {
  return (
    <div className="configurator-page-ia">
      <div className="configurator-main-panel">
        <h1 className="configurator-title">Diseñador Asistido por IA</h1>
        <PromptDesigner />
      </div>
    </div>
  );
};

export default ConfiguratorPage;