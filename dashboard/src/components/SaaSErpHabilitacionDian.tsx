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

  // Carga también desde perfil general
  useEffect(() => {
    fetch(`/api/clients/${clientId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          if (!idNumber && json.data.nit) setIdNumber(json.data.nit);
          if (!companyName && json.data.name) setCompanyName(json.data.name);
          if (!email && json.data.email) setEmail(json.data.email);
          if (!address && json.data.address) setAddress(json.data.address);
          if (json.data.personType) setPersonType(json.data.personType);
          if (json.data.lastName) setLastName(json.data.lastName);
          if (json.data.municipality) setMunicipality(json.data.municipality);
        }
      })
      .catch(err => console.error("Error al cargar perfil general:", err));
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

  // Cálculo en tiempo real del % de llenado del formulario del Paso 1
  const calculateStep1Percent = () => {
    const fields = [idNumber, companyName, address, email, municipality];
    if (personType === 'natural') fields.push(lastName);
    const filled = fields.filter(f => f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const step1Percent = calculateStep1Percent();

  // Función para obtener el % de líquido por botella
  const getStepFillPercent = (stepNum: number) => {
    if (dianStatus === 'habilitado' || stepNum < currentStep) return 100;
    if (stepNum === currentStep) {
      if (stepNum === 1) return Math.max(10, step1Percent);
      if (stepNum === 2) return 50;
      if (stepNum === 3) return 50;
      if (stepNum === 4) return testSetId.trim() ? (isRunningTests ? Math.round((testProgress / 20) * 100) : 60) : 10;
      if (stepNum === 5) return 100;
    }
    return 0;
  };

  // Porcentaje de la barra de conexión hacia la siguiente botella
  const getConnectingLinePercent = (index: number) => {
    const nextStepNum = index + 2; // Paso destino
    if (dianStatus === 'habilitado' || nextStepNum <= currentStep) return 100;
    if (index + 1 === currentStep) {
      return getStepFillPercent(currentStep);
    }
    return 0;
  };

  return (
    <div className="space-y-6 text-[#161616] font-sans">
      {/* Header Estilo Wabi-Sabi Zen con Overflow Visible para Vasijas Libres */}
      <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 shadow-sm overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
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

        {/* Stepper Superior: Vasijas de Líquido ROJO KOI Animado con Conectores () */}
        <div className="w-full overflow-x-auto py-6 border-t border-[#E2DFD7] px-4 overflow-y-visible">
          <div className="flex items-center justify-between min-w-[720px] relative py-2">
            {steps.map((step, idx) => {
              const isCompleted = step.num < currentStep || dianStatus === 'habilitado';
              const isActive = step.num === currentStep && dianStatus !== 'habilitado';
              const fillPercent = getStepFillPercent(step.num);
              const hasNext = idx < steps.length - 1;

              return (
                <React.Fragment key={step.num}>
                  {/* BOTELLA / VASIJA ANIMADA */}
                  <div 
                    onClick={() => setCurrentStep(step.num)}
                    className="flex flex-col items-center cursor-pointer z-10 group relative"
                  >
                    {/* Tapón de Vasija */}
                    <div className={`w-4 h-1.5 rounded-t-sm transition-colors duration-500 mb-0.5 ${
                      fillPercent > 0 ? 'bg-[#D9381E]' : 'bg-[#E2DFD7]'
                    }`}></div>

                    {/* Cuerpo de la Vasija */}
                    <div className={`w-12 h-14 rounded-b-[16px] rounded-t-sm border-2 relative overflow-hidden transition-all duration-300 flex items-center justify-center shadow-sm ${
                      isActive 
                        ? 'border-[#D9381E] shadow-md scale-105 -translate-y-1' 
                        : isCompleted 
                        ? 'border-[#161616] bg-white' 
                        : 'border-[#E2DFD7] bg-[#F6F4EE]'
                    }`}>
                      {/* Líquido Rojo Bermellón KOI Animado */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#C84B31] via-[#D9381E] to-[#E64A19] transition-all duration-700 ease-out"
                        style={{ height: `${fillPercent}%` }}
                      >
                        {/* Onda de líquido pulsante */}
                        {fillPercent > 0 && fillPercent < 100 && (
                          <div className="h-1 bg-white/40 animate-pulse absolute top-0 left-0 right-0"></div>
                        )}
                      </div>

                      {/* Texto / Check con Contraste sobre Líquido */}
                      <span className={`relative z-10 font-mono text-xs font-bold transition-colors duration-300 drop-shadow-sm ${
                        fillPercent > 50 ? 'text-white' : 'text-[#161616]'
                      }`}>
                        {isCompleted || fillPercent === 100 ? (
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        ) : (
                          `0${step.num}`
                        )}
                      </span>
                    </div>

                    {/* Nombre del Paso */}
                    <span className={`text-[11px] mt-2 font-medium tracking-tight whitespace-nowrap transition-colors ${
                      isActive ? 'text-[#D9381E] font-bold' : isCompleted ? 'text-[#161616]' : 'text-[#6B6862]'
                    }`}>
                      {step.label}
                    </span>
                  </div>

                  {/* BARRA DE CONEXIÓN DINÁMICA ENTRE BOTELLAS */}
                  {hasNext && (
                    <div className="flex-1 h-[3px] bg-[#E2DFD7] relative overflow-hidden rounded-full mx-2 mb-6 self-center z-0">
                      <div 
                        className="h-full bg-gradient-to-r from-[#C84B31] to-[#D9381E] transition-all duration-500 ease-out"
                        style={{ width: `${getConnectingLinePercent(idx)}%` }}
                      ></div>
                    </div>
                  )}
                </React.Fragment>
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

      {/* GRID DE 2 COLUMNAS (Paso Actual + Panel Wabi-Sabi Normativa DIAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (7 Cols): Formulario / Contenido de Paso */}
        <div className="lg:col-span-7">
          {/* CONTENIDO DEL PASO 1: Datos de tu empresa */}
          {currentStep === 1 && (
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-6 shadow-sm">
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
                    placeholder="ej. 900123456"
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
                    placeholder={personType === 'natural' ? 'ej. JUAN CARLOS' : 'ej. MI EMPRESA S.A.S.'}
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
                      placeholder="ej. PÉREZ GÓMEZ"
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
                    placeholder="ej. Bogotá / Cundinamarca"
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616]"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-[#6B6862]">Dirección Comercial *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ej. Calle 100 # 15-20"
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616]"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-[#6B6862]">Correo electrónico para facturación *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. contacto@miempresa.com"
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
                  Guardar & Continuar
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* CONTENIDO DEL PASO 2: Habilitación DIAN Registro */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-5 shadow-sm">
              <div>
                <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>Habilitación DIAN: Registro</h3>
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
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-5 shadow-sm">
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
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-2xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>Envío del set de pruebas</h3>
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
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-6 shadow-sm">
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

        {/* COLUMNA DERECHA (5 Cols): Panel Wabi-Sabi & Normativa DIAN */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 shadow-sm space-y-4">
            <div className="border-b border-[#E2DFD7] pb-3">
              <span className="text-[10px] font-mono font-bold text-[#D9381E] uppercase tracking-wider block">Wabi-Sabi Paper Guide</span>
              <h3 className="text-xl font-serif text-[#161616] mt-0.5" style={{ fontFamily: '"Instrument Serif", serif' }}>
                Normativa & Guía DIAN
              </h3>
            </div>

            {/* Vasija indicador de progreso actual */}
            <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-4 rounded-[4px] flex items-center gap-4">
              <div className="w-12 h-14 bg-white border-2 border-[#161616] rounded-b-[16px] rounded-t-sm flex flex-col items-center justify-center font-mono font-bold text-[#D9381E] relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-[#D9381E] transition-all duration-500"
                  style={{ height: `${getStepFillPercent(currentStep)}%` }}
                ></div>
                <span className={`relative z-10 text-[10px] ${getStepFillPercent(currentStep) > 50 ? 'text-white' : 'text-[#6B6862]'}`}>Paso</span>
                <span className={`relative z-10 text-sm ${getStepFillPercent(currentStep) > 50 ? 'text-white' : 'text-[#161616]'}`}>0{currentStep}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs font-bold text-[#161616]">
                  <span>Estado de la Vasija Actual</span>
                  <span className="font-mono text-[#D9381E]">{getStepFillPercent(currentStep)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2DFD7] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#D9381E] transition-all duration-500"
                    style={{ width: `${getStepFillPercent(currentStep)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-[#6B6862]">Paso {currentStep} de 5 en progreso</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#6B6862]">
              <div className="flex items-start gap-2 pt-1 border-t border-[#E2DFD7]/60">
                <span className="material-symbols-outlined text-[16px] text-[#D9381E] mt-0.5">verified_user</span>
                <div>
                  <strong className="text-[#161616] block">Certificado Digital $0</strong>
                  <p className="text-[11px] leading-relaxed mt-0.5">Factus actúa como Proveedor Tecnológico (PT) oficial. Tu negocio firma legalmente con el certificado maestro sin tramitar firmas individuales.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-3 border-t border-[#E2DFD7]/60">
                <span className="material-symbols-outlined text-[16px] text-[#D9381E] mt-0.5">auto_awesome</span>
                <div>
                  <strong className="text-[#161616] block">Pruebas Desatendidas</strong>
                  <p className="text-[11px] leading-relaxed mt-0.5">Las 20 facturas requeridas por la DIAN se envían automáticamente al Sandbox de Factus API con un solo clic.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-3 border-t border-[#E2DFD7]/60">
                <span className="material-symbols-outlined text-[16px] text-[#D9381E] mt-0.5">support_agent</span>
                <div>
                  <strong className="text-[#161616] block">Asistencia & Normativa</strong>
                  <p className="text-[11px] leading-relaxed mt-0.5">Cumple totalmente con las Resoluciones 000042 y normativas de facturación electrónica y documento equivalente POS.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
