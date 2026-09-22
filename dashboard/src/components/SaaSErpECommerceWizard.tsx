import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface SaaSErpECommerceWizardProps {
  clientId: string;
}

interface CategoryItem {
  id: string;
  name: string;
  is_visible_web?: boolean;
}

interface BranchItem {
  id: string;
  name: string;
  branch_name: string;
  address: string;
  phone: string;
  is_main_branch: boolean;
}

export const SaaSErpECommerceWizard: React.FC<SaaSErpECommerceWizardProps> = ({ clientId }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Paso 1: Configuración básica
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [slug, setSlug] = useState<string>('');

  // Paso 2: Identidad de Marca
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [catalogDescription, setCatalogDescription] = useState<string>('');

  // Paso 3: Categorías
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Paso 4: Sedes y Logística
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<'both' | 'domicilio' | 'pickup'>('both');

  useEffect(() => {
    fetchInitialData();
  }, [clientId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Obtener datos del cliente
      const clientRes = await fetch(`/api/clients/${clientId}`);
      const clientJson = await clientRes.json();
      if (clientJson.success && clientJson.data) {
        const c = clientJson.data;
        setIsEnabled(c.web_catalog_enabled !== false);
        setSlug(c.slug || c.id || '');
        setLogoUrl(c.logo_url || '');
        setBannerUrl(c.banner_url || '');
        setCatalogDescription(c.catalog_description || '');
      }

      // 2. Obtener categorías
      const catRes = await fetch(`/api/clients/${clientId}/categories`);
      const catJson = await catRes.json();
      if (catJson.success && Array.isArray(catJson.categories)) {
        setCategories(catJson.categories.map((cat: any) => ({
          ...cat,
          is_visible_web: Boolean(cat.is_visible_web === true || cat.is_visible_web === 'true' || cat.is_visible_web === 1)
        })));
      }

      // 3. Obtener sedes
      const branchRes = await fetch(`/api/clients/${clientId}/branches`);
      const branchJson = await branchRes.json();
      if (branchJson.success && Array.isArray(branchJson.branches)) {
        setBranches(branchJson.branches);
      }
    } catch (err) {
      console.error('Error cargando configuración del catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const body = {
        web_catalog_enabled: isEnabled,
        slug: cleanSlug || clientId,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        catalog_description: catalogDescription
      };

      // 1. Guardar ajustes de perfil
      const res = await fetch(`/api/clients/${clientId}/profile-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      // 2. Guardar visibilidad de categorías en la web
      await fetch(`/api/clients/${clientId}/categories/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: categories.map(c => ({ id: c.id, is_visible_web: c.is_visible_web }))
        })
      });

      const json = await res.json();
      if (json.success) {
        setSaveMessage('✓ Configuración del Catálogo E-Commerce guardada con éxito.');
        setTimeout(() => setSaveMessage(''), 4000);
      } else {
        alert(json.error || 'Error al guardar la configuración.');
      }
    } catch (err: any) {
      alert('Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryVisibility = async (catId: string) => {
    const updated = categories.map(c =>
      c.id === catId ? { ...c, is_visible_web: !c.is_visible_web } : c
    );
    setCategories(updated);

    try {
      await fetch(`/api/clients/${clientId}/categories/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: updated.map(c => ({ id: c.id, is_visible_web: c.is_visible_web }))
        })
      });
    } catch (err) {
      console.error('Error al actualizar visibilidad de categoría:', err);
    }
  };

  const publicUrl = `http://localhost:3001/c/${slug || clientId}`;
  const productionUrl = `https://diazlab.online/c/${slug || clientId}`;

  if (loading) {
    return (
      <div className="p-8 text-center bg-[#FAF8F5] border border-[#E2DFD7] rounded-xl my-6">
        <div className="w-8 h-8 border-3 border-[#D9381E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-[#6B6862] font-bold uppercase tracking-wider font-mono">Cargando Asistente de E-Commerce...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-6 sm:p-8 rounded-xl shadow-sm text-[#161616] font-sans">
      {/* HEADER WIZARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7] mb-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9381E]">MÓDULO DE ACTIVACIÓN SAAS</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#161616] mt-0.5">
            🛒 Asistente de Catálogo Web & E-Commerce
          </h2>
          <p className="text-xs text-[#6B6862] mt-1">
            Configura y activa tu tienda digital en 5 sencillos pasos para recibir pedidos asistidos por IA y WhatsApp.
          </p>
        </div>

        {/* FEEDBACK MENSAJE */}
        {saveMessage && (
          <div className="bg-[#E6F4EA] border border-[#A8DADC] text-[#1E4620] text-xs px-4 py-2.5 rounded-lg font-bold flex items-center gap-2">
            {saveMessage}
          </div>
        )}
      </div>

      {/* BARRA DE PASOS (TABS DE PROGRESO) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
        {[
          { step: 1, title: '1. Encendido', icon: 'power_settings_new' },
          { step: 2, title: '2. Marca', icon: 'palette' },
          { step: 3, title: '3. Categorías', icon: 'category' },
          { step: 4, title: '4. Logística', icon: 'local_shipping' },
          { step: 5, title: '5. Lanzar', icon: 'rocket_launch' }
        ].map(item => (
          <button
            key={item.step}
            onClick={() => setCurrentStep(item.step)}
            className={`p-3 rounded-lg text-left transition flex items-center gap-2 border cursor-pointer ${
              currentStep === item.step
                ? 'bg-[#161616] text-white border-[#161616] shadow-md'
                : currentStep > item.step
                ? 'bg-[#E6F4EA] text-[#1E4620] border-[#A8DADC]'
                : 'bg-white text-[#6B6862] border-[#E2DFD7] hover:border-[#161616]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            <span className="text-xs font-bold truncate">{item.title}</span>
          </button>
        ))}
      </div>

      {/* CONTENIDO DEL PASO ACTIVO */}
      <div className="bg-white border border-[#E2DFD7] p-6 rounded-xl mb-8 shadow-xs">
        {/* PASO 1: ACTIVACIÓN Y SLUG */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#161616] flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">power_settings_new</span>
              Paso 1: Estado y Dirección de tu Tienda Web
            </h3>

            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E2DFD7] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#161616]">Estado del Catálogo Web Público</h4>
                <p className="text-xs text-[#6B6862]">Permite que los clientes vean tus productos y armen su pedido desde su celular.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={e => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-[#161616] block mb-1 uppercase tracking-wider">
                Dirección Web Personalizada (Slug)
              </label>
              <div className="flex items-center bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg overflow-hidden focus-within:border-[#161616]">
                <span className="px-3 text-xs text-[#6B6862] font-mono border-r border-[#E2DFD7] bg-white py-2.5">
                  diazlab.online/c/
                </span>
                <input
                  type="text"
                  placeholder="ej: optica-nuevo-horizonte"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full px-3 py-2.5 text-xs text-[#161616] font-bold focus:outline-none bg-transparent"
                />
              </div>
              <p className="text-[11px] text-[#6B6862] mt-1.5">
                Esta es la dirección pública que compartirás en tu WhatsApp, redes sociales y perfil comercial.
              </p>
            </div>
          </div>
        )}

        {/* PASO 2: BRANDING Y COLORES */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#161616] flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">palette</span>
              Paso 2: Personalización e Identidad de Marca
            </h3>

            {/* NOTICIA DE LOGO SINCRONIZADO */}
            {logoUrl ? (
              <div className="bg-[#E6F4EA] p-3.5 rounded-xl border border-[#A8DADC] flex items-center gap-3.5">
                <img
                  src={logoUrl}
                  alt="Logo de la empresa"
                  className="w-14 h-14 object-contain bg-white rounded-lg border border-[#E2DFD7] p-1 shadow-xs"
                />
                <div>
                  <span className="text-xs font-bold text-[#1E4620] flex items-center gap-1">
                    ✓ Logo detectado desde "Datos de la Empresa"
                  </span>
                  <p className="text-[11px] text-[#2D6A4F] mt-0.5">
                    No es necesario volver a subirlo. Tu tienda web usará este logotipo automáticamente. Si deseas cambiarlo solo para la web, puedes modificar la URL a continuación.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E2DFD7] flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600">info</span>
                <p className="text-xs text-[#6B6862]">
                  <strong>Tip de Sincronización:</strong> Si ya cargaste un logotipo comercial en <em>Datos de la Empresa</em>, se asignará automáticamente a tu e-commerce sin que tengas que volver a subirlo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#161616] block mb-1">
                  URL del Logo Comercial {logoUrl && <span className="text-[#059669] font-normal">(Sincronizado)</span>}
                </label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/logo.png"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#161616]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#161616] block mb-1">URL del Banner de Portada (Opcional)</label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/banner.jpg"
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#161616]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#161616] block mb-1">Descripción Comercial o Lema</label>
              <textarea
                rows={3}
                placeholder="Ej: Especialistas en lentes progresivos con despacho express en toda la ciudad."
                value={catalogDescription}
                onChange={e => setCatalogDescription(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg p-3 text-xs font-medium focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* PASO 3: CATEGORÍAS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#161616] flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">category</span>
              Paso 3: Selección Masiva de Categorías a Publicar
            </h3>
            <p className="text-xs text-[#6B6862]">
              Haz clic en cada categoría para definir si deseas mostrarla u ocultarla en tu e-commerce web.
            </p>

            {categories.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B6862] bg-[#FAF8F5] rounded-lg border border-[#E2DFD7]">
                No hay categorías registradas aún en el ERP. Tus productos sin categoría se mostrarán automáticamente.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map(cat => {
                  const isVisible = Boolean(cat.is_visible_web);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategoryVisibility(cat.id)}
                      className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-left ${
                        isVisible
                          ? 'bg-[#E6F4EA] border-[#059669] text-[#1E4620] shadow-xs'
                          : 'bg-[#FAF8F5] border-[#E2DFD7] text-[#6B6862] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex flex-col pr-2 overflow-hidden">
                        <span className="text-sm font-bold truncate text-[#161616]">{cat.name}</span>
                        <span className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${isVisible ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                          {isVisible ? '✓ Publicado' : '✕ Oculto'}
                        </span>
                      </div>
                      <span className={`material-symbols-outlined text-[24px] shrink-0 ${isVisible ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>
                        {isVisible ? 'check_circle' : 'do_not_disturb_on'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PASO 4: LOGÍSTICA */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#161616] flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">local_shipping</span>
              Paso 4: Logística y Asignación de Sedes
            </h3>

            <div>
              <label className="text-xs font-bold text-[#161616] block mb-2">Modalidades de Entrega Habilitadas</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'both', label: 'Ambas (Domicilio + Retiro)' },
                  { id: 'domicilio', label: 'Solo Domicilio' },
                  { id: 'pickup', label: 'Solo Retiro en Tienda' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeliveryMethod(opt.id as any)}
                    className={`py-3 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      deliveryMethod === opt.id
                        ? 'bg-[#161616] text-white border-[#161616]'
                        : 'bg-[#FAF8F5] text-[#6B6862] border-[#E2DFD7]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#161616] uppercase tracking-wider mb-2">
                Sedes de Despacho Activas ({branches.length})
              </h4>
              <div className="space-y-2">
                {branches.map(b => (
                  <div key={b.id} className="p-3 bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#161616]">{b.branch_name || b.name}</span>
                      <p className="text-[11px] text-[#6B6862]">{b.address || 'Sin dirección registrada'}</p>
                    </div>
                    <span className="text-[11px] bg-white border border-[#E2DFD7] px-2.5 py-1 rounded font-mono text-[#6B6862]">
                      📱 WhatsApp: {b.phone || 'Teléfono principal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PASO 5: LANZAR Y PROBAR */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#161616] flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">rocket_launch</span>
              Paso 5: Probar y Compartir tu Tienda E-Commerce
            </h3>

            <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#E2DFD7] space-y-4">
              <div>
                <span className="text-[11px] text-[#6B6862] font-bold uppercase tracking-wider block mb-1">
                  🌐 Enlace de Pruebas Locales (Puerto 3001)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full bg-white border border-[#E2DFD7] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#161616]"
                  />
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition whitespace-nowrap"
                  >
                    Probar Local
                  </a>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#6B6862] font-bold uppercase tracking-wider block mb-1">
                  🌍 Enlace de Producción (diazlab.online)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={productionUrl}
                    className="w-full bg-white border border-[#E2DFD7] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#161616]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(productionUrl);
                      alert('¡Enlace de producción copiado al portapapeles!');
                    }}
                    className="px-4 py-2 bg-[#161616] hover:bg-[#D9381E] text-white text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer"
                  >
                    Copiar Enlace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTONES DE NAVEGACIÓN Y GUARDADO DE WIZARD */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E2DFD7]">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          className="px-5 py-2.5 bg-white border border-[#E2DFD7] text-[#161616] font-bold text-xs rounded-lg disabled:opacity-40 cursor-pointer"
        >
          ← Anterior
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveSettings}
            className="px-6 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer"
          >
            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>

          {currentStep < 5 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              className="px-6 py-2.5 bg-[#161616] hover:bg-[#D9381E] text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
