import React, { useState, useEffect, useRef } from 'react';
import { LegalDocsModal } from './LegalDocsModal';

interface FrantLandingPageProps {
  onLoginClick: () => void;
  onGoToDiazLab?: () => void;
}

export const FrantLandingPage: React.FC<FrantLandingPageProps> = ({ onLoginClick, onGoToDiazLab }) => {
  const [activeErpScreen, setActiveErpScreen] = useState<'inventory' | 'ai' | 'dian' | 'finance'>('inventory');
  const [erpTheme, setErpTheme] = useState<'titanium' | 'obsidian' | 'swiss'>('titanium');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'terminos' | 'privacidad' | 'ia_transparency'>('terminos');

  const erpWindowRef = useRef<HTMLDivElement>(null);

  // Scroll-Linked 3D Isometric Unfold for the ERP Console Window
  useEffect(() => {
    const update3DScroll = () => {
      const el = erpWindowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const rawProgress = (windowHeight - rect.top) / (windowHeight * 0.85);
      const progress = Math.max(0, Math.min(1, rawProgress));

      const rotX = (1 - progress) * 20;
      const rotY = (1 - progress) * -11;
      const rotZ = (1 - progress) * 2.2;
      const scale = 0.94 + progress * 0.06;

      el.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    };

    window.addEventListener('scroll', update3DScroll, { passive: true });
    update3DScroll();
    return () => window.removeEventListener('scroll', update3DScroll);
  }, []);

  const handleLogin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.history.pushState({}, '', '/login');
    onLoginClick();
  };

  const handleGoToPlanesDiazLab = (e: React.MouseEvent) => {
    const host = window.location.hostname.toLowerCase();
    if (host === 'frant.app' || host === 'www.frant.app') {
      // En producción redirige al dominio oficial de la casa matriz diazlab.online
      window.location.href = 'https://diazlab.online/#planes';
      return;
    }
    if (onGoToDiazLab) {
      e.preventDefault();
      onGoToDiazLab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    e.currentTarget.style.transform = `perspective(1000px) rotateY(${(x * 6.5).toFixed(2)}deg) rotateX(${(-y * 6.5).toFixed(2)}deg) translateY(-3px)`;
  };

  const handleTiltLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0px)';
  };

  const erpThemeVars: Record<'titanium' | 'obsidian' | 'swiss', React.CSSProperties> = {
    titanium: {
      '--erp-bg': '#ECE9E2',
      '--erp-surface': '#F7F5F0',
      '--erp-card': '#FFFFFF',
      '--erp-sidebar': '#121316',
      '--erp-text': '#111215',
      '--erp-muted': '#4A4843',
      '--erp-border': 'rgba(17, 18, 21, 0.1)',
      '--erp-accent': '#FF3B1D',
      '--erp-shadow': '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.03)',
    } as React.CSSProperties,
    obsidian: {
      '--erp-bg': '#0C0D10',
      '--erp-surface': '#13151A',
      '--erp-card': '#181B22',
      '--erp-sidebar': '#08090B',
      '--erp-text': '#F3F4F6',
      '--erp-muted': '#9CA3AF',
      '--erp-border': 'rgba(255, 255, 255, 0.09)',
      '--erp-accent': '#FF3B1D',
      '--erp-shadow': '0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)',
    } as React.CSSProperties,
    swiss: {
      '--erp-bg': '#F3F4F6',
      '--erp-surface': '#FFFFFF',
      '--erp-card': '#FFFFFF',
      '--erp-sidebar': '#0F172A',
      '--erp-text': '#0F172A',
      '--erp-muted': '#475569',
      '--erp-border': 'rgba(15, 23, 42, 0.09)',
      '--erp-accent': '#E11D48',
      '--erp-shadow': '0 1px 3px rgba(15,23,42,0.05), 0 10px 25px -5px rgba(15,23,42,0.04)',
    } as React.CSSProperties,
  };

  return (
    <div className="frant-landing-root min-h-screen bg-[#090A0C] text-[#F4F1EA] font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden relative selection:bg-[#FF3B1D] selection:text-white">
      <style>{`
        /* Garantiza escala exacta 16px = 1rem idéntica al mockup aprobado (sin inflación de portátil del ERP) */
        html {
          font-size: 16px !important;
        }
        .frant-film-grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          opacity: 0.032;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        .frant-tech-grid {
          background-size: 48px 48px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
        .frant-stone-grid {
          background-size: 48px 48px;
          background-image: 
            linear-gradient(to right, rgba(15, 16, 20, 0.045) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 16, 20, 0.045) 1px, transparent 1px);
        }
        .frant-perspective-stage {
          perspective: 1800px;
          transform-style: preserve-3d;
        }
        .frant-window-3d {
          transform-style: preserve-3d;
          will-change: transform;
          transition: transform 0.12s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.4s ease;
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.4),
            0 12px 24px rgba(0,0,0,0.5),
            0 32px 64px rgba(0,0,0,0.65),
            0 64px 120px -20px rgba(255, 59, 29, 0.14),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }
        @keyframes frantBorderTrail {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .frant-border-trail {
          position: relative;
        }
        .frant-border-trail::before {
          content: "";
          position: absolute;
          inset: -1.5px;
          border-radius: inherit;
          padding: 1.5px;
          background: linear-gradient(120deg, rgba(255,59,29,0.85), rgba(255,255,255,0.08), rgba(200,157,84,0.6), rgba(255,255,255,0.05), rgba(255,59,29,0.85));
          background-size: 300% 300%;
          animation: frantBorderTrail 7s ease infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .frant-spotlight-card {
          position: relative;
          overflow: hidden;
        }
        .frant-spotlight-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(550px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 59, 29, 0.11), transparent 40%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 1;
        }
        .frant-spotlight-card:hover::after {
          opacity: 1;
        }
        .frant-tilt-card {
          transform-style: preserve-3d;
          transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
          will-change: transform;
        }
        .frant-btn-tactile {
          transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1), background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .frant-btn-tactile:active {
          transform: scale(0.96);
        }
      `}</style>

      <div className="frant-film-grain"></div>

      <div className="frant-tech-grid min-h-screen">
        {/* =======================================================================
            1. NAVBAR INDUSTRIAL DE ALTA PRECISIÓN (FRANT.APP)
           ======================================================================= */}
        <header className="sticky top-0 z-40 bg-[#090A0C]/85 backdrop-blur-xl border-b border-white/10 px-6 lg:px-14 py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            {/* Brand Identity */}
            <a href="#top" className="flex items-center gap-3.5 group no-underline shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#16181D] border border-white/15 flex items-center justify-center relative overflow-hidden shadow-inner shrink-0">
                <span className="font-['Space_Grotesk',sans-serif] font-bold text-lg tracking-tighter text-white">F</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B1D] absolute top-1.5 right-1.5"></span>
              </div>
              <div className="flex flex-col whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="font-['Space_Grotesk',sans-serif] font-bold text-lg tracking-[0.06em] text-white leading-none">FRANT</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/10">ERP v2.6</span>
                </div>
                <span className="font-mono text-[9px] tracking-[0.22em] text-white/45 uppercase mt-1">PRECISION COMMERCIAL OS</span>
              </div>
            </a>

            {/* Navigation Links (Strictly Frant ERP Modules & Verticals) */}
            <nav className="hidden xl:flex items-center gap-7 text-xs font-mono uppercase tracking-[0.14em] text-white/65 whitespace-nowrap">
              <a href="#consola-3d" className="hover:text-white transition-colors no-underline text-white/65">01. Consola</a>
              <a href="#despacho-nativo" className="hover:text-white transition-colors flex items-center gap-1.5 no-underline text-white/65">
                <span>02. Gmail & WhatsApp</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              </a>
              <a href="#verticales" className="hover:text-white transition-colors no-underline text-white/65">03. Verticales</a>
              <a href="#planes-erp" className="hover:text-white transition-colors no-underline text-[#C89D54]">04. Planes</a>
            </nav>

            {/* Direct Actions: Login (/login) & Demo */}
            <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
              <a
                href="/login"
                onClick={handleLogin}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono uppercase tracking-wider text-white transition-colors frant-btn-tactile flex items-center gap-2 no-underline cursor-pointer whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5 text-[#FF3B1D] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                <span>Iniciar Sesión</span>
              </a>
              <a
                href="#planes-erp"
                className="hidden sm:inline-flex px-5 py-2.5 rounded-xl bg-[#FF3B1D] hover:bg-[#e02d10] text-white text-xs font-mono font-semibold uppercase tracking-wider shadow-[0_0_25px_rgba(255,59,29,0.35)] frant-btn-tactile no-underline whitespace-nowrap"
              >
                Solicitar Acceso
              </a>
            </div>
          </div>
        </header>

        {/* =======================================================================
            2. HERO SECTION: LUJO INDUSTRIAL + FOTOGRAFÍA 8K + HOOK COGNITIVO
           ======================================================================= */}
        <section id="top" className="relative pt-14 lg:pt-20 pb-12 px-6 lg:px-14 max-w-[1400px] mx-auto">
          <div className="absolute top-10 left-1/4 w-[600px] h-[350px] bg-[#FF3B1D]/12 blur-[140px] rounded-full pointer-events-none"></div>
          <div className="absolute top-32 right-10 w-[450px] h-[350px] bg-[#C89D54]/10 blur-[130px] rounded-full pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-7 relative z-10">
              <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10">
                <span className="px-2 py-0.5 rounded-full bg-[#FF3B1D] text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                  ARQUITECTURA CLOUD 2026
                </span>
                <span className="font-mono text-[11px] text-white/75 tracking-wide">
                  POS Fiscal DIAN • Gmail OAuth • WhatsApp Cloud API
                </span>
              </div>

              <h1 className="font-['Space_Grotesk',sans-serif] text-4xl sm:text-6xl xl:text-[64px] font-bold tracking-[-0.03em] leading-[1.03] text-white">
                Deja de operar tu comercio en cinco pestañas.{' '}
                <span className="font-['Newsreader',Georgia,serif] italic font-normal text-[#E9E5DC]">
                  Gobiérnalo con precisión quirúrgica.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl font-normal">
                <strong className="text-white">Frant ERP</strong> unifica Punto de Venta POS, arqueo de caja en tiempo real, Facturación Electrónica DIAN, inventario multi-sede y el despacho automático de facturas y cotizaciones desde{' '}
                <strong className="text-white">tu propia cuenta de Gmail y WhatsApp Business</strong>.
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a
                  href="/login"
                  onClick={handleLogin}
                  className="px-8 py-4 rounded-2xl bg-[#FF3B1D] hover:bg-[#e02d10] text-white font-mono text-xs font-bold uppercase tracking-[0.15em] shadow-[0_12px_32px_-8px_rgba(255,59,29,0.55)] flex items-center justify-center gap-3 frant-btn-tactile no-underline cursor-pointer"
                >
                  <span>Iniciar Sesión en Frant ERP</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <a
                  href="#consola-3d"
                  className="px-7 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white font-mono text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 frant-btn-tactile no-underline"
                >
                  <span>Inspeccionar Consola 3D</span>
                  <span className="text-[#C89D54]">↓</span>
                </a>
              </div>

              {/* Industrial Telemetry Bar */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-6 max-w-xl">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">EMISIÓN FISCAL</div>
                  <div className="font-['Space_Grotesk',sans-serif] text-xl sm:text-2xl font-bold text-white mt-0.5 tabular-nums flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                    <span>DIAN CUFE</span>
                  </div>
                  <div className="text-xs text-white/55">Tiquete 80mm & PDF QR</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">DESPACHO OFICIAL</div>
                  <div className="font-['Space_Grotesk',sans-serif] text-xl sm:text-2xl font-bold text-white mt-0.5 tabular-nums">Gmail + Meta</div>
                  <div className="text-xs text-white/55">API OAuth 2.0 Verificada</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">RUTAS DOMICILIOS</div>
                  <div className="font-['Space_Grotesk',sans-serif] text-xl sm:text-2xl font-bold text-[#C89D54] mt-0.5 tabular-nums">$0 Costo API</div>
                  <div className="text-xs text-white/55">Apertura nativa en Maps</div>
                </div>
              </div>
            </div>

            {/* Right Column: Art-Directed Luxury Hardware Photo with Floating Telemetry HUD */}
            <div className="lg:col-span-5 relative">
              <div
                onMouseMove={handleTiltMove}
                onMouseLeave={handleTiltLeave}
                className="frant-tilt-card rounded-[24px] p-2.5 bg-gradient-to-b from-white/15 to-white/5 border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.75)] relative"
              >
                <div className="relative rounded-[16px] overflow-hidden aspect-[4/3] border border-white/10">
                  <img
                    src="/proposals/assets/hero_industrial_pos.jpg"
                    alt="Terminal POS Frant ERP en mostrador de piedra travertino y nogal"
                    className="w-full h-full object-cover scale-[1.02] hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090A0C] via-transparent to-black/20"></div>

                  {/* Live Telemetry Overlay Badge Top-Left */}
                  <div className="absolute top-3.5 left-3.5 bg-[#090A0C]/85 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
                    <span className="text-white/90 font-semibold">CAJA MATRIZ • TURNO ACTIVO</span>
                    <span className="text-white/50 tabular-nums">COL</span>
                  </div>

                  {/* Bottom Floating Receipt Dispatch Notification */}
                  <div className="absolute bottom-3.5 inset-x-3.5 bg-[#111317]/90 backdrop-blur-xl border border-white/15 p-3.5 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-mono font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Factura FE-2026-1084 Emitida</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#C89D54]">CUFE OK</span>
                        </div>
                        <div className="text-[11px] font-mono text-white/65 mt-0.5">
                          Enviada desde <span className="text-white">facturacion@tucomercio.com</span> y WhatsApp
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-[#10B981] tabular-nums">$480.000</div>
                      <div className="text-[9px] text-white/45 uppercase">0.8 seg</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            3. VENTANA DE SOFTWARE EN PERSPECTIVA 3D ISOMÉTRICA (SCROLL-UNFOLD)
           ======================================================================= */}
        <section id="consola-3d" className="py-16 lg:py-24 px-4 sm:px-8 lg:px-14 max-w-[1440px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#FF3B1D] mb-2">
                // 01. ARQUITECTURA OPERATIVA • PERSPECTIVA 3D ACTIVA
              </div>
              <h2 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-5xl font-bold tracking-tight text-white">
                Mira cómo se siente un ERP de{' '}
                <span className="font-['Newsreader',Georgia,serif] italic font-normal text-[#C89D54]">alta relojería.</span>
              </h2>
            </div>

            {/* Screen Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-[#12141A] p-1.5 rounded-2xl border border-white/10">
              {([
                { id: 'inventory', label: '01. Inventario & Stock' },
                { id: 'ai', label: '02. Agente IA & WhatsApp' },
                { id: 'dian', label: '03. Facturación DIAN + Gmail' },
                { id: 'finance', label: '04. Caja & Flujo Financiero' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveErpScreen(tab.id)}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold cursor-pointer transition-all frant-btn-tactile border-0 ${
                    activeErpScreen === tab.id
                      ? 'bg-[#FF3B1D] text-white'
                      : 'bg-transparent text-white/65 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3D ISOMETRIC STAGE THAT STRAIGHTENS ON SCROLL */}
          <div className="frant-perspective-stage py-4">
            <div
              ref={erpWindowRef}
              className="frant-window-3d frant-border-trail rounded-[24px] p-3 bg-[#16181F] border border-white/15"
              style={{ transform: 'rotateX(20deg) rotateY(-11deg) rotateZ(2.2deg) scale(0.94)' }}
            >
              {/* Hardware Window Top Bezel */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0D0E12] rounded-t-[14px] border-b border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block"></span>
                  <span className="ml-3 text-white/45 text-[11px]">https://frant.app/workspace/hoshi-services</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px]">
                  <span className="text-white/50">Tema Interfaz:</span>
                  {(['titanium', 'obsidian', 'swiss'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setErpTheme(t)}
                      className={`px-2.5 py-0.5 rounded cursor-pointer border-0 font-mono text-[11px] ${
                        erpTheme === t ? 'bg-[#FF3B1D] text-white font-bold' : 'bg-white/10 hover:bg-white/20 text-white/80'
                      }`}
                    >
                      {t === 'titanium' ? 'Wabi-Sabi Paper' : t === 'obsidian' ? 'Obsidian Dark' : 'Swiss Daylight'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ERP App Canvas */}
              <div
                className="rounded-b-[14px] overflow-hidden transition-colors duration-300"
                style={{
                  ...erpThemeVars[erpTheme],
                  backgroundColor: 'var(--erp-bg)',
                  color: 'var(--erp-text)',
                }}
              >
                <div className="flex min-h-[540px]">
                  {/* Left Industrial Sidebar */}
                  <aside
                    className="w-16 sm:w-56 flex flex-col justify-between p-3.5 shrink-0"
                    style={{ backgroundColor: 'var(--erp-sidebar)', color: '#F4F1EA' }}
                  >
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 px-2 py-1.5 border-b border-white/10 pb-4">
                        <div className="w-8 h-8 rounded-lg bg-[#FF3B1D] text-white font-['Space_Grotesk',sans-serif] font-bold text-sm flex items-center justify-center shrink-0">
                          HO
                        </div>
                        <div className="hidden sm:block overflow-hidden">
                          <div className="font-['Space_Grotesk',sans-serif] font-bold text-xs tracking-wide text-white truncate">
                            Hoshi Services
                          </div>
                          <div className="font-mono text-[10px] text-white/50 truncate">Sede Matriz • Barranquilla</div>
                        </div>
                      </div>

                      <nav className="space-y-1 text-xs font-medium">
                        {([
                          { id: 'inventory', label: 'Inventario & Catálogo' },
                          { id: 'ai', label: 'Agente IA WhatsApp' },
                          { id: 'dian', label: 'Facturación DIAN & POS' },
                          { id: 'finance', label: 'Contabilidad & Caja' },
                        ] as const).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveErpScreen(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border-0 text-left ${
                              activeErpScreen === item.id
                                ? 'bg-[#FF3B1D] text-white font-semibold'
                                : 'bg-transparent text-white/65 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current shrink-0"></span>
                            <span className="hidden sm:inline">{item.label}</span>
                          </button>
                        ))}
                      </nav>
                    </div>

                    <div className="hidden sm:block p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-white/50">SEGURIDAD MFA</span>
                        <span className="text-[#10B981] font-bold">BLINDADO</span>
                      </div>
                      <div className="text-[11px] text-white/75 font-mono truncate">gmail.send: Activo</div>
                    </div>
                  </aside>

                  {/* Main ERP Content Area */}
                  <div className="flex-1 flex flex-col">
                    <div
                      className="px-6 py-3.5 border-b flex items-center justify-between"
                      style={{ backgroundColor: 'var(--erp-surface)', borderColor: 'var(--erp-border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded font-semibold"
                          style={{ backgroundColor: 'rgba(255,59,29,0.12)', color: 'var(--erp-accent)' }}
                        >
                          SISTEMA EN LÍNEA
                        </span>
                        <span className="text-xs font-medium hidden md:inline" style={{ color: 'var(--erp-muted)' }}>
                          Sincronización Multi-Sede Activa • Alta Legibilidad Portátil
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <div
                          className="px-3 py-1.5 rounded-lg border flex items-center gap-2 tabular-nums"
                          style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}
                        >
                          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                          <span className="font-semibold">TURNO ACTIVO</span>
                          <span style={{ color: 'var(--erp-muted)' }}>• COL</span>
                        </div>
                      </div>
                    </div>

                    {/* SCREEN 1: INVENTORY */}
                    {activeErpScreen === 'inventory' && (
                      <div className="p-6 sm:p-8 space-y-6 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'var(--erp-accent)' }}>
                              LOGÍSTICA & CONTROL DE STOCK
                            </div>
                            <h3 className="font-['Space_Grotesk',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
                              Inventario de Productos
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="px-3.5 py-2 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5"
                              style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}
                            >
                              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                              <span>Catálogo Web Sincronizado</span>
                            </span>
                            <button
                              type="button"
                              onClick={handleLogin}
                              className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#FF3B1D] border-0 cursor-pointer"
                            >
                              + Nuevo Producto / Ítem
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div
                            className="p-5 rounded-xl border"
                            style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)', boxShadow: 'var(--erp-shadow)' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--erp-muted)' }}>
                                TOTAL ÍTEMS EN STOCK
                              </span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-bold">
                                Sincronizado
                              </span>
                            </div>
                            <div className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-4xl font-bold mt-2 tabular-nums tracking-tight">
                              108 <span className="text-sm font-normal" style={{ color: 'var(--erp-muted)' }}>referencias</span>
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--erp-muted)' }}>
                              Catalogados en sistema ERP (Sede Matriz)
                            </div>
                          </div>

                          <div
                            className="p-5 rounded-xl border"
                            style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)', boxShadow: 'var(--erp-shadow)' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--erp-muted)' }}>
                                VALORIZACIÓN DE BODEGA
                              </span>
                              <span className="font-mono text-[10px]" style={{ color: 'var(--erp-muted)' }}>COP</span>
                            </div>
                            <div className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-4xl font-bold mt-2 tabular-nums tracking-tight">
                              $14.620.000
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--erp-muted)' }}>
                              Costo auditado de productos físicos activos
                            </div>
                          </div>

                          <div
                            className="p-5 rounded-xl border border-l-4 border-l-[#FF3B1D]"
                            style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)', boxShadow: 'var(--erp-shadow)' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--erp-muted)' }}>
                                ALERTAS DE REABASTECIMIENTO
                              </span>
                              <span className="font-mono text-[10px] text-[#FF3B1D] font-bold">0 Críticas</span>
                            </div>
                            <div className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-4xl font-bold mt-2 tabular-nums tracking-tight text-[#10B981]">
                              100% <span className="text-sm font-normal" style={{ color: 'var(--erp-muted)' }}>óptimo</span>
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--erp-muted)' }}>
                              Ningún ítem por debajo del stock mínimo
                            </div>
                          </div>
                        </div>

                        <div
                          className="rounded-xl border overflow-hidden"
                          style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)', boxShadow: 'var(--erp-shadow)' }}
                        >
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--erp-muted)', borderColor: 'var(--erp-border)' }}>
                                  <th className="py-3.5 px-5">Marca / SKU</th>
                                  <th className="py-3.5 px-4">Referencia & Producto</th>
                                  <th className="py-3.5 px-4">Categoría</th>
                                  <th className="py-3.5 px-4 text-right">Stock</th>
                                  <th className="py-3.5 px-4 text-right">Precio Unitario</th>
                                  <th className="py-3.5 px-5 text-right">Valor Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y text-xs" style={{ borderColor: 'var(--erp-border)' }}>
                                <tr>
                                  <td className="py-3.5 px-5 font-mono font-semibold">
                                    RAY-BAN <span className="block text-[11px] font-normal opacity-75">SKU-100002</span>
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-sm">Montura Clubmaster Titanium</td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-mono border" style={{ borderColor: 'var(--erp-border)' }}>
                                      Monturas
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">18 Uds</td>
                                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">$420.000</td>
                                  <td className="py-3.5 px-5 text-right font-mono font-bold tabular-nums">$7.560.000</td>
                                </tr>
                                <tr>
                                  <td className="py-3.5 px-5 font-mono font-semibold">
                                    ZEISS <span className="block text-[11px] font-normal opacity-75">SKU-100089</span>
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-sm">Lente BlueGuard Digital 1.67</td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-mono border" style={{ borderColor: 'var(--erp-border)' }}>
                                      Laboratorio
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">40 Uds</td>
                                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">$176.500</td>
                                  <td className="py-3.5 px-5 text-right font-mono font-bold tabular-nums">$7.060.000</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 2: AI WHATSAPP */}
                    {activeErpScreen === 'ai' && (
                      <div className="p-6 sm:p-8 space-y-6 flex-1">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'var(--erp-accent)' }}>
                            AUTOMATIZACIÓN CONVERSACIONAL • META CLOUD API
                          </div>
                          <h3 className="font-['Space_Grotesk',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
                            Agente IA Conectado al Stock en Vivo
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--erp-muted)' }}>
                              CONSULTAS DE INVENTARIO
                            </div>
                            <div className="font-['Space_Grotesk',sans-serif] text-3xl font-bold mt-1.5 text-[#10B981] tabular-nums">
                              Tiempo Real
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--erp-muted)' }}>
                              Verifica existencias y precios reales del ERP
                            </div>
                          </div>
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--erp-muted)' }}>
                              DESPACHO DE COTIZACIONES
                            </div>
                            <div className="font-['Space_Grotesk',sans-serif] text-3xl font-bold mt-1.5 tabular-nums">PDF + Correo</div>
                            <div className="text-xs mt-1" style={{ color: 'var(--erp-muted)' }}>
                              Genera cotizaciones formales automáticamente
                            </div>
                          </div>
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--erp-muted)' }}>
                              CANAL WHATSAPP OFICIAL
                            </div>
                            <div className="font-['Space_Grotesk',sans-serif] text-xl font-bold mt-2 text-[#10B981] flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                              <span>META CLOUD API</span>
                            </div>
                            <div className="text-xs font-mono mt-1" style={{ color: 'var(--erp-muted)' }}>
                              Atención 24/7 + Escalado a Humano
                            </div>
                          </div>
                        </div>

                        <div className="p-5 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                          <div className="font-mono text-xs font-bold uppercase tracking-wider">
                            Ejemplo de Flujo Conversacional Conectado al Catálogo
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                            <div className="p-3.5 rounded-xl border" style={{ borderColor: 'var(--erp-border)' }}>
                              <span className="font-mono text-[10px] uppercase text-[#FF3B1D] font-bold block mb-1">
                                Cliente • Consulta por WhatsApp
                              </span>
                              "Buenas noches, ¿tienen montura Ray-Ban Clubmaster en titanio y me pueden enviar la cotización al correo?"
                            </div>
                            <div className="p-3.5 rounded-xl border border-l-4 border-l-[#10B981]" style={{ borderColor: 'var(--erp-border)' }}>
                              <span className="font-mono text-[10px] uppercase text-[#10B981] font-bold block mb-1">
                                Agente Frant IA • Respuesta Conectada al ERP
                              </span>
                              "¡Hola! Sí, contamos con 18 unidades disponibles de la Ray-Ban Clubmaster Titanium ($420.000 COP). Acabo de enviarte la cotización formal en PDF a tu correo y por este chat."
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 3: DIAN + GMAIL OAUTH */}
                    {activeErpScreen === 'dian' && (
                      <div className="p-6 sm:p-8 space-y-6 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'var(--erp-accent)' }}>
                              CUMPLIMIENTO FISCAL & DESPACHO DIRECTO
                            </div>
                            <h3 className="font-['Space_Grotesk',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
                              Facturación Electrónica DIAN & Gmail OAuth
                            </h3>
                          </div>
                          <span className="px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            Resolución DIAN Activa • Prefijo FE
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-xs font-bold text-[#FF3B1D]">PASO 01 / EMISIÓN POS</div>
                            <div className="font-['Space_Grotesk',sans-serif] text-lg font-bold mt-1">Firma Digital & CUFE</div>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--erp-muted)' }}>
                              Generación instantánea de XML y representación gráfica PDF con código QR oficial ante la DIAN.
                            </p>
                          </div>
                          <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-xs font-bold text-[#10B981]">PASO 02 / GMAIL OAUTH (gmail.send)</div>
                            <div className="font-['Space_Grotesk',sans-serif] text-lg font-bold mt-1">Envío desde tu Propio Correo</div>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--erp-muted)' }}>
                              El cliente recibe el PDF directamente desde la cuenta oficial de tu empresa autorizada con Google OAuth 2.0.
                            </p>
                          </div>
                          <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-xs font-bold text-[#C89D54]">PASO 03 / WHATSAPP CLOUD API</div>
                            <div className="font-['Space_Grotesk',sans-serif] text-lg font-bold mt-1">Copia Instantánea al Celular</div>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--erp-muted)' }}>
                              Despacho simultáneo del comprobante al WhatsApp del comprador sin descargar archivos manualmente.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 4: FINANCE */}
                    {activeErpScreen === 'finance' && (
                      <div className="p-6 sm:p-8 space-y-6 flex-1">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'var(--erp-accent)' }}>
                            AUDITORÍA DE TURNOS & LIBRO CONTABLE
                          </div>
                          <h3 className="font-['Space_Grotesk',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
                            Contabilidad, Arqueo de Caja & Cartera
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-[10px] uppercase" style={{ color: 'var(--erp-muted)' }}>INGRESOS DEL TURNO</div>
                            <div className="font-['Space_Grotesk',sans-serif] text-2xl font-bold mt-1 tabular-nums">$4.560.000</div>
                          </div>
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-[10px] uppercase" style={{ color: 'var(--erp-muted)' }}>GASTOS OPERATIVOS</div>
                            <div className="font-['Space_Grotesk',sans-serif] text-2xl font-bold mt-1 text-[#FF3B1D] tabular-nums">$350.000</div>
                          </div>
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-[10px] uppercase" style={{ color: 'var(--erp-muted)' }}>CUENTAS POR COBRAR</div>
                            <div className="font-['Space_Grotesk',sans-serif] text-2xl font-bold mt-1 tabular-nums">$1.280.000</div>
                          </div>
                          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--erp-card)', borderColor: 'var(--erp-border)' }}>
                            <div className="font-mono text-[10px] uppercase" style={{ color: 'var(--erp-muted)' }}>ARQUEO DE CAJA</div>
                            <div className="font-['Space_Grotesk',sans-serif] text-2xl font-bold mt-1 text-[#10B981] tabular-nums">Cuadre Exacto</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            4. DESPACHO NATIVO GMAIL OAUTH + WHATSAPP CLOUD API (CLAVE GOOGLE/META)
           ======================================================================= */}
        <section id="despacho-nativo" className="bg-[#E9E5DC] text-[#0D0E11] frant-stone-grid py-24 px-6 lg:px-14 border-y border-black/10">
          <div className="max-w-[1400px] mx-auto space-y-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-7 space-y-3">
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#D9381E] font-bold">
                  // 02. MECANISMO ÚNICO • SINCRONIZACIÓN OPERATIVA TRI-CANAL™
                </div>
                <h2 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-5xl font-bold tracking-tight leading-[1.06]">
                  Tus facturas salen desde{' '}
                  <span className="font-['Newsreader',Georgia,serif] italic font-normal underline decoration-[#D9381E] decoration-2 underline-offset-4">
                    tu propio correo y WhatsApp
                  </span>
                  , no desde un servidor desconocido.
                </h2>
              </div>
              <div className="lg:col-span-5 text-sm sm:text-base text-[#3F3D38] leading-relaxed">
                Cuando un cliente compra en tu negocio, no debería recibir un correo genérico que cae en Spam. Frant ERP se conecta mediante protocolos oficiales verificados con tu cuenta de{' '}
                <strong>Google Workspace / Gmail</strong> y <strong>WhatsApp Business</strong>.
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: POS & DIAN */}
              <div className="bg-[#F7F5F0] border border-black/10 rounded-[24px] p-8 flex flex-col justify-between shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-black text-white font-bold">ESTACIÓN 01</span>
                    <span className="text-[#4A4843]">CAJA & POS</span>
                  </div>
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold pt-2">
                    Cierre en Caja, Arqueo & Emisión DIAN
                  </h3>
                  <p className="text-sm text-[#3F3D38] leading-relaxed">
                    Escanea con código de barras, registra pagos mixtos (efectivo, transferencia, datáfono), controla turnos con reloj sincronizado por país y emite la Factura Electrónica DIAN con CUFE al instante.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-black/10 flex items-center justify-between font-mono text-[11px] text-[#4A4843]">
                  <span>CARTERA & ABONOS</span>
                  <span className="text-black font-bold">TIEMPO REAL</span>
                </div>
              </div>

              {/* Card 2: Gmail OAuth (gmail.send) */}
              <div className="bg-[#111317] text-white border border-black rounded-[24px] p-8 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.18)] relative overflow-hidden">
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-[#FF3B1D] text-white font-bold">ESTACIÓN 02 • GOOGLE OAUTH</span>
                    <span className="text-white/60">gmail.send</span>
                  </div>
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold pt-2">
                    Despacho Directo por Gmail Oficial
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    Autoriza tu cuenta de Gmail con un clic mediante OAuth 2.0 seguro. Frant ERP utiliza exclusivamente el permiso{' '}
                    <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs text-[#C89D54]">gmail.send</code> para enviar facturas PDF, recibos de caja y cotizaciones a tus clientes finales sin leer tu bandeja de entrada.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-white/60 relative z-10">
                  <span>CIFRADO TLS 1.3 / AES-256</span>
                  <span className="text-[#10B981] font-bold">USO LIMITADO GOOGLE</span>
                </div>
              </div>

              {/* Card 3: WhatsApp Cloud API & Rutas Maps */}
              <div className="bg-[#F7F5F0] border border-black/10 rounded-[24px] p-8 flex flex-col justify-between shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-black text-white font-bold">ESTACIÓN 03</span>
                    <span className="text-[#4A4843]">META API + LOGÍSTICA</span>
                  </div>
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold pt-2">
                    WhatsApp Business & Hojas de Ruta Maps
                  </h3>
                  <p className="text-sm text-[#3F3D38] leading-relaxed">
                    Envía el comprobante al WhatsApp del cliente y agrupa automáticamente los pedidos a domicilio en una hoja de ruta ordenada por cercanía geográfica, lista para abrir en Google Maps a $0 costo de API.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-black/10 flex items-center justify-between font-mono text-[11px] text-[#4A4843]">
                  <span>META CLOUD API OFICIAL</span>
                  <span className="text-black font-bold">DESPACHO 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            5. VERTICALES POR RUBRO CON FOTOGRAFÍA EDITORIAL 8K + TILT 3D + SPOTLIGHT
           ======================================================================= */}
        <section id="verticales" className="py-24 px-6 lg:px-14 max-w-[1400px] mx-auto space-y-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#FF3B1D] mb-2">
                // 03. INGENIERÍA VERTICAL POR INDUSTRIA
              </div>
              <h2 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-5xl font-bold tracking-tight text-white">
                No es un POS genérico.{' '}
                <span className="font-['Newsreader',Georgia,serif] italic font-normal text-[#E9E5DC]">
                  Habla el idioma de tu rubro.
                </span>
              </h2>
            </div>
            <p className="text-sm text-white/65 max-w-md font-normal">
              Activa los módulos clínicos, gastronómicos o comerciales diseñados específicamente para la operación diaria de tu empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Vertical 01: Ópticas y Salud Visual */}
            <article
              onMouseMove={(e) => {
                handleSpotlightMove(e);
                handleTiltMove(e);
              }}
              onMouseLeave={handleTiltLeave}
              className="frant-spotlight-card frant-tilt-card rounded-[28px] bg-[#12141A] border border-white/10 p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="relative rounded-[20px] overflow-hidden aspect-[4/3] mb-6 border border-white/10">
                  <img
                    src="/proposals/assets/vertical_optica_lujo.jpg"
                    alt="Ópticas y Salud Visual Frant ERP"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-transparent"></div>
                  <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 font-mono text-[10px] uppercase tracking-widest text-[#C89D54]">
                    01 / SALUD VISUAL & ÓPTICAS
                  </span>
                </div>
                <div className="px-3 space-y-3">
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-white">
                    Ópticas, Consultorios & Laboratorios
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Historia clínica optométrica completa, fórmulas refractivas (OD/OI, Esfera, Cilindro, Eje, Adición, DP), órdenes de tallado a laboratorio, abonos de pacientes y recordatorios automáticos de control visual.
                  </p>
                </div>
              </div>
              <div className="px-3 pt-6 mt-6 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-white/55">
                <span>OD/OI • HISTORIA CLÍNICA</span>
                <span className="text-[#FF3B1D] font-semibold">MÓDULO NATIVO →</span>
              </div>
            </article>

            {/* Vertical 02: Restaurantes y Gastronomía */}
            <article
              onMouseMove={(e) => {
                handleSpotlightMove(e);
                handleTiltMove(e);
              }}
              onMouseLeave={handleTiltLeave}
              className="frant-spotlight-card frant-tilt-card rounded-[28px] bg-[#12141A] border border-white/10 p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="relative rounded-[20px] overflow-hidden aspect-[4/3] mb-6 border border-white/10">
                  <img
                    src="/proposals/assets/vertical_gastronomia_kds.jpg"
                    alt="Restaurantes y KDS Frant ERP"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-transparent"></div>
                  <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 font-mono text-[10px] uppercase tracking-widest text-[#10B981]">
                    02 / GASTRONOMÍA & KDS
                  </span>
                </div>
                <div className="px-3 space-y-3">
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-white">
                    Restaurantes, Cafés & Alta Cocina
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Mapa interactivo de mesas y salones, toma de comandas desde el celular del mesero, pantalla de cocina en tiempo real (KDS) con cronómetro por plato, división de cuentas y Carta Digital QR.
                  </p>
                </div>
              </div>
              <div className="px-3 pt-6 mt-6 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-white/55">
                <span>MESAS • KDS • CARTA QR</span>
                <span className="text-[#FF3B1D] font-semibold">MÓDULO NATIVO →</span>
              </div>
            </article>

            {/* Vertical 03: Retail, Moda y Comercio General */}
            <article
              onMouseMove={(e) => {
                handleSpotlightMove(e);
                handleTiltMove(e);
              }}
              onMouseLeave={handleTiltLeave}
              className="frant-spotlight-card frant-tilt-card rounded-[28px] bg-[#12141A] border border-white/10 p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="relative rounded-[20px] overflow-hidden aspect-[4/3] mb-6 border border-white/10">
                  <img
                    src="/proposals/assets/hero_industrial_pos.jpg"
                    alt="Retail y Comercio General Frant ERP"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-transparent"></div>
                  <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 font-mono text-[10px] uppercase tracking-widest text-white">
                    03 / RETAIL & DISTRIBUCIÓN
                  </span>
                </div>
                <div className="px-3 space-y-3">
                  <h3 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-white">
                    Retail, Boutiques & Mayoristas
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Facturación veloz con lector de código de barras, matriz de variantes (tallas, colores, materiales), traslados entre sucursales, catálogo digital público con carrito de pedidos y control de cartera.
                  </p>
                </div>
              </div>
              <div className="px-3 pt-6 mt-6 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-white/55">
                <span>BARCODE • MULTI-SEDE • CRM</span>
                <span className="text-[#FF3B1D] font-semibold">MÓDULO NATIVO →</span>
              </div>
            </article>
          </div>
        </section>

        {/* =======================================================================
            6. SECCIÓN DE PLANES EN FRANT.APP (SIN PRECIOS QUEMADOS -> PUENTE A DIAZLAB)
           ======================================================================= */}
        <section id="planes-erp" className="py-20 px-6 lg:px-14 max-w-[1400px] mx-auto">
          <div className="frant-border-trail rounded-[32px] bg-gradient-to-br from-[#151821] via-[#101217] to-[#0A0B0E] border border-white/15 p-10 sm:p-16 text-center max-w-4xl mx-auto space-y-7 shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] px-3.5 py-1.5 rounded-full bg-[#FF3B1D]/15 text-[#FF3B1D] border border-[#FF3B1D]/30 inline-block">
              // 04. ARQUITECTURA COMERCIAL MODULAR
            </span>

            <h2 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto">
              Planes según las funciones y la escala de tu negocio.
            </h2>

            <p className="text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
              No pagues por módulos que no utilizas. Comienza con el acceso base a <strong className="text-white">Frant ERP</strong> y activa únicamente las capacidades que tu operación requiera (Facturación DIAN, Agente IA de WhatsApp, Rutas de Domicilio o Verticales Especializadas).
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://diazlab.online/#planes"
                onClick={handleGoToPlanesDiazLab}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FF3B1D] hover:bg-[#e02d10] text-white font-mono text-xs font-bold uppercase tracking-[0.15em] shadow-[0_12px_32px_-8px_rgba(255,59,29,0.55)] frant-btn-tactile flex items-center justify-center gap-2.5 no-underline cursor-pointer"
              >
                <span>Configurar Plan en diazlab.online</span>
                <span>→</span>
              </a>
              <a
                href="https://wa.me/573116718652?text=Hola%2C%20deseo%20informaci%C3%B3n%20sobre%20los%20planes%20de%20Frant%20ERP"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-mono text-xs font-semibold uppercase tracking-[0.15em] frant-btn-tactile no-underline"
              >
                Hablar con Ventas por WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* =======================================================================
            7. FOOTER OFICIAL CON ENLACES LEGALES VISIBLES (/privacy y /terms)
           ======================================================================= */}
        <footer className="border-t border-white/10 bg-[#07080A] py-16 px-6 lg:px-14 text-xs text-white/55">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#FF3B1D] flex items-center justify-center font-['Space_Grotesk',sans-serif] font-bold text-white">
                  F
                </div>
                <span className="font-['Space_Grotesk',sans-serif] font-bold text-base text-white tracking-wider">FRANT ERP</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Plataforma SaaS de Punto de Venta, Facturación Electrónica DIAN, Inventario y Despacho Conversacional.
              </p>
              <p className="font-mono text-[10px] text-white/40">
                Un producto de Diaz Lab Automation • Barranquilla, Colombia
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-white font-semibold">Módulos del ERP</div>
              <ul className="space-y-2 list-none p-0 m-0">
                <li><a href="#consola-3d" className="hover:text-white text-white/60 no-underline">Punto de Venta POS & Arqueo</a></li>
                <li><a href="#despacho-nativo" className="hover:text-white text-white/60 no-underline">Despacho Gmail OAuth & WhatsApp</a></li>
                <li><a href="#verticales" className="hover:text-white text-white/60 no-underline">Vertical Ópticas & Salud Visual</a></li>
                <li><a href="#verticales" className="hover:text-white text-white/60 no-underline">Vertical Restaurantes & KDS</a></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-white font-semibold">Acceso & Planes</div>
              <ul className="space-y-2 list-none p-0 m-0">
                <li>
                  <a href="/login" onClick={handleLogin} className="text-[#FF3B1D] hover:underline font-mono no-underline cursor-pointer">
                    Iniciar Sesión (/login)
                  </a>
                </li>
                <li>
                  <a href="https://diazlab.online/#planes" onClick={handleGoToPlanesDiazLab} className="hover:text-white text-white/60 no-underline cursor-pointer">
                    Estructura de Planes (diazlab.online)
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-white font-semibold">
                Cumplimiento Legal & Privacidad
              </div>
              <ul className="space-y-2 list-none p-0 m-0">
                <li>
                  <a
                    href="https://frant.app/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white text-white/75 underline decoration-white/25"
                  >
                    Política de Privacidad (https://frant.app/privacy)
                  </a>
                </li>
                <li>
                  <a
                    href="https://frant.app/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white text-white/75 underline decoration-white/25"
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
                    className="text-[#C89D54] hover:underline bg-transparent border-0 p-0 cursor-pointer text-xs font-mono"
                  >
                    Declaración de Transparencia IA & OAuth
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="max-w-[1400px] mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
            <span>© 2026 Frant ERP by Diaz Lab Automation. Todos los derechos reservados.</span>
            <span>TLS 1.3 • AES-256 • GOOGLE API LIMITED USE COMPLIANT</span>
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
