import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { Login } from './components/Login';

function App() {
  const [view, setView] = useState<'admin' | 'client' | 'login'>('login');
  const [clientId, setClientId] = useState('');

  // Sincronizar estado con la URL de forma reactiva
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const urlId = params.get('id');

      const sessionClientId = localStorage.getItem('session_client_id');
      const sessionAdmin = localStorage.getItem('session_admin');

      if (urlView === 'client' && urlId) {
        if (sessionClientId === urlId || sessionAdmin === 'true') {
          setClientId(urlId);
          setView('client');
        } else {
          setView('login');
        }
      } else if (urlView === 'admin' && sessionAdmin === 'true') {
        setView('admin');
      } else {
        setView('login');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    handleUrlChange(); // Ejecutar en el primer render

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleLoginSuccess = (id: string, role: 'admin' | 'client') => {
    if (role === 'admin') {
      localStorage.setItem('session_admin', 'true');
      localStorage.removeItem('session_client_id');
      setView('admin');
      window.history.pushState({}, '', '/?view=admin');
    } else {
      localStorage.setItem('session_client_id', id);
      localStorage.removeItem('session_admin');
      setClientId(id);
      setView('client');
      window.history.pushState({}, '', `/?view=client&id=${id}`);
    }
  };

  const handleAdminAccess = () => {
    localStorage.setItem('session_admin', 'true');
    localStorage.removeItem('session_client_id');
    setView('admin');
    window.history.pushState({}, '', '/?view=admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('session_client_id');
    localStorage.removeItem('session_admin');
    setView('login');
    window.history.pushState({}, '', '/');
  };

  const handleClientDashboardBack = () => {
    const sessionAdmin = localStorage.getItem('session_admin');
    if (sessionAdmin === 'true') {
      setView('admin');
      window.history.pushState({}, '', '/?view=admin');
    } else {
      handleLogout();
    }
  };

  if (view === 'client') {
    return <ClientDashboard clientId={clientId} onBack={handleClientDashboardBack} />;
  }

  if (view === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} onAdminAccess={handleAdminAccess} />;
}

export default App;
