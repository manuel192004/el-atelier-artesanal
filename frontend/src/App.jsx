// Archivo: frontend/src/App.jsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import AtelierPage from './pages/AtelierPage'; // <-- 1. IMPORTA la nueva página
import ConfiguratorPage from './pages/ConfiguratorPage'; // <-- 2. IMPORTA la nueva página

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main>
          <Routes> {/* El <Routes> decide qué página mostrar */}
            <Route path="/" element={<HomePage />} />
            <Route path="/el-taller" element={<AtelierPage />} />
            <Route path="/configurador" element={<ConfiguratorPage />} />
            {/* Más adelante añadiremos aquí las rutas para /colecciones, etc. */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;