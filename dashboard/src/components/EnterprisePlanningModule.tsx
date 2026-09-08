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
  const [activeTab, setActiveTab] = useState<'financiero_real' | 'inversion_deuda' | 'pricing' | 'legal_hub'>('financiero_real');
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

  // Calculadora de Precios & Ganancia Deseada por el Dueño
  const [bomCost, setBomCost] = useState<string>('15000');
  const [desiredMargin, setDesiredMargin] = useState<string>('50');
  const [desiredProfit, setDesiredProfit] = useState<string>('2000000');

  // Hub Legal & Transparencia IA
  const [businessLegalName, setBusinessLegalName] = useState<string>('Óptica & Servicios S.A.S.');
  const [businessNit, setBusinessNit] = useState<string>('901.456.789-1');
  const [businessDomain, setBusinessDomain] = useState<string>('opticaservicios.com');
  const [activeLegalDocTab, setActiveLegalDocTab] = useState<'terminos' | 'ai_transparency'>('terminos');
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
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Encabezado Principal Wabi-Sabi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            ESTRATEGIA & FINANZAS
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
            Planeación Empresarial & Punto de Equilibrio
          </h2>
          <p className="text-xs text-[#76746E] mt-1.5">
            Modelo financiero integral: Nómina de ley (+49.5%), Gastos fijos operativos, Servicio a deuda CAPEX y Margen de solvencia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFinancialModel}
            className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-white border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Actualizar Modelo
          </button>
        </div>
      </div>

      {/* Sub-Navegación / Barra Zen de Pestañas */}
      <div className="bg-white border border-[#E2DFD7] p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('financiero_real')}
            className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
              activeTab === 'financiero_real'
                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            Equilibrio Real
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inversion_deuda')}
            className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
              activeTab === 'inversion_deuda'
                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            CAPEX & Deuda
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
              activeTab === 'pricing'
                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">sell</span>
            Precios & Margen
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('legal_hub')}
            className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
              activeTab === 'legal_hub'
                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">balance</span>
            Legal & IA
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[#76746E] pr-2">
          <span className="w-2 h-2 rounded-full bg-[#137333]"></span>
          <span>Modelo Activo</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2DFD7] rounded-none">
          <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando modelo de planeación...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: PUNTO DE EQUILIBRIO REAL & COCKPIT FINANCIERO */}
          {activeTab === 'financiero_real' && (
            <div className="space-y-6 animate-fade-in">
              {/* Tarjetas de Cruce Automático de Módulos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">
                      <span>Nómina Total</span>
                      <span className="text-[#D9381E] font-bold">+49.5% Ley</span>
                    </div>
                    <p className="text-2xl font-bold text-[#161616] font-mono mt-1">{formatCOP(payrollTotal)}</p>
                  </div>
                  <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                    Base: {formatCOP(finModel?.payroll?.basePayroll || 0)} + Prestaciones
                  </p>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Gastos Fijos Operativos</span>
                    <p className="text-2xl font-bold text-[#D9381E] font-mono mt-1">{formatCOP(fixedExpensesTotal)}</p>
                  </div>
                  <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                    Arriendos, Servicios y Mantenimiento
                  </p>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Servicio a Deuda Bancaria</span>
                    <p className="text-2xl font-bold text-[#C5221F] font-mono mt-1">{formatCOP(totalDebtService)}</p>
                  </div>
                  <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                    Cuotas mensuales amortizadas de créditos
                  </p>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Margen Promedio Real</span>
                    <p className="text-2xl font-bold text-[#137333] font-mono mt-1">{avgMarginPct}%</p>
                  </div>
                  <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                    Calculado del inventario activo
                  </p>
                </div>
              </div>

              {/* Cockpit Principal de Equilibrio REAL */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Comparación Contable vs Financiero Real */}
                <div className="lg:col-span-8 bg-white border border-[#E2DFD7] p-6 rounded-none space-y-6 shadow-xs">
                  <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                    <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#D9381E] text-[20px]">scale</span>
                      Análisis de Solvencia & Punto de Equilibrio
                    </h3>
                    <span className="text-xs font-mono font-bold text-[#76746E]">Costo Fijo Total: {formatCOP(totalOpFixed)}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Equilibrio Contable */}
                    <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-5 rounded-none space-y-2">
                      <span className="text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider block">
                        Punto de Equilibrio Contable
                      </span>
                      <p className="text-2xl font-bold text-[#161616] font-mono">{formatCOP(breakEvenAccounting)}</p>
                      <p className="text-xs text-[#76746E]">
                        Facturación mensual mínima para cubrir salarios (+ prestaciones) y gastos fijos operativos.
                      </p>
                      <div className="pt-2 text-xs font-mono font-bold text-[#161616] border-t border-[#E2DFD7]">
                        Meta Diaria (26 días): {formatCOP(breakEvenAccounting / 26)} / día
                      </div>
                    </div>

                    {/* Equilibrio Financiero REAL (Caja Real con Deuda) */}
                    <div className="bg-[#FAF8F5] border border-[#161616] p-5 rounded-none space-y-2">
                      <span className="text-[10px] font-mono font-bold text-[#D9381E] uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Equilibrio Financiero REAL (Con Deuda)
                      </span>
                      <p className="text-2xl font-bold text-[#D9381E] font-mono">{formatCOP(breakEvenReal)}</p>
                      <p className="text-xs text-[#76746E]">
                        Facturación mensual requerida para no caer en iliquidez, cubriendo nómina, fijos Y cuota bancaria.
                      </p>
                      <div className="pt-2 text-xs font-mono font-bold text-[#D9381E] border-t border-[#E2DFD7]">
                        Meta Diaria Mínima (26 días): {formatCOP(breakEvenReal / 26)} / día
                      </div>
                    </div>
                  </div>

                  {/* Simulador de Ganancia Neta Deseada por el Dueño */}
                  <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-5 rounded-none space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-mono font-bold text-xs text-[#161616] flex items-center gap-1.5 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[16px] text-[#D9381E]">payments</span>
                          Meta de Ganancia Neta Deseada
                        </h4>
                        <p className="text-xs text-[#76746E] mt-0.5">
                          Ingresa cuánto deseas ganarle neto al negocio este mes por encima del punto de equilibrio real.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-mono font-bold text-[#76746E] uppercase">Ganancia:</label>
                        <input
                          type="number"
                          value={desiredProfit}
                          onChange={(e) => setDesiredProfit(e.target.value)}
                          className="w-36 bg-white border border-[#E2DFD7] rounded-none p-2 text-xs font-mono font-bold text-[#161616] outline-none focus:border-[#161616]"
                          placeholder="2000000"
                        />
                      </div>
                    </div>

                    {(() => {
                      const desProfitNum = parseFloat(desiredProfit) || 0;
                      const mRatio = finModel?.metrics?.avgMarginRatio || 0.40;
                      const totalSuggestedTarget = breakEvenReal + (desProfitNum / mRatio);
                      const dailySuggestedTarget = totalSuggestedTarget / 26;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-[#E2DFD7] p-4 rounded-none shadow-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] text-[#76746E] font-mono uppercase font-bold tracking-wider">
                              Meta Oficial Mensual Sugerida
                            </span>
                            <p className="text-2xl font-bold text-[#137333] font-mono">{formatCOP(totalSuggestedTarget)}</p>
                            <p className="text-[10px] text-[#76746E] font-mono">
                              Equilibrio ({formatCOP(breakEvenReal)}) + Ganancia ({formatCOP(desProfitNum)})
                            </p>
                          </div>

                          <div className="space-y-1 border-t md:border-t-0 md:border-l border-[#E2DFD7] pt-2 md:pt-0 md:pl-4">
                            <span className="text-[10px] text-[#76746E] font-mono uppercase font-bold tracking-wider">
                              Facturación Diaria Requerida (26 días)
                            </span>
                            <p className="text-2xl font-bold text-[#161616] font-mono">{formatCOP(dailySuggestedTarget)} / día</p>
                            <p className="text-[10px] text-[#76746E]">
                              Venta diaria para alcanzar la utilidad neta esperada.
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Resumen de Retorno de Inversión (Payback ROI) */}
                  <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-mono font-bold text-xs text-[#161616] flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[#D9381E] text-[16px]">history_edu</span>
                        Retorno de Inversión Inicial (Payback ROI)
                      </h4>
                      <p className="text-xs text-[#76746E] mt-1">
                        Tiempo estimado de recuperación: <strong className="text-[#161616] font-mono">{paybackMonths > 0 ? `${paybackMonths} meses` : 'Definir inversión inicial'}</strong>
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#161616] bg-white px-3 py-1.5 border border-[#E2DFD7]">
                      Inversión Inicial: {formatCOP(totalInitialInvestment)}
                    </span>
                  </div>
                </div>

                {/* Sidebar Desglose de Gastos Fijos vs Nómina */}
                <div className="lg:col-span-4 bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
                  <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2 border-b border-[#E2DFD7] pb-3">
                    <span className="material-symbols-outlined text-[#D9381E] text-[20px]">pie_chart</span>
                    Estructura de Gastos Fijos
                  </h3>

                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex justify-between items-center p-3 bg-[#FAF8F5] border border-[#E2DFD7]">
                      <span className="text-[#76746E]">Nómina + Carga Social</span>
                      <span className="font-bold text-[#161616]">{formatCOP(payrollTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-[#FAF8F5] border border-[#E2DFD7]">
                      <span className="text-[#76746E]">Gastos Fijos Contabilidad</span>
                      <span className="font-bold text-[#B45309]">{formatCOP(fixedExpensesTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-[#FAF8F5] border border-[#E2DFD7]">
                      <span className="text-[#76746E]">Servicio a la Deuda</span>
                      <span className="font-bold text-[#C5221F]">{formatCOP(totalDebtService)}</span>
                    </div>

                    <div className="border-t border-[#E2DFD7] pt-3 flex justify-between items-center font-bold text-sm">
                      <span className="text-[#161616]">Total Salidas de Caja:</span>
                      <span className="text-[#D9381E] font-mono">{formatCOP(totalOpFixed + totalDebtService)}</span>
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
              <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                  <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#D9381E] text-[20px]">construction</span>
                    Inversión Inicial de Montaje (CAPEX)
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#161616]">{formatCOP(totalInitialInvestment)}</span>
                </div>

                <form onSubmit={handleAddInvestment} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Categoría</label>
                      <select
                        value={invCategory}
                        onChange={(e) => setInvCategory(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none font-mono"
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
                      <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Monto ($ COP)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="5000000"
                        value={invAmount}
                        onChange={(e) => setInvAmount(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] font-mono font-bold outline-none focus:border-[#161616]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Concepto / Detalle</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Pintura local, avisos exteriores, equipos..."
                      value={invConcept}
                      onChange={(e) => setInvConcept(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingInv}
                    className="w-full py-2.5 bg-[#161616] hover:bg-[#2c2f35] text-[#F6F4EE] font-mono font-bold text-xs rounded-none cursor-pointer transition shadow-xs uppercase tracking-wider border-0"
                  >
                    {savingInv ? 'Guardando...' : '+ Agregar Ítem de Inversión'}
                  </button>
                </form>

                {/* Lista de Inversión Inicial */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {finModel?.investments?.list.length === 0 ? (
                    <p className="text-xs text-[#76746E] text-center py-6 italic font-mono">No hay ítems de inversión registrados.</p>
                  ) : (
                    finModel?.investments?.list.map((inv) => (
                      <div key={inv.id} className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 rounded-none flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-mono font-bold text-[#76746E] px-2 py-0.5 bg-white border border-[#E2DFD7]">
                            {inv.category}
                          </span>
                          <p className="font-serif font-bold text-sm text-[#161616] mt-1">{inv.concept}</p>
                          <p className="font-mono text-[#D9381E] font-bold">{formatCOP(parseFloat(inv.amount))}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvestment(inv.id)}
                          className="text-[#76746E] hover:text-[#C5221F] p-1.5 transition cursor-pointer bg-transparent border-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sección Préstamos Bancarios & Deuda */}
              <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                  <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#D9381E] text-[20px]">account_balance</span>
                    Estructura de Deuda & Créditos
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#C5221F]">Cuota Mensual: {formatCOP(totalDebtService)}</span>
                </div>

                <form onSubmit={handleAddLoan} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Banco / Entidad Financiera</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Bancolombia, Davivienda, Crédito Libre Inversión"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Monto ($ COP)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="20000000"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] font-mono font-bold outline-none focus:border-[#161616]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Tasa % E.M.</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="1.5"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] font-mono outline-none focus:border-[#161616]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Plazo (Meses)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="36"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] font-mono outline-none focus:border-[#161616]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingLoan}
                    className="w-full py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none cursor-pointer transition shadow-xs uppercase tracking-wider border-0"
                  >
                    {savingLoan ? 'Guardando...' : '+ Registrar Crédito Bancario'}
                  </button>
                </form>

                {/* Lista de Préstamos */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {finModel?.loans?.list.length === 0 ? (
                    <p className="text-xs text-[#76746E] text-center py-6 italic font-mono">No hay créditos bancarios registrados.</p>
                  ) : (
                    finModel?.loans?.list.map((loan) => (
                      <div key={loan.id} className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 rounded-none flex justify-between items-center text-xs">
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#161616]">{loan.bank_name}</h4>
                          <p className="text-[#76746E] text-[11px] font-mono">
                            Monto: {formatCOP(parseFloat(loan.loan_amount))} | {loan.term_months} meses @ {loan.monthly_interest_rate}% E.M.
                          </p>
                          <p className="font-mono text-[#C5221F] font-bold mt-0.5">
                            Cuota Mensual: {formatCOP(parseFloat(loan.monthly_installment_amount))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="text-[#76746E] hover:text-[#C5221F] p-1.5 transition cursor-pointer bg-transparent border-0"
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
              <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
                <h3 className="text-base font-serif font-bold text-[#161616] flex items-center gap-2 border-b border-[#E2DFD7] pb-3">
                  <span className="material-symbols-outlined text-[#D9381E] text-[20px]">sell</span>
                  Calculadora de Precios basada en Margen Objetivo
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                      Costo Insumo / Adquisición del Producto ($ COP)
                    </label>
                    <input
                      type="number"
                      value={bomCost}
                      onChange={(e) => setBomCost(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] font-bold font-mono outline-none focus:border-[#161616]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                      Margen de Ganancia Bruta Deseada (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="20"
                        max="85"
                        value={desiredMargin}
                        onChange={(e) => setDesiredMargin(e.target.value)}
                        className="flex-grow accent-[#D9381E] cursor-pointer"
                      />
                      <span className="font-mono font-bold text-[#D9381E] text-sm min-w-[50px]">{desiredMargin}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#76746E] block uppercase tracking-wider">
                    Precio de Venta Sugerido (PVP):
                  </span>
                  <strong className="text-3xl font-bold text-[#161616] font-mono block mt-1">{formatCOP(calculatedPrice)}</strong>
                  <p className="text-xs text-[#76746E] mt-2">
                    Para obtener un margen del <strong>{desiredMargin}%</strong> sobre un costo de {formatCOP(bomNum)}, este debe ser el precio público.
                  </p>
                </div>

                <div className="bg-[#FAF8F5] p-4 rounded-none border border-[#E2DFD7] space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#76746E]">Costo Producto:</span>
                    <span className="font-bold text-[#161616]">{formatCOP(bomNum)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E2DFD7] pt-2">
                    <span className="text-[#76746E]">Ganancia Bruta por Unidad:</span>
                    <span className="font-bold text-[#137333]">+{formatCOP(grossProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEGAL HUB */}
          {activeTab === 'legal_hub' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-[#E2DFD7] p-5 rounded-none text-xs text-[#161616] flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#FAF8F5] border border-[#E2DFD7] text-[#D9381E]">
                    <span className="material-symbols-outlined text-[24px]">balance</span>
                  </div>
                  <div>
                    <strong className="font-serif font-bold text-sm text-[#161616] block">Hub de Protección Legal & Transparencia IA</strong>
                    <span className="text-[#76746E]">Genera de forma automática los documentos legales de tu empresa para la web y facturación.</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 text-xs shadow-xs">
                  <h3 className="font-serif font-bold text-[#161616] text-sm flex items-center gap-2 border-b border-[#E2DFD7] pb-3">
                    <span className="material-symbols-outlined text-[#D9381E] text-[18px]">badge</span>
                    Datos del Negocio
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">Razón Social / Nombre Legal *</label>
                      <input
                        type="text"
                        value={businessLegalName}
                        onChange={(e) => setBusinessLegalName(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-[#161616] font-bold outline-none focus:border-[#161616]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">NIT / Documento Fiscal *</label>
                      <input
                        type="text"
                        value={businessNit}
                        onChange={(e) => setBusinessNit(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-[#161616] font-mono outline-none focus:border-[#161616]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">Dominio / Sitio Web</label>
                      <input
                        type="text"
                        value={businessDomain}
                        onChange={(e) => setBusinessDomain(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-[#161616] outline-none focus:border-[#161616]"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 flex flex-col justify-between shadow-xs">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 border-b border-[#E2DFD7] pb-3">
                      <button
                        type="button"
                        onClick={() => setActiveLegalDocTab('terminos')}
                        className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition uppercase tracking-wider border ${
                          activeLegalDocTab === 'terminos' ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]' : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] border-[#E2DFD7]'
                        }`}
                      >
                        📄 Términos y Condiciones
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLegalDocTab('ai_transparency')}
                        className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition uppercase tracking-wider border ${
                          activeLegalDocTab === 'ai_transparency' ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]' : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] border-[#E2DFD7]'
                        }`}
                      >
                        🤖 Declaración de IA
                      </button>
                    </div>

                    <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 rounded-none max-h-[300px] overflow-y-auto font-mono text-xs text-[#161616] leading-relaxed whitespace-pre-wrap">
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

                  <div className="pt-3 border-t border-[#E2DFD7] flex items-center justify-between">
                    <span className="text-xs text-[#76746E]">
                      {copySuccess ? `✅ ${copySuccess}` : 'Copia el texto legal para tu sitio web.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`TÉRMINOS Y CONDICIONES DE SERVICIO
${businessLegalName} | NIT ${businessNit}`);
                        setCopySuccess('Copiado al portapapeles');
                        setTimeout(() => setCopySuccess(null), 3000);
                      }}
                      className="px-4 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none transition flex items-center gap-2 cursor-pointer shadow-xs uppercase tracking-wider border-0"
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
