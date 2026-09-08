import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface EmployeeSalesTarget {
  employee_id: string;
  employee_name: string;
  role: string;
  target_amount: number;
  sales_amount: number;
  sales_count?: number;
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
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Modal para asignar meta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  const fetchSalesAndTargets = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await fetch(`/api/clients/${clientId}/sales-targets?month_year=${monthYear}`);
      const json = await res.json();
      if (json.success) {
        setSellersData(json.sellers || []);
        if (Array.isArray(json.available_months) && json.available_months.length > 0) {
          setAvailableMonths(json.available_months);
        }
      } else {
        setErrorMessage(json.error || `HTTP ${res.status}: Error recuperando datos de la API.`);
      }
    } catch (err: any) {
      console.error("Error cargando metas y ventas de vendedores:", err);
      setErrorMessage(err?.message || 'Error de conexión con el servidor.');
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

  const monthOptions = React.useMemo(() => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const currentMonthVal = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const listToRender = availableMonths.length > 0 ? [...availableMonths] : [currentMonthVal];

    if (!listToRender.includes(currentMonthVal)) {
      listToRender.unshift(currentMonthVal);
    }

    return listToRender.map((mVal) => {
      const [yearStr, monthStr] = mVal.split('-');
      const mIndex = parseInt(monthStr, 10) - 1;
      const isCurrent = mVal === currentMonthVal;
      const label = `${monthNames[mIndex] || monthStr} ${yearStr}${isCurrent ? ' (Mes Actual)' : ''}`;
      return { value: mVal, label };
    });
  }, [availableMonths]);

  const totalStoreSales = sellersData.reduce((sum, s) => sum + s.sales_amount, 0);
  const totalStoreTargets = sellersData.reduce((sum, s) => sum + s.target_amount, 0);
  const overallPct = totalStoreTargets > 0 ? Math.round((totalStoreSales / totalStoreTargets) * 100) : 0;

  return (
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header Principal Wabi-Sabi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            RENDIMIENTO & INCENTIVOS
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
            Metas & Rendimiento de Ventas
          </h2>
          <p className="text-xs text-[#76746E] mt-1.5">
            Monitorea el desempeño individual, comisiones y nivel de cumplimiento mensual del equipo comercial.
          </p>
        </div>

        {/* Filtro Mes / Año en Dropdown Wabi-Sabi */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono font-bold text-[#76746E] uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#161616]">calendar_month</span>
            Período:
          </label>
          <select
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="bg-white border border-[#E2DFD7] hover:border-[#161616] px-3 py-2 text-xs text-[#161616] font-mono font-bold outline-none cursor-pointer shadow-xs transition"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchSalesAndTargets}
            className="p-2 bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] transition cursor-pointer flex items-center justify-center shadow-xs"
            title="Refrescar datos"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Banner de Diagnóstico de Error SQL / API */}
      {errorMessage && (
        <div className="bg-[#FFF5F5] border border-[#D9381E] p-4 rounded-none flex items-start gap-3 text-[#D9381E] font-mono shadow-xs">
          <span className="material-symbols-outlined text-[22px] shrink-0 mt-0.5">warning</span>
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider">Diagnóstico de Consulta Backend (SQL / API)</h4>
            <p className="text-xs break-all">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* KPI Consolidado del Equipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Ventas Totales del Equipo</span>
          <p className="text-2xl font-bold font-mono text-[#161616] mt-1">{formatCOP(totalStoreSales)}</p>
          <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
            Facturación acumulada en el período
          </p>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Meta Total Asignada</span>
          <p className="text-2xl font-bold font-mono text-[#D9381E] mt-1">{formatCOP(totalStoreTargets)}</p>
          <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
            Suma de metas individuales
          </p>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Cumplimiento Global</span>
          <p className={`text-2xl font-bold font-mono mt-1 ${overallPct >= 100 ? 'text-[#137333]' : 'text-[#161616]'}`}>{overallPct}%</p>
          <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
            {overallPct >= 100 ? '¡Meta global superada!' : 'Avance hacia objetivo mensual'}
          </p>
        </div>
      </div>

      {/* Tabla de Rendimiento por Vendedor */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2DFD7] rounded-none">
          <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando métricas de ventas...</p>
        </div>
      ) : sellersData.length === 0 ? (
        <div className="bg-white border border-[#E2DFD7] p-12 text-center rounded-none shadow-xs space-y-2">
          <span className="material-symbols-outlined text-[#76746E] text-[36px]">badge</span>
          <p className="text-sm font-serif text-[#161616]">No hay colaboradores en la nómina para este período</p>
          <p className="text-xs text-[#76746E] font-mono">Los colaboradores registrados en el módulo de Personal aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2DFD7] p-5 rounded-none space-y-4 shadow-xs">
          <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
            <h3 className="font-serif font-bold text-base text-[#161616] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#161616] text-[20px]">badge</span>
              Desglose Individual de Rendimiento
            </h3>
            <span className="text-xs font-mono text-[#76746E]">Período: <strong className="text-[#161616]">{monthYear}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] uppercase font-mono font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-3">Vendedor / Colaborador</th>
                  <th className="py-3 px-2 text-center">N° Facturas</th>
                  <th className="py-3 px-2 text-right">Ventas ($ COP)</th>
                  <th className="py-3 px-2 text-right">Meta Asignada</th>
                  <th className="py-3 px-3 text-center min-w-[160px]">Avance (%)</th>
                  <th className="py-3 px-2 text-right">Comisión + Bono</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sellersData.map((s) => (
                  <tr key={s.employee_id} className="border-b border-[#E2DFD7] hover:bg-[#FAF8F5] transition">
                    <td className="py-3.5 px-3">
                      <p className="font-serif font-bold text-sm text-[#161616]">{s.employee_name}</p>
                      <span className="text-[10px] text-[#76746E] font-mono uppercase">{s.role}</span>
                    </td>
                    <td className="py-3.5 px-2 text-center font-mono">
                      <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E2DFD7] text-xs font-bold text-[#161616]">
                        {s.sales_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono font-bold text-[#161616]">
                      {formatCOP(s.sales_amount)}
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono font-bold text-[#76746E]">
                      {s.target_amount > 0 ? formatCOP(s.target_amount) : 'Sin Asignar'}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2 justify-center font-mono">
                        <div className="w-20 bg-[#FAF8F5] border border-[#E2DFD7] h-2 rounded-none overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, s.achievement_pct)}%` }}
                            className={`h-full rounded-none transition-all ${
                              s.achievement_pct >= 100 ? 'bg-[#137333]' : 'bg-[#161616]'
                            }`}
                          />
                        </div>
                        <span className={`font-bold text-xs ${s.achievement_pct >= 100 ? 'text-[#137333]' : 'text-[#161616]'}`}>
                          {s.achievement_pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono">
                      <span className="font-bold text-[#137333] block">{formatCOP(s.commissions_earned + s.bonus_earned)}</span>
                      {s.bonus_earned > 0 && <span className="text-[9px] text-[#137333] font-bold">¡Bono 100%+!</span>}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmpId(s.employee_id);
                          setSelectedEmpName(s.employee_name);
                          setTargetAmountInput(s.target_amount > 0 ? s.target_amount.toString() : '');
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] hover:border-[#161616] font-mono font-bold text-[10px] uppercase tracking-wider transition cursor-pointer shadow-xs"
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

      {/* Modal Asignar Meta de Ventas (Teleportado a document.body) */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#F6F4EE] border border-[#161616] max-w-md w-full space-y-4 shadow-2xl p-6 relative z-[100000]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] tracking-widest block">
                  ASIGNACIÓN COMERCIAL
                </span>
                <h4 className="font-serif font-bold text-xl text-[#161616]">
                  Meta Mensual de Ventas
                </h4>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center hover:bg-[#E2DFD7] transition border-0 cursor-pointer text-[#161616]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Vendedor / Colaborador</label>
                <input
                  type="text"
                  disabled
                  value={selectedEmpName}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-mono font-bold outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Meta Mensual de Ventas ($ COP) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ej. 15000000"
                  value={targetAmountInput}
                  onChange={(e) => setTargetAmountInput(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-mono focus:border-[#161616] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] hover:border-[#161616] text-[#161616] bg-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs disabled:opacity-50"
                >
                  {savingTarget ? 'Guardando...' : 'Guardar Meta'}
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
