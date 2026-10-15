import React, { useState, useEffect } from 'react';
import { authFetch as fetch, getStoredToken } from '../utils/api';
import { formatLocalDate, formatLocalTime, getClientTimeZone } from '../utils/dateTime';

interface SaaSErpCashShiftsProps {
  clientId: string;
}

interface CashShift {
  id: string;
  opened_by_name?: string;
  closed_by_name?: string;
  employee_out_name?: string;
  employee_in_name?: string;
  shift_date?: string;
  start_time: string;
  end_time?: string;
  initial_cash: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_transfer_sales: number;
  total_sales: number;
  cash_expenses?: number;
  expected_cash?: number;
  reported_cash_in_drawer: number;
  cash_difference: number;
  status: 'open' | 'closed' | 'pending_confirmation' | 'confirmed' | 'disputed';
  notes?: string;
  confirmed_at?: string;
  created_at: string;
}

interface CurrentShiftData extends CashShift {
  live_cash_sales: number;
  live_card_sales: number;
  live_transfer_sales: number;
  live_total_sales: number;
  live_cash_expenses: number;
  live_expected_cash: number;
}

interface Employee {
  id: string;
  name: string;
  last_name?: string;
  role?: string;
  allowed_modules?: string[];
  is_active?: boolean;
}

export const SaaSErpCashShifts: React.FC<SaaSErpCashShiftsProps> = ({ clientId: rawClientId }) => {
  const clientId = (rawClientId && rawClientId !== 'undefined' && rawClientId !== 'admin')
    ? rawClientId
    : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
  const token = getStoredToken() || '';
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Sesión activa (usuario que inició sesión)
  const activeUserName = localStorage.getItem('session_name') || sessionStorage.getItem('session_name') || localStorage.getItem('employee_name') || localStorage.getItem('user_name') || '';

  // Estado de caja actual
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<CurrentShiftData | null>(null);

  // Modales
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Form states: Inicio de Caja (Apertura)
  const [openResponsibleName, setOpenResponsibleName] = useState(activeUserName);
  const [openInitialBase, setOpenInitialBase] = useState('50000');
  const [openNotes, setOpenNotes] = useState('');

  // Form states: Cierre de Caja (Arqueo)
  const [closeResponsibleName, setCloseResponsibleName] = useState(activeUserName);
  const [closeReportedCash, setCloseReportedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Form states: Relevo empleado a empleado (legado)
  const [employeeOutName, setEmployeeOutName] = useState(activeUserName);
  const [employeeInName, setEmployeeInName] = useState('');
  const [handoverInitialCash, setHandoverInitialCash] = useState('50000');
  const [handoverReportedCash, setHandoverReportedCash] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  const [clientTimeZone, setClientTimeZone] = useState<string>(() => localStorage.getItem('client_timezone') || 'America/Bogota');

  const fetchData = async () => {
    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // 1. Cargar arqueos y estado actual prioritariamente
      const shiftsPromise = fetch(`/api/clients/${clientId}/cash-shifts`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : { success: false })
        .catch(() => ({ success: false }));

      const currentPromise = fetch(`/api/clients/${clientId}/cash-shifts/current`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : { success: false })
        .catch(() => ({ success: false }));

      // 2. Cargar empleados y perfil en paralelo protegido
      const auxPromise = Promise.allSettled([
        fetch(`/api/clients/${clientId}/employees`, { signal: controller.signal }).then(r => r.ok ? r.json() : { success: false }),
        fetch(`/api/clients/${clientId}`, { signal: controller.signal }).then(r => r.ok ? r.json() : { success: false })
      ]);

      const [shiftsData, currentData] = await Promise.all([shiftsPromise, currentPromise]);
      clearTimeout(timeoutId);

      if (shiftsData && shiftsData.success) {
        setShifts(shiftsData.shifts || []);
      }
      if (currentData && currentData.success) {
        setIsShiftOpen(Boolean(currentData.isOpen));
        setCurrentShift(currentData.currentShift || null);
      }

      // Desactivar spinner de inmediato para mostrar la caja
      setLoading(false);

      const auxResults = await auxPromise;
      const empData = auxResults[0].status === 'fulfilled' ? auxResults[0].value : { success: false };
      const clientData = auxResults[1].status === 'fulfilled' ? auxResults[1].value : { success: false };

      if (empData?.success) setEmployees(empData.employees || []);
      if (clientData?.success && clientData.data) {
        if (clientData.data.country) {
          localStorage.setItem('client_country', clientData.data.country);
        }
        const resolvedTz = clientData.data.timezone || (clientData.data.country ? getClientTimeZone(clientData.data.country) : 'America/Bogota');
        setClientTimeZone(resolvedTz);
        localStorage.setItem('client_timezone', resolvedTz);
      }
    } catch (err) {
      console.error("Error al cargar arqueos de caja:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const resolvedName = localStorage.getItem('session_name') || sessionStorage.getItem('session_name') || localStorage.getItem('employee_name') || localStorage.getItem('user_name') || '';
    if (resolvedName) {
      setOpenResponsibleName(resolvedName);
      setCloseResponsibleName(resolvedName);
      setEmployeeOutName(resolvedName);
    }
  }, [clientId]);

  // Filtrar solo empleados activos que tengan permiso para el módulo de caja ('arqueo_caja')
  const cashEligibleEmployees = employees.filter((emp) => {
    if (emp.is_active === false) return false;
    if (!emp.allowed_modules || !Array.isArray(emp.allowed_modules)) {
      // Si no tiene restricciones o es admin/sin lista explícita, se permite
      return true;
    }
    // Si tiene array de módulos, verificar si incluye 'arqueo_caja' o rol de administración
    return emp.allowed_modules.includes('arqueo_caja') || emp.allowed_modules.includes('all') || (emp.role && emp.role.toLowerCase().includes('admin'));
  });

  // Apertura de caja
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openResponsibleName.trim()) {
      alert("Por favor indica el nombre del responsable de apertura.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/cash-shifts/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          openedByName: openResponsibleName.trim(),
          initialCash: parseFloat(openInitialBase) || 0,
          notes: openNotes,
          pcTimestamp: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Caja del día iniciada con éxito.");
        setIsOpenModalOpen(false);
        setOpenNotes('');
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error al abrir caja.");
    } finally {
      setLoading(false);
    }
  };

  // Cierre de caja
  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeResponsibleName.trim() || closeReportedCash === '') {
      alert("Por favor indica el responsable del cierre y el dinero físico contado en caja.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/cash-shifts/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          closedByName: closeResponsibleName.trim(),
          reportedCashInDrawer: parseFloat(closeReportedCash) || 0,
          notes: closeNotes,
          pcTimestamp: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Caja cerrada y arqueo diario registrado con éxito.");
        setIsCloseModalOpen(false);
        setCloseReportedCash('');
        setCloseNotes('');
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error al cerrar caja.");
    } finally {
      setLoading(false);
    }
  };

  // Relevo de caja (empleado a empleado)
  const handleCreateShiftHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeOutName || !employeeInName || !handoverReportedCash) {
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
          employeeOutName,
          employeeInName,
          initialCash: parseFloat(handoverInitialCash) || 0,
          reportedCashInDrawer: parseFloat(handoverReportedCash) || 0,
          notes: handoverNotes,
          pcTimestamp: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Cierre de turno enviado a ${employeeInName} para confirmación de cuentas claras.`);
        setIsHandoverModalOpen(false);
        setHandoverReportedCash('');
        setHandoverNotes('');
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
        alert("✅ ¡Cuentas claras confirmadas! Turno de caja confirmado con éxito.");
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

  const formatCOP = (amt: number | string | undefined) => {
    const num = typeof amt === 'string' ? parseFloat(amt) : (amt || 0);
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
  };

  const pendingShifts = shifts.filter(s => s.status === 'pending_confirmation');

  return (
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header Editorial Wabi-Sabi */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            CONTROL DE CAJA & ARQUEO DIARIO
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#161616] tracking-tight leading-none flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D9381E] text-[28px]">point_of_sale</span>
            Arqueo & Control de Caja Diario
          </h2>
          <p className="text-xs text-[#76746E] mt-2">
            Apertura del día, ventas en efectivo, gastos operativos, arqueo final y registro de auditoría diaria.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={fetchData}
            className="h-9 px-3.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] rounded-none flex items-center justify-center transition cursor-pointer text-xs font-mono font-bold uppercase tracking-wider shadow-xs"
            title="Refrescar estado de caja"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#D9381E]">refresh</span>
            Refrescar
          </button>

          {!isShiftOpen ? (
            <button
              onClick={() => {
                setOpenInitialBase('50000');
                setIsOpenModalOpen(true);
              }}
              className="h-9 px-4 bg-[#137333] hover:bg-[#0f5b28] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer border-0 uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[16px]">lock_open</span>
              Iniciar Caja del Día
            </button>
          ) : (
            <button
              onClick={() => {
                setCloseReportedCash(currentShift?.live_expected_cash ? String(currentShift.live_expected_cash) : '');
                setIsCloseModalOpen(true);
              }}
              className="h-9 px-4 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer border-0 uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
              Cerrar Caja / Arqueo del Día
            </button>
          )}

          <button
            onClick={() => setIsHandoverModalOpen(true)}
            className="h-9 px-3 bg-white hover:bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] border border-[#E2DFD7] font-mono font-bold text-xs rounded-none shadow-xs transition-colors flex items-center gap-1 cursor-pointer uppercase tracking-wider"
            title="Relevar turno entre dos empleados"
          >
            <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
            Relevo
          </button>
        </div>
      </div>

      {/* Banner de Estado Actual de Caja */}
      {isShiftOpen && currentShift ? (
        <div className="bg-white border-2 border-[#137333]/30 p-5 rounded-none shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2DFD7] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E6F4EA] border border-[#CEEAD6] flex items-center justify-center text-[#137333]">
                <span className="material-symbols-outlined text-[24px]">savings</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#E6F4EA] text-[#137333] font-mono font-bold text-[10px] uppercase tracking-wider border border-[#CEEAD6]">
                    ● Caja Abierta
                  </span>
                  <span className="text-xs text-[#76746E] font-mono">
                    Iniciada: {formatLocalTime(currentShift.start_time)}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-base text-[#161616] mt-1">
                  Responsable: {currentShift.opened_by_name || currentShift.employee_out_name || 'Personal en turno'}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                setCloseReportedCash(String(currentShift.live_expected_cash || ''));
                setIsCloseModalOpen(true);
              }}
              className="h-9 px-4 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border-0 uppercase tracking-wider self-start lg:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              Hacer Cierre y Arqueo Ahora
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
            <div className="bg-[#FAF8F5] p-3 border border-[#E2DFD7]">
              <span className="text-[10px] text-[#76746E] block uppercase font-bold">Base Inicial</span>
              <span className="text-base font-bold text-[#161616]">{formatCOP(currentShift.initial_cash)}</span>
            </div>
            <div className="bg-[#FAF8F5] p-3 border border-[#E2DFD7]">
              <span className="text-[10px] text-[#76746E] block uppercase font-bold">Ventas en Efectivo</span>
              <span className="text-base font-bold text-[#137333]">+{formatCOP(currentShift.live_cash_sales)}</span>
            </div>
            <div className="bg-[#FAF8F5] p-3 border border-[#E2DFD7]">
              <span className="text-[10px] text-[#76746E] block uppercase font-bold">Gastos Efectivo</span>
              <span className="text-base font-bold text-[#C5221F]">-{formatCOP(currentShift.live_cash_expenses)}</span>
            </div>
            <div className="bg-[#FAF8F5] p-3 border border-[#161616]/30">
              <span className="text-[10px] text-[#D9381E] block uppercase font-bold">Efectivo Esperado</span>
              <span className="text-base font-bold text-[#161616]">{formatCOP(currentShift.live_expected_cash)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-5 rounded-none flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-[#E2DFD7] flex items-center justify-center text-[#76746E]">
              <span className="material-symbols-outlined text-[24px]">lock</span>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">
                Estado Actual
              </span>
              <h3 className="font-serif font-bold text-base text-[#161616]">
                Caja Cerrada (Sin turno abierto en este momento)
              </h3>
              <p className="text-xs text-[#76746E] mt-0.5">
                Para registrar la base con la que inicia la jornada, haz clic en "Iniciar Caja del Día".
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setOpenInitialBase('50000');
              setIsOpenModalOpen(true);
            }}
            className="h-9 px-4 bg-[#137333] hover:bg-[#0f5b28] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer border-0 uppercase tracking-wider shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">lock_open</span>
            Iniciar Caja del Día
          </button>
        </div>
      )}

      {/* Alerta de Cierres Pendientes por Confirmar */}
      {pendingShifts.length > 0 && (
        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-5 rounded-none space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-[#D9381E] font-mono font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">notification_important</span>
            Tienes {pendingShifts.length} Relevo(s) de Caja Pendiente(s) de Confirmación
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingShifts.map((shift) => (
              <div key={shift.id} className="bg-white border border-[#E2DFD7] p-4 rounded-none space-y-2 text-xs shadow-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#161616] font-serif text-sm">{shift.employee_out_name} ➔ {shift.employee_in_name}</span>
                  <span className="text-[#D9381E] font-mono text-[11px]">{formatLocalTime(shift.created_at)}</span>
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

      {/* Historial y Registro de Caja Diario */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg text-[#161616] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D9381E] text-[20px]">calendar_today</span>
            Registro Diario de Caja & Arqueos
          </h3>
          <span className="text-xs font-mono text-[#76746E]">Total: {shifts.length} registros</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E2DFD7] rounded-none">
            <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando registro diario de caja...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="bg-white border border-[#E2DFD7] rounded-none p-16 text-center space-y-3 shadow-xs">
            <span className="material-symbols-outlined text-[#76746E]/40 text-[48px]">receipt_long</span>
            <p className="font-serif text-sm font-bold text-[#161616]">No hay registros de caja diaria en este local.</p>
            <p className="text-xs text-[#76746E] max-w-md mx-auto">
              Inicia la jornada haciendo clic en "Iniciar Caja del Día" para fijar la base en efectivo.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E2DFD7] rounded-none overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[10px] font-mono text-[#76746E] uppercase font-bold tracking-wider">
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Horario Turno</th>
                  <th className="p-3.5">Responsables</th>
                  <th className="p-3.5 text-right">Base Inicial</th>
                  <th className="p-3.5 text-right">Ventas Efectivo</th>
                  <th className="p-3.5 text-right">Gastos Efectivo</th>
                  <th className="p-3.5 text-right">Esperado</th>
                  <th className="p-3.5 text-right">Físico Contado</th>
                  <th className="p-3.5 text-right">Diferencia</th>
                  <th className="p-3.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD7]">
                {shifts.map((shift) => {
                  const startTimeStr = formatLocalTime(shift.start_time, clientTimeZone);
                  const endTimeStr = shift.status === 'open' ? 'En curso' : (shift.end_time ? formatLocalTime(shift.end_time, clientTimeZone) : '');
                  const dateStr = formatLocalDate(shift.shift_date || shift.start_time, clientTimeZone);

                  const opener = shift.opened_by_name || shift.employee_out_name || 'Personal';
                  const closer = shift.closed_by_name || shift.employee_in_name || (shift.status === 'open' ? '-' : opener);

                  return (
                    <tr key={shift.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="p-3.5 font-mono text-xs text-[#161616] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-[#76746E] whitespace-nowrap">
                        {startTimeStr} ➔ {endTimeStr}
                      </td>
                      <td className="p-3.5">
                        <p className="font-serif font-bold text-[#161616] text-xs">
                          {opener} {closer && closer !== opener ? `➔ ${closer}` : ''}
                        </p>
                        {shift.notes && <p className="text-[10px] text-[#76746E] italic truncate max-w-xs">{shift.notes}</p>}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-[#161616] text-right">{formatCOP(shift.initial_cash)}</td>
                      <td className="p-3.5 font-mono text-xs font-bold text-[#137333] text-right">+{formatCOP(shift.total_cash_sales)}</td>
                      <td className="p-3.5 font-mono text-xs text-[#C5221F] text-right">-{formatCOP(shift.cash_expenses || 0)}</td>
                      <td className="p-3.5 font-mono text-xs text-[#161616] text-right">{formatCOP(shift.expected_cash || (parseFloat(String(shift.initial_cash || 0)) + parseFloat(String(shift.total_cash_sales || 0))))}</td>
                      <td className="p-3.5 font-mono text-xs font-bold text-[#161616] text-right">
                        {shift.status === 'open' ? '-' : formatCOP(shift.reported_cash_in_drawer)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-xs text-right">
                        {shift.status === 'open' ? (
                          <span className="text-[#76746E] font-normal">-</span>
                        ) : (
                          <span className={shift.cash_difference < 0 ? 'text-[#C5221F]' : shift.cash_difference > 0 ? 'text-[#137333]' : 'text-[#137333]'}>
                            {shift.cash_difference === 0 ? 'Exacto ($0)' : formatCOP(shift.cash_difference)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {shift.status === 'open' ? (
                          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] inline-block">
                            ● Abierta
                          </span>
                        ) : shift.status === 'closed' || shift.status === 'confirmed' ? (
                          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] inline-block">
                            ✓ Cerrada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FEF7E0] text-[#B45309] border border-[#FDE68A] inline-block">
                            ⏳ Relevo Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Iniciar Caja del Día (Apertura) */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none w-full max-w-md shadow-2xl space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#137333] uppercase block font-bold">APERTURA DIARIA</span>
                <h3 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#137333]">lock_open</span>
                  Inicio de Caja del Día
                </h3>
              </div>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-[#76746E] hover:text-[#161616] bg-transparent border-0 cursor-pointer p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleOpenCash} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Responsable de Apertura *
                </label>
                {cashEligibleEmployees.length > 0 ? (
                  <select
                    value={openResponsibleName}
                    onChange={(e) => setOpenResponsibleName(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                    required
                  >
                    <option value="">Seleccionar Responsable...</option>
                    {cashEligibleEmployees.map((emp) => (
                      <option key={emp.id} value={`${emp.name} ${emp.last_name || ''}`.trim()}>
                        {emp.name} {emp.last_name || ''}
                      </option>
                    ))}
                    {openResponsibleName && !cashEligibleEmployees.some(e => `${e.name} ${e.last_name || ''}`.trim() === openResponsibleName) && (
                      <option value={openResponsibleName}>{openResponsibleName} (Usuario de sesión)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={openResponsibleName}
                    onChange={(e) => setOpenResponsibleName(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                    required
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Base Inicial de Caja ($ COP) *
                </label>
                <input
                  type="number"
                  placeholder="Ej: 50000"
                  value={openInitialBase}
                  onChange={(e) => setOpenInitialBase(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-[#76746E] block font-mono">
                  Dinero en billetes y monedas dejado como cambio inicial.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Notas de Apertura (Opcional)
                </label>
                <textarea
                  placeholder="Ej: Inicio de turno mañana con base completa..."
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold text-xs rounded-none hover:bg-[#FAF8F5] cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#137333] hover:bg-[#0f5b28] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors cursor-pointer border-0 flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Iniciar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Cierre y Arqueo de Caja del Día */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar my-auto text-left">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">ARQUEO & CIERRE</span>
                <h3 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9381E]">point_of_sale</span>
                  Cierre de Caja del Día
                </h3>
              </div>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-[#76746E] hover:text-[#161616] bg-transparent border-0 cursor-pointer p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {currentShift && (
              <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-[#76746E]">
                  <span>Base Inicial:</span>
                  <strong className="text-[#161616]">{formatCOP(currentShift.initial_cash)}</strong>
                </div>
                <div className="flex justify-between text-[#137333]">
                  <span>(+) Ventas en Efectivo:</span>
                  <strong>+{formatCOP(currentShift.live_cash_sales)}</strong>
                </div>
                <div className="flex justify-between text-[#C5221F]">
                  <span>(-) Gastos en Efectivo:</span>
                  <strong>-{formatCOP(currentShift.live_cash_expenses)}</strong>
                </div>
                <div className="flex justify-between border-t border-[#E2DFD7] pt-1 text-[#161616] font-bold">
                  <span>(=) Efectivo Total Esperado:</span>
                  <span className="text-[#D9381E]">{formatCOP(currentShift.live_expected_cash)}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCloseCash} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Responsable del Cierre *
                </label>
                {cashEligibleEmployees.length > 0 ? (
                  <select
                    value={closeResponsibleName}
                    onChange={(e) => setCloseResponsibleName(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                    required
                  >
                    <option value="">Seleccionar Responsable...</option>
                    {cashEligibleEmployees.map((emp) => (
                      <option key={emp.id} value={`${emp.name} ${emp.last_name || ''}`.trim()}>
                        {emp.name} {emp.last_name || ''}
                      </option>
                    ))}
                    {closeResponsibleName && !cashEligibleEmployees.some(e => `${e.name} ${e.last_name || ''}`.trim() === closeResponsibleName) && (
                      <option value={closeResponsibleName}>{closeResponsibleName} (Usuario de sesión)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={closeResponsibleName}
                    onChange={(e) => setCloseResponsibleName(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                    required
                  />
                )}
                <span className="text-[10px] text-[#76746E] block font-mono">
                  Puede ser la misma persona que abrió o el administrador a cargo del arqueo.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Efectivo Físico Contado en Caja ($ COP) *
                </label>
                <input
                  type="number"
                  placeholder="Dinero contado en el cajón..."
                  value={closeReportedCash}
                  onChange={(e) => setCloseReportedCash(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono font-bold"
                  required
                />
              </div>

              {/* Diferencia calculada en vivo */}
              {currentShift && closeReportedCash !== '' && !isNaN(parseFloat(closeReportedCash)) && (
                <div className="p-3 border border-[#E2DFD7] bg-white font-mono text-xs flex justify-between items-center">
                  <span>Diferencia Calculada:</span>
                  {(() => {
                    const diff = parseFloat(closeReportedCash) - currentShift.live_expected_cash;
                    return (
                      <span className={`font-bold ${diff < 0 ? 'text-[#C5221F]' : diff > 0 ? 'text-[#137333]' : 'text-[#137333]'}`}>
                        {diff === 0 ? 'Exacto ($0 COP)' : (diff > 0 ? `Sobrante: +${formatCOP(diff)}` : `Faltante: ${formatCOP(diff)}`)}
                      </span>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Observaciones o Justificación de Novedades
                </label>
                <textarea
                  placeholder="Ej: Se entregó el dinero completo en sobre sellado a gerencia..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold text-xs rounded-none hover:bg-[#FAF8F5] cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors cursor-pointer border-0 flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                  Confirmar y Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Relevo entre Empleados (Legado / Entrega de turno) */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto text-left">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">RELEVO DE EMPLEADOS</span>
                <h3 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9381E]">swap_horiz</span>
                  Entrega y Relevo de Turno
                </h3>
              </div>
              <button onClick={() => setIsHandoverModalOpen(false)} className="text-[#76746E] hover:text-[#161616] bg-transparent border-0 cursor-pointer p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateShiftHandover} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Empleado Saliente (Entrega) *
                  </label>
                  {cashEligibleEmployees.length > 0 ? (
                    <select
                      value={employeeOutName}
                      onChange={(e) => setEmployeeOutName(e.target.value)}
                      className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                      required
                    >
                      <option value="">Seleccionar Empleado...</option>
                      {cashEligibleEmployees.map((emp) => (
                        <option key={emp.id} value={`${emp.name} ${emp.last_name || ''}`.trim()}>
                          {emp.name} {emp.last_name || ''}
                        </option>
                      ))}
                      {employeeOutName && !cashEligibleEmployees.some(e => `${e.name} ${e.last_name || ''}`.trim() === employeeOutName) && (
                        <option value={employeeOutName}>{employeeOutName} (Usuario de sesión)</option>
                      )}
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
                  {cashEligibleEmployees.length > 0 ? (
                    <select
                      value={employeeInName}
                      onChange={(e) => setEmployeeInName(e.target.value)}
                      className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                      required
                    >
                      <option value="">Seleccionar Empleado con Permiso...</option>
                      {cashEligibleEmployees
                        .filter(emp => `${emp.name} ${emp.last_name || ''}`.trim() !== employeeOutName)
                        .map((emp) => (
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
                    value={handoverInitialCash}
                    onChange={(e) => setHandoverInitialCash(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Efectivo Físico Contado *
                  </label>
                  <input
                    type="number"
                    placeholder="Dinero contado..."
                    value={handoverReportedCash}
                    onChange={(e) => setHandoverReportedCash(e.target.value)}
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
                  placeholder="Ej: Se entregó base y ventas de la mañana..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold text-xs rounded-none hover:bg-[#FAF8F5] cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors cursor-pointer border-0 flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Enviar Relevo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
