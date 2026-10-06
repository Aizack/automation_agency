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
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Estados de Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('57');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados de Registro
  const [regContactName, setRegContactName] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regCategory, setRegCategory] = useState('optica');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regContactName.trim() || !regBusinessName.trim() || !regUsername.trim() || !regPhone.trim() || !regPassword) {
      setRegError('Por favor completa todos los campos requeridos (*).');
      return;
    }

    const cleanPhoneDigits = regPhone.replace(/\D/g, '');
    const fullPhone = cleanPhoneDigits.length === 10 ? `${selectedCountry}${cleanPhoneDigits}` : cleanPhoneDigits;

    try {
      setRegLoading(true);
      const res = await fetch('/api/auth/register-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: regContactName.trim(),
          business_name: regBusinessName.trim(),
          category: regCategory,
          username: regUsername.trim(),
          phone_number: fullPhone,
          email: regEmail.trim() || undefined,
          password: regPassword,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setRegSuccess('¡Cuenta creada exitosamente! Iniciando sesión...');
        // Auto iniciar sesión después del registro
        setTimeout(async () => {
          try {
            const loginRes = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: regUsername.trim(), password: regPassword }),
            });
            const loginJson = await loginRes.json();
            if (loginJson.success) {
              onLoginSuccess(loginJson.data.id, loginJson.data.role, loginJson.data.token, loginJson.data);
            } else {
              setIsRegisterOpen(false);
              setUsername(regUsername.trim());
            }
          } catch {
            setIsRegisterOpen(false);
          }
        }, 1200);
      } else {
        setRegError(json.error || 'No se pudo crear la cuenta.');
      }
    } catch {
      setRegError('Error de red al intentar registrar.');
    } finally {
      setRegLoading(false);
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
          maxWidth: '440px',
          padding: '2.2rem 2.2rem 1.8rem 2.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          borderRadius: '4px',
          border: '1px solid #E2DFD7',
          background: '#FFFFFF',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          <FrantLogo variant="dark" size={48} />
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

        {/* Formulario Principal: Login o Registro */}
        {!isRegisterOpen ? (
          <>
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
                  marginTop: '4px',
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

            {/* Enlace para Crear Cuenta / Registro */}
            <div style={{ textAlign: 'center', paddingTop: '0.2rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#6B6862', margin: 0 }}>
                ¿No tienes una cuenta aún?{' '}
                <button
                  type="button"
                  onClick={() => { setError(null); setIsRegisterOpen(true); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#D9381E',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </>
        ) : (
          /* Vista Wabi-Sabi de Registro de Nueva Cuenta */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2DFD7', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif, "Instrument Serif", serif)', fontSize: '1.4rem', margin: 0, color: '#161616', fontWeight: 400 }}>
                Crear Nueva Cuenta
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                style={{ background: 'none', border: 'none', color: '#6B6862', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Volver al inicio de sesión"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {regError && (
              <div style={{ padding: '0.6rem 0.8rem', background: '#FAF8F3', border: '1px solid #D9381E', borderLeft: '4px solid #D9381E', color: '#D9381E', fontSize: '0.78rem', fontWeight: 600 }}>
                {regError}
              </div>
            )}

            {regSuccess && (
              <div style={{ padding: '0.6rem 0.8rem', background: '#FAF8F3', border: '1px solid #10b981', borderLeft: '4px solid #10b981', color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>
                {regSuccess}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Nombre Completo / Asesor *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Isac Gómez"
                  value={regContactName}
                  onChange={e => setRegContactName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E2DFD7', borderRadius: '3px', fontSize: '0.85rem', color: '#161616', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Nombre de la Empresa / Negocio *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Óptica Visión Clara o Tienda Central"
                  value={regBusinessName}
                  onChange={e => setRegBusinessName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E2DFD7', borderRadius: '3px', fontSize: '0.85rem', color: '#161616', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Tipo de Negocio / Sector *
                </label>
                <select
                  value={regCategory}
                  onChange={e => setRegCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E2DFD7', borderRadius: '3px', fontSize: '0.85rem', color: '#161616', background: '#FFFFFF', outline: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  <option value="optica">👓 Óptica & Salud Visual</option>
                  <option value="odontologia">🦷 Odontología & Clínica Dental</option>
                  <option value="pos">🛍️ Tienda POS & Comercio General</option>
                  <option value="restaurante">🍽️ Restaurante / Bar / Gastronomía</option>
                  <option value="servicios">🛠️ Servicios Profesionales / Asesoría</option>
                  <option value="agencia">🏢 Agencia & Software</option>
                  <option value="general">📦 Otro Tipo de Negocio</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  placeholder="Ej. optica_vision"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E2DFD7', borderRadius: '3px', fontSize: '0.85rem', color: '#161616', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Teléfono / WhatsApp *
                </label>
                <div style={{ display: 'flex', border: '1px solid #E2DFD7', borderRadius: '3px', overflow: 'hidden' }}>
                  <select
                    value={selectedCountry}
                    onChange={e => setSelectedCountry(e.target.value)}
                    style={{ background: '#FAF8F3', border: 'none', borderRight: '1px solid #E2DFD7', padding: '0.65rem 0.5rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} +{c.code}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="3116718652"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    style={{ flex: 1, border: 'none', padding: '0.65rem 0.8rem', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E2DFD7', borderRadius: '3px', fontSize: '0.85rem', color: '#161616', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Contraseña o PIN *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E2DFD7', borderRadius: '3px', fontSize: '0.85rem', color: '#161616', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                style={{
                  width: '100%',
                  backgroundColor: '#D9381E',
                  color: '#FFFFFF',
                  border: '1px solid #D9381E',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: regLoading ? 'not-allowed' : 'pointer',
                  borderRadius: '3px',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {regLoading ? 'Registrando...' : 'Completar Registro'}
              </button>

              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                style={{ background: 'none', border: 'none', color: '#6B6862', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                « Ya tengo cuenta, volver a Iniciar Sesión
              </button>
            </form>
          </div>
        )}

        {/* Footer Wabi-Sabi Paper Perfectamente Alineado */}
        <div
          style={{
            borderTop: '1px solid #E2DFD7',
            paddingTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.7rem', color: '#6B6862', margin: 0, letterSpacing: '0.02em' }}>
            FRANT ERP © 2026 • Todos los derechos reservados.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem 0.6rem',
              fontSize: '0.68rem',
            }}
          >
            <button
              type="button"
              onClick={() => { setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#161616',
                cursor: 'pointer',
                fontSize: '0.68rem',
                padding: '2px 4px',
                fontWeight: 500,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#D9381E')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#161616')}
            >
              Términos
            </button>

            <span style={{ color: '#E2DFD7', fontSize: '0.6rem', userSelect: 'none' }}>•</span>

            <button
              type="button"
              onClick={() => { setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#161616',
                cursor: 'pointer',
                fontSize: '0.68rem',
                padding: '2px 4px',
                fontWeight: 500,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#D9381E')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#161616')}
            >
              Privacidad (Habeas Data)
            </button>

            <span style={{ color: '#E2DFD7', fontSize: '0.6rem', userSelect: 'none' }}>•</span>

            <button
              type="button"
              onClick={() => { setLegalModalTab('ia_transparency'); setIsLegalModalOpen(true); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#D9381E',
                cursor: 'pointer',
                fontSize: '0.68rem',
                padding: '2px 4px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle' }}>smart_toy</span>
              Transparencia IA
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
