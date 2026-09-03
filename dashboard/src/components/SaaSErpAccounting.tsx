import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface SaaSErpAccountingProps {
  clientId: string;
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

export const SaaSErpAccounting: React.FC<SaaSErpAccountingProps> = ({ clientId }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year'>('month');
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
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
      const [sumRes, topRes, trendRes, expRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/accounting/summary?period=${period}`),
        fetch(`/api/clients/${clientId}/accounting/top-products?period=${period}&limit=10`),
        fetch(`/api/clients/${clientId}/accounting/daily-trend?period=${period}`),
        fetch(`/api/clients/${clientId}/fixed-expenses`)
      ]);

      const sumJson = await sumRes.json();
      const topJson = await topRes.json();
      const trendJson = await trendRes.json();
      const expJson = await expRes.json();

      if (sumJson.success) setSummary(sumJson);
      if (topJson.success) setTopProducts(topJson.products || []);
      if (trendJson.success) setDailyTrend(trendJson.trend || []);
      if (expJson.success) setFixedExpenses(expJson.expenses || []);
    } catch (err) {
      console.error("Error al cargar módulo de contabilidad:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, [clientId, period]);

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
    if (!confirm('¿Deseas eliminar este registro de gasto fijo?')) return;
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

  return (
    <div className="space-y-6 text-white">
      {/* Header & Período Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222428] pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#eab308] flex items-center gap-2" style={{ color: '#eab308' }}>
            <span className="material-symbols-outlined text-[#eab308]">bar_chart</span>
            CONTABILIDAD Y ANÁLISIS FINANCIERO
          </h2>
          <p className="text-xs text-gray-400">
            Reporte consolidado de ingresos, gastos fijos operativos, desglose por métodos de pago y tendencias.
          </p>
        </div>

        {/* Período Tabs & Botón Agregar Gasto Fijo */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#eab308] hover:bg-amber-300 text-black font-extrabold text-[11px] rounded-md flex items-center gap-1.5 transition cursor-pointer shadow border-0"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            REGISTRAR GASTO
          </button>

          <div className="flex flex-wrap items-center gap-1.5 bg-surface-container border border-outline/20 p-1 rounded-xl">
            {(['day', 'week', 'month', 'quarter', 'semester', 'year'] as const).map((p) => {
              const labels = { day: 'Hoy', week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Año' };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer border-0 ${
                    period === p ? 'bg-primary text-on-primary shadow' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
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
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total Ingresos</p>
                <p className="text-xl font-black text-primary mt-1">{formatCOP(summary?.total_revenue || 0)}</p>
              </div>
              <span className="material-symbols-outlined text-primary text-[32px] opacity-80">attach_money</span>
            </div>

            <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Gastos Fijos Mensuales</p>
                <p className="text-xl font-black text-amber-400 mt-1">{formatCOP(totalFixedExpensesSum)}</p>
              </div>
              <span className="material-symbols-outlined text-amber-400 text-[32px] opacity-80">account_balance_wallet</span>
            </div>

            <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Ticket Promedio</p>
                <p className="text-xl font-black text-on-surface mt-1">{formatCOP(summary?.average_ticket || 0)}</p>
              </div>
              <span className="material-symbols-outlined text-tertiary text-[32px] opacity-80">analytics</span>
            </div>

            <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Facturas Emitidas</p>
                <p className="text-xl font-black text-on-surface mt-1">{summary?.total_invoices || 0}</p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[32px] opacity-80">receipt_long</span>
            </div>
          </div>

          {/* Sección de Gastos Operativos (Fijos y Ocasionales) */}
          <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[18px]">account_balance_wallet</span>
                Gastos Operativos del Negocio (Fijos y Ocasionales)
              </h3>
              <span className="text-[11px] text-on-surface-variant font-mono">Alimenta la Planeación Financiera y Flujo de Caja</span>
            </div>

            {fixedExpenses.length === 0 ? (
              <p className="text-xs text-on-surface-variant opacity-60 text-center py-6 italic">
                No hay gastos registrados. Haz clic en "Registrar Gasto" para agregar arriendos, servicios o imprevistos ocasionales.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fixedExpenses.map((item) => {
                  const isOccasional = item.expense_type === 'ocasional';
                  const dateStr = item.effective_date || item.expense_date || item.created_at;
                  const formattedDate = dateStr ? dateStr.substring(0, 10) : '';

                  return (
                    <div key={item.id} className="bg-surface-container/50 border border-outline/20 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            isOccasional 
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' 
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}>
                            {isOccasional ? '⚡ Ocasional' : '📌 Fijo Recurrente'}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                            {item.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-on-surface mt-1">{item.concept}</h4>
                        <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">{formatCOP(parseFloat(item.amount))}</p>
                        <p className="text-[10px] text-on-surface-variant/70 font-mono mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                          Fecha: {formattedDate}
                        </p>
                        {item.notes && <p className="text-[10px] text-on-surface-variant mt-1 italic">{item.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(item.id)}
                        className="text-on-surface-variant hover:text-red-400 p-1.5 rounded-lg hover:bg-surface-container-high transition cursor-pointer"
                        title="Eliminar gasto"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gráfico de Tendencia Diaria y Desglose de Métodos de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-surface-container/30 border border-outline/10 p-6 rounded-2xl space-y-4 overflow-visible">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">show_chart</span>
                  Tendencia Diaria de Ventas
                </h3>
                <span className="text-[11px] text-on-surface-variant font-mono">Total {dailyTrend.length} día(s) activo(s)</span>
              </div>

              {!dailyTrend || dailyTrend.length === 0 ? (
                <p className="text-xs text-on-surface-variant opacity-60 text-center py-12 italic">No hay ventas registradas en el período seleccionado.</p>
              ) : (
                <div className="pt-20 pb-4 px-2">
                  <div className="h-64 flex items-end gap-3 sm:gap-5 border-b border-outline/15 pb-2 overflow-x-auto custom-scrollbar pt-16">
                    {dailyTrend.map((t, idx) => {
                      const heightPct = Math.max(12, Math.round((t.revenue / maxTrendRevenue) * 100));
                      const dateObj = new Date(t.date + 'T00:00:00');
                      const dateFormatted = isNaN(dateObj.getTime()) ? t.date : dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                      const isFirst = idx === 0;
                      const isLast = idx === dailyTrend.length - 1;
                      const tooltipPosClass = isFirst ? 'left-0 translate-x-0' : isLast ? 'right-0 left-auto translate-x-0' : 'left-1/2 -translate-x-1/2';
                      const arrowPosClass = isFirst ? 'left-4 translate-x-0' : isLast ? 'right-4 left-auto translate-x-0' : 'left-1/2 -translate-x-1/2';

                      return (
                        <div key={t.date} className="flex-1 max-w-[64px] min-w-[36px] flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer">
                          <div className={`absolute -top-14 ${tooltipPosClass} opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 bg-[#1e1926] border border-primary/40 p-2 rounded-xl text-xs font-bold text-on-surface whitespace-nowrap z-50 pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex flex-col items-center gap-0.5`}>
                            <span className="text-[10px] text-on-surface-variant font-medium">{dateFormatted}</span>
                            <span className="text-[#00ff88] font-mono text-xs font-bold">{formatCOP(t.revenue)}</span>
                            <span className="text-[9px] text-primary/90 font-mono bg-primary/10 px-1.5 py-0.5 rounded">{t.count} venta(s)</span>
                            <div className={`absolute -bottom-1.5 ${arrowPosClass} w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary/40`}></div>
                          </div>

                          <span className="text-[9px] font-mono font-bold text-primary opacity-80 group-hover:opacity-100 transition truncate max-w-full text-center mb-0.5">
                            {t.revenue >= 1000000 ? `$${(t.revenue / 1000000).toFixed(1)}M` : t.revenue >= 1000 ? `$${Math.round(t.revenue / 1000)}k` : `$${t.revenue}`}
                          </span>

                          <div 
                            style={{ height: `${heightPct}%` }} 
                            className="w-full bg-gradient-to-t from-primary/50 via-primary/80 to-primary group-hover:from-primary group-hover:to-[#ffe0a3] rounded-t-xl transition-all duration-300 relative shadow-md group-hover:shadow-[0_0_15px_rgba(216,162,78,0.5)] border-t border-primary/30"
                          />

                          <span className="text-[10px] text-on-surface-variant font-mono truncate w-full text-center font-bold group-hover:text-on-surface transition mt-1">
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
            <div className="lg:col-span-4 bg-surface-container/30 border border-outline/10 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">credit_card</span>
                Ingresos por Método de Pago
              </h3>

              {!summary || summary.by_payment_method.length === 0 ? (
                <p className="text-xs text-on-surface-variant opacity-60 text-center py-8 italic">Sin datos.</p>
              ) : (
                <div className="space-y-4">
                  {summary.by_payment_method.map((item) => {
                    const pct = summary.total_revenue > 0 ? Math.round((item.total / summary.total_revenue) * 100) : 0;
                    return (
                      <div key={item.method} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-on-surface">{getMethodLabel(item.method)}</span>
                          <span className="font-mono text-primary font-bold">{formatCOP(item.total)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="bg-primary h-full rounded-full transition-all duration-500" />
                        </div>
                        <p className="text-[10px] text-on-surface-variant text-right font-mono">{item.count} transacción(es)</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top Productos Más Vendidos */}
          <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">workspace_premium</span>
                Top Productos Más Vendidos
              </h3>
              <span className="text-[11px] text-on-surface-variant font-mono">Ranking del período</span>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-on-surface-variant opacity-60 text-center py-8 italic">No hay ventas registradas en este período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-outline/10 text-on-surface-variant uppercase font-bold tracking-tight">
                      <th className="py-2.5 px-2">Ranking</th>
                      <th className="py-2.5 px-2">Producto</th>
                      <th className="py-2.5 px-2 text-center">Unidades Vendidas</th>
                      <th className="py-2.5 px-2 text-right">Precio Promedio</th>
                      <th className="py-2.5 px-2 text-right">Total Recaudado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p) => (
                      <tr key={p.product_id} className="border-b border-outline/5 hover:bg-surface-variant/20 transition-all">
                        <td className="py-3 px-2 font-mono font-bold text-primary">#{p.rotation_rank}</td>
                        <td className="py-3 px-2 font-bold text-on-surface">{p.product_name}</td>
                        <td className="py-3 px-2 text-center font-mono font-bold">{p.total_sold} ud.</td>
                        <td className="py-3 px-2 text-right font-mono">{formatCOP(p.avg_price)}</td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-green-500">{formatCOP(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Registrar Gasto Operativo (Teleportado a document.body) */}
      {isExpenseModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#141517] border border-[#2a2c32] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative z-[100000]" onClick={(e) => e.stopPropagation()}>
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center border-b border-[#222428] pb-3">
              <h4 className="font-extrabold text-sm text-[#eab308] flex items-center gap-2" style={{ color: '#eab308' }}>
                <span className="material-symbols-outlined text-[20px] text-[#eab308]">account_balance_wallet</span>
                Registrar Gasto del Negocio
              </h4>
              <button 
                type="button"
                onClick={() => setIsExpenseModalOpen(false)} 
                className="text-gray-400 hover:text-white cursor-pointer bg-transparent border-0 flex items-center justify-center p-1 rounded-lg hover:bg-white/5 transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddFixedExpense} className="space-y-4">
              {/* Selector de Tipo de Gasto */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tipo de Gasto *</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#0a0b0c] border border-[#26282d] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setExpenseType('fijo')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition border-0 cursor-pointer flex items-center justify-center gap-1.5 ${
                      expenseType === 'fijo' 
                        ? 'bg-[#eab308] text-black shadow-md' 
                        : 'bg-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>📌 Fijo Recurrente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType('ocasional')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition border-0 cursor-pointer flex items-center justify-center gap-1.5 ${
                      expenseType === 'ocasional' 
                        ? 'bg-purple-500 text-white shadow-md' 
                        : 'bg-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>⚡ Ocasional / Variable</span>
                  </button>
                </div>
              </div>

              {/* Concepto del Gasto */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Concepto del Gasto *</label>
                <input
                  type="text"
                  required
                  placeholder={expenseType === 'fijo' ? "Ej. Arriendo de Local, Luz/Agua, Internet" : "Ej. Reparación de Exhibidor, Mantenimiento, Papelería"}
                  value={expenseConcept}
                  onChange={(e) => setExpenseConcept(e.target.value)}
                  className="w-full bg-[#0a0b0c] border border-[#26282d] rounded-xl p-3 text-xs text-white placeholder-gray-600 outline-none focus:border-[#eab308] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Categoría</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-[#0a0b0c] border border-[#26282d] rounded-xl p-3 text-xs text-white outline-none cursor-pointer focus:border-[#eab308] transition"
                  >
                    <option value="operativo" className="bg-[#141517] text-white">Arriendo / Local</option>
                    <option value="servicios" className="bg-[#141517] text-white">Servicios Públicos</option>
                    <option value="tecnologia" className="bg-[#141517] text-white">Internet / Software</option>
                    <option value="mantenimiento" className="bg-[#141517] text-white">Mantenimiento</option>
                    <option value="insumos" className="bg-[#141517] text-white">Insumos / Materiales</option>
                    <option value="transporte" className="bg-[#141517] text-white">Transporte / Fletes</option>
                    <option value="otros" className="bg-[#141517] text-white">Otros Gastos</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Monto ($ COP) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="2000000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-[#0a0b0c] border border-[#26282d] rounded-xl p-3 text-xs text-amber-400 font-mono font-bold outline-none focus:border-[#eab308] transition"
                  />
                </div>
              </div>

              {/* Fecha del Gasto (Permite Imputar a Periodos Anteriores) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                  <span>Fecha del Gasto *</span>
                  <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">history</span>
                    Imputación Histórica
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-[#0a0b0c] border border-[#26282d] rounded-xl p-3 text-xs text-white outline-none focus:border-[#eab308] transition font-mono"
                />
                <p className="text-[10px] text-gray-400 bg-[#0a0b0c] p-2 rounded-lg border border-[#26282d]/60 leading-relaxed">
                  💡 <strong>¿Gasto olvidado de un periodo anterior?</strong> Selecciona la fecha exacta (ej. mes pasado) y el sistema imputará este gasto al periodo correspondiente en el estado financiero.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Notas Adicionales</label>
                <textarea
                  placeholder="Detalles del gasto, número de factura o justificación"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full bg-[#0a0b0c] border border-[#26282d] rounded-xl p-3 text-xs text-white placeholder-gray-600 outline-none resize-none h-16 focus:border-[#eab308] transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#222428]">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 border border-[#26282d] text-gray-300 hover:text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-5 py-2.5 bg-[#eab308] hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl cursor-pointer shadow-lg transition flex items-center gap-1.5 border-0"
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
