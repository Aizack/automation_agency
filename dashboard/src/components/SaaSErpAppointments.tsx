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
        setCustomerName(`${cust.name} ${cust.last_name || ''}`);
        setCustomerPhone(cust.phone);
        setCustomerDocumentNumber(cust.document_number);
        setSearchQuery(`${cust.name} ${cust.last_name || ''}`);
        setShowSuggestions(false);
    };

    // Calendar calculations
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

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
                setAvailabilityMeta({ blocked: true, reason: json.error || 'No hay disponibilidad disponible.' });
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

    const handleCreateAtSlot = (timeSlot: string) => {
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
        setApptOnlyTime(timeSlot);
        fetchAvailability(dateValue);
        
        setVisitReason('examen_vista');
        setVisitReasonDetails('');
        setErrorMsg('');
        setIsCreateOpen(true);
    };

    const handleEditOpen = (appt: Appointment) => {
        setSelectedAppt(appt);
        const nameText = appt.crm_first_name 
            ? `${appt.crm_first_name} ${appt.crm_last_name || ''}`.trim()
            : appt.customer_name;
        setCustomerName(nameText);
        setCustomerPhone(appt.customer_phone);
        setCustomerDocumentNumber(appt.customer_document_number || '');
        setCrmCustomerId(appt.crm_customer_id);
        
        // Parse date and time from timezone naive string (e.g. 2026-08-12T09:00:00)
        const [dPart, tPart] = appt.appointment_date.split('T');
        setApptOnlyDate(dPart || '');
        setApptOnlyTime(tPart ? tPart.slice(0, 5) : '09:00');
        
        setVisitReason(appt.visit_reason || 'examen_vista');
        setVisitReasonDetails(appt.visit_reason_details || '');
        setApptStatus(appt.status);
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
                fetchCustomers(); // Reload customer list in case a new customer was auto-created
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
        // Splitting by 'T' to retrieve the local time part safely
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

    return (
        <div className="space-y-6 text-on-surface">
            {/* Header section with view toggles and create action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Agenda de Citas</h2>
                    <p className="text-xs text-on-surface-variant">Consulta las citas establecidas por la IA o prográmalas y edítalas manualmente.</p>
                </div>
                <div className="flex items-center gap-3 self-start md:self-auto">
                    {/* View selector toggle */}
                    <div className="flex bg-[#181a1c] p-1 rounded-md border border-[#2d3036] text-xs">
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition ${viewMode === 'calendar' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            Calendario
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition ${viewMode === 'list' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            Lista
                        </button>
                    </div>

                    <button 
                        onClick={() => { fetchAppointments(); fetchCustomers(); }}
                        className="w-9 h-9 bg-[#181a1c] hover:bg-surface-variant/40 text-on-surface rounded-md flex items-center justify-center border border-[#2d3036] cursor-pointer transition shadow"
                        title="Refrescar Citas"
                    >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
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
                        className="px-3 py-2 border border-[#2d3036] bg-[#181a1c] text-on-surface text-xs font-bold rounded-md cursor-pointer shadow transition"
                    >
                        Bloquear horario
                    </button>
                    <button 
                        onClick={handleCreateOpen}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-md flex items-center gap-1.5 cursor-pointer shadow transition"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Nueva Cita
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : viewMode === 'list' ? (
                /* LIST VIEW MODE */
                appointments.length === 0 ? (
                    <div className="glass-card p-12 text-center rounded-2xl">
                        <p className="text-sm text-on-surface-variant">No hay citas registradas en el sistema.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {appointments.map((appt) => (
                            <div 
                                key={appt.id} 
                                onClick={() => handleEditOpen(appt)}
                                className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:border-primary/50 cursor-pointer transition"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-bold text-on-surface text-base">
                                            {appt.crm_first_name ? `${appt.crm_first_name} ${appt.crm_last_name || ''}` : appt.customer_name}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                            appt.status === 'scheduled' ? 'bg-primary/10 text-primary' : 
                                            appt.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                            {appt.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="space-y-2 mt-4 text-xs text-on-surface-variant">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                                            <span>{formatApptDate(appt.appointment_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                                            <span className="font-bold text-on-surface">{formatApptTime(appt.appointment_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">call</span>
                                            <span className="font-mono">{appt.customer_phone ? `+57 ${appt.customer_phone.replace(/^\+?57\s*/, '')}` : 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-amber-500">label</span>
                                            <span>Motivo: <strong className="text-on-surface">{translateReason(appt.visit_reason)}</strong></span>
                                        </div>
                                        {appt.visit_reason_details && (
                                            <div className="text-[11px] bg-surface-container/50 p-2 rounded-lg italic">
                                                "{appt.visit_reason_details}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="border-t border-outline/10 pt-3 mt-4 text-[9px] text-on-surface-variant/60 font-mono flex justify-between items-center">
                                    <span>Sistema ERP</span>
                                    <span>{new Date(appt.created_at).toLocaleDateString('es-CO')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* CALENDAR VIEW MODE WITH SIDEBAR DETAIL */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2/3 Grid: Monthly Calendar */}
                    <div className="lg:col-span-2 bg-surface-container/30 rounded-2xl overflow-hidden border border-outline/10 flex flex-col">
                        {/* Calendar Month Selector Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-high/20 border-b border-outline/10">
                            <h3 className="font-bold text-base text-on-surface">
                                {monthNames[month]} {year}
                            </h3>
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={prevMonth}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-variant/40 text-on-surface border-0 cursor-pointer transition"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                <button 
                                    onClick={nextMonth}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-variant/40 text-on-surface border-0 cursor-pointer transition"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        {/* Weekday Names Header */}
                        <div className="grid grid-cols-7 text-center font-bold text-xs py-2 bg-surface-container/30 border-b border-outline/10 text-on-surface-variant">
                            <div>Dom</div>
                            <div>Lun</div>
                            <div>Mar</div>
                            <div>Mié</div>
                            <div>Jue</div>
                            <div>Vie</div>
                            <div>Sáb</div>
                        </div>

                        {/* Monthly Days Grid */}
                        <div className="grid grid-cols-7 bg-outline/5 gap-[1px]">
                            {calendarDays.map((cell, idx) => {
                                const dayAppts = getAppointmentsForDay(cell.date);
                                const isToday = new Date().toDateString() === cell.date.toDateString();
                                const isSelected = selectedDate.toDateString() === cell.date.toDateString();
                                const hasAppointments = dayAppts.length > 0;

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedDate(cell.date)}
                                        className={`min-h-[90px] p-2 flex flex-col justify-between transition cursor-pointer border ${
                                            isSelected ? 'ring-2 ring-primary ring-inset z-10 bg-primary/5' : 'bg-surface hover:bg-surface-variant/10'
                                        } ${
                                            cell.isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant/30'
                                        } ${
                                            hasAppointments 
                                                ? 'bg-amber-500/5 border-t-4 border-t-amber-500/80' 
                                                : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                                isToday ? 'bg-primary text-white font-black' : ''
                                            } ${isSelected && !isToday ? 'bg-primary/20 text-primary' : ''}`}>
                                                {cell.dayNum}
                                            </span>
                                        </div>
                                        
                                        {/* Color block / dot indicator instead of showing full appointment boxes inside cell */}
                                        {hasAppointments && (
                                            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded text-[8px] justify-center mt-2 border border-amber-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                                <span>{dayAppts.length} {dayAppts.length === 1 ? 'Cita' : 'Citas'}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right 1/3 Grid: Detailed Agenda for Selected Day */}
                    <div className="glass-card rounded-2xl p-5 border border-outline/10 flex flex-col justify-start bg-surface-container/20">
                        <div className="border-b border-outline/10 pb-4 mb-4 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-primary uppercase font-bold font-mono tracking-wider">Agenda Diaria</span>
                                <h3 className="font-bold text-base text-on-surface capitalize mt-0.5">
                                    {formatApptDate(formatLocalDateInput(selectedDate))}
                                </h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => { fetchAppointments(); fetchCustomers(); }}
                                className="w-7 h-7 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-lg flex items-center justify-center border border-outline/10 cursor-pointer transition shrink-0"
                                title="Refrescar agenda diaria"
                            >
                                <span className="material-symbols-outlined text-[14px]">refresh</span>
                            </button>
                        </div>

                        {/* List of hours */}
                        <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
                            {timeSlots.map((slot) => {
                                const slotAppts = getAppointmentsForSlot(selectedDate, slot);
                                return (
                                    <div key={slot} className="flex gap-4 items-start py-1.5 border-b border-outline/5 last:border-0">
                                        {/* Hour label */}
                                        <div className="w-12 text-right text-xs font-bold text-on-surface-variant font-mono pt-1">
                                            {slot}
                                        </div>

                                        {/* Hour slot content */}
                                        <div className="flex-grow space-y-1.5">
                                            {slotAppts.length > 0 ? (
                                                slotAppts.map((appt) => (
                                                    <div
                                                        key={appt.id}
                                                        onClick={() => handleEditOpen(appt)}
                                                        className={`p-3 rounded-xl border cursor-pointer hover:border-primary transition text-left ${
                                                            appt.status === 'scheduled' ? 'bg-primary/5 border-primary/20 text-on-surface' :
                                                            appt.status === 'completed' ? 'bg-green-500/5 border-green-500/20 text-on-surface' :
                                                            'bg-red-500/5 border-red-500/20 text-on-surface-variant/60'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start gap-1">
                                                            <span className="font-bold text-xs truncate">
                                                                {appt.crm_first_name ? `${appt.crm_first_name} ${appt.crm_last_name || ''}` : appt.customer_name}
                                                            </span>
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                                                appt.status === 'scheduled' ? 'bg-primary/10 text-primary' :
                                                                appt.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                                'bg-red-500/10 text-red-500'
                                                            }`}>
                                                                {appt.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-amber-500 font-bold mt-1">
                                                            🏷️ {translateReason(appt.visit_reason)}
                                                        </div>
                                                        {appt.visit_reason_details && (
                                                            <p className="text-[10px] text-on-surface-variant italic mt-1 truncate">
                                                                "{appt.visit_reason_details}"
                                                            </p>
                                                        )}
                                                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant/80 mt-2 font-mono">
                                                            <span>📞 +{appt.customer_phone}</span>
                                                            <span>⏰ {formatApptTime(appt.appointment_date)}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <button
                                                    onClick={() => handleCreateAtSlot(slot)}
                                                    className="w-full text-left py-2 px-3 border border-dashed border-outline/25 hover:border-primary/50 text-[10px] text-on-surface-variant hover:text-primary rounded-xl cursor-pointer bg-transparent transition"
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

            {/* CREATE APPOINTMENT MODAL */}
            {isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#141517] border border-[#2d3036] max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Agendar Cita Manual</h3>
                            <button 
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl mb-4 font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateAppt} className="space-y-4 text-sm">
                            {/* CRM Auto-suggest search input */}
                            <div className="space-y-1.5 relative" ref={dropdownRef}>
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider ml-1">Buscar Paciente en CRM</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                                    <input 
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCustomerName(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] pl-10 pr-4 py-2.5 rounded-md text-on-surface focus:border-primary outline-none"
                                        placeholder="Escribe nombre, cédula o celular..."
                                    />
                                </div>
                                {showSuggestions && getFilteredCustomers().length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#181a1c] border border-[#2d3036] rounded-md shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#2d3036]">
                                        {getFilteredCustomers().map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(c)}
                                                className="w-full text-left p-3 hover:bg-primary/10 text-xs text-on-surface flex justify-between items-center transition-colors cursor-pointer border-0 bg-transparent"
                                            >
                                                <div>
                                                    <p className="font-semibold">{c.name} {c.last_name || ''}</p>
                                                    <p className="text-[10px] text-on-surface-variant opacity-70">{c.phone}</p>
                                                </div>
                                                <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-md font-mono font-bold uppercase shrink-0">
                                                    C.C.: {c.document_number}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Cédula / Documento</label>
                                    <input 
                                        type="text"
                                        required
                                        value={customerDocumentNumber}
                                        onChange={(e) => setCustomerDocumentNumber(e.target.value)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none font-mono"
                                        placeholder="Ej: 10203040"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Teléfono (WhatsApp)</label>
                                    <input 
                                        type="text"
                                        required
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none font-mono"
                                        placeholder="Ej: 573001112222"
                                    />
                                </div>
                            </div>

                            {/* Separated Date & Time fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Fecha de Cita</label>
                                    <input 
                                        type="date"
                                        required
                                        value={apptOnlyDate}
                                        onChange={(e) => setApptOnlyDate(e.target.value)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Hora de Cita (Slot 30 min)</label>
                                    <select 
                                        required
                                        value={apptOnlyTime}
                                        onChange={(e) => setApptOnlyTime(e.target.value)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none font-mono cursor-pointer"
                                    >
                                        {GENERATED_30MIN_SLOTS.map(slot => {
                                            const busy = isSlotBusy(apptOnlyDate, slot);
                                            const formatted = formatApptTime(`2000-01-01T${slot}:00`);
                                            return (
                                                <option key={slot} value={slot} disabled={busy}>
                                                    {formatted} {busy ? '🔴 (Ocupado / Busy)' : '🟢 (Disponible / Free)'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Visit Reason Labels */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-on-surface-variant">Motivo de la Visita</label>
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
                                            className={`py-2 px-3 rounded-md border text-xs font-bold transition cursor-pointer text-center ${
                                                visitReason === opt.key 
                                                    ? 'bg-primary text-white border-primary shadow' 
                                                    : 'bg-[#181a1c] border-[#2d3036] text-on-surface-variant hover:bg-surface-variant/30'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {visitReason === 'otros' && (
                                <div className="space-y-1 animate-float">
                                    <label className="block text-xs font-bold text-on-surface-variant">Descripción (Detalle del Motivo)</label>
                                    <textarea 
                                        rows={2}
                                        value={visitReasonDetails}
                                        onChange={(e) => setVisitReasonDetails(e.target.value)}
                                        placeholder="Ej: Mantenimiento de montura anterior..."
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none resize-none"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-[#2d3036]">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-[#2d3036] text-on-surface hover:bg-surface-variant/20 rounded-md font-bold cursor-pointer text-xs transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-md font-bold cursor-pointer text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Guardando...' : 'Crear Cita'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {isBlockOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#141517] border border-[#2d3036] max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Bloquear Horario / Día</h3>
                            <button 
                                onClick={() => setIsBlockOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Tipo de bloqueo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBlockType('slot')}
                                        className={`py-2 rounded-xl text-xs font-bold border ${blockType === 'slot' ? 'bg-primary text-white border-primary' : 'bg-surface-container border-outline/20 text-on-surface'}`}
                                    >
                                        Franja Horaria
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBlockType('day')}
                                        className={`py-2 rounded-xl text-xs font-bold border ${blockType === 'day' ? 'bg-primary text-white border-primary' : 'bg-surface-container border-outline/20 text-on-surface'}`}
                                    >
                                        Día completo
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Fecha</label>
                                <input
                                    type="date"
                                    value={blockDate}
                                    onChange={(e) => setBlockDate(e.target.value)}
                                    className="w-full bg-surface-container border border-outline/20 p-2.5 rounded-xl text-xs text-on-surface font-semibold outline-none focus:border-primary"
                                />
                            </div>

                            {blockType === 'slot' && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Hora del Slot</label>
                                    <input
                                        type="time"
                                        value={blockStartTime}
                                        onChange={(e) => setBlockStartTime(e.target.value)}
                                        className="w-full bg-surface-container border border-outline/20 p-2.5 rounded-xl text-xs text-on-surface font-semibold outline-none focus:border-primary"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Motivo / Notas del Bloqueo</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Mantenimiento, Ausencia médica..."
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    className="w-full bg-surface-container border border-outline/20 p-2.5 rounded-xl text-xs text-on-surface outline-none focus:border-primary"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-outline/10">
                                <button
                                    type="button"
                                    onClick={() => setIsBlockOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer text-xs transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateBlock}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer text-xs transition disabled:opacity-50"
                                >
                                    {actionLoading ? 'Guardando...' : 'Registrar bloqueo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* EDIT APPOINTMENT MODAL */}
            {isEditOpen && selectedAppt && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#141517] border border-[#2d3036] max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Gestionar Cita</h3>
                            <button 
                                onClick={() => setIsEditOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl mb-4 font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleEditAppt} className="space-y-4 text-sm">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Nombre del Paciente</label>
                                <input 
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Cédula</label>
                                    <input 
                                        type="text"
                                        disabled
                                        value={customerDocumentNumber}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface font-mono opacity-60 cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Teléfono (WhatsApp)</label>
                                    <input 
                                        type="text"
                                        required
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none font-mono"
                                    />
                                </div>
                            </div>

                            {/* Separated Date & Time fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Fecha de Cita</label>
                                    <input 
                                        type="date"
                                        required
                                        value={apptOnlyDate}
                                        onChange={(e) => setApptOnlyDate(e.target.value)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Hora de Cita (Slot 30 min)</label>
                                    <select 
                                        required
                                        value={apptOnlyTime}
                                        onChange={(e) => setApptOnlyTime(e.target.value)}
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none font-mono cursor-pointer"
                                    >
                                        {GENERATED_30MIN_SLOTS.map(slot => {
                                            const busy = isSlotBusy(apptOnlyDate, slot, selectedAppt?.id);
                                            const formatted = formatApptTime(`2000-01-01T${slot}:00`);
                                            return (
                                                <option key={slot} value={slot} disabled={busy}>
                                                    {formatted} {busy ? '🔴 (Ocupado / Busy)' : '🟢 (Disponible / Free)'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Visit Reason Labels */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-on-surface-variant">Motivo de la Visita</label>
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
                                            className={`py-2 px-3 rounded-md border text-xs font-bold transition cursor-pointer text-center ${
                                                visitReason === opt.key 
                                                    ? 'bg-primary text-white border-primary shadow' 
                                                    : 'bg-[#181a1c] border-[#2d3036] text-on-surface-variant hover:bg-surface-variant/30'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {visitReason === 'otros' && (
                                <div className="space-y-1 animate-float">
                                    <label className="block text-xs font-bold text-on-surface-variant">Descripción (Detalle del Motivo)</label>
                                    <textarea 
                                        rows={2}
                                        value={visitReasonDetails}
                                        onChange={(e) => setVisitReasonDetails(e.target.value)}
                                        placeholder="Ej: Mantenimiento de montura anterior..."
                                        className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none resize-none"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Estado de la Cita</label>
                                <select 
                                    value={apptStatus}
                                    onChange={(e) => setApptStatus(e.target.value)}
                                    className="w-full bg-[#181a1c] border border-[#2d3036] p-2.5 rounded-md text-on-surface focus:border-primary outline-none cursor-pointer font-mono"
                                >
                                    <option value="scheduled">Programada / Agendada</option>
                                    <option value="completed">Completada / Atendida</option>
                                    <option value="cancelled">Cancelada / Inasistente</option>
                                </select>
                            </div>

                            <div className="flex gap-2 justify-between pt-4 border-t border-[#2d3036]">
                                <button 
                                    type="button"
                                    onClick={handleDeleteAppt}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold cursor-pointer text-xs transition flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    Eliminar
                                </button>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setIsEditOpen(false)}
                                        className="px-4 py-2 border border-[#2d3036] text-on-surface hover:bg-surface-variant/20 rounded-md font-bold cursor-pointer text-xs transition"
                                    >
                                        Cerrar
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-md font-bold cursor-pointer text-xs transition flex items-center gap-1 disabled:opacity-50"
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
