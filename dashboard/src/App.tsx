import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { Login } from './components/Login';
import { AuthFast } from './components/AuthFast';
import { EmployeePortal } from './components/EmployeePortal';
import { ActivateAccount } from './components/ActivateAccount';

function App() {
  const [view, setView] = useState<'admin' | 'client' | 'login' | 'activate' | 'employee'>('login');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(true);

  // Sincronizar estado y verificar sesión activa
  useEffect(() => {
    const checkAuthAndRoute = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const urlClientId = params.get('clientId');
      const urlToken = params.get('token');

      // 0. Caso de portal de empleado o chat corporativo standalone
      if (window.location.pathname === '/employee' || window.location.pathname === '/chat') {
        setView('employee');
        setLoading(false);
        return;
      }

      // 1. Caso de activación de cuenta (enlace público de WhatsApp)
      if (urlView === 'activate-account' && urlClientId && urlToken) {
        setView('activate');
        setLoading(false);
        return;
      }

      // 1.1 Caso de verificación rápida de WhatsApp (Passkey/PIN)
      if (window.location.pathname === '/auth-fast' || urlView === 'auth-fast') {
        setView('auth-fast' as any);
        setLoading(false);
        return;
      }

      // 2. Verificar si existe token en localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setView('login');
        setLoading(false);
        if (window.location.search !== '') {
          window.history.pushState({}, '', '/');
        }
        return;
      }

      try {
        // Validar token con el servidor
        const res = await fetch('/api/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();

        if (json.success) {
          const user = json.data;
          localStorage.setItem('session_role', user.role);
          
          if (user.role === 'admin') {
            setView('admin');
          } else {
            setClientId(user.id);
            setView('client');
          }
          
          // Limpiar cualquier residuo visual en la barra de direcciones
          if (window.location.search !== '') {
            window.history.pushState({}, '', '/');
          }
        } else {
          // Token inválido/expirado
          localStorage.removeItem('auth_token');
          localStorage.removeItem('session_role');
          setView('login');
          window.history.pushState({}, '', '/');
        }
      } catch (err) {
        console.error("[Auth App] Error validando sesión:", err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('session_role');
        setView('login');
        window.history.pushState({}, '', '/');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRoute();
  }, []);

  const handleLoginSuccess = (id: string, role: 'admin' | 'client', token: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('session_role', role);
    if (role === 'admin') {
      setView('admin');
    } else {
      setClientId(id);
      setView('client');
    }
    // Forzar limpieza visual de la barra de direcciones
    window.history.pushState({}, '', '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_role');
    setView('login');
    window.history.pushState({}, '', '/');
  };

  const handleClientDashboardBack = () => {
    const sessionRole = localStorage.getItem('session_role');
    if (sessionRole === 'admin') {
      setView('admin');
    } else {
      handleLogout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] text-white flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#0a5cff] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wider animate-pulse">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  if (view === 'activate') {
    const params = new URLSearchParams(window.location.search);
    const actClientId = params.get('clientId') || '';
    const actToken = params.get('token') || '';
    return (
      <ActivateAccount
        clientId={actClientId}
        token={actToken}
        onActivated={() => {
          setView('login');
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  if (view === 'auth-fast' as any) {
    return <AuthFast />;
  }

  if (view === 'employee') {
    return <EmployeePortal />;
  }

  if (view === 'client') {
    return <ClientDashboard clientId={clientId} onBack={handleClientDashboardBack} />;
  }

  if (view === 'admin') {
    return (
      <AdminDashboard 
        onLogout={handleLogout} 
        onViewClient={(id) => {
          setClientId(id);
          setView('client');
        }} 
      />
    );
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}

export default App;
