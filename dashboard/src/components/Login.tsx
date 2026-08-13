import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (clientId: string, role: 'admin' | 'client', token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Campos de registro
  const [regContactName, setRegContactName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, ingresa todos los campos.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const json = await res.json();
      if (json.success) {
        onLoginSuccess(json.data.id, json.data.role, json.data.token);
      } else {
        setError(json.error || 'Credenciales incorrectas.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regContactName || !regUsername || !regPassword || !regPhone) {
      setError('Por favor, ingresa todos los campos obligatorios del registro.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/auth/register-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: regContactName,
          username: regUsername,
          password: regPassword,
          phone_number: regPhone,
          email: regEmail
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage('¡Cuenta creada con éxito! Ingresa con tu usuario y contraseña.');
        setIsRegistering(false);
        setUsername(regUsername);
        setPassword(regPassword);
        // Limpiar
        setRegContactName('');
        setRegUsername('');
        setRegPassword('');
        setRegPhone('');
        setRegEmail('');
      } else {
        setError(json.error || 'Error al crear la cuenta.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Luces y degradados de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#0a5cff]/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00ff88]/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md bg-[#0e1726]/70 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          {/* Icono de Marca */}
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0a5cff]/10 rounded-2xl text-[#0a5cff] mb-2 border border-[#0a5cff]/20">
            <span className="material-symbols-outlined text-3xl animate-pulse">smart_toy</span>
          </div>
          <h2 className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-[#0a5cff] bg-clip-text text-transparent">
            Diaz Lab Automations
          </h2>
          <p className="text-xs text-gray-400">Ingresa para administrar tu Agente de Inteligencia Artificial</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] rounded-xl text-xs font-semibold text-center">
            {successMessage}
          </div>
        )}

        {!isRegistering ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Usuario</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">person</span>
                <input
                  type="text"
                  className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[#0a5cff]/50 focus:ring-1 focus:ring-[#0a5cff]/50 text-white outline-none transition-all placeholder-gray-600"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">lock</span>
                <input
                  type="password"
                  className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[#0a5cff]/50 focus:ring-1 focus:ring-[#0a5cff]/50 text-white outline-none transition-all placeholder-gray-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0a5cff] to-[#0a5cff]/80 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-[1.01] hover:brightness-110 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-[#0a5cff]/15"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  Iniciar Sesión
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-[#0a5cff] hover:underline bg-transparent border-none cursor-pointer outline-none"
              >
                ¿No tienes cuenta? Regístrate gratis
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre Completo *</label>
              <input
                type="text"
                className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#0a5cff]/50 text-white outline-none"
                placeholder="Ej. Juan Pérez"
                value={regContactName}
                onChange={(e) => setRegContactName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre de Usuario *</label>
              <input
                type="text"
                className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#0a5cff]/50 text-white outline-none"
                placeholder="Ej. juanperez"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contraseña *</label>
              <input
                type="password"
                className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#0a5cff]/50 text-white outline-none"
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Número de WhatsApp *</label>
              <input
                type="text"
                className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#0a5cff]/50 text-white outline-none"
                placeholder="Ej. 573001234567"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
              <input
                type="email"
                className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#0a5cff]/50 text-white outline-none"
                placeholder="Ej. juan@correo.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#00ff88]/80 to-[#00ff88]/60 text-black py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-[1.01] hover:brightness-110 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-gray-400 hover:text-white hover:underline bg-transparent border-none cursor-pointer outline-none"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
