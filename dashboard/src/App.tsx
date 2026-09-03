import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { Login } from './components/Login';
import { AuthFast } from './components/AuthFast';
import { EmployeePortal } from './components/EmployeePortal';
import { ActivateAccount } from './components/ActivateAccount';
import { LandingPage } from './components/LandingPage';
import { PublicRestaurantMenu } from './components/PublicRestaurantMenu';

function App() {
  const [view, setView] = useState<'admin' | 'client' | 'login' | 'activate' | 'employee' | 'landing' | 'menu'>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');
    const host = window.location.hostname.toLowerCase();

    // Carta Digital Pública para Clientes (/menu/:clientId o /m/:clientId)
    if (path.startsWith('/menu') || path.startsWith('/m/')) {
      return 'menu';
    }

    // Si la ruta es /landpage o /landing -> Mostrar la Landing Page
    if (path === '/landpage' || path === '/landing' || urlView === 'landpage' || urlView === 'landing') {
      return 'landing';
    }

    // Si está en el dominio comercial diazlab.online en el root / -> Mostrar landing
    if ((host === 'diazlab.online' || host === 'www.diazlab.online') && path === '/') {
      return 'landing';
    }

    // Por defecto en localhost y app.diazlab.online -> ERP / Login directo
    return 'login';
  });
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(true);

  // Sincronizar estado y verificar sesión activa
  useEffect(() => {
    const checkAuthAndRoute = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const urlClientId = params.get('clientId');
      const urlToken = params.get('token');
      const path = window.location.pathname.toLowerCase();
      const host = window.location.hostname.toLowerCase();

      // Caso Carta Digital Pública para Clientes
      if (path.startsWith('/menu') || path.startsWith('/m/')) {
        setView('menu');
        setLoading(false);
        return;
      }

      // 0. Caso explícito de /landpage o /landing
      if (path === '/landpage' || path === '/landing' || urlView === 'landpage' || urlView === 'landing') {
        setView('landing');
        setLoading(false);
        return;
      }

      if (urlView === 'login' || path === '/login') {
        setView('login');
        setLoading(false);
        return;
      }

      // 0.1 Caso de portal de empleado o chat corporativo standalone
      if (path === '/empleados' || path === '/employee' || path === '/chat') {
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
      if (path === '/auth-fast' || urlView === 'auth-fast') {
        setView('auth-fast' as any);
        setLoading(false);
        return;
      }

      // 2. Verificar si existe token en localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Si el usuario navegó a /landpage explícitamente o está en diazlab.online
        if (path === '/landpage' || path === '/landing' || ((host === 'diazlab.online' || host === 'www.diazlab.online') && path === '/')) {
          setView('landing');
        } else {
          // En localhost:3000 o app.diazlab.online sin token -> ERP / Login directo
          setView('login');
        }
        setLoading(false);
        if (window.location.search !== '') {
          window.history.pushState({}, '', '/');
        }
        return;
      }

      try {
        // Timeout de seguridad para evitar spinner infinito si la red falla
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('/api/me', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const json = await res.json();

        if (json.success) {
          const user = json.data;
          localStorage.setItem('session_role', user.role);
          localStorage.setItem('session_name', user.name || '');

          const savedView = localStorage.getItem('current_view');

          if (savedView === 'employee') {
            if (user.clientId) {
              localStorage.setItem('current_client_id', user.clientId);
              setClientId(user.clientId);
            }
            setView('employee');
          } else if (user.role === 'superadmin') {
            const savedClientId = localStorage.getItem('current_client_id');
            if (savedView === 'client' && savedClientId) {
              setClientId(savedClientId);
              setView('client');
            } else {
              setView('admin');
              localStorage.setItem('current_view', 'admin');
            }
          } else if (user.role === 'employee') {
            localStorage.setItem('session_name', user.name || '');
            localStorage.setItem('employee_role', user.employeeRole || '');
            localStorage.setItem('employee_permissions', JSON.stringify(user.permissions || []));
            if (user.clientId) {
              localStorage.setItem('current_client_id', user.clientId);
              setClientId(user.clientId);
            }

            if (!user.hasErpAccess) {
              setView('employee');
              localStorage.setItem('current_view', 'employee');
            } else {
              setView('client');
              localStorage.setItem('current_view', 'client');
            }
          } else {
            const clientTenantId = user.clientId || user.id;
            setClientId(clientTenantId);
            setView('client');
            localStorage.setItem('current_view', 'client');
            localStorage.setItem('current_client_id', clientTenantId);
          }
          
          // Limpiar cualquier residuo visual en la barra de direcciones
          if (window.location.search !== '') {
            window.history.pushState({}, '', '/');
          }
        } else {
          // Token inválido/expirado
          localStorage.removeItem('auth_token');
          localStorage.removeItem('session_role');
          localStorage.removeItem('current_view');
          localStorage.removeItem('current_client_id');
          setView('login');
          window.history.pushState({}, '', '/');
        }
      } catch (err) {
        console.error("[Auth App] Error validando sesión:", err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('session_role');
        localStorage.removeItem('current_view');
        localStorage.removeItem('current_client_id');
        setView('login');
        window.history.pushState({}, '', '/');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRoute();
  }, []);

  const handleLoginSuccess = (id: string, role: string, token: string, extra?: Record<string, any>) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('session_role', role);
    const resolvedName = extra?.name || extra?.username || '';
    if (resolvedName) {
      localStorage.setItem('session_name', resolvedName);
    } else {
      localStorage.removeItem('session_name');
    }

    if (role === 'superadmin') {
      setView('admin');
      localStorage.setItem('current_view', 'admin');
      localStorage.removeItem('current_client_id');
    } else if (role === 'employee') {
      // Guardar sesión principal y sesión nativa de EmployeePortal
      localStorage.setItem('employee_role', extra?.employeeRole || '');
      localStorage.setItem('employee_permissions', JSON.stringify(extra?.permissions || []));
      localStorage.setItem('current_client_id', id);

      localStorage.setItem('emp_token', token);
      localStorage.setItem('emp_id', extra?.employeeId || id);
      localStorage.setItem('emp_name', resolvedName);
      localStorage.setItem('emp_role', extra?.employeeRole || 'employee');
      localStorage.setItem('emp_client_id', id);

      setClientId(id);

      if (extra?.hasErpAccess) {
        setView('client');
        localStorage.setItem('current_view', 'client');
      } else {
        setView('employee');
        localStorage.setItem('current_view', 'employee');
      }
    } else {
      setClientId(id);
      setView('client');
      localStorage.setItem('current_view', 'client');
      localStorage.setItem('current_client_id', id);
    }

    window.history.pushState({}, '', '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_role');
    localStorage.removeItem('session_name');
    localStorage.removeItem('current_view');
    localStorage.removeItem('current_client_id');
    localStorage.removeItem('client_active_tab');
    localStorage.removeItem('admin_active_tab');
    localStorage.removeItem('employee_role');
    localStorage.removeItem('employee_permissions');
    localStorage.removeItem('emp_token');
    localStorage.removeItem('emp_id');
    localStorage.removeItem('emp_name');
    localStorage.removeItem('emp_role');
    localStorage.removeItem('emp_client_id');
    localStorage.removeItem('shift_start_ts');
    setClientId('');
    setView('login');
    window.history.pushState({}, '', '/');
  };

  const handleClientDashboardBack = () => {
    const sessionRole = localStorage.getItem('session_role');
    if (sessionRole === 'superadmin') {
      setView('admin');
      localStorage.setItem('current_view', 'admin');
      localStorage.removeItem('current_client_id');
      localStorage.removeItem('client_active_tab');
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

  if (view === 'menu') {
    return <PublicRestaurantMenu />;
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
          localStorage.setItem('current_view', 'client');
          localStorage.setItem('current_client_id', id);
        }} 
      />
    );
  }

  if (view === 'landing') {
    return <LandingPage onLoginClick={() => setView('login')} />;
  }

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setView('landing')}
          className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1 cursor-pointer transition shadow"
        >
          <span className="material-symbols-outlined text-[15px]">home</span>
          Página Principal / Precios
        </button>
      </div>
      <Login onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}

export default App;
