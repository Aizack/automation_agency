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

        {/* Período Tabs & Botón Agregar Gasto Fijo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="h-9 px-4 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border-0 uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Registrar Gasto
          </button>

          <div className="flex flex-wrap items-center gap-1 bg-white border border-[#E2DFD7] p-0.5 rounded-none shadow-xs h-9">
            {(['day', 'week', 'month', 'quarter', 'semester', 'year'] as const).map((p) => {
              const labels = { day: 'Hoy', week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Año' };
              const isSelected = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
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

          {/* Sección de Gastos Operativos (Fijos y Ocasionales) */}
          <div className="bg-white border border-[#E2DFD7] p-6 rounded-none space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D9381E] text-[20px]">account_balance_wallet</span>
                Gastos Operativos del Negocio (Fijos y Ocasionales)
              </h3>
              <span className="text-[11px] text-[#76746E] font-mono">Total: {fixedExpenses.length} registrados</span>
            </div>

            {fixedExpenses.length === 0 ? (
              <p className="text-xs text-[#76746E] text-center py-6 italic font-mono">
                No hay gastos registrados. Haz clic en "Registrar Gasto" para agregar arriendos, servicios o imprevistos.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fixedExpenses.map((item) => {
                  const isOccasional = item.expense_type === 'ocasional';
                  const dateStr = item.effective_date || item.expense_date || item.created_at;
                  const formattedDate = dateStr ? dateStr.substring(0, 10) : '';

                  return (
                    <div key={item.id} className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 rounded-none flex justify-between items-start shadow-xs">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-none border ${
                            isOccasional 
                              ? 'bg-white text-[#161616] border-[#E2DFD7]' 
                              : 'bg-[#FEF7E0] text-[#B45309] border-[#FDE68A]'
                          }`}>
                            {isOccasional ? '⚡ Ocasional' : '📌 Fijo'}
                          </span>
                          <span className="text-[9px] uppercase font-mono font-bold text-[#76746E] px-2 py-0.5 bg-white rounded-none border border-[#E2DFD7]">
                            {item.category}
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-sm text-[#161616] mt-2">{item.concept}</h4>
                        <p className="text-sm font-mono font-bold text-[#D9381E] mt-0.5">{formatCOP(parseFloat(item.amount))}</p>
                        <p className="text-[10px] text-[#76746E] font-mono mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                          Fecha: {formattedDate}
                        </p>
                        {item.notes && <p className="text-[11px] text-[#76746E] mt-1 italic">{item.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(item.id)}
                        className="text-[#76746E] hover:text-[#C5221F] p-1 rounded-none hover:bg-white border border-transparent hover:border-[#E2DFD7] transition cursor-pointer"
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
