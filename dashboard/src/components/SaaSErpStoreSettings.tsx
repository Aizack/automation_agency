import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface StoreSettingsProps {
  clientId: string;
  onProfileUpdated: () => void;
}

export const SaaSErpStoreSettings: React.FC<StoreSettingsProps> = ({ clientId, onProfileUpdated }) => {
  const [storeName, setStoreName] = useState('');
  const [nit, setNit] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [category, setCategory] = useState('optica');
  const [personType, setPersonType] = useState('persona_juridica');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logos, setLogos] = useState<Array<{ fileName: string, url: string }>>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoBuster, setLogoBuster] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogos = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/logos`);
      const json = await res.json();
      if (json.success) setLogos(json.logos || []);
    } catch (err) {
      console.error("Error cargando logotipos:", err);
    }
  };

  useEffect(() => {
    // Cargar datos actuales del perfil del cliente
    fetch(`/api/clients/${clientId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setStoreName(json.data.name || '');
          setNit(json.data.nit || '');
          setAddress(json.data.address || '');
          setPhone(json.data.phoneNumber || '');
          setEmail(json.data.email || '');
          setInvoiceFooter(json.data.invoiceFooter || '');
          setCategory(json.data.category || 'optica');
          setPersonType(json.data.personType || json.data.person_type || 'persona_juridica');
          setLogoUrl(json.data.logo_url || null);
        }
      })
      .catch(err => {
        console.error("Error al cargar configuracion comercial:", err);
        setError("No se pudo cargar la configuración de la tienda.");
      });

    fetchLogos();
  }, [clientId]);

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      setUploadingLogo(true);
      const res = await fetch(`/api/clients/${clientId}/logos`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setLogoUrl(json.logo_url);
        setLogoBuster(Date.now());
        fetchLogos();
        onProfileUpdated();
      } else {
        alert(json.error || 'Error al subir el logotipo.');
      }
    } catch (err: any) {
      alert(`Error de conexión al subir logotipo: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSelectLogo = async (fileName: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/logos/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      const json = await res.json();
      if (json.success) {
        setLogoUrl(json.logo_url);
        setLogoBuster(Date.now());
        onProfileUpdated();
      }
    } catch (err) {
      console.error("Error al seleccionar logo:", err);
    }
  };

  const handleDeleteLogo = async (fileName: string) => {
    if (!confirm('¿Deseas eliminar este logotipo del historial?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/logos/${fileName}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setLogoUrl(json.logo_url || null);
        setLogoBuster(Date.now());
        fetchLogos();
        onProfileUpdated();
      }
    } catch (err) {
      console.error("Error al eliminar logo:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/profile-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          nit,
          address,
          phone_number: phone,
          email,
          invoice_footer: invoiceFooter,
          category,
          person_type: personType
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        onProfileUpdated();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || 'Error al guardar los cambios.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 text-[#161616]">
      {/* Encabezado Editorial de Módulo */}
      <div className="border-b border-[#E2DFD7] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-[0.2em] block mb-1">
            Información Empresa & Legal
          </span>
          <h3 className="font-serif font-normal text-3xl md:text-4xl text-[#161616] leading-none">
            Configuración de Perfil Comercial
          </h3>
          <p className="text-xs text-[#6B6862] mt-2 max-w-2xl leading-relaxed">
            Define la razón social, identificación tributaria y datos de contacto que aparecerán impresos en tus facturas electrónicas DIAN y tirillas POS térmicas.
          </p>
        </div>
      </div>

      {/* Alertas Nativas Wabi-Sabi */}
      {success && (
        <div className="p-4 bg-[#FFFFFF] border-l-4 border-[#15803d] border-y border-r border-[#E2DFD7] text-[#161616] text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-[#15803d]">check_circle</span>
            <span>¡Perfil comercial y datos tributarios actualizados correctamente!</span>
          </div>
          <span className="text-[10px] text-[#6B6862] font-mono">200 OK</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#FFFFFF] border-l-4 border-[#D9381E] border-y border-r border-[#E2DFD7] text-[#161616] text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-[#D9381E]">error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Layout Widescreen Editorial (7 Cols Formulario / 5 Cols Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Formulario Comercial Principal (7 Columnas) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-[#FFFFFF] border border-[#E2DFD7] p-7 space-y-6 shadow-sm">
          <div className="border-b border-[#E2DFD7] pb-3 mb-4">
            <h4 className="font-serif font-normal text-xl text-[#161616]">Datos de la Razón Social</h4>
          </div>

          <div className="space-y-4">
            {/* Sección de Cargado & Gestión de Logotipo Comercial */}
            <div className="bg-[#FAF8F3] border border-[#E2DFD7] p-4 rounded-md space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B6862] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#D9381E]">image</span>
                  Logotipo Comercial de la Empresa
                </span>
                {uploadingLogo && <span className="text-[10px] text-[#D9381E] font-mono animate-pulse">Cargando...</span>}
              </label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 border border-[#E2DFD7] rounded-md">
                <div className="w-20 h-20 bg-[#FAF8F3] border border-dashed border-[#E2DFD7] rounded-md flex items-center justify-center p-2 shrink-0 relative group">
                  {logoUrl ? (
                    <img 
                      src={`${logoUrl}?t=${logoBuster}`} 
                      alt="Logo Empresa" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-[#6B6862]">storefront</span>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-left">
                  <p className="text-xs text-[#161616] font-medium">
                    {logoUrl ? 'Logotipo activo en facturación e interfaz' : 'Aún no has cargado un logotipo comercial.'}
                  </p>
                  <p className="text-[11px] text-[#6B6862] leading-tight">
                    Subirás la imagen oficial de tu marca (PNG, JPG, SVG). Aparecerá en tus facturas electrónicas PDF (A4/Carta) y en el menú del sistema ERP.
                  </p>
                  
                  <div className="pt-1 flex items-center gap-2">
                    <label className="bg-[#D9381E] hover:bg-[#b82b14] text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-sm cursor-pointer transition-all inline-flex items-center gap-1.5 border-0 shadow-xs">
                      <span className="material-symbols-outlined text-sm">cloud_upload</span>
                      Cargar / Cambiar Logo
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoUpload(e.target.files[0]);
                          }
                        }} 
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const fileName = logoUrl.split('/').pop();
                          if (fileName) handleDeleteLogo(fileName);
                        }}
                        className="bg-white border border-[#E2DFD7] text-[#6B6862] hover:text-[#D9381E] hover:border-[#D9381E] text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-sm cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Eliminar Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Historial de Logotipos Subidos Previamente */}
              {logos.length > 1 && (
                <div className="pt-2 border-t border-[#E2DFD7] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block">Historial de Logotipos Guardados:</span>
                  <div className="flex flex-wrap gap-2">
                    {logos.map(lg => {
                      const isSelected = logoUrl && logoUrl.includes(lg.fileName);
                      return (
                        <div 
                          key={lg.fileName} 
                          className={`w-10 h-10 bg-white border p-1 rounded cursor-pointer relative group transition-all ${
                            isSelected ? 'border-2 border-[#D9381E] shadow-xs ring-2 ring-[#D9381E]/10' : 'border-[#E2DFD7] hover:border-[#161616]'
                          }`}
                          onClick={() => handleSelectLogo(lg.fileName)}
                          title={`Usar este logo (${lg.fileName})`}
                        >
                          <img src={`${lg.url}?t=${logoBuster}`} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                Nombre / Razón Social Legal del Negocio *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="ej. Óptica Nuevo Horizonte S.A.S."
                className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                  Categoría del Negocio *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors cursor-pointer"
                >
                  <option value="optica">👓 Óptica / Centro Clínico</option>
                  <option value="restaurante">🍕 Restaurante / Gastronomía</option>
                  <option value="comercio">🛍️ Comercio General</option>
                  <option value="agencia">🤖 Agencia de Automatizaciones / Servicios</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                  Tipo de Persona (Tributaria DIAN) *
                </label>
                <select
                  value={personType}
                  onChange={(e) => setPersonType(e.target.value)}
                  className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors cursor-pointer"
                >
                  <option value="persona_natural">👤 Persona Natural (NIT CC / Cédula)</option>
                  <option value="persona_juridica">🏢 Persona Jurídica (Empresa S.A.S. / S.A.)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                  NIT / RUT del Negocio
                </label>
                <input
                  type="text"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  placeholder="ej. 900.123.456-7"
                  className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                  Dirección Comercial
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ej. Cra 16 Sur No 46-64"
                  className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                  Teléfono de Atención
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ej. 3046247664"
                  className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                  Email Comercial
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. contacto@minegocio.com"
                  className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                Términos de Garantía y Pie de Factura
              </label>
              <textarea
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                rows={4}
                placeholder="ej. Garantía de 1 año por defectos de fabricación. No se aceptan devoluciones de lentes formulados personalizados una vez cortados."
                className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none px-3.5 py-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none transition-colors font-sans resize-none leading-relaxed"
              />
              <p className="text-[11px] text-[#6B6862]">
                Este texto se imprimirá en la sección inferior de los recibos de caja (80mm) y facturas en PDF.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2DFD7] flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#D9381E] hover:bg-[#b82b14] text-white font-bold text-[11px] uppercase tracking-[0.15em] px-7 py-3 rounded-none flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 border-0 shadow-sm"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </form>

        {/* Panel Derecho: Vista Previa en Tiempo Real del Recibo Imprimible (5 Columnas) */}
        <div className="lg:col-span-5 bg-[#FAF8F3] border border-[#E2DFD7] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
            <span className="text-[11px] font-bold text-[#6B6862] uppercase tracking-[0.12em]">
              Vista Previa en Tiempo Real
            </span>
            <span className="text-[10px] bg-[#E2DFD7] text-[#161616] px-2 py-0.5 font-mono uppercase font-semibold">
              Tirilla POS 80mm
            </span>
          </div>

          {/* Ticket Simulado Estilo Papel Editorial */}
          <div className="bg-[#FFFFFF] border border-[#E2DFD7] p-6 font-mono text-[11px] text-[#161616] space-y-4 shadow-sm relative">
            <div className="text-center space-y-1 border-b border-dashed border-[#E2DFD7] pb-4">
              <div className="font-serif font-normal text-xl text-[#161616] tracking-tight uppercase">
                {storeName || 'NOMBRE DE TU NEGOCIO'}
              </div>
              {nit && <div className="text-[#6B6862]">NIT: {nit}</div>}
              {address && <div className="text-[#6B6862]">{address}</div>}
              {phone && <div className="text-[#6B6862]">TEL: {phone}</div>}
              {email && <div className="text-[#6B6862]">{email}</div>}
            </div>

            <div className="space-y-1 text-[10px] text-[#6B6862]">
              <div className="flex justify-between">
                <span>FACTURA POS:</span>
                <span className="font-bold text-[#161616]">#POS-2026-001</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>07/09/2026 10:30 AM</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span>Cliente Mostrador</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-[#E2DFD7] py-2 space-y-1 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>CANT / DESCRIPCIÓN</span>
                <span>TOTAL</span>
              </div>
              <div className="flex justify-between text-[#6B6862]">
                <span>1x Lente Antireflejo BlueCut</span>
                <span>$ 120.000</span>
              </div>
            </div>

            <div className="space-y-1 text-right text-xs">
              <div className="flex justify-between text-[#6B6862] text-[10px]">
                <span>SUBTOTAL:</span>
                <span>$ 100.840</span>
              </div>
              <div className="flex justify-between text-[#6B6862] text-[10px]">
                <span>IVA (19%):</span>
                <span>$ 19.160</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#161616] pt-1 border-t border-[#E2DFD7]">
                <span>TOTAL COP:</span>
                <span className="text-[#D9381E]">$ 120.000</span>
              </div>
            </div>

            {/* Pie de Recibo Configurable */}
            <div className="border-t border-dashed border-[#E2DFD7] pt-3 text-center text-[9px] text-[#6B6862] leading-relaxed italic">
              {invoiceFooter || 'Tus términos de garantía y notas legales aparecerán aquí en la parte inferior del recibo.'}
            </div>
          </div>

          <div className="text-[11px] text-[#6B6862] leading-relaxed px-1">
            <span className="font-semibold text-[#161616]">Nota Wabi-Sabi:</span> Los cambios guardados se reflejan inmediatamente en las impresoras de recibos y archivos PDF generados por el ERP.
          </div>
        </div>
      </div>

      {/* Sección Cuentas Bancarias del Negocio */}
      <BankAccountsManager clientId={clientId} />
    </div>
  );
};

const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Nequi',
  'Daviplata',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA Colombia',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Lulo Bank',
  'Nu Colombia (Nubank)',
  'RappiPay',
  'Scotiabank Colpatria',
  'Banco Falabella',
  'Banco Agrario',
  'Bold',
  'Mercado Pago',
  'Otro Banco / Entidad'
];

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder?: string;
  is_active: boolean;
}

const BankAccountsManager: React.FC<{ clientId: string }> = ({ clientId }) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedBankSelect, setSelectedBankSelect] = useState('Bancolombia');
  const [customBankName, setCustomBankName] = useState('');
  const [accountType, setAccountType] = useState('ahorros');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/bank-accounts`);
      const json = await res.json();
      if (json.success) setAccounts(json.accounts || []);
    } catch (err) {
      console.error("Error cargando cuentas bancarias:", err);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, [clientId]);

  const getEffectiveBankName = () => {
    if (selectedBankSelect === 'Otro Banco / Entidad') {
      return customBankName.trim();
    }
    return selectedBankSelect;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBankName = getEffectiveBankName();
    if (!effectiveBankName || !accountNumber.trim()) {
      alert('Por favor selecciona un banco válido e ingresa el número de cuenta.');
      return;
    }

    try {
      setLoading(true);
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/clients/${clientId}/bank-accounts/${editingId}`
        : `/api/clients/${clientId}/bank-accounts`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_name: effectiveBankName,
          account_type: accountType,
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim()
        })
      });

      const json = await res.json();
      if (json.success) {
        setSelectedBankSelect('Bancolombia');
        setCustomBankName('');
        setAccountNumber('');
        setAccountHolder('');
        setEditingId(null);
        fetchBankAccounts();
      } else {
        alert(json.error || 'Error guardando cuenta bancaria');
      }
    } catch (err) {
      alert('Error de conexión al guardar cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (acc: BankAccount) => {
    setEditingId(acc.id);
    if (COLOMBIAN_BANKS.includes(acc.bank_name)) {
      setSelectedBankSelect(acc.bank_name);
      setCustomBankName('');
    } else {
      setSelectedBankSelect('Otro Banco / Entidad');
      setCustomBankName(acc.bank_name);
    }
    setAccountType(acc.account_type);
    setAccountNumber(acc.account_number);
    setAccountHolder(acc.account_holder || '');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta cuenta bancaria?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/bank-accounts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchBankAccounts();
      } else {
        alert(json.error || 'No se pudo eliminar la cuenta bancaria.');
      }
    } catch (err) {
      console.error('Error eliminando cuenta bancaria:', err);
    }
  };

  return (
    <div className="space-y-6 pt-10 border-t border-[#E2DFD7]">
      <div>
        <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-[0.2em] block mb-1">
          Tesorería & Facturación
        </span>
        <h4 className="font-serif font-normal text-2xl md:text-3xl text-[#161616] leading-none">
          Cuentas Bancarias del Negocio
        </h4>
        <p className="text-xs text-[#6B6862] mt-2">
          Registra las cuentas bancarias autorizadas para recibir pagos por transferencia en Facturación POS y Cotizaciones.
        </p>
      </div>

      {/* Grid de 12 Columnas: Formulario 5 Cols / Lista de Cuentas 7 Cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Formulario Agregar / Editar Cuenta (5 Columnas) */}
        <form onSubmit={handleSave} className="lg:col-span-5 bg-[#FFFFFF] border border-[#E2DFD7] p-6 space-y-4 shadow-sm">
          <div className="border-b border-[#E2DFD7] pb-3 mb-2 flex items-center justify-between">
            <h5 className="font-serif font-normal text-lg text-[#161616]">
              {editingId ? 'Editar Cuenta Bancaria' : 'Registrar Nueva Cuenta'}
            </h5>
            <span className="material-symbols-outlined text-[18px] text-[#D9381E]">account_balance</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
              Banco / Entidad *
            </label>
            <select
              required
              value={selectedBankSelect}
              onChange={(e) => setSelectedBankSelect(e.target.value)}
              className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none cursor-pointer"
            >
              {COLOMBIAN_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {selectedBankSelect === 'Otro Banco / Entidad' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                Nombre de Entidad Bancaria *
              </label>
              <input
                type="text"
                required
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                placeholder="Escribe el nombre de la entidad..."
                className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                Tipo de Cuenta
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none cursor-pointer"
              >
                <option value="ahorros">Ahorros</option>
                <option value="corriente">Corriente</option>
                <option value="nequi">Nequi / Daviplata</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
                Número de Cuenta *
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="123456789"
                className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6862] block">
              Titular / NIT
            </label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Nombre de la empresa o NIT titular"
              className="w-full bg-[#FAF8F3] focus:bg-[#FFFFFF] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2DFD7]">
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setSelectedBankSelect('Bancolombia'); setCustomBankName(''); setAccountNumber(''); setAccountHolder(''); }}
                className="px-4 py-2 border border-[#E2DFD7] text-[11px] font-semibold text-[#6B6862] hover:bg-[#FAF8F3] hover:text-[#161616] rounded-none cursor-pointer transition-all uppercase tracking-wider"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#D9381E] hover:bg-[#b82b14] text-white text-[11px] font-bold uppercase tracking-[0.12em] rounded-none cursor-pointer transition-all border-0 shadow-sm"
            >
              {editingId ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
            </button>
          </div>
        </form>

        {/* Tarjetas Editoriales de Cuentas Bancarias Registradas (7 Columnas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B6862]">
              Cuentas Registradas ({accounts.length})
            </span>
            <span className="text-[10px] text-[#6B6862]">Disponibles en módulo de Cobro</span>
          </div>

          {accounts.length === 0 ? (
            /* Estado Vacío Zen Wabi-Sabi */
            <div className="bg-[#FFFFFF] border border-[#E2DFD7] p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F3] border border-[#E2DFD7] flex items-center justify-center mx-auto text-[#6B6862]">
                <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
              </div>
              <div className="font-serif font-normal text-xl text-[#161616]">
                No hay cuentas bancarias registradas
              </div>
              <p className="text-xs text-[#6B6862] max-w-sm mx-auto leading-relaxed">
                Utiliza el formulario de la izquierda para agregar tus cuentas de Bancolombia, Nequi o Daviplata y mostrarlas al facturar.
              </p>
            </div>
          ) : (
            /* Lista de Tarjetas de Cheque / Pasaporte Bancario Editorial */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(acc => (
                <div 
                  key={acc.id} 
                  className="bg-[#FFFFFF] border border-[#E2DFD7] p-4 flex flex-col justify-between gap-3 hover:border-[#161616] transition-all shadow-sm relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9381E] block">
                        {acc.account_type}
                      </span>
                      <h5 className="font-serif font-normal text-lg text-[#161616] leading-tight">
                        {acc.bank_name}
                      </h5>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEdit(acc)}
                        className="p-1 text-[#6B6862] hover:text-[#161616] border border-transparent hover:border-[#E2DFD7] rounded-none cursor-pointer transition-all bg-transparent"
                        title="Editar cuenta"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, acc.id)}
                        className="p-1 text-[#6B6862] hover:text-[#D9381E] border border-transparent hover:border-[#E2DFD7] rounded-none cursor-pointer bg-transparent transition-all"
                        title="Eliminar cuenta"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-[#E2DFD7] pt-2.5 space-y-1">
                    <div className="text-[10px] text-[#6B6862] uppercase tracking-wider">Número de Cuenta</div>
                    <div className="font-mono text-sm font-bold text-[#161616] tracking-wider">
                      #{acc.account_number}
                    </div>
                    {acc.account_holder && (
                      <div className="text-[11px] text-[#6B6862] truncate pt-0.5">
                        Titular: <span className="text-[#161616] font-medium">{acc.account_holder}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
