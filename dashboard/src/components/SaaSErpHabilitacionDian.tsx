import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface DianHabilitacionProps {
  clientId: string;
}

type ProviderType = 'factus' | 'alegra' | 'siigo';

export const SaaSErpHabilitacionDian: React.FC<DianHabilitacionProps> = ({ clientId }) => {
  const [activeProvider, setActiveProvider] = useState<ProviderType>('factus');
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Datos Generales de la Empresa
  const [personType, setPersonType] = useState<'natural' | 'juridica'>('natural');
  const [idType, setIdType] = useState<string>('NIT');
  const [idNumber, setIdNumber] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [taxResponsibility, setTaxResponsibility] = useState<string>('No responsable de IVA');
  const [municipality, setMunicipality] = useState<string>('Barranquilla / Atlántico');
  const [address, setAddress] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Estado Factus Habilitación DIAN
  const [testSetId, setTestSetId] = useState<string>('');
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [testProgress, setTestProgress] = useState<number>(0);
  const [dianStatus, setDianStatus] = useState<'pendiente' | 'en_pruebas' | 'habilitado'>('pendiente');

  // Estado Credenciales Alegra
  const [alegraEmail, setAlegraEmail] = useState<string>('');
  const [alegraToken, setAlegraToken] = useState<string>('');
  const [alegraTesting, setAlegraTesting] = useState<boolean>(false);
  const [alegraTestResult, setAlegraTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Estado Credenciales Siigo
  const [siigoUsername, setSiigoUsername] = useState<string>('');
  const [siigoAccessKey, setSiigoAccessKey] = useState<string>('');
  const [siigoPartnerId, setSiigoPartnerId] = useState<string>('');
  const [siigoDocumentTypeId, setSiigoDocumentTypeId] = useState<number>(24416);
  const [siigoTesting, setSiigoTesting] = useState<boolean>(false);
  const [siigoTestResult, setSiigoTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar configuración de la tienda al iniciar
  useEffect(() => {
    fetch(`/api/clients/${clientId}/electronic-invoicing/config`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const prov = (json.feProvider || 'factus').toLowerCase();
          if (prov === 'alegra' || prov === 'siigo' || prov === 'factus') {
            setActiveProvider(prov as ProviderType);
          }
          const creds = json.feCredentials || {};
          if (creds.email) setAlegraEmail(creds.email);
          if (creds.token) setAlegraToken(creds.token);
          if (creds.username) setSiigoUsername(creds.username);
          if (creds.access_key) setSiigoAccessKey(creds.access_key);
          if (creds.partner_id) setSiigoPartnerId(creds.partner_id);
          if (json.feSettings?.documentTypeId) setSiigoDocumentTypeId(json.feSettings.documentTypeId);
        }
      })
      .catch((err) => console.error('Error al cargar configuración FE:', err));

    fetch(`/api/clients/${clientId}/dian-status`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.status === 'habilitado') setDianStatus('habilitado');
          setIdNumber(json.data.nit || '');
          setCompanyName(json.data.name || '');
          setEmail(json.data.email || '');
          setAddress(json.data.address || '');
          if (json.data.testSetId) setTestSetId(json.data.testSetId);
        }
      })
      .catch((err) => console.error('Error al cargar estado DIAN:', err));

    fetch(`/api/clients/${clientId}`)
      .then((res) => res.json())
      .then((json) => {
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
      .catch((err) => console.error('Error al cargar perfil general:', err));
  }, [clientId]);

  // Manejar cambio de pestaña
  const handleSelectProviderTab = (provider: ProviderType) => {
    setActiveProvider(provider);
    setCurrentStep(1);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Guardar configuración del proveedor en backend
  const saveProviderConfig = async (provider: ProviderType, credentials: any, settings: any = {}) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/electronic-invoicing/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feProvider: provider, feCredentials: credentials, feSettings: settings }),
      });
      const json = await res.json();
      return json.success;
    } catch (err) {
      console.error('Error guardando proveedor:', err);
      return false;
    }
  };

  // Test set Factus
  const handleStartTestSet = async () => {
    if (!testSetId.trim()) {
      setErrorMessage('Ingresa el código TestSetID proporcionado por el portal de la DIAN.');
      return;
    }

    setIsRunningTests(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTestProgress(1);

    const interval = setInterval(() => {
      setTestProgress((prev) => {
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
        body: JSON.stringify({ testSetId: testSetId.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        await saveProviderConfig('factus', {});
        setTimeout(() => {
          setIsRunningTests(false);
          setDianStatus('habilitado');
          setSuccessMessage('¡Set de Pruebas autorizado con éxito por la DIAN! Tu negocio ahora está en estado HABILITADO.');
          setCurrentStep(5);
        }, 3000);
      } else {
        setIsRunningTests(false);
        setErrorMessage(json.message || 'Ocurrió un error al procesar el set de pruebas.');
      }
    } catch (err) {
      setIsRunningTests(false);
      setErrorMessage('Error de conexión con Factus API.');
    }
  };

  // Prueba de Conexión Alegra
  const handleTestAlegra = async () => {
    if (!alegraEmail.trim() || !alegraToken.trim()) {
      setErrorMessage('Ingresa el correo y el Token de API de Alegra.');
      return;
    }

    setAlegraTesting(true);
    setAlegraTestResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/electronic-invoicing/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'alegra', credentials: { email: alegraEmail, token: alegraToken } }),
      });

      const json = await res.json();
      setAlegraTestResult({
        success: json.success,
        message: json.message || (json.success ? 'Conexión exitosa con Alegra.' : 'Error de autenticación.'),
      });

      if (json.success) {
        setSuccessMessage('¡Conexión verificada exitosamente con la API de Alegra!');
      } else {
        setErrorMessage(json.message || 'No se pudo verificar las credenciales de Alegra.');
      }
    } catch (err: any) {
      setAlegraTestResult({ success: false, message: `Error de conexión: ${err.message}` });
      setErrorMessage(`Error de conexión con Alegra: ${err.message}`);
    } finally {
      setAlegraTesting(false);
    }
  };

  const handleSaveAlegraConfig = async () => {
    const ok = await saveProviderConfig('alegra', { email: alegraEmail, token: alegraToken });
    if (ok) {
      setSuccessMessage('¡Alegra guardado como tu proveedor de Facturación Electrónica activo!');
      setCurrentStep(5);
    } else {
      setErrorMessage('Error guardando la configuración de Alegra.');
    }
  };

  // Prueba de Conexión Siigo
  const handleTestSiigo = async () => {
    if (!siigoUsername.trim() || !siigoAccessKey.trim()) {
      setErrorMessage('Ingresa el usuario y la clave Access Key de Siigo Nube.');
      return;
    }

    setSiigoTesting(true);
    setSiigoTestResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/electronic-invoicing/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'siigo',
          credentials: { username: siigoUsername, access_key: siigoAccessKey, partner_id: siigoPartnerId },
        }),
      });

      const json = await res.json();
      setSiigoTestResult({
        success: json.success,
        message: json.message || (json.success ? 'Conexión exitosa con Siigo.' : 'Error de autenticación.'),
      });

      if (json.success) {
        setSuccessMessage('¡Conexión verificada exitosamente con la API de Siigo Nube!');
      } else {
        setErrorMessage(json.message || 'No se pudo verificar las credenciales de Siigo.');
      }
    } catch (err: any) {
      setSiigoTestResult({ success: false, message: `Error de conexión: ${err.message}` });
      setErrorMessage(`Error de conexión con Siigo: ${err.message}`);
    } finally {
      setSiigoTesting(false);
    }
  };

  const handleSaveSiigoConfig = async () => {
    const ok = await saveProviderConfig(
      'siigo',
      { username: siigoUsername, access_key: siigoAccessKey, partner_id: siigoPartnerId },
      { documentTypeId: siigoDocumentTypeId }
    );
    if (ok) {
      setSuccessMessage('¡Siigo Nube guardado como tu proveedor de Facturación Electrónica activo!');
      setCurrentStep(5);
    } else {
      setErrorMessage('Error guardando la configuración de Siigo.');
    }
  };

  // Pasos dinámicos según el proveedor seleccionado
  const stepsByProvider: Record<ProviderType, Array<{ num: number; label: string }>> = {
    factus: [
      { num: 1, label: 'Datos de tu empresa' },
      { num: 2, label: 'Habilitación DIAN' },
      { num: 3, label: 'Modos de Operación' },
      { num: 4, label: 'Set de pruebas' },
      { num: 5, label: 'Numeraciones & Prefijos' },
    ],
    alegra: [
      { num: 1, label: 'Datos de tu empresa' },
      { num: 2, label: 'Obtener Token Alegra' },
      { num: 3, label: 'Credenciales & Conexión' },
      { num: 4, label: 'Resolución de Factura' },
      { num: 5, label: 'Activación Exitosa' },
    ],
    siigo: [
      { num: 1, label: 'Datos de tu empresa' },
      { num: 2, label: 'Obtener Key Siigo' },
      { num: 3, label: 'Credenciales & Conexión' },
      { num: 4, label: 'Tipo Comprobante FV' },
      { num: 5, label: 'Activación Exitosa' },
    ],
  };

  const steps = stepsByProvider[activeProvider];

  const calculateStep1Percent = () => {
    const fields = [idNumber, companyName, address, email, municipality];
    const filled = fields.filter((f) => f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const step1Percent = calculateStep1Percent();

  const getStepFillPercent = (stepNum: number) => {
    if (stepNum < currentStep) return 100;
    if (stepNum === currentStep) {
      if (stepNum === 1) return Math.max(10, step1Percent);
      if (stepNum === 2) return 50;
      if (stepNum === 3) {
        if (activeProvider === 'alegra') return alegraTestResult?.success ? 100 : 50;
        if (activeProvider === 'siigo') return siigoTestResult?.success ? 100 : 50;
        return 50;
      }
      if (stepNum === 4) {
        if (activeProvider === 'factus') return testSetId.trim() ? (isRunningTests ? Math.round((testProgress / 20) * 100) : 60) : 10;
        return 80;
      }
      if (stepNum === 5) return 100;
    }
    return 0;
  };

  const getConnectingLinePercent = (index: number) => {
    const nextStepNum = index + 2;
    if (nextStepNum <= currentStep) return 100;
    if (index + 1 === currentStep) {
      return getStepFillPercent(currentStep);
    }
    return 0;
  };

  return (
    <div className="space-y-6 text-[#161616] font-sans">
      {/* PESTAÑAS SUPERIORES DE SELECCIÓN DE PROVEEDOR DE FACTURACIÓN */}
      <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-4 shadow-sm">
        <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-[0.2em] block mb-2">
          Selecciona tu Proveedor de Facturación Electrónica
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pestaña Factus */}
          <button
            type="button"
            onClick={() => handleSelectProviderTab('factus')}
            className={`p-3 rounded-[4px] border text-left cursor-pointer transition-all flex flex-col justify-between ${
              activeProvider === 'factus'
                ? 'border-2 border-[#D9381E] bg-[#FAF8F3] shadow-xs'
                : 'border-[#E2DFD7] bg-white hover:border-[#161616]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#D9381E] text-white px-2 py-0.5 rounded-xs">
                Incluido ERP
              </span>
              <span className="material-symbols-outlined text-base text-[#D9381E]">
                {activeProvider === 'factus' ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
            </div>
            <div className="mt-2">
              <h4 className="font-serif font-normal text-base text-[#161616]">Factus API</h4>
              <p className="text-[10px] text-[#6B6862]">Proveedor Tecnológico directo DIAN.</p>
            </div>
          </button>

          {/* Pestaña Alegra */}
          <button
            type="button"
            onClick={() => handleSelectProviderTab('alegra')}
            className={`p-3 rounded-[4px] border text-left cursor-pointer transition-all flex flex-col justify-between ${
              activeProvider === 'alegra'
                ? 'border-2 border-[#D9381E] bg-[#FAF8F3] shadow-xs'
                : 'border-[#E2DFD7] bg-white hover:border-[#161616]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#161616] text-white px-2 py-0.5 rounded-xs">
                Cuenta Propia
              </span>
              <span className="material-symbols-outlined text-base text-[#D9381E]">
                {activeProvider === 'alegra' ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
            </div>
            <div className="mt-2">
              <h4 className="font-serif font-normal text-base text-[#161616]">Alegra</h4>
              <p className="text-[10px] text-[#6B6862]">Conectar tu cuenta con API Token.</p>
            </div>
          </button>

          {/* Pestaña Siigo */}
          <button
            type="button"
            onClick={() => handleSelectProviderTab('siigo')}
            className={`p-3 rounded-[4px] border text-left cursor-pointer transition-all flex flex-col justify-between ${
              activeProvider === 'siigo'
                ? 'border-2 border-[#D9381E] bg-[#FAF8F3] shadow-xs'
                : 'border-[#E2DFD7] bg-white hover:border-[#161616]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#161616] text-white px-2 py-0.5 rounded-xs">
                Cuenta Propia
              </span>
              <span className="material-symbols-outlined text-base text-[#D9381E]">
                {activeProvider === 'siigo' ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
            </div>
            <div className="mt-2">
              <h4 className="font-serif font-normal text-base text-[#161616]">Siigo Nube</h4>
              <p className="text-[10px] text-[#6B6862]">Conectar tu paquete con Access Key.</p>
            </div>
          </button>
        </div>
      </div>

      {/* HEADER Y ASISTENTE DINÁMICO */}
      <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 shadow-sm overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
              {activeProvider === 'factus' && 'Habilitación de Facturación Electrónica DIAN via Factus'}
              {activeProvider === 'alegra' && 'Integración de Facturación Electrónica con Alegra'}
              {activeProvider === 'siigo' && 'Integración de Facturación Electrónica con Siigo Nube'}
            </h2>
            <p className="text-xs text-[#6B6862] mt-1">
              {activeProvider === 'factus' && 'Habilita tu negocio en la DIAN mediante Factus API (Proveedor Tecnológico sin costo).'}
              {activeProvider === 'alegra' && 'Conecta las credenciales API de tu cuenta corporativa de Alegra en 5 sencillos pasos.'}
              {activeProvider === 'siigo' && 'Conecta tu paquete contable Siigo Nube mediante tu Usuario e API Access Key.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 ${
                dianStatus === 'habilitado' || currentStep === 5
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              {currentStep === 5
                ? `PROVEEDOR ACTIVO: ${activeProvider.toUpperCase()}`
                : `CONFIGURANDO: ${activeProvider.toUpperCase()}`}
            </span>
          </div>
        </div>

        {/* STEPPER SUPERIOR: Vasijas de Líquido Bermellón Wabi-Sabi */}
        <div className="w-full overflow-x-auto py-6 border-t border-[#E2DFD7] px-4 overflow-y-visible">
          <div className="flex items-center justify-between min-w-[720px] relative py-2">
            {steps.map((step, idx) => {
              const isCompleted = step.num < currentStep || currentStep === 5;
              const isActive = step.num === currentStep;
              const fillPercent = getStepFillPercent(step.num);
              const hasNext = idx < steps.length - 1;

              return (
                <React.Fragment key={step.num}>
                  <div
                    onClick={() => setCurrentStep(step.num)}
                    className="flex flex-col items-center cursor-pointer z-10 group relative"
                  >
                    <div
                      className={`w-4 h-1.5 rounded-t-sm transition-colors duration-500 mb-0.5 ${
                        fillPercent > 0 ? 'bg-[#D9381E]' : 'bg-[#E2DFD7]'
                      }`}
                    ></div>

                    <div
                      className={`w-12 h-14 rounded-b-[16px] rounded-t-sm border-2 relative overflow-hidden transition-all duration-300 flex items-center justify-center shadow-sm ${
                        isActive
                          ? 'border-[#D9381E] shadow-md scale-105 -translate-y-1'
                          : isCompleted
                          ? 'border-[#161616] bg-white'
                          : 'border-[#E2DFD7] bg-[#F6F4EE]'
                      }`}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#C84B31] via-[#D9381E] to-[#E64A19] transition-all duration-700 ease-out"
                        style={{ height: `${fillPercent}%` }}
                      >
                        {fillPercent > 0 && fillPercent < 100 && (
                          <div className="h-1 bg-white/40 animate-pulse absolute top-0 left-0 right-0"></div>
                        )}
                      </div>

                      <span
                        className={`relative z-10 font-mono text-xs font-bold transition-colors duration-300 drop-shadow-sm ${
                          fillPercent > 50 ? 'text-white' : 'text-[#161616]'
                        }`}
                      >
                        {isCompleted || fillPercent === 100 ? (
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        ) : (
                          `0${step.num}`
                        )}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] mt-2 font-medium tracking-tight whitespace-nowrap transition-colors ${
                        isActive ? 'text-[#D9381E] font-bold' : isCompleted ? 'text-[#161616]' : 'text-[#6B6862]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

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

      {/* MENSAJES DE ALERTA */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-[4px] text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-800 font-mono">200 OK</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-[4px] text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-rose-600">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* GRID PRINCIPAL DE 2 COLUMNAS (Formulario / Guía Informativa Lateral) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          {/* PASO 1: DATOS DE LA EMPRESA (Común a todos los proveedores) */}
          {currentStep === 1 && (
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                  Datos de la empresa
                </h3>
                <p className="text-xs text-[#6B6862]">Completa los datos fiscales de tu negocio para la facturación.</p>
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
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none"
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
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none font-mono"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-[#6B6862]">
                    Razón Social / Nombre Comercial o del Establecimiento *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ej. 2 Óptica Nuevo Horizonte"
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none font-bold"
                  />
                  <p className="text-[10px] text-[#6B6862]">
                    Ingresa el nombre registrado en tu Matrícula Mercantil o RUT (aplica para Persona Natural comerciante o Jurídica).
                  </p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-[#6B6862]">
                    {personType === 'natural' ? 'Nombre y Apellidos del Propietario / Titular (Opcional)' : 'Nombre del Representante Legal (Opcional)'}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="ej. ISAAC DÍAZ"
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#6B6862]">Responsabilidad tributaria *</label>
                  <select
                    value={taxResponsibility}
                    onChange={(e) => setTaxResponsibility(e.target.value)}
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none"
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
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-[#6B6862]">Dirección Comercial *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ej. Calle 100 # 15-20"
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-[#6B6862]">Correo electrónico para facturación *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. contacto@miempresa.com"
                    className="w-full bg-[#F6F4EE] border border-[#E2DFD7] rounded-[4px] px-3 py-2 text-xs text-[#161616] outline-none"
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

          {/* PASO 2: GUÍA DE HABILITACIÓN O OBTENCIÓN DE CLAVES */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-5 shadow-sm">
              {activeProvider === 'factus' && (
                <>
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Habilitación DIAN: Registro
                    </h3>
                    <p className="text-xs text-[#6B6862]">Pasos en el portal de la DIAN para registrar tu negocio con Factus.</p>
                  </div>
                  <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-5 rounded-[4px] space-y-3 text-xs text-[#161616]">
                    <ol className="space-y-2.5 list-decimal pl-4 font-medium">
                      <li>Ingresa a la web DIAN por la opción <a href="https://catalogo-vpfe.dian.gov.co/User/Login" target="_blank" rel="noreferrer" className="text-[#D9381E] font-bold underline">"Habilitación"</a>.</li>
                      <li>Ingresa con tu NIT / Cédula y revisa el token enviado a tu correo corporativo.</li>
                      <li>En el menú lateral selecciona <strong>"Registro y habilitación" $\rightarrow$ "Documentos electrónicos"</strong>.</li>
                      <li>Selecciona <strong>"Software de un proveedor tecnológico"</strong>.</li>
                    </ol>
                  </div>
                </>
              )}

              {activeProvider === 'alegra' && (
                <>
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Obtener Token de API en Alegra
                    </h3>
                    <p className="text-xs text-[#6B6862]">Sigue los pasos exactos dentro de la interfaz actual de Alegra:</p>
                  </div>
                  <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-5 rounded-[4px] space-y-3 text-xs text-[#161616]">
                    <ol className="space-y-2.5 list-decimal pl-4 font-medium">
                      <li>Ingresa a tu panel en <a href="https://mi.alegra.com/integrations" target="_blank" rel="noreferrer" className="text-[#D9381E] font-bold underline">Alegra.com</a>.</li>
                      <li>En el menú lateral izquierdo, haz clic en <strong>"Integraciones"</strong>.</li>
                      <li>En las pestañas superiores horizontales, selecciona <strong>"Integración Manual (API)"</strong>.</li>
                      <li>Desplázate hasta el recuadro <strong>"Credenciales de acceso"</strong>.</li>
                      <li>Copia tu <strong>USUARIO</strong> (correo registrado) y haz clic en el botón de <strong>Revelar 👁️ / Copiar</strong> en el campo <strong>TOKEN</strong>.</li>
                    </ol>
                  </div>
                </>
              )}

              {activeProvider === 'siigo' && (
                <>
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Obtener API Access Key en Siigo Nube
                    </h3>
                    <p className="text-xs text-[#6B6862]">Sigue esta instrucción para generar tu Access Key en Siigo Nube.</p>
                  </div>
                  <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-5 rounded-[4px] space-y-3 text-xs text-[#161616]">
                    <ol className="space-y-2.5 list-decimal pl-4 font-medium">
                      <li>Abre tu panel en <a href="https://q.siigo.com" target="_blank" rel="noreferrer" className="text-[#D9381E] font-bold underline">Siigo Nube</a>.</li>
                      <li>Ve a **Configuración ⚙️ $\rightarrow$ Más configuraciones $\rightarrow$ Integraciones API**.</li>
                      <li>Genera o copia tu **Usuario de API** y tu **Access Key**.</li>
                    </ol>
                  </div>
                </>
              )}

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
                  Continuar a Credenciales
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: CREDENCIALES Y PROBAR CONEXIÓN INOCUA */}
          {currentStep === 3 && (
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-5 shadow-sm">
              {activeProvider === 'factus' && (
                <>
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Modos de Operación Factus
                    </h3>
                    <p className="text-xs text-[#6B6862]">Asocia el software Factus API en la DIAN.</p>
                  </div>
                  <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-5 rounded-[4px] space-y-3 text-xs text-[#161616]">
                    <p className="font-bold text-[#D9381E]">En el portal de la DIAN:</p>
                    <ul className="space-y-2 list-disc pl-4">
                      <li>Elige como empresa proveedora: <strong>FACTUS S.A.S.</strong></li>
                      <li>Nombre del software: <strong>Factus API</strong>.</li>
                      <li>Copia el código alfanumérico <strong>TestSetID</strong>.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeProvider === 'alegra' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Ingresar Credenciales Alegra
                    </h3>
                    <p className="text-xs text-[#6B6862]">Pega las credenciales copiadas de Alegra y realiza la prueba de conexión inocua.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7]">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#161616]">Correo Registrado en Alegra *</label>
                      <input
                        type="email"
                        value={alegraEmail}
                        onChange={(e) => setAlegraEmail(e.target.value)}
                        placeholder="ej. facturacion@miempresa.com"
                        className="w-full bg-white border border-[#E2DFD7] rounded-[4px] px-3 py-2.5 text-xs text-[#161616] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#161616]">Token API de Alegra *</label>
                      <input
                        type="password"
                        value={alegraToken}
                        onChange={(e) => setAlegraToken(e.target.value)}
                        placeholder="Pega tu Token de API..."
                        className="w-full bg-white border border-[#E2DFD7] rounded-[4px] px-3 py-2.5 text-xs text-[#161616] outline-none font-mono"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={alegraTesting}
                        onClick={handleTestAlegra}
                        className="px-5 py-2.5 bg-[#D9381E] hover:bg-[#b82b14] text-white text-xs font-bold rounded-[4px] flex items-center gap-1.5 transition cursor-pointer border-0"
                      >
                        <span className="material-symbols-outlined text-base">wifi_tethering</span>
                        {alegraTesting ? 'Verificando...' : 'Probar Conexión Inocua'}
                      </button>
                    </div>

                    {alegraTestResult && (
                      <div
                        className={`p-3 text-xs border rounded-[4px] flex items-center gap-2 ${
                          alegraTestResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {alegraTestResult.success ? 'check_circle' : 'error'}
                        </span>
                        <span>{alegraTestResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeProvider === 'siigo' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Ingresar Credenciales Siigo Nube
                    </h3>
                    <p className="text-xs text-[#6B6862]">Pega las credenciales copiadas de Siigo y realiza la prueba de conexión inocua.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7]">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#161616]">Usuario / Correo Siigo *</label>
                      <input
                        type="text"
                        value={siigoUsername}
                        onChange={(e) => setSiigoUsername(e.target.value)}
                        placeholder="ej. usuario@empresa.com"
                        className="w-full bg-white border border-[#E2DFD7] rounded-[4px] px-3 py-2.5 text-xs text-[#161616] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#161616]">Access Key API Siigo *</label>
                      <input
                        type="password"
                        value={siigoAccessKey}
                        onChange={(e) => setSiigoAccessKey(e.target.value)}
                        placeholder="Pega tu Access Key..."
                        className="w-full bg-white border border-[#E2DFD7] rounded-[4px] px-3 py-2.5 text-xs text-[#161616] outline-none font-mono"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={siigoTesting}
                        onClick={handleTestSiigo}
                        className="px-5 py-2.5 bg-[#D9381E] hover:bg-[#b82b14] text-white text-xs font-bold rounded-[4px] flex items-center gap-1.5 transition cursor-pointer border-0"
                      >
                        <span className="material-symbols-outlined text-base">wifi_tethering</span>
                        {siigoTesting ? 'Verificando...' : 'Probar Conexión Inocua'}
                      </button>
                    </div>

                    {siigoTestResult && (
                      <div
                        className={`p-3 text-xs border rounded-[4px] flex items-center gap-2 ${
                          siigoTestResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {siigoTestResult.success ? 'check_circle' : 'error'}
                        </span>
                        <span>{siigoTestResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  Continuar
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: SET DE PRUEBAS FACTUS / CONFIGURACIÓN NUMERACIÓN ALEGRA / SIIGO */}
          {currentStep === 4 && (
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-6 shadow-sm">
              {activeProvider === 'factus' && (
                <>
                  <div>
                    <h3 className="text-2xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Envío del set de pruebas (Factus)
                    </h3>
                    <p className="text-xs text-[#6B6862]">Trae el código generado por la DIAN y activa tus 20 pruebas desatendidas.</p>
                  </div>
                  <div className="space-y-2 bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7]">
                    <label className="text-xs font-bold text-[#161616]">Código TestsetId *</label>
                    <div className="flex gap-3 flex-col sm:flex-row">
                      <input
                        type="text"
                        value={testSetId}
                        onChange={(e) => setTestSetId(e.target.value)}
                        placeholder="ej. 8a20f7b1-4c69..."
                        disabled={isRunningTests}
                        className="flex-1 bg-white border border-[#E2DFD7] rounded-[4px] px-4 py-3 text-xs text-[#161616] outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleStartTestSet}
                        disabled={isRunningTests || !testSetId.trim()}
                        className="px-6 py-3 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] font-bold text-xs rounded-[4px] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border-0"
                      >
                        {isRunningTests ? 'Enviando (20 facturas)...' : 'Iniciar prueba'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeProvider === 'alegra' && (
                <>
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Configuración de Numeración en Alegra
                    </h3>
                    <p className="text-xs text-[#6B6862]">El ERP utilizará la plantilla y numeración activa configurada en tu panel de Alegra.</p>
                  </div>
                  <div className="bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7] space-y-3 text-xs text-[#161616]">
                    <p className="font-bold text-[#D9381E]">✓ Sincronización Automática Activada</p>
                    <p className="leading-relaxed">
                      Cada factura emitida desde el ERP heredará el prefijo, número consecutivo y la firma DIAN habilitada en tu cuenta de Alegra.
                    </p>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveAlegraConfig}
                        className="px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82b14] text-white text-xs font-bold rounded-[4px] cursor-pointer border-0 shadow-sm"
                      >
                        Guardar & Activar Alegra
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeProvider === 'siigo' && (
                <>
                  <div>
                    <h3 className="text-xl font-serif text-[#161616]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                      Tipo de Comprobante Siigo Nube
                    </h3>
                    <p className="text-xs text-[#6B6862]">Especifica el ID del comprobante de Factura de Venta (`FV`) en Siigo.</p>
                  </div>
                  <div className="bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7] space-y-3 text-xs text-[#161616]">
                    <div className="space-y-1">
                      <label className="font-bold text-[#161616]">ID Tipo de Comprobante (Document ID) *</label>
                      <input
                        type="number"
                        value={siigoDocumentTypeId}
                        onChange={(e) => setSiigoDocumentTypeId(parseInt(e.target.value, 10) || 24416)}
                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none font-mono"
                      />
                      <p className="text-[11px] text-[#6B6862]">Por defecto en Siigo es el ID 24416 para Factura Electrónica.</p>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveSiigoConfig}
                        className="px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82b14] text-white text-xs font-bold rounded-[4px] cursor-pointer border-0 shadow-sm"
                      >
                        Guardar & Activar Siigo Nube
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 border border-[#E2DFD7] text-[#161616] text-xs font-bold rounded-[4px] cursor-pointer hover:bg-[#F6F4EE]"
                >
                  Atrás
                </button>
              </div>
            </div>
          )}

          {/* PASO 5: CONFIRMACIÓN & ACTIVACIÓN EXITOSA */}
          {currentStep === 5 && (
            <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-300 rounded-[4px] text-emerald-900">
                <span className="material-symbols-outlined text-[32px] text-emerald-600">verified</span>
                <div>
                  <h4 className="font-serif font-bold text-base" style={{ fontFamily: '"Instrument Serif", serif' }}>
                    ¡PROVEEDOR ACTIVO: {activeProvider.toUpperCase()}!
                  </h4>
                  <p className="text-xs opacity-90">
                    Tu tienda ahora emitirá sus facturas electrónicas conectándose directamente con la plataforma de{' '}
                    <strong>{activeProvider.toUpperCase()}</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-[#F6F4EE] p-5 rounded-[4px] border border-[#E2DFD7] space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#6B6862]">Resumen de Integración</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-[4px] border border-[#E2DFD7]">
                    <span className="text-[10px] text-[#6B6862]">Proveedor Activo</span>
                    <p className="font-bold font-mono text-[#D9381E]">{activeProvider.toUpperCase()}</p>
                  </div>
                  <div className="bg-white p-3 rounded-[4px] border border-[#E2DFD7]">
                    <span className="text-[10px] text-[#6B6862]">Estado de Conexión</span>
                    <p className="font-bold text-emerald-700 font-mono">VERIFICADO ✓</p>
                  </div>
                  <div className="bg-white p-3 rounded-[4px] border border-[#E2DFD7]">
                    <span className="text-[10px] text-[#6B6862]">Firma DIAN</span>
                    <p className="font-bold text-[#161616] font-mono">EN VIVO</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (5 Cols): Guía informativa Wabi-Sabi adaptada según Proveedor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 shadow-sm space-y-4">
            <div className="border-b border-[#E2DFD7] pb-3">
              <span className="text-[10px] font-mono font-bold text-[#D9381E] uppercase tracking-wider block">
                Guía Wabi-Sabi
              </span>
              <h3 className="text-xl font-serif text-[#161616] mt-0.5" style={{ fontFamily: '"Instrument Serif", serif' }}>
                Normativa & Integración
              </h3>
            </div>

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
                  <span>Progreso del Proveedor</span>
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
                  <strong className="text-[#161616] block">
                    {activeProvider === 'factus' && 'Firma Digital Incluida'}
                    {activeProvider === 'alegra' && 'Firma de Alegra en Uso'}
                    {activeProvider === 'siigo' && 'Firma de Siigo en Uso'}
                  </strong>
                  <p className="text-[11px] leading-relaxed mt-0.5">
                    {activeProvider === 'factus' && 'Firma maestr@ DIAN sin costo adicional de certificado digital individual.'}
                    {activeProvider === 'alegra' && 'Tus facturas se firman con el certificado digital activo en tu cuenta de Alegra.'}
                    {activeProvider === 'siigo' && 'Tus facturas se firman con el certificado digital activo en tu paquete Siigo Nube.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-3 border-t border-[#E2DFD7]/60">
                <span className="material-symbols-outlined text-[16px] text-[#D9381E] mt-0.5">sync_alt</span>
                <div>
                  <strong className="text-[#161616] block">Conexión Inocua de Prueba</strong>
                  <p className="text-[11px] leading-relaxed mt-0.5">
                    Puedes verificar tus claves con el botón de "Probar Conexión Inocua" sin alterar facturas reales ni emitir ante la DIAN.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
