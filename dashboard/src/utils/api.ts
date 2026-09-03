/**
 * Utilidades de Gestión Segura de Sesión y HTTP Client Interceptor
 */

export const getStoredToken = (): string | null => {
  return sessionStorage.getItem('auth_token') ||
         localStorage.getItem('auth_token') || 
         sessionStorage.getItem('emp_token') ||
         localStorage.getItem('emp_token') ||
         null;
};

export const clearAllSessionData = () => {
  try {
    sessionStorage.clear();
    localStorage.clear();
  } catch (err) {
    console.error("[Session Security] Error al limpiar almacenamiento local:", err);
  }
};

/**
 * Wrapper personalizado de fetch para incluir automáticamente
 * el token JWT de sesión en las cabeceras y detectar sesiones expiradas (401/403).
 */
export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = getStoredToken();
  
  // Clonar o instanciar cabeceras
  const headers = new Headers(init?.headers);
  const existingAuth = headers.get('Authorization');
  
  const isInvalidHeader = !existingAuth || 
                          existingAuth === 'Bearer null' || 
                          existingAuth === 'Bearer undefined' || 
                          existingAuth === 'Bearer ';

  if (token && isInvalidHeader) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (!token && isInvalidHeader) {
    headers.delete('Authorization');
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  // Interceptor de Seguridad: Si la API responde 401 (No autorizado) o 403 (Prohibido/Token inválido)
  // en peticiones autenticadas, emitir evento para cerrar sesión automáticamente.
  if (response.status === 401 || (response.status === 403 && token)) {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    // Ignorar respuestas 401 esperadas durante intento inicial de login
    if (!urlStr.includes('/api/login') && !urlStr.includes('/api/auth/employee-login')) {
      console.warn("[Auth API] Sesión rechazada por el servidor (401/403). Forzando cierre de sesión seguro.");
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  return response;
};
