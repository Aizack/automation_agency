import React, { useState } from 'react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const whatsappSalesUrl = (planName: string) => {
    const text = encodeURIComponent(`Hola Díaz Lab, me interesa suscribirme al *${planName}* para mi negocio. ¿Me pueden dar más información y activar mi prueba?`);
    return `https://wa.me/573104567890?text=${text}`;
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
    <div className="min-h-screen bg-[#0d0d0d] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-300">
      
      {/* 1. NAVBAR SUPERIOR CON LOGO Y ACCESO */}
      <nav className="sticky top-0 z-50 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-amber-500/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-amber-500/20">
            D
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white leading-tight">Díaz Lab <span className="text-amber-400 font-mono text-xs">SaaS & IA</span></h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Ecosistema Empresarial Multi-Tenant</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
          <a href="#caracteristicas" className="hover:text-amber-400 transition-colors">Características</a>
          <a href="#planes" className="hover:text-amber-400 transition-colors">Planes y Precios</a>
          <a href="#agencia" className="hover:text-amber-400 transition-colors">Agencia Marketing & Dominio</a>
          <a href="#faq" className="hover:text-amber-400 transition-colors">Preguntas Frecuentes</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLoginRedirection}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-xs font-bold transition-all cursor-pointer"
          >
            Iniciar Sesión
          </button>
          <a
            href={whatsappSalesUrl('Prueba Gratuita')}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 cursor-pointer hidden sm:inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
            Probar Gratis
          </a>
        </div>
      </nav>

      {/* 2. SECCIÓN HÉROE CON EFECTO WOW */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Luces de neón de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[250px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-6 font-mono">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          Sistema ERP POS + Facturación Electrónica DIAN + Agente WhatsApp IA
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
          Automatiza tu Negocio, Vende 24/7 con <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">Agentes IA</span> y Factura con la DIAN
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          El primer ecosistema todo-en-uno para pymes: Punto de Venta POS, Factura Electrónica con QR fiscal, Agente Autónomo de WhatsApp que cotiza y cobra solo, y Logística de Domicilios a <strong className="text-emerald-400 font-bold">$0 costo de API</strong>.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#planes"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">local_mall</span>
            Ver Planes desde $49.000 COP
          </a>
          <button
            onClick={handleLoginRedirection}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            Ingresar al Panel ERP
          </button>
        </div>

        {/* Maqueta Visual en Modo Oscuro Obsidian Gold */}
        <div className="mt-16 relative rounded-3xl border border-amber-500/30 bg-[#141414]/90 p-4 sm:p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-xl max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10 text-xs text-slate-400 font-mono">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            <span className="ml-2 font-bold text-amber-400">app.diazlab.online — Panel de Control ERP & Agente IA</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-[#1c1c1c] p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-amber-400 material-symbols-outlined text-3xl">receipt_long</span>
              <h3 className="font-bold text-white text-sm">Facturación Electrónica DIAN</h3>
              <p className="text-xs text-slate-400">Emisión de comprobantes fiscales con CUFE, código QR SHA-384 e impresión POS 80mm.</p>
            </div>
            <div className="bg-[#1c1c1c] p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-emerald-400 material-symbols-outlined text-3xl">smart_toy</span>
              <h3 className="font-bold text-white text-sm">Agente IA WhatsApp 24/7</h3>
              <p className="text-xs text-slate-400">Atención automática de clientes, cotizaciones de productos, agendamiento de citas y cobro de cartera.</p>
            </div>
            <div className="bg-[#1c1c1c] p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-purple-400 material-symbols-outlined text-3xl">local_shipping</span>
              <h3 className="font-bold text-white text-sm">Logística de Domicilios Zero-Cost</h3>
              <p className="text-xs text-slate-400">Ruta organizada por cercanía para repartidores con Google Maps y WhatsApp directo a $0 costo de API.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SHOWCASE DE MÓDULOS DEL ERP */}
      <section id="caracteristicas" className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Todo lo que tu empresa necesita para crecer</h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">Sin pagar múltiples programas por separado. Una plataforma unificada para tu equipo y tus clientes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-[#141414] border border-white/10 hover:border-amber-500/40 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">point_of_sale</span>
            </div>
            <h3 className="font-bold text-lg text-white">Punto de Venta (POS) + DIAN</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vende en caja rápidamente con lector de código de barras, impresión térmica en 80mm y envío automático de factura al cliente por WhatsApp.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#141414] border border-white/10 hover:border-emerald-500/40 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <h3 className="font-bold text-lg text-white">Agente WhatsApp Autónomo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu propio vendedor virtual capacitado con la información de tu tienda. Responde precios, consultas de catálogo y deriva a asesores cuando sea necesario.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#141414] border border-white/10 hover:border-purple-500/40 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
            <h3 className="font-bold text-lg text-white">Ruta de Repartidores & Domicilios</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tus motorizados reciben sus entregas organizadas en orden de cercanía, con montos a cobrar en efectivo y botón directo para abrir Google Maps.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#141414] border border-white/10 hover:border-blue-500/40 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <h3 className="font-bold text-lg text-white">Cartera & Recuperación de Cobros</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gestiona ventas a crédito con cuotas personalizadas. Envía recordatorios de pago inteligentes con comprobante adjunto.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-[#141414] border border-white/10 hover:border-pink-500/40 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <span className="material-symbols-outlined text-2xl">badge</span>
            </div>
            <h3 className="font-bold text-lg text-white">Nómina & Portal de Colaboradores</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tus empleados inician sesión con su PIN/Teléfono, registran jornadas laborales, solicitan anticipos y gestionan sus tareas asignadas.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-[#141414] border border-white/10 hover:border-cyan-500/40 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
            <h3 className="font-bold text-lg text-white">Seguridad & Auditoría Zero-Trust</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Encriptación estricta de datos con bcrypt, bitácora de auditoría detallada de cada movimiento y protección avanzada contra ataques.
            </p>
          </div>
        </div>
      </section>

      {/* 4. TABLA DE PLANES Y MONETIZACIÓN */}
      <section id="planes" className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase font-mono">
            Planes Transparentes
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-4">Elige el plan ideal para impulsar tu empresa</h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">Sin contratos de permanencia. Cancela o cambia de plan cuando quieras.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PLAN 1: BÁSICO MICRO */}
          <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-white/25 transition-all">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">🟢 Plan Básico (Micro)</span>
              </div>
              <h3 className="text-3xl font-extrabold text-white">$49.000 <span className="text-xs font-normal text-slate-400">COP / mes</span></h3>
              <p className="text-xs text-slate-400 mt-2">Ideal para pequeños comercios, tiendas de barrio y emprendedores independientes.</p>

              <div className="mt-8 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Hasta 10 Facturas Electrónicas DIAN / mes
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Impresión de tiquetes POS 80mm Ilimitados
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Hasta 3 Empleados / Usuarios en sistema
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Módulo de Inventarios & Alertas de Stock
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">check</span>
                  Soporte técnico por Ticket & Email
                </div>
              </div>
            </div>

            <a
              href={whatsappSalesUrl('Plan Básico Micro')}
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs text-center transition-all cursor-pointer block"
            >
              Comenzar con Plan Básico
            </a>
          </div>

          {/* PLAN 2: PRO CRECIMIENTO (DESTACADO) */}
          <div className="bg-gradient-to-b from-[#1c170f] to-[#141414] border-2 border-amber-500 rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-amber-500/20 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-extrabold uppercase px-4 py-1 rounded-full tracking-wider shadow-lg">
              ★ Más Popular
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">🚀 Plan Pro (Crecimiento)</span>
              </div>
              <h3 className="text-4xl font-extrabold text-white">$149.000 <span className="text-xs font-normal text-slate-400">COP / mes</span></h3>
              <p className="text-xs text-slate-300 mt-2">Para empresas activas que buscan vender en automático con IA y domicilios.</p>

              <div className="mt-8 space-y-3 text-xs text-slate-200">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <span className="material-symbols-outlined text-amber-400 text-lg">check_circle</span>
                  Facturas Electrónicas DIAN ILIMITADAS
                </div>
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <span className="material-symbols-outlined text-amber-400 text-lg">check_circle</span>
                  Bot de WhatsApp con IA Autónomo 24/7
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">check</span>
                  Ruta de Domicilios por Cercanía + Google Maps
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">check</span>
                  Hasta 15 Empleados & Portal de Personal
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">check</span>
                  Recuperación de Cartera & Cobros Automatizados
                </div>
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <span className="material-symbols-outlined text-amber-400 text-lg">check_circle</span>
                  Incluye Configuración de Landing Page de tu Tienda
                </div>
              </div>
            </div>

            <a
              href={whatsappSalesUrl('Plan Pro Crecimiento')}
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs text-center transition-all shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-95 cursor-pointer block"
            >
              Obtener Plan Pro Ahora
            </a>
          </div>

          {/* PLAN 3: ENTERPRISE & AGENCIA MARKETING */}
          <div className="bg-[#141414] border border-purple-500/30 rounded-3xl p-8 flex flex-col justify-between hover:border-purple-500/60 transition-all">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">👑 Enterprise & Agencia IA</span>
              </div>
              <h3 className="text-3xl font-extrabold text-white">$349.000 <span className="text-xs font-normal text-slate-400">COP / mes</span></h3>
              <p className="text-xs text-slate-400 mt-2">Solución llave en mano: ERP Completo + Dominio + Landing Page + Marketing Digital.</p>

              <div className="mt-8 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <span className="material-symbols-outlined text-purple-400 text-lg">star</span>
                  Todo lo del Plan Pro + Usuarios Ilimitados
                </div>
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <span className="material-symbols-outlined text-purple-400 text-lg">language</span>
                  Dominio Propio Incluido (.com o .co para tu marca)
                </div>
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <span className="material-symbols-outlined text-purple-400 text-lg">web</span>
                  Diseño & Montaje de tu Landing Page Web de Ventas
                </div>
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <span className="material-symbols-outlined text-purple-400 text-lg">campaign</span>
                  Paquete de Estrategia de Marketing Digital
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">check</span>
                  Asistente Financiero Ejecutivo por WhatsApp
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">check</span>
                  Gestor Dedicado 24/7 & Soporte VIP
                </div>
              </div>
            </div>

            <a
              href={whatsappSalesUrl('Plan Enterprise & Agencia')}
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs text-center transition-all cursor-pointer block shadow-lg shadow-purple-600/30"
            >
              Contactar Asesor Enterprise
            </a>
          </div>

        </div>
      </section>

      {/* 5. PAQUETE DE AGENCIA DIGITAL DE VENTAS */}
      <section id="agencia" className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="bg-gradient-to-r from-purple-900/30 via-amber-900/20 to-emerald-900/30 border border-white/15 p-8 sm:p-12 rounded-3xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-left">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase font-mono">
              🚀 Servicio de Agencia Digital Integrado
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Nosotros compramos tu dominio y construimos la Landing Page de tu negocio
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              ¿No tienes tiempo para crear tu sitio web ni comprar dominios? En nuestro paquete <strong>Pro y Enterprise</strong> nos encargamos de todo: compramos tu dominio (ej. <code className="bg-black/50 px-2 py-1 rounded text-amber-300 font-mono">mi-tienda.com</code>), enlazamos tu catálogo y diseñamos una página comercial de ventas lista para recibir pedidos.
            </p>
          </div>

          <a
            href={whatsappSalesUrl('Servicio de Agencia y Dominio')}
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-xl shadow-amber-500/30 shrink-0 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">headset_mic</span>
            Solicitar Paquete Agencia & Dominio
          </a>
        </div>
      </section>

      {/* 6. PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Preguntas Frecuentes</h2>
          <p className="mt-2 text-slate-400 text-xs sm:text-sm">Todo lo que necesitas saber antes de comenzar.</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "¿Necesito un computador especial o impresora costosa?",
              a: "No. La plataforma funciona desde cualquier computador, tablet o celular. Es compatible con cualquier impresora térmica de 80mm estándar o impresoras convencionales."
            },
            {
              q: "¿Cómo funciona la Facturación Electrónica DIAN?",
              a: "Generamos automáticamente el archivo XML firmado, el código CUFE y el código QR fiscal exigido por la norma colombiana. Se envía al comprador de inmediato por correo o WhatsApp."
            },
            {
              q: "¿El Bot de WhatsApp consume mi número personal o requiere APIs costosas?",
              a: "Se conecta directamente mediante el escaneo de un código QR desde la opción 'Dispositivos vinculados' de tu propio WhatsApp. Cero costos de API por mensaje."
            },
            {
              q: "¿Cómo funciona la compra de dominio y diseño de Landing Page para mi tienda?",
              a: "Con los planes Pro y Enterprise, nuestro equipo compra el dominio de tu empresa (ej. tuempresa.com), lo configura con certificado SSL y construye tu página de ventas enlazada a tu ERP."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => toggleFaq(idx)}
              className="bg-[#141414] border border-white/10 rounded-2xl p-5 cursor-pointer transition-all hover:border-amber-500/30"
            >
              <div className="flex justify-between items-center font-bold text-sm text-white">
                <span>{item.q}</span>
                <span className="material-symbols-outlined text-amber-400">
                  {activeFaq === idx ? 'expand_less' : 'expand_more'}
                </span>
              </div>
              {activeFaq === idx && (
                <p className="mt-3 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. FOOTER FINAL */}
      <footer className="border-t border-white/10 py-12 px-6 bg-[#090909] text-center text-xs text-slate-500 space-y-4">
        <div className="flex justify-center items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-black text-xs">D</div>
          <span className="font-bold text-slate-300 text-sm">Díaz Lab SaaS & IA</span>
        </div>
        <p>© 2026 Díaz Lab Colombia. Todos los derechos reservados. Plataforma multi-tenant de Gestión ERP & IA.</p>
      </footer>

    </div>
  );
};
