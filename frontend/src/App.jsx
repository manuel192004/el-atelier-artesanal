import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import AtelierAssistantV2 from './features/assistant-v2/AtelierAssistantV2';
import HomePage from './pages/HomePage';
import AtelierPage from './pages/AtelierPage';
import ConfiguratorPage from './pages/ConfiguratorPage';
import ColeccionesPage from './pages/ColeccionesPage';
import AccountPage from './pages/AccountPage';

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
            <Route path="/orviane" element={<AtelierPage />} />
            <Route path="/atelier" element={<AtelierPage />} />
            <Route path="/configurador" element={<ConfiguratorPage />} />
            <Route path="/colecciones" element={<ColeccionesPage />} />
            <Route path="/colecciones/:categoria" element={<ColeccionesPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
          </Routes>
        </main>
        <Footer />
        <AtelierAssistantV2 />
      </div>
    </Router>
  );
}

export default App;
