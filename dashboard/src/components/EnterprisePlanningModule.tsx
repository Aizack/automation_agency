import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface InvestmentItem {
  id: string;
  category: string;
  concept: string;
  amount: string;
  notes?: string;
  created_at: string;
}

interface LoanItem {
  id: string;
  bank_name: string;
  loan_amount: string;
  monthly_interest_rate: string;
  term_months: number;
  monthly_installment_amount: string;
  notes?: string;
  created_at: string;
}

interface FinancialModelData {
  payroll: {
    basePayroll: number;
    socialBenefitsRate: number;
    totalPayrollCost: number;
  };
  fixedExpenses: {
    totalFixedExpenses: number;
  };
  investments: {
    list: InvestmentItem[];
    totalInitialInvestment: number;
  };
  loans: {
    list: LoanItem[];
    totalMonthlyDebtService: number;
  };
  metrics: {
    avgMarginRatio: number;
    totalOperationalFixedCosts: number;
    breakEvenAccounting: number;
    breakEvenFinancialReal: number;
  };
}

interface EnterprisePlanningModuleProps {
  clientId: string;
}

export const EnterprisePlanningModule: React.FC<EnterprisePlanningModuleProps> = ({ clientId }) => {
  const [activeTab, setActiveTab] = useState<'financiero_real' | 'inversion_deuda' | 'pricing' | 'juridico' | 'legal_hub'>('financiero_real');
  const [finModel, setFinModel] = useState<FinancialModelData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Formulario Inversión Inicial (CAPEX)
  const [invCategory, setInvCategory] = useState<string>('adecuacion');
  const [invConcept, setInvConcept] = useState<string>('');
  const [invAmount, setInvAmount] = useState<string>('');
  const [invNotes, setInvNotes] = useState<string>('');
  const [savingInv, setSavingInv] = useState<boolean>(false);

  // Formulario Préstamo Bancario
  const [bankName, setBankName] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('1.5');
  const [termMonths, setTermMonths] = useState<string>('36');
  const [loanNotes, setLoanNotes] = useState<string>('');
  const [savingLoan, setSavingLoan] = useState<boolean>(false);

  // Calculadora de Precios
  const [bomCost, setBomCost] = useState<string>('15000');
  const [desiredMargin, setDesiredMargin] = useState<string>('50');

  // Hub Legal & Transparencia IA
  const [businessLegalName, setBusinessLegalName] = useState<string>('Óptica & Servicios S.A.S.');
  const [businessNit, setBusinessNit] = useState<string>('901.456.789-1');
  const [businessDomain, setBusinessDomain] = useState<string>('opticaservicios.com');
  const [activeLegalDocTab, setActiveLegalDocTab] = useState<'terminos' | 'ai_transparency' | 'privacidad'>('terminos');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const fetchFinancialModel = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/planning/financial-model`);
      const json = await res.json();
      if (json.success) {
        setFinModel(json.data);
      }
    } catch (err) {
      console.error("Error al cargar modelo financiero:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialModel();
  }, [clientId]);

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invConcept || !invAmount) return;
    try {
      setSavingInv(true);
      const res = await fetch(`/api/clients/${clientId}/planning/initial-investment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: invCategory,
          concept: invConcept,
          amount: parseFloat(invAmount),
          notes: invNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        setInvConcept('');
        setInvAmount('');
        setInvNotes('');
        fetchFinancialModel();
      } else {
        alert(json.error || 'Error guardando inversión inicial.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSavingInv(false);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm('¿Deseas eliminar este ítem de inversión inicial?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/planning/initial-investment/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchFinancialModel();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !loanAmount || !termMonths) return;
    try {
      setSavingLoan(true);
      const res = await fetch(`/api/clients/${clientId}/planning/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_name: bankName,
          loan_amount: parseFloat(loanAmount),
          monthly_interest_rate: parseFloat(interestRate || '1.5'),
          term_months: parseInt(termMonths || '36'),
          notes: loanNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        setBankName('');
        setLoanAmount('');
        setLoanNotes('');
        fetchFinancialModel();
      } else {
        alert(json.error || 'Error guardando crédito.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSavingLoan(false);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('¿Deseas eliminar este préstamo bancario?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/planning/loans/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchFinancialModel();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(amount);
  };

  // Cálculos de Pricing
  const bomNum = parseFloat(bomCost) || 0;
  const marginNum = parseFloat(desiredMargin) || 0;
  const calculatedPrice = marginNum < 100 ? bomNum / (1 - marginNum / 100) : 0;
  const grossProfit = calculatedPrice - bomNum;

  // Métricas financieras
  const payrollTotal = finModel?.payroll?.totalPayrollCost || 0;
  const fixedExpensesTotal = finModel?.fixedExpenses?.totalFixedExpenses || 0;
  const totalOpFixed = finModel?.metrics?.totalOperationalFixedCosts || 0;
  const totalDebtService = finModel?.loans?.totalMonthlyDebtService || 0;
  const breakEvenAccounting = finModel?.metrics?.breakEvenAccounting || 0;
  const breakEvenReal = finModel?.metrics?.breakEvenFinancialReal || 0;
  const totalInitialInvestment = finModel?.investments?.totalInitialInvestment || 0;
  const avgMarginPct = Math.round((finModel?.metrics?.avgMarginRatio || 0.40) * 100);

  // Estimación de Payback en meses
  const estimatedMonthlyFreeCash = Math.max(0, (breakEvenReal * 1.2) - (totalOpFixed + totalDebtService));
  const paybackMonths = estimatedMonthlyFreeCash > 0 ? Math.ceil(totalInitialInvestment / estimatedMonthlyFreeCash) : 0;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal & Sub-Navegación */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container/40 p-5 rounded-3xl border border-outline/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
            <span className="material-symbols-outlined text-[28px]">query_stats</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Módulo de Finanzas & Planeación Empresarial de Élite</h2>
            <p className="text-xs text-on-surface-variant">
              Modelo financiero sin redundancia: Nómina (+ Prestaciones) + Gastos Fijos + Deuda + Punto de Equilibrio REAL.
            </p>
          </div>
        </div>

        {/* Sub-navegación por Pestañas */}
        <div className="flex flex-wrap gap-1 bg-surface/60 p-1.5 rounded-2xl border border-outline/10">
          <button
            type="button"
            onClick={() => setActiveTab('financiero_real')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'financiero_real' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            Punto de Equilibrio REAL
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inversion_deuda')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'inversion_deuda' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            Inversión (CAPEX) & Deuda
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pricing' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">sell</span>
            Calculadora de Precios
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('legal_hub')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'legal_hub' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">balance</span>
            Legales & Transparencia IA
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* TAB 1: PUNTO DE EQUILIBRIO REAL & COCKPIT FINANCIERO */}
          {activeTab === 'financiero_real' && (
            <div className="space-y-6 animate-fade-in">
              {/* Tarjetas de Cruce Automático de Módulos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                      <span>Nómina Total (Empleados)</span>
                      <span className="text-primary">+49.5% Ley</span>
                    </div>
                    <p className="text-xl font-black text-on-surface mt-1">{formatCOP(payrollTotal)}</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2 border-t border-outline/5 pt-1.5">
                    Salarios Base: {formatCOP(finModel?.payroll?.basePayroll || 0)} + Carga prestacional
                  </p>
                </div>

                <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Gastos Fijos (Contabilidad)</span>
                    <p className="text-xl font-black text-amber-400 mt-1">{formatCOP(fixedExpensesTotal)}</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2 border-t border-outline/5 pt-1.5">
                    Arriendo, Servicios Públicos, Mantenimiento
                  </p>
                </div>

                <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Servicio a Deuda Bancaria</span>
                    <p className="text-xl font-black text-rose-400 mt-1">{formatCOP(totalDebtService)}</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2 border-t border-outline/5 pt-1.5">
                    Cuotas mensuales amortizadas de préstamos
                  </p>
                </div>

                <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Margen Promedio Real</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">{avgMarginPct}%</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2 border-t border-outline/5 pt-1.5">
                    Calculado automáticamente de tu Inventario
                  </p>
                </div>
              </div>

              {/* Cockpit Principal de Equilibrio REAL */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Comparación Contable vs Financiero Real */}
                <div className="lg:col-span-8 bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-6">
                  <div className="flex justify-between items-center border-b border-outline/10 pb-3">
                    <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">scale</span>
                      Análisis de Solvencia & Punto de Equilibrio
                    </h3>
                    <span className="text-xs font-mono font-bold text-primary">Costo Operativo Fijo: {formatCOP(totalOpFixed)}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Equilibrio Contable */}
                    <div className="bg-surface-container/60 border border-outline/20 p-5 rounded-2xl space-y-2">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Punto de Equilibrio Contable</span>
                      <p className="text-2xl font-black text-on-surface">{formatCOP(breakEvenAccounting)}</p>
                      <p className="text-xs text-on-surface-variant">
                        Facturación mensual mínima para cubrir únicamente salarios (+ prestaciones) y gastos fijos operativos.
                      </p>
                      <div className="pt-2 text-xs font-mono font-bold text-on-surface">
                        Meta Diaria (26 días): {formatCOP(breakEvenAccounting / 26)} / día
                      </div>
                    </div>

                    {/* Equilibrio Financiero REAL (Caja Real con Deuda) */}
                    <div className="bg-primary/10 border border-primary/30 p-5 rounded-2xl space-y-2 relative overflow-hidden">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Punto de Equilibrio Financiero REAL (Con Banco)
                      </span>
                      <p className="text-2xl font-black text-primary">{formatCOP(breakEvenReal)}</p>
                      <p className="text-xs text-on-surface-variant">
                        Facturación mensual requerida para no caer en iliquidez, cubriendo nómina, fijos Y la cuota del banco.
                      </p>
                      <div className="pt-2 text-xs font-mono font-bold text-primary">
                        Meta Diaria Real (26 días): {formatCOP(breakEvenReal / 26)} / día
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Retorno de Inversión (Payback ROI) */}
                  <div className="bg-surface/60 border border-outline/10 p-5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-[18px]">history_edu</span>
                        Retorno de Inversión Inicial (Payback ROI)
                      </h4>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        Inversión Inicial: {formatCOP(totalInitialInvestment)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="text-on-surface-variant">
                          Con el volumen de ventas proyectado a superar el punto de equilibrio real:
                        </p>
                        <p className="text-sm font-bold text-on-surface mt-1">
                          Tiempo estimado de recuperación total: <strong className="text-primary">{paybackMonths > 0 ? `${paybackMonths} meses` : 'Definir inversión inicial'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Desglose de Gastos Fijos vs Nómina */}
                <div className="lg:col-span-4 bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                  <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">pie_chart</span>
                    Estructura de Gastos Fijos
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-3 bg-surface-container/50 rounded-xl border border-outline/10">
                      <span className="text-on-surface-variant font-bold">Nómina + Carga Social</span>
                      <span className="font-mono font-bold text-on-surface">{formatCOP(payrollTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-surface-container/50 rounded-xl border border-outline/10">
                      <span className="text-on-surface-variant font-bold">Gastos Fijos Contabilidad</span>
                      <span className="font-mono font-bold text-amber-400">{formatCOP(fixedExpensesTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-surface-container/50 rounded-xl border border-outline/10">
                      <span className="text-on-surface-variant font-bold">Servicio a la Deuda</span>
                      <span className="font-mono font-bold text-rose-400">{formatCOP(totalDebtService)}</span>
                    </div>

                    <div className="border-t border-outline/10 pt-3 flex justify-between items-center font-bold text-sm">
                      <span className="text-on-surface">Total Salidas de Caja:</span>
                      <span className="text-primary font-mono">{formatCOP(totalOpFixed + totalDebtService)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVERSIÓN INICIAL (CAPEX) & DEUDA BANCARIA */}
          {activeTab === 'inversion_deuda' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              {/* Sección Inversión Inicial (CAPEX) */}
              <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-outline/10 pb-3">
                  <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">construction</span>
                    Inversión Inicial de Montaje (CAPEX)
                  </h3>
                  <span className="text-xs font-mono font-bold text-primary">{formatCOP(totalInitialInvestment)}</span>
                </div>

                <form onSubmit={handleAddInvestment} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-on-surface-variant">Categoría</label>
                      <select
                        value={invCategory}
                        onChange={(e) => setInvCategory(e.target.value)}
                        className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                      >
                        <option value="adecuacion">Adecuación Local / Obras</option>
                        <option value="mobiliario">Mobiliario y Vitrinas</option>
                        <option value="maquinaria">Maquinaria y Equipos</option>
                        <option value="inventario_inicial">Inventario Inicial Apertura</option>
                        <option value="licencias">Licencias / Trámites</option>
                        <option value="reserva_caja">Reserva de Caja Inicial</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-on-surface-variant">Monto ($ COP)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="5000000"
                        value={invAmount}
                        onChange={(e) => setInvAmount(e.target.value)}
                        className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-on-surface-variant">Concepto / Detalle</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Pintura local, avisos exteriores, autorefractómetro"
                      value={invConcept}
                      onChange={(e) => setInvConcept(e.target.value)}
                      className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingInv}
                    className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl cursor-pointer hover:opacity-90 transition shadow"
                  >
                    {savingInv ? 'Guardando...' : '+ Agregar Ítem de Inversión'}
                  </button>
                </form>

                {/* Lista de Inversión Inicial */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {finModel?.investments?.list.length === 0 ? (
                    <p className="text-xs text-on-surface-variant opacity-60 text-center py-6 italic">No hay ítems de inversión registrados.</p>
                  ) : (
                    finModel?.investments?.list.map((inv) => (
                      <div key={inv.id} className="bg-surface-container/50 border border-outline/20 p-3 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                            {inv.category}
                          </span>
                          <p className="font-bold text-on-surface mt-1">{inv.concept}</p>
                          <p className="font-mono text-primary font-bold">{formatCOP(parseFloat(inv.amount))}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvestment(inv.id)}
                          className="text-on-surface-variant hover:text-red-400 p-1.5 rounded-lg transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sección Préstamos Bancarios & Deuda */}
              <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-outline/10 pb-3">
                  <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-400 text-[18px]">account_balance</span>
                    Estructura de Deuda & Préstamos Bancarios
                  </h3>
                  <span className="text-xs font-mono font-bold text-rose-400">Cuota Mensual: {formatCOP(totalDebtService)}</span>
                </div>

                <form onSubmit={handleAddLoan} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-on-surface-variant">Banco / Entidad Financiera</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Bancolombia, Davivienda, Crédito Libre Inversión"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-on-surface-variant">Monto ($ COP)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="20000000"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface font-mono outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-on-surface-variant">Tasa % E.M.</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="1.5"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface font-mono outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-on-surface-variant">Plazo (Meses)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="36"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                        className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface font-mono outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingLoan}
                    className="w-full py-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl cursor-pointer hover:bg-rose-500/30 transition shadow"
                  >
                    {savingLoan ? 'Guardando...' : '+ Registrar Crédito Bancario'}
                  </button>
                </form>

                {/* Lista de Préstamos */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {finModel?.loans?.list.length === 0 ? (
                    <p className="text-xs text-on-surface-variant opacity-60 text-center py-6 italic">No hay créditos bancarios registrados.</p>
                  ) : (
                    finModel?.loans?.list.map((loan) => (
                      <div key={loan.id} className="bg-surface-container/50 border border-outline/20 p-3 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <h4 className="font-bold text-sm text-on-surface">{loan.bank_name}</h4>
                          <p className="text-on-surface-variant text-[11px]">
                            Monto: {formatCOP(parseFloat(loan.loan_amount))} | {loan.term_months} meses @ {loan.monthly_interest_rate}% E.M.
                          </p>
                          <p className="font-mono text-rose-400 font-bold mt-0.5">
                            Cuota Mensual: {formatCOP(parseFloat(loan.monthly_installment_amount))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="text-on-surface-variant hover:text-red-400 p-1.5 rounded-lg transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING */}
          {activeTab === 'pricing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">sell</span>
                  Calculadora de Precios basada en Margen Objetivo
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Costo Insumo / Adquisición del Producto ($ COP)</label>
                    <input
                      type="number"
                      value={bomCost}
                      onChange={(e) => setBomCost(e.target.value)}
                      className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Margen de Ganancia Bruta Deseada (%)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="20"
                        max="85"
                        value={desiredMargin}
                        onChange={(e) => setDesiredMargin(e.target.value)}
                        className="flex-grow accent-primary cursor-pointer"
                      />
                      <span className="font-black text-primary text-sm min-w-[50px]">{desiredMargin}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container/40 border border-outline/10 p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-on-surface-variant block uppercase tracking-wider">Precio de Venta Sugerido (PVP):</span>
                  <strong className="text-3xl font-black text-primary block mt-1">{formatCOP(calculatedPrice)}</strong>
                  <p className="text-xs text-on-surface-variant/80 mt-2">
                    Para obtener un margen del <strong>{desiredMargin}%</strong> sobre un costo de {formatCOP(bomNum)}, este debe ser el precio público.
                  </p>
                </div>

                <div className="bg-surface p-4 rounded-2xl border border-outline/5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Costo Producto:</span>
                    <span className="font-bold text-on-surface">{formatCOP(bomNum)}</span>
                  </div>
                  <div className="flex justify-between border-t border-outline/10 pt-2">
                    <span className="text-on-surface-variant">Ganancia Bruta por Unidad:</span>
                    <span className="font-bold text-emerald-400">+{formatCOP(grossProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEGAL HUB */}
          {activeTab === 'legal_hub' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-purple-500/10 border border-purple-500/30 p-5 rounded-3xl text-xs text-purple-300 flex items-center justify-between gap-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl">
                    <span className="material-symbols-outlined text-[28px]">balance</span>
                  </div>
                  <div>
                    <strong className="font-bold text-purple-200 block text-sm">Hub de Protección Legal, Transparencia IA & Términos a la Medida</strong>
                    <span>Genera de forma automática los documentos legales de tu empresa para la web y facturación.</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-3xl space-y-4 text-xs">
                  <h3 className="font-extrabold text-on-surface text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">badge</span>
                    Datos del Negocio
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant">Razón Social / Nombre Legal *</label>
                      <input
                        type="text"
                        value={businessLegalName}
                        onChange={(e) => setBusinessLegalName(e.target.value)}
                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-on-surface font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant">NIT / Documento Fiscal *</label>
                      <input
                        type="text"
                        value={businessNit}
                        onChange={(e) => setBusinessNit(e.target.value)}
                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-on-surface font-mono outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant">Dominio / Sitio Web Oficial</label>
                      <input
                        type="text"
                        value={businessDomain}
                        onChange={(e) => setBusinessDomain(e.target.value)}
                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-surface-container/40 border border-outline/10 p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 border-b border-outline/10 pb-3">
                      <button
                        type="button"
                        onClick={() => setActiveLegalDocTab('terminos')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeLegalDocTab === 'terminos' ? 'bg-primary text-on-primary' : 'bg-surface/60 text-on-surface-variant hover:text-on-surface'}`}
                      >
                        📄 Términos y Condiciones
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLegalDocTab('ai_transparency')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeLegalDocTab === 'ai_transparency' ? 'bg-purple-500 text-white' : 'bg-surface/60 text-on-surface-variant hover:text-on-surface'}`}
                      >
                        🤖 Declaración de IA
                      </button>
                    </div>

                    <div className="bg-surface/80 border border-outline/10 p-4 rounded-2xl max-h-[300px] overflow-y-auto font-mono text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                      {activeLegalDocTab === 'terminos' && `TÉRMINOS Y CONDICIONES DE SERVICIO
Razón Social: ${businessLegalName}
NIT / Registro: ${businessNit}
Dominio / Sitio Web: ${businessDomain}

1. OBJETO Y ACEPTACIÓN
El presente contrato regula la prestación de servicios comerciales por parte de ${businessLegalName}. Al acceder a nuestras plataformas y canal de ventas, el cliente acepta expresamente los presentes Términos de Servicio.

Fecha de actualización: ${new Date().toLocaleDateString()}`}

                      {activeLegalDocTab === 'ai_transparency' && `🤖 AVISO LEGAL DE TRANSPARENCIA EN INTELIGENCIA ARTIFICIAL

Informamos a nuestros usuarios que ${businessLegalName} (NIT ${businessNit}) utiliza tecnología de Inteligencia Artificial para la atención conversacional en WhatsApp y optimización de procesos administrativos.`}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-outline/10 flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant">
                      {copySuccess ? `✅ ${copySuccess}` : 'Copia el texto legal para tu sitio web.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`TÉRMINOS Y CONDICIONES DE SERVICIO\n${businessLegalName} | NIT ${businessNit}`);
                        setCopySuccess('Copiado al portapapeles');
                        setTimeout(() => setCopySuccess(null), 3000);
                      }}
                      className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 transition flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      Copiar Documento Legal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
