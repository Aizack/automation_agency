/**
 * Wrapper personalizado de fetch para incluir automáticamente
 * el token JWT de sesión en las cabeceras de todas las solicitudes.
 */
export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = localStorage.getItem('auth_token') || 
                localStorage.getItem('emp_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('jwt_token') || 
                localStorage.getItem('user_token');
  
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

  return response;
};
