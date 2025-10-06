// Archivo: frontend/src/App.jsx (Versión Corregida y Limpia)

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import AtelierPage from './pages/AtelierPage';
import ConfiguratorPage from './pages/ConfiguratorPage';
import ColeccionesPage from './pages/ColeccionesPage'; // Ruta para la nueva galería

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/atelier" element={<AtelierPage />} />
            <Route path="/configurador" element={<ConfiguratorPage />} />
            <Route path="/colecciones/:categoria" element={<ColeccionesPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
