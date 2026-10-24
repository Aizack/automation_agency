import React, { useState, useEffect, useMemo } from 'react';
import { LegalDocsModal } from './LegalDocsModal';
import { FrantLogo } from './FrantLogo';

interface LoginProps {
  onLoginSuccess: (clientId: string, role: string, token: string, extra?: Record<string, any>) => void;
}

export const COUNTRY_LIST = [
  { country: 'Colombia', code: '57', flag: '🇨🇴' },
  { country: 'México', code: '52', flag: '🇲🇽' },
  { country: 'Estados Unidos / Canadá', code: '1', flag: '🇺🇸' },
  { country: 'España', code: '34', flag: '🇪🇸' },
  { country: 'Argentina', code: '54', flag: '🇦🇷' },
  { country: 'Chile', code: '56', flag: '🇨🇱' },
  { country: 'Perú', code: '51', flag: '🇵🇪' },
  { country: 'Ecuador', code: '593', flag: '🇪🇨' },
  { country: 'Venezuela', code: '58', flag: '🇻🇪' },
  { country: 'Bolivia', code: '591', flag: '🇧🇴' },
  { country: 'Guatemala', code: '502', flag: '🇬🇹' },
  { country: 'Costa Rica', code: '506', flag: '🇨🇷' },
  { country: 'Panamá', code: '507', flag: '🇵🇦' },
  { country: 'Uruguay', code: '598', flag: '🇺🇾' },
  { country: 'Paraguay', code: '595', flag: '🇵🇾' },
  { country: 'Brasil', code: '55', flag: '🇧🇷' },
];

const COUNTRY_CODES = COUNTRY_LIST.map(c => ({
  code: c.code,
  flag: c.flag,
  name: `${c.country} (+${c.code})`,
  country: c.country
}));

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
  const [mfaSelectedMethod, setMfaSelectedMethod] = useState<'totp' | 'email' | 'backup'>('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaTrustedDevice, setMfaTrustedDevice] = useState(true);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState<string | null>(null);

  // Estados de Registro
  const [regContactName, setRegContactName] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regCategory, setRegCategory] = useState('optica');
  const [regCountry, setRegCountry] = useState('Colombia');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Helper para resolver el objeto del país de registro seleccionado
  const regSelectedCountryObj = useMemo(() => {
    return COUNTRY_LIST.find(c => c.country.toLowerCase() === regCountry.toLowerCase()) || COUNTRY_LIST[0];
  }, [regCountry]);

  // Auto-detectar país por IP (para seleccionar indicativo predeterminado)
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_calling_code) {
          const cleanCode = data.country_calling_code.replace('+', '');
          const matched = COUNTRY_LIST.find(c => c.code === cleanCode);
          if (matched) {
            setSelectedCountry(matched.code);
            setRegCountry(matched.country);
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
        const rawMethods: string[] = json.availableMethods || ['totp', 'email'];
        const methods = rawMethods.filter((m: string) => m !== 'whatsapp');
        if (methods.length === 0) methods.push('totp', 'email');
        setMfaAvailableMethods(methods);
        
        let primaryMethod = 'totp';
        if (methods.includes('totp')) {
          primaryMethod = 'totp';
        } else if (methods.includes('email')) {
          primaryMethod = 'email';
        } else if (methods.length > 0) {
          primaryMethod = methods[0];
        }

        setMfaSelectedMethod(primaryMethod as any);
        setMfaModalOpen(true);
        setMfaSuccessMsg(null);
        setMfaError(null);
        setMfaCode('');

        if (methods.length === 1 && primaryMethod === 'email') {
          handleSendMfaOtp('email', json.tempToken);
        }
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
        const rawMethods: string[] = json.availableMethods || ['totp', 'email'];
        const methods = rawMethods.filter((m: string) => m !== 'whatsapp');
        if (methods.length === 0) methods.push('totp', 'email');
        setMfaAvailableMethods(methods);

        let primaryMethod = 'totp';
        if (methods.includes('totp')) {
          primaryMethod = 'totp';
        } else if (methods.includes('email')) {
          primaryMethod = 'email';
        } else if (methods.length > 0) {
          primaryMethod = methods[0];
        }

        setMfaSelectedMethod(primaryMethod as any);
        setMfaModalOpen(true);
        setMfaSuccessMsg(null);
        setMfaError(null);
        setMfaCode('');

        if (methods.length === 1 && primaryMethod === 'email') {
          handleSendMfaOtp('email', json.tempToken);
        }
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

  const handleSendMfaOtp = async (methodParam?: string, tokenParam?: string) => {
    try {
      setMfaLoading(true);
      setMfaError(null);
      setMfaSuccessMsg(null);
      const activeMethod = methodParam || mfaSelectedMethod;
      const activeToken = tokenParam || mfaTempToken;

      const res = await fetch('/api/auth/mfa/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: activeToken,
          method: activeMethod,
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

    let cleanPhoneDigits = regPhone.replace(/\D/g, '');
    const callingCode = regSelectedCountryObj.code;
    if (cleanPhoneDigits.startsWith(callingCode) && cleanPhoneDigits.length > 10) {
      cleanPhoneDigits = cleanPhoneDigits.slice(callingCode.length);
    }

    try {
      setRegLoading(true);
      const res = await fetch('/api/auth/register-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: regContactName.trim(),
          business_name: regBusinessName.trim(),
          category: regCategory,
          country: regCountry,
          country_code: callingCode,
          username: regUsername.trim(),
          phone_number: cleanPhoneDigits,
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
    <div className="login-console-root min-h-screen bg-[#090A0C] text-[#F4F1EA] flex items-center justify-center p-4 sm:p-6 relative overflow-x-hidden">
      <style>{`
        /* Garantiza proporción exacta 16px = 1rem para que la ventana de login quepa 100% en pantalla sin cortarse */
        html {
          font-size: 16px !important;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loginBorderTrail {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .login-tech-grid {
          background-size: 48px 48px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
        .login-border-trail {
          position: relative;
        }
        .login-border-trail::before {
          content: "";
          position: absolute;
          inset: -1.5px;
          border-radius: inherit;
          padding: 1.5px;
          background: linear-gradient(120deg, rgba(255,59,29,0.85), rgba(255,255,255,0.12), rgba(200,157,84,0.65), rgba(255,255,255,0.06), rgba(255,59,29,0.85));
          background-size: 300% 300%;
          animation: loginBorderTrail 7s ease infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 20;
        }
        .login-console-root input:-webkit-autofill,
        .login-console-root input:-webkit-autofill:hover, 
        .login-console-root input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #FFFFFF inset !important;
          -webkit-text-fill-color: #141518 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Grid Técnico & Resplandor Volumétrico Industrial */}
      <div className="login-tech-grid fixed inset-0 pointer-events-none"></div>
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[320px] bg-[#FF3B1D]/12 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-1/4 w-[420px] h-[300px] bg-[#C89D54]/10 blur-[130px] rounded-full pointer-events-none"></div>

      {/* =========================================================================
          CONSOLA DE ACCESO INDUSTRIAL SPLIT-SCREEN (CERO RECORTE VERTICAL)
         ========================================================================= */}
      <div className="login-border-trail relative z-10 w-full max-w-[940px] rounded-[24px] bg-[#12141A] border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_60px_rgba(255,59,29,0.1)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* COLUMNA IZQUIERDA (5 COLS): CHASIS EDITORIAL & TELEMETRÍA EN VIVO */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-7 bg-[#0D0F14] border-r border-white/10 overflow-hidden">
          <img
            src="/proposals/assets/hero_industrial_pos.jpg"
            alt="Terminal Frant ERP"
            className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090A0C] via-[#090A0C]/80 to-[#090A0C]/55"></div>

          {/* Parte Superior: Identidad de Hardware */}
          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 font-semibold">
                FRANT ERP v2.6 • NODO ACTIVO
              </span>
            </div>

            <div className="space-y-2.5 pt-2">
              <h2
                className="font-['Space_Grotesk',sans-serif] text-3xl font-bold tracking-tight leading-[1.08] text-white"
                style={{ color: '#FFFFFF' }}
              >
                Gobierna tu operación con{' '}
                <span className="font-['Newsreader',Georgia,serif] italic font-normal text-[#C89D54]">
                  precisión quirúrgica.
                </span>
              </h2>
              <p className="text-xs text-white/70 leading-relaxed">
                Punto de Venta POS, arqueo de caja por turno, Facturación Electrónica DIAN y despacho oficial desde tu cuenta de Gmail y WhatsApp Business.
              </p>
            </div>
          </div>

          {/* Parte Inferior: Especificaciones de Seguridad y Creador */}
          <div className="relative z-10 space-y-3 pt-6">
            <div className="p-3.5 rounded-xl bg-[#111318]/90 backdrop-blur-md border border-white/10 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-white/50">CIFRADO DE SESIÓN</span>
                <span className="text-[#10B981] font-bold">TLS 1.3 • AES-256</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                <span className="text-white/50">DESPACHO OFICIAL</span>
                <span className="text-white/90 font-semibold">Gmail OAuth + Meta API</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                <span className="text-white/50">ARQUITECTURA</span>
                <span className="text-[#C89D54] font-semibold">Multi-Sede Cloud</span>
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] text-white/45 pt-1">
              <span>DIAZ LAB AUTOMATION</span>
              <span>BARRANQUILLA, COL</span>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (7 COLS): PANEL DE AUTENTICACIÓN WABI-SABI TITANIUM */}
        <div className="lg:col-span-7 bg-[#FAF9F5] text-[#141518] p-6 sm:p-8 flex flex-col justify-between">
          {/* Cabezote del Panel de Login */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
            <div className="flex items-center gap-3">
              <FrantLogo variant="dark" size={38} />
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className="font-['Space_Grotesk',sans-serif] text-xl font-bold tracking-tight text-[#141518] m-0 leading-none"
                    style={{ color: '#141518' }}
                  >
                    FRANT ERP
                  </h1>
                  <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#D9381E]/10 text-[#D9381E] font-bold">
                    PORTAL SEGURO
                  </span>
                </div>
                <p className="text-xs text-[#57544E] m-0 mt-1">
                  {!isRegisterOpen ? 'Ingresa tus credenciales operativas o PIN de sede' : 'Registro de nueva empresa en la nube'}
                </p>
              </div>
            </div>
          </div>

          {/* Cuerpo Principal: Login o Registro Compacto */}
          <div className="my-4">
            {!isRegisterOpen ? (
              <div className="space-y-4">
                {error && (
                  <div className="px-3.5 py-2.5 bg-[#FEF2F2] border border-[#D9381E] border-l-4 rounded text-[#D9381E] text-xs font-semibold">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1.5">
                      Usuario o Teléfono Móvil
                    </label>
                    <div className="flex items-center border border-[#D5D1C8] focus-within:border-[#141518] rounded-lg bg-white overflow-hidden transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                      <select
                        value={selectedCountry}
                        onChange={e => setSelectedCountry(e.target.value)}
                        className="bg-[#F1EFEA] border-0 border-r border-[#D5D1C8] text-[#141518] text-xs font-mono font-bold py-2.5 px-2.5 cursor-pointer outline-none"
                        title="Cambiar indicativo de país"
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
                        className="flex-1 border-0 outline-none py-2.5 px-3 text-sm text-[#141518] bg-white font-medium placeholder:text-[#8C8983]"
                      />
                    </div>

                    {username.trim() && (
                      <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 bg-[#F1EFEA] border border-[#E2DFD7] rounded text-[11px] text-[#3F3D38] font-mono">
                        {isNumericPhone ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[#D9381E]"></span>
                            <span>Modo Teléfono • Búsqueda inteligente por 10 dígitos</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[#141518]"></span>
                            <span>Modo Usuario Alfanumérico</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1.5">
                      Contraseña o PIN de Acceso
                    </label>
                    <div className="relative w-full">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full py-2.5 pl-3 pr-10 border border-[#D5D1C8] focus:border-[#141518] rounded-lg bg-white text-sm text-[#141518] outline-none transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#6B6862] hover:text-[#141518] cursor-pointer flex items-center justify-center p-1"
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
                    className="w-full bg-[#141518] hover:bg-[#D9381E] text-white border-0 py-3 px-5 rounded-xl font-mono text-xs font-bold uppercase tracking-[0.14em] cursor-pointer transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(20,21,24,0.18)]"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>sync</span>
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                        </svg>
                        <span>Iniciar Sesión en Frant ERP</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Separador Ó */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-[#E2DFD7]" />
                  <span className="font-mono text-[10px] text-[#6B6862] font-bold uppercase tracking-widest">O ACCEDE CON</span>
                  <div className="flex-1 h-px bg-[#E2DFD7]" />
                </div>

                {/* Botón Google OAuth */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white hover:bg-[#F1EFEA] text-[#141518] border border-[#D5D1C8] hover:border-[#141518] py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2.5 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continuar con Google Workspace / Gmail</span>
                </button>

                {/* Enlace para Registrar Empresa */}
                <div className="text-center pt-1">
                  <p className="text-xs text-[#57544E] m-0">
                    ¿Aún no has registrado tu empresa o negocio?{' '}
                    <button
                      type="button"
                      onClick={() => { setError(null); setIsRegisterOpen(true); }}
                      className="bg-transparent border-0 text-[#D9381E] font-bold cursor-pointer text-xs p-0 underline underline-offset-4 hover:text-[#141518]"
                    >
                      Regístrala aquí
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* Vista Compacta en Grid de 2 Columnas para Registro de Nueva Empresa */
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-2">
                  <h3 className="font-['Space_Grotesk',sans-serif] text-base font-bold m-0 text-[#141518]">
                    Crear Nueva Cuenta Empresarial
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="bg-transparent border-0 text-[#6B6862] hover:text-[#141518] cursor-pointer flex items-center text-xs font-mono font-bold"
                  >
                    ✕ Cerrar
                  </button>
                </div>

                {regError && (
                  <div className="px-3 py-2 bg-[#FEF2F2] border border-[#D9381E] border-l-4 text-[#D9381E] text-xs font-semibold">
                    {regError}
                  </div>
                )}

                {regSuccess && (
                  <div className="px-3 py-2 bg-[#ECFDF5] border border-[#10B981] border-l-4 text-[#065F46] text-xs font-semibold">
                    {regSuccess}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Isac Gómez"
                        value={regContactName}
                        onChange={e => setRegContactName(e.target.value)}
                        className="w-full py-2 px-2.5 border border-[#D5D1C8] rounded-lg text-xs text-[#141518] bg-white outline-none focus:border-[#141518]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        Empresa / Negocio *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Óptica Visión Clara"
                        value={regBusinessName}
                        onChange={e => setRegBusinessName(e.target.value)}
                        className="w-full py-2 px-2.5 border border-[#D5D1C8] rounded-lg text-xs text-[#141518] bg-white outline-none focus:border-[#141518]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        País *
                      </label>
                      <select
                        value={regCountry}
                        onChange={e => setRegCountry(e.target.value)}
                        className="w-full py-2 px-2.5 border border-[#D5D1C8] rounded-lg text-xs text-[#141518] bg-white outline-none cursor-pointer"
                      >
                        {COUNTRY_LIST.map(c => (
                          <option key={c.country} value={c.country}>
                            {c.flag} {c.country} (+{c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        Sector / Rubro *
                      </label>
                      <select
                        value={regCategory}
                        onChange={e => setRegCategory(e.target.value)}
                        className="w-full py-2 px-2.5 border border-[#D5D1C8] rounded-lg text-xs text-[#141518] bg-white outline-none cursor-pointer"
                      >
                        <option value="optica">Óptica & Salud Visual</option>
                        <option value="pos">Tienda POS & Comercio General</option>
                        <option value="moda">Moda, Calzado & Accesorios</option>
                        <option value="restaurante">Restaurante / Gastronomía</option>
                        <option value="general">Almacén & Distribuidora</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        Usuario de Acceso *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. optica_vision"
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        className="w-full py-2 px-2.5 border border-[#D5D1C8] rounded-lg text-xs text-[#141518] bg-white outline-none focus:border-[#141518]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        WhatsApp / Móvil *
                      </label>
                      <div className="flex border border-[#D5D1C8] rounded-lg overflow-hidden bg-white">
                        <div className="bg-[#F1EFEA] border-r border-[#D5D1C8] px-2 py-2 text-[11px] font-mono font-bold text-[#3F3D38] flex items-center gap-1 whitespace-nowrap">
                          <span>{regSelectedCountryObj.flag}</span>
                          <span>+{regSelectedCountryObj.code}</span>
                        </div>
                        <input
                          type="tel"
                          placeholder="3116718652"
                          value={regPhone}
                          onChange={e => setRegPhone(e.target.value.replace(/D/g, ''))}
                          className="flex-1 border-0 py-2 px-2.5 text-xs outline-none text-[#141518] min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        Correo (Opcional)
                      </label>
                      <input
                        type="email"
                        placeholder="ejemplo@empresa.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        className="w-full py-2 px-2.5 border border-[#D5D1C8] rounded-lg text-xs text-[#141518] bg-white outline-none focus:border-[#141518]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold text-[#3F3D38] uppercase tracking-wider mb-1">
                        Contraseña o PIN *
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="w-full py-2 px-2.5 border border-[#D5D1C8] rounded-lg text-xs text-[#141518] bg-white outline-none focus:border-[#141518]"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-[#D5D1C8] bg-white text-[#3F3D38] font-mono text-[11px] font-bold uppercase cursor-pointer"
                    >
                      ← Volver
                    </button>
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="flex-1 bg-[#D9381E] hover:bg-[#b82b14] text-white border-0 py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {regLoading ? 'Registrando...' : 'Completar Registro'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Footer Compacto de Cumplimiento Legal */}
          <div className="border-t border-[#E2DFD7] pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#6B6862]">
            <span className="font-mono text-[10px]">FRANT ERP © 2026</span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => { setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
                className="bg-transparent border-0 text-[#3F3D38] hover:text-[#D9381E] cursor-pointer text-[11px] font-medium p-0"
              >
                Términos
              </button>
              <span className="text-[#D5D1C8]">•</span>
              <button
                type="button"
                onClick={() => { setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
                className="bg-transparent border-0 text-[#3F3D38] hover:text-[#D9381E] cursor-pointer text-[11px] font-medium p-0"
              >
                Privacidad (Habeas Data)
              </button>
              <span className="text-[#D5D1C8]">•</span>
              <button
                type="button"
                onClick={() => { setLegalModalTab('ia_transparency'); setIsLegalModalOpen(true); }}
                className="bg-transparent border-0 text-[#D9381E] cursor-pointer text-[11px] font-bold p-0"
              >
                Transparencia IA
              </button>
            </div>
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
            maxWidth: '440px',
            backgroundColor: '#FAF8F3',
            border: '1px solid #E2DFD7',
            borderRadius: '4px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
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
                background: '#FFFFFF',
                border: '1px solid #E2DFD7',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6B6862',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#161616';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#6B6862';
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
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: '#161616', fontFamily: 'var(--font-serif, serif)' }}>
                Selecciona una cuenta
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B6862' }}>
                para continuar en <strong style={{ color: '#161616' }}>Frant ERP</strong>
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
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2DFD7',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAF8F5';
                    e.currentTarget.style.borderColor = '#161616';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E2DFD7';
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#161616',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}>
                    ID
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#161616', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Isac Diaz
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B6862', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      isacdiazb@gmail.com
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6B6862' }}>chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeGoogleAuth('wahidkaftan@gmail.com')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2DFD7',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAF8F5';
                    e.currentTarget.style.borderColor = '#161616';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E2DFD7';
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#161616',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}>
                    IB
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#161616', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Isac David Diaz Barros
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B6862', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      wahidkaftan@gmail.com
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6B6862' }}>chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeGoogleAuth('diazbisac@gmail.com')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2DFD7',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAF8F5';
                    e.currentTarget.style.borderColor = '#161616';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E2DFD7';
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#D9381E',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}>
                    ID
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#161616', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Isac Diaz (Empresarial)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B6862', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      diazbisac@gmail.com
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6B6862' }}>chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomGoogleInput(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FAF8F3',
                    border: '1px dashed #E2DFD7',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#161616',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    marginTop: '0.2rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#161616';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAF8F3';
                    e.currentTarget.style.borderColor = '#E2DFD7';
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2DFD7',
                    color: '#161616',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                  </div>
                  <span style={{ flex: 1 }}>Usar otra cuenta de Google</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6B6862' }}>add</span>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6862', textTransform: 'uppercase' }}>
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
                      fontSize: '0.88rem',
                      border: '1px solid #E2DFD7',
                      borderRadius: '3px',
                      outline: 'none',
                      color: '#161616',
                      backgroundColor: '#FFFFFF',
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
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2DFD7',
                      borderRadius: '3px',
                      color: '#6B6862',
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
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      backgroundColor: '#161616',
                      border: '1px solid #161616',
                      borderRadius: '3px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D9381E'; e.currentTarget.style.borderColor = '#D9381E'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#161616'; e.currentTarget.style.borderColor = '#161616'; }}
                  >
                    Continuar
                  </button>
                </div>
              </form>
            )}

            <div style={{ textAlign: 'center', paddingTop: '0.5rem', borderTop: '1px solid #E2DFD7' }}>
              <p style={{ fontSize: '0.72rem', color: '#6B6862', margin: 0, lineHeight: 1.4 }}>
                Antes de usar esta aplicación, puedes consultar la{' '}
                <button
                  type="button"
                  onClick={() => { setIsGoogleModalOpen(false); setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
                  style={{ background: 'none', border: 'none', color: '#D9381E', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontWeight: 600 }}
                >
                  Política de Privacidad
                </button>{' '}
                y los{' '}
                <button
                  type="button"
                  onClick={() => { setIsGoogleModalOpen(false); setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
                  style={{ background: 'none', border: 'none', color: '#D9381E', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontWeight: 600 }}
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
              {(mfaAvailableMethods.includes('totp') || mfaAvailableMethods.length === 0) && (
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

            {mfaSelectedMethod === 'totp' && (
              <div style={{ backgroundColor: '#FAF8F3', border: '1px solid #E2DFD7', padding: '8px 12px', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#161616', textAlign: 'center', fontWeight: 600 }}>
                  🔑 Abre Google Authenticator o Authy en tu celular e ingresa el código actual de 6 dígitos.
                </p>
              </div>
            )}

            {/* Acción de Envío si es Correo */}
            {mfaSelectedMethod === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleSendMfaOtp('email')}
                  disabled={mfaLoading}
                  style={{
                    padding: '0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: mfaSuccessMsg ? '#FAF8F3' : '#161616',
                    border: '1px solid #161616',
                    color: mfaSuccessMsg ? '#161616' : '#FFFFFF',
                    cursor: mfaLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, animation: mfaLoading ? 'spin 1s linear infinite' : 'none' }}>
                    {mfaLoading ? 'sync' : (mfaSuccessMsg ? 'refresh' : 'send')}
                  </span>
                  {mfaLoading 
                    ? 'Enviando código...' 
                    : (mfaSuccessMsg 
                        ? 'Reenviar código al correo' 
                        : '📩 Solicitar / Enviar Código al Correo'
                      )}
                </button>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B6862', textAlign: 'center' }}>
                  ✉️ Presiona el botón para recibir el código de 6 dígitos en tu bandeja de correo.
                </p>
              </div>
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
