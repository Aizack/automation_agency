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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">point_of_sale</span>
            Arqueo & Relevo de Caja Diario
          </h2>
          <p className="text-xs text-on-surface-variant opacity-75">
            Mantiene las cuentas claras entre turnos de empleados (Entrega de caja, ventas registradas y confirmación del relevo).
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg hover:opacity-90 transition flex items-center gap-2 cursor-pointer border-0"
        >
          <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
          Entregar Caja / Cambio de Turno
        </button>
      </div>

      {/* Alerta de Cierres Pendientes por Confirmar */}
      {pendingShifts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <span className="material-symbols-outlined">notification_important</span>
            Tienes {pendingShifts.length} Arqueo(s) de Caja Pendiente(s) de Confirmación
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingShifts.map((shift) => (
              <div key={shift.id} className="bg-surface border border-outline/20 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-on-surface">{shift.employee_out_name} ➔ {shift.employee_in_name}</span>
                  <span className="text-primary font-mono">{new Date(shift.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-on-surface-variant bg-surface-container/40 p-2 rounded-lg">
                  <div>Ventas Efectivo: <strong>{formatCOP(shift.total_cash_sales)}</strong></div>
                  <div>Efectivo Contado: <strong>{formatCOP(shift.reported_cash_in_drawer)}</strong></div>
                  <div className="col-span-2 flex justify-between border-t border-outline/10 pt-1">
                    <span>Diferencia de Caja:</span>
                    <span className={shift.cash_difference < 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                      {formatCOP(shift.cash_difference)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleConfirmShift(shift.id)}
                  disabled={confirmingId === shift.id}
                  className="w-full py-2 bg-green-500 text-black font-bold rounded-lg hover:opacity-90 transition cursor-pointer border-0 flex items-center justify-center gap-1.5"
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
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : shifts.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] opacity-40">receipt_long</span>
          <p className="text-sm text-on-surface-variant">No hay registros de arqueos de caja en este local.</p>
          <p className="text-xs text-on-surface-variant opacity-60 max-w-md mx-auto">
            Usa el botón "Entregar Caja" al finalizar cada turno para cuadrar el dinero en efectivo con las ventas registradas.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-semibold">
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Entrega (Sale ➔ Recibe)</th>
                <th className="p-4">Base Inicial</th>
                <th className="p-4">Ventas Efectivo</th>
                <th className="p-4">Dinero Físico Contado</th>
                <th className="p-4">Diferencia</th>
                <th className="p-4">Estado Cuentas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10 text-sm">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-surface-container/40 transition">
                  <td className="p-4 font-mono text-xs text-on-surface-variant">
                    {new Date(shift.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} {new Date(shift.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-on-surface text-xs">{shift.employee_out_name} ➔ {shift.employee_in_name}</p>
                    {shift.notes && <p className="text-[10px] text-on-surface-variant italic truncate max-w-xs">{shift.notes}</p>}
                  </td>
                  <td className="p-4 font-mono text-xs">{formatCOP(shift.initial_cash)}</td>
                  <td className="p-4 font-mono text-xs font-bold text-primary">{formatCOP(shift.total_cash_sales)}</td>
                  <td className="p-4 font-mono text-xs">{formatCOP(shift.reported_cash_in_drawer)}</td>
                  <td className="p-4 font-mono font-bold text-xs">
                    <span className={shift.cash_difference < 0 ? 'text-red-400' : shift.cash_difference > 0 ? 'text-blue-400' : 'text-green-400'}>
                      {shift.cash_difference === 0 ? 'Exacto ($0)' : formatCOP(shift.cash_difference)}
                    </span>
                  </td>
                  <td className="p-4">
                    {shift.status === 'confirmed' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        Cuentas Claras
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        Pendiente Confirmar
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface border border-outline/20 p-6 rounded-3xl w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">point_of_sale</span>
                Arqueo & Relevo de Caja
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface bg-transparent border-0 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateShiftHandover} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Empleado Saliente (Entrega) *</label>
                  {employees.length > 0 ? (
                    <select
                      value={employeeOutName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setEmployeeOutName(name);
                        const emp = employees.find(m => `${m.name} ${m.last_name || ''}`.trim() === name);
                        setEmployeeOutId(emp ? emp.id : '');
                      }}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary cursor-pointer"
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
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                      required
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Empleado Entrante (Releva) *</label>
                  {employees.length > 0 ? (
                    <select
                      value={employeeInName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setEmployeeInName(name);
                        const emp = employees.find(m => `${m.name} ${m.last_name || ''}`.trim() === name);
                        setEmployeeInId(emp ? emp.id : '');
                      }}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary cursor-pointer"
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
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Base Inicial de Caja (\$ COP)</label>
                  <input
                    type="number"
                    placeholder="Ej: 50000"
                    value={initialCash}
                    onChange={(e) => setInitialCash(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Efectivo Físico Contado en Caja *</label>
                  <input
                    type="number"
                    placeholder="Dinero contado en el cajón..."
                    value={reportedCashInDrawer}
                    onChange={(e) => setReportedCashInDrawer(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Observaciones o Justificación de Novedades</label>
                <textarea
                  placeholder="Ej: Se compraron \$10.000 de papelería en efectivo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline/10">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-outline/20 rounded-xl text-on-surface text-xs hover:bg-surface-container cursor-pointer bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl text-xs hover:opacity-90 transition cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Enviar Cierre a {employeeInName || 'Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
