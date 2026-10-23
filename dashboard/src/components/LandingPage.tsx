import React, { useState } from 'react';
import { LegalDocsModal } from './LegalDocsModal';

interface LandingPageProps {
  onLoginClick: () => void;
}

export type ProposalTheme = 'wabi-sabi' | 'kuro-dark' | 'modern-grid';

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  // Estado de propuesta activa (guarda preferencia en localStorage)
  const [proposal, setProposal] = useState<ProposalTheme>(() => {
    const saved = localStorage.getItem('dla_landing_proposal') as ProposalTheme | null;
    return saved && ['wabi-sabi', 'kuro-dark', 'modern-grid'].includes(saved) ? saved : 'wabi-sabi';
  });

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'terminos' | 'privacidad' | 'ia_transparency'>('terminos');

  // Pestaña activa en la vitrina interactiva de Frant ERP
  const [activeShowcase, setActiveShowcase] = useState<'pos' | 'ai' | 'delivery' | 'resto' | 'optica'>('pos');

  // Guardar propuesta seleccionada
  const handleSelectProposal = (theme: ProposalTheme) => {
    setProposal(theme);
    localStorage.setItem('dla_landing_proposal', theme);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const whatsappSalesUrl = (topic: string) => {
    const text = encodeURIComponent(`Hola Diaz Lab Automation, deseo información sobre: *${topic}* en Frant ERP.`);
    return `https://wa.me/573116718652?text=${text}`;
  };

  const handleLoginRedirection = () => {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('diazlab.online')) {
      window.location.href = 'https://app.diazlab.online';
    } else {
      onLoginClick();
    }
  };

  // Configuración de Tokens y Clases según la propuesta seleccionada
  const themeStyles = {
    'wabi-sabi': {
      wrapper: 'bg-[#F6F4EE] text-[#161616] font-[\'Plus_Jakarta_Sans\',sans-serif]',
      navBg: 'bg-[#F6F4EE]/90 backdrop-blur-md border-[#E2DFD7]',
      cardBg: 'bg-white border-[#E2DFD7] shadow-[0_4px_24px_rgba(22,22,22,0.03)]',
      cardHover: 'hover:border-[#D9381E] hover:shadow-[0_8px_32px_rgba(217,56,30,0.08)]',
      textMuted: 'text-[#6B6862]',
      borderThin: 'border-[#E2DFD7]',
      accentColor: '#D9381E',
      accentBg: 'bg-[#D9381E]',
      accentHover: 'hover:bg-[#B82B14]',
      accentText: 'text-[#D9381E]',
      badgeBg: 'bg-[#D9381E]/10 text-[#D9381E] border border-[#D9381E]/20',
      heroTitle: 'font-[\'Instrument_Serif\',Georgia,serif] text-[#161616] tracking-tight font-normal italic-title',
      sectionTitle: 'font-[\'Instrument_Serif\',Georgia,serif] text-[#161616] font-normal tracking-tight',
      highlightBox: 'bg-[#FAF8F3] border-[#E2DFD7]',
      dotStyle: 'w-2.5 h-2.5 bg-[#D9381E] inline-block',
      buttonPrimary: 'bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] shadow-sm',
      buttonAccent: 'bg-[#D9381E] hover:bg-[#B82B14] text-white shadow-sm',
      buttonOutline: 'border border-[#161616]/25 hover:border-[#D9381E] text-[#161616] hover:bg-[#D9381E]/5',
      proposalPill: 'bg-[#FAF8F3] border-[#E2DFD7] text-[#161616]',
      showcaseBg: 'bg-[#FAF8F3] border-[#E2DFD7]',
      tableHeaderBg: 'bg-[#FAF8F3] text-[#6B6862]'
    },
    'kuro-dark': {
      wrapper: 'bg-[#0C0D0F] text-[#EDEBE6] font-[\'Outfit\',sans-serif]',
      navBg: 'bg-[#0C0D0F]/90 backdrop-blur-md border-white/10',
      cardBg: 'bg-[#131519] border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
      cardHover: 'hover:border-[#E63946]/60 hover:shadow-[0_0_24px_rgba(230,57,70,0.15)]',
      textMuted: 'text-[#8C9099]',
      borderThin: 'border-white/10',
      accentColor: '#E63946',
      accentBg: 'bg-[#E63946]',
      accentHover: 'hover:bg-[#C92A37]',
      accentText: 'text-[#E63946]',
      badgeBg: 'bg-[#E63946]/15 text-[#FFA5AB] border border-[#E63946]/30',
      heroTitle: 'font-[\'Instrument_Serif\',Georgia,serif] text-white tracking-wide font-normal',
      sectionTitle: 'font-[\'Instrument_Serif\',Georgia,serif] text-white font-normal tracking-wide',
      highlightBox: 'bg-[#16181D] border-white/10',
      dotStyle: 'w-2.5 h-2.5 bg-[#E63946] inline-block shadow-[0_0_8px_#E63946]',
      buttonPrimary: 'bg-white hover:bg-slate-200 text-[#0C0D0F] font-semibold',
      buttonAccent: 'bg-[#E63946] hover:bg-[#C92A37] text-white font-semibold shadow-[0_0_20px_rgba(230,57,70,0.3)]',
      buttonOutline: 'border border-white/20 hover:border-white/50 text-white hover:bg-white/5',
      proposalPill: 'bg-[#16181D] border-white/15 text-white',
      showcaseBg: 'bg-[#16181D] border-white/10',
      tableHeaderBg: 'bg-[#16181D] text-[#8C9099]'
    },
    'modern-grid': {
      wrapper: 'bg-[#F9F9F8] text-[#111111] font-[\'Plus_Jakarta_Sans\',sans-serif]',
      navBg: 'bg-[#FFFFFF] border-b-2 border-black',
      cardBg: 'bg-white border-2 border-black shadow-[4px_4px_0px_#111111]',
      cardHover: 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0px_#DC2626] transition-all',
      textMuted: 'text-[#4B5563]',
      borderThin: 'border-black/20',
      accentColor: '#DC2626',
      accentBg: 'bg-[#DC2626]',
      accentHover: 'hover:bg-[#B91C1C]',
      accentText: 'text-[#DC2626]',
      badgeBg: 'bg-[#F59E0B] text-black font-mono border border-black font-black',
      heroTitle: 'font-[\'Syne\',sans-serif] font-extrabold uppercase text-black tracking-tight',
      sectionTitle: 'font-[\'Syne\',sans-serif] font-black uppercase text-black tracking-tight',
      highlightBox: 'bg-[#FFFBEB] border-2 border-black',
      dotStyle: 'w-3 h-3 bg-[#DC2626] border border-black inline-block',
      buttonPrimary: 'bg-black hover:bg-[#222222] text-white border-2 border-black shadow-[3px_3px_0px_#DC2626] font-black',
      buttonAccent: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-2 border-black shadow-[3px_3px_0px_#000] font-black',
      buttonOutline: 'border-2 border-black hover:bg-black hover:text-white font-bold transition-all shadow-[2px_2px_0px_#000]',
      proposalPill: 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000]',
      showcaseBg: 'bg-[#F3F4F6] border-2 border-black',
      tableHeaderBg: 'bg-black text-white font-mono'
    }
  }[proposal];

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-x-hidden relative ${themeStyles.wrapper}`}>
      
      {/* =========================================================================
          BARRA FLOTANTE INTERACTIVA: SELECTOR DE LAS 3 PROPUESTAS DE DISEÑO
          Permite al usuario conmutar entre Wabi-Sabi, Kuro Dark y Modern Grid
         ========================================================================= */}
      <aside aria-label="Selector de Propuestas" className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
        <div className={`px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-full backdrop-blur-xl border flex items-center gap-1.5 sm:gap-3 shadow-2xl transition-all ${themeStyles.proposalPill}`}>
          <div className="hidden lg:flex items-center gap-2 pr-2 border-r border-current/20 text-[10px] uppercase font-mono tracking-widest opacity-80">
            <span className="material-symbols-outlined text-sm">palette</span>
            <span>Propuestas:</span>
          </div>

          <button
            onClick={() => handleSelectProposal('wabi-sabi')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              proposal === 'wabi-sabi'
                ? 'bg-[#161616] text-[#F6F4EE] shadow-sm'
                : 'hover:bg-black/5 opacity-70 hover:opacity-100'
            }`}
          >
            <span>📜</span>
            <span className="font-['Instrument_Serif'] text-sm hidden sm:inline">Propuesta 1:</span>
            <span className="font-medium">Wabi-Sabi Paper</span>
          </button>

          <button
            onClick={() => handleSelectProposal('kuro-dark')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              proposal === 'kuro-dark'
                ? 'bg-[#E63946] text-white shadow-[0_0_15px_rgba(230,57,70,0.5)]'
                : 'hover:bg-white/10 opacity-70 hover:opacity-100'
            }`}
          >
            <span>🌑</span>
            <span className="font-['Instrument_Serif'] text-sm hidden sm:inline">Propuesta 2:</span>
            <span className="font-medium">Kuro Sumi Dark</span>
          </button>

          <button
            onClick={() => handleSelectProposal('modern-grid')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              proposal === 'modern-grid'
                ? 'bg-[#F59E0B] text-black font-black border border-black shadow-[2px_2px_0px_#000]'
                : 'hover:bg-black/5 opacity-70 hover:opacity-100'
            }`}
          >
            <span>🟡</span>
            <span className="font-['Syne'] text-xs uppercase hidden sm:inline">Propuesta 3:</span>
            <span className="font-medium">Modern Grid</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          1. HEADER & NAVBAR EDITORIAL
         ========================================================================= */}
      <header className={`sticky top-0 z-40 border-b px-6 sm:px-12 py-4 flex items-center justify-between transition-colors ${themeStyles.navBg}`}>
        {/* Marca: DIAZ LAB AUTOMATION con Tipografía Editorial y Punto Bermellón */}
        <div 
          className="flex flex-col cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-['Instrument_Serif',Georgia,serif] text-2xl sm:text-3xl tracking-[0.08em] font-normal uppercase leading-none">
              DIAZ LAB
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.28em] uppercase opacity-75 font-medium">
              AUTOMATION
            </span>
            <span className={themeStyles.dotStyle} />
            <span className="font-mono text-[8px] uppercase tracking-widest opacity-60 ml-1 hidden sm:inline">
              • FRANT ERP
            </span>
          </div>
        </div>

        {/* Menú de Navegación Editorial */}
        <nav aria-label="Navegación Principal" className="hidden lg:flex items-center gap-8 text-xs tracking-wider uppercase font-medium">
          <a href="#hero" className="hover:opacity-100 opacity-70 transition-opacity">Inicio</a>
          <a href="#frant-erp" className="hover:opacity-100 opacity-70 transition-opacity flex items-center gap-1">
            <span>Frant ERP</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${themeStyles.badgeBg}`}>SaaS</span>
          </a>
          <a href="#sectores" className="hover:opacity-100 opacity-70 transition-opacity">Sectores</a>
          <a href="#planes" className="hover:opacity-100 opacity-70 transition-opacity">Planes</a>
          <a href="#ingenieria" className="hover:opacity-100 opacity-70 transition-opacity">Ingeniería a Medida</a>
          <a href="#metodologia" className="hover:opacity-100 opacity-70 transition-opacity">Metodología</a>
        </nav>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-3">
          <a
            href={whatsappSalesUrl('Asesoría General')}
            target="_blank"
            rel="noreferrer"
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${themeStyles.buttonOutline}`}
          >
            <span className="material-symbols-outlined text-[15px]">chat</span>
            <span>WhatsApp</span>
          </a>

          <button
            onClick={handleLoginRedirection}
            className={`px-5 py-2 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer ${themeStyles.buttonAccent}`}
            title="Ingreso a Frant ERP"
          >
            <span className="material-symbols-outlined text-[15px]">login</span>
            <span>Acceder a Frant ERP</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION: LA CONJUNCIÓN ENTRE DIAZ LAB & FRANT ERP
         ========================================================================= */}
      <section id="hero" className="relative pt-12 sm:pt-20 pb-20 sm:pb-28 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Columna Izquierda: Filosofía Editorial & Copy */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            {/* Tag Superior */}
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono tracking-widest uppercase px-3 py-1 rounded-full ${themeStyles.badgeBg}`}>
                Diaz Lab Automation ▪ Software Oficial
              </span>
            </div>

            {/* Titular Principal */}
            <h1 className={`text-4xl sm:text-6xl xl:text-6xl leading-[1.08] ${themeStyles.heroTitle}`}>
              Automatizamos lo complejo. <br />
              <span className={themeStyles.accentText}>Potenciamos lo que importa.</span>
            </h1>

            {/* Explicación de la Relación Empresa - Producto */}
            <p className={`text-base sm:text-lg leading-relaxed font-light ${themeStyles.textMuted}`}>
              En <strong>Diaz Lab Automation</strong> diseñamos <strong>Frant ERP</strong>: la plataforma de software integral que une <strong>Punto de Venta POS</strong>, <strong>Facturación DIAN con QR</strong>, <strong>Agente WhatsApp IA 24/7</strong> y <strong>Logística inteligente</strong>, combinada con servicios de ingeniería de automatización a la medida.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <a
                href="#planes"
                className={`px-7 py-3.5 rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${themeStyles.buttonAccent}`}
              >
                <span>Ver Planes Frant ERP (Desde $49.000 COP)</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>

              <a
                href="#ingenieria"
                className={`px-6 py-3.5 rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${themeStyles.buttonOutline}`}
              >
                <span>Ingeniería a la Medida</span>
              </a>
            </div>

            {/* Sellos de Confianza y Arquitectura */}
            <div className={`pt-6 border-t grid grid-cols-3 gap-3 text-xs font-mono ${themeStyles.borderThin}`}>
              <div className="space-y-1">
                <span className="block text-[10px] uppercase opacity-60">Fiscal</span>
                <span className="font-bold flex items-center gap-1">
                  <span className="text-emerald-600 text-sm">✓</span> DIAN 100% Legal
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] uppercase opacity-60">Inteligencia</span>
                <span className="font-bold flex items-center gap-1">
                  <span className={themeStyles.accentText}>▪</span> WhatsApp IA 24/7
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] uppercase opacity-60">Logística</span>
                <span className="font-bold flex items-center gap-1">
                  <span className="text-blue-600 text-sm">📍</span> Maps $0 Costo API
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Vitrina Interactiva de Frant ERP */}
          <div className="lg:col-span-6">
            <div className={`rounded-3xl border p-4 sm:p-6 transition-all ${themeStyles.cardBg}`}>
              
              {/* Barra de Ventana Widescreen */}
              <div className="flex items-center justify-between pb-4 border-b border-current/10 mb-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="font-semibold ml-2 opacity-80">Frant ERP Console</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] opacity-70">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En Línea • Multi-Tenant</span>
                </div>
              </div>

              {/* Selector de Pestañas de la Vitrina */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { id: 'pos', label: 'POS & DIAN', icon: 'point_of_sale' },
                  { id: 'ai', label: 'WhatsApp IA', icon: 'smart_toy' },
                  { id: 'delivery', label: 'Rutas Maps', icon: 'local_shipping' },
                  { id: 'resto', label: 'Gastronomía', icon: 'restaurant' },
                  { id: 'optica', label: 'Salud Visual', icon: 'visibility' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveShowcase(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeShowcase === tab.id
                        ? `${themeStyles.buttonPrimary}`
                        : `opacity-60 hover:opacity-100 ${themeStyles.highlightBox} border`
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Panel de Contenido de la Vitrina Interactiva */}
              <div className={`rounded-2xl p-4 sm:p-5 border text-left min-h-[260px] flex flex-col justify-between ${themeStyles.showcaseBg}`}>
                {activeShowcase === 'pos' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2 border-current/10">
                      <span className="font-mono text-xs font-bold uppercase">Facturación Electrónica DIAN & POS</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">CUFE Válido</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                        <span className="text-[10px] opacity-60 uppercase">Factura No.</span>
                        <p className="font-bold">FE-2026-0842</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                        <span className="text-[10px] opacity-60 uppercase">Total Cobrado</span>
                        <p className="font-bold text-emerald-600">$ 245.000 COP</p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">
                      Emisión instantánea con código QR fiscal, resolución DIAN autorizada, tiquete térmico de 80mm y sincronización automática de inventario.
                    </p>
                  </div>
                )}

                {activeShowcase === 'ai' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2 border-current/10">
                      <span className="font-mono text-xs font-bold uppercase">Agente WhatsApp Autónomo 24/7</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold">IA Activa</span>
                    </div>
                    <div className="space-y-2 text-xs font-sans">
                      <div className="bg-black/5 dark:bg-white/5 p-2.5 rounded-xl rounded-tl-none max-w-[85%]">
                        <span className="text-[10px] font-mono text-[#D9381E] block font-bold">Cliente en WhatsApp:</span>
                        "Hola, ¿tienen monturas en titanio y hacen examen visual?"
                      </div>
                      <div className="bg-[#D9381E]/10 p-2.5 rounded-xl rounded-tr-none max-w-[90%] ml-auto text-right">
                        <span className="text-[10px] font-mono block font-bold opacity-75">Frant IA:</span>
                        "¡Hola! Sí, tenemos 12 modelos en titanio desde $180.000 y agenda para examen visual hoy a las 3:30 PM. ¿Deseas reservarla?"
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-75 font-mono pt-1">
                      Entrenado con el catálogo, stock e historial de tu propio negocio.
                    </p>
                  </div>
                )}

                {activeShowcase === 'delivery' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2 border-current/10">
                      <span className="font-mono text-xs font-bold uppercase">Logística & Hojas de Ruta Inteligentes</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">$0 Costo API</span>
                    </div>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                        <span>1. Cra 43A #14-20 (El Poblado)</span>
                        <span className="font-bold text-blue-600">0.8 km</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                        <span>2. Cll 10 #32-15 (Castropol)</span>
                        <span className="font-bold text-blue-600">1.6 km</span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">
                      Ordenamiento algorítmico por proximidad con botón de apertura en Google Maps para repartidores sin pagar costos de Google Cloud.
                    </p>
                  </div>
                )}

                {activeShowcase === 'resto' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2 border-current/10">
                      <span className="font-mono text-xs font-bold uppercase">Gastronomía, Mesas & Cocina KDS</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">Tiempo Real</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                        <span className="block text-[10px] text-emerald-600 font-bold">MESA 04</span>
                        <span>Ocupada</span>
                      </div>
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
                        <span className="block text-[10px] text-amber-600 font-bold">COCINA</span>
                        <span>2 Platos</span>
                      </div>
                      <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-current/10">
                        <span className="block text-[10px] opacity-60">CARTA QR</span>
                        <span>Activa</span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">
                      Comandero para camareros desde el celular, pantalla de preparación en cocina (KDS) y carta digital interactiva para comensales.
                    </p>
                  </div>
                )}

                {activeShowcase === 'optica' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2 border-current/10">
                      <span className="font-mono text-xs font-bold uppercase">Especialización Ópticas & Salud Visual</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold">Clínico</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                        <span className="text-[10px] opacity-60 block">Ojo Derecho (OD)</span>
                        <p className="font-bold">Esf: -1.75 | Cil: -0.50 | Eje: 90°</p>
                      </div>
                      <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                        <span className="text-[10px] opacity-60 block">Ojo Izquierdo (OI)</span>
                        <p className="font-bold">Esf: -2.00 | Cil: -0.25 | Eje: 85°</p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">
                      Control de trabajos de laboratorio de lentes, recetas refractivas de optometría e historial clínico del paciente.
                    </p>
                  </div>
                )}

                {/* Footer de la Mini-Consola */}
                <div className="pt-3 border-t border-current/10 flex items-center justify-between text-[11px] font-mono opacity-70">
                  <span>Desarrollado por Diaz Lab Automation</span>
                  <span className="font-bold">Frant ERP v2.4</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          3. SECCIÓN: FRANT ERP — EL SISTEMA OPERATIVO PARA TU NEGOCIO
         ========================================================================= */}
      <section id="frant-erp" className={`py-20 sm:py-28 px-6 sm:px-12 max-w-7xl mx-auto border-t ${themeStyles.borderThin}`}>
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className={`text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full ${themeStyles.badgeBg}`}>
            Plataforma SaaS Lista para Usar
          </span>
          <h2 className={`text-3xl sm:text-5xl ${themeStyles.sectionTitle}`}>
            Frant ERP: Potencia Operativa Total
          </h2>
          <p className={`text-sm sm:text-base ${themeStyles.textMuted}`}>
            Un solo sistema integral con módulos diseñados para que tu negocio facture, venda por WhatsApp y entregue pedidos sin errores.
          </p>
        </div>

        {/* Grilla Editorial de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          
          {/* Módulo 01 */}
          <div className={`p-8 rounded-3xl border transition-all ${themeStyles.cardBg} ${themeStyles.cardHover} flex flex-col justify-between space-y-4`}>
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold opacity-50">01 / CAJA FISCAL</span>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-600">
                <span className="material-symbols-outlined text-2xl">point_of_sale</span>
              </div>
              <h3 className="font-bold text-lg">Punto de Venta POS & DIAN</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Cobro ágil con pistola de códigos de barras, tiquetes térmicos de 80mm y facturación electrónica autorizada por la DIAN con código CUFE y QR fiscal.
              </p>
            </div>
            <div className="pt-4 border-t border-current/10 text-[11px] font-mono font-semibold flex items-center gap-1">
              <span>Resolución DIAN Oficial</span>
            </div>
          </div>

          {/* Módulo 02 */}
          <div className={`p-8 rounded-3xl border transition-all ${themeStyles.cardBg} ${themeStyles.cardHover} flex flex-col justify-between space-y-4`}>
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold opacity-50">02 / INTELIGENCIA</span>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/10 text-purple-600">
                <span className="material-symbols-outlined text-2xl">smart_toy</span>
              </div>
              <h3 className="font-bold text-lg">Agente WhatsApp IA 24/7</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Asesor autónomo conectado a tu número oficial de WhatsApp que atiende clientes, cotiza con el stock del ERP, agenda citas y cobra sin intervención manual.
              </p>
            </div>
            <div className="pt-4 border-t border-current/10 text-[11px] font-mono font-semibold flex items-center gap-1">
              <span>Automatización Conversacional</span>
            </div>
          </div>

          {/* Módulo 03 */}
          <div className={`p-8 rounded-3xl border transition-all ${themeStyles.cardBg} ${themeStyles.cardHover} flex flex-col justify-between space-y-4`}>
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold opacity-50">03 / MOVILIDAD</span>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-600">
                <span className="material-symbols-outlined text-2xl">local_shipping</span>
              </div>
              <h3 className="font-bold text-lg">Hojas de Ruta & Domicilios</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Organización de despachos por cercanía geográfica con botón directo para abrir la ruta en Google Maps en el celular del mensajero, a $0 costo de API.
              </p>
            </div>
            <div className="pt-4 border-t border-current/10 text-[11px] font-mono font-semibold flex items-center gap-1">
              <span>Georreferenciación Eficiente</span>
            </div>
          </div>

          {/* Módulo 04 */}
          <div className={`p-8 rounded-3xl border transition-all ${themeStyles.cardBg} ${themeStyles.cardHover} flex flex-col justify-between space-y-4`}>
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold opacity-50">04 / CONTROL</span>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/10 text-amber-600">
                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
              </div>
              <h3 className="font-bold text-lg">Cartera, Arqueo & Finanzas</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Arqueo de turnos de empleados, control de abonos y crédito a clientes, trazabilidad de accesos con PIN personal y auditoría de inventario blindada.
              </p>
            </div>
            <div className="pt-4 border-t border-current/10 text-[11px] font-mono font-semibold flex items-center gap-1">
              <span>Auditoría & Seguridad</span>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          4. SECTORES ESPECIALIZADOS (ADAPTABILIDAD VERTICAL)
         ========================================================================= */}
      <section id="sectores" className={`py-20 sm:py-28 px-6 sm:px-12 max-w-7xl mx-auto border-t ${themeStyles.borderThin}`}>
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className={`text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full ${themeStyles.badgeBg}`}>
            Verticales de Industria
          </span>
          <h2 className={`text-3xl sm:text-5xl ${themeStyles.sectionTitle}`}>
            Hecho para la Realidad de tu Rubro
          </h2>
          <p className={`text-sm sm:text-base ${themeStyles.textMuted}`}>
            Frant ERP no es un sistema genérico. Activa la configuración específica para los requerimientos de tu modelo de negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
          {[
            {
              icon: '👓',
              title: 'Ópticas & Salud Visual',
              desc: 'Fórmulas refractivas completas, control de lentes de laboratorio, armazones y recordatorios de citas automáticos por WhatsApp.'
            },
            {
              icon: '🍽️',
              title: 'Restaurantes & Bares',
              desc: 'Carta digital web con QR, comandero para camareros, pantalla de cocina KDS por estaciones y mapa interactivo de mesas.'
            },
            {
              icon: '👗',
              title: 'Moda, Calzado & Ropa',
              desc: 'Matriz de variantes por talla y color, etiquetas de código de barras para prendas y catálogo fotográfico en línea.'
            },
            {
              icon: '🛍️',
              title: 'Tiendas & Retail POS',
              desc: 'Venta veloz por código de barras, factura electrónica DIAN, control de stock mínimo con alertas y catálogo para WhatsApp.'
            },
            {
              icon: '🏢',
              title: 'Almacenes & Mayoristas',
              desc: 'Precios mayoristas y al detal, gestión de cartera con límites de crédito, despachos y remisiones de entrega.'
            }
          ].map((sector, idx) => (
            <div 
              key={idx} 
              className={`p-6 rounded-3xl border transition-all ${themeStyles.cardBg} ${themeStyles.cardHover} space-y-3`}
            >
              <span className="text-3xl block">{sector.icon}</span>
              <h3 className="font-bold text-sm">{sector.title}</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                {sector.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. PLANES DE SUSCRIPCIÓN TRANSPARENTES (PRECIOS COP)
         ========================================================================= */}
      <section id="planes" className={`py-20 sm:py-28 px-6 sm:px-12 max-w-7xl mx-auto border-t ${themeStyles.borderThin}`}>
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className={`text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full ${themeStyles.badgeBg}`}>
            Suscripción Mensual en Pesos Colombianos
          </span>
          <h2 className={`text-3xl sm:text-5xl ${themeStyles.sectionTitle}`}>
            Inversión Clara. Cero Letra Chica.
          </h2>
          <p className={`text-sm sm:text-base ${themeStyles.textMuted}`}>
            Comienza a usar Frant ERP hoy mismo con soporte directo del equipo de Diaz Lab Automation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left items-stretch">
          
          {/* PLAN 1: BÁSICO MICRO */}
          <div className={`p-8 sm:p-10 rounded-3xl border flex flex-col justify-between transition-all ${themeStyles.cardBg} ${themeStyles.cardHover}`}>
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                  🟢 Para Comenzar
                </span>
                <h3 className="text-2xl font-bold">Plan Básico (Micro)</h3>
                <p className={`text-xs mt-2 ${themeStyles.textMuted}`}>
                  Para pequeños comercios, profesionales independientes y tiendas de barrio.
                </p>
              </div>

              <div>
                <span className="text-4xl font-extrabold tracking-tight">$49.000</span>
                <span className="text-xs font-mono opacity-60 ml-1">COP / mes</span>
              </div>

              <div className="space-y-3 text-xs border-t pt-6 border-current/10">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Hasta 10 Facturas Electrónicas DIAN / mes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Tiquetes POS Térmicos 80mm Ilimitados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Hasta 3 Colaboradores / Usuarios</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Inventario, Stock Mínimo & Alertas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Catálogo Público Digital para Clientes</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLoginRedirection}
              className={`mt-8 w-full py-3.5 rounded-full text-xs font-semibold uppercase tracking-wider text-center transition-all cursor-pointer ${themeStyles.buttonOutline}`}
            >
              Comenzar con Plan Básico
            </button>
          </div>

          {/* PLAN 2: PRO CRECIMIENTO (MÁS POPULAR) */}
          <div className={`p-8 sm:p-10 rounded-3xl border-2 relative flex flex-col justify-between transition-all shadow-xl ${themeStyles.cardBg} border-[#D9381E]`}>
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-widest bg-[#D9381E] text-white shadow-md">
              ★ Más Recomendado
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D9381E] block mb-1">
                  🚀 Crecimiento & Ventas Automáticas
                </span>
                <h3 className="text-2xl font-bold">Plan Pro (Crecimiento)</h3>
                <p className={`text-xs mt-2 ${themeStyles.textMuted}`}>
                  Para negocios que quieren vender en automático con IA, Domicilios y Landing propia.
                </p>
              </div>

              <div>
                <span className="text-4xl font-extrabold tracking-tight">$149.000</span>
                <span className="text-xs font-mono opacity-60 ml-1">COP / mes</span>
              </div>

              <div className="space-y-3 text-xs border-t pt-6 border-current/10">
                <div className="flex items-center gap-2 font-bold text-[#D9381E]">
                  <span>★</span>
                  <span>Facturas Electrónicas DIAN ILIMITADAS</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-[#D9381E]">
                  <span>★</span>
                  <span>Agente WhatsApp Autónomo con IA 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Hojas de Ruta de Domicilios + Google Maps</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Incluye Diseño y Montaje de Landing Page</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Módulo de Restaurantes (KDS / Mesas / Carta QR)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Cartera, Créditos & Control de Empleados</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLoginRedirection}
              className={`mt-8 w-full py-4 rounded-full text-xs font-bold uppercase tracking-wider text-center transition-all cursor-pointer ${themeStyles.buttonAccent}`}
            >
              Elegir Plan Pro Crecimiento
            </button>
          </div>

          {/* PLAN 3: ENTERPRISE & AGENCIA */}
          <div className={`p-8 sm:p-10 rounded-3xl border flex flex-col justify-between transition-all ${themeStyles.cardBg} ${themeStyles.cardHover}`}>
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-600 block mb-1">
                  👑 Negocio Integral + Agencia
                </span>
                <h3 className="text-2xl font-bold">Plan Enterprise & Agencia</h3>
                <p className={`text-xs mt-2 ${themeStyles.textMuted}`}>
                  Solución 360°: Frant ERP + Dominio Propio + Posicionamiento en Google Maps.
                </p>
              </div>

              <div>
                <span className="text-4xl font-extrabold tracking-tight">$349.000</span>
                <span className="text-xs font-mono opacity-60 ml-1">COP / mes</span>
              </div>

              <div className="space-y-3 text-xs border-t pt-6 border-current/10">
                <div className="flex items-center gap-2 font-bold text-purple-600">
                  <span>✦</span>
                  <span>Dominio Web Propio Incluido (.com / .co)</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-purple-600">
                  <span>✦</span>
                  <span>Diseño Web Personalizado & Landing Comercial</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-purple-600">
                  <span>✦</span>
                  <span>Optimización de Perfil Google Maps (SEO Local)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Frant ERP Completo con Usuarios ILIMITADOS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Soporte Prioritario VIP de Diaz Lab Automation</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLoginRedirection}
              className={`mt-8 w-full py-3.5 rounded-full text-xs font-semibold uppercase tracking-wider text-center transition-all cursor-pointer ${themeStyles.buttonPrimary}`}
            >
              Comenzar con Enterprise
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          6. SECCIÓN: DIAZ LAB AUTOMATION — INGENIERÍA DE SOFTWARE A LA MEDIDA
         ========================================================================= */}
      <section id="ingenieria" className={`py-20 sm:py-28 px-6 sm:px-12 max-w-7xl mx-auto border-t ${themeStyles.borderThin}`}>
        <div className={`p-8 sm:p-14 rounded-3xl border ${themeStyles.cardBg} space-y-12`}>
          
          <div className="max-w-3xl space-y-4 text-left">
            <span className={`text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full ${themeStyles.badgeBg}`}>
              División de Consultoría & Desarrollo
            </span>
            <h2 className={`text-3xl sm:text-5xl ${themeStyles.sectionTitle}`}>
              ¿Necesitas más que un ERP? <br />
              Ingeniería a la Medida por Diaz Lab.
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${themeStyles.textMuted}`}>
              Además de Frant ERP, en <strong>Diaz Lab Automation</strong> desarrollamos soluciones tecnológicas avanzadas, conectando tus sistemas existentes con inteligencia artificial, bases de datos y flujos robotizados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            
            <div className={`p-6 rounded-2xl border ${themeStyles.highlightBox} space-y-3`}>
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">settings_suggest</span>
              </div>
              <h3 className="font-bold text-base">Automatización de Procesos</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Eliminamos tareas manuales repetitivas en Excel, correos y conciliaciones mediante flujos de trabajo programados.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${themeStyles.highlightBox} space-y-3`}>
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">hub</span>
              </div>
              <h3 className="font-bold text-base">Integración de Sistemas & APIs</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Conectamos pasarelas de pago (Wompi, Bold), CRMs y tiendas virtuales para que la información fluya sin fricción.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${themeStyles.highlightBox} space-y-3`}>
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">insights</span>
              </div>
              <h3 className="font-bold text-base">Inteligencia de Datos</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Convertimos la información histórica de tu empresa en tableros de control ejecutivos y modelos de predicción de compras.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${themeStyles.highlightBox} space-y-3`}>
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">psychology</span>
              </div>
              <h3 className="font-bold text-base">IA & Agentes Especializados</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                Despliegue de modelos de lenguaje ajustados con tu conocimiento corporativo, soporte técnico y clasificación de documentos.
              </p>
            </div>

          </div>

          <div className="pt-6 border-t border-current/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-xs font-mono opacity-70">
              ¿Tienes un desafío técnico o un proyecto de software a medida?
            </span>
            <a
              href={whatsappSalesUrl('Ingeniería de Software a la Medida')}
              target="_blank"
              rel="noreferrer"
              className={`px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer ${themeStyles.buttonAccent}`}
            >
              <span>Consultar con un Ingeniero</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. METODOLOGÍA EDITORIAL: 4 ACTOS
         ========================================================================= */}
      <section id="metodologia" className={`py-20 sm:py-28 px-6 sm:px-12 max-w-7xl mx-auto border-t ${themeStyles.borderThin}`}>
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className={`text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full ${themeStyles.badgeBg}`}>
            El Método Diaz Lab
          </span>
          <h2 className={`text-3xl sm:text-5xl ${themeStyles.sectionTitle}`}>
            Un Proceso Claro. Resultados Concretos.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          {[
            {
              step: '01',
              title: 'Entendemos',
              desc: 'Auditamos tu operación actual, diagnosticamos cuellos de botella y definimos los objetivos medibles del negocio.'
            },
            {
              step: '02',
              title: 'Diseñamos',
              desc: 'Arquitectamos la solución en Frant ERP o el software a medida con diagramas de flujo y experiencia zen.'
            },
            {
              step: '03',
              title: 'Implementamos',
              desc: 'Configuración ágil, migración de datos, habilitación ante la DIAN y entrenamiento al equipo en menos de 48 horas.'
            },
            {
              step: '04',
              title: 'Optimizamos',
              desc: 'Acompañamiento continuo, medición de tiempos de respuesta del bot IA y refinamiento constante de procesos.'
            }
          ].map((act, idx) => (
            <div key={idx} className="space-y-3 border-l-2 pl-6 border-current/20">
              <span className={`font-mono text-2xl font-bold ${themeStyles.accentText}`}>{act.step}</span>
              <h3 className="font-bold text-lg">{act.title}</h3>
              <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
                {act.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          8. PREGUNTAS FRECUENTES (FAQ)
         ========================================================================= */}
      <section id="faq" className={`py-20 sm:py-28 px-6 sm:px-12 max-w-4xl mx-auto border-t ${themeStyles.borderThin}`}>
        <div className="text-center mb-16 space-y-3">
          <span className={`text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full ${themeStyles.badgeBg}`}>
            Resolución de Dudas
          </span>
          <h2 className={`text-3xl sm:text-5xl ${themeStyles.sectionTitle}`}>
            Preguntas Frecuentes
          </h2>
        </div>

        <div className="space-y-4 text-left">
          {[
            {
              q: "¿Qué relación existe entre Diaz Lab Automation y Frant ERP?",
              a: "Diaz Lab Automation es la empresa de ingeniería de software y automatización. Frant ERP es nuestro producto de software insignia, desarrollado internamente para resolver de manera integral la facturación POS/DIAN, WhatsApp con IA y la logística de comercios y restaurantes."
            },
            {
              q: "¿Cuánto tiempo toma activar Frant ERP en mi empresa?",
              a: "Si ya cuentas con tu catálogo básico, el sistema queda operativo el mismo día. La habilitación de Facturación Electrónica DIAN toma habitualmente entre 24 y 48 horas hábiles."
            },
            {
              q: "¿Cómo funciona el Agente de WhatsApp IA incluido en el Plan Pro?",
              a: "Se conecta de forma segura a tu número de WhatsApp. El agente lee en tiempo real el inventario de Frant ERP, responde preguntas de clientes, envía fotos, cotizaciones y puede agendar citas en tu calendario automáticamente."
            },
            {
              q: "¿Cómo funciona el beneficio de Dominio Web y Landing Page del Plan Enterprise?",
              a: "Nosotros nos encargamos de registrar el dominio disponible que elijas para tu marca (ej. tunegocio.com), configuramos el certificado de seguridad SSL y diseñamos una página web comercial optimizada para celulares y enlazada a tu ERP."
            },
            {
              q: "¿Puedo solicitar desarrollos o integraciones personalizadas?",
              a: "Totalmente. Como firma de ingeniería, en Diaz Lab Automation adaptamos módulos a la medida, creamos APIs privadas e integramos con cualquier sistema previo que use tu negocio."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => toggleFaq(idx)}
              className={`p-6 rounded-2xl border cursor-pointer transition-all ${themeStyles.cardBg} ${themeStyles.cardHover}`}
            >
              <div className="flex justify-between items-center font-bold text-sm">
                <span>{item.q}</span>
                <span className={`material-symbols-outlined transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
              {activeFaq === idx && (
                <p className={`mt-4 text-xs leading-relaxed border-t pt-4 border-current/10 ${themeStyles.textMuted}`}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          9. CTA FINAL EDITORIAL
         ========================================================================= */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 max-w-5xl mx-auto text-center">
        <div className={`p-10 sm:p-16 rounded-3xl border space-y-6 ${themeStyles.cardBg} shadow-2xl`}>
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-['Instrument_Serif'] text-2xl uppercase tracking-widest">DIAZ LAB</span>
            <span className={themeStyles.dotStyle} />
          </div>

          <h2 className={`text-3xl sm:text-5xl ${themeStyles.sectionTitle}`}>
            ¿Listo para poner tu operación en automático?
          </h2>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed ${themeStyles.textMuted}`}>
            Comienza con <strong>Frant ERP</strong> o hablemos de cómo <strong>Diaz Lab Automation</strong> puede diseñar la solución de ingeniería que tu negocio necesita para escalar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={whatsappSalesUrl('Agendar Demostración de Frant ERP')}
              target="_blank"
              rel="noreferrer"
              className={`px-8 py-4 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${themeStyles.buttonAccent}`}
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>Agendar Demostración en Vivo</span>
            </a>

            <button
              onClick={handleLoginRedirection}
              className={`px-7 py-4 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer ${themeStyles.buttonOutline}`}
            >
              <span>Acceder al Portal Frant ERP</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. FOOTER EDITORIAL CON LEGAL DOCS MODAL INTEGRADO
         ========================================================================= */}
      <footer className={`border-t py-16 px-6 sm:px-12 text-xs ${themeStyles.borderThin}`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 text-left mb-12">
          
          {/* Columna 1: Marca & Filosofía */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="font-['Instrument_Serif'] text-2xl tracking-wider uppercase">DIAZ LAB</span>
              <span className={themeStyles.dotStyle} />
            </div>
            <p className={`text-[11px] leading-relaxed font-light ${themeStyles.textMuted}`}>
              Automatizamos lo complejo. Potenciamos lo que importa. <br />
              Creadores de <strong>Frant ERP</strong>.
            </p>
            <div className="text-[10px] font-mono opacity-60">
              Medellín, Colombia • Operación Global
            </div>
          </div>

          {/* Columna 2: Plataforma Frant ERP */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-[11px] font-mono">Frant ERP</h4>
            <ul className={`space-y-2 text-[11px] ${themeStyles.textMuted}`}>
              <li><a href="#frant-erp" className="hover:underline">Punto de Venta POS & DIAN</a></li>
              <li><a href="#frant-erp" className="hover:underline">Agente WhatsApp IA 24/7</a></li>
              <li><a href="#frant-erp" className="hover:underline">Hojas de Ruta de Domicilios</a></li>
              <li><a href="#sectores" className="hover:underline">Módulos Especializados por Sector</a></li>
              <li><a href="#planes" className="hover:underline">Planes de Suscripción</a></li>
            </ul>
          </div>

          {/* Columna 3: Servicios Diaz Lab */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-[11px] font-mono">Ingeniería Diaz Lab</h4>
            <ul className={`space-y-2 text-[11px] ${themeStyles.textMuted}`}>
              <li><a href="#ingenieria" className="hover:underline">Automatización de Procesos RPA</a></li>
              <li><a href="#ingenieria" className="hover:underline">Integración de APIs & Webhooks</a></li>
              <li><a href="#ingenieria" className="hover:underline">Analítica e Inteligencia de Datos</a></li>
              <li><a href="#ingenieria" className="hover:underline">Agentes de Inteligencia Artificial</a></li>
            </ul>
          </div>

          {/* Columna 4: Cumplimiento Legal & IA */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-[11px] font-mono">Marco Legal & Ético</h4>
            <ul className={`space-y-2 text-[11px] ${themeStyles.textMuted}`}>
              <li>
                <button
                  onClick={() => { setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
                  className="hover:underline cursor-pointer text-left bg-transparent border-0 p-0"
                >
                  Términos y Condiciones de Servicio
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
                  className="hover:underline cursor-pointer text-left bg-transparent border-0 p-0"
                >
                  Política de Privacidad (Habeas Data Ley 1581)
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setLegalModalTab('ia_transparency'); setIsLegalModalOpen(true); }}
                  className={`hover:underline cursor-pointer text-left bg-transparent border-0 p-0 font-bold flex items-center gap-1 ${themeStyles.accentText}`}
                >
                  <span>🤖</span>
                  <span>Declaración de Transparencia en IA</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Barra Inferior de Derechos */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-current/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] opacity-60">
          <p>© 2026 Diaz Lab Automation. Todos los derechos reservados. Frant ERP es una marca de software registrada.</p>
          <div className="flex items-center gap-4 font-mono">
            <span>DIAN CUFE Fiscal</span>
            <span>•</span>
            <span>ISO 27001 Cloud</span>
            <span>•</span>
            <span>Ley 1581 Protección Datos</span>
          </div>
        </div>
      </footer>

      {/* Modal Legal Global */}
      <LegalDocsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

    </div>
  );
};
