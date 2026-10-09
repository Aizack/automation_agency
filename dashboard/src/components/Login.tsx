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

  // Estados Modal Google Account Selector
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Estados de Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('57');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados de Desafío MFA (2FA)
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaAvailableMethods, setMfaAvailableMethods] = useState<string[]>([]);
  const [mfaSelectedMethod, setMfaSelectedMethod] = useState<'whatsapp' | 'totp' | 'email' | 'backup'>('whatsapp');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaTrustedDevice, setMfaTrustedDevice] = useState(true);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState<string | null>(null);

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

      if (json.mfaRequired) {
        setMfaTempToken(json.tempToken);
        setMfaAvailableMethods(json.availableMethods || ['whatsapp']);
        if (json.availableMethods && json.availableMethods.length > 0) {
          setMfaSelectedMethod(json.availableMethods[0] as any);
        }
        setMfaModalOpen(true);
        return;
      }

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

  const handleGoogleSignIn = () => {
    setError(null);
    setShowCustomGoogleInput(false);
    setCustomGoogleEmail('');
    setIsGoogleModalOpen(true);
  };

  const executeGoogleAuth = async (emailToUse: string) => {
    if (!emailToUse || !emailToUse.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setIsGoogleModalOpen(false);
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse.trim(),
          google_id: `google_${Date.now()}`
        }),
      });
      const json = await res.json();

      if (json.mfaRequired) {
        setMfaTempToken(json.tempToken);
        setMfaAvailableMethods(json.availableMethods || ['whatsapp']);
        if (json.availableMethods && json.availableMethods.length > 0) {
          setMfaSelectedMethod(json.availableMethods[0] as any);
        }
        setMfaModalOpen(true);
        return;
      }

      if (json.success) {
        onLoginSuccess(json.data.id, json.data.role, json.data.token, json.data);
      } else {
        setError(json.error || 'No se encontró una empresa asociada a esta cuenta de Google.');
      }
    } catch {
      setError('Error de comunicación con el servicio de Google OAuth.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfaChallenge = async () => {
    if (!mfaCode.trim()) {
      setMfaError('Por favor ingresa el código de verificación.');
      return;
    }

    try {
      setMfaLoading(true);
      setMfaError(null);
      const res = await fetch('/api/auth/mfa/verify-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: mfaTempToken,
          method: mfaSelectedMethod,
          code: mfaCode.trim(),
          trustedDevice: mfaTrustedDevice,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setMfaModalOpen(false);
        onLoginSuccess(json.data.id, json.data.role, json.data.token, json.data);
      } else {
        setMfaError(json.error || 'Código de verificación incorrecto o expirado.');
      }
    } catch {
      setMfaError('Error de red al verificar el código MFA.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleSendMfaOtp = async () => {
    try {
      setMfaLoading(true);
      setMfaError(null);
      setMfaSuccessMsg(null);
      const res = await fetch('/api/auth/mfa/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: mfaTempToken,
          method: mfaSelectedMethod,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setMfaSuccessMsg(json.message || 'Código enviado exitosamente.');
      } else {
        setMfaError(json.error || 'No se pudo enviar el código OTP.');
      }
    } catch {
      setMfaError('Error de conexión al solicitar el código.');
    } finally {
      setMfaLoading(false);
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

            {/* Separador Ó */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '0.4rem 0', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: '#E2DFD7' }} />
              <span style={{ fontSize: '0.68rem', color: '#6B6862', fontWeight: 600 }}>Ó</span>
              <div style={{ flex: 1, height: '1px', background: '#E2DFD7' }} />
            </div>

            {/* Botón Ingresar / Vincular con Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                color: '#161616',
                border: '1.5px solid #E2DFD7',
                padding: '0.8rem 1.2rem',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                borderRadius: '9999px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = '#161616';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = '#E2DFD7';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuar con Google</span>
            </button>

            {/* Enlace para Registrar Empresa / Negocio */}
            <div style={{ textAlign: 'center', paddingTop: '0.2rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#6B6862', margin: 0 }}>
                ¿Aún no has registrado tu empresa o negocio?{' '}
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
                  Regístrala aquí
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
                  <option value="pos">🛍️ Tienda POS & Comercio General</option>
                  <option value="moda">👟 Moda, Calzado & Accesorios</option>
                  <option value="restaurante">🍽️ Restaurante / Bar / Gastronomía</option>
                  <option value="general">🏢 Almacén, Distribuidora & Negocio General</option>
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

      {/* MODAL DESAFÍO DE AUTENTICACIÓN EN DOS PASOS (MFA / 2FA) */}
      {/* Modal Google Account Chooser UI */}
      {isGoogleModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 15, 15, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '2rem 1.8rem 1.5rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem',
          }}>
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F5F5F3',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#555',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E5E0';
                e.currentTarget.style.color = '#111';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F5F5F3';
                e.currentTarget.style.color = '#555';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>

            <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.8rem' }}>
                <svg width="36" height="36" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#111827' }}>
                Selecciona una cuenta
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
                para continuar en <strong style={{ color: '#111827' }}>Frant ERP</strong>
              </p>
            </div>

            {!showCustomGoogleInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => executeGoogleAuth('isacdiazb@gmail.com')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: '#1E40AF',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}>
                    ID
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Isac Diaz
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      isacdiazb@gmail.com
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9CA3AF' }}>chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeGoogleAuth('wahidkaftan@gmail.com')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: '#047857',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}>
                    IB
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Isac David Diaz Barros
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      wahidkaftan@gmail.com
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9CA3AF' }}>chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeGoogleAuth('diazbisac@gmail.com')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: '#B91C1C',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}>
                    ID
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Isac Diaz (Empresarial)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      diazbisac@gmail.com
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9CA3AF' }}>chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomGoogleInput(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px dashed #D1D5DB',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    marginTop: '0.2rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAF8F3';
                    e.currentTarget.style.borderColor = '#9CA3AF';
                    e.currentTarget.style.color = '#111827';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.color = '#374151';
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: '#F3F4F6',
                    color: '#4B5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
                  </div>
                  <span style={{ flex: 1 }}>Usar otra cuenta de Google</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9CA3AF' }}>add</span>
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeGoogleAuth(customGoogleEmail);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.3rem' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>
                    Correo electrónico de Google
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="usuario@gmail.com o empresa@dominio.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      fontSize: '0.9rem',
                      border: '1.5px solid #D1D5DB',
                      borderRadius: '10px',
                      outline: 'none',
                      color: '#111827',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(false)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: '#F3F4F6',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#4B5563',
                      cursor: 'pointer',
                    }}
                  >
                    Volver a lista
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: '#1E40AF',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    Continuar
                  </button>
                </div>
              </form>
            )}

            <div style={{ textAlign: 'center', paddingTop: '0.5rem', borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0, lineHeight: 1.4 }}>
                Antes de usar esta aplicación, puedes consultar la{' '}
                <button
                  type="button"
                  onClick={() => { setIsGoogleModalOpen(false); setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
                  style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontWeight: 500 }}
                >
                  Política de Privacidad
                </button>{' '}
                y los{' '}
                <button
                  type="button"
                  onClick={() => { setIsGoogleModalOpen(false); setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
                  style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontWeight: 500 }}
                >
                  Términos del Servicio
                </button>{' '}
                de Frant ERP.
              </p>
            </div>
          </div>
        </div>
      )}

      {mfaModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(22, 22, 22, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #161616',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            padding: '1.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem',
            borderRadius: '4px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#FAF8F3',
                border: '1px solid #E2DFD7',
                color: '#D9381E',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.6rem',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>verified_user</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: '#161616', fontFamily: 'var(--font-serif, serif)' }}>
                Verificación en Dos Pasos (MFA)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6B6862' }}>
                Tu cuenta requiere un segundo factor de autenticación para ingresar.
              </p>
            </div>

            {mfaError && (
              <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FCE8E6', borderLeft: '4px solid #C5221F', color: '#C5221F', fontSize: '0.78rem', fontWeight: 600 }}>
                {mfaError}
              </div>
            )}

            {mfaSuccessMsg && (
              <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#E6F4EA', borderLeft: '4px solid #15803d', color: '#15803d', fontSize: '0.78rem', fontWeight: 600 }}>
                {mfaSuccessMsg}
              </div>
            )}

            {/* Selector de Método MFA */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#FAF8F3', padding: '3px', border: '1px solid #E2DFD7' }}>
              {(mfaAvailableMethods.includes('whatsapp') || mfaAvailableMethods.length === 0) && (
                <button
                  type="button"
                  onClick={() => { setMfaSelectedMethod('whatsapp'); setMfaError(null); setMfaSuccessMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '6px 2px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: mfaSelectedMethod === 'whatsapp' ? '1px solid #161616' : 'none',
                    backgroundColor: mfaSelectedMethod === 'whatsapp' ? '#FFFFFF' : 'transparent',
                    color: mfaSelectedMethod === 'whatsapp' ? '#161616' : '#6B6862',
                    cursor: 'pointer',
                  }}
                >
                  📱 WhatsApp
                </button>
              )}
              {mfaAvailableMethods.includes('totp') && (
                <button
                  type="button"
                  onClick={() => { setMfaSelectedMethod('totp'); setMfaError(null); setMfaSuccessMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '6px 2px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: mfaSelectedMethod === 'totp' ? '1px solid #161616' : 'none',
                    backgroundColor: mfaSelectedMethod === 'totp' ? '#FFFFFF' : 'transparent',
                    color: mfaSelectedMethod === 'totp' ? '#161616' : '#6B6862',
                    cursor: 'pointer',
                  }}
                >
                  🔑 App Auth
                </button>
              )}
              {mfaAvailableMethods.includes('email') && (
                <button
                  type="button"
                  onClick={() => { setMfaSelectedMethod('email'); setMfaError(null); setMfaSuccessMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '6px 2px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: mfaSelectedMethod === 'email' ? '1px solid #161616' : 'none',
                    backgroundColor: mfaSelectedMethod === 'email' ? '#FFFFFF' : 'transparent',
                    color: mfaSelectedMethod === 'email' ? '#161616' : '#6B6862',
                    cursor: 'pointer',
                  }}
                >
                  📧 Correo
                </button>
              )}
              {mfaAvailableMethods.includes('backup') && (
                <button
                  type="button"
                  onClick={() => { setMfaSelectedMethod('backup'); setMfaError(null); setMfaSuccessMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '6px 2px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: mfaSelectedMethod === 'backup' ? '1px solid #161616' : 'none',
                    backgroundColor: mfaSelectedMethod === 'backup' ? '#FFFFFF' : 'transparent',
                    color: mfaSelectedMethod === 'backup' ? '#161616' : '#6B6862',
                    cursor: 'pointer',
                  }}
                >
                  🛡️ Respaldo
                </button>
              )}
            </div>

            {/* Acción de Envío si es WhatsApp o Correo */}
            {(mfaSelectedMethod === 'whatsapp' || mfaSelectedMethod === 'email') && (
              <button
                type="button"
                onClick={handleSendMfaOtp}
                disabled={mfaLoading}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: '#FAF8F3',
                  border: '1px solid #E2DFD7',
                  color: '#161616',
                  cursor: 'pointer',
                }}
              >
                {mfaLoading ? 'Enviando...' : `📩 Solicitar / Enviar Código por ${mfaSelectedMethod === 'whatsapp' ? 'WhatsApp' : 'Correo'}`}
              </button>
            )}

            {/* Campo de Código */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase' }}>
                {mfaSelectedMethod === 'backup' ? 'Código de Respaldo de 8 Caracteres' : 'Código de 6 Dígitos'}
              </label>
              <input
                type="text"
                maxLength={mfaSelectedMethod === 'backup' ? 12 : 6}
                placeholder={mfaSelectedMethod === 'backup' ? 'Ej. A1B2C3D4' : '123456'}
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                style={{
                  padding: '0.75rem',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  letterSpacing: '0.25em',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  border: '1px solid #E2DFD7',
                  color: '#161616',
                  outline: 'none',
                }}
              />
            </div>

            {/* Opción Dispositivo de Confianza */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#6B6862', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mfaTrustedDevice}
                onChange={e => setMfaTrustedDevice(e.target.checked)}
              />
              <span>Confiar en este equipo por 30 días</span>
            </label>

            {/* Botones del Modal */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setMfaModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2DFD7',
                  color: '#6B6862',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVerifyMfaChallenge}
                disabled={mfaLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: '#D9381E',
                  border: '1px solid #D9381E',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                {mfaLoading ? 'Verificando...' : 'Verificar y Entrar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
