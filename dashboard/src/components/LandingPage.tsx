import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const whatsappSalesUrl = (topic: string) => {
    const text = encodeURIComponent(`Hola Diaz Lab Automation, me interesa información sobre: *${topic}*.`);
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

  return (
    <div className="min-h-screen bg-[#070708] text-[#e2e8f0] font-['Montserrat',sans-serif] selection:bg-[#d89e41]/30 selection:text-[#fce188] overflow-x-hidden relative">

      {/* FONDO AMBIENTAL DE PARTÍCULAS Y LÍNEAS DORADAS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-radial from-[#d89e41]/12 via-[#d89e41]/3 to-transparent blur-[160px]" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-radial from-[#d89e41]/8 via-transparent to-transparent blur-[180px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[700px] h-[700px] bg-radial from-[#d89e41]/6 via-transparent to-transparent blur-[200px]" />
      </div>

      {/* 1. NAVBAR MINIMALISTA PREMIUM */}
      <nav className="sticky top-0 z-50 bg-[#070708]/85 backdrop-blur-2xl border-b border-[#d89e41]/15 px-6 sm:px-12 py-4 flex items-center justify-between transition-all">
        {/* Logo DIAZ LAB AUTOMATION */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img 
            src="/brand/logo DLA.svg" 
            alt="DIAZ LAB Automation" 
            className="h-9 sm:h-10 w-auto object-contain hover:scale-105 transition-transform" 
          />
        </div>

        {/* Menú Principal */}
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-[#a0aec0]">
          <a href="#hero" className="text-white relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#d89e41]">Inicio</a>
          <a href="#erp-saas" className="hover:text-[#d89e41] transition-colors py-1">Plataforma ERP</a>
          <a href="#servicios" className="hover:text-[#d89e41] transition-colors py-1">Servicios a la Medida</a>
          <a href="#planes" className="hover:text-[#d89e41] transition-colors py-1">Planes & Precios</a>
          <a href="#agencia" className="hover:text-[#d89e41] transition-colors py-1">Agencia & Dominios</a>
        </div>

        {/* CTA Contactar & Acceso App */}
        <div className="flex items-center gap-3">
          <a
            href={whatsappSalesUrl('Contacto General')}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2 rounded-full border border-[#d89e41]/60 text-[#fce188] hover:bg-[#d89e41]/10 text-xs font-bold transition-all shadow-sm hover:shadow-[#d89e41]/20 cursor-pointer flex items-center gap-1.5"
          >
            Contactar
          </a>
          <button
            onClick={handleLoginRedirection}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-all cursor-pointer hidden sm:flex items-center gap-1.5"
            title="Acceso al Portal ERP"
          >
            <span className="material-symbols-outlined text-[15px] text-[#d89e41]">lock</span>
            Acceder
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION IMPACTANTE */}
      <section id="hero" className="relative pt-12 sm:pt-20 pb-20 sm:pb-32 px-6 sm:px-12 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Columna Izquierda: Título y Copy Principal */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <h1 className="text-4xl sm:text-6xl xl:text-6xl font-black text-white leading-[1.08] tracking-tight uppercase">
              AUTOMATIZAMOS <br />
              <span className="text-[#d89e41]">LO COMPLEJO.</span> <br />
              POTENCIAMOS <br />
              <span className="text-[#d89e41]">LO QUE IMPORTA.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#cbd5e1] font-['Inter',sans-serif] leading-relaxed max-w-2xl font-light">
              En Diaz Lab Automation combinamos nuestra plataforma ERP POS + DIAN + Agente WhatsApp IA con soluciones de ingeniería de software a la medida para que tu negocio escale.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <a
                href="#planes"
                className="px-8 py-4 rounded-full bg-[#d89e41] hover:bg-[#e2b75f] text-[#070708] font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#d89e41]/25 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                Ver Planes desde $49.000 COP
                <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
              </a>

              <a
                href="#erp-saas"
                className="px-8 py-4 rounded-full border border-white/20 hover:border-[#d89e41]/60 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5"
              >
                Conocer la Plataforma ERP
              </a>
            </div>

            {/* Micro Badges */}
            <div className="pt-8 grid grid-cols-3 gap-4 border-t border-white/10 text-xs text-[#a0aec0] font-['Inter',sans-serif]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d89e41] text-lg">verified_user</span>
                <span>Facturación DIAN con QR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d89e41] text-lg">smart_toy</span>
                <span>Agente WhatsApp IA 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d89e41] text-lg">settings_suggest</span>
                <span>Desarrollo a la Medida</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Gráfico Neuronal Oficial */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-[480px] aspect-square flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-[#d89e41]/20 via-transparent to-transparent rounded-full blur-3xl" />
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                <img 
                  src="/brand/logo DLA.svg" 
                  alt="Díaz Lab Neural Network" 
                  className="w-[85%] h-[85%] object-contain drop-shadow-[0_0_35px_rgba(216,158,65,0.45)] hover:scale-105 transition-transform duration-700" 
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. PRODUCTO DESTACADO — PLATAFORMA SAAS ERP LISTA PARA USAR */}
      <section id="erp-saas" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10 z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#d89e41] font-mono">SOLUCIÓN SAAS LISTA PARA USAR</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
            Plataforma ERP POS + Agente WhatsApp IA
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8] font-['Inter',sans-serif]">
            Un sistema todo-en-uno preconstruido listo para activar en tu empresa en menos de 5 minutos.
          </p>
        </div>

        {/* Tarjetas de Módulos del ERP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-[#0e0e11] border border-white/10 p-6 rounded-2xl space-y-3 text-left hover:border-[#d89e41]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-[#d89e41]/10 flex items-center justify-center text-[#d89e41]">
              <span className="material-symbols-outlined text-2xl">point_of_sale</span>
            </div>
            <h3 className="font-bold text-white text-base">Punto de Venta POS & DIAN</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
              Caja rápida, escáner de códigos de barras, tiquetes térmicos 80mm y facturación electrónica con CUFE y QR fiscal.
            </p>
          </div>

          <div className="bg-[#0e0e11] border border-white/10 p-6 rounded-2xl space-y-3 text-left hover:border-[#d89e41]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">smart_toy</span>
            </div>
            <h3 className="font-bold text-white text-base">Agente WhatsApp Autónomo</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
              Vendedor virtual en tu propio WhatsApp que atiende clientes, cotiza productos, agenda citas y gestiona cobros.
            </p>
          </div>

          <div className="bg-[#0e0e11] border border-white/10 p-6 rounded-2xl space-y-3 text-left hover:border-[#d89e41]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
            <h3 className="font-bold text-white text-base">Domicilios & Hojas de Ruta</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
              Entregas ordenadas por cercanía geográfica con botón directo para abrir Google Maps y cobros a $0 costo de API.
            </p>
          </div>

          <div className="bg-[#0e0e11] border border-white/10 p-6 rounded-2xl space-y-3 text-left hover:border-[#d89e41]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <h3 className="font-bold text-white text-base">Cartera, Nómina & Auditoría</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
              Control de créditos, cuotas, turnos de empleados con PIN/Teléfono y bitácora de seguridad con encriptación bcrypt.
            </p>
          </div>

        </div>
      </section>

      {/* 4. PLANES Y MONETIZACIÓN SAAS */}
      <section id="planes" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10 z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#d89e41] font-mono">SUSCRIPCIÓN Y PRECIOS</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
            Planes de Suscripción ERP
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8] font-['Inter',sans-serif]">
            Acceso inmediato a la plataforma con soporte directo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          
          {/* PLAN BÁSICO MICRO */}
          <div className="bg-[#0e0e11] border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-white/25 transition">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">🟢 Plan Básico (Micro)</span>
              <h3 className="text-4xl font-black text-white mt-3">$49.000 <span className="text-xs font-normal text-slate-400">COP / mes</span></h3>
              <p className="text-xs text-slate-400 mt-2">Para pequeñas tiendas, comercios de barrio y profesionales independientes.</p>

              <div className="mt-8 space-y-3.5 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Hasta 10 Facturas Electrónicas DIAN / mes
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Impresión de tiquetes POS 80mm Ilimitados
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Hasta 3 Empleados / Usuarios en sistema
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Módulo de Inventarios & Alertas de Stock
                </div>
              </div>
            </div>

            <a
              href={whatsappSalesUrl('Plan Básico Micro')}
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs text-center transition cursor-pointer block"
            >
              Suscribirse a Plan Básico
            </a>
          </div>

          {/* PLAN PRO CRECIMIENTO */}
          <div className="bg-gradient-to-b from-[#1c170f] via-[#14120e] to-[#0e0e11] border-2 border-[#d89e41] rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-[#d89e41]/20 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#d89e41] to-[#ba9249] text-black text-[10px] font-black uppercase px-4 py-1 rounded-full tracking-wider shadow-lg">
              ★ Más Popular
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#fce188] font-mono">🚀 Plan Pro (Crecimiento)</span>
              <h3 className="text-4xl font-black text-white mt-3">$149.000 <span className="text-xs font-normal text-slate-400">COP / mes</span></h3>
              <p className="text-xs text-slate-300 mt-2">Para empresas que quieren vender en automático con IA, Domicilios y Landing propia.</p>

              <div className="mt-8 space-y-3.5 text-xs text-slate-200">
                <div className="flex items-center gap-2.5 font-bold text-[#fce188]">
                  <span className="material-symbols-outlined text-[#d89e41] text-lg">check_circle</span>
                  Facturas Electrónicas DIAN ILIMITADAS
                </div>
                <div className="flex items-center gap-2.5 font-bold text-[#fce188]">
                  <span className="material-symbols-outlined text-[#d89e41] text-lg">check_circle</span>
                  Bot de WhatsApp con IA Autónomo 24/7
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#d89e41] text-lg">check</span>
                  Ruta de Domicilios por Cercanía + Google Maps
                </div>
                <div className="flex items-center gap-2.5 font-bold text-[#fce188]">
                  <span className="material-symbols-outlined text-[#d89e41] text-lg">web</span>
                  Incluye Diseño & Montaje de Landing Page de tu Tienda
                </div>
              </div>
            </div>

            <a
              href={whatsappSalesUrl('Plan Pro Crecimiento')}
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-[#d89e41] via-[#e2b75f] to-[#ba9249] hover:brightness-110 text-black font-black text-xs text-center transition cursor-pointer block"
            >
              Adquirir Plan Pro
            </a>
          </div>

          {/* PLAN ENTERPRISE & AGENCIA */}
          <div className="bg-[#0e0e11] border border-purple-500/40 rounded-3xl p-8 flex flex-col justify-between hover:border-purple-500/70 transition">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">👑 Enterprise & Agencia IA</span>
              <h3 className="text-4xl font-black text-white mt-3">$349.000 <span className="text-xs font-normal text-slate-400">COP / mes</span></h3>
              <p className="text-xs text-slate-400 mt-2">Solución integral: ERP + Dominio Web Estándar + Landing Page + Estrategia Digital.</p>

              <div className="mt-8 space-y-3.5 text-xs text-slate-300">
                <div className="flex items-center gap-2.5 font-bold text-purple-300">
                  <span className="material-symbols-outlined text-purple-400 text-lg">language</span>
                  Dominio Web Estándar Incluido para tu marca
                </div>
                <div className="flex items-center gap-2.5 font-bold text-purple-300">
                  <span className="material-symbols-outlined text-purple-400 text-lg">web</span>
                  Diseño & Montaje de tu Landing Page Web
                </div>
                <div className="flex items-center gap-2.5 font-bold text-purple-300">
                  <span className="material-symbols-outlined text-purple-400 text-lg">campaign</span>
                  Paquete de Estrategia de Marketing Digital
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-purple-400 text-lg">check</span>
                  ERP Completo + Usuarios Ilimitados
                </div>
              </div>
            </div>

            <a
              href={whatsappSalesUrl('Plan Enterprise & Agencia')}
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs text-center transition cursor-pointer block"
            >
              Contactar por Paquete Enterprise
            </a>
          </div>

        </div>
      </section>

      {/* 5. PAQUETE DE POSICIONAMIENTO LOCAL & ESTRATEGIA DIGITAL CON IA */}
      <section id="agencia" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10 z-10 relative">
        <div className="bg-gradient-to-r from-purple-950/40 via-[#1c170f] to-[#0e0e11] border border-[#d89e41]/40 p-8 sm:p-12 rounded-3xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl text-left">
          <div className="space-y-4 max-w-2xl">
            <span className="px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold uppercase font-mono">
              🚀 Posicionamiento Local & Estrategia Digital con IA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Dominio Web, Landing Page y Presencia en Google Maps para tu negocio
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed font-light">
              En nuestros planes <strong>Pro y Enterprise</strong> implementamos la infraestructura digital de tu empresa: gestionamos tu dominio web estándar, optimizamos tu perfil de negocio en <strong>Google Maps (SEO Local)</strong>, diseñamos tu Landing Page comercial y dejamos a tu <strong>Bot de WhatsApp IA</strong> listo para vender.
            </p>
          </div>

          <a
            href={whatsappSalesUrl('Estrategia Digital y Posicionamiento Local')}
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#d89e41] via-[#e2b75f] to-[#ba9249] hover:brightness-110 text-black font-extrabold text-xs transition-all shadow-xl shadow-[#d89e41]/30 shrink-0 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">map</span>
            Solicitar Posicionamiento Digital
          </a>
        </div>
      </section>

      {/* 6. SERVICIOS DE INGENIERÍA Y AUTOMATIZACIÓN A LA MEDIDA */}
      <section id="servicios" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10 z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#d89e41] font-mono">INGENIERÍA A LA MEDIDA</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
            Servicios de Automatización Personalizados
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8] font-['Inter',sans-serif]">
            Para empresas que requieren desarrollos e integraciones avanzadas a medida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          
          <div className="bg-[#0e0e11] border border-white/10 hover:border-[#d89e41]/50 p-8 rounded-2xl transition group flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#d89e41]/10 border border-[#d89e41]/20 flex items-center justify-center text-[#d89e41]">
                <span className="material-symbols-outlined text-2xl">settings_suggest</span>
              </div>
              <h3 className="font-bold text-lg text-white">Automatización de Procesos</h3>
              <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
                Eliminamos tareas repetitivas y optimizamos flujos de trabajo operativos.
              </p>
            </div>
            <a href={whatsappSalesUrl('Automatización de Procesos')} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#d89e41] flex items-center gap-1">
              Saber más <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <div className="bg-[#0e0e11] border border-white/10 hover:border-[#d89e41]/50 p-8 rounded-2xl transition group flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#d89e41]/10 border border-[#d89e41]/20 flex items-center justify-center text-[#d89e41]">
                <span className="material-symbols-outlined text-2xl">hub</span>
              </div>
              <h3 className="font-bold text-lg text-white">Integración de Sistemas</h3>
              <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
                Conectamos tus herramientas, aplicaciones y plataformas mediante APIs y webhooks.
              </p>
            </div>
            <a href={whatsappSalesUrl('Integración de Sistemas')} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#d89e41] flex items-center gap-1">
              Saber más <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <div className="bg-[#0e0e11] border border-white/10 hover:border-[#d89e41]/50 p-8 rounded-2xl transition group flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#d89e41]/10 border border-[#d89e41]/20 flex items-center justify-center text-[#d89e41]">
                <span className="material-symbols-outlined text-2xl">analytics</span>
              </div>
              <h3 className="font-bold text-lg text-white">Inteligencia de Datos</h3>
              <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
                Convertimos tus datos operativos en insights accionables para tomar mejores decisiones.
              </p>
            </div>
            <a href={whatsappSalesUrl('Inteligencia de Datos')} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#d89e41] flex items-center gap-1">
              Saber más <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <div className="bg-[#0e0e11] border border-white/10 hover:border-[#d89e41]/50 p-8 rounded-2xl transition group flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#d89e41]/10 border border-[#d89e41]/20 flex items-center justify-center text-[#d89e41]">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
              <h3 className="font-bold text-lg text-white">IA y Agentes Autónomos</h3>
              <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">
                Aplicamos modelos de lenguaje e inteligencia artificial para problemas complejos.
              </p>
            </div>
            <a href={whatsappSalesUrl('IA y Agentes Autónomos')} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#d89e41] flex items-center gap-1">
              Saber más <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

        </div>
      </section>

      {/* 7. METODOLOGÍA PROCESO CLARO */}
      <section id="metodologia" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10 z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#d89e41] font-mono">CÓMO TRABAJAMOS</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
            Un proceso claro. Resultados reales.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          <div className="space-y-4 text-center group">
            <div className="w-16 h-16 rounded-full bg-[#0e0e11] border border-[#d89e41]/40 flex items-center justify-center text-[#d89e41] mx-auto group-hover:scale-110 transition">
              <span className="material-symbols-outlined text-2xl">search</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#d89e41]">01</span>
            <h3 className="font-bold text-lg text-white">Entendemos</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">Analizamos tu negocio y detectamos oportunidades.</p>
          </div>

          <div className="space-y-4 text-center group">
            <div className="w-16 h-16 rounded-full bg-[#0e0e11] border border-[#d89e41]/40 flex items-center justify-center text-[#d89e41] mx-auto group-hover:scale-110 transition">
              <span className="material-symbols-outlined text-2xl">lightbulb</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#d89e41]">02</span>
            <h3 className="font-bold text-lg text-white">Diseñamos</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">Creamos la solución ideal para tus objetivos.</p>
          </div>

          <div className="space-y-4 text-center group">
            <div className="w-16 h-16 rounded-full bg-[#0e0e11] border border-[#d89e41]/40 flex items-center justify-center text-[#d89e41] mx-auto group-hover:scale-110 transition">
              <span className="material-symbols-outlined text-2xl">code</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#d89e41]">03</span>
            <h3 className="font-bold text-lg text-white">Implementamos</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">Desarrollamos e integramos de forma ágil y segura.</p>
          </div>

          <div className="space-y-4 text-center group">
            <div className="w-16 h-16 rounded-full bg-[#0e0e11] border border-[#d89e41]/40 flex items-center justify-center text-[#d89e41] mx-auto group-hover:scale-110 transition">
              <span className="material-symbols-outlined text-2xl">rocket_launch</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#d89e41]">04</span>
            <h3 className="font-bold text-lg text-white">Optimizamos</h3>
            <p className="text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed">Medimos, ajustamos y escalamos resultados.</p>
          </div>
        </div>
      </section>

      {/* 8. SOBRE DIAZ LAB */}
      <section className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-white/10 z-10 relative">
        <div className="bg-[#0b0b0e] border border-white/10 rounded-3xl p-8 sm:p-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full aspect-video sm:aspect-square rounded-2xl overflow-hidden border border-[#d89e41]/30 bg-[#141419] flex flex-col items-center justify-center p-8 shadow-2xl">
              <img src="/brand/logo DLA.svg" alt="Diaz Lab" className="w-3/4 h-3/4 object-contain opacity-90" />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#d89e41] font-mono">SOBRE NOSOTROS</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">Tecnología con propósito humano.</h2>
            <p className="text-sm text-[#cbd5e1] font-['Inter',sans-serif] leading-relaxed font-light">
              En Diaz Lab Automation creemos que la tecnología debe servir a las personas. Combinamos nuestra plataforma ERP lista para usar con ingeniería de software personalizada para construir soluciones de impacto real.
            </p>

            <a
              href={whatsappSalesUrl('Conocer Más de Diaz Lab')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-[#d89e41] text-[#fce188] hover:bg-[#d89e41]/10 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Conócenos mejor
            </a>
          </div>
        </div>
      </section>

      {/* 9. FAQ PREGUNTAS FRECUENTES */}
      <section id="faq" className="py-24 px-6 sm:px-12 max-w-4xl mx-auto border-t border-white/10 z-10 relative">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#d89e41] font-mono">PREGUNTAS FRECUENTES</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">Preguntas Frecuentes</h2>
        </div>

        <div className="space-y-4 text-left">
          {[
            {
              q: "¿La plataforma ERP ya viene lista o requiere desarrollo personalizado?",
              a: "Nuestra plataforma ERP SaaS (POS, Factura DIAN, Agente WhatsApp IA y Domicilios) ya está construida y lista para activarse de inmediato. Además, ofrecemos servicios de automatización e integración a la medida si tu empresa lo requiere."
            },
            {
              q: "¿Cómo funciona la oferta de Dominio Propio y Landing Page?",
              a: "Con nuestros planes Pro y Enterprise, gestionamos la adquisición del dominio web estándar disponible para tu marca, lo configuramos con SSL y diseñamos la Landing Page comercial de tu tienda enlazada al ERP."
            },
            {
              q: "¿Cómo es el proceso de contratación e integración a la medida?",
              a: "Nos conectamos con tus sistemas actuales a través de APIs y webhooks seguros. Seguimos nuestra metodología en 4 pasos (Entendemos, Diseñamos, Implementamos, Optimizamos)."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => toggleFaq(idx)}
              className="bg-[#0e0e11] border border-white/10 rounded-2xl p-6 cursor-pointer transition hover:border-[#d89e41]/40"
            >
              <div className="flex justify-between items-center font-bold text-sm text-white">
                <span>{item.q}</span>
                <span className="material-symbols-outlined text-[#d89e41]">
                  {activeFaq === idx ? 'expand_less' : 'expand_more'}
                </span>
              </div>
              {activeFaq === idx && (
                <p className="mt-4 text-xs text-[#94a3b8] font-['Inter',sans-serif] leading-relaxed border-t border-white/5 pt-4">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 10. CTA FINAL */}
      <section className="py-28 px-6 sm:px-12 max-w-5xl mx-auto text-center z-10 relative">
        <div className="bg-gradient-to-b from-[#14120e] via-[#09090b] to-[#070708] border border-[#d89e41]/40 p-10 sm:p-16 rounded-3xl relative overflow-hidden shadow-2xl space-y-8">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            ¿Listo para automatizar tu próximo éxito?
          </h2>
          <p className="text-sm sm:text-base text-[#cbd5e1] font-['Inter',sans-serif] max-w-2xl mx-auto font-light">
            Hablemos de cómo podemos ayudarte a convertir procesos complejos en soluciones inteligentes.
          </p>

          <a
            href={whatsappSalesUrl('Agendar una reunión')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-[#d89e41] hover:bg-[#e2b75f] text-[#070708] font-black text-xs uppercase tracking-wider transition shadow-xl shadow-[#d89e41]/30 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Agendar una reunión
          </a>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="border-t border-white/10 py-16 px-6 sm:px-12 bg-[#040405] text-xs text-[#71717a] z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 text-left mb-12">
          <div className="space-y-4">
            <img src="/brand/logo DLA.svg" alt="DIAZ LAB Automation" className="h-8 w-auto object-contain" />
            <p className="text-[11px] text-[#808a9d] font-['Inter',sans-serif] leading-relaxed">
              Automatizamos lo complejo. <br />
              Potenciamos lo que importa.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Navegación</h4>
            <ul className="space-y-2 text-[11px] text-[#94a3b8]">
              <li><a href="#hero" className="hover:text-[#d89e41]">Inicio</a></li>
              <li><a href="#erp-saas" className="hover:text-[#d89e41]">Plataforma ERP</a></li>
              <li><a href="#planes" className="hover:text-[#d89e41]">Planes ERP</a></li>
              <li><a href="#agencia" className="hover:text-[#d89e41]">Agencia & Dominios</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Soluciones</h4>
            <ul className="space-y-2 text-[11px] text-[#94a3b8]">
              <li>Plataforma SaaS ERP POS + DIAN</li>
              <li>Bot de WhatsApp Inteligente</li>
              <li>Rutas de Domicilios</li>
              <li>Automatizaciones a la Medida</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Contacto</h4>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Diaz Lab Automation <br />
              Colombia & Latinoamérica
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-[#64748b]">
          <p>© 2026 Diaz Lab Automation. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  );
};
