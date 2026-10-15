import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface SaaSErpAccountingProps {
  clientId: string;
  onNavigateTab?: (tab: string) => void;
}

interface AccountingSummary {
  period: string;
  date_range: { from: string; to: string };
  total_revenue: number;
  total_invoices: number;
  average_ticket: number;
  by_payment_method: Array<{ method: string; count: number; total: number }>;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
  avg_price: number;
  rotation_rank: number;
}

interface DailyTrendItem {
  date: string;
  revenue: number;
  count: number;
}

interface FixedExpense {
  id: string;
  concept: string;
  category: string;
  expense_type?: 'fijo' | 'ocasional';
  expense_date?: string;
  effective_date?: string;
  amount: string;
  period_month_year?: string;
  notes?: string;
  created_at: string;
}

interface AccountingInvoiceItem {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: string | number;
  status: string;
  payment_method: string;
  created_at: string;
  seller_name?: string;
}

export const SaaSErpAccounting: React.FC<SaaSErpAccountingProps> = ({ clientId, onNavigateTab }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year'>('month');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [isSpecificMonthMode, setIsSpecificMonthMode] = useState<boolean>(true);

  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [invoicesList, setInvoicesList] = useState<AccountingInvoiceItem[]>([]);
  const [activeTableTab, setActiveTableTab] = useState<'incomes' | 'expenses'>('incomes');
  const [tableSearch, setTableSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal para agregar gasto (Fijo u Ocasional)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('operativo');
  const [expenseType, setExpenseType] = useState<'fijo' | 'ocasional'>('fijo');
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      const queryParams = isSpecificMonthMode
        ? `month=${selectedMonth}&year=${selectedYear}`
        : `period=${period}`;

      const [sumRes, topRes, trendRes, expRes, invRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/accounting/summary?${queryParams}`),
        fetch(`/api/clients/${clientId}/accounting/top-products?${queryParams}&limit=10`),
        fetch(`/api/clients/${clientId}/accounting/daily-trend?${queryParams}`),
        fetch(`/api/clients/${clientId}/fixed-expenses?${queryParams}`),
        fetch(`/api/clients/${clientId}/accounting/invoices?${queryParams}`)
      ]);

      const sumJson = await sumRes.json();
      const topJson = await topRes.json();
      const trendJson = await trendRes.json();
      const expJson = await expRes.json();
      const invJson = await invRes.json();

      if (sumJson.success) setSummary(sumJson);
      if (topJson.success) setTopProducts(topJson.products || []);
      if (trendJson.success) setDailyTrend(trendJson.trend || []);
      if (expJson.success) setFixedExpenses(expJson.expenses || []);
      if (invJson.success) setInvoicesList(invJson.invoices || []);
    } catch (err) {
      console.error("Error al cargar módulo de contabilidad:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, [clientId, period, selectedMonth, selectedYear, isSpecificMonthMode]);

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseConcept || !expenseAmount) return;
    try {
      setSavingExpense(true);
      const res = await fetch(`/api/clients/${clientId}/fixed-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: expenseConcept,
          category: expenseCategory,
          expense_type: expenseType,
          expense_date: expenseDate,
          amount: parseFloat(expenseAmount),
          notes: expenseNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsExpenseModalOpen(false);
        setExpenseConcept('');
        setExpenseAmount('');
        setExpenseNotes('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setExpenseType('fijo');
        fetchAccountingData();
      } else {
        alert(json.error || 'Error al guardar gasto.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de gasto?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/fixed-expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchAccountingData();
      }
    } catch (err) {
      console.error('Error borrando gasto:', err);
    }
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(amount);
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return '💵 Efectivo';
      case 'transferencia': return '🏦 Transferencia Bancaria';
      case 'tarjeta_credito': return '💳 Tarjeta de Crédito';
      case 'tarjeta_debito': return '💳 Tarjeta de Débito';
      case 'credito': return '📋 Crédito (por cuotas)';
      default: return method.toUpperCase();
    }
  };

  const maxTrendRevenue = Math.max(1, ...dailyTrend.map(t => t.revenue));
  const totalFixedExpensesSum = fixedExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);

  const filteredInvoices = invoicesList.filter(inv => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      (inv.invoice_number && String(inv.invoice_number).toLowerCase().includes(q)) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(q)) ||
      (inv.payment_method && inv.payment_method.toLowerCase().includes(q)) ||
      (inv.seller_name && inv.seller_name.toLowerCase().includes(q)) ||
      (inv.status && inv.status.toLowerCase().includes(q))
    );
  });

  const filteredExpenses = fixedExpenses.filter(exp => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      (exp.concept && exp.concept.toLowerCase().includes(q)) ||
      (exp.category && exp.category.toLowerCase().includes(q)) ||
      (exp.notes && exp.notes.toLowerCase().includes(q)) ||
      (exp.expense_type && exp.expense_type.toLowerCase().includes(q))
    );
  });

  const totalInvoicesSum = filteredInvoices.reduce((acc, curr) => acc + parseFloat(String(curr.total_amount || 0)), 0);
  const totalFilteredExpensesSum = filteredExpenses.reduce((acc, curr) => acc + parseFloat(String(curr.amount || 0)), 0);

  return (
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header & Período Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            ANÁLISIS FINANCIERO & LIBRO CONTABLE
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#161616] tracking-tight leading-none flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D9381E] text-[28px]">bar_chart</span>
            Contabilidad y Flujo Financiero
          </h2>
          <p className="text-xs text-[#76746E] mt-2">
            Reporte consolidado de ingresos, gastos operativos, desglose por métodos de pago y tendencias.
          </p>
        </div>

        {/* Período Tabs & Selector de Mes Específico & Botón Registrar Gasto */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('registro_gastos') : (localStorage.setItem('client_active_tab', 'registro_gastos'), window.location.reload())}
            className="h-9 px-4 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border-0 uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Registrar Gasto
          </button>

          {/* Selector de Mes y Año Específico */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E2DFD7] px-2 h-9 shadow-xs">
            <span className="material-symbols-outlined text-[16px] text-[#76746E]">calendar_month</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setSelectedMonth(val);
                  setIsSpecificMonthMode(true);
                }
              }}
              className="bg-transparent text-xs font-mono font-bold text-[#161616] outline-none cursor-pointer border-0 py-1"
            >
              {[
                { m: 1, name: 'Enero' },
                { m: 2, name: 'Febrero' },
                { m: 3, name: 'Marzo' },
                { m: 4, name: 'Abril' },
                { m: 5, name: 'Mayo' },
                { m: 6, name: 'Junio' },
                { m: 7, name: 'Julio' },
                { m: 8, name: 'Agosto' },
                { m: 9, name: 'Septiembre' },
                { m: 10, name: 'Octubre' },
                { m: 11, name: 'Noviembre' },
                { m: 12, name: 'Diciembre' }
              ].map(item => (
                <option key={item.m} value={item.m}>{item.name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setSelectedYear(val);
                  setIsSpecificMonthMode(true);
                }
              }}
              className="bg-transparent text-xs font-mono font-bold text-[#161616] outline-none cursor-pointer border-0 py-1"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Intervalos rápidos (Hoy, Semana, etc.) */}
          <div className="flex flex-wrap items-center gap-1 bg-white border border-[#E2DFD7] p-0.5 rounded-none shadow-xs h-9">
            {(['day', 'week', 'month', 'quarter', 'semester', 'year'] as const).map((p) => {
              const labels = { day: 'Hoy', week: 'Semana', month: 'Mes Actual', quarter: 'Trimestre', semester: 'Semestre', year: 'Año' };
              const isSelected = !isSpecificMonthMode && period === p;
              return (
                <button
                  key={p}
                  onClick={() => {
                    const currentDate = new Date();
                    setSelectedMonth(currentDate.getMonth() + 1);
                    setSelectedYear(currentDate.getFullYear());
                    setPeriod(p);
                    setIsSpecificMonthMode(false);
                  }}
                  className={`h-full px-2.5 text-xs font-mono font-bold rounded-none transition cursor-pointer border-0 uppercase tracking-wider ${
                    isSelected ? 'bg-[#161616] text-[#F6F4EE]' : 'bg-transparent text-[#76746E] hover:text-[#161616]'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2DFD7] rounded-none">
          <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando estado contable...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex justify-between items-center shadow-xs">
              <div>
                <p className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Total Ingresos</p>
                <p className="text-2xl font-bold text-[#161616] font-mono mt-1">{formatCOP(summary?.total_revenue || 0)}</p>
              </div>
              <div className="w-9 h-9 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#D9381E]">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex justify-between items-center shadow-xs">
              <div>
                <p className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Gastos Operativos</p>
                <p className="text-2xl font-bold text-[#D9381E] font-mono mt-1">{formatCOP(totalFixedExpensesSum)}</p>
              </div>
              <div className="w-9 h-9 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#B45309]">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex justify-between items-center shadow-xs">
              <div>
                <p className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Ticket Promedio</p>
                <p className="text-2xl font-bold text-[#161616] font-mono mt-1">{formatCOP(summary?.average_ticket || 0)}</p>
              </div>
              <div className="w-9 h-9 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#161616]">
                <span className="material-symbols-outlined text-[20px]">analytics</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex justify-between items-center shadow-xs">
              <div>
                <p className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Facturas Emitidas</p>
                <p className="text-2xl font-bold text-[#161616] font-mono mt-1">{summary?.total_invoices || 0}</p>
              </div>
              <div className="w-9 h-9 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#161616]">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
            </div>
          </div>

          {/* Sección de Tablas Contables (Intercambiable entre Ingresos y Gastos con Formato de Tabla Tradicional) */}
          <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
            {/* Header con Pestañas de Intercambio y Buscador Rápido */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DFD7] pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTableTab('incomes')}
                  className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border transition cursor-pointer ${
                    activeTableTab === 'incomes'
                      ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                      : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] border-[#E2DFD7]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#22C55E]">payments</span>
                  <span>Tabla de Ingresos</span>
                  <span className="px-1.5 py-0.5 bg-white/20 text-[10px] font-mono rounded">
                    {filteredInvoices.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTableTab('expenses')}
                  className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border transition cursor-pointer ${
                    activeTableTab === 'expenses'
                      ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                      : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] border-[#E2DFD7]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#D9381E]">account_balance_wallet</span>
                  <span>Tabla de Gastos</span>
                  <span className="px-1.5 py-0.5 bg-white/20 text-[10px] font-mono rounded">
                    {filteredExpenses.length}
                  </span>
                </button>
              </div>

              {/* Buscador Rápido */}
              <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#E2DFD7] px-2.5 py-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#76746E]">search</span>
                <input
                  type="text"
                  placeholder={activeTableTab === 'incomes' ? 'Buscar cliente, factura o método...' : 'Buscar concepto, categoría o notas...'}
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="bg-transparent text-xs font-mono outline-none w-56 sm:w-64 placeholder:text-[#A8A29E]"
                />
                {tableSearch && (
                  <button onClick={() => setTableSearch('')} className="text-[#76746E] hover:text-[#161616] cursor-pointer border-0 bg-transparent">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* TABLA DE INGRESOS */}
            {activeTableTab === 'incomes' && (
              filteredInvoices.length === 0 ? (
                <p className="text-xs text-[#76746E] text-center py-10 italic font-mono">
                  {tableSearch ? 'No se encontraron facturas con el criterio de búsqueda.' : 'No hay ingresos registrados en el período seleccionado.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] font-mono uppercase text-[10px] font-bold tracking-wider">
                        <th className="py-2.5 px-3">Factura</th>
                        <th className="py-2.5 px-3">Fecha & Hora</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Asesor / Vendedor</th>
                        <th className="py-2.5 px-3">Método de Pago</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-right">Total Ingreso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD7]">
                      {filteredInvoices.map((inv) => {
                        const dateObj = new Date(inv.created_at);
                        const formattedDate = isNaN(dateObj.getTime())
                          ? inv.created_at
                          : dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                        return (
                          <tr key={inv.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-[#161616]">
                              #FAC-{inv.invoice_number || inv.id.substring(0, 6)}
                            </td>
                            <td className="py-3 px-3 font-mono text-[#76746E] whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-serif font-bold text-[#161616] block">{inv.customer_name || 'Consumidor Final'}</span>
                              {inv.customer_phone && <span className="font-mono text-[10px] text-[#76746E] block">{inv.customer_phone}</span>}
                            </td>
                            <td className="py-3 px-3 font-mono text-[#76746E]">
                              {inv.seller_name || 'Sin asignar'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E2DFD7] text-[11px] font-mono rounded-none inline-block">
                                {getMethodLabel(inv.payment_method)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-none border ${
                                inv.status === 'paid' || inv.status === 'completed'
                                  ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                                  : 'bg-[#FEF7E0] text-[#B45309] border-[#FDE68A]'
                              }`}>
                                {inv.status === 'paid' ? 'Pagada' : inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-[#161616] whitespace-nowrap">
                              {formatCOP(parseFloat(String(inv.total_amount || 0)))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FAF8F5] border-t-2 border-[#161616] font-mono font-bold text-xs">
                        <td colSpan={6} className="py-3 px-3 text-right uppercase text-[#76746E]">
                          Total Ingresos ({filteredInvoices.length} facturas):
                        </td>
                        <td className="py-3 px-3 text-right text-[#161616] text-sm">
                          {formatCOP(totalInvoicesSum)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}

            {/* TABLA DE GASTOS */}
            {activeTableTab === 'expenses' && (
              filteredExpenses.length === 0 ? (
                <p className="text-xs text-[#76746E] text-center py-10 italic font-mono">
                  {tableSearch ? 'No se encontraron gastos con el criterio de búsqueda.' : 'No hay gastos registrados en el período seleccionado. Haz clic en "Registrar Gasto" para agregar.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] font-mono uppercase text-[10px] font-bold tracking-wider">
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3">Concepto</th>
                        <th className="py-2.5 px-3">Notas / Proveedor</th>
                        <th className="py-2.5 px-3 text-right">Monto Gasto</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD7]">
                      {filteredExpenses.map((exp) => {
                        const isOccasional = exp.expense_type === 'ocasional';
                        const dateStr = exp.effective_date || exp.expense_date || exp.created_at;
                        const formattedDate = dateStr ? dateStr.substring(0, 10) : '';

                        return (
                          <tr key={exp.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-3 px-3 font-mono text-[#76746E] whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-none border ${
                                isOccasional 
                                  ? 'bg-white text-[#161616] border-[#E2DFD7]' 
                                  : 'bg-[#FEF7E0] text-[#B45309] border-[#FDE68A]'
                              }`}>
                                {isOccasional ? '⚡ Ocasional' : '📌 Fijo'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] uppercase font-mono font-bold text-[#76746E] px-2 py-0.5 bg-[#FAF8F5] rounded-none border border-[#E2DFD7]">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-serif font-bold text-[#161616]">
                              {exp.concept}
                            </td>
                            <td className="py-3 px-3 font-mono text-[#76746E] text-[11px]">
                              {exp.notes || '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-[#D9381E] whitespace-nowrap">
                              {formatCOP(parseFloat(exp.amount || '0'))}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-[#76746E] hover:text-[#C5221F] p-1 rounded-none hover:bg-white border border-transparent hover:border-[#E2DFD7] transition cursor-pointer"
                                title="Eliminar gasto"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FAF8F5] border-t-2 border-[#161616] font-mono font-bold text-xs">
                        <td colSpan={5} className="py-3 px-3 text-right uppercase text-[#76746E]">
                          Total Gastos ({filteredExpenses.length} registros):
                        </td>
                        <td className="py-3 px-3 text-right text-[#D9381E] text-sm">
                          {formatCOP(totalFilteredExpensesSum)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Gráfico de Tendencia Diaria y Desglose de Métodos de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs overflow-visible">
              <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9381E] text-[20px]">show_chart</span>
                  Tendencia Diaria de Ventas
                </h3>
                <span className="text-[11px] text-[#76746E] font-mono">{dailyTrend.length} día(s) activo(s)</span>
              </div>

              {!dailyTrend || dailyTrend.length === 0 ? (
                <p className="text-xs text-[#76746E] text-center py-12 italic font-mono">No hay ventas registradas en el período seleccionado.</p>
              ) : (
                <div className="pt-16 pb-4 px-2">
                  <div className="h-64 flex items-end gap-3 sm:gap-5 border-b border-[#E2DFD7] pb-2 overflow-x-auto custom-scrollbar pt-12">
                    {dailyTrend.map((t, idx) => {
                      const heightPct = Math.max(12, Math.round((t.revenue / maxTrendRevenue) * 100));
                      const dateObj = new Date(t.date + 'T00:00:00');
                      const dateFormatted = isNaN(dateObj.getTime()) ? t.date : dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                      const isFirst = idx === 0;
                      const isLast = idx === dailyTrend.length - 1;
                      const tooltipPosClass = isFirst ? 'left-0 translate-x-0' : isLast ? 'right-0 left-auto translate-x-0' : 'left-1/2 -translate-x-1/2';

                      return (
                        <div key={t.date} className="flex-1 max-w-[64px] min-w-[36px] flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer">
                          <div className={`absolute -top-14 ${tooltipPosClass} opacity-0 group-hover:opacity-100 transition-opacity bg-[#161616] text-[#F6F4EE] border border-[#161616] p-2 rounded-none text-xs font-mono font-bold whitespace-nowrap z-50 pointer-events-none shadow-xl flex flex-col items-center gap-0.5`}>
                            <span className="text-[10px] text-[#E2DFD7]">{dateFormatted}</span>
                            <span className="text-[#D9381E] font-mono text-xs font-bold">{formatCOP(t.revenue)}</span>
                            <span className="text-[9px] font-mono text-[#F6F4EE] opacity-80">{t.count} venta(s)</span>
                          </div>

                          <span className="text-[9px] font-mono font-bold text-[#161616] opacity-75 group-hover:opacity-100 transition truncate max-w-full text-center mb-0.5">
                            {t.revenue >= 1000000 ? `$${(t.revenue / 1000000).toFixed(1)}M` : t.revenue >= 1000 ? `$${Math.round(t.revenue / 1000)}k` : `$${t.revenue}`}
                          </span>

                          <div 
                            style={{ height: `${heightPct}%` }} 
                            className="w-full bg-[#161616] group-hover:bg-[#D9381E] rounded-none transition-colors duration-200"
                          />

                          <span className="text-[10px] text-[#76746E] font-mono truncate w-full text-center font-bold group-hover:text-[#161616] transition mt-1">
                            {dateFormatted}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Métodos de Pago */}
            <div className="lg:col-span-4 bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
              <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2 border-b border-[#E2DFD7] pb-3">
                <span className="material-symbols-outlined text-[#D9381E] text-[20px]">credit_card</span>
                Ingresos por Método de Pago
              </h3>

              {!summary || summary.by_payment_method.length === 0 ? (
                <p className="text-xs text-[#76746E] text-center py-8 italic font-mono">Sin datos registrados.</p>
              ) : (
                <div className="space-y-4">
                  {summary.by_payment_method.map((item) => {
                    const pct = summary.total_revenue > 0 ? Math.round((item.total / summary.total_revenue) * 100) : 0;
                    return (
                      <div key={item.method} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-serif font-bold text-[#161616]">{getMethodLabel(item.method)}</span>
                          <span className="font-mono text-[#D9381E] font-bold">{formatCOP(item.total)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-[#FAF8F5] h-2 rounded-none border border-[#E2DFD7] overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="bg-[#161616] h-full transition-all duration-500" />
                        </div>
                        <p className="text-[10px] text-[#76746E] text-right font-mono">{item.count} transacción(es)</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top Productos Más Vendidos */}
          <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D9381E] text-[20px]">workspace_premium</span>
                Top Productos Más Vendidos
              </h3>
              <span className="text-[11px] text-[#76746E] font-mono">Ranking del período</span>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-[#76746E] text-center py-8 italic font-mono">No hay ventas registradas en este período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] font-mono uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Ranking</th>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Unidades Vendidas</th>
                      <th className="py-2.5 px-3 text-right">Precio Promedio</th>
                      <th className="py-2.5 px-3 text-right">Total Recaudado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DFD7]">
                    {topProducts.map((p) => (
                      <tr key={p.product_id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#D9381E]">#{p.rotation_rank}</td>
                        <td className="py-3 px-3 font-serif font-bold text-[#161616]">{p.product_name}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold">{p.total_sold} ud.</td>
                        <td className="py-3 px-3 text-right font-mono text-[#76746E]">{formatCOP(p.avg_price)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#161616]">{formatCOP(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Registrar Gasto Operativo */}
      {isExpenseModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#F6F4EE] border border-[#161616] rounded-none p-6 max-w-md w-full space-y-4 shadow-2xl relative z-[100000] text-left" onClick={(e) => e.stopPropagation()}>
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">EGRESOS & COSTOS</span>
                <h4 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9381E] text-[20px]">account_balance_wallet</span>
                  Registrar Gasto del Negocio
                </h4>
              </div>
              <button 
                type="button"
                onClick={() => setIsExpenseModalOpen(false)} 
                className="text-[#76746E] hover:text-[#161616] cursor-pointer bg-transparent border-0 flex items-center justify-center p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddFixedExpense} className="space-y-3.5 text-xs">
              {/* Selector de Tipo de Gasto */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Tipo de Gasto *</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-white border border-[#E2DFD7] rounded-none">
                  <button
                    type="button"
                    onClick={() => setExpenseType('fijo')}
                    className={`py-1.5 px-3 text-xs font-mono font-bold rounded-none transition border-0 cursor-pointer uppercase tracking-wider ${
                      expenseType === 'fijo' 
                        ? 'bg-[#161616] text-[#F6F4EE]' 
                        : 'bg-transparent text-[#76746E] hover:text-[#161616]'
                    }`}
                  >
                    <span>📌 Fijo Recurrente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType('ocasional')}
                    className={`py-1.5 px-3 text-xs font-mono font-bold rounded-none transition border-0 cursor-pointer uppercase tracking-wider ${
                      expenseType === 'ocasional' 
                        ? 'bg-[#161616] text-[#F6F4EE]' 
                        : 'bg-transparent text-[#76746E] hover:text-[#161616]'
                    }`}
                  >
                    <span>⚡ Ocasional</span>
                  </button>
                </div>
              </div>

              {/* Concepto del Gasto */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Concepto del Gasto *</label>
                <input
                  type="text"
                  required
                  placeholder={expenseType === 'fijo' ? "Ej. Arriendo de Local, Servicios, Nómina" : "Ej. Reparación, Mantenimiento, Papelería"}
                  value={expenseConcept}
                  onChange={(e) => setExpenseConcept(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Categoría</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none cursor-pointer focus:border-[#161616] font-mono"
                  >
                    <option value="operativo">Arriendo / Local</option>
                    <option value="servicios">Servicios Públicos</option>
                    <option value="tecnologia">Internet / Software</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="insumos">Insumos / Materiales</option>
                    <option value="transporte">Transporte / Fletes</option>
                    <option value="otros">Otros Gastos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Monto ($ COP) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="2000000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#D9381E] font-mono font-bold outline-none focus:border-[#161616]"
                  />
                </div>
              </div>

              {/* Fecha del Gasto */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E] flex items-center justify-between">
                  <span>Fecha del Gasto *</span>
                  <span className="text-[10px] text-[#D9381E] font-bold flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[13px]">history</span>
                    Imputación Histórica
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Notas Adicionales</label>
                <textarea
                  placeholder="Detalles del gasto, número de factura o justificación..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none resize-none h-16 focus:border-[#161616]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold text-xs rounded-none hover:bg-[#FAF8F5] cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 border-0 uppercase tracking-wider"
                >
                  {savingExpense ? (
                    <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Guardando...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[16px]">save</span> Guardar Gasto</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
