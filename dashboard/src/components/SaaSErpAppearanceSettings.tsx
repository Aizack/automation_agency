import React, { useState, useEffect } from 'react';

export const SaaSErpAppearanceSettings: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('frant_erp_theme') || 'wabi-sabi-koi');
  const [scale, setScale] = useState<string>(() => localStorage.getItem('frant_erp_scale') || 'comfort');
  const [fontPair, setFontPair] = useState<string>(() => localStorage.getItem('frant_erp_font_pair') || 'jakarta');
  const [savedToast, setSavedToast] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('frant_erp_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-scale', scale);
    localStorage.setItem('frant_erp_scale', scale);
  }, [scale]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-pair', fontPair);
    localStorage.setItem('frant_erp_font_pair', fontPair);
  }, [fontPair]);

  const triggerToast = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2600);
  };

  const handleSelectTheme = (newTheme: string) => {
    setTheme(newTheme);
    triggerToast();
  };

  const handleSelectScale = (newScale: string) => {
    setScale(newScale);
    triggerToast();
  };

  const handleSelectFont = (newFont: string) => {
    setFontPair(newFont);
    triggerToast();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {savedToast && (
        <div className="p-4 bg-[#FFFFFF] border-l-4 border-[#15803d] border-y border-r border-[#E2DFD7] text-[#161616] text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-[#15803d]">check_circle</span>
            <span>Preferencia visual aplicada en tiempo real y guardada en este dispositivo.</span>
          </div>
          <span className="text-[11px] text-[#3F3D38] font-mono">ACTIVO</span>
        </div>
      )}

      {/* =====================================================================
          1. SELECTOR DE ESCALA DE LEGIBILIDAD PARA PORTÁTIL (SOLUCIÓN QUEJA)
         ===================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2DFD7] p-6 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2DFD7] pb-4">
          <div>
            <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-[0.16em] block">
              01. Optimización Óptica por Pantalla (Estándar WCAG 2.1 AA)
            </span>
            <h4 className="font-serif text-2xl text-[#161616] mt-0.5">
              Escala de Legibilidad para Portátiles & Monitores
            </h4>
            <p className="text-xs text-[#3F3D38] mt-1 max-w-2xl leading-relaxed">
              Ajusta el tamaño de las descripciones secundarias en tablas (métodos de pago, horas, estados de crédito y fechas) para que se lean con total nitidez en pantallas de portátil de 13" a 15.6".
            </p>
          </div>
          <span className="px-3 py-1.5 bg-[#E6F4EA] text-[#14532D] border border-[#86EFAC] text-xs font-mono font-bold uppercase tracking-wider shrink-0">
            Modo Activo: {scale === 'standard' ? 'Estándar 100%' : scale === 'comfort' ? 'Confort Portátil 112%' : 'Máxima Nitidez 122%'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              id: 'standard',
              badge: 'MONITORES 27" A 45"',
              title: 'Estándar (100%)',
              desc: 'Densidad compacta ideal para pantallas grandes o monitores ultrawide de escritorio.',
              subSize: 'Descripciones tabla: 12px',
            },
            {
              id: 'comfort',
              badge: 'RECOMENDADO PORTÁTIL 13"–15"',
              title: 'Confort Portátil (112%)',
              desc: 'Aumenta las descripciones pequeñas de tablas a 13px con mayor contraste sin romper las columnas.',
              subSize: 'Descripciones tabla: 13px Nítido',
            },
            {
              id: 'max',
              badge: 'ALTA ACCESIBILIDAD',
              title: 'Máxima Nitidez (122%)',
              desc: 'Maximiza el tamaño de lectura en recibos, historias clínicas y tablas financieras para turnos largos.',
              subSize: 'Descripciones tabla: 14px Amplio',
            },
          ].map((item) => {
            const active = scale === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectScale(item.id)}
                className={`p-5 border cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                  active
                    ? 'border-2 border-[#D9381E] bg-[#FAF8F3] shadow-sm'
                    : 'border-[#E2DFD7] bg-white hover:border-[#161616]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#F6F4EE] border border-[#E2DFD7] text-[#161616]">
                      {item.badge}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-[#D9381E]">
                      {active ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                  </div>
                  <h5 className="font-bold text-base text-[#161616] pt-1">{item.title}</h5>
                  <p className="text-xs text-[#3F3D38] leading-relaxed">{item.desc}</p>
                </div>
                <div className="pt-3 border-t border-[#E2DFD7] flex items-center justify-between text-[11px] font-mono font-bold text-[#D9381E]">
                  <span>{item.subSize}</span>
                  <span>{active ? '✓ SELECCIONADO' : 'APLICAR →'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. SELECTOR DE TEMA DE COLOR DEL ERP
         ===================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2DFD7] p-6 space-y-5 shadow-sm">
        <div className="border-b border-[#E2DFD7] pb-4">
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-[0.16em] block">
            02. Paleta Cromática & Contraste Ambiental
          </span>
          <h4 className="font-serif text-2xl text-[#161616] mt-0.5">
            Tema Visual de la Interfaz ERP
          </h4>
          <p className="text-xs text-[#3F3D38] mt-1 max-w-2xl leading-relaxed">
            Cambia la atmósfera cromática del sistema manteniendo intacto tu menú lateral expandible y todas las funciones operativas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              id: 'wabi-sabi-koi',
              name: 'Wabi-Sabi Warm Paper',
              tag: 'EDITORIAL REFINADO (PREDETERMINADO)',
              desc: 'Papel cálido artesanal (#F4F1EA), tarjetas blancas puras, tinta secundaria de alto contraste (#3F3D38) y acento Bermellón.',
              swatches: ['#F4F1EA', '#FFFFFF', '#141413', '#D9381E'],
            },
            {
              id: 'swiss-daylight',
              name: 'Swiss Daylight Studio',
              tag: 'ALTO CONTRASTE LUZ DÍA',
              desc: 'Superficie neutra fría (#F1F5F9) con pizarra técnica (#0F172A) y bordes definidos. Máxima claridad bajo iluminación intensa.',
              swatches: ['#F1F5F9', '#FFFFFF', '#0F172A', '#E11D48'],
            },
            {
              id: 'obsidian-precision',
              name: 'Obsidian Precision',
              tag: 'MODO OSCURO TÉCNICO',
              desc: 'Chasis en obsidiana (#0C0E12) y paneles en grafito (#14171F) para eliminar el deslumbramiento en turnos nocturnos.',
              swatches: ['#0C0E12', '#14171F', '#F3F4F6', '#FF4425'],
            },
          ].map((t) => {
            const active = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleSelectTheme(t.id)}
                className={`p-5 border cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                  active
                    ? 'border-2 border-[#D9381E] bg-[#FAF8F3] shadow-sm'
                    : 'border-[#E2DFD7] bg-white hover:border-[#161616]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D9381E]">
                      {t.tag}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-[#D9381E]">
                      {active ? 'check_circle' : 'circle'}
                    </span>
                  </div>
                  <h5 className="font-bold text-base text-[#161616]">{t.name}</h5>
                  <p className="text-xs text-[#3F3D38] leading-relaxed">{t.desc}</p>
                </div>

                <div className="pt-3 border-t border-[#E2DFD7] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {t.swatches.map((hex) => (
                      <span
                        key={hex}
                        className="w-5 h-5 rounded-full border border-black/20 inline-block"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#161616]">
                    {active ? 'ACTIVO' : 'ACTIVAR'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          3. SELECTOR DE COMBINACIÓN TIPOGRÁFICA
         ===================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2DFD7] p-6 space-y-5 shadow-sm">
        <div className="border-b border-[#E2DFD7] pb-4">
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-[0.16em] block">
            03. Arquitectura Tipográfica & Números Tabulares
          </span>
          <h4 className="font-serif text-2xl text-[#161616] mt-0.5">
            Combinación de Fuentes del Sistema
          </h4>
          <p className="text-xs text-[#3F3D38] mt-1 max-w-2xl leading-relaxed">
            Corrige el empastado visual en subtítulos y separa claramente los textos de lectura rápida (`Plus Jakarta Sans`) de los códigos y cifras contables (`JetBrains Mono`).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              id: 'jakarta',
              title: 'Plus Jakarta Sans (UI Nítida)',
              tag: 'RECOMENDADO OPERACIÓN DIARIA',
              sampleTitle: 'Facturación & Caja POS',
              sampleFont: '"Plus Jakarta Sans", sans-serif',
              desc: 'Títulos, subtítulos y descripciones en Plus Jakarta Sans Bold/Medium. Máxima limpieza en portátiles.',
            },
            {
              id: 'editorial',
              title: 'Editorial Sartorial (Instrument Serif)',
              tag: 'CLÁSICO WABI-SABI SIN FALSO BOLD',
              sampleTitle: 'Facturación & Caja POS',
              sampleFont: '"Instrument Serif", Georgia, serif',
              desc: 'Títulos principales en Instrument Serif peso nativo 400 (sin falso negrita borroso) y tablas en Plus Jakarta Sans.',
            },
            {
              id: 'industrial',
              title: 'Industrial Precision (Space Grotesk)',
              tag: 'ESTILO HARDWARE TÉCNICO',
              sampleTitle: 'Facturación & Caja POS',
              sampleFont: '"Space Grotesk", sans-serif',
              desc: 'Encabezados geométricos de ingeniería en Space Grotesk combinados con telemetría tabular.',
            },
          ].map((f) => {
            const active = fontPair === f.id;
            return (
              <div
                key={f.id}
                onClick={() => handleSelectFont(f.id)}
                className={`p-5 border cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                  active
                    ? 'border-2 border-[#D9381E] bg-[#FAF8F3] shadow-sm'
                    : 'border-[#E2DFD7] bg-white hover:border-[#161616]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D9381E]">
                      {f.tag}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-[#D9381E]">
                      {active ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                  </div>
                  <div
                    className="p-3 bg-[#F6F4EE] border border-[#E2DFD7] text-xl text-[#161616]"
                    style={{ fontFamily: f.sampleFont, fontWeight: f.id === 'editorial' ? 400 : 700 }}
                  >
                    {f.sampleTitle}
                  </div>
                  <h5 className="font-bold text-sm text-[#161616] pt-1">{f.title}</h5>
                  <p className="text-xs text-[#3F3D38] leading-relaxed">{f.desc}</p>
                </div>
                <div className="pt-3 border-t border-[#E2DFD7] text-[11px] font-mono font-bold text-[#161616] flex justify-between">
                  <span>Montos: JetBrains Mono</span>
                  <span className="text-[#D9381E]">{active ? '✓ ACTIVA' : 'USAR →'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          4. VISTA PREVIA EN TIEMPO REAL DE LA TABLA DE FACTURAS (PORTÁTIL)
         ===================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2DFD7] p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DFD7] pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#15803d] block">
              ✓ PRUEBA DE LECTURA EN TIEMPO REAL (SIMULADOR DE TABLA DE FACTURAS)
            </span>
            <h5 className="font-bold text-base text-[#161616]">
              Así verá tu equipo las descripciones de Facturación con la configuración actual:
            </h5>
          </div>
          <span className="text-xs font-mono text-[#3F3D38]">
            Contraste Secundario &gt; 8.5:1 (AAA)
          </span>
        </div>

        <div className="border border-[#E2DFD7] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[11px] text-[#3F3D38] uppercase tracking-wider font-bold">
                <th className="p-3.5">Factura / Cliente</th>
                <th className="p-3.5">Emisión</th>
                <th className="p-3.5">Monto Total</th>
                <th className="p-3.5">Despacho</th>
                <th className="p-3.5">Vence</th>
                <th className="p-3.5">Estado / Soporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7] text-xs">
              <tr className="hover:bg-[#FAF8F5]">
                <td className="p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#161616] text-xs font-mono bg-[#F6F4EE] py-1 px-2.5 border border-[#E2DFD7]">
                      F-1002
                    </span>
                    <div>
                      <p className="font-bold text-[#161616] text-sm">Isaac Diaz</p>
                      <p className="text-xs text-[#3F3D38] flex items-center gap-1.5 mt-0.5 font-semibold font-sans">
                        <span className="material-symbols-outlined text-[15px]">payments</span>
                        Efectivo
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3.5">
                  <p className="font-bold text-[#161616] text-xs">21/10/2026</p>
                  <p className="text-xs text-[#3F3D38] font-sans font-medium mt-0.5">09:45 p. m.</p>
                </td>
                <td className="p-3.5 font-bold text-[#161616] text-sm font-mono tabular-nums">$ 180.000</td>
                <td className="p-3.5">
                  <div className="inline-flex items-center gap-1.5 uppercase text-xs font-semibold tracking-wide bg-[#FAF8F5] px-2.5 py-1 border border-[#E2DFD7] text-[#161616]">
                    <span className="material-symbols-outlined text-[15px]">storefront</span>
                    Local
                  </div>
                </td>
                <td className="p-3.5">
                  <p className="font-semibold text-[#161616] text-xs">19/11/2026</p>
                  <span className="text-[11px] px-2 py-0.5 font-bold uppercase tracking-wider block w-max mt-1 border bg-[#E6F4EA] text-[#14532D] border-[#86EFAC]">
                    Crédito Saldado
                  </span>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#14532D] border border-[#86EFAC]">
                      Pagado
                    </span>
                    <span className="bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[13px] text-[#D9381E]">receipt_long</span>
                      Soporte
                    </span>
                  </div>
                  <div className="text-xs text-[#14532D] font-sans font-semibold flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">event_available</span>
                    Pagado: 21/10/2026
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
