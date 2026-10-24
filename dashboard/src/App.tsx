import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { VerticalRouter } from './verticals/VerticalRouter';
import { Login } from './components/Login';
import { AuthFast } from './components/AuthFast';
import { EmployeePortal } from './components/EmployeePortal';
import { ActivateAccount } from './components/ActivateAccount';
import { LandingPage } from './components/LandingPage';
import { PublicRestaurantMenu } from './components/PublicRestaurantMenu';
import { PublicCatalog } from './components/public/PublicCatalog';
import { TestWhatsappBusinessMessaging } from './components/TestWhatsappBusinessMessaging';
import { clearAllSessionData, getStoredToken } from './utils/api';

function App() {
  const [view, setView] = useState<'admin' | 'client' | 'login' | 'activate' | 'employee' | 'landing' | 'menu' | 'catalog' | 'test_whatsapp'>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');

    // Test WhatsApp Business Messaging para Meta App Review (/test-whatsapp, ?view=test_whatsapp)
    if (path.startsWith('/test-whatsapp') || params.has('test-whatsapp') || urlView === 'test_whatsapp' || urlView === 'test_whatsapp_business_messaging') {
      return 'test_whatsapp';
    }

    // Catálogo Digital Público (/c/:slug, /catalogo/:slug, /tienda/:slug)
    if (path.startsWith('/c/') || path.startsWith('/catalogo') || path.startsWith('/tienda/') || params.has('c') || params.has('catalog')) {
      return 'catalog';
    }

    // Carta Digital Pública para Clientes (/menu/:clientId o /m/:clientId)
    if (path.startsWith('/menu') || path.startsWith('/m/')) {
      return 'menu';
    }

    const host = window.location.hostname.toLowerCase();

    // Si la ruta es explícitamente /login o subdominio app.diazlab.online -> Mostrar Login directo
    if (path === '/login' || urlView === 'login' || host === 'app.diazlab.online') {
      return 'login';
    }

    // Si la ruta es /landpage, /landing, /diazlab -> Mostrar Landing Page
    if (path === '/landpage' || path === '/landing' || path === '/diazlab' || urlView === 'landpage' || urlView === 'landing') {
      return 'landing';
    }

    // En la raíz / de frant.app y diazlab.online sin sesión activa -> Mostrar Homepage Pública sin Login Wall (Google OAuth Compliance)
    const token = getStoredToken();
    if (!token && (path === '/' || path === '')) {
      return 'landing';
    }

    return 'login';
  });
  const [clientId, setClientId] = useState(() => localStorage.getItem('current_client_id') || '');
  const [loading, setLoading] = useState(true);

  // Escuchadores de eventos de seguridad (desconexión remota, 401/403 o cierre de sesión en otra pestaña) y navegación popstate
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAllSessionData();
      setClientId('');
      setView('login');
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'emp_token') {
        if (!e.newValue) {
          handleUnauthorized();
        }
      }
    };

    const handlePopState = () => {
      const currentPath = window.location.pathname.toLowerCase();
      const token = getStoredToken();
      if (currentPath === '/login') {
        setView('login');
      } else if (!token && (currentPath === '/' || currentPath === '' || currentPath === '/landing' || currentPath === '/landpage' || currentPath === '/diazlab')) {
        setView('landing');
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Limpieza inmediata de URL para prevenir exposición de /admin en la barra de direcciones
  useEffect(() => {
    if (window.location.pathname.toLowerCase() === '/admin') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Sincronizar estado y verificar sesión activa
  useEffect(() => {
    const checkAuthAndRoute = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const urlClientId = params.get('clientId');
      const urlToken = params.get('token');
      const path = window.location.pathname.toLowerCase();
  
      // Caso Test WhatsApp Business Messaging para Meta App Review (/test-whatsapp o ?view=test_whatsapp)
      if (path.startsWith('/test-whatsapp') || params.has('test-whatsapp') || urlView === 'test_whatsapp' || urlView === 'test_whatsapp_business_messaging') {
        setView('test_whatsapp');
        setLoading(false);
        return;
      }

      // Caso Catálogo Digital Público para Clientes
      if (path.startsWith('/c/') || path.startsWith('/catalogo') || path.startsWith('/tienda/') || params.has('c') || params.has('catalog')) {
        setView('catalog');
        setLoading(false);
        return;
      }

      // Caso Carta Digital Pública para Clientes
      if (path.startsWith('/menu') || path.startsWith('/m/')) {
        setView('menu');
        setLoading(false);
        return;
      }

      // 0. Caso explícito de /landpage, /landing o /diazlab
      if (path === '/landpage' || path === '/landing' || path === '/diazlab' || urlView === 'landpage' || urlView === 'landing') {
        setView('landing');
        setLoading(false);
        return;
      }

      if (urlView === 'login' || path === '/login') {
        setView('login');
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

      const host = window.location.hostname.toLowerCase();

      // 2. Verificar si existe token en almacenamiento
      const token = getStoredToken();
      if (!token) {
        if (host === 'app.diazlab.online') {
          setView('login');
        } else {
          // En frant.app y diazlab.online sin token en / -> Mostrar Landing Page pública sin Login Wall
          setView('landing');
        }
        setLoading(false);
        return;
      }

      // Si está en el dominio comercial diazlab.online en el root / -> Mostrar Landing Page de Diaz Lab aunque tenga token de ERP
      if ((host === 'diazlab.online' || host === 'www.diazlab.online') && (path === '/' || path === '')) {
        setView('landing');
        setLoading(false);
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
          sessionStorage.setItem('session_role', user.role);
          localStorage.setItem('session_role', user.role);
          sessionStorage.setItem('session_name', user.name || '');
          localStorage.setItem('session_name', user.name || '');

          const currentPath = window.location.pathname.toLowerCase();

          if (user.role === 'superadmin') {
            const urlParams = new URLSearchParams(window.location.search);
            const viewParam = urlParams.get('view');
            const clientParam = urlParams.get('clientId');
            const savedViewAsClient = localStorage.getItem('view_as_client') === 'true';
            const savedClientId = localStorage.getItem('current_client_id');
            const savedCurrentView = localStorage.getItem('current_view');

            if (viewParam === 'admin') {
              setView('admin');
              localStorage.setItem('current_view', 'admin');
              localStorage.removeItem('view_as_client');
              localStorage.removeItem('current_client_id');
              if (window.location.pathname === '/admin') {
                window.history.replaceState({}, '', '/');
              }
            } else if (viewParam === 'client' && clientParam) {
              setClientId(clientParam);
              setView('client');
              localStorage.setItem('current_view', 'client');
              localStorage.setItem('view_as_client', 'true');
              localStorage.setItem('current_client_id', clientParam);
            } else if ((savedViewAsClient || savedCurrentView === 'client') && savedClientId) {
              setClientId(savedClientId);
              setView('client');
              localStorage.setItem('current_view', 'client');
              localStorage.setItem('view_as_client', 'true');
            } else {
              setView('admin');
              localStorage.setItem('current_view', 'admin');
              localStorage.removeItem('view_as_client');
              localStorage.removeItem('current_client_id');
              if (window.location.pathname === '/admin') {
                window.history.replaceState({}, '', '/');
              }
            }
          } else if (user.role === 'employee') {
            localStorage.setItem('employee_role', user.employeeRole || '');
            localStorage.setItem('employee_permissions', JSON.stringify(user.permissions || []));
            localStorage.setItem('employee_allowed_branches', JSON.stringify(user.allowedBranches || user.allowed_branches || []));
            const savedClientId = localStorage.getItem('current_client_id');
            const empClientId = savedClientId || user.clientId;
            if (empClientId) {
              localStorage.setItem('current_client_id', empClientId);
              setClientId(empClientId);
            }

            if (currentPath.startsWith('/empleado') || currentPath.startsWith('/employee') || currentPath.startsWith('/chat')) {
              setView('employee');
            } else if (!user.hasErpAccess) {
              setView('employee');
              if (window.location.pathname !== '/empleados') {
                window.history.replaceState({}, '', '/empleados');
              }
            } else {
              setView('client');
              if (window.location.pathname !== '/') {
                window.history.replaceState({}, '', '/');
              }
            }
          } else {
            const savedClientId = localStorage.getItem('current_client_id');
            const clientTenantId = savedClientId || user.clientId || user.id;
            setClientId(clientTenantId);
            setView('client');
            localStorage.setItem('current_client_id', clientTenantId);
            if (window.location.pathname !== '/') {
              window.history.replaceState({}, '', '/');
            }
          }
          
          if (window.location.search !== '') {
            window.history.pushState({}, '', window.location.pathname);
          }
        } else {
          clearAllSessionData();
          if (host === 'app.diazlab.online' || path === '/login') {
            setView('login');
            window.history.pushState({}, '', '/login');
          } else {
            setView('landing');
            window.history.replaceState({}, '', '/');
          }
        }
      } catch (err) {
        console.error("[Auth App] Error validando sesión:", err);
        clearAllSessionData();
        if (host === 'app.diazlab.online' || path === '/login') {
          setView('login');
          window.history.pushState({}, '', '/login');
        } else {
          setView('landing');
          window.history.replaceState({}, '', '/');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRoute();

    const handlePopState = () => {
      const currentPath = window.location.pathname.toLowerCase();
      if (currentPath === '/login') {
        setView('login');
      } else if (currentPath === '/privacy' || currentPath === '/privacidad') {
        setView('privacy' as any);
      } else if (currentPath === '/terms' || currentPath === '/terminos') {
        setView('terms' as any);
      } else if (currentPath === '/' && !getStoredToken()) {
        setView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSuccess = (id: string, role: string, token: string, extra?: Record<string, any>) => {
    clearAllSessionData();

    sessionStorage.setItem('auth_token', token);
    localStorage.setItem('auth_token', token);
    sessionStorage.setItem('session_role', role);
    localStorage.setItem('session_role', role);

    const resolvedName = extra?.name || extra?.username || '';
    if (resolvedName) {
      sessionStorage.setItem('session_name', resolvedName);
      localStorage.setItem('session_name', resolvedName);
    }

    if (role === 'superadmin') {
      setView('admin');
      localStorage.removeItem('current_client_id');
      localStorage.removeItem('view_as_client');
      localStorage.setItem('current_view', 'admin');
      window.history.pushState({}, '', '/');
    } else if (role === 'employee') {
      localStorage.setItem('employee_role', extra?.employeeRole || '');
      localStorage.setItem('employee_permissions', JSON.stringify(extra?.permissions || []));
      localStorage.setItem('employee_allowed_branches', JSON.stringify(extra?.allowedBranches || extra?.allowed_branches || []));
      localStorage.setItem('current_client_id', id);

      sessionStorage.setItem('emp_token', token);
      localStorage.setItem('emp_token', token);
      localStorage.setItem('emp_id', extra?.employeeId || id);
      localStorage.setItem('emp_name', resolvedName);
      localStorage.setItem('emp_role', extra?.employeeRole || 'employee');
      localStorage.setItem('emp_client_id', id);

      setClientId(id);

      if (extra?.hasErpAccess && extra?.targetPortal !== 'employee_portal') {
        setView('client');
        window.history.pushState({}, '', '/');
      } else {
        setView('employee');
        window.history.pushState({}, '', '/empleados');
      }
    } else {
      setClientId(id);
      setView('client');
      localStorage.setItem('current_client_id', id);
      window.history.pushState({}, '', '/');
    }
  };

  const handleLogout = () => {
    clearAllSessionData();
    setClientId('');
    setView('login');
    window.history.pushState({}, '', '/login');
  };

  const handleClientDashboardBack = () => {
    const sessionRole = localStorage.getItem('session_role');
    if (sessionRole === 'superadmin') {
      setView('admin');
      localStorage.setItem('current_view', 'admin');
      localStorage.removeItem('view_as_client');
      localStorage.removeItem('current_client_id');
      localStorage.removeItem('client_active_tab');
    } else {
      handleLogout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F4EE] text-[#161616] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#3F3D38] font-bold uppercase tracking-wider animate-pulse font-mono">Verificando sesión segura...</p>
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
          window.history.pushState({}, '', '/login');
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

  if (view === 'test_whatsapp') {
    return <TestWhatsappBusinessMessaging onBack={() => setView('login')} />;
  }

  if (view === 'catalog') {
    return <PublicCatalog />;
  }

  if (view === 'client') {
    return <VerticalRouter clientId={clientId} onBack={handleClientDashboardBack} />;
  }

  if (view === 'admin') {
    return (
      <AdminDashboard 
        onLogout={handleLogout} 
        onViewClient={(id) => {
          setClientId(id);
          setView('client');
          localStorage.setItem('current_view', 'client');
          localStorage.setItem('view_as_client', 'true');
          localStorage.setItem('current_client_id', id);
        }} 
      />
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onLoginClick={() => {
          window.history.pushState({}, '', '/login');
          setView('login');
        }}
      />
    );
  }

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => {
            window.history.pushState({}, '', '/');
            setView('landing');
          }}
          className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1 cursor-pointer transition shadow"
        >
          <span className="material-symbols-outlined text-[15px]">home</span>
          Página Principal
        </button>
      </div>
      <Login onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}

export default App;
