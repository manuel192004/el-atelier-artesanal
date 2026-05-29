import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import OrbiaAssistantV2 from './features/assistant-v2/OrbiaAssistantV2';
import HomePage from './pages/HomePage';
import OrbiaPage from './pages/OrbiaPage';
import ConfiguratorPage from './pages/ConfiguratorPage';
import ColeccionesPage from './pages/ColeccionesPage';
import AccountPage from './pages/AccountPage';
import OperationsPage from './pages/OperationsPage';
import LinktreePage from './pages/LinktreePage';

function App() {
  return (
    <Router>
      <div className="App">
        <a href="#main-content" className="skip-link">
          Ir al contenido principal
        </a>
        <Header />
        <main id="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/orbia" element={<OrbiaPage />} />
            <Route path="/configurador" element={<ConfiguratorPage />} />
            <Route path="/colecciones" element={<ColeccionesPage />} />
            <Route path="/colecciones/:categoria" element={<ColeccionesPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/operaciones" element={<OperationsPage />} />
            <Route path="/linktree" element={<LinktreePage />} />
          </Routes>
        </main>
        <Footer />
        <OrbiaAssistantV2 />
      </div>
    </Router>
  );
}

export default App;
