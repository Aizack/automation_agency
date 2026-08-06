import React, { useState, useEffect } from 'react';

interface Appointment {
    id: string;
    customer_name: string;
    customer_phone: string;
    appointment_date: string;
    status: string;
    created_at: string;
}

interface SaaSErpAppointmentsProps {
    clientId: string;
}

export const SaaSErpAppointments: React.FC<SaaSErpAppointmentsProps> = ({ clientId }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Search by document number (cédula)
    const [customerDocumentNumber, setCustomerDocumentNumber] = useState('');
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [apptDate, setApptDate] = useState('');
    const [apptStatus, setApptStatus] = useState('scheduled');
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('auth_token');

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

    useEffect(() => {
        fetchAppointments();
    }, [clientId]);

    const searchCustomerByDoc = async () => {
        if (!customerDocumentNumber.trim()) return;
        setSearchStatus('searching');
        setErrorMsg('');
        try {
            const res = await fetch(`/api/clients/${clientId}/crm-customers/document/${customerDocumentNumber}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success && json.customer) {
                setCustomerName(json.customer.name);
                setCustomerPhone(json.customer.phone);
                setSearchStatus('found');
            } else {
                setSearchStatus('not_found');
            }
        } catch (err: any) {
            console.error(err);
            setSearchStatus('not_found');
            setErrorMsg('Error de red al buscar el paciente.');
        }
    };

    // Calendar Calculations
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month); // 0 (Sun) - 6 (Sat)

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

    // Fill next month padding days to make grid complete (multiple of 7)
    const totalCells = Math.ceil(calendarDays.length / 7) * 7;
    const nextDaysNeeded = totalCells - calendarDays.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
        calendarDays.push({
            dayNum: i,
            isCurrentMonth: false,
            date: new Date(year, month + 1, i)
        });
    }

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleCreateOpen = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerDocumentNumber('');
        setSearchStatus('idle');
        
        // Set default date to today plus 1 hour, in local format yyyy-MM-ddThh:mm
        const now = new Date(selectedDate);
        now.setHours(new Date().getHours() + 1);
        now.setMinutes(0);
        const tzoffset = now.getTimezoneOffset() * 60000; //offset in milliseconds
        const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
        setApptDate(localISOTime);
        setErrorMsg('');
        setIsCreateOpen(true);
    };

    const handleCreateAtHour = (hour: number) => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerDocumentNumber('');
        setSearchStatus('idle');
        
        const d = new Date(selectedDate);
        d.setHours(hour);
        d.setMinutes(0);
        const tzoffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        setApptDate(localISOTime);
        setErrorMsg('');
        setIsCreateOpen(true);
    };

    const handleEditOpen = (appt: Appointment) => {
        setSelectedAppt(appt);
        setCustomerName(appt.customer_name);
        setCustomerPhone(appt.customer_phone);
        // Format incoming date strings to yyyy-MM-ddThh:mm
        const d = new Date(appt.appointment_date);
        const tzoffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        setApptDate(localISOTime);
        setApptStatus(appt.status);
        setErrorMsg('');
        setIsEditOpen(true);
    };

    const handleCreateAppt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName || !customerPhone || !apptDate) {
            setErrorMsg('Por favor completa todos los campos.');
            return;
        }

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
                    appointment_date: apptDate,
                    customer_document_number: customerDocumentNumber || null
                })
            });
            const json = await res.json();
            if (json.success) {
                setIsCreateOpen(false);
                fetchAppointments();
            } else {
                setErrorMsg(json.error || 'Error al agendar la cita.');
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
                    appointment_date: apptDate,
                    status: apptStatus
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
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getAppointmentsForDay = (date: Date) => {
        return appointments.filter(appt => {
            const apptDateObj = new Date(appt.appointment_date);
            return apptDateObj.getDate() === date.getDate() &&
                   apptDateObj.getMonth() === date.getMonth() &&
                   apptDateObj.getFullYear() === date.getFullYear();
        });
    };

    const getAppointmentsForHour = (date: Date, hour: number) => {
        return appointments.filter(appt => {
            const d = new Date(appt.appointment_date);
            return d.getDate() === date.getDate() &&
                   d.getMonth() === date.getMonth() &&
                   d.getFullYear() === date.getFullYear() &&
                   d.getHours() === hour;
        });
    };

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const hoursRange = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

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
                    <div className="flex bg-surface-container-high/40 p-1 rounded-xl border border-outline/10 text-xs">
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${viewMode === 'calendar' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            Calendario
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${viewMode === 'list' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            Lista
                        </button>
                    </div>

                    <button 
                        onClick={handleCreateOpen}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
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
                                        <span className="font-bold text-on-surface text-base">{appt.customer_name}</span>
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
                                            <span>{new Date(appt.appointment_date).toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                                            <span className="font-bold text-on-surface">{formatApptTime(appt.appointment_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">call</span>
                                            <span className="font-mono">+{appt.customer_phone}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-outline/10 pt-3 mt-4 text-[9px] text-on-surface-variant/60 font-mono flex justify-between items-center">
                                    <span>Programado por IA</span>
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
                    <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border border-outline/10 flex flex-col">
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

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedDate(cell.date)}
                                        className={`min-h-[100px] p-2 flex flex-col justify-between bg-surface transition cursor-pointer border ${
                                            isSelected ? 'ring-2 ring-primary ring-inset z-10 bg-primary/5' : 'hover:bg-surface-variant/10'
                                        } ${
                                            cell.isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant/40'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                                isToday ? 'bg-primary text-white font-black' : ''
                                            } ${isSelected && !isToday ? 'bg-primary/20 text-primary' : ''}`}>
                                                {cell.dayNum}
                                            </span>
                                        </div>
                                        <div className="flex-grow space-y-1 overflow-y-auto max-h-[60px] custom-scrollbar">
                                            {dayAppts.slice(0, 2).map((appt) => (
                                                <div 
                                                    key={appt.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditOpen(appt);
                                                    }}
                                                    className={`px-1 py-0.5 rounded text-[9px] font-medium truncate border cursor-pointer hover:opacity-90 ${
                                                        appt.status === 'scheduled' ? 'bg-primary/10 text-primary border-primary/20' : 
                                                        appt.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                                        'bg-red-500/10 text-red-500 border-red-500/20 line-through'
                                                    }`}
                                                >
                                                    {formatApptTime(appt.appointment_date)} - {appt.customer_name}
                                                </div>
                                            ))}
                                            {dayAppts.length > 2 && (
                                                <div className="text-[8px] text-center text-on-surface-variant font-bold">
                                                    + {dayAppts.length - 2} más
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right 1/3 Grid: Detailed Agenda for Selected Day */}
                    <div className="glass-card rounded-2xl p-5 border border-outline/10 flex flex-col justify-start bg-surface-container/20">
                        <div className="border-b border-outline/10 pb-4 mb-4">
                            <span className="text-[10px] text-primary uppercase font-bold font-mono tracking-wider">Agenda Diaria</span>
                            <h3 className="font-bold text-base text-on-surface capitalize mt-0.5">
                                {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                        </div>

                        {/* List of hours */}
                        <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
                            {hoursRange.map((hour) => {
                                const hourAppts = getAppointmentsForHour(selectedDate, hour);
                                return (
                                    <div key={hour} className="flex gap-4 items-start py-1.5 border-b border-outline/5 last:border-0">
                                        {/* Hour label */}
                                        <div className="w-12 text-right text-xs font-bold text-on-surface-variant font-mono pt-1">
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>

                                        {/* Hour slot content */}
                                        <div className="flex-grow space-y-1.5">
                                            {hourAppts.length > 0 ? (
                                                hourAppts.map((appt) => (
                                                    <div
                                                        key={appt.id}
                                                        onClick={() => handleEditOpen(appt)}
                                                        className={`p-3 rounded-xl border cursor-pointer hover:border-primary transition ${
                                                            appt.status === 'scheduled' ? 'bg-primary/5 border-primary/20 text-on-surface' :
                                                            appt.status === 'completed' ? 'bg-green-500/5 border-green-500/20 text-on-surface' :
                                                            'bg-red-500/5 border-red-500/20 text-on-surface-variant/60'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-bold text-xs">{appt.customer_name}</span>
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                                                appt.status === 'scheduled' ? 'bg-primary/10 text-primary' :
                                                                appt.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                                'bg-red-500/10 text-red-500'
                                                            }`}>
                                                                {appt.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant/80 mt-2 font-mono">
                                                            <span>📞 +{appt.customer_phone}</span>
                                                            <span>⏰ {formatApptTime(appt.appointment_date)}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <button
                                                    onClick={() => handleCreateAtHour(hour)}
                                                    className="w-full text-left py-2 px-3 border border-dashed border-outline/25 hover:border-primary/50 text-[10px] text-on-surface-variant hover:text-primary rounded-xl cursor-pointer bg-transparent transition"
                                                >
                                                    + Agendar cita a las {hour.toString().padStart(2, '0')}:00
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
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl animate-float">
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
                            {/* CRM Document Search Header */}
                            <div className="bg-primary/5 p-3.5 rounded-2xl border border-primary/15 space-y-1.5">
                                <label className="block text-[11px] font-bold text-primary">Cédula o Documento del Paciente (CRM)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={customerDocumentNumber}
                                        onChange={(e) => setCustomerDocumentNumber(e.target.value)}
                                        className="flex-grow bg-surface border border-outline/25 p-2 rounded-xl text-on-surface outline-none text-xs font-mono focus:border-primary"
                                        placeholder="Ej: 10203040"
                                    />
                                    <button 
                                        type="button"
                                        onClick={searchCustomerByDoc}
                                        disabled={searchStatus === 'searching'}
                                        className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary-container disabled:opacity-50 transition"
                                    >
                                        {searchStatus === 'searching' ? 'Buscando...' : 'Buscar'}
                                    </button>
                                </div>
                                {searchStatus === 'found' && (
                                    <p className="text-[10px] text-green-500 font-bold flex items-center gap-1 mt-1.5">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Registrado: Nombre y teléfono cargados del CRM.
                                    </p>
                                )}
                                {searchStatus === 'not_found' && (
                                    <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-1.5">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        No registrado en CRM. Ingrese los datos abajo para crearlo.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Nombre Completo</label>
                                <input 
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    disabled={searchStatus === 'found'}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                                    placeholder="Ej: Laura Bermúdez"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Teléfono (WhatsApp)</label>
                                <input 
                                    type="text"
                                    required
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    disabled={searchStatus === 'found'}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono disabled:opacity-70 disabled:cursor-not-allowed"
                                    placeholder="Ej: 573001112222"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Fecha &amp; Hora de Cita</label>
                                <input 
                                    type="datetime-local"
                                    required
                                    value={apptDate}
                                    onChange={(e) => setApptDate(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-sans"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-outline/10">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer text-xs transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Guardando...' : 'Crear Cita'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT APPOINTMENT MODAL */}
            {isEditOpen && selectedAppt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl">
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
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Teléfono (WhatsApp)</label>
                                <input 
                                    type="text"
                                    required
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Fecha &amp; Hora de Cita</label>
                                <input 
                                    type="datetime-local"
                                    required
                                    value={apptDate}
                                    onChange={(e) => setApptDate(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Estado de la Cita</label>
                                <select 
                                    value={apptStatus}
                                    onChange={(e) => setApptStatus(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                >
                                    <option value="scheduled">Programada / Agendada</option>
                                    <option value="completed">Completada / Atendida</option>
                                    <option value="cancelled">Cancelada / Inasistente</option>
                                </select>
                            </div>

                            <div className="flex gap-2 justify-between pt-4 border-t border-outline/10">
                                <button 
                                    type="button"
                                    onClick={handleDeleteAppt}
                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer text-xs transition flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    Eliminar
                                </button>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setIsEditOpen(false)}
                                        className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer text-xs transition"
                                    >
                                        Cerrar
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer text-xs transition flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
