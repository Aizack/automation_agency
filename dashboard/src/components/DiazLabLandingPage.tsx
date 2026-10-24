import React, { useState, useEffect, useRef } from 'react';
import { LegalDocsModal } from './LegalDocsModal';

interface DiazLabLandingPageProps {
  onLoginClick: () => void;
  onGoToFrant?: () => void;
}

const AVAILABLE_ERP_MODULES = [
  'Facturación Electrónica DIAN (CUFE)',
  'Agente IA de WhatsApp 24/7',
  'Hojas de Ruta de Domicilios (Maps)',
  'Multi-Sede / Sucursales Adicionales',
];

const AVAILABLE_AGENCY_SERVICES = [
  'Diseño de Website / E-Commerce Propio',
  'Automatización RPA & Integraciones API',
];

export const DiazLabLandingPage: React.FC<DiazLabLandingPageProps> = ({ onLoginClick, onGoToFrant }) => {
  const [selectedRubro, setSelectedRubro] = useState<string>('Óptica / Salud Visual');
  const [selectedMods, setSelectedMods] = useState<string[]>([
    'Facturación Electrónica DIAN (CUFE)',
    'Agente IA de WhatsApp 24/7',
  ]);
  const [selectedAgency, setSelectedAgency] = useState<string[]>([
    'Diseño de Website / E-Commerce Propio',
  ]);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'terminos' | 'privacidad' | 'ia_transparency'>('terminos');

  const agencyWindowRef = useRef<HTMLDivElement>(null);

  // Scroll-Linked 3D Isometric Unfold for the Ecosystem Console
  useEffect(() => {
    const updateAgency3D = () => {
      const el = agencyWindowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const rawProgress = (windowHeight - rect.top) / (windowHeight * 0.85);
      const progress = Math.max(0, Math.min(1, rawProgress));

      const rotX = (1 - progress) * 18;
      const rotY = (1 - progress) * 10;
      const rotZ = (1 - progress) * -2;
      const scale = 0.95 + progress * 0.05;

      el.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    };

    window.addEventListener('scroll', updateAgency3D, { passive: true });
    updateAgency3D();
    return () => window.removeEventListener('scroll', updateAgency3D);
  }, []);

  const toggleMod = (mod: string) => {
    setSelectedMods((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]));
  };

  const toggleAgency = (svc: string) => {
    setSelectedAgency((prev) => (prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]));
  };

  const selectTierPreset = (tier: 1 | 2 | 3) => {
    if (tier === 1) {
      setSelectedMods([]);
      setSelectedAgency([]);
    } else if (tier === 2) {
      setSelectedMods(['Facturación Electrónica DIAN (CUFE)', 'Agente IA de WhatsApp 24/7']);
      setSelectedAgency([]);
    } else {
      setSelectedMods(['Facturación Electrónica DIAN (CUFE)', 'Agente IA de WhatsApp 24/7']);
      setSelectedAgency([...AVAILABLE_AGENCY_SERVICES]);
    }
    const el = document.getElementById('configurador');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGoToFrantApp = (e: React.MouseEvent) => {
    const host = window.location.hostname.toLowerCase();
    if (host === 'diazlab.online' || host === 'www.diazlab.online') {
      window.location.href = 'https://frant.app';
      return;
    }
    if (onGoToFrant) {
      e.preventDefault();
      window.history.pushState({}, '', '/');
      onGoToFrant();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogin = (e: React.MouseEvent) => {
    const host = window.location.hostname.toLowerCase();
    if (host === 'diazlab.online' || host === 'www.diazlab.online') {
      window.location.href = 'https://frant.app/login';
      return;
    }
    e.preventDefault();
    window.history.pushState({}, '', '/login');
    onLoginClick();
  };

  const handleSpotlightMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const handleTiltMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.transform = `perspective(1000px) rotateY(${(x * 6).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg)`;
  };

  const handleTiltLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
  };

  let currentTierLabel = 'NIVEL 01 BASE';
  if (selectedAgency.length > 0) {
    currentTierLabel = 'NIVEL 03 INTEGRAL (ERP + AGENCIA)';
  } else if (selectedMods.length > 0) {
    currentTierLabel = 'NIVEL 02 ERP MODULAR';
  }

  const whatsappMessage = `Hola Diaz Lab Automation, armé mi configuración en diazlab.online:\n• Nivel: *${currentTierLabel}*\n• Rubro: *${selectedRubro}*\n• Módulos ERP: ${
    selectedMods.length ? selectedMods.join(', ') : 'Solo Base'
  }\n• Servicios Diaz Lab Automation: ${
    selectedAgency.length ? selectedAgency.join(', ') : 'Ninguno'
  }\nDeseo recibir cotización.`;

  const whatsappHref = `https://wa.me/573116718652?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="diaz-landing-root min-h-screen bg-[#08090B] text-[#F4F1EA] font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden relative selection:bg-[#FF5520] selection:text-white">
      <style>{`
        /* Garantiza escala exacta 16px = 1rem idéntica al mockup aprobado (sin inflación de portátil del ERP) */
        html {
          font-size: 16px !important;
        }
        .diaz-film-grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          opacity: 0.032;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        .diaz-blueprint-grid {
          background-size: 56px 56px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.028) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
        }
        .diaz-perspective-stage {
          perspective: 1800px;
          transform-style: preserve-3d;
        }
        .diaz-window-3d {
          transform-style: preserve-3d;
          will-change: transform;
          transition: transform 0.12s cubic-bezier(0.2, 0, 0, 1);
          box-shadow: 
            0 4px 8px rgba(0,0,0,0.4),
            0 20px 45px rgba(0,0,0,0.65),
            0 60px 120px -20px rgba(255, 85, 32, 0.16),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }
        @keyframes diazBorderTrail {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .diaz-border-trail {
          position: relative;
        }
        .diaz-border-trail::before {
          content: "";
          position: absolute;
          inset: -1.5px;
          border-radius: inherit;
          padding: 1.5px;
          background: linear-gradient(120deg, rgba(255,85,32,0.9), rgba(212,163,89,0.7), rgba(255,255,255,0.06), rgba(16,185,129,0.6), rgba(255,85,32,0.9));
          background-size: 300% 300%;
          animation: diazBorderTrail 6s ease infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .diaz-spotlight-card {
          position: relative;
          overflow: hidden;
        }
        .diaz-spotlight-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(500px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 85, 32, 0.12), transparent 40%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .diaz-spotlight-card:hover::after {
          opacity: 1;
        }
        .diaz-tilt-card {
          transform-style: preserve-3d;
          transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
          will-change: transform;
        }
        .diaz-btn-tactile {
          transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1), background-color 0.2s ease;
        }
        .diaz-btn-tactile:active {
          transform: scale(0.96);
        }
      `}</style>

      <div className="diaz-film-grain"></div>

      {/* =======================================================================
          BARRA FLOTANTE INFERIOR DE CONEXIÓN CON FRANT.APP (IDÉNTICA AL MOCKUP)
         ======================================================================= */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#121318]/95 backdrop-blur-xl border border-white/15 px-5 py-2.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] hidden sm:flex items-center gap-4 text-xs whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">
            DIAZ LAB AUTOMATION (CASA MATRIZ & PLANES)
          </span>
        </div>
        <a
          href="https://frant.app"
          onClick={handleGoToFrantApp}
          className="pl-4 border-l border-white/15 font-mono text-[11px] text-[#FF5520] hover:text-white font-semibold flex items-center gap-1.5 no-underline cursor-pointer"
        >
          <span>← Volver a frant.app (Plataforma ERP)</span>
        </a>
      </div>

      <div className="diaz-blueprint-grid min-h-screen">
        {/* =======================================================================
            1. HEADER EDITORIAL INDUSTRIAL: DIAZ LAB AUTOMATION
           ======================================================================= */}
        <header className="sticky top-0 z-40 bg-[#08090B]/85 backdrop-blur-xl border-b border-white/10 px-6 lg:px-14 py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <a href="#top" className="flex items-center gap-3.5 no-underline shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#FF5520] flex items-center justify-center font-['Space_Grotesk',sans-serif] font-bold text-lg text-white shadow-[0_0_20px_rgba(255,85,32,0.4)] shrink-0">
                DL
              </div>
              <div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-['Space_Grotesk',sans-serif] font-bold text-base sm:text-lg tracking-[0.06em] text-white uppercase leading-none">
                    DIAZ LAB AUTOMATION
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#FF5520] shrink-0"></span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/50 block mt-1 whitespace-nowrap">
                  SOFTWARE & AI ENGINEERING ATELIER
                </span>
              </div>
            </a>

            <nav className="hidden xl:flex items-center gap-7 font-mono text-xs uppercase tracking-[0.14em] text-white/65 whitespace-nowrap">
              <a href="#arquitectura-3d" className="hover:text-white transition-colors no-underline text-white/65">01. Ecosistema</a>
              <a href="#planes" className="hover:text-white transition-colors text-[#D4A359] font-semibold no-underline">02. Estructura 3 Niveles</a>
              <a href="#configurador" className="hover:text-white transition-colors no-underline text-white/65">03. Cotizador Interactivo</a>
              <a href="#ingenieria" className="hover:text-white transition-colors no-underline text-white/65">04. Ingeniería a Medida</a>
            </nav>

            <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
              <a
                href="https://frant.app"
                onClick={handleGoToFrantApp}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 font-mono text-xs text-white/90 uppercase tracking-wider diaz-btn-tactile no-underline cursor-pointer whitespace-nowrap"
              >
                Ir a frant.app →
              </a>
              <a
                href="#configurador"
                className="hidden sm:inline-flex px-5 py-2.5 rounded-xl bg-[#FF5520] hover:bg-[#e04412] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(255,85,32,0.35)] diaz-btn-tactile no-underline whitespace-nowrap"
              >
                Armar Paquete
              </a>
            </div>
          </div>
        </header>

        {/* =======================================================================
            2. HERO SECTION: CASA MATRIZ DIAZ LAB AUTOMATION + FOTOGRAFÍA 8K DEL ESTUDIO
           ======================================================================= */}
        <section id="top" className="relative pt-14 lg:pt-20 pb-16 px-6 lg:px-14 max-w-[1400px] mx-auto">
          <div className="absolute top-12 right-1/4 w-[650px] h-[350px] bg-[#FF5520]/10 blur-[150px] rounded-full pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-[#FF5520]"></span>
                <span className="text-white/80 uppercase tracking-widest">
                  Barranquilla, Colombia • Ingeniería de Software & IA
                </span>
              </div>

              <h1
                className="font-['Space_Grotesk',sans-serif] text-4xl sm:text-6xl font-bold tracking-[-0.03em] leading-[1.03] text-white"
                style={{ textWrap: 'balance', color: '#FFFFFF' }}
              >
                Construimos el software que{' '}
                <span className="font-['Newsreader',Georgia,serif] italic font-normal text-[#D4A359]">
                  automatiza tu operación
                </span>{' '}
                de punta a punta.
              </h1>

              <p className="text-base sm:text-lg text-white/65 leading-relaxed">
                Somos <strong className="text-white">Diaz Lab Automation</strong>, la casa matriz detrás de <strong className="text-white">Frant ERP</strong> y el estudio de ingeniería que diseña tus plataformas web conectadas al inventario, flujos de automatización RPA y agentes autónomos de Inteligencia Artificial.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a
                  href="#planes"
                  className="px-7 py-4 rounded-2xl bg-[#FF5520] hover:bg-[#e04412] text-white font-mono text-xs font-bold uppercase tracking-[0.15em] shadow-[0_12px_32px_-8px_rgba(255,85,32,0.55)] text-center diaz-btn-tactile no-underline"
                >
                  Ver Arquitectura de Planes (3 Niveles)
                </a>
                <a
                  href="#configurador"
                  className="px-7 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white font-mono text-xs uppercase tracking-[0.14em] text-center diaz-btn-tactile no-underline"
                >
                  Configurar Solución a Medida
                </a>
              </div>
            </div>

            {/* 8K Editorial Photograph */}
            <div className="lg:col-span-6">
              <div
                onMouseMove={handleTiltMove}
                onMouseLeave={handleTiltLeave}
                className="diaz-tilt-card rounded-[28px] p-2.5 bg-gradient-to-b from-white/15 to-white/5 border border-white/15 shadow-[0_35px_90px_rgba(0,0,0,0.8)]"
              >
                <div className="relative rounded-[20px] overflow-hidden aspect-[16/10] outline outline-1 outline-white/10 -outline-offset-1">
                  <img
                    src="/proposals/assets/diazlab_engineering_atelier.jpg"
                    alt="Diaz Lab Automation Engineering Studio"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08090B] via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 inset-x-4 bg-[#0D0F14]/90 backdrop-blur-xl border border-white/15 p-4 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[#FF5520] font-bold">
                        ARQUITECTURA LLAVE EN MANO
                      </div>
                      <div className="font-['Space_Grotesk',sans-serif] text-sm sm:text-base font-bold text-white mt-0.5">
                        Frant ERP Core + E-Commerce Propio + RPA + IA
                      </div>
                    </div>
                    <span className="font-mono text-xs px-3 py-1 rounded-lg bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold whitespace-nowrap shrink-0">
                      99.5% SLA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            3. VENTANA 3D ISOMÉTRICA CON SCROLL UNFOLD: ARQUITECTURA DE ECOSISTEMA
           ======================================================================= */}
        <section id="arquitectura-3d" className="py-12 lg:py-20 px-6 lg:px-14 max-w-[1400px] mx-auto">
          <div className="diaz-perspective-stage">
            <div
              ref={agencyWindowRef}
              className="diaz-window-3d diaz-border-trail rounded-[28px] bg-[#111319] border border-white/15 p-6 sm:p-10"
              style={{ transform: 'rotateX(18deg) rotateY(10deg) rotateZ(-2deg) scale(0.95)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#FF5520]"></span>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/80 font-bold">
                    DIAZ LAB AUTOMATION TELEMETRY • ORQUESTACIÓN CENTRAL
                  </span>
                </div>
                <span className="font-mono text-xs text-[#10B981]">
                  ● Todos los nodos sincronizados en tiempo real
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-8 items-stretch">
                <div className="p-6 rounded-2xl bg-[#181B24] border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] px-2.5 py-1 rounded bg-white/10 text-white/80 uppercase">
                      NODO 01 • PRODUCTO PROPIO
                    </span>
                    <h3 className="font-['Space_Grotesk',sans-serif] text-xl font-bold text-white pt-1">
                      Núcleo Operativo Frant ERP
                    </h3>
                    <p className="text-xs text-white/65 leading-relaxed">
                      Caja POS, arqueo por turno, inventario multi-sede, Facturación Electrónica DIAN y despacho nativo por Gmail OAuth y WhatsApp.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-[#D4A359]">
                    NIVEL 1 & NIVEL 2 →
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#181B24] border border-[#FF5520]/40 flex flex-col justify-between space-y-4 shadow-[0_0_40px_rgba(255,85,32,0.12)]">
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] px-2.5 py-1 rounded bg-[#FF5520] text-white font-bold uppercase">
                      NODO 02 • PUENTE API & IA
                    </span>
                    <h3 className="font-['Space_Grotesk',sans-serif] text-xl font-bold text-white pt-1">
                      Agentes IA & Flujos RPA
                    </h3>
                    <p className="text-xs text-white/65 leading-relaxed">
                      Bots conversacionales entrenados con el stock vivo del ERP, conciliación automática, webhooks con pasarelas (Wompi, Bold) y alertas gerenciales.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-[#10B981]">
                    SINCRONIZACIÓN BIDIRECCIONAL →
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#181B24] border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] px-2.5 py-1 rounded bg-white/10 text-white/80 uppercase">
                      NODO 03 • INGENIERÍA WEB
                    </span>
                    <h3 className="font-['Space_Grotesk',sans-serif] text-xl font-bold text-white pt-1">
                      Websites & E-Commerce de Autor
                    </h3>
                    <p className="text-xs text-white/65 leading-relaxed">
                      Diseñamos y programamos el portal web de tu marca conectado directamente a las existencias y facturación de tu Frant ERP.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-[#D4A359]">
                    PAQUETE INTEGRAL NIVEL 3 →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            4. ESTRUCTURA COMERCIAL EN 3 NIVELES (SEGÚN ARQUITECTURA_LANDINGS.MD)
           ======================================================================= */}
        <section id="planes" className="py-24 px-6 lg:px-14 max-w-[1400px] mx-auto space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#FF5520] font-bold">
              // 02. ARQUITECTURA DE INVERSIÓN EN 3 NIVELES
            </span>
            <h2 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Estructura comercial transparente.{' '}
              <span className="font-['Newsreader',Georgia,serif] italic font-normal text-[#D4A359]">
                Crece a tu propio ritmo.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-white/60 leading-relaxed">
              Ya sea que necesites únicamente el software Frant ERP para tu local o un ecosistema corporativo completo con desarrollo web y automatización de <strong className="text-white">Diaz Lab Automation</strong>, nuestra estructura se divide en tres niveles claros:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* NIVEL 1 */}
            <div
              onMouseMove={handleSpotlightMove}
              className="diaz-spotlight-card rounded-[28px] bg-[#12141B] border border-white/10 p-8 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white font-bold">NIVEL 01</span>
                  <span className="text-white/50">NÚCLEO SAAS</span>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-white">
                    Acceso Base a Frant ERP
                  </h3>
                  <p className="text-xs text-white/60 mt-2 leading-relaxed">
                    La base operativa esencial para digitalizar tu comercio con aislamiento multi-tenant seguro en la nube.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs">
                  <span className="text-white/50 block text-[10px] uppercase">MODALIDAD DE COSTO</span>
                  <span className="text-base font-bold text-white mt-0.5 block">Suscripción Base del Sistema</span>
                </div>
                <ul className="space-y-3 text-xs text-white/75 list-none p-0 m-0">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#10B981] font-bold">✓</span>
                    <span>Punto de Venta (POS) y Arqueo de Caja Diario con reloj en tiempo real.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#10B981] font-bold">✓</span>
                    <span>Control de Inventario, variantes, alertas de stock mínimo y catálogo digital.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#10B981] font-bold">✓</span>
                    <span>
                      Despacho de comprobantes y cotizaciones con tu cuenta de Gmail (<code className="font-mono text-[11px]">gmail.send</code>).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#10B981] font-bold">✓</span>
                    <span>Gestión de cartera, abonos, clientes y control de empleados con PIN.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8 mt-8 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => selectTierPreset(1)}
                  className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center diaz-btn-tactile border-0 cursor-pointer"
                >
                  Seleccionar Nivel 01 en Cotizador
                </button>
              </div>
            </div>

            {/* NIVEL 2 */}
            <div
              onMouseMove={handleSpotlightMove}
              className="diaz-spotlight-card rounded-[28px] bg-[#151822] border border-[#D4A359]/40 p-8 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="px-3 py-1 rounded-full bg-[#D4A359]/20 text-[#D4A359] border border-[#D4A359]/40 font-bold">
                    NIVEL 02
                  </span>
                  <span className="text-[#D4A359]">ESCALABLE POR MÓDULOS</span>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-white">
                    Módulos & Funciones Adicionales del ERP
                  </h3>
                  <p className="text-xs text-white/60 mt-2 leading-relaxed">
                    Suma al Núcleo Base únicamente las capacidades avanzadas o verticales que tu operación requiera activar.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#D4A359]/10 border border-[#D4A359]/25 font-mono text-xs">
                  <span className="text-[#D4A359] block text-[10px] uppercase">MODALIDAD DE COSTO</span>
                  <span className="text-base font-bold text-white mt-0.5 block">Base + Módulos Activos a Demanda</span>
                </div>
                <ul className="space-y-3 text-xs text-white/80 list-none p-0 m-0">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#D4A359] font-bold">+</span>
                    <span>
                      <strong>Módulo Facturación Electrónica DIAN:</strong> Emisión legal con CUFE y QR fiscal.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#D4A359] font-bold">+</span>
                    <span>
                      <strong>Agente IA de WhatsApp 24/7:</strong> Conectado a WhatsApp Cloud API y a tu stock en vivo.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#D4A359] font-bold">+</span>
                    <span>
                      <strong>Logística & Hojas de Ruta:</strong> Despachos georreferenciados con apertura en Maps ($0 API).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#D4A359] font-bold">+</span>
                    <span>
                      <strong>Verticales Especializadas:</strong> Módulo Clínico de Ópticas/Laboratorio o KDS Restaurantes + Sedes adicionales.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="pt-8 mt-8 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => selectTierPreset(2)}
                  className="w-full py-3.5 rounded-xl bg-[#D4A359] hover:bg-[#c29045] text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center diaz-btn-tactile border-0 cursor-pointer"
                >
                  Personalizar Módulos Nivel 02
                </button>
              </div>
            </div>

            {/* NIVEL 3 */}
            <div
              onMouseMove={handleSpotlightMove}
              className="diaz-border-trail diaz-spotlight-card rounded-[28px] bg-gradient-to-b from-[#1B1618] to-[#111319] border border-[#FF5520]/50 p-8 flex flex-col justify-between shadow-[0_25px_70px_rgba(255,85,32,0.18)]"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="px-3 py-1 rounded-full bg-[#FF5520] text-white font-bold">NIVEL 03 • LLAVE EN MANO</span>
                  <span className="text-[#FF5520] font-bold">ERP + AGENCIA</span>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-white">
                    Paquetes Integrales: Frant ERP + Diaz Lab Automation
                  </h3>
                  <p className="text-xs text-white/65 mt-2 leading-relaxed">
                    La solución corporativa total: entregamos el ERP configurado junto con el desarrollo de tu propio sitio web comercial y automatizaciones a medida.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FF5520]/15 border border-[#FF5520]/30 font-mono text-xs">
                  <span className="text-[#FF5520] block text-[10px] uppercase">MODALIDAD DE COSTO</span>
                  <span className="text-base font-bold text-white mt-0.5 block">Paquete Todo Incluido (ERP + Ingeniería)</span>
                </div>
                <ul className="space-y-3 text-xs text-white/85 list-none p-0 m-0">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5520] font-bold">★</span>
                    <span>
                      <strong>Todo el poder de Frant ERP</strong> (Núcleo + Módulos seleccionados).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5520] font-bold">★</span>
                    <span>
                      <strong>Diseño y Desarrollo de Website / E-Commerce a Medida</strong> con tu propio dominio web sincronizado al ERP.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5520] font-bold">★</span>
                    <span>
                      <strong>Flujos RPA e Integraciones API</strong> (pasarelas de pago, CRMs externos, tableros BI).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5520] font-bold">★</span>
                    <span>
                      <strong>Implementación Dedicada:</strong> Migración de catálogo y entrenamiento al personal.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="pt-8 mt-8 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => selectTierPreset(3)}
                  className="w-full py-3.5 rounded-xl bg-[#FF5520] hover:bg-[#e04412] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center shadow-[0_8px_25px_rgba(255,85,32,0.45)] diaz-btn-tactile border-0 cursor-pointer"
                >
                  Armar Paquete Integral Nivel 03
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            5. CONFIGURADOR INTERACTIVO EN VIVO ("ARQUITECTO DE SOLUCIÓN")
           ======================================================================= */}
        <section id="configurador" className="py-20 px-6 lg:px-14 max-w-[1400px] mx-auto">
          <div className="rounded-[32px] bg-[#E9E5DC] text-[#0D0E11] p-8 sm:p-12 lg:p-16 border border-black/15 shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 space-y-8">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D9381E] font-bold">
                    // 03. CONFIGURADOR TÁCTIL DE PROPUESTA
                  </span>
                  <h3 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-4xl font-bold tracking-tight mt-1 text-[#0D0E11]">
                    Selecciona los módulos de tu negocio y recibe tu propuesta exacta.
                  </h3>
                </div>

                {/* Paso 1: Rubro */}
                <div className="space-y-3">
                  <label className="font-mono text-xs uppercase tracking-wider font-bold text-[#4A4843] block">
                    1. Selecciona tu Vertical o Rubro Principal:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'Óptica / Salud Visual', label: '01. Óptica / Salud Visual' },
                      { id: 'Restaurante / Gastronomía', label: '02. Restaurante / KDS' },
                      { id: 'Retail / Comercio / Mayorista', label: '03. Retail / Comercio' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRubro(r.id)}
                        className={`p-3.5 rounded-xl font-mono text-xs text-left cursor-pointer diaz-btn-tactile ${
                          selectedRubro === r.id
                            ? 'border-2 border-black bg-black text-white font-bold'
                            : 'border border-black/20 bg-white text-black font-semibold'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paso 2: Módulos Nivel 2 (ERP) */}
                <div className="space-y-3">
                  <label className="font-mono text-xs uppercase tracking-wider font-bold text-[#4A4843] block">
                    2. Módulos Adicionales de Frant ERP (Nivel 2):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_ERP_MODULES.map((mod) => (
                      <label
                        key={mod}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-black/15 cursor-pointer select-none text-[#0D0E11]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMods.includes(mod)}
                          onChange={() => toggleMod(mod)}
                          className="w-4 h-4 accent-[#FF5520]"
                        />
                        <span className="text-xs font-semibold text-[#0D0E11]">{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Paso 3: Servicios Agencia Nivel 3 (Diaz Lab Automation) */}
                <div className="space-y-3">
                  <label className="font-mono text-xs uppercase tracking-wider font-bold text-[#4A4843] block">
                    3. Servicios de Ingeniería Diaz Lab Automation (Paquete Nivel 3):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_AGENCY_SERVICES.map((svc) => (
                      <label
                        key={svc}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-black/15 cursor-pointer select-none text-[#0D0E11]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgency.includes(svc)}
                          onChange={() => toggleAgency(svc)}
                          className="w-4 h-4 accent-[#FF5520]"
                        />
                        <span className="text-xs font-semibold text-[#0D0E11]">{svc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resumen de Especificación Técnica */}
              <div className="lg:col-span-5 bg-[#111318] text-white rounded-[24px] p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs">
                    <span className="text-[#FF5520] font-bold">ESPECIFICACIÓN DE TU SOLUCIÓN</span>
                    <span className="px-2.5 py-0.5 rounded bg-[#FF5520] text-white text-[10px] font-bold">
                      {currentTierLabel}
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-white/45 block text-[10px] uppercase">RUBRO SELECCIONADO</span>
                      <span className="font-bold text-sm text-white">{selectedRubro}</span>
                    </div>
                    <div>
                      <span className="text-white/45 block text-[10px] uppercase">NÚCLEO INCLUIDO (NIVEL 1)</span>
                      <span className="text-white/85">✓ Frant ERP Core + POS + Caja + Gmail OAuth</span>
                    </div>
                    <div>
                      <span className="text-white/45 block text-[10px] uppercase">MÓDULOS ERP ACTIVOS (NIVEL 2)</span>
                      <ul className="space-y-1 text-[#D4A359] mt-1 list-none p-0 m-0">
                        {selectedMods.length > 0 ? (
                          selectedMods.map((m) => <li key={m}>+ {m}</li>)
                        ) : (
                          <li className="text-white/40">Ninguno (Solo Núcleo Base Nivel 1)</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <span className="text-white/45 block text-[10px] uppercase">INGENIERÍA DIAZ LAB AUTOMATION (NIVEL 3)</span>
                      <ul className="space-y-1 text-[#10B981] mt-1 list-none p-0 m-0">
                        {selectedAgency.length > 0 ? (
                          selectedAgency.map((a) => <li key={a}>★ {a}</li>)
                        ) : (
                          <li className="text-white/40">Sin servicios adicionales de agencia</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-xl bg-[#FF5520] hover:bg-[#e04412] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,85,32,0.4)] diaz-btn-tactile no-underline"
                  >
                    <span>Enviar Configuración a WhatsApp Comercial</span>
                    <span>→</span>
                  </a>
                  <p className="text-[11px] font-mono text-white/45 text-center">
                    Respuesta directa de un ingeniero de Diaz Lab Automation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            6. SERVICIOS DE INGENIERÍA Y AUTOMATIZACIÓN A LA MEDIDA
           ======================================================================= */}
        <section id="ingenieria" className="py-20 px-6 lg:px-14 max-w-[1400px] mx-auto border-t border-white/10 space-y-12">
          <div className="max-w-3xl space-y-3">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#D4A359]">
              // 04. DIVISIÓN DE INGENIERÍA CORPORATIVA
            </span>
            <h2 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-5xl font-bold text-white">
              Ingeniería de software a la medida por Diaz Lab Automation.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div onMouseMove={handleSpotlightMove} className="diaz-spotlight-card p-7 rounded-2xl bg-[#12141B] border border-white/10 space-y-3">
              <span className="font-mono text-xs text-[#FF5520] font-bold">01 / WEBSITES & E-COMMERCE</span>
              <h3 className="font-['Space_Grotesk',sans-serif] text-xl font-bold text-white">
                Portales Web de Alta Conversión
              </h3>
              <p className="text-xs text-white/65 leading-relaxed">
                Diseño y programación de sitios web comerciales y tiendas en línea conectadas al inventario y facturación de tu negocio.
              </p>
            </div>
            <div onMouseMove={handleSpotlightMove} className="diaz-spotlight-card p-7 rounded-2xl bg-[#12141B] border border-white/10 space-y-3">
              <span className="font-mono text-xs text-[#FF5520] font-bold">02 / RPA & WORKFLOWS</span>
              <h3 className="font-['Space_Grotesk',sans-serif] text-xl font-bold text-white">
                Automatización de Procesos
              </h3>
              <p className="text-xs text-white/65 leading-relaxed">
                Eliminamos tareas repetitivas en hojas de cálculo, conciliaciones bancarias y generación de reportes operativos.
              </p>
            </div>
            <div onMouseMove={handleSpotlightMove} className="diaz-spotlight-card p-7 rounded-2xl bg-[#12141B] border border-white/10 space-y-3">
              <span className="font-mono text-xs text-[#FF5520] font-bold">03 / APIS & WEBHOOKS</span>
              <h3 className="font-['Space_Grotesk',sans-serif] text-xl font-bold text-white">
                Integración de Sistemas
              </h3>
              <p className="text-xs text-white/65 leading-relaxed">
                Conectamos pasarelas de pago (Wompi, Bold, Stripe), transportadoras y sistemas contables mediante APIs seguras.
              </p>
            </div>
            <div onMouseMove={handleSpotlightMove} className="diaz-spotlight-card p-7 rounded-2xl bg-[#12141B] border border-white/10 space-y-3">
              <span className="font-mono text-xs text-[#FF5520] font-bold">04 / AGENTES IA</span>
              <h3 className="font-['Space_Grotesk',sans-serif] text-xl font-bold text-white">
                IA & Modelos con RAG Propio
              </h3>
              <p className="text-xs text-white/65 leading-relaxed">
                Asistentes autónomos entrenados con los documentos, precios y políticas reales de tu organización.
              </p>
            </div>
          </div>
        </section>

        {/* =======================================================================
            7. FOOTER CON CUMPLIMIENTO LEGAL VISIBLE (/privacy y /terms)
           ======================================================================= */}
        <footer className="border-t border-white/10 bg-[#050608] py-16 px-6 lg:px-14 text-xs text-white/50">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="space-y-3">
              <span className="font-['Space_Grotesk',sans-serif] font-bold text-lg text-white tracking-wider">
                DIAZ LAB AUTOMATION
              </span>
              <p className="text-xs text-white/45 leading-relaxed">
                Estudio de ingeniería de software, automatización empresarial y creadores de la plataforma SaaS{' '}
                <strong className="text-white">Frant ERP</strong>.
              </p>
              <p className="font-mono text-[10px] text-white/40">
                Barranquilla, Atlántico, Colombia • contacto@diazlab.online
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-widest text-white font-semibold">Ecosistema</div>
              <ul className="space-y-2 list-none p-0 m-0">
                <li>
                  <a href="https://frant.app" onClick={handleGoToFrantApp} className="hover:text-white text-white/65 no-underline cursor-pointer">
                    Plataforma Frant ERP (frant.app)
                  </a>
                </li>
                <li>
                  <a href="https://frant.app/login" onClick={handleLogin} className="hover:text-white text-white/65 no-underline cursor-pointer">
                    Acceso Clientes (/login)
                  </a>
                </li>
                <li>
                  <a href="#planes" className="hover:text-white text-white/65 no-underline">
                    Planes Comerciales (3 Niveles)
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-widest text-white font-semibold">Ingeniería</div>
              <ul className="space-y-2 list-none p-0 m-0">
                <li><a href="#ingenieria" className="hover:text-white text-white/65 no-underline">Desarrollo Web & E-Commerce</a></li>
                <li><a href="#ingenieria" className="hover:text-white text-white/65 no-underline">Automatización RPA</a></li>
                <li><a href="#ingenieria" className="hover:text-white text-white/65 no-underline">Agentes IA en WhatsApp</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-widest text-white font-semibold">
                Marco Legal & Privacidad
              </div>
              <ul className="space-y-2 list-none p-0 m-0">
                <li>
                  <a
                    href="https://frant.app/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white text-white/75 underline decoration-white/20"
                  >
                    Política de Privacidad (https://frant.app/privacy)
                  </a>
                </li>
                <li>
                  <a
                    href="https://frant.app/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white text-white/75 underline decoration-white/20"
                  >
                    Términos y Condiciones (https://frant.app/terms)
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setLegalModalTab('ia_transparency');
                      setIsLegalModalOpen(true);
                    }}
                    className="text-[#D4A359] hover:underline bg-transparent border-0 p-0 cursor-pointer text-xs font-mono"
                  >
                    Declaración de Transparencia IA
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="max-w-[1400px] mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
            <span>© 2026 Diaz Lab Automation. Todos los derechos reservados.</span>
            <span>Barranquilla, Colombia • Operación Global</span>
          </div>
        </footer>

        <LegalDocsModal
          isOpen={isLegalModalOpen}
          onClose={() => setIsLegalModalOpen(false)}
          initialTab={legalModalTab}
        />
      </div>
    </div>
  );
};
