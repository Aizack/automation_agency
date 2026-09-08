import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface SaaSErpCashShiftsProps {
  clientId: string;
}

interface CashShift {
  id: string;
  employee_out_name: string;
  employee_in_name: string;
  start_time: string;
  end_time: string;
  initial_cash: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_transfer_sales: number;
  total_sales: number;
  reported_cash_in_drawer: number;
  cash_difference: number;
  status: 'pending_confirmation' | 'confirmed' | 'disputed';
  notes?: string;
  confirmed_at?: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  last_name?: string;
  role?: string;
}

export const SaaSErpCashShifts: React.FC<SaaSErpCashShiftsProps> = ({ clientId }) => {
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Form states
  const [employeeOutId, setEmployeeOutId] = useState('');
  const [employeeOutName, setEmployeeOutName] = useState('');
  const [employeeInId, setEmployeeInId] = useState('');
  const [employeeInName, setEmployeeInName] = useState('');
  const [initialCash, setInitialCash] = useState('50000'); // Base inicial típica en caja
  const [reportedCashInDrawer, setReportedCashInDrawer] = useState('');
  const [notes, setNotes] = useState('');

  const token = localStorage.getItem('auth_token');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, empRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/cash-shifts`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/clients/${clientId}/employees`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const shiftsData = await shiftsRes.json();
      const empData = await empRes.json();

      if (shiftsData.success) setShifts(shiftsData.shifts || []);
      if (empData.success) setEmployees(empData.employees || []);
    } catch (err) {
      console.error("Error al cargar arqueos de caja:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Cargar por defecto la persona que entrega tomando los datos de la sesión actual
    const storedEmpName = localStorage.getItem('employee_name') || localStorage.getItem('user_name') || '';
    const storedEmpId = localStorage.getItem('employee_id') || '';
    if (storedEmpName) {
      setEmployeeOutName(storedEmpName);
      setEmployeeOutId(storedEmpId);
    }
  }, [clientId]);

  const handleCreateShiftHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeOutName || !employeeInName || !reportedCashInDrawer) {
      alert("Por favor diligencia el nombre del empleado saliente, el empleado que recibe y el dinero físico contado en caja.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/cash-shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeOutId,
          employeeOutName,
          employeeInId,
          employeeInName,
          initialCash: parseFloat(initialCash) || 0,
          reportedCashInDrawer: parseFloat(reportedCashInDrawer) || 0,
          notes,
          pcTimestamp: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Cierre de turno enviado a ${employeeInName} para confirmación de cuentas claras.`);
        setIsFormOpen(false);
        setReportedCashInDrawer('');
        setNotes('');
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error al entregar caja.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShift = async (shiftId: string) => {
    try {
      setConfirmingId(shiftId);
      const res = await fetch(`/api/clients/${clientId}/cash-shifts/${shiftId}/confirm`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ ¡Cuentas claras confirmadas! Turno de caja cerrado y entregado con éxito.");
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error al confirmar cuentas claras.");
    } finally {
      setConfirmingId(null);
    }
  };

  const formatCOP = (amt: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amt);
  };

  const pendingShifts = shifts.filter(s => s.status === 'pending_confirmation');

  return (
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header Editorial Wabi-Sabi */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            CONTROL DE CAJA & TURNOS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#161616] tracking-tight leading-none flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D9381E] text-[28px]">point_of_sale</span>
            Arqueo & Relevo de Caja Diario
          </h2>
          <p className="text-xs text-[#76746E] mt-2">
            Mantiene las cuentas claras entre turnos de empleados (Entrega de caja, ventas registradas y confirmación del relevo).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            className="h-9 px-3.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] rounded-none flex items-center justify-center transition cursor-pointer text-xs font-mono font-bold uppercase tracking-wider shadow-xs"
            title="Refrescar arqueos"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#D9381E]">refresh</span>
            Refrescar
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="h-9 px-4 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer border-0 uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
            Entregar Caja / Turno
          </button>
        </div>
      </div>

      {/* Alerta de Cierres Pendientes por Confirmar */}
      {pendingShifts.length > 0 && (
        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-5 rounded-none space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-[#D9381E] font-mono font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">notification_important</span>
            Tienes {pendingShifts.length} Arqueo(s) de Caja Pendiente(s) de Confirmación
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingShifts.map((shift) => (
              <div key={shift.id} className="bg-white border border-[#E2DFD7] p-4 rounded-none space-y-2 text-xs shadow-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#161616] font-serif text-sm">{shift.employee_out_name} ➔ {shift.employee_in_name}</span>
                  <span className="text-[#D9381E] font-mono text-[11px]">{new Date(shift.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#76746E] bg-[#FAF8F5] p-2.5 border border-[#E2DFD7]">
                  <div>Ventas Efectivo: <strong className="text-[#161616]">{formatCOP(shift.total_cash_sales)}</strong></div>
                  <div>Efectivo Contado: <strong className="text-[#161616]">{formatCOP(shift.reported_cash_in_drawer)}</strong></div>
                  <div className="col-span-2 flex justify-between border-t border-[#E2DFD7] pt-1.5 mt-0.5">
                    <span>Diferencia de Caja:</span>
                    <span className={shift.cash_difference < 0 ? 'text-[#C5221F] font-bold' : 'text-[#137333] font-bold'}>
                      {formatCOP(shift.cash_difference)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleConfirmShift(shift.id)}
                  disabled={confirmingId === shift.id}
                  className="w-full py-2 bg-[#137333] hover:bg-[#0f5b28] text-white font-mono font-bold text-xs rounded-none transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-xs disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {confirmingId === shift.id ? 'Confirmando...' : 'Confirmar Cuentas Claras y Recibir Caja'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de Turnos y Arqueos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E2DFD7] rounded-none">
          <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando arqueos de caja...</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white border border-[#E2DFD7] rounded-none p-16 text-center space-y-3 shadow-xs">
          <span className="material-symbols-outlined text-[#76746E]/40 text-[48px]">receipt_long</span>
          <p className="font-serif text-sm font-bold text-[#161616]">No hay registros de arqueos de caja en este local.</p>
          <p className="text-xs text-[#76746E] max-w-md mx-auto">
            Usa el botón "Entregar Caja" al finalizar cada turno para cuadrar el dinero en efectivo con las ventas registradas.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2DFD7] rounded-none overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[10px] font-mono text-[#76746E] uppercase font-bold tracking-wider">
                <th className="p-3.5">Fecha / Hora</th>
                <th className="p-3.5">Entrega (Sale ➔ Recibe)</th>
                <th className="p-3.5">Base Inicial</th>
                <th className="p-3.5">Ventas Efectivo</th>
                <th className="p-3.5">Dinero Físico Contado</th>
                <th className="p-3.5">Diferencia</th>
                <th className="p-3.5">Estado Cuentas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="p-3.5 font-mono text-xs text-[#76746E]">
                    {new Date(shift.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} {new Date(shift.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3.5">
                    <p className="font-serif font-bold text-[#161616] text-sm">{shift.employee_out_name} ➔ {shift.employee_in_name}</p>
                    {shift.notes && <p className="text-[10px] text-[#76746E] italic truncate max-w-xs">{shift.notes}</p>}
                  </td>
                  <td className="p-3.5 font-mono text-xs text-[#161616]">{formatCOP(shift.initial_cash)}</td>
                  <td className="p-3.5 font-mono text-xs font-bold text-[#D9381E]">{formatCOP(shift.total_cash_sales)}</td>
                  <td className="p-3.5 font-mono text-xs text-[#161616]">{formatCOP(shift.reported_cash_in_drawer)}</td>
                  <td className="p-3.5 font-mono font-bold text-xs">
                    <span className={shift.cash_difference < 0 ? 'text-[#C5221F]' : shift.cash_difference > 0 ? 'text-[#137333]' : 'text-[#137333]'}>
                      {shift.cash_difference === 0 ? 'Exacto ($0)' : formatCOP(shift.cash_difference)}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {shift.status === 'confirmed' ? (
                      <span className="px-2.5 py-1 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        Cuentas Claras
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FEF7E0] text-[#B45309] border border-[#FDE68A] flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Arqueo y Cierre de Caja */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto text-left">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">CONTROL DE CAJA</span>
                <h3 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9381E]">point_of_sale</span>
                  Arqueo & Relevo de Caja
                </h3>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-[#76746E] hover:text-[#161616] bg-transparent border-0 cursor-pointer p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateShiftHandover} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Empleado Saliente (Entrega) *
                  </label>
                  {employees.length > 0 ? (
                    <select
                      value={employeeOutName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setEmployeeOutName(name);
                        const emp = employees.find(m => `${m.name} ${m.last_name || ''}`.trim() === name);
                        setEmployeeOutId(emp ? emp.id : '');
                      }}
                      className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                      required
                    >
                      <option value="">Seleccionar Empleado...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={`${emp.name} ${emp.last_name || ''}`.trim()}>
                          {emp.name} {emp.last_name || ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ej: Trabajador 1"
                      value={employeeOutName}
                      onChange={(e) => setEmployeeOutName(e.target.value)}
                      className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                      required
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Empleado Entrante (Releva) *
                  </label>
                  {employees.length > 0 ? (
                    <select
                      value={employeeInName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setEmployeeInName(name);
                        const emp = employees.find(m => `${m.name} ${m.last_name || ''}`.trim() === name);
                        setEmployeeInId(emp ? emp.id : '');
                      }}
                      className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                      required
                    >
                      <option value="">Seleccionar Empleado...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={`${emp.name} ${emp.last_name || ''}`.trim()}>
                          {emp.name} {emp.last_name || ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ej: Trabajador 2"
                      value={employeeInName}
                      onChange={(e) => setEmployeeInName(e.target.value)}
                      className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Base Inicial de Caja ($ COP)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 50000"
                    value={initialCash}
                    onChange={(e) => setInitialCash(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Efectivo Físico Contado en Caja *
                  </label>
                  <input
                    type="number"
                    placeholder="Dinero contado..."
                    value={reportedCashInDrawer}
                    onChange={(e) => setReportedCashInDrawer(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Observaciones o Justificación de Novedades
                </label>
                <textarea
                  placeholder="Ej: Se compraron $10.000 de papelería en efectivo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold text-xs rounded-none hover:bg-[#FAF8F5] cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors cursor-pointer border-0 flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Enviar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
