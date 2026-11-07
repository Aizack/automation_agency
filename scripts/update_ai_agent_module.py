import os

file_path = os.path.join(os.getcwd(), 'dashboard', 'src', 'components', 'SaaSErpAiAgentModule.tsx')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Captcha generator and states
state_target = '''  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState<string>(clientData?.metaPhoneNumberId || clientData?.meta_phone_number_id || '');
  const [metaWabaId, setMetaWabaId] = useState<string>(clientData?.metaWabaId || clientData?.meta_waba_id || '');
  const [metaToken, setMetaToken] = useState<string>(clientData?.metaWaToken || clientData?.meta_wa_token || '');'''

state_replacement = '''  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState<string>(clientData?.metaPhoneNumberId || clientData?.meta_phone_number_id || '');
  const [metaWabaId, setMetaWabaId] = useState<string>(clientData?.metaWabaId || clientData?.meta_waba_id || '');
  const [metaToken, setMetaToken] = useState<string>(clientData?.metaWaToken || clientData?.meta_wa_token || '');

  // Estados para Protección y Modales de Vinculación / Desvinculación de Meta
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(false);
  const [isConnectingMeta, setIsConnectingMeta] = useState<boolean>(false);
  const [showAdvancedMetaConfig, setShowAdvancedMetaConfig] = useState<boolean>(false);

  // Estados para el CAPTCHA Matemático en Imagen
  interface MathCaptcha {
    num1: number;
    num2: number;
    op: '+' | '-';
    answer: number;
    imageUrl: string;
  }
  const [mathCaptcha, setMathCaptcha] = useState<MathCaptcha | null>(null);
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [checkWarning1, setCheckWarning1] = useState<boolean>(false);
  const [checkWarning2, setCheckWarning2] = useState<boolean>(false);

  const generateCaptcha = (): MathCaptcha => {
    const isAddition = Math.random() > 0.4;
    let n1: number, n2: number, ans: number;
    if (isAddition) {
      n1 = Math.floor(Math.random() * 9) + 2;
      n2 = Math.floor(Math.random() * 8) + 1;
      ans = n1 + n2;
    } else {
      n1 = Math.floor(Math.random() * 9) + 6;
      n2 = Math.floor(Math.random() * (n1 - 2)) + 1;
      ans = n1 - n2;
    }
    const op = isAddition ? '+' : '-';

    const canvas = document.createElement('canvas');
    canvas.width = 190;
    canvas.height = 54;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F4EFE6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Líneas de seguridad
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = ['#CBD5E1', '#E2DFD7', '#94A3B8'][i % 3];
        ctx.lineWidth = 1 + Math.random();
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
      }

      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#161616';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(`${n1} ${op} ${n2} = ?`, canvas.width / 2, canvas.height / 2 + 1);

      // Puntos de ruido anti-bot
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = ['#A8A29E', '#78716C', '#D9381E'][i % 3];
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
      }
    }

    return {
      num1: n1,
      num2: n2,
      op,
      answer: ans,
      imageUrl: canvas.toDataURL('image/png')
    };
  };

  const openConnectWarning = () => {
    setCaptchaInput('');
    setCaptchaError(null);
    setCheckWarning1(false);
    setCheckWarning2(false);
    setMathCaptcha(generateCaptcha());
    setShowConnectModal(true);
  };

  const openDisconnectWarning = () => {
    setCaptchaInput('');
    setCaptchaError(null);
    setMathCaptcha(generateCaptcha());
    setShowDisconnectModal(true);
  };

  const handleConfirmConnect = () => {
    if (!checkWarning1 || !checkWarning2) {
      setCaptchaError('Debes marcar las casillas confirmando que leíste y cumpliste las condiciones de Meta.');
      return;
    }
    const val = parseInt(captchaInput.trim(), 10);
    if (isNaN(val) || val !== mathCaptcha?.answer) {
      setCaptchaError('El resultado matemático es incorrecto. Resuelve la operación mostrada en la imagen.');
      setMathCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    setShowConnectModal(false);

    // Iniciar Meta Embedded Signup oficial
    let capturedSessionData: any = null;
    const sessionHandler = (event: MessageEvent) => {
      try {
        const d = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (d?.type === 'WA_EMBEDDED_SIGNUP') {
          capturedSessionData = d.data;
        }
      } catch (e) {}
    };
    window.addEventListener('message', sessionHandler);

    if ((window as any).FB) {
      setIsConnectingMeta(true);
      (window as any).FB.login(async (response: any) => {
        window.removeEventListener('message', sessionHandler);
        if (response.authResponse?.code) {
          try {
            const res = await fetch('/api/v1/meta/oauth/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId,
                code: response.authResponse.code,
                phoneNumberId: capturedSessionData?.phone_number_id,
                wabaId: capturedSessionData?.waba_id
              })
            });
            const json = await res.json();
            if (json.success) {
              if (capturedSessionData?.phone_number_id) setMetaPhoneNumberId(capturedSessionData.phone_number_id);
              if (capturedSessionData?.waba_id) setMetaWabaId(capturedSessionData.waba_id);
              if (json.data?.accessToken) setMetaToken(json.data.accessToken);
              alert('🎉 ¡Número oficial de WhatsApp Business vinculado y conectado con Meta Cloud API exitosamente!');
            } else {
              alert(`❌ Error vinculando con Meta: ${json.error || 'Código rechazado'}`);
            }
          } catch (err: any) {
            alert(`❌ Error de conexión con el servidor: ${err.message}`);
          } finally {
            setIsConnectingMeta(false);
          }
        } else {
          setIsConnectingMeta(false);
        }
      }, {
        config_id: '1789269002280145',
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v4' }
      });
    } else {
      alert('⚠️ El SDK de Facebook se está inicializando. Por favor intenta de nuevo en unos segundos.');
    }
  };

  const handleConfirmDisconnect = async () => {
    const val = parseInt(captchaInput.trim(), 10);
    if (isNaN(val) || val !== mathCaptcha?.answer) {
      setCaptchaError('El resultado matemático es incorrecto. Resuelve la operación mostrada en la imagen.');
      setMathCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    try {
      const res = await fetch('/api/v1/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });
      const json = await res.json();
      if (json.success) {
        setMetaPhoneNumberId('');
        setMetaWabaId('');
        setMetaToken('');
        setShowDisconnectModal(false);
        alert('🟢 El canal de Meta WhatsApp ha sido desvinculado exitosamente.');
      } else {
        alert(`❌ Error al desvincular: ${json.error}`);
      }
    } catch (err: any) {
      alert(`❌ Error de conexión: ${err.message}`);
    }
  };'''

# 2. Replace the UI block for channelMode === 'meta'
ui_target = '''                {/* VISTA 1: META CLOUD API (TECH PROVIDER / EMBEDDED SIGNUP) */}
                {channelMode === 'meta' && (
                  <div className="space-y-5">
                    <div className="p-5 bg-[#0866FF]/5 border border-[#0866FF]/20 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-[#0866FF]">
                        <span className="material-symbols-outlined text-[22px]">verified_user</span>
                        <h4 className="font-bold text-sm">Conexión Oficial Meta Cloud API (Embedded Signup)</h4>
                      </div>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        Conecta tu número corporativo de WhatsApp Business directamente mediante la plataforma oficial de Meta. No requiere tener teléfono celular encendido ni escanear códigos QR.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          const metaAppId = '1534078441779001';
                          const redirectUri = encodeURIComponent('https://frant.app/api/v1/meta/oauth/callback');
                          const metaUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirectUri}&scope=whatsapp_business_messaging,whatsapp_business_management&response_type=code`;
                          window.open(metaUrl, '_blank', 'width=600,height=700');
                        }}
                        className="w-full py-3.5 bg-[#0866FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2.5 transition cursor-pointer shadow-md"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span>Conectar con Facebook (Inicio de Sesión Meta)</span>
                      </button>
                    </div>

                    {/* Formulario de Configuración Manual de Credenciales de Meta */}
                    <div className="p-5 bg-[#FAF8F3] border border-[#E2DFD7] rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#1C1B1A]">Credenciales Directas de Meta Cloud API</span>
                        <div className="flex items-center gap-2">
                          <a
                            href="/test-whatsapp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-[#0866FF] hover:bg-[#0052cc] text-white text-[10px] font-bold rounded-md transition flex items-center gap-1 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">terminal</span>
                            <span>Abrir Test_whatsapp_business_messaging</span>
                          </a>
                          <span className="text-[10px] font-mono text-[#6E6B65]">Graph API v21.0</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-[#475569] block mb-1">Phone Number ID de Meta</label>
                          <input
                            type="text"
                            value={metaPhoneNumberId}
                            onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                            placeholder="Ej. 102938475612345"
                            className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-[#1C1B1A] font-mono outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-[#475569] block mb-1">WABA ID (WhatsApp Business Account)</label>
                          <input
                            type="text"
                            value={metaWabaId}
                            onChange={(e) => setMetaWabaId(e.target.value)}
                            placeholder="Ej. 109876543210987"
                            className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-[#1C1B1A] font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#475569] block mb-1">Token de Acceso Permanente (EAAG...)</label>
                        <input
                          type="password"
                          value={metaToken}
                          onChange={(e) => setMetaToken(e.target.value)}
                          placeholder="EAAG..."
                          className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-[#1C1B1A] font-mono outline-none"
                        />
                      </div>

                      {/* Botones de Guardar & Activar Registro */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#E2DFD7]/60">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/clients/${clientId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  meta_phone_number_id: metaPhoneNumberId,
                                  meta_waba_id: metaWabaId,
                                  meta_wa_token: metaToken
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert('✅ Credenciales de Meta Cloud API guardadas y vinculadas exitosamente.');
                              } else {
                                alert(`❌ Error: ${data.message || data.error}`);
                              }
                            } catch (err: any) {
                              alert(`❌ Error: ${err.message}`);
                            }
                          }}
                          className="flex-1 py-2.5 bg-[#1C1B1A] hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          <span>Guardar Credenciales de Meta</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/v1/meta/register-number', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  phoneNumberId: metaPhoneNumberId,
                                  token: metaToken,
                                  pin: '123456'
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert('🟢 ¡Número de teléfono registrado y ACTIVADO exitosamente en Meta Cloud API!');
                              } else {
                                alert(`❌ Error: ${data.error}`);
                              }
                            } catch (err: any) {
                              alert(`❌ Error: ${err.message}`);
                            }
                          }}
                          className="flex-1 py-2.5 bg-[#0866FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Registrar Número en Meta API</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}'''

ui_replacement = '''                {/* VISTA 1: META CLOUD API (TECH PROVIDER / EMBEDDED SIGNUP CON BLINDAJE) */}
                {channelMode === 'meta' && (
                  <div className="space-y-5">
                    {/* Tarjeta de Estado y Acción de Vinculación */}
                    <div className="p-6 bg-white border border-[#E2DFD7] rounded-2xl shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DFD7] pb-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-[#0866FF]/10 text-[#0866FF] flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-[20px]">cloud_done</span>
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-[#1C1B1A]">WhatsApp Business Cloud API Oficial</h4>
                            <p className="text-[11px] text-[#6E6B65]">Conexión en la nube sin celular encendido ni códigos QR</p>
                          </div>
                        </div>

                        {Boolean(metaToken && metaPhoneNumberId) ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            CANAL VINCULADO & ACTIVO
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold font-mono rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            PENDIENTE DE VINCULAR
                          </span>
                        )}
                      </div>

                      {/* Información de la línea conectada */}
                      {Boolean(metaToken && metaPhoneNumberId) ? (
                        <div className="bg-[#FAF8F3] border border-[#E2DFD7] p-4 rounded-xl space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] text-[#6E6B65] uppercase font-mono font-bold block">Phone Number ID Oficial:</span>
                              <span className="font-mono font-bold text-[#1C1B1A]">{metaPhoneNumberId}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#6E6B65] uppercase font-mono font-bold block">WABA ID (Cuenta de Empresa):</span>
                              <span className="font-mono font-bold text-[#1C1B1A]">{metaWabaId || 'Asignada por Meta'}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#E2DFD7]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <span className="text-xs text-[#15803d] font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              La IA está respondiendo automáticamente a tus pacientes en este número oficial.
                            </span>

                            <button
                              type="button"
                              onClick={openDisconnectWarning}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-[#D9381E] border border-red-200 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              <span className="material-symbols-outlined text-[16px]">link_off</span>
                              <span>Desvincular Número</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-xs text-[#475569] leading-relaxed">
                            Vincula tu número corporativo con un solo clic a través del flujo oficial de Meta (Embedded Signup). El asistente de Facebook registrará tu línea en los servidores de WhatsApp para atención 24/7.
                          </p>

                          <button
                            type="button"
                            disabled={isConnectingMeta}
                            onClick={openConnectWarning}
                            className="w-full py-3.5 bg-[#0866FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2.5 transition cursor-pointer shadow-md disabled:opacity-50"
                          >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            <span>{isConnectingMeta ? 'Procesando con Meta...' : 'Vincular Número de WhatsApp (1 Clic Oficial)'}</span>
                          </button>
                        </div>
                      )}

                      {/* Botón Plegable para Opciones Avanzadas / Manuales */}
                      <div className="pt-2 border-t border-[#E2DFD7] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedMetaConfig(!showAdvancedMetaConfig)}
                          className="text-[11px] text-[#6E6B65] hover:text-[#161616] font-mono font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {showAdvancedMetaConfig ? 'expand_less' : 'tune'}
                          </span>
                          <span>{showAdvancedMetaConfig ? 'Ocultar credenciales avanzadas' : 'Ver credenciales técnicas avanzadas'}</span>
                        </button>

                        <a
                          href="/test-whatsapp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#0866FF] hover:underline font-mono font-bold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">terminal</span>
                          <span>Abrir Test cURL</span>
                        </a>
                      </div>

                      {/* Formulario Manual Plegado */}
                      {showAdvancedMetaConfig && (
                        <div className="p-4 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-3 text-xs animate-fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-[#475569] block mb-1">Phone Number ID</label>
                              <input
                                type="text"
                                value={metaPhoneNumberId}
                                onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                                placeholder="Ej. 102938475612345"
                                className="w-full bg-white border border-[#E2DFD7] rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-[#475569] block mb-1">WABA ID</label>
                              <input
                                type="text"
                                value={metaWabaId}
                                onChange={(e) => setMetaWabaId(e.target.value)}
                                placeholder="Ej. 109876543210987"
                                className="w-full bg-white border border-[#E2DFD7] rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-[#475569] block mb-1">Token de Acceso (EAAG...)</label>
                            <input
                              type="password"
                              value={metaToken}
                              onChange={(e) => setMetaToken(e.target.value)}
                              placeholder="EAAG..."
                              className="w-full bg-white border border-[#E2DFD7] rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none"
                            />
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/clients/${clientId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      meta_phone_number_id: metaPhoneNumberId,
                                      meta_waba_id: metaWabaId,
                                      meta_wa_token: metaToken
                                    })
                                  });
                                  const d = await res.json();
                                  if (d.success) alert('Credenciales guardadas.');
                                  else alert('Error: ' + (d.error || d.message));
                                } catch (e: any) {
                                  alert('Error: ' + e.message);
                                }
                              }}
                              className="px-3 py-1.5 bg-[#161616] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Guardar Manualmente
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MODAL 1: WARNING GIGANTE + CAPTCHA MATEMÁTICO EN IMAGEN (VINCULACIÓN) */}
                    {showConnectModal && (
                      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-2xl w-full border-4 border-[#D9381E] shadow-2xl overflow-hidden my-6">
                          {/* Header de Advertencia Alerta Roja */}
                          <div className="bg-[#D9381E] text-white p-5 text-center">
                            <span className="material-symbols-outlined text-4xl block mb-1 animate-bounce">warning</span>
                            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                              ¡¡¡¡CUIDADO, ANTES DE CONTINUAR POR FAVOR LEE LO SIGUIENTE!!!!
                            </h3>
                            <p className="text-xs text-white/90 font-medium mt-1">
                              Condiciones obligatorias de Meta para evitar bloqueos del número
                            </p>
                          </div>

                          <div className="p-6 space-y-5 text-xs text-[#1C1B1A] max-h-[65vh] overflow-y-auto">
                            {/* Advertencia Principal */}
                            <div className="p-4 bg-red-50 border-l-4 border-[#D9381E] text-red-950 space-y-2">
                              <p className="font-bold text-sm">
                                ⚠️ WhatsApp prohíbe terminantemente la duplicidad de números:
                              </p>
                              <p className="leading-relaxed">
                                Un número de teléfono <strong>NO PUEDE</strong> estar activo en la aplicación de WhatsApp de tu celular (WhatsApp Messenger o WhatsApp Business) y en la nube al mismo tiempo.
                              </p>
                            </div>

                            {/* Instrucciones Paso a Paso */}
                            <div className="space-y-3">
                              <h4 className="font-bold text-sm text-[#161616] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px] text-[#0866FF]">checklist</span>
                                ¿Cómo debes preparar tu número antes de continuar?
                              </h4>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-1.5">
                                  <span className="text-[10px] font-bold uppercase font-mono text-[#15803d] block">
                                    Opción 1: Número Nuevo (0 Riesgo)
                                  </span>
                                  <p className="text-[11px] text-[#475569] leading-snug">
                                    Usa una SIM prepago nueva o línea fija del local. Solo necesitas tenerla insertada en un celular para recibir el SMS de 6 dígitos de Meta.
                                  </p>
                                </div>

                                <div className="p-3 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-1.5">
                                  <span className="text-[10px] font-bold uppercase font-mono text-amber-700 block">
                                    Opción 2: Tu Número Actual
                                  </span>
                                  <p className="text-[11px] text-[#475569] leading-snug">
                                    Debes abrir WhatsApp en tu celular e ir a: <strong>Ajustes &gt; Cuenta &gt; Eliminar cuenta</strong>. Si no lo eliminas de la app, Meta detectará conflicto de duplicidad y <strong>bloqueará el número temporal o indefinidamente</strong>.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Checkboxes de Confirmación Humana */}
                            <div className="space-y-2.5 pt-2 border-t border-[#E2DFD7]">
                              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={checkWarning1}
                                  onChange={(e) => setCheckWarning1(e.target.checked)}
                                  className="mt-0.5 w-4 h-4 text-[#D9381E] rounded"
                                />
                                <span className="text-xs font-semibold leading-snug">
                                  Confirmo que mi número está libre de la aplicación móvil de WhatsApp (o es una línea nueva) y tengo el celular listo para recibir el código SMS de Meta.
                                </span>
                              </label>

                              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={checkWarning2}
                                  onChange={(e) => setCheckWarning2(e.target.checked)}
                                  className="mt-0.5 w-4 h-4 text-[#D9381E] rounded"
                                />
                                <span className="text-xs font-semibold leading-snug">
                                  Entiendo que no seguir estas instrucciones estrictamente puede causar el bloqueo del número por conflicto de duplicidad con Facebook/Meta.
                                </span>
                              </label>
                            </div>

                            {/* CAPTCHA Matemático en Imagen */}
                            <div className="p-4 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#161616]">
                                  🔒 Verificación Humana de Seguridad (Anti-Missclick)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMathCaptcha(generateCaptcha());
                                    setCaptchaInput('');
                                    setCaptchaError(null);
                                  }}
                                  className="text-[11px] text-[#0866FF] hover:underline font-mono font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0"
                                >
                                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                                  <span>Cambiar captcha</span>
                                </button>
                              </div>

                              <p className="text-[11px] text-[#6E6B65]">
                                Resuelve la operación matemática generada en la siguiente imagen de seguridad:
                              </p>

                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                {mathCaptcha?.imageUrl && (
                                  <img
                                    src={mathCaptcha.imageUrl}
                                    alt="Captcha Matemático"
                                    className="border border-[#CBD5E1] rounded-lg shadow-inner select-none pointer-events-none"
                                  />
                                )}
                                <input
                                  type="text"
                                  value={captchaInput}
                                  onChange={(e) => setCaptchaInput(e.target.value)}
                                  placeholder="Escribe el resultado..."
                                  className="w-full sm:w-44 bg-white border-2 border-[#CBD5E1] focus:border-[#161616] rounded-xl px-3 py-2 text-center text-sm font-mono font-bold outline-none"
                                />
                              </div>

                              {captchaError && (
                                <p className="text-xs text-[#D9381E] font-bold">{captchaError}</p>
                              )}
                            </div>
                          </div>

                          {/* Footer de Acciones */}
                          <div className="p-5 bg-gray-50 border-t border-[#E2DFD7] flex flex-col sm:flex-row items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setShowConnectModal(false)}
                              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-100 text-[#161616] border border-[#E2DFD7] rounded-xl text-xs font-bold font-mono transition cursor-pointer"
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={handleConfirmConnect}
                              className="w-full sm:w-auto px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[16px]">verified_user</span>
                              <span>CONFIRMAR Y VINCULAR CON META</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MODAL 2: WARNING GIGANTE + CAPTCHA MATEMÁTICO EN IMAGEN (DESVINCULACIÓN) */}
                    {showDisconnectModal && (
                      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-lg w-full border-4 border-[#D9381E] shadow-2xl overflow-hidden my-6">
                          {/* Header de Advertencia Alerta Roja */}
                          <div className="bg-[#D9381E] text-white p-5 text-center">
                            <span className="material-symbols-outlined text-4xl block mb-1">link_off</span>
                            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                              ¡¡¡¡CUIDADO, ANTES DE DESVINCULAR POR FAVOR LEE LO SIGUIENTE!!!!
                            </h3>
                            <p className="text-xs text-white/90 font-medium mt-1">
                              Acción de desconexión del canal oficial de WhatsApp
                            </p>
                          </div>

                          <div className="p-6 space-y-4 text-xs text-[#1C1B1A]">
                            <div className="p-4 bg-red-50 border-l-4 border-[#D9381E] text-red-950 space-y-2">
                              <p className="font-bold">
                                ⚠️ Efectos inmediatos de la desvinculación:
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                                <li>El Agente de Inteligencia Artificial dejará de responder mensajes de pacientes de forma inmediata.</li>
                                <li>Se eliminarán los tokens de acceso y credenciales de este canal en el software.</li>
                                <li>Si deseas volver a usar el número en tu celular, deberás esperar unos minutos para que Meta libere el registro.</li>
                              </ul>
                            </div>

                            {/* CAPTCHA Matemático en Imagen */}
                            <div className="p-4 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#161616]">
                                  🔒 Confirmación Humana Obligatoria
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMathCaptcha(generateCaptcha());
                                    setCaptchaInput('');
                                    setCaptchaError(null);
                                  }}
                                  className="text-[11px] text-[#0866FF] hover:underline font-mono font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0"
                                >
                                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                                  <span>Cambiar captcha</span>
                                </button>
                              </div>

                              <p className="text-[11px] text-[#6E6B65]">
                                Para evitar desvinculaciones accidentales (missclick), resuelve la operación matemática:
                              </p>

                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                {mathCaptcha?.imageUrl && (
                                  <img
                                    src={mathCaptcha.imageUrl}
                                    alt="Captcha Matemático"
                                    className="border border-[#CBD5E1] rounded-lg shadow-inner select-none pointer-events-none"
                                  />
                                )}
                                <input
                                  type="text"
                                  value={captchaInput}
                                  onChange={(e) => setCaptchaInput(e.target.value)}
                                  placeholder="Resultado..."
                                  className="w-full sm:w-36 bg-white border-2 border-[#CBD5E1] focus:border-[#161616] rounded-xl px-3 py-2 text-center text-sm font-mono font-bold outline-none"
                                />
                              </div>

                              {captchaError && (
                                <p className="text-xs text-[#D9381E] font-bold">{captchaError}</p>
                              )}
                            </div>
                          </div>

                          {/* Footer de Acciones */}
                          <div className="p-5 bg-gray-50 border-t border-[#E2DFD7] flex flex-col sm:flex-row items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setShowDisconnectModal(false)}
                              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-100 text-[#161616] border border-[#E2DFD7] rounded-xl text-xs font-bold font-mono transition cursor-pointer"
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={handleConfirmDisconnect}
                              className="w-full sm:w-auto px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                              <span>CONFIRMAR DESVINCULACIÓN</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}'''

content_norm = content.replace('\r\n', '\n')
state_target_norm = state_target.replace('\r\n', '\n')
state_repl_norm = state_replacement.replace('\r\n', '\n')
ui_target_norm = ui_target.replace('\r\n', '\n')
ui_repl_norm = ui_replacement.replace('\r\n', '\n')

if state_target_norm in content_norm:
    content_norm = content_norm.replace(state_target_norm, state_repl_norm, 1)
    print('Replaced states in SaaSErpAiAgentModule.tsx')
else:
    print('ERROR: state_target not found')

if ui_target_norm in content_norm:
    content_norm = content_norm.replace(ui_target_norm, ui_repl_norm, 1)
    print('Replaced UI in SaaSErpAiAgentModule.tsx')
else:
    print('ERROR: ui_target not found')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content_norm)

print('Updated SaaSErpAiAgentModule.tsx successfully')
