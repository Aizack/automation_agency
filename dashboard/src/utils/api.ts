/**
 * Wrapper personalizado de fetch para incluir automáticamente
 * el token JWT de sesión en las cabeceras de todas las solicitudes.
 */
export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('emp_token');
  
  // Clonar o instanciar cabeceras
  const headers = new Headers(init?.headers);
  const existingAuth = headers.get('Authorization');
  
  if (token && (!existingAuth || existingAuth === 'Bearer null' || existingAuth === 'Bearer undefined' || existingAuth === 'Bearer ')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  // Si el servidor responde con 401 (No autorizado) o 403 (Token expirado),
  // limpiamos la sesión local y redirigimos al login recargando la página.
  if (response.status === 401 || response.status === 403) {
    console.warn("[API Auth] Sesión inválida o expirada detectada por el servidor.");
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_role');
    
    // Si no estamos en la página principal, recargar para disparar el flujo de login
    if (window.location.pathname !== '/' || window.location.search !== '') {
      window.location.href = '/';
    }
  }

  return response;
};
