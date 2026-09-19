import React, { useState } from 'react';
import { LegalDocsModal } from './LegalDocsModal';

interface LoginProps {
  onLoginSuccess: (clientId: string, role: string, token: string, extra?: Record<string, any>) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terminos' | 'privacidad' | 'ia_transparency'>('terminos');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Ingresa tu usuario o teléfono y tu contraseña o PIN.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json();

      if (json.success) {
        onLoginSuccess(json.data.id, json.data.role, json.data.token, json.data);
      } else {
        setError(json.error || 'Credenciales incorrectas.');
      }
    } catch {
      setError('Error de conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: 'var(--bg-color)', fontFamily: 'var(--font-family-sans)' }}>

      {/* Luces y degradados de fondo */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '60%', height: '60%',
        background: 'radial-gradient(circle, rgba(216,162,78,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="glass-card relative z-10 w-full" style={{
        maxWidth: '440px',
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--outline-color)',
        background: 'var(--surface-val)',
        boxShadow: 'var(--shadow-lg)'
      }}>

        {/* Header / Logo */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 54, height: 54,
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(217,56,30,0.12)',
            border: '1px solid rgba(217,56,30,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#D9381E', fontSize: 30 }}>
              smart_toy
            </span>
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '2.2rem',
              fontWeight: 400,
              color: '#D9381E',
              margin: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight: 1.1
            }}>
              FRANT ERP
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Plataforma de gestión inteligente
            </p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: 500,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Formulario de Login Unificado */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Usuario o Teléfono
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ingresa tu usuario o teléfono"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contraseña o PIN
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: '40px', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                }}
                title={showPassword ? 'Ocultar contraseña/PIN' : 'Mostrar contraseña/PIN'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginTop: 6 }}>
            {loading ? (
              <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>sync</span> Iniciando sesión...</>
            ) : (
              <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span> Iniciar Sesión</>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            FRANT ERP © 2026 • Todos los derechos reservados.
          </p>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--primary-color)' }}>
            <button
              type="button"
              onClick={() => { setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
            >
              Términos
            </button>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <button
              type="button"
              onClick={() => { setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
            >
              Privacidad (Habeas Data)
            </button>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <button
              type="button"
              onClick={() => { setLegalModalTab('ia_transparency'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 'bold', padding: 0 }}
            >
              🤖 Transparencia IA
            </button>
          </div>
        </div>
      </div>

      <LegalDocsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

