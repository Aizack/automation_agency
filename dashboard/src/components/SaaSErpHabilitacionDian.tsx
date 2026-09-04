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
    <div className="space-y-6 text-on-surface">
      {/* Header Estilo Alegra */}
      <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
              Habilitación de Facturación Electrónica DIAN
            </h2>
            <p className="text-xs text-on-surface-variant opacity-80 mt-1">
              Sin costo de certificado digital. Habilita tu negocio en la DIAN en menos de 5 minutos mediante Factus API (Proveedor Tecnológico).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              dianStatus === 'habilitado' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              {dianStatus === 'habilitado' ? 'ESTADO: HABILITADO ANTE LA DIAN' : 'ESTADO: PENDIENTE DE HABILITACIÓN'}
            </span>
          </div>
        </div>

        {/* Stepper Superior */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex items-center justify-between min-w-[650px] relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-outline/10 -z-0"></div>
            {steps.map((step) => {
              const isCompleted = step.num < currentStep || dianStatus === 'habilitado';
              const isActive = step.num === currentStep && dianStatus !== 'habilitado';

              return (
                <div 
                  key={step.num} 
                  onClick={() => setCurrentStep(step.num)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer z-10 bg-surface-container-lowest px-2"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-emerald-500 text-white shadow-md' 
                      : isActive 
                      ? 'bg-primary text-on-primary ring-4 ring-primary/20 scale-110 shadow-lg' 
                      : 'bg-surface-variant text-on-surface-variant opacity-60'
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold tracking-tight ${
                    isActive ? 'text-primary font-bold' : 'text-on-surface-variant opacity-75'
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
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {errorMessage}
        </div>
      )}

      {/* CONTENIDO DEL PASO 1: Datos de tu empresa */}
      {currentStep === 1 && (
        <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 max-w-3xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Datos de la empresa</h3>
            <p className="text-xs text-on-surface-variant">Completa los datos de tu negocio para iniciar el proceso en la DIAN.</p>
          </div>

          <div className="flex gap-4 p-1 bg-surface-container rounded-xl w-fit border border-outline/10">
            <button
              type="button"
              onClick={() => setPersonType('natural')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                personType === 'natural' ? 'bg-primary text-white shadow' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Persona natural
            </button>
            <button
              type="button"
              onClick={() => setPersonType('juridica')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                personType === 'juridica' ? 'bg-primary text-white shadow' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Persona jurídica
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant">Tipo de documento *</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
              >
                <option value="NIT">NIT (Número de identificación tributaria)</option>
                <option value="CC">Cédula de Ciudadanía</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant">Número de identificación (sin DV) *</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="ej. 1129520837"
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant">
                {personType === 'natural' ? 'Nombre *' : 'Razón Social *'}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={personType === 'natural' ? 'ej. ISAC DAVID' : 'ej. 1 ÓPTICA NUEVO HORIZONTE S.A.S.'}
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none font-bold"
              />
            </div>

            {personType === 'natural' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant">Apellidos *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="ej. DIAZ BARRIOS"
                  className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none font-bold"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant">Responsabilidad tributaria *</label>
              <select
                value={taxResponsibility}
                onChange={(e) => setTaxResponsibility(e.target.value)}
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
              >
                <option value="No responsable de IVA">No responsable de IVA (Régimen Simplificado)</option>
                <option value="Responsable de IVA">Responsable de IVA (Régimen Común)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant">Municipio / Departamento *</label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="ej. Barranquilla / Atlántico"
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-on-surface-variant">Dirección Comercial *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ej. Cra 16 sur No 46-64"
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-on-surface-variant">Correo electrónico para facturación *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. contabilidadjdetodo@gmail.com"
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow transition cursor-pointer"
            >
              Continuar
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO DEL PASO 2: Habilitación DIAN Registro */}
      {currentStep === 2 && (
        <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 max-w-3xl space-y-5">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Facturación Electrónica</span>
            <h3 className="text-xl font-bold text-on-surface mt-1">Habilitación DIAN: Registro</h3>
            <p className="text-xs text-on-surface-variant">Sigue los pasos de la guía para registrarte como facturador electrónico en la DIAN.</p>
          </div>

          <div className="bg-surface-container/50 border border-outline/10 p-5 rounded-xl space-y-4">
            <ol className="space-y-3 text-xs text-on-surface list-decimal pl-4 font-medium">
              <li>
                Ingresa a la web de la DIAN por la opción <a href="https://catalogo-vpfe.dian.gov.co/User/Login" target="_blank" rel="noreferrer" className="text-primary font-bold underline">"Habilitación"</a>.
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
              className="px-4 py-2 border border-outline/20 text-on-surface text-xs font-bold rounded-xl cursor-pointer"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow transition cursor-pointer"
            >
              Continuar
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO DEL PASO 3: Modos de Operación */}
      {currentStep === 3 && (
        <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 max-w-3xl space-y-5">
          <div>
            <h3 className="text-xl font-bold text-on-surface">Habilitación DIAN: Modos de operación</h3>
            <p className="text-xs text-on-surface-variant">Realiza los pasos de la guía y continúa con el proceso de habilitación.</p>
          </div>

          <div className="bg-surface-container/50 border border-outline/10 p-5 rounded-xl space-y-3 text-xs text-on-surface">
            <p className="font-bold text-primary">En el portal de la DIAN:</p>
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
              className="px-4 py-2 border border-outline/20 text-on-surface text-xs font-bold rounded-xl cursor-pointer"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow transition cursor-pointer"
            >
              Ir a Set de Pruebas
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO DEL PASO 4: Envío del set de pruebas */}
      {currentStep === 4 && (
        <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 max-w-3xl space-y-6">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Facturación electrónica</span>
            <h3 className="text-2xl font-black text-on-surface mt-1">Envío del set de pruebas</h3>
            <p className="text-xs text-on-surface-variant">Trae el código generado por la DIAN y activa el inicio de tus pruebas automatizadas.</p>
          </div>

          <div className="space-y-2 bg-surface-container/40 p-5 rounded-2xl border border-outline/10">
            <label className="text-xs font-bold text-on-surface">Código TestsetId *</label>
            <div className="flex gap-3 flex-col sm:flex-row">
              <input
                type="text"
                value={testSetId}
                onChange={(e) => setTestSetId(e.target.value)}
                placeholder="Agrega el código brindado por la DIAN (ej. 8a20f7b1-4c69...)"
                disabled={isRunningTests}
                className="flex-1 bg-surface-container border border-outline/20 rounded-xl px-4 py-3 text-xs text-on-surface outline-none font-mono focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={handleStartTestSet}
                disabled={isRunningTests || !testSetId.trim()}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]"
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
                <div className="flex justify-between text-[11px] font-bold text-primary">
                  <span>Transmitiendo facturas de prueba a la DIAN via Factus...</span>
                  <span>{Math.round((testProgress / 20) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
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
              className="px-4 py-2 border border-outline/20 text-on-surface text-xs font-bold rounded-xl cursor-pointer"
            >
              Atrás
            </button>
            {dianStatus === 'habilitado' && (
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow cursor-pointer"
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
        <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 max-w-3xl space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <span className="material-symbols-outlined text-[32px]">verified</span>
            <div>
              <h4 className="font-extrabold text-sm">¡FELICITACIONES! TU NEGOCIO YA ESTÁ HABILITADO ANTE LA DIAN</h4>
              <p className="text-xs opacity-90">Ya puedes emitir facturas electrónicas y documentos POS legalmente desde el Punto de Venta de tu ERP.</p>
            </div>
          </div>

          <div className="bg-surface-container/40 p-5 rounded-2xl border border-outline/10 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Resolución y Prefijo Asociado</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-surface-container p-3 rounded-xl border border-outline/10">
                <span className="text-[10px] text-on-surface-variant">Prefijo POS</span>
                <p className="font-bold font-mono text-primary">SETP</p>
              </div>
              <div className="bg-surface-container p-3 rounded-xl border border-outline/10">
                <span className="text-[10px] text-on-surface-variant">Rango Autorizado</span>
                <p className="font-bold font-mono">1 a 500.000</p>
              </div>
              <div className="bg-surface-container p-3 rounded-xl border border-outline/10">
                <span className="text-[10px] text-on-surface-variant">Proveedor</span>
                <p className="font-bold text-emerald-400">Factus API (PT)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
