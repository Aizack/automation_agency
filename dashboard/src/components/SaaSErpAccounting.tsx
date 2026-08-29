import React, { useState, useEffect } from 'react';
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

export const SaaSErpAccounting: React.FC<SaaSErpAccountingProps> = ({ clientId }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year'>('month');
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('auth_token');

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      const [sumRes, topRes, trendRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/accounting/summary?period=${period}`, { headers }),
        fetch(`/api/clients/${clientId}/accounting/top-products?period=${period}&limit=10`, { headers }),
        fetch(`/api/clients/${clientId}/accounting/daily-trend?period=${period}`, { headers })
      ]);

      const sumJson = await sumRes.json();
      const topJson = await topRes.json();
      const trendJson = await trendRes.json();

      if (sumJson.success) setSummary(sumJson);
      if (topJson.success) setTopProducts(topJson.products || []);
      if (trendJson.success) setDailyTrend(trendJson.trend || []);
    } catch (err) {
      console.error("Error al cargar módulo de contabilidad:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, [clientId, period]);

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

  return (
    <div className="space-y-6">
      {/* Header & Período Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            Contabilidad y Análisis Financiero
          </h2>
          <p className="text-xs text-on-surface-variant opacity-75">
            Reporte consolidado de ingresos, desglose por métodos de pago, productos más vendidos y tendencias.
          </p>
        </div>

        {/* Período Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-container border border-outline/20 p-1 rounded-xl">
          {(['day', 'week', 'month', 'quarter', 'semester', 'year'] as const).map((p) => {
            const labels = { day: 'Hoy', week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Año' };
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer border-0 ${
                  period === p ? 'bg-primary text-white shadow' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
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
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Facturas Emitidas</p>
                <p className="text-xl font-black text-on-surface mt-1">{summary?.total_invoices || 0}</p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[32px] opacity-80">receipt_long</span>
            </div>

            <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Ticket Promedio</p>
                <p className="text-xl font-black text-green-500 mt-1">{formatCOP(summary?.average_ticket || 0)}</p>
              </div>
              <span className="material-symbols-outlined text-green-500 text-[32px] opacity-80">shopping_bag</span>
            </div>

            <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Rango Analizado</p>
                <p className="text-xs font-bold text-on-surface mt-1">
                  {summary?.date_range.from} ➔ {summary?.date_range.to}
                </p>
              </div>
              <span className="material-symbols-outlined text-orange-500 text-[32px] opacity-80">calendar_month</span>
            </div>
          </div>

          {/* Gráfico de Tendencia Diaria y Desglose de Métodos de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico de Barras CSS para Tendencia */}
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
                    {dailyTrend.map((t) => {
                      const heightPct = Math.max(12, Math.round((t.revenue / maxTrendRevenue) * 100));
                      // Formatear fecha bonita
                      const dateObj = new Date(t.date + 'T00:00:00');
                      const dateFormatted = isNaN(dateObj.getTime()) ? t.date : dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

                      return (
                        <div key={t.date} className="flex-1 max-w-[64px] min-w-[36px] flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer">
                          
                          {/* TOOLTIP FLOTANTE TIPO NOTA SOBRE EL CURSOR */}
                          <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 bg-[#1e1926] border border-primary/40 p-2 rounded-xl text-xs font-bold text-on-surface whitespace-nowrap z-50 pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-on-surface-variant font-medium">{dateFormatted}</span>
                            <span className="text-[#00ff88] font-mono text-xs font-bold">{formatCOP(t.revenue)}</span>
                            <span className="text-[9px] text-primary/90 font-mono bg-primary/10 px-1.5 py-0.5 rounded">{t.count} venta(s)</span>
                            {/* Flecha apuntando a la barra */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary/40"></div>
                          </div>

                          {/* MONTO O TEXTO VISIBLE SOBRE LA BARRA */}
                          <span className="text-[9px] font-mono font-bold text-primary opacity-80 group-hover:opacity-100 transition truncate max-w-full text-center mb-0.5">
                            {t.revenue >= 1000000 ? `$${(t.revenue / 1000000).toFixed(1)}M` : t.revenue >= 1000 ? `$${Math.round(t.revenue / 1000)}k` : `$${t.revenue}`}
                          </span>

                          {/* BARRA DE GRADIENTE DE COLOR */}
                          <div 
                            style={{ height: `${heightPct}%` }} 
                            className="w-full bg-gradient-to-t from-primary/50 via-primary/80 to-primary group-hover:from-primary group-hover:to-[#ffe0a3] rounded-t-xl transition-all duration-300 relative shadow-md group-hover:shadow-[0_0_15px_rgba(216,162,78,0.5)] border-t border-primary/30"
                          />

                          {/* FECHA / DÍA ABAJO EN EL EJE X */}
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
              <span className="text-[11px] text-on-surface-variant font-mono">Ranking en el período</span>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-on-surface-variant opacity-60 text-center py-8 italic">No hay registros de ventas de productos en este período.</p>
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
    </div>
  );
};
