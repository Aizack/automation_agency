import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface EmployeeSalesTarget {
  employee_id: string;
  employee_name: string;
  role: string;
  target_amount: number;
  sales_amount: number;
  commissions_earned: number;
  achievement_pct: number;
  bonus_earned: number;
}

interface SaaSErpSalesTargetsProps {
  clientId: string;
}

export const SaaSErpSalesTargets: React.FC<SaaSErpSalesTargetsProps> = ({ clientId: rawClientId }) => {
  const clientId = (rawClientId && rawClientId !== 'undefined')
    ? rawClientId
    : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
  const [monthYear, setMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sellersData, setSellersData] = useState<EmployeeSalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para asignar meta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  const fetchSalesAndTargets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/sales-targets?month_year=${monthYear}`);
      const json = await res.json();
      if (json.success) {
        setSellersData(json.sellers || []);
      }
    } catch (err) {
      console.error("Error cargando metas y ventas de vendedores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesAndTargets();
  }, [clientId, monthYear]);



  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !targetAmountInput) return;

    try {
      setSavingTarget(true);
      const res = await fetch(`/api/clients/${clientId}/sales-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmpId,
          target_amount: parseFloat(targetAmountInput),
          month_year: monthYear
        })
      });
      const json = await res.json();
      if (json.success) {
        // Sincronizar automáticamente como tarea en el perfil del empleado
        await fetch(`/api/clients/${clientId}/employees/${selectedEmpId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `🎯 Meta Mensual de Ventas (${monthYear}): ${formatCOP(parseFloat(targetAmountInput))}`,
            description: `Meta oficial asignada para el período ${monthYear}. Superar el 100% otorga un bono del 20% adicional sobre comisiones.`,
            created_by_name: 'Administración'
          })
        });

        setIsModalOpen(false);
        setTargetAmountInput('');
        fetchSalesAndTargets();
      } else {
        alert(json.error || 'Error asignando meta.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSavingTarget(false);
    }
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(amount);
  };

  const totalStoreSales = sellersData.reduce((sum, s) => sum + s.sales_amount, 0);
  const totalStoreTargets = sellersData.reduce((sum, s) => sum + s.target_amount, 0);
  const overallPct = totalStoreTargets > 0 ? Math.round((totalStoreSales / totalStoreTargets) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Filtros por Fecha */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">groups</span>
            Ventas por Vendedor & Asignación de Metas
          </h2>
          <p className="text-xs text-on-surface-variant opacity-75">
            Monitorea el rendimiento individual, comisiones y nivel de cumplimiento de metas mensuales del equipo.
          </p>
        </div>

        {/* Filtro Mes / Año */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-on-surface-variant">Período:</label>
          <input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface font-bold outline-none"
          />
        </div>
      </div>

      {/* KPI Consolidado del Equipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Ventas Totales del Vendedor</p>
            <p className="text-xl font-black text-primary mt-1">{formatCOP(totalStoreSales)}</p>
          </div>
          <span className="material-symbols-outlined text-primary text-[32px]">point_of_sale</span>
        </div>

        <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Meta Total Asignada</p>
            <p className="text-xl font-black text-amber-400 mt-1">{formatCOP(totalStoreTargets)}</p>
          </div>
          <span className="material-symbols-outlined text-amber-400 text-[32px]">flag</span>
        </div>

        <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Cumplimiento Global</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{overallPct}%</p>
          </div>
          <span className="material-symbols-outlined text-emerald-400 text-[32px]">trending_up</span>
        </div>
      </div>

      {/* Tabla de Rendimiento por Vendedor */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sellersData.length === 0 ? (
        <div className="p-12 text-center bg-surface-container/30 border border-outline/10 rounded-2xl space-y-2">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] opacity-40">badge</span>
          <p className="text-sm font-bold text-on-surface">No hay vendedores o colaboradores en la nómina para este período</p>
          <p className="text-xs text-on-surface-variant opacity-75">Los colaboradores registrados en el módulo de Administración de Personal aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">badge</span>
              Desglose Individual de Rendimiento
            </h3>
            <span className="text-[11px] font-mono text-on-surface-variant">Período: {monthYear}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline/10 text-on-surface-variant uppercase font-bold tracking-wider">
                  <th className="py-3 px-2">Vendedor / Colaborador</th>
                  <th className="py-3 px-2 text-right">Ventas ($ COP)</th>
                  <th className="py-3 px-2 text-right">Meta Asignada</th>
                  <th className="py-3 px-2 text-center">Avance (%)</th>
                  <th className="py-3 px-2 text-right">Comisión + Bono</th>
                  <th className="py-3 px-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sellersData.map((s) => (
                  <tr key={s.employee_id} className="border-b border-outline/5 hover:bg-surface-variant/20 transition">
                    <td className="py-3.5 px-2">
                      <p className="font-bold text-on-surface">{s.employee_name}</p>
                      <span className="text-[10px] text-primary font-mono uppercase">{s.role}</span>
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono font-bold text-primary">
                      {formatCOP(s.sales_amount)}
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono font-bold text-amber-400">
                      {s.target_amount > 0 ? formatCOP(s.target_amount) : 'Sin Asignar'}
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-24 bg-surface-container-highest h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, s.achievement_pct)}%` }}
                            className={`h-full rounded-full transition-all ${
                              s.achievement_pct >= 100 ? 'bg-emerald-400' : 'bg-primary'
                            }`}
                          />
                        </div>
                        <span className={`font-mono font-bold text-xs ${s.achievement_pct >= 100 ? 'text-emerald-400' : 'text-on-surface'}`}>
                          {s.achievement_pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono">
                      <span className="font-bold text-emerald-400 block">{formatCOP(s.commissions_earned + s.bonus_earned)}</span>
                      {s.bonus_earned > 0 && <span className="text-[9px] text-emerald-400 font-bold">¡Bono 100%+!</span>}
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmpId(s.employee_id);
                          setSelectedEmpName(s.employee_name);
                          setTargetAmountInput(s.target_amount > 0 ? s.target_amount.toString() : '');
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[11px] font-bold hover:bg-primary/20 transition cursor-pointer"
                      >
                        🎯 Asignar Meta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Asignar Meta de Ventas */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-highest border border-outline/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
              <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">flag</span>
                Asignar Meta Mensual de Ventas
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">Vendedor / Colaborador</label>
                <input
                  type="text"
                  disabled
                  value={selectedEmpName}
                  className="w-full bg-surface-container/50 border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none opacity-80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">Meta Mensual de Ventas ($ COP)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ej. 15000000"
                  value={targetAmountInput}
                  onChange={(e) => setTargetAmountInput(e.target.value)}
                  className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface font-mono outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline/20 text-on-surface font-bold text-xs rounded-xl cursor-pointer hover:bg-surface-container-high"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl cursor-pointer shadow hover:opacity-90"
                >
                  {savingTarget ? 'Guardando...' : 'Guardar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
