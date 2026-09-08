import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface Appointment {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_document_number: string;
    crm_customer_id: string | null;
    appointment_date: string; // Formato YYYY-MM-DDTHH:MM:SS
    status: string;
    visit_reason: string;
    visit_reason_details: string | null;
    crm_first_name?: string;
    crm_last_name?: string;
    created_at: string;
}

interface Customer {
    id: string;
    name: string;
    last_name: string;
    document_number: string;
    phone: string;
}

interface SaaSErpAppointmentsProps {
    clientId: string;
}

const formatLocalDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const SaaSErpAppointments: React.FC<SaaSErpAppointmentsProps> = ({ clientId }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Auto-suggest search states
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerDocumentNumber, setCustomerDocumentNumber] = useState('');
    const [crmCustomerId, setCrmCustomerId] = useState<string | null>(null);

    // Separated Date & Time
    const [apptOnlyDate, setApptOnlyDate] = useState('');
    const [apptOnlyTime, setApptOnlyTime] = useState('09:00');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [availabilityMeta, setAvailabilityMeta] = useState<{ blocked: boolean; reason?: string | null; slotDurationMinutes?: number } | null>(null);

    // Block modal state
    const [isBlockOpen, setIsBlockOpen] = useState(false);
    const [blockType, setBlockType] = useState<'day' | 'slot'>('slot');
    const [blockDate, setBlockDate] = useState('');
    const [blockStartTime, setBlockStartTime] = useState('09:00');
    const [blockEndTime, setBlockEndTime] = useState('10:00');
    const [blockReason, setBlockReason] = useState('Bloqueo administrativo');

    // Visit Reasons
    const [visitReason, setVisitReason] = useState('examen_vista');
    const [visitReasonDetails, setVisitReasonDetails] = useState('');

    const [apptStatus, setApptStatus] = useState('scheduled');
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('auth_token');

    // Load appointments
    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setAppointments(json.appointments || []);
            }
        } catch (err) {
            console.error("Error loading appointments:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load CRM customers for suggestion dropdown
    const fetchCustomers = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/crm-customers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setCustomers(json.customers || []);
            }
        } catch (err) {
            console.error("Error loading CRM customers:", err);
        }
    };

    useEffect(() => {
        fetchAppointments();
        fetchCustomers();
    }, [clientId]);

    useEffect(() => {
        const dateValue = formatLocalDateInput(selectedDate);
        fetchAvailability(dateValue);
    }, [selectedDate, clientId]);

    // Handle click outside suggestions dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter customers on-the-fly
    const getFilteredCustomers = () => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return [];
        return customers.filter(c => {
            const fullName = `${c.name} ${c.last_name || ''}`.toLowerCase();
            return fullName.includes(q) || 
                   (c.document_number && c.document_number.includes(q)) ||
                   (c.phone && c.phone.includes(q));
        });
    };

    const handleSelectSuggestion = (cust: Customer) => {
        setCrmCustomerId(cust.id);
        setCustomerName(`${cust.name} ${cust.last_name || ''}`.trim());
        setCustomerPhone(cust.phone);
        setCustomerDocumentNumber(cust.document_number);
        setSearchQuery(`${cust.name} ${cust.last_name || ''}`.trim());
        setShowSuggestions(false);
    };

    // Calendar calculations
    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);

    const prevMonthDays = getDaysInMonth(year, month - 1);
    const calendarDays: { dayNum: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Fill previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dNum = prevMonthDays - i;
        calendarDays.push({
            dayNum: dNum,
            isCurrentMonth: false,
            date: new Date(year, month - 1, dNum)
        });
    }

    // Fill current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({
            dayNum: i,
            isCurrentMonth: true,
            date: new Date(year, month, i)
        });
    }

    // Fill next month padding days to complete grid
    const totalCells = Math.ceil(calendarDays.length / 7) * 7;
    const nextDaysNeeded = totalCells - calendarDays.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
        calendarDays.push({
            dayNum: i,
            isCurrentMonth: false,
            date: new Date(year, month + 1, i)
        });
    }

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    const fetchAvailability = async (date: string) => {
        if (!date) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/appointments/availability?date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setAvailableSlots(json.availableSlots || []);
                setAvailabilityMeta({
                    blocked: Boolean(json.blocked),
                    reason: json.reason || null,
                    slotDurationMinutes: json.slotDurationMinutes
                });
            } else {
                setAvailableSlots([]);
                setAvailabilityMeta({ blocked: true, reason: json.error || 'No hay disponibilidad.' });
            }
        } catch (err) {
            console.error('Error fetching availability:', err);
            setAvailableSlots([]);
            setAvailabilityMeta({ blocked: true, reason: 'No se pudo consultar la disponibilidad.' });
        }
    };

    const handleCreateOpen = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerDocumentNumber('');
        setCrmCustomerId(null);
        setSearchQuery('');
        
        const d = new Date(selectedDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateValue = `${yyyy}-${mm}-${dd}`;
        setApptOnlyDate(dateValue);
        setApptOnlyTime('09:00');
        fetchAvailability(dateValue);
        
        setVisitReason('examen_vista');
        setVisitReasonDetails('');
        setErrorMsg('');
        setIsCreateOpen(true);
    };

    const handleCreateAtSlot = (slot: string) => {
        handleCreateOpen();
        setApptOnlyTime(slot);
    };

    const handleEditOpen = (appt: Appointment) => {
        setSelectedAppt(appt);
        setCustomerName(appt.crm_first_name ? `${appt.crm_first_name} ${appt.crm_last_name || ''}`.trim() : appt.customer_name);
        setCustomerPhone(appt.customer_phone);
        setCustomerDocumentNumber(appt.customer_document_number || '');
        
        const [datePart, timePart] = appt.appointment_date.split('T');
        setApptOnlyDate(datePart || formatLocalDateInput(new Date()));
        setApptOnlyTime(timePart ? timePart.slice(0, 5) : '09:00');
        
        setApptStatus(appt.status || 'scheduled');
        setVisitReason(appt.visit_reason || 'examen_vista');
        setVisitReasonDetails(appt.visit_reason_details || '');
        setErrorMsg('');
        setIsEditOpen(true);
    };

    const handleCreateAppt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName || !customerPhone || !apptOnlyDate || !apptOnlyTime || !customerDocumentNumber) {
            setErrorMsg('Por favor completa Nombre, Teléfono, Documento, Fecha y Hora.');
            return;
        }

        if (availabilityMeta?.blocked && !availableSlots.includes(apptOnlyTime)) {
            setErrorMsg('El horario seleccionado no está disponible para este día. Selecciona otro slot o desbloquea el día.');
            return;
        }

        const combinedDateTime = `${apptOnlyDate}T${apptOnlyTime}:00`;

        try {
            setActionLoading(true);
            setErrorMsg('');
            const res = await fetch(`/api/clients/${clientId}/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    appointment_date: combinedDateTime,
                    customer_document_number: customerDocumentNumber,
                    crm_customer_id: crmCustomerId,
                    visit_reason: visitReason,
                    visit_reason_details: visitReason === 'otros' ? visitReasonDetails : null
                })
            });
            const json = await res.json();
            if (json.success) {
                setIsCreateOpen(false);
                fetchAppointments();
                fetchCustomers();
            } else {
                setErrorMsg(json.error || 'Error al registrar la cita.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditAppt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAppt) return;
        if (!customerName || !customerPhone || !apptOnlyDate || !apptOnlyTime) {
            setErrorMsg('Por favor completa todos los campos requeridos.');
            return;
        }

        const combinedDateTime = `${apptOnlyDate}T${apptOnlyTime}:00`;

        try {
            setActionLoading(true);
            setErrorMsg('');
            const res = await fetch(`/api/clients/${clientId}/appointments/${selectedAppt.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    appointment_date: combinedDateTime,
                    status: apptStatus,
                    visit_reason: visitReason,
                    visit_reason_details: visitReason === 'otros' ? visitReasonDetails : null
                })
            });
            const json = await res.json();
            if (json.success) {
                setIsEditOpen(false);
                fetchAppointments();
            } else {
                setErrorMsg(json.error || 'Error al reprogramar la cita.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteAppt = async () => {
        if (!selectedAppt) return;
        if (!window.confirm(`¿Estás seguro de cancelar definitivamente la cita de ${selectedAppt.customer_name}?`)) return;

        try {
            setActionLoading(true);
            setErrorMsg('');
            const res = await fetch(`/api/clients/${clientId}/appointments/${selectedAppt.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setIsEditOpen(false);
                fetchAppointments();
            } else {
                setErrorMsg(json.error || 'Error al eliminar la cita.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    const formatApptTime = (dateStr: string) => {
        const [, timePart] = dateStr.split('T');
        if (!timePart) return '00:00';
        const [hourStr, minStr] = timePart.split(':');
        const hh = parseInt(hourStr || '0', 10);
        const ampm = hh >= 12 ? 'p.m.' : 'a.m.';
        const hour12 = hh % 12 === 0 ? 12 : hh % 12;
        return `${String(hour12).padStart(2, '0')}:${minStr || '00'} ${ampm}`;
    };

    const formatApptDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [dPart] = dateStr.split('T');
        const [yyyy, mm, dd] = dPart.split('-');
        if (!yyyy || !mm || !dd) return dateStr;
        const localDate = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
        return localDate.toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    };

    const GENERATED_30MIN_SLOTS = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        '17:00', '17:30', '18:00'
    ];

    const isSlotBusy = (dateStr: string, slotTime: string, currentApptId?: string) => {
        return appointments.some(appt => {
            if (currentApptId && appt.id === currentApptId) return false;
            if (appt.status === 'cancelled') return false;
            const [dPart, tPart] = appt.appointment_date.split('T');
            if (dPart !== dateStr) return false;
            const apptTime = tPart ? tPart.slice(0, 5) : '';
            return apptTime === slotTime;
        });
    };

    const getAppointmentsForDay = (date: Date) => {
        const targetStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return appointments.filter(appt => {
            const [datePart] = appt.appointment_date.split('T');
            return datePart === targetStr;
        });
    };

    const handleCreateBlock = async () => {
        try {
            setActionLoading(true);
            const payload: any = {
                blockType,
                reason: blockReason,
                isActive: true
            };

            if (blockType === 'day') {
                payload.targetDate = blockDate || apptOnlyDate || formatLocalDateInput(selectedDate);
            } else {
                payload.targetDate = blockDate || apptOnlyDate || formatLocalDateInput(selectedDate);
                payload.startTime = blockStartTime;
                payload.endTime = blockEndTime;
                if (!payload.targetDate) {
                    throw new Error('Debes seleccionar la fecha del bloqueo.');
                }
            }

            const res = await fetch(`/api/clients/${clientId}/appointments/blocks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setIsBlockOpen(false);
                fetchAppointments();
                const dateValue = (payload.targetDate || formatLocalDateInput(selectedDate));
                fetchAvailability(dateValue);
            } else {
                setErrorMsg(json.error || 'No se pudo registrar el bloqueo.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión al registrar el bloqueo.');
        } finally {
            setActionLoading(false);
        }
    };

    const timeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00'
    ];

    const getAppointmentsForSlot = (date: Date, timeSlot: string) => {
        const targetStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const [slotHour, slotMin] = timeSlot.split(':').map(Number);
        
        return appointments.filter(appt => {
            const [datePart, timePart] = appt.appointment_date.split('T');
            if (datePart !== targetStr) return false;
            
            const [hStr, mStr] = timePart.split(':');
            const h = parseInt(hStr || '0', 10);
            const m = parseInt(mStr || '0', 10);
            
            if (slotMin === 0) {
                return h === slotHour && m >= 0 && m < 30;
            } else {
                return h === slotHour && m >= 30 && m < 60;
            }
        });
    };

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const translateReason = (reason: string) => {
        switch(reason) {
            case 'examen_vista': return 'Examen de Vista';
            case 'venta_lentes': return 'Venta de Lentes';
            case 'otros': return 'Otros';
            default: return 'Consulta';
        }
    };

    const scheduledCount = appointments.filter(a => a.status === 'scheduled').length;
    const completedCount = appointments.filter(a => a.status === 'completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

    return (
        <div className="space-y-6 text-[#161616] font-sans antialiased">
            {/* Header Principal Wabi-Sabi */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
                <div>
                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
                        CITAS & SALUD VISUAL
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
                        Programación de Citas
                    </h2>
                    <p className="text-xs text-[#76746E] mt-1.5">
                        Agenda médica, consultas agendadas por IA y control de disponibilidad horaria.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => { fetchAppointments(); fetchCustomers(); }}
                        className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-white border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-1.5 shadow-xs rounded-none"
                        title="Refrescar Citas"
                    >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Refrescar
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            const defaultDate = formatLocalDateInput(selectedDate);
                            setBlockDate(defaultDate);
                            setBlockType('slot');
                            setBlockStartTime('09:00');
                            setBlockEndTime('10:00');
                            setBlockReason('Bloqueo administrativo');
                            setIsBlockOpen(true);
                        }}
                        className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-white border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-1.5 shadow-xs rounded-none"
                    >
                        <span className="material-symbols-outlined text-[16px]">lock_clock</span>
                        Bloquear Horario
                    </button>
                    <button 
                        type="button"
                        onClick={handleCreateOpen}
                        className="px-4 py-2 bg-[#161616] text-[#F6F4EE] hover:bg-[#2b2b2b] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-xs rounded-none"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Nueva Cita
                    </button>
                </div>
            </div>

            {/* Sub-Navegación / Barra Zen de Pestañas & Métricas Rápidas */}
            <div className="bg-white border border-[#E2DFD7] p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs rounded-none">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => setViewMode('calendar')}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border rounded-none ${
                            viewMode === 'calendar'
                                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                        Calendario Mensual
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border rounded-none ${
                            viewMode === 'list'
                                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                        Lista de Citas ({appointments.length})
                    </button>
                </div>

                <div className="hidden md:flex items-center gap-4 text-xs font-mono text-[#76746E] pr-2">
                    <span>Programadas: <strong className="text-[#161616]">{scheduledCount}</strong></span>
                    <span>•</span>
                    <span>Atendidas: <strong className="text-[#2E7D32]">{completedCount}</strong></span>
                    <span>•</span>
                    <span>Canceladas: <strong className="text-[#D9381E]">{cancelledCount}</strong></span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2DFD7] rounded-none">
                    <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando agenda de citas...</p>
                </div>
            ) : viewMode === 'list' ? (
                /* LIST VIEW MODE WABI-SABI */
                appointments.length === 0 ? (
                    <div className="bg-white border border-[#E2DFD7] p-12 text-center rounded-none shadow-xs space-y-2">
                        <span className="material-symbols-outlined text-[#76746E] text-[36px]">event_busy</span>
                        <p className="text-sm font-mono text-[#76746E] uppercase">No hay citas registradas en el sistema.</p>
                    </div>
                ) : (
                    <div className="bg-white border border-[#E2DFD7] shadow-xs rounded-none overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] text-[10px] uppercase tracking-wider">
                                        <th className="py-3 px-4">Paciente</th>
                                        <th className="py-3 px-4">Documento</th>
                                        <th className="py-3 px-4">Contacto</th>
                                        <th className="py-3 px-4">Fecha & Hora</th>
                                        <th className="py-3 px-4">Motivo</th>
                                        <th className="py-3 px-4">Estado</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2DFD7] bg-white">
                                    {appointments.map((appt) => (
                                        <tr key={appt.id} className="hover:bg-[#FAF8F5] transition-colors">
                                            <td className="py-3 px-4 font-bold text-[#161616]">
                                                {appt.crm_first_name ? `${appt.crm_first_name} ${appt.crm_last_name || ''}`.trim() : appt.customer_name}
                                                {appt.visit_reason_details && (
                                                    <p className="text-[10px] text-[#76746E] font-normal italic mt-0.5 truncate max-w-xs">
                                                        "{appt.visit_reason_details}"
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-[#76746E]">
                                                {appt.customer_document_number || '---'}
                                            </td>
                                            <td className="py-3 px-4 text-[#161616]">
                                                {appt.customer_phone ? `+57 ${appt.customer_phone.replace(/^\+?57\s*/, '')}` : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-[#161616]">
                                                <div>{formatApptDate(appt.appointment_date)}</div>
                                                <div className="text-[11px] text-[#76746E] font-normal">{formatApptTime(appt.appointment_date)}</div>
                                            </td>
                                            <td className="py-3 px-4 text-[#161616]">
                                                <span className="inline-block px-2 py-0.5 bg-[#FAF8F5] border border-[#E2DFD7] text-[10px] uppercase font-bold text-[#161616]">
                                                    {translateReason(appt.visit_reason)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-none ${
                                                    appt.status === 'scheduled' ? 'bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC]' :
                                                    appt.status === 'completed' ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]' :
                                                    'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                                                }`}>
                                                    {appt.status === 'scheduled' ? 'Programada' : appt.status === 'completed' ? 'Atendida' : 'Cancelada'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditOpen(appt)}
                                                    className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] transition cursor-pointer shadow-2xs"
                                                >
                                                    Gestionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                /* CALENDAR VIEW MODE WABI-SABI */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2/3 Grid: Monthly Calendar */}
                    <div className="lg:col-span-2 bg-white border border-[#E2DFD7] shadow-xs rounded-none overflow-hidden flex flex-col">
                        {/* Calendar Month Selector Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-[#FAF8F5] border-b border-[#E2DFD7]">
                            <h3 className="font-serif text-xl font-normal text-[#161616]">
                                {monthNames[month]} {year}
                            </h3>
                            <div className="flex items-center gap-1.5">
                                <button 
                                    type="button"
                                    onClick={prevMonth}
                                    className="w-8 h-8 bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] flex items-center justify-center cursor-pointer transition rounded-none"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={nextMonth}
                                    className="w-8 h-8 bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] flex items-center justify-center cursor-pointer transition rounded-none"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        {/* Weekday Names Header */}
                        <div className="grid grid-cols-7 text-center font-mono text-[10px] uppercase font-bold py-2 bg-[#F6F4EE] border-b border-[#E2DFD7] text-[#76746E]">
                            <div>Dom</div>
                            <div>Lun</div>
                            <div>Mar</div>
                            <div>Mié</div>
                            <div>Jue</div>
                            <div>Vie</div>
                            <div>Sáb</div>
                        </div>

                        {/* Monthly Days Grid */}
                        <div className="grid grid-cols-7 bg-[#E2DFD7] gap-[1px]">
                            {calendarDays.map((cell, idx) => {
                                const dayAppts = getAppointmentsForDay(cell.date);
                                const isToday = new Date().toDateString() === cell.date.toDateString();
                                const isSelected = selectedDate.toDateString() === cell.date.toDateString();
                                const hasAppointments = dayAppts.length > 0;

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedDate(cell.date)}
                                        className={`min-h-[85px] p-2 flex flex-col justify-between transition cursor-pointer ${
                                            isSelected 
                                                ? 'bg-[#FAF8F5] ring-2 ring-[#161616] ring-inset z-10' 
                                                : 'bg-white hover:bg-[#FAF8F5]'
                                        } ${
                                            cell.isCurrentMonth ? 'text-[#161616]' : 'text-[#76746E]/40'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-none ${
                                                isToday 
                                                    ? 'bg-[#161616] text-[#F6F4EE]' 
                                                    : isSelected && !isToday 
                                                        ? 'bg-[#E2DFD7] text-[#161616]' 
                                                        : ''
                                            }`}>
                                                {cell.dayNum}
                                            </span>
                                        </div>
                                        
                                        {/* Color block / count badge */}
                                        {hasAppointments && (
                                            <div className="flex items-center gap-1 bg-[#F6F4EE] text-[#D9381E] border border-[#E2DFD7] font-mono font-bold px-1.5 py-0.5 text-[9px] justify-center mt-1">
                                                <span className="w-1.5 h-1.5 bg-[#D9381E]"></span>
                                                <span>{dayAppts.length} {dayAppts.length === 1 ? 'Cita' : 'Citas'}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right 1/3 Grid: Detailed Agenda for Selected Day */}
                    <div className="bg-white border border-[#E2DFD7] shadow-xs rounded-none p-5 flex flex-col justify-start">
                        <div className="border-b border-[#E2DFD7] pb-3 mb-4 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-[#D9381E] uppercase font-bold font-mono tracking-wider block">Agenda del Día</span>
                                <h3 className="font-serif text-lg font-normal text-[#161616] capitalize mt-0.5">
                                    {formatApptDate(formatLocalDateInput(selectedDate))}
                                </h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => { fetchAppointments(); fetchCustomers(); }}
                                className="w-7 h-7 bg-[#FAF8F5] hover:bg-[#E2DFD7] text-[#161616] rounded-none flex items-center justify-center border border-[#E2DFD7] cursor-pointer transition shrink-0"
                                title="Refrescar agenda diaria"
                            >
                                <span className="material-symbols-outlined text-[14px]">refresh</span>
                            </button>
                        </div>

                        {/* List of hours */}
                        <div className="space-y-2.5 flex-grow overflow-y-auto max-h-[500px] pr-1">
                            {timeSlots.map((slot) => {
                                const slotAppts = getAppointmentsForSlot(selectedDate, slot);
                                return (
                                    <div key={slot} className="flex gap-3 items-start py-1 border-b border-[#E2DFD7]/60 last:border-0">
                                        {/* Hour label */}
                                        <div className="w-11 text-right text-xs font-bold text-[#76746E] font-mono pt-1">
                                            {slot}
                                        </div>

                                        {/* Hour slot content */}
                                        <div className="flex-grow space-y-1.5">
                                            {slotAppts.length > 0 ? (
                                                slotAppts.map((appt) => (
                                                    <div
                                                        key={appt.id}
                                                        onClick={() => handleEditOpen(appt)}
                                                        className="p-2.5 bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] cursor-pointer transition text-left rounded-none shadow-2xs"
                                                    >
                                                        <div className="flex justify-between items-start gap-1">
                                                            <span className="font-bold text-xs text-[#161616] font-mono truncate">
                                                                {appt.crm_first_name ? `${appt.crm_first_name} ${appt.crm_last_name || ''}`.trim() : appt.customer_name}
                                                            </span>
                                                            <span className={`text-[9px] px-1.5 py-0.2 font-mono font-bold uppercase shrink-0 border ${
                                                                appt.status === 'scheduled' ? 'bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC]' :
                                                                appt.status === 'completed' ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]' :
                                                                'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                                                            }`}>
                                                                {appt.status === 'scheduled' ? 'Prog' : appt.status === 'completed' ? 'Atendida' : 'Canc'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-[#D9381E] font-mono font-bold mt-1">
                                                            🏷️ {translateReason(appt.visit_reason)}
                                                        </div>
                                                        {appt.visit_reason_details && (
                                                            <p className="text-[10px] text-[#76746E] italic mt-0.5 truncate">
                                                                "{appt.visit_reason_details}"
                                                            </p>
                                                        )}
                                                        <div className="flex items-center justify-between text-[10px] text-[#76746E] mt-1.5 font-mono border-t border-[#E2DFD7] pt-1">
                                                            <span>📞 +{appt.customer_phone}</span>
                                                            <span>⏰ {formatApptTime(appt.appointment_date)}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCreateAtSlot(slot)}
                                                    className="w-full text-left py-1.5 px-2.5 border border-dashed border-[#E2DFD7] hover:border-[#161616] text-[10px] font-mono text-[#76746E] hover:text-[#161616] cursor-pointer bg-white hover:bg-[#FAF8F5] transition rounded-none"
                                                >
                                                    + Agendar cita a las {slot}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE APPOINTMENT MODAL WABI-SABI */}
            {isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-md w-full rounded-none overflow-hidden p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">AGENDAR CITA</span>
                                <h3 className="font-serif text-xl font-normal text-[#161616]">Nueva Consulta</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] text-xs p-3 rounded-none mb-4 font-mono font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateAppt} className="space-y-4 text-xs font-sans">
                            {/* CRM Auto-suggest search input */}
                            <div className="space-y-1 relative" ref={dropdownRef}>
                                <label className="block text-[10px] font-bold text-[#D9381E] uppercase tracking-wider font-mono">Buscar Paciente en CRM</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76746E] text-[18px]">search</span>
                                    <input 
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCustomerName(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        className="w-full bg-white border border-[#E2DFD7] pl-10 pr-4 py-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none"
                                        placeholder="Nombre, cédula o celular..."
                                    />
                                </div>
                                {showSuggestions && getFilteredCustomers().length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#161616] rounded-none shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#E2DFD7]">
                                        {getFilteredCustomers().map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(c)}
                                                className="w-full text-left p-2.5 hover:bg-[#FAF8F5] text-xs text-[#161616] flex justify-between items-center transition-colors cursor-pointer border-0 bg-transparent font-mono"
                                            >
                                                <div>
                                                    <p className="font-bold text-[#161616]">{c.name} {c.last_name || ''}</p>
                                                    <p className="text-[10px] text-[#76746E]">{c.phone}</p>
                                                </div>
                                                <span className="text-[9px] bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] px-1.5 py-0.5 font-bold uppercase shrink-0">
                                                    CC: {c.document_number}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Cédula / Doc *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={customerDocumentNumber}
                                        onChange={(e) => setCustomerDocumentNumber(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none"
                                        placeholder="Ej: 10203040"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">WhatsApp *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none"
                                        placeholder="Ej: 3001112222"
                                    />
                                </div>
                            </div>

                            {/* Separated Date & Time fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Fecha de Cita *</label>
                                    <input 
                                        type="date"
                                        required
                                        value={apptOnlyDate}
                                        onChange={(e) => {
                                            setApptOnlyDate(e.target.value);
                                            fetchAvailability(e.target.value);
                                        }}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Hora (Slot 30 min) *</label>
                                    <select 
                                        required
                                        value={apptOnlyTime}
                                        onChange={(e) => setApptOnlyTime(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none cursor-pointer"
                                    >
                                        {GENERATED_30MIN_SLOTS.map(slot => {
                                            const busy = isSlotBusy(apptOnlyDate, slot);
                                            const formatted = formatApptTime(`2000-01-01T${slot}:00`);
                                            return (
                                                <option key={slot} value={slot} disabled={busy}>
                                                    {formatted} {busy ? '🔴 (Ocupado)' : '🟢 (Disponible)'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Motivo de Consulta *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'examen_vista', label: 'Examen Vista' },
                                        { key: 'venta_lentes', label: 'Venta Lentes' },
                                        { key: 'otros', label: 'Otros' }
                                    ].map(opt => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setVisitReason(opt.key)}
                                            className={`py-2 px-2 border text-xs font-mono font-bold transition cursor-pointer text-center rounded-none ${
                                                visitReason === opt.key 
                                                    ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]' 
                                                    : 'bg-white border-[#E2DFD7] text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5]'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {visitReason === 'otros' && (
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Descripción del Motivo</label>
                                    <textarea 
                                        rows={2}
                                        value={visitReasonDetails}
                                        onChange={(e) => setVisitReasonDetails(e.target.value)}
                                        placeholder="Ej: Mantenimiento de montura anterior..."
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none resize-none font-mono rounded-none"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2DFD7]">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-[#E2DFD7] text-[#161616] hover:bg-white bg-[#FAF8F5] font-mono font-bold text-xs uppercase cursor-pointer transition rounded-none"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold uppercase text-xs cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50 rounded-none shadow-xs"
                                >
                                    {actionLoading ? 'Guardando...' : 'Crear Cita'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* BLOCK MODAL WABI-SABI */}
            {isBlockOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-md w-full rounded-none overflow-hidden p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">DISPONIBILIDAD</span>
                                <h3 className="font-serif text-xl font-normal text-[#161616]">Bloquear Horario / Día</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsBlockOpen(false)}
                                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs font-sans">
                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Tipo de Bloqueo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBlockType('slot')}
                                        className={`py-2 text-xs font-mono font-bold uppercase border rounded-none ${blockType === 'slot' ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]' : 'bg-white border-[#E2DFD7] text-[#76746E]'}`}
                                    >
                                        Franja Horaria
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBlockType('day')}
                                        className={`py-2 text-xs font-mono font-bold uppercase border rounded-none ${blockType === 'day' ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]' : 'bg-white border-[#E2DFD7] text-[#76746E]'}`}
                                    >
                                        Día Completo
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Fecha</label>
                                <input
                                    type="date"
                                    value={blockDate}
                                    onChange={(e) => setBlockDate(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none cursor-pointer"
                                />
                            </div>

                            {blockType === 'slot' && (
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Hora del Slot</label>
                                    <input
                                        type="time"
                                        value={blockStartTime}
                                        onChange={(e) => setBlockStartTime(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Motivo del Bloqueo</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Mantenimiento, Ausencia médica..."
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-sans rounded-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2DFD7]">
                                <button
                                    type="button"
                                    onClick={() => setIsBlockOpen(false)}
                                    className="px-4 py-2 border border-[#E2DFD7] text-[#161616] hover:bg-white bg-[#FAF8F5] font-mono font-bold text-xs uppercase cursor-pointer transition rounded-none"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateBlock}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold uppercase text-xs cursor-pointer transition disabled:opacity-50 rounded-none shadow-xs"
                                >
                                    {actionLoading ? 'Guardando...' : 'Registrar Bloqueo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* EDIT APPOINTMENT MODAL WABI-SABI */}
            {isEditOpen && selectedAppt && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-md w-full rounded-none overflow-hidden p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">GESTIÓN DE CITA</span>
                                <h3 className="font-serif text-xl font-normal text-[#161616]">Detalle & Reprogramación</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsEditOpen(false)}
                                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] text-xs p-3 rounded-none mb-4 font-mono font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleEditAppt} className="space-y-4 text-xs font-sans">
                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Nombre del Paciente</label>
                                <input 
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Cédula</label>
                                    <input 
                                        type="text"
                                        disabled
                                        value={customerDocumentNumber}
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#76746E] font-mono cursor-not-allowed rounded-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Teléfono WhatsApp *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none"
                                    />
                                </div>
                            </div>

                            {/* Separated Date & Time fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Fecha de Cita *</label>
                                    <input 
                                        type="date"
                                        required
                                        value={apptOnlyDate}
                                        onChange={(e) => setApptOnlyDate(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Hora (Slot 30 min) *</label>
                                    <select 
                                        required
                                        value={apptOnlyTime}
                                        onChange={(e) => setApptOnlyTime(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono rounded-none cursor-pointer"
                                    >
                                        {GENERATED_30MIN_SLOTS.map(slot => {
                                            const busy = isSlotBusy(apptOnlyDate, slot, selectedAppt?.id);
                                            const formatted = formatApptTime(`2000-01-01T${slot}:00`);
                                            return (
                                                <option key={slot} value={slot} disabled={busy}>
                                                    {formatted} {busy ? '🔴 (Ocupado)' : '🟢 (Disponible)'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Estado de la Cita *</label>
                                <select 
                                    value={apptStatus}
                                    onChange={(e) => setApptStatus(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none cursor-pointer font-mono rounded-none"
                                >
                                    <option value="scheduled">Programada / Agendada</option>
                                    <option value="completed">Completada / Atendida</option>
                                    <option value="cancelled">Cancelada / Inasistente</option>
                                </select>
                            </div>

                            {visitReason === 'otros' && (
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Descripción del Motivo</label>
                                    <textarea 
                                        rows={2}
                                        value={visitReasonDetails}
                                        onChange={(e) => setVisitReasonDetails(e.target.value)}
                                        placeholder="Ej: Mantenimiento de montura anterior..."
                                        className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none resize-none font-mono rounded-none"
                                    />
                                </div>
                            )}

                            <div className="flex gap-2 justify-between pt-4 border-t border-[#E2DFD7]">
                                <button 
                                    type="button"
                                    onClick={handleDeleteAppt}
                                    className="px-3.5 py-2 bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] hover:bg-[#C5221F] hover:text-white font-mono font-bold text-xs uppercase cursor-pointer transition rounded-none flex items-center gap-1 shadow-2xs"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    Eliminar
                                </button>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setIsEditOpen(false)}
                                        className="px-4 py-2 border border-[#E2DFD7] text-[#161616] hover:bg-white bg-[#FAF8F5] font-mono font-bold text-xs uppercase cursor-pointer transition rounded-none"
                                    >
                                        Cerrar
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold uppercase text-xs cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50 rounded-none shadow-xs"
                                    >
                                        {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
