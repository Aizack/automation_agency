import React, { useState, useEffect } from 'react';

interface Asset {
    id: string;
    name: string;
    asset_type: string;
    asset_value: number;
    useful_life_months: number;
}

interface Liability {
    id: string;
    creditor_name: string;
    liability_type: string;
    total_debt: number;
    monthly_payment: number;
}

interface GrowthInsights {
    real_avg_ticket: number;
    total_invoices: number;
    total_revenue: number;
    lowest_sales_day: string;
    top_product_name: string;
    target_suggested_ticket: number;
}

interface EnterprisePlanningModuleProps {
    clientId: string;
}

export const EnterprisePlanningModule: React.FC<EnterprisePlanningModuleProps> = ({ clientId }) => {
    const [activeTab, setActiveTab] = useState<'proyecciones' | 'activos_pasivos' | 'pricing' | 'juridico' | 'crecimiento'>('proyecciones');

    // 1. Estados Calculadora de Punto de Equilibrio & Proyección
    const [fixedCosts, setFixedCosts] = useState<string>('8000000'); // Arriendo, Nómina, Servicios
    const [averageTicket, setAverageTicket] = useState<string>('35000'); // Precio promedio por venta/plato
    const [costPerUnit, setCostPerUnit] = useState<string>('14000'); // Costo variable unitario promedio

    // 2. Activos y Pasivos Financieros (CAPEX)
    const [assets, setAssets] = useState<Asset[]>([]);
    const [liabilities, setLiabilities] = useState<Liability[]>([]);

    // Modales de Activos / Pasivos
    const [assetName, setAssetName] = useState('');
    const [assetValue, setAssetValue] = useState('');
    const [assetLifeMonths, setAssetLifeMonths] = useState('60');

    const [creditorName, setCreditorName] = useState('');
    const [totalDebt, setTotalDebt] = useState('');
    const [monthlyPayment, setMonthlyPayment] = useState('');

    // 3. Insights de Crecimiento con Datos Reales
    const [growthInsights, setGrowthInsights] = useState<GrowthInsights | null>(null);

    // 4. Fijación de Precios
    const [bomCost, setBomCost] = useState<string>('12000');
    const [desiredMargin, setDesiredMargin] = useState<string>('60');

    // 5. Cuestionario Jurídico
    const [annualRevenue, setAnnualRevenue] = useState<string>('50000000');
    const [hasPartners, setHasPartners] = useState<boolean>(false);
    const [protectPersonalAssets, setProtectPersonalAssets] = useState<boolean>(true);

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            const [assRes, liabRes, growRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/financial-planning/assets`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/financial-planning/liabilities`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/financial-planning/growth-insights`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const assData = await assRes.json();
            const liabData = await liabRes.json();
            const growData = await growRes.json();

            if (assData.success) setAssets(assData.assets || []);
            if (liabData.success) setLiabilities(liabData.liabilities || []);
            if (growData.success) {
                setGrowthInsights(growData.insights);
                if (growData.insights?.real_avg_ticket > 0) {
                    setAverageTicket(growData.insights.real_avg_ticket.toString());
                }
            }
        } catch (err) {
            console.error("Error loading financial planning data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Cálculos de Activos y Pasivos Totales
    const totalAssetValue = assets.reduce((sum, a) => sum + Number(a.asset_value), 0);
    const totalMonthlyDepreciation = assets.reduce((sum, a) => sum + (Number(a.asset_value) / (Number(a.useful_life_months) || 60)), 0);

    const totalDebtValue = liabilities.reduce((sum, l) => sum + Number(l.total_debt), 0);
    const totalMonthlyLiabilityPayments = liabilities.reduce((sum, l) => sum + Number(l.monthly_payment), 0);

    // Costos Fijos Operativos + Servicio a la Deuda + Depreciación
    const fixedCostsNum = parseFloat(fixedCosts) || 0;
    const totalFixedCostsInclusive = fixedCostsNum + totalMonthlyDepreciation + totalMonthlyLiabilityPayments;

    const ticketNum = parseFloat(averageTicket) || 0;
    const unitCostNum = parseFloat(costPerUnit) || 0;

    const marginPerUnit = ticketNum - unitCostNum;
    const marginPercentage = ticketNum > 0 ? (marginPerUnit / ticketNum) * 100 : 0;

    const breakEvenUnits = marginPerUnit > 0 ? Math.ceil(totalFixedCostsInclusive / marginPerUnit) : 0;
    const breakEvenRevenue = breakEvenUnits * ticketNum;

    // Pricing
    const bomNum = parseFloat(bomCost) || 0;
    const marginNum = parseFloat(desiredMargin) || 0;
    const calculatedPrice = marginNum < 100 ? bomNum / (1 - marginNum / 100) : 0;
    const grossProfit = calculatedPrice - bomNum;

    // Métodos para guardar Activos y Pasivos
    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetName || !assetValue) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/financial-planning/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: assetName,
                    asset_type: 'equipo',
                    asset_value: parseFloat(assetValue),
                    useful_life_months: parseInt(assetLifeMonths) || 60
                })
            });
            const data = await res.json();
            if (data.success) {
                setAssetName('');
                setAssetValue('');
                fetchData();
            }
        } catch (err) {
            console.error("Error adding asset:", err);
        }
    };

    const handleAddLiability = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!creditorName || !monthlyPayment) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/financial-planning/liabilities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    creditor_name: creditorName,
                    liability_type: 'bancario',
                    total_debt: parseFloat(totalDebt) || 0,
                    monthly_payment: parseFloat(monthlyPayment)
                })
            });
            const data = await res.json();
            if (data.success) {
                setCreditorName('');
                setTotalDebt('');
                setMonthlyPayment('');
                fetchData();
            }
        } catch (err) {
            console.error("Error adding liability:", err);
        }
    };

    const handleDeleteAsset = async (id: string) => {
        await fetch(`/api/clients/${clientId}/financial-planning/assets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchData();
    };

    const handleDeleteLiability = async (id: string) => {
        await fetch(`/api/clients/${clientId}/financial-planning/liabilities/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchData();
    };

    // Recomendación Jurídica
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
                        <p className="text-xs text-on-surface-variant">Herramientas estratégicas de pricing, punto de equilibrio integral, activos/pasivos y crecimiento</p>
                    </div>
                </div>

                {/* Sub-navegación por Pestañas */}
                <div className="flex flex-wrap gap-1 bg-surface/60 p-1.5 rounded-2xl border border-outline/10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('proyecciones')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'proyecciones' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">calculate</span>
                        Punto de Equilibrio
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('activos_pasivos')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'activos_pasivos' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">account_balance</span>
                        Activos & Pasivos (CAPEX)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('pricing')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'pricing' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">sell</span>
                        Calculadora Precios
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('juridico')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'juridico' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                        Estructura Jurídica
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('crecimiento')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'crecimiento' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                        Plan Crecimiento
                    </button>
                </div>
            </div>

            {/* Pestaña 1: Punto de Equilibrio Integral */}
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
                                <label className="font-bold text-on-surface-variant">Costos Fijos Operativos Mensuales ($ COP)</label>
                                <span className="text-[10px] text-on-surface-variant/70 block">Arriendo, nómina fija, servicios, software</span>
                                <input
                                    type="number"
                                    value={fixedCosts}
                                    onChange={(e) => setFixedCosts(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary"
                                />
                            </div>

                            {/* Desglose de Deudas y Depreciaciones */}
                            <div className="bg-surface/50 p-3 rounded-2xl border border-outline/10 space-y-1.5">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-on-surface-variant">+ Servicio a Deudas (Pasivos):</span>
                                    <strong className="text-rose-400">+${totalMonthlyLiabilityPayments.toLocaleString()} COP/mes</strong>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-on-surface-variant">+ Depreciación Activos:</span>
                                    <strong className="text-amber-400">+${Math.round(totalMonthlyDepreciation).toLocaleString()} COP/mes</strong>
                                </div>
                                <div className="border-t border-outline/10 pt-1.5 flex justify-between font-bold text-xs">
                                    <span className="text-on-surface">Costo Fijo Total Real:</span>
                                    <span className="text-primary font-black">${Math.round(totalFixedCostsInclusive).toLocaleString()} COP</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Precio Promedio de Venta por Unidad ($ COP)</label>
                                <input
                                    type="number"
                                    value={averageTicket}
                                    onChange={(e) => setAverageTicket(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary text-primary"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-on-surface-variant">Costo Variable Promedio por Unidad ($ COP)</label>
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
                                <span className="text-[10px] text-on-surface-variant/80">Incluye pago de deudas y amortización</span>
                            </div>

                            <div className="bg-surface-container/40 border border-outline/10 p-5 rounded-3xl space-y-2">
                                <span className="text-[11px] text-on-surface-variant font-bold block">Facturación Mínima Real</span>
                                <strong className="text-2xl font-black text-emerald-400 block">${breakEvenRevenue.toLocaleString()} COP</strong>
                                <span className="text-[10px] text-on-surface-variant/80">Monto mensual para no tener iliquidez</span>
                            </div>

                            <div className="bg-surface-container/40 border border-outline/10 p-5 rounded-3xl space-y-2">
                                <span className="text-[11px] text-on-surface-variant font-bold block">Margen de Contribución</span>
                                <strong className="text-2xl font-black text-amber-400 block">{marginPercentage.toFixed(1)}%</strong>
                                <span className="text-[10px] text-on-surface-variant/80">Margen neto de cada venta</span>
                            </div>
                        </div>

                        {/* Proyección Diaria */}
                        <div className="bg-surface/40 border border-outline/10 p-5 rounded-3xl space-y-3">
                            <h4 className="text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">today</span>
                                Meta Operativa Diaria Real (26 días al mes):
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

            {/* Pestaña 2: Registro de Activos & Pasivos (CAPEX) */}
            {activeTab === 'activos_pasivos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {/* Sección Activos Fijos */}
                    <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">kitchen</span>
                                Activos Fijos & Maquinaria (Inversión CAPEX)
                            </h3>
                            <span className="text-xs font-black text-emerald-400">${totalAssetValue.toLocaleString()} COP</span>
                        </div>

                        <form onSubmit={handleAddAsset} className="space-y-3 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Nombre (Ej: Horno Industrial)"
                                    value={assetName}
                                    onChange={(e) => setAssetName(e.target.value)}
                                    className="col-span-2 bg-surface border border-outline/20 rounded-xl p-2 text-on-surface"
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Valor ($)"
                                    value={assetValue}
                                    onChange={(e) => setAssetValue(e.target.value)}
                                    className="bg-surface border border-outline/20 rounded-xl p-2 text-on-surface"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant font-bold">Vida Útil Estimada (Meses):</label>
                                <input
                                    type="number"
                                    placeholder="60"
                                    value={assetLifeMonths}
                                    onChange={(e) => setAssetLifeMonths(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-on-surface"
                                />
                            </div>
                            <button type="submit" className="w-full py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90">
                                + Agregar Activo
                            </button>
                        </form>

                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {assets.map(a => (
                                <div key={a.id} className="flex items-center justify-between bg-surface/50 p-2.5 rounded-xl border border-outline/5 text-xs">
                                    <div>
                                        <span className="font-bold text-on-surface block">{a.name}</span>
                                        <span className="text-[10px] text-on-surface-variant">Depreciación: ${Math.round(Number(a.asset_value) / 60).toLocaleString()}/mes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <strong className="text-primary font-bold">${Number(a.asset_value).toLocaleString()}</strong>
                                        <button type="button" onClick={() => handleDeleteAsset(a.id)} className="text-rose-400 hover:text-rose-300">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sección Pasivos & Deudas */}
                    <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-400">credit_score</span>
                                Pasivos, Deudas & Créditos Financieros
                            </h3>
                            <span className="text-xs font-black text-rose-400">${totalDebtValue.toLocaleString()} COP</span>
                        </div>

                        <form onSubmit={handleAddLiability} className="space-y-3 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Acreedor (Ej: Banco / Crédito)"
                                    value={creditorName}
                                    onChange={(e) => setCreditorName(e.target.value)}
                                    className="col-span-2 bg-surface border border-outline/20 rounded-xl p-2 text-on-surface"
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Deuda Total ($)"
                                    value={totalDebt}
                                    onChange={(e) => setTotalDebt(e.target.value)}
                                    className="bg-surface border border-outline/20 rounded-xl p-2 text-on-surface"
                                />
                            </div>
                            <input
                                type="number"
                                placeholder="Cuota Mensual a Pagar ($ COP)"
                                value={monthlyPayment}
                                onChange={(e) => setMonthlyPayment(e.target.value)}
                                className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-on-surface font-bold text-rose-400"
                                required
                            />
                            <button type="submit" className="w-full py-2 bg-surface-variant text-on-surface font-bold text-xs rounded-xl hover:bg-surface-variant/80">
                                + Agregar Deuda / Pasivo
                            </button>
                        </form>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {liabilities.map(l => (
                                <div key={l.id} className="flex items-center justify-between bg-surface/50 p-2.5 rounded-xl border border-outline/5 text-xs">
                                    <div>
                                        <span className="font-bold text-on-surface block">{l.creditor_name}</span>
                                        <span className="text-[10px] text-rose-400">Cuota: ${Number(l.monthly_payment).toLocaleString()}/mes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <strong className="text-on-surface font-bold">${Number(l.total_debt).toLocaleString()}</strong>
                                        <button type="button" onClick={() => handleDeleteLiability(l.id)} className="text-rose-400 hover:text-rose-300">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pestaña 3: Calculadora de Precios (Pricing) */}
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

            {/* Pestaña 4: Asesor Jurídico & Tributario */}
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
                                        No (Unipersonal)
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
                                        Sí (Blindar)
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

            {/* Pestaña 5: Plan de Crecimiento Inteligente Basado en Datos Reales */}
            {activeTab === 'crecimiento' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-3xl text-xs text-emerald-300 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[28px]">insights</span>
                        <div>
                            <strong className="font-bold text-emerald-200 block text-sm">Plan de Crecimiento Personalizado con Datos Reales de tu Tienda:</strong>
                            <span>Este plan se calcula en tiempo real analizando tus facturas, tu ticket promedio actual y tu catálogo de productos.</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        {/* 1. Estrategia de Ticket Promedio Real */}
                        <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
                                    <span className="material-symbols-outlined text-[24px]">trending_up</span>
                                </div>
                                <h4 className="font-extrabold text-on-surface text-sm">1. Elevar Ticket Promedio Actual</h4>
                                <div className="bg-surface p-3 rounded-2xl border border-outline/5 space-y-1">
                                    <span className="text-[10px] text-on-surface-variant block">Ticket Promedio Real de Facturas:</span>
                                    <strong className="text-base font-black text-primary">
                                        ${growthInsights?.real_avg_ticket ? growthInsights.real_avg_ticket.toLocaleString() : '28.000'} COP
                                    </strong>
                                </div>
                                <p className="text-on-surface-variant text-[11px]">
                                    <strong>Acción Práctica:</strong> Al tomar pedidos en caja o comandero, sugiere añadir un acompañante o bebida especial para elevar el ticket objetivo a{' '}
                                    <strong className="text-emerald-400">${growthInsights?.target_suggested_ticket ? growthInsights.target_suggested_ticket.toLocaleString() : '33.600'} COP (+20%)</strong>.
                                </p>
                            </div>
                        </div>

                        {/* 2. Optimización para el Día Lento Real */}
                        <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl w-fit">
                                    <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                                </div>
                                <h4 className="font-extrabold text-on-surface text-sm">2. Campaña para el Día Menos Válido</h4>
                                <div className="bg-surface p-3 rounded-2xl border border-outline/5 space-y-1">
                                    <span className="text-[10px] text-on-surface-variant block">Día Histórico con Menores Ventas:</span>
                                    <strong className="text-base font-black text-purple-400">
                                        {growthInsights?.lowest_sales_day || 'Martes'}
                                    </strong>
                                </div>
                                <p className="text-on-surface-variant text-[11px]">
                                    <strong>Acción Práctica:</strong> Programa un mensaje masivo por WhatsApp todos los <strong>{growthInsights?.lowest_sales_day || 'Martes'}</strong> proponiendo 2x1 o postre gratis para reactivar el flujo de clientes.
                                </p>
                            </div>
                        </div>

                        {/* 3. Combo con Producto Estrella Real */}
                        <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl w-fit">
                                    <span className="material-symbols-outlined text-[24px]">star</span>
                                </div>
                                <h4 className="font-extrabold text-on-surface text-sm">3. Impulso a Producto Estrella</h4>
                                <div className="bg-surface p-3 rounded-2xl border border-outline/5 space-y-1">
                                    <span className="text-[10px] text-on-surface-variant block">Producto con Mayor Facturación:</span>
                                    <strong className="text-base font-black text-sky-400">
                                        {growthInsights?.top_product_name || 'Plato Principal'}
                                    </strong>
                                </div>
                                <p className="text-on-surface-variant text-[11px]">
                                    <strong>Acción Práctica:</strong> Diseña un paquete "Combo Ejecutivo" emparejando <strong>{growthInsights?.top_product_name || 'tu plato principal'}</strong> con entradas de alto margen neto.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
