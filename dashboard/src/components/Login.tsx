import React, { useState, useEffect, useMemo } from 'react';
import { LegalDocsModal } from './LegalDocsModal';
import { FrantLogo } from './FrantLogo';

interface LoginProps {
  onLoginSuccess: (clientId: string, role: string, token: string, extra?: Record<string, any>) => void;
}

const COUNTRY_CODES = [
  { code: '57', flag: '🇨🇴', name: 'Colombia (+57)' },
  { code: '52', flag: '🇲🇽', name: 'México (+52)' },
  { code: '1', flag: '🇺🇸', name: 'EE.UU. / Canadá (+1)' },
  { code: '34', flag: '🇪🇸', name: 'España (+34)' },
  { code: '54', flag: '🇦🇷', name: 'Argentina (+54)' },
  { code: '56', flag: '🇨🇱', name: 'Chile (+56)' },
  { code: '51', flag: '🇵🇪', name: 'Perú (+51)' },
  { code: '593', flag: '🇪🇨', name: 'Ecuador (+593)' },
  { code: '58', flag: '🇻🇪', name: 'Venezuela (+58)' },
  { code: '591', flag: '🇧🇴', name: 'Bolivia (+591)' },
  { code: '502', flag: '🇬🇹', name: 'Guatemala (+502)' },
  { code: '506', flag: '🇨🇷', name: 'Costa Rica (+506)' },
  { code: '507', flag: '🇵🇦', name: 'Panamá (+507)' },
  { code: '598', flag: '🇺🇾', name: 'Uruguay (+598)' },
  { code: '595', flag: '🇵🇾', name: 'Paraguay (+595)' },
  { code: '55', flag: '🇧🇷', name: 'Brasil (+55)' },
];

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terminos' | 'privacidad' | 'ia_transparency'>('terminos');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('57');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Intentar autodetectar país por IP (con posibilidad de cambio voluntario por VPN)
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_calling_code) {
          const cleanCode = data.country_calling_code.replace('+', '');
          if (COUNTRY_CODES.some(c => c.code === cleanCode)) {
            setSelectedCountry(cleanCode);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Determinar si el valor ingresado es numérico (Teléfono) o alfanumérico (Usuario / Email)
  const isNumericPhone = useMemo(() => {
    const trimmed = username.trim();
    if (!trimmed) return false;
    return /^[0-9+\s-]+$/.test(trimmed);
  }, [username]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Ingresa tu usuario o teléfono y tu contraseña o PIN.');
      return;
    }

    let finalLoginIdentifier = username.trim();
    if (isNumericPhone) {
      const cleanDigits = finalLoginIdentifier.replace(/\D/g, '');
      if (cleanDigits.length === 10) {
        finalLoginIdentifier = `${selectedCountry}${cleanDigits}`;
      } else {
        finalLoginIdentifier = cleanDigits;
      }
    }

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: finalLoginIdentifier, password }),
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
          <FrantLogo variant="dark" size={54} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Usuario o Teléfono
              </label>

              {/* Selector voluntario de país (VPN override) */}
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--outline-color)',
                  borderRadius: '6px',
                  color: 'var(--text-color)',
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  cursor: 'pointer'
                }}
                title="Cambiar país voluntariamente (útil si estás usando VPN)"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: '#1c1b1a', color: '#fff' }}>
                    {c.flag} +{c.code}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              className="input-field"
              placeholder="Ej. Josefo_Rendon_461 o 3116718652"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />

            {/* Badge indicador de detector inteligente */}
            {username.trim() && (
              <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', marginTop: '2px' }}>
                {isNumericPhone ? (
                  <span style={{ color: '#0866FF' }}>
                    📱 Detección: <strong>Teléfono (+{selectedCountry})</strong> • {username.trim().replace(/\D/g, '').length === 10 ? `+${selectedCountry}${username.trim().replace(/\D/g, '')}` : username.trim()}
                  </span>
                ) : (
                  <span style={{ color: '#10b981' }}>
                    👤 Detección: <strong>Usuario Alfanumérico</strong> (Sin indicativo de país)
                  </span>
                )}
              </div>
            )}
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

