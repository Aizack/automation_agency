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

  return response;
};
