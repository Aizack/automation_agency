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

  // Auto-detectar país por IP (para seleccionar indicativo predeterminado)
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#F6F4EE', fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)' }}
    >
      {/* Fondo sutil Wabi-Sabi Paper */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(217,56,30,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: '420px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.8rem',
          borderRadius: '4px',
          border: '1px solid #E2DFD7',
          background: '#FFFFFF',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
          <FrantLogo variant="dark" size={52} />
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif, "Instrument Serif", Georgia, serif)',
                fontSize: '2.2rem',
                fontWeight: 400,
                color: '#D9381E',
                margin: 0,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              FRANT ERP
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#6B6862', margin: '4px 0 0' }}>
              Plataforma de gestión inteligente
            </p>
          </div>
        </div>

        {/* Mensaje de Error estilo Wabi-Sabi Warning */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#FAF8F3',
              border: '1px solid #D9381E',
              borderLeft: '4px solid #D9381E',
              borderRadius: '2px',
              color: '#D9381E',
              fontSize: '0.8rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Formulario de Login Wabi-Sabi */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Usuario o Teléfono
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #E2DFD7',
                borderRadius: '3px',
                background: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                style={{
                  background: '#FAF8F3',
                  border: 'none',
                  borderRight: '1px solid #E2DFD7',
                  color: '#161616',
                  fontSize: '0.8rem',
                  padding: '0.75rem 0.6rem',
                  cursor: 'pointer',
                  outline: 'none',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
                title="Cambiar indicativo de país (VPN)"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} +{c.code}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Ej. Josefo_Rendon_461 o 3116718652"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.88rem',
                  color: '#161616',
                  background: 'transparent',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Detección Wabi-Sabi Paper Hint */}
            {username.trim() && (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#6B6862',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  background: '#FAF8F3',
                  border: '1px solid #E2DFD7',
                  borderRadius: '2px',
                }}
              >
                {isNumericPhone ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#D9381E' }}>smartphone</span>
                    <span>Modo Teléfono • Búsqueda inteligente por 10 dígitos</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#161616' }}>person</span>
                    <span>Modo Usuario Alfanumérico</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Contraseña o PIN
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 0.9rem',
                  border: '1px solid #E2DFD7',
                  borderRadius: '3px',
                  background: '#FFFFFF',
                  fontSize: '0.88rem',
                  color: '#161616',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#6B6862',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                }}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#161616',
              color: '#FFFFFF',
              border: '1px solid #161616',
              padding: '0.85rem 1.5rem',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '3px',
              marginTop: '6px',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#D9381E';
                e.currentTarget.style.borderColor = '#D9381E';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#161616';
                e.currentTarget.style.borderColor = '#161616';
              }
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>sync</span>
                Verificando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#6B6862', margin: 0 }}>
            FRANT ERP © 2026 • Todos los derechos reservados.
          </p>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem' }}>
            <button
              type="button"
              onClick={() => { setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: '#D9381E', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
            >
              Términos
            </button>
            <span style={{ color: '#E2DFD7' }}>•</span>
            <button
              type="button"
              onClick={() => { setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: '#D9381E', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
            >
              Privacidad (Habeas Data)
            </button>
            <span style={{ color: '#E2DFD7' }}>•</span>
            <button
              type="button"
              onClick={() => { setLegalModalTab('ia_transparency'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: '#D9381E', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, padding: 0 }}
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
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #FFFFFF inset !important;
          -webkit-text-fill-color: #161616 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
};
