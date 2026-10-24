import React, { useState, useEffect } from 'react';

export type ErpThemeId =
  | 'wabi-titanium'
  | 'wabi-sabi-koi'
  | 'obsidian-pro'
  | 'swiss-platinum'
  | 'kyoto-espresso'
  | 'bottega-emerald';

export type ErpScaleId = 'standard' | 'comfort' | 'max';
export type ErpFontPairId = 'industrial' | 'editorial-calibrated' | 'swiss-clean';

interface ThemeOption {
  id: ErpThemeId;
  name: string;
  tag: string;
  recommended?: boolean;
  description: string;
  sidebarHex: string;
  canvasHex: string;
  cardHex: string;
  accentHex: string;
  isDark?: boolean;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'wabi-titanium',
    name: 'Wabi-Sabi Titanium (Recomendado)',
    tag: 'SIDEBAR GRAFITO + LIENZO PIEDRA',
    recommended: true,
    description: 'Sidebar en grafito anodizado (#141519) que enmarca la pantalla y lienzo piedra cálido (#F1EFEA) de fatiga visual cero.',
    sidebarHex: '#141519',
    canvasHex: '#F1EFEA',
    cardHex: '#FFFFFF',
    accentHex: '#D9381E',
  },
  {
    id: 'obsidian-pro',
    name: 'Obsidian Pro (Modo Oscuro)',
    tag: 'CHASIS NOCTURNO CARBONO',
    description: 'Chasis en obsidiana (#0B0C0F) y paneles en grafito mate (#13161C) con acento carmesí (#FF3B1D) para turnos largos sin deslumbramiento.',
    sidebarHex: '#07080A',
    canvasHex: '#0B0C0F',
    cardHex: '#13161C',
    accentHex: '#FF3B1D',
    isDark: true,
  },
  {
    id: 'wabi-sabi-koi',
    name: 'Wabi-Sabi Paper (Clásico Claro)',
    tag: 'PAPEL ARTESANAL CÁLIDO',
    description: 'Tu tema original de papel artesanal (#F6F4EE) con contraste de texto reforzado (#3D3B37) para lectura nítida en portátiles.',
    sidebarHex: '#F6F4EE',
    canvasHex: '#FFFFFF',
    cardHex: '#FAF8F3',
    accentHex: '#D9381E',
  },
  {
    id: 'swiss-platinum',
    name: 'Swiss Platinum (Gris Perla Neutro)',
    tag: 'ESTILO STRIPE / LINEAR',
    description: 'Elimina el tono crema por completo: sidebar en pizarra (#0F172A), fondo gris platino (#F3F4F6) y tarjetas blancas puras.',
    sidebarHex: '#0F172A',
    canvasHex: '#F3F4F6',
    cardHex: '#FFFFFF',
    accentHex: '#E11D48',
  },
  {
    id: 'kyoto-espresso',
    name: 'Kyoto Espresso & Terracotta',
    tag: 'EDITORIAL CÁLIDO DE AUTOR',
    description: 'Menú lateral en café tostado profundo (#171412), lienzo lino natural (#EFECE6) y acentos en cobre terracota (#C2410C).',
    sidebarHex: '#171412',
    canvasHex: '#EFECE6',
    cardHex: '#FFFFFF',
    accentHex: '#C2410C',
  },
  {
    id: 'bottega-emerald',
    name: 'Alpine Emerald & Ivory',
    tag: 'LUJO CLÍNICO & ÓPTICO',
    description: 'Sidebar en verde pino profundo (#0A1914), lienzo marfil limpio (#F3F2EE) y acento esmeralda clínico (#0D9488). Ideal para ópticas.',
    sidebarHex: '#0A1914',
    canvasHex: '#F3F2EE',
    cardHex: '#FFFFFF',
    accentHex: '#0D9488',
  },
];

const FONT_OPTIONS: {
  id: ErpFontPairId;
  name: string;
  tag: string;
  sampleTitle: string;
  sampleClass: string;
  description: string;
  breakdown: string;
}[] = [
  {
    id: 'industrial',
    name: '1. Space Grotesk + Jakarta (Mockup)',
    tag: 'RECOMENDADO — COMBINACIÓN DEL MOCKUP',
    sampleTitle: 'Facturación & Caja POS',
    sampleClass: "font-['Space_Grotesk'] font-bold tracking-tight text-lg",
    description: 'La combinación exacta del mockup: títulos y KPIs firmes en Space Grotesk Bold (sin cursiva), tablas ultra-claras en Plus Jakarta Sans y montos en JetBrains Mono.',
    breakdown: 'Títulos: Space Grotesk 700 • Tablas: Jakarta Sans • Cifras: JetBrains Mono',
  },
  {
    id: 'editorial-calibrated',
    name: '2. Editorial Calibrada + Grotesk',
    tag: 'SERIF SOLO EN TÍTULO PRINCIPAL',
    sampleTitle: 'Facturación & Caja POS',
    sampleClass: "font-['Instrument_Serif'] font-normal text-2xl tracking-normal",
    description: 'Instrument Serif en peso nativo 400 únicamente en el título principal; KPIs en Space Grotesk y subtítulos/tablas en Plus Jakarta Sans.',
    breakdown: 'H1: Instrument Serif 400 • KPIs: Space Grotesk • Tablas: Jakarta Sans',
  },
  {
    id: 'swiss-clean',
    name: '3. 100% Plus Jakarta Sans Geometric',
    tag: 'MÁXIMA LIMPIEZA EN PORTÁTIL 13"-14"',
    sampleTitle: 'Facturación & Caja POS',
    sampleClass: "font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-lg",
    description: 'Cero serifas. Todo el sistema unificado en Plus Jakarta Sans (Bold para encabezados, Semibold/Medium para tablas) con cifras tabulares.',
    breakdown: 'Todo el UI: Plus Jakarta Sans • Cifras: JetBrains Mono Tabular',
  },
];

const SCALE_OPTIONS: {
  id: ErpScaleId;
  name: string;
  badge: string;
  description: string;
  subtextSpec: string;
}[] = [
  {
    id: 'standard',
    name: 'Estándar Monitor (100%)',
    badge: 'MONITORES 24" A 45"',
    description: 'Densidad compacta para monitores grandes de escritorio o pantallas ultrawide.',
    subtextSpec: 'Subtextos tabla: 12px',
  },
  {
    id: 'comfort',
    name: 'Confort Portátil (112%)',
    badge: 'RECOMENDADO PORTÁTIL 13"–15"',
    description: 'Eleva automáticamente las descripciones pequeñas de tablas a 13px con mayor contraste sin desbordar columnas.',
    subtextSpec: 'Subtextos tabla: 13px Nítido',
  },
  {
    id: 'max',
    name: 'Máxima Nitidez (122%)',
    badge: 'ALTA ACCESIBILIDAD',
    description: 'Maximiza el cuerpo de lectura en historias clínicas, fórmulas ópticas y tablas financieras.',
    subtextSpec: 'Subtextos tabla: 14px Amplio',
  },
];

export const applyErpAppearanceToDOM = (
  theme: ErpThemeId,
  scale: ErpScaleId,
  fontPair: ErpFontPairId
) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Normalizar alias antiguos
  const normalizedTheme: ErpThemeId =
    (theme as string) === 'obsidian-precision'
      ? 'obsidian-pro'
      : (theme as string) === 'swiss-daylight'
      ? 'swiss-platinum'
      : theme;
  const normalizedFont: ErpFontPairId =
    (fontPair as string) === 'jakarta'
      ? 'industrial'
      : (fontPair as string) === 'editorial'
      ? 'editorial-calibrated'
      : fontPair;

  root.setAttribute('data-theme', normalizedTheme);
  root.setAttribute('data-scale', scale);
  root.setAttribute('data-font-pair', normalizedFont);
  localStorage.setItem('frant_erp_theme', normalizedTheme);
  localStorage.setItem('app_theme', normalizedTheme);
  localStorage.setItem('theme', normalizedTheme);
  localStorage.setItem('frant_erp_scale', scale);
  localStorage.setItem('frant_erp_font_pair', normalizedFont);
};

export const SaaSErpAppearanceSettings: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<ErpThemeId>(() => {
    const raw = localStorage.getItem('frant_erp_theme') || 'wabi-titanium';
    if (raw === 'obsidian-precision') return 'obsidian-pro';
    if (raw === 'swiss-daylight') return 'swiss-platinum';
    return (raw as ErpThemeId) || 'wabi-titanium';
  });

  const [selectedScale, setSelectedScale] = useState<ErpScaleId>(() => {
    return (localStorage.getItem('frant_erp_scale') as ErpScaleId) || 'comfort';
  });

  const [selectedFont, setSelectedFont] = useState<ErpFontPairId>(() => {
    const raw = localStorage.getItem('frant_erp_font_pair') || 'industrial';
    if (raw === 'jakarta') return 'industrial';
    if (raw === 'editorial') return 'editorial-calibrated';
    return (raw as ErpFontPairId) || 'industrial';
  });

  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    applyErpAppearanceToDOM(selectedTheme, selectedScale, selectedFont);
  }, [selectedTheme, selectedScale, selectedFont]);

  const handleSelectTheme = (id: ErpThemeId) => {
    setSelectedTheme(id);
    triggerToast();
  };

  const handleSelectScale = (id: ErpScaleId) => {
    setSelectedScale(id);
    triggerToast();
  };

  const handleSelectFont = (id: ErpFontPairId) => {
    setSelectedFont(id);
    triggerToast();
  };

  const triggerToast = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141519] text-white border border-[#D9381E] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
          <span>Combinación de colores y tipografía aplicada en vivo</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA (8 COLS): PALETA DE COLORES, FUENTES Y ESCALA */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. PALETAS DE COLOR DEL ESPACIO DE TRABAJO (DISEÑO EXACTO DEL MOCKUP) */}
          <div className="erp-surface-card p-6 sm:p-7 space-y-5">
            <div className="border-b border-[var(--border-thin)] pb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)]">
                  1. Tema Visual & Paleta del Espacio de Trabajo
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Elige la combinación de color entre menú lateral, barra superior y lienzo operativo.
                </p>
              </div>
              <span className="font-mono text-[11px] px-2.5 py-1 rounded border border-[var(--border-thin)] bg-[var(--bg-secondary)] text-[var(--text-main)] font-semibold">
                Guardado Instantáneo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THEME_OPTIONS.map((t) => {
                const active = selectedTheme === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all space-y-3 ${
                      active
                        ? 'border-2 border-[var(--koi-vermilion)] bg-[var(--bg-secondary)] shadow-sm'
                        : 'border border-[var(--border-thin)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[var(--text-main)]">
                        {t.name}
                      </span>
                      <span
                        className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center ${
                          active
                            ? 'bg-[var(--koi-vermilion)]'
                            : 'border border-[var(--text-muted)] opacity-40'
                        }`}
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>

                    {/* Barra horizontal tripartita del Mockup (Sidebar 25% | Lienzo 50% | Acento 25%) */}
                    <div className="flex gap-1.5 h-7 rounded overflow-hidden border border-black/15 p-0.5 bg-black/5">
                      <div
                        className="w-1/4 h-full rounded-xs"
                        style={{ backgroundColor: t.sidebarHex }}
                        title={`Menú Lateral: ${t.sidebarHex}`}
                      />
                      <div
                        className="w-2/4 h-full rounded-xs border border-black/10"
                        style={{ backgroundColor: t.canvasHex }}
                        title={`Superficie Principal: ${t.canvasHex}`}
                      />
                      <div
                        className="w-1/4 h-full rounded-xs"
                        style={{ backgroundColor: t.accentHex }}
                        title={`Acento: ${t.accentHex}`}
                      />
                    </div>

                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. JERARQUÍA DE FUENTES (TÍTULOS, KPIS Y TABLAS) */}
          <div className="erp-surface-card p-6 sm:p-7 space-y-5">
            <div className="border-b border-[var(--border-thin)] pb-4">
              <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)]">
                2. Combinación de Fuentes (Títulos, KPIs y Tablas)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Define cómo trabajan juntas las fuentes para que los títulos tengan carácter y las tablas se lean con total nitidez.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {FONT_OPTIONS.map((f) => {
                const active = selectedFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFont(f.id)}
                    className={`p-4 rounded-lg text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      active
                        ? 'border-2 border-[var(--koi-vermilion)] bg-[var(--bg-secondary)] shadow-sm'
                        : 'border border-[var(--border-thin)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--koi-vermilion)]">
                          {f.tag}
                        </span>
                      </div>
                      <div className="py-2.5 px-3 rounded border border-[var(--border-thin)] bg-[var(--bg-card)] text-[var(--text-main)]">
                        <span className={f.sampleClass}>{f.sampleTitle}</span>
                      </div>
                      <div className="font-bold text-sm text-[var(--text-main)] pt-0.5">
                        {f.name}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[var(--border-thin)] text-[11px] font-mono text-[var(--text-muted)]">
                      {f.breakdown}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. ESCALA DE LECTURA PARA PORTÁTILES */}
          <div className="erp-surface-card p-6 sm:p-7 space-y-5">
            <div className="border-b border-[var(--border-thin)] pb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)]">
                  3. Escala Óptica para Pantallas de Portátil (13" a 15.6")
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Aumenta el tamaño y contraste de las descripciones secundarias (métodos de pago, horas y estados) sin deformar las columnas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {SCALE_OPTIONS.map((s) => {
                const active = selectedScale === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectScale(s.id)}
                    className={`p-4 rounded-lg text-left cursor-pointer transition-all flex flex-col justify-between space-y-2.5 ${
                      active
                        ? 'border-2 border-[var(--koi-vermilion)] bg-[var(--bg-secondary)] shadow-sm'
                        : 'border border-[var(--border-thin)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-thin)] text-[var(--text-muted)]">
                        {s.badge}
                      </span>
                      <div className="font-bold text-sm text-[var(--text-main)] pt-1">
                        {s.name}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[var(--border-thin)] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[var(--text-muted)]">{s.subtextSpec}</span>
                      <span className="font-bold text-[var(--koi-vermilion)]">
                        {active ? '✓ ACTIVO' : 'APLICAR →'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (4 COLS): PREVISUALIZACIÓN EN VIVO DE TABLA Y DIAGNÓSTICO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="erp-surface-card p-6 sm:p-7 space-y-5 border-l-4 border-l-[var(--koi-vermilion)]">
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--koi-vermilion)]">
                VISTA PREVIA EN TIEMPO REAL
              </span>
              <h3 className="text-base font-bold text-[var(--text-main)]">
                Así se ven tus Facturas y Descripciones con este Tema
              </h3>
            </div>

            {/* Mini-Tabla de Factura en Vivo */}
            <div className="rounded-lg border border-[var(--border-thin)] bg-[var(--bg-card)] overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-thin)] flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <span>Factura / Cliente</span>
                <span>Monto / Estado</span>
              </div>
              <div className="p-4 space-y-3 divide-y divide-[var(--border-thin)]">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs py-1 px-2.5 rounded border border-[var(--border-thin)] bg-[var(--bg-secondary)] text-[var(--text-main)]">
                      F-1002
                    </span>
                    <div>
                      <p className="font-bold text-sm text-[var(--text-main)] leading-snug">
                        Isac Díaz
                      </p>
                      <p className="text-[13px] font-medium text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                        <svg className="w-3.5 h-3.5 text-[#10B981] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                        <span>Efectivo • 09:45 p. m.</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-[var(--text-main)] tabular-nums">
                      $ 430.000
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      PAGADO
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <svg className="w-3.5 h-3.5 text-[var(--koi-vermilion)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35" />
                    </svg>
                    <span>Entrega en Local</span>
                  </span>
                  <span className="font-mono text-[11px]">21 de oct de 2026</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
              <div className="p-3.5 rounded-lg border border-[var(--border-thin)] bg-[var(--bg-secondary)] space-y-1">
                <div className="font-bold text-xs text-[var(--text-main)]">
                  ✓ Contraste de Filas & Hover Corregido
                </div>
                <p>
                  En modo oscuro (<strong>Obsidian Pro</strong>) todas las filas, estados <code>hover</code> e iconos mantienen contraste perfecto sin parpadeos blancos.
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-[var(--border-thin)] bg-[var(--bg-secondary)] space-y-1">
                <div className="font-bold text-xs text-[var(--text-main)]">
                  ✓ Iconografía Vectorial Limpia
                </div>
                <p>
                  Se reemplazaron los emojis genéricos de sistema por iconos vectoriales de trazo fino alineados a la paleta activa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
