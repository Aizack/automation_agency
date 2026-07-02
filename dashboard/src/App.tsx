import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';

function App() {
  const [view, setView] = useState<'admin' | 'client'>('admin');
  const [clientId, setClientId] = useState('client_001');

  // Sincronizar estado con la URL de forma reactiva
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const urlId = params.get('id');

      if (urlView === 'client' && urlId) {
        setView('client');
        setClientId(urlId);
      } else {
        setView('admin');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    handleUrlChange(); // Ejecutar en el primer render

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Navegar de vuelta al panel de administrador
  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/');
    // Disparar evento popstate manualmente para actualizar la vista
    window.dispatchEvent(new Event('popstate'));
  };

  if (view === 'client') {
    return <ClientDashboard clientId={clientId} onBack={navigateToAdmin} />;
  }

  return <AdminDashboard />;
}

export default App;
