import React, { useState } from 'react';

interface ActivateAccountProps {
  clientId: string;
  token: string;
  onActivated: () => void;
}

export const ActivateAccount: React.FC<ActivateAccountProps> = ({ clientId, token, onActivated }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Por favor, ingresa tu nueva contraseña.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/activate-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          token,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ocurrió un error al activar tu cuenta.');
      }

      setSuccess(true);
      setTimeout(() => {
        onActivated();
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-card w-full max-w-md p-8 rounded-2xl relative z-10 border border-outline/10 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="frant-grad-act" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0066ff" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <rect x="2" y="10" width="36" height="26" rx="6" fill="#090d16" stroke="url(#frant-grad-act)" strokeWidth="3" />
              <path d="M20,10 L20,3" stroke="url(#frant-grad-act)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="20" cy="3" r="2.5" fill="url(#frant-grad-act)" />
              <circle cx="20" cy="23" r="4" fill="url(#frant-grad-act)" />
              <path d="M20,27 L20,31" stroke="url(#frant-grad-act)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-display-md text-display-md font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">Activar tu Cuenta</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Establece una contraseña segura para tu acceso al Dashboard de Diaz Lab.</p>
        </div>

        {success ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 text-secondary border border-secondary/20 mb-4">
              <span className="material-symbols-outlined text-[32px] animate-bounce">check_circle</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-white mb-2">¡Activación Exitosa!</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Tu cuenta ha sido activada. Redirigiéndote a la pantalla de inicio de sesión...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
                <span className="material-symbols-outlined text-error text-[20px] shrink-0">error</span>
                <span className="font-label-md text-label-md text-error-container">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant block">Nueva Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-surface-container-highest border border-outline/10 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant block">Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-surface-container-highest border border-outline/10 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Repite tu contraseña"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">lock_open</span>
                  Activar y Guardar
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
