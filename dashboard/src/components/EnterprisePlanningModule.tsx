import React, { useState } from 'react';

interface EnterprisePlanningModuleProps {
    clientId: string;
}

export const EnterprisePlanningModule: React.FC<EnterprisePlanningModuleProps> = ({ clientId: _clientId }) => {
    const [activeTab, setActiveTab] = useState<'proyecciones' | 'pricing' | 'juridico' | 'crecimiento'>('proyecciones');

    // 1. Estados Calculadora de Punto de Equilibrio & Proyección
    const [fixedCosts, setFixedCosts] = useState<string>('8000000'); // Arriendo, Nómina, Servicios
    const [averageTicket, setAverageTicket] = useState<string>('35000'); // Precio promedio por venta/plato
    const [costPerUnit, setCostPerUnit] = useState<string>('14000'); // Costo variable unitario promedio

    const fixedCostsNum = parseFloat(fixedCosts) || 0;
    const ticketNum = parseFloat(averageTicket) || 0;
    const unitCostNum = parseFloat(costPerUnit) || 0;

    const marginPerUnit = ticketNum - unitCostNum;
    const marginPercentage = ticketNum > 0 ? (marginPerUnit / ticketNum) * 100 : 0;
    const breakEvenUnits = marginPerUnit > 0 ? Math.ceil(fixedCostsNum / marginPerUnit) : 0;
    const breakEvenRevenue = breakEvenUnits * ticketNum;

    // 2. Estados Fijación de Precios (Pricing)
    const [bomCost, setBomCost] = useState<string>('12000');
    const [desiredMargin, setDesiredMargin] = useState<string>('60'); // 60%

    const bomNum = parseFloat(bomCost) || 0;
    const marginNum = parseFloat(desiredMargin) || 0;
    const calculatedPrice = marginNum < 100 ? bomNum / (1 - marginNum / 100) : 0;
    const grossProfit = calculatedPrice - bomNum;

    // 3. Estados Asesor Jurídico & Tributario
    const [annualRevenue, setAnnualRevenue] = useState<string>('50000000'); // Ventas anuales estimadas
    const [hasPartners, setHasPartners] = useState<boolean>(false);
    const [protectPersonalAssets, setProtectPersonalAssets] = useState<boolean>(true);

    const revenueNum = parseFloat(annualRevenue) || 0;

    const getLegalRecommendation = () => {
        if (hasPartners) {
            return {
                title: "Sociedad por Acciones Simplificada (S.A.S.)",
                badge: "Recomendado para Múltiples Socios",
                badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                reasons: [
                    "Permite estructurar estatutos flexibles entre 2 o más socios.",
                    "Limita la responsabilidad de los socios al capital aportado (protege patrimonio personal).",
                    "Permite crear diferentes clases de acciones (ordinarias, con voto preferencial, etc.)."
                ],
                taxTip: "Inscríbanse en el Régimen Simple de Tributación (RST) para unificar Renta, ICA y Venta en una sola tarifa reducida."
            };
        }

        if (revenueNum > 150000000 || protectPersonalAssets) {
            return {
                title: "S.A.S. Unipersonal (Sociedad de Accionista Único)",
                badge: "Recomendado por Seguridad Patrimonial & Escala",
                badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                reasons: [
                    "Separación total entre el patrimonio del negocio y tu patrimonio personal (casa, vehículo, ahorros).",
                    "Mayor credibilidad ante bancos, proveedores mayoristas y licitaciones.",
                    "Facilidad para recibir inversionistas en el futuro vendiendo porcentaje accionario."
                ],
                taxTip: "Evalúa acogerte al Régimen Simple de Tributación (RST) si tus costos operativos son bajos."
            };
        }

        return {
            title: "Persona Natural con RUT (Régimen No Responsable de IVA)",
            badge: "Ideal para Etapa Inicial / Prueba de Concepto",
            badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
            reasons: [
                "Bajo costo de constitución y menor carga administrativa contable inicial.",
                "Si vendes menos de 3.500 UVT anuales (~$164 millones), no cobras IVA al cliente final.",
                "Ideal para validar la idea de negocio en los primeros 6 meses."
            ],
            taxTip: "Mantén un control estricto del libro de ingresos para no sobrepasar el tope de UVT sin darte cuenta."
        };
    };

    const legalRec = getLegalRecommendation();

    return (
        <div className="space-y-6">
            {/* Encabezado Principal */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container/40 p-5 rounded-3xl border border-outline/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                        <span className="material-symbols-outlined text-[28px]">query_stats</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">Módulo de Planeación Empresarial & Proyecciones</h2>
                        <p className="text-xs text-on-surface-variant">Herramientas estratégicas de pricing, punto de equilibrio, asesoría jurídica y crecimiento</p>
                    </div>
                </div>

                {/* Sub-navegación por Pestañas */}
                <div className="flex flex-wrap gap-1 bg-surface/60 p-1.5 rounded-2xl border border-outline/10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('proyecciones')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'proyecciones' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">calculate</span>
                        Punto de Equilibrio
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('pricing')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'pricing' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">sell</span>
                        Calculadora de Precios
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('juridico')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'juridico' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                        Estructura Jurídica
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('crecimiento')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'crecimiento' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                        Plan de Crecimiento
                    </button>
                </div>
            </div>

            {/* Pestaña 1: Punto de Equilibrio & Proyecciones */}
            {activeTab === 'proyecciones' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    {/* Parámetros de Entrada */}
                    <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                        <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">sliders</span>
                            Variables Financieras del Negocio
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Costos Fijos Mensuales ($ COP)</label>
                                <span className="text-[10px] text-on-surface-variant/70 block">Suma de arriendo, nómina fija, servicios, software y seguros</span>
                                <input
                                    type="number"
                                    value={fixedCosts}
                                    onChange={(e) => setFixedCosts(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Precio Promedio de Venta por Unidad ($ COP)</label>
                                <span className="text-[10px] text-on-surface-variant/70 block">Ticket promedio de un plato o producto en tu menú</span>
                                <input
                                    type="number"
                                    value={averageTicket}
                                    onChange={(e) => setAverageTicket(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary text-primary"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Costo Variable Promedio por Unidad ($ COP)</label>
                                <span className="text-[10px] text-on-surface-variant/70 block">Costo de materia prima / insumos directos por plato</span>
                                <input
                                    type="number"
                                    value={costPerUnit}
                                    onChange={(e) => setCostPerUnit(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Resultados de Punto de Equilibrio */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-surface-container/40 border border-outline/10 p-5 rounded-3xl space-y-2">
                                <span className="text-[11px] text-on-surface-variant font-bold block">Ventas Mínimas Necesarias</span>
                                <strong className="text-2xl font-black text-primary block">{breakEvenUnits.toLocaleString()} unid/mes</strong>
                                <span className="text-[10px] text-on-surface-variant/80">Platos o productos para no perder dinero</span>
                            </div>

                            <div className="bg-surface-container/40 border border-outline/10 p-5 rounded-3xl space-y-2">
                                <span className="text-[11px] text-on-surface-variant font-bold block">Facturación Mínima (Break-even)</span>
                                <strong className="text-2xl font-black text-emerald-400 block">${breakEvenRevenue.toLocaleString()} COP</strong>
                                <span className="text-[10px] text-on-surface-variant/80">Ingreso mensual para cubrir todos los costos</span>
                            </div>

                            <div className="bg-surface-container/40 border border-outline/10 p-5 rounded-3xl space-y-2">
                                <span className="text-[11px] text-on-surface-variant font-bold block">Margen de Contribución</span>
                                <strong className="text-2xl font-black text-amber-400 block">{marginPercentage.toFixed(1)}%</strong>
                                <span className="text-[10px] text-on-surface-variant/80">Porcentaje que le queda a cada venta</span>
                            </div>
                        </div>

                        {/* Proyección Diaria */}
                        <div className="bg-surface/40 border border-outline/10 p-5 rounded-3xl space-y-3">
                            <h4 className="text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">today</span>
                                Meta Operativa Diaria (Asumiendo 26 días operados al mes):
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-surface p-3 rounded-2xl border border-outline/5">
                                    <span className="text-on-surface-variant block text-[10px]">Meta de Ventas por Día:</span>
                                    <strong className="text-sm font-bold text-on-surface">{Math.ceil(breakEvenUnits / 26)} platos/día</strong>
                                </div>
                                <div className="bg-surface p-3 rounded-2xl border border-outline/5">
                                    <span className="text-on-surface-variant block text-[10px]">Facturación Mínima por Día:</span>
                                    <strong className="text-sm font-bold text-emerald-400">${Math.ceil(breakEvenRevenue / 26).toLocaleString()} COP/día</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pestaña 2: Calculadora de Precios & Fijación Estratégica (Pricing) */}
            {activeTab === 'pricing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                        <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">sell</span>
                            Calculadora de Fijación de Precios basada en Margen Objetivo
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Costo Total del Producto / Insumos BOM ($ COP)</label>
                                <input
                                    type="number"
                                    value={bomCost}
                                    onChange={(e) => setBomCost(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Margen de Ganancia Bruto Deseado (%)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="20"
                                        max="85"
                                        value={desiredMargin}
                                        onChange={(e) => setDesiredMargin(e.target.value)}
                                        className="flex-grow accent-primary"
                                    />
                                    <span className="font-black text-primary text-sm min-w-[50px]">{desiredMargin}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container/40 border border-outline/10 p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold text-on-surface-variant block uppercase tracking-wider">Precio de Venta Sugerido (PVP):</span>
                            <strong className="text-3xl font-black text-primary block mt-1">${Math.round(calculatedPrice).toLocaleString()} COP</strong>
                            <p className="text-xs text-on-surface-variant/80 mt-2">
                                Para obtener un margen del <strong>{desiredMargin}%</strong> sobre un costo de ${bomNum.toLocaleString()}, este debe ser el precio público.
                            </p>
                        </div>

                        <div className="bg-surface p-4 rounded-2xl border border-outline/5 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-on-surface-variant">Costo Insumos:</span>
                                <span className="font-bold text-on-surface">${bomNum.toLocaleString()} COP</span>
                            </div>
                            <div className="flex justify-between border-t border-outline/10 pt-2">
                                <span className="text-on-surface-variant">Ganancia Bruta por Unidad:</span>
                                <span className="font-bold text-emerald-400">+${Math.round(grossProfit).toLocaleString()} COP</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pestaña 3: Asesor de Estructura Jurídica & Tributaria */}
            {activeTab === 'juridico' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                        <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">gavel</span>
                            Cuestionario Jurídico
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Ventas Anuales Estimadas ($ COP)</label>
                                <input
                                    type="number"
                                    value={annualRevenue}
                                    onChange={(e) => setAnnualRevenue(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="font-bold text-on-surface-variant block">¿Tienes socios en el negocio?</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setHasPartners(false)}
                                        className={`flex-1 py-2 rounded-xl font-bold transition ${!hasPartners ? 'bg-primary text-on-primary' : 'bg-surface border border-outline/20 text-on-surface-variant'}`}
                                    >
                                        No (Emprendedor Unipersonal)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHasPartners(true)}
                                        className={`flex-1 py-2 rounded-xl font-bold transition ${hasPartners ? 'bg-primary text-on-primary' : 'bg-surface border border-outline/20 text-on-surface-variant'}`}
                                    >
                                        Sí (2+ Socios)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="font-bold text-on-surface-variant block">¿Deseas blindar tu patrimonio personal?</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setProtectPersonalAssets(true)}
                                        className={`flex-1 py-2 rounded-xl font-bold transition ${protectPersonalAssets ? 'bg-primary text-on-primary' : 'bg-surface border border-outline/20 text-on-surface-variant'}`}
                                    >
                                        Sí (Blindar bienes)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProtectPersonalAssets(false)}
                                        className={`flex-1 py-2 rounded-xl font-bold transition ${!protectPersonalAssets ? 'bg-primary text-on-primary' : 'bg-surface border border-outline/20 text-on-surface-variant'}`}
                                    >
                                        No prioritario
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-surface-container/40 border border-outline/10 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <div>
                                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${legalRec.badgeColor}`}>
                                    {legalRec.badge}
                                </span>
                                <h3 className="text-lg font-black text-on-surface mt-2">{legalRec.title}</h3>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <h4 className="font-bold text-primary">¿Por qué es la mejor opción para tu negocio?</h4>
                            <ul className="space-y-1.5 list-disc list-inside text-on-surface-variant">
                                {legalRec.reasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-xs space-y-1 text-amber-300">
                            <strong className="font-bold flex items-center gap-1 text-amber-200">
                                <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                                Consejería Tributaria Especializada:
                            </strong>
                            <p>{legalRec.taxTip}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pestaña 4: Plan de Crecimiento & Expansión */}
            {activeTab === 'crecimiento' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in text-xs">
                    <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
                            <span className="material-symbols-outlined text-[24px]">trending_up</span>
                        </div>
                        <h4 className="font-extrabold text-on-surface text-sm">1. Estrategia de Venta Cruzada (Cross-Selling)</h4>
                        <p className="text-on-surface-variant">
                            Aumenta tu ticket promedio en un 18% ofreciendo acompañantes, bebidas o postres con descuento al momento de tomar el pedido en caja o comandero.
                        </p>
                    </div>

                    <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl w-fit">
                            <span className="material-symbols-outlined text-[24px]">loyalty</span>
                        </div>
                        <h4 className="font-extrabold text-on-surface text-sm">2. Programa de Fidelización & Recurrencia</h4>
                        <p className="text-on-surface-variant">
                            Implementa puntos por cada compra registrada en la cartera de clientes. Lograr que un cliente vuelva 1 vez más al mes aumenta la facturación un 25%.
                        </p>
                    </div>

                    <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3">
                        <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl w-fit">
                            <span className="material-symbols-outlined text-[24px]">groups</span>
                        </div>
                        <h4 className="font-extrabold text-on-surface text-sm">3. Segmentación de Mercado & Promociones</h4>
                        <p className="text-on-surface-variant">
                            Utiliza la automatización de WhatsApp para enviar ofertas personalizadas en días de baja afluencia (martes/miércoles) a los clientes con mayor historial de compra.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
