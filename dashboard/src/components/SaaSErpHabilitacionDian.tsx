import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface DianHabilitacionProps {
  clientId: string;
}

export const SaaSErpHabilitacionDian: React.FC<DianHabilitacionProps> = ({ clientId }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [personType, setPersonType] = useState<'natural' | 'juridica'>('natural');
  const [idType, setIdType] = useState<string>('NIT');
  const [idNumber, setIdNumber] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [taxResponsibility, setTaxResponsibility] = useState<string>('No responsable de IVA');
  const [municipality, setMunicipality] = useState<string>('Barranquilla / Atlántico');
  const [address, setAddress] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  
  // Test Set State
  const [testSetId, setTestSetId] = useState<string>('');
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [testProgress, setTestProgress] = useState<number>(0);
  const [dianStatus, setDianStatus] = useState<'pendiente' | 'en_pruebas' | 'habilitado'>('pendiente');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Cargar estado DIAN actual de la tienda
    fetch(`/api/clients/${clientId}/dian-status`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          if (json.data.status === 'habilitado') {
            setDianStatus('habilitado');
          }
          setIdNumber(json.data.nit || '');
          setCompanyName(json.data.name || '');
          setEmail(json.data.email || '');
          setAddress(json.data.address || '');
          if (json.data.testSetId) setTestSetId(json.data.testSetId);
        }
      })
      .catch(err => console.error("Error al cargar estado DIAN:", err));
  }, [clientId]);

  const handleStartTestSet = async () => {
    if (!testSetId.trim()) {
      setErrorMessage('Ingresa el código TestSetID proporcionado por el portal de la DIAN.');
      return;
    }

    setIsRunningTests(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTestProgress(1);

    // Simular o ejecutar llamadas progresivas del Set de Pruebas (20 facturas)
    const interval = setInterval(() => {
      setTestProgress(prev => {
        if (prev >= 20) {
          clearInterval(interval);
          return 20;
        }
        return prev + 1;
      });
    }, 250);

    try {
      const res = await fetch(`/api/clients/${clientId}/dian/test-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testSetId: testSetId.trim() })
      });

      const json = await res.json();
      if (json.success) {
        setTimeout(() => {
          setIsRunningTests(false);
          setDianStatus('habilitado');
          setSuccessMessage('¡Set de Pruebas autorizado con éxito por la DIAN! Tu negocio ahora está en estado HABILITADO.');
          setCurrentStep(5);
        }, 5000);
      } else {
        setIsRunningTests(false);
        setErrorMessage(json.message || 'Ocurrió un error al procesar el set de pruebas.');
      }
    } catch (err: any) {
      console.error(err);
      setIsRunningTests(false);
      setErrorMessage('Error de conexión con Factus API.');
    }
  };

  const steps = [
    { num: 1, label: 'Datos de tu empresa' },
    { num: 2, label: 'Habilitación DIAN' },
    { num: 3, label: 'Modos de Operación' },
    { num: 4, label: 'Set de pruebas' },
    { num: 5, label: 'Numeraciones & Prefijos' },
  ];

  return (
    <div className="space-y-6 text-[#161616] font-sans">
      {/* Header Estilo Wabi-Sabi Zen */}
      <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-code bg-[#D9381E]/10 text-[#D9381E] border border-[#D9381E]/30 px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider">
                ⚡ MÓDULO DIAN FACTUS
              </span>
            </div>
            <h2 className="text-2xl font-serif text-[#161616] flex items-center gap-2" style={{ fontFamily: '"Instrument Serif", serif' }}>
              <span className="material-symbols-outlined text-[#D9381E] text-[28px]">verified</span>
              Habilitación de Facturación Electrónica DIAN
            </h2>
            <p className="text-xs text-[#6B6862] mt-1">
              Sin costo de certificado digital. Habilita tu negocio en la DIAN en menos de 5 minutos mediante Factus API (Proveedor Tecnológico).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 ${
              dianStatus === 'habilitado' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                : 'bg-amber-50 text-amber-800 border border-amber-300'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              {dianStatus === 'habilitado' ? 'ESTADO: HABILITADO ANTE LA DIAN' : 'ESTADO: PENDIENTE DE HABILITACIÓN'}
            </span>
          </div>
        </div>

        {/* Stepper Superior Wabi-Sabi */}
        <div className="w-full overflow-x-auto pb-2 border-t border-[#E2DFD7] pt-4">
          <div className="flex items-center justify-between min-w-[650px] relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-[#E2DFD7] -z-0"></div>
            {steps.map((step) => {
              const isCompleted = step.num < currentStep || dianStatus === 'habilitado';
              const isActive = step.num === currentStep && dianStatus !== 'habilitado';

              return (
                <div 
                  key={step.num} 
                  onClick={() => setCurrentStep(step.num)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer z-10 bg-white px-3"
                >
                  <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center text-xs font-mono font-bold transition-all duration-200 border ${
                    isCompleted 
                      ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]' 
                      : isActive 
                      ? 'bg-[#D9381E] text-white border-[#D9381E] shadow-sm' 
                      : 'bg-[#F6F4EE] text-[#6B6862] border-[#E2DFD7]'
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={`text-[11px] tracking-tight ${
                    isActive ? 'text-[#161616] font-bold' : 'text-[#6B6862]'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mensajes de Alerta */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-[4px] text-xs font-medium flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-[4px] text-xs font-medium flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[20px] text-rose-600">error</span>
          {errorMessage}
        </div>
      )}

      {/* CONTENIDO DEL PASO 1: Datos de tu empresa */}
      {currentStep === 1 && (
        <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 max-w-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>Datos de la empresa</h3>
            <p className="text-xs text-[#6B6862]">Completa los datos de tu negocio para iniciar el proceso en la DIAN.</p>
          </div>

          <div className="flex gap-2 p-1 bg-[#F6F4EE] rounded-[4px] w-fit border border-[#E2DFD7]">
            <button
              type="button"
              onClick={() => setPersonType('natural')}
              className={`px-4 py-2 rounded-[4px] text-xs font-bold transition-all cursor-pointer border-0 ${
                personType === 'natural' ? 'bg-[#161616] text-[#F6F4EE]' : 'text-[#6B6862] hover:text-[#161616] bg-transparent'
              }`}
            >
              Persona natural
            </button>
            <button
              type="button"
              onClick={() => setPersonType('juridica')}
              className={`px-4 py-2 rounded-[4px] text-xs font-bold transition-all cursor-pointer border-0 ${
                personType === 'juridica' ? 'bg-[#161616] text-[#F6F4EE]' : 'text-[#6B6862] hover:text-[#161616] bg-transparent'
              }`}
            >
              Persona jurídica
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#6B6862]">Tipo de documento *</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616]"
              >
                <option value="NIT">NIT (Número de identificación tributaria)</option>
                <option value="CC">Cédula de Ciudadanía</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#6B6862]">Número de identificación (sin DV) *</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="ej. 1129520837"
                className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none font-mono focus:border-[#161616]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#6B6862]">
                {personType === 'natural' ? 'Nombre *' : 'Razón Social *'}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={personType === 'natural' ? 'ej. ISAC DAVID' : 'ej. 1 ÓPTICA NUEVO HORIZONTE S.A.S.'}
                className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none font-bold focus:border-[#161616]"
              />
            </div>

            {personType === 'natural' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#6B6862]">Apellidos *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="ej. DIAZ BARRIOS"
                  className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none font-bold focus:border-[#161616]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#6B6862]">Responsabilidad tributaria *</label>
              <select
                value={taxResponsibility}
                onChange={(e) => setTaxResponsibility(e.target.value)}
                className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616]"
              >
                <option value="No responsable de IVA">No responsable de IVA (Régimen Simplificado)</option>
                <option value="Responsable de IVA">Responsable de IVA (Régimen Común)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#6B6862]">Municipio / Departamento *</label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="ej. Barranquilla / Atlántico"
                className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616]"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-[#6B6862]">Dirección Comercial *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ej. Cra 16 sur No 46-64"
                className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616]"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-[#6B6862]">Correo electrónico para facturación *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. contabilidadjdetodo@gmail.com"
                className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2.5 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] text-xs font-bold rounded-[4px] flex items-center gap-2 transition cursor-pointer border-0"
            >
              Continuar
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO DEL PASO 2: Habilitación DIAN Registro */}
      {currentStep === 2 && (
        <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 max-w-3xl space-y-5 shadow-sm">
          <div>
            <span className="badge-code bg-[#D9381E]/10 text-[#D9381E] border border-[#D9381E]/30 px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold font-mono uppercase tracking-wider">Facturación Electrónica</span>
            <h3 className="text-xl font-serif text-[#161616] mt-1" style={{ fontFamily: '"Instrument Serif", serif' }}>Habilitación DIAN: Registro</h3>
            <p className="text-xs text-[#6B6862]">Sigue los pasos de la guía para registrarte como facturador electrónico en la DIAN.</p>
          </div>

          <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-5 rounded-[4px] space-y-4">
            <ol className="space-y-3 text-xs text-[#161616] list-decimal pl-4 font-medium">
              <li>
                Ingresa a la web de la DIAN por la opción <a href="https://catalogo-vpfe.dian.gov.co/User/Login" target="_blank" rel="noreferrer" className="text-[#D9381E] font-bold underline">"Habilitación"</a>.
              </li>
              <li>
                Elige tu tipo de usuario (Empresa o Persona Natural) y digita tu cédula/NIT.
              </li>
              <li>
                Revisa el correo electrónico que te envió la DIAN y haz clic en <strong>"Ingrese aquí"</strong> para acceder a la plataforma.
              </li>
              <li>
                En el menú lateral de la DIAN, elige <strong>"Registro y habilitación"</strong>. Haz clic en <strong>"Documentos electrónicos"</strong> y agrega tu correo de notificaciones.
              </li>
              <li>
                Haz clic en <strong>"Selecciona el modo de operación"</strong> y elige <strong>"Software de un proveedor tecnológico"</strong>.
              </li>
            </ol>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-[#E2DFD7] text-[#161616] text-xs font-bold rounded-[4px] cursor-pointer hover:bg-[#F6F4EE]"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] text-xs font-bold rounded-[4px] flex items-center gap-2 transition cursor-pointer border-0"
            >
              Continuar
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO DEL PASO 3: Modos de Operación */}
      {currentStep === 3 && (
        <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 max-w-3xl space-y-5 shadow-sm">
          <div>
            <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>Habilitación DIAN: Modos de operación</h3>
            <p className="text-xs text-[#6B6862]">Realiza los pasos de la guía y continúa con el proceso de habilitación.</p>
          </div>

          <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-5 rounded-[4px] space-y-3 text-xs text-[#161616]">
            <p className="font-bold text-[#D9381E]">En el portal de la DIAN:</p>
            <ul className="space-y-2.5 list-disc pl-4">
              <li>Ubica la sección <strong>"Datos de empresa y software"</strong>.</li>
              <li>Como empresa proveedora elige: <strong>FACTUS S.A.S.</strong> (o <strong>LOPEZSOFT S.A.S.</strong>).</li>
              <li>En nombre del software elige: <strong>Factus API</strong>.</li>
              <li>Presiona <strong>"Asociar"</strong>. En el listado de modos de operación, haz clic en el botón <strong>"Detalles del set de pruebas"</strong>.</li>
              <li>Copia el código alfanumérico largo llamado <strong>TestSetID</strong> que te muestra la DIAN.</li>
            </ul>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border border-[#E2DFD7] text-[#161616] text-xs font-bold rounded-[4px] cursor-pointer hover:bg-[#F6F4EE]"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] text-xs font-bold rounded-[4px] flex items-center gap-2 transition cursor-pointer border-0"
            >
              Ir a Set de Pruebas
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO DEL PASO 4: Envío del set de pruebas */}
      {currentStep === 4 && (
        <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 max-w-3xl space-y-6 shadow-sm">
          <div>
            <span className="badge-code bg-[#D9381E]/10 text-[#D9381E] border border-[#D9381E]/30 px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold font-mono uppercase tracking-wider">Facturación electrónica</span>
            <h3 className="text-2xl font-serif text-[#161616] mt-1" style={{ fontFamily: '"Instrument Serif", serif' }}>Envío del set de pruebas</h3>
            <p className="text-xs text-[#6B6862]">Trae el código generado por la DIAN y activa el inicio de tus pruebas automatizadas.</p>
          </div>

          <div className="space-y-2 bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7]">
            <label className="text-xs font-bold text-[#161616]">Código TestsetId *</label>
            <div className="flex gap-3 flex-col sm:flex-row">
              <input
                type="text"
                value={testSetId}
                onChange={(e) => setTestSetId(e.target.value)}
                placeholder="Agrega el código brindado por la DIAN (ej. 8a20f7b1-4c69...)"
                disabled={isRunningTests}
                className="flex-1 bg-white border border-[#E2DFD7] rounded-[4px] px-4 py-3 text-xs text-[#161616] outline-none font-mono focus:border-[#161616] transition-all"
              />
              <button
                type="button"
                onClick={handleStartTestSet}
                disabled={isRunningTests || !testSetId.trim()}
                className="px-6 py-3 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] font-bold text-xs rounded-[4px] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px] border-0"
              >
                {isRunningTests ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    Enviando ({testProgress}/20)...
                  </>
                ) : (
                  'Iniciar prueba'
                )}
              </button>
            </div>

            {/* Barra de Progreso */}
            {isRunningTests && (
              <div className="space-y-1.5 pt-3">
                <div className="flex justify-between text-[11px] font-mono font-bold text-[#D9381E]">
                  <span>Transmitiendo facturas de prueba a la DIAN via Factus...</span>
                  <span>{Math.round((testProgress / 20) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-[#E2DFD7] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#D9381E] transition-all duration-300 rounded-full"
                    style={{ width: `${(testProgress / 20) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 border border-[#E2DFD7] text-[#161616] text-xs font-bold rounded-[4px] cursor-pointer hover:bg-[#F6F4EE]"
            >
              Atrás
            </button>
            {dianStatus === 'habilitado' && (
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 bg-[#161616] text-[#F6F4EE] hover:bg-[#D9381E] text-xs font-bold rounded-[4px] flex items-center gap-2 cursor-pointer border-0"
              >
                Continuar a Numeraciones
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO DEL PASO 5: Numeraciones y Prefijos */}
      {currentStep === 5 && (
        <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 max-w-3xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-300 rounded-[4px] text-emerald-900">
            <span className="material-symbols-outlined text-[32px] text-emerald-600">verified</span>
            <div>
              <h4 className="font-serif font-bold text-base" style={{ fontFamily: '"Instrument Serif", serif' }}>¡FELICITACIONES! TU NEGOCIO YA ESTÁ HABILITADO ANTE LA DIAN</h4>
              <p className="text-xs opacity-90">Ya puedes emitir facturas electrónicas y documentos POS legalmente desde el Punto de Venta de tu ERP.</p>
            </div>
          </div>

          <div className="bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7] space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#6B6862]">Resolución y Prefijo Asociado</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-[4px] border border-[#E2DFD7]">
                <span className="text-[10px] text-[#6B6862]">Prefijo POS</span>
                <p className="font-bold font-mono text-[#D9381E]">SETP</p>
              </div>
              <div className="bg-white p-3 rounded-[4px] border border-[#E2DFD7]">
                <span className="text-[10px] text-[#6B6862]">Rango Autorizado</span>
                <p className="font-bold font-mono text-[#161616]">1 a 500.000</p>
              </div>
              <div className="bg-white p-3 rounded-[4px] border border-[#E2DFD7]">
                <span className="text-[10px] text-[#6B6862]">Proveedor</span>
                <p className="font-bold text-emerald-700 font-mono">Factus API (PT)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
