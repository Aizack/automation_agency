import React, { useState, useEffect } from 'react';

interface Task {
    id: string;
    task_description?: string;
    title: string;
    description: string | null;
    status: string;
    created_by_name?: string;
    created_at: string;
    due_date?: string | null;
    task_type?: string;
}

interface DocRequest {
    id: string;
    doc_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'negotiating';
    created_at: string;
}

interface SaaSErpEmployeeProfileProps {
    clientId: string;
    employeeId?: string;
    employeeName?: string;
    employeeRole?: string;
}

export const SaaSErpEmployeeProfile: React.FC<SaaSErpEmployeeProfileProps> = ({
    clientId: rawClientId,
    employeeId: propEmpId,
    employeeName: propEmpName,
    employeeRole: propEmpRole
}) => {
    const clientId = rawClientId || localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || '';
    const employeeId = propEmpId || localStorage.getItem('emp_id') || localStorage.getItem('user_id') || '';
    const employeeName = propEmpName || localStorage.getItem('emp_name') || localStorage.getItem('session_name') || 'Empleado';
    const employeeRole = propEmpRole || localStorage.getItem('emp_role') || localStorage.getItem('employee_role') || 'employee';
    const employeeToken = localStorage.getItem('emp_token') || localStorage.getItem('auth_token') || localStorage.getItem('token') || '';

    const [activeTab, setActiveTab] = useState<'jornada' | 'tareas' | 'solicitudes' | 'chat' | 'nomina'>('jornada');

    // Shift States
    const [shiftStatus, setShiftStatus] = useState<'no_started' | 'working' | 'lunch' | 'finished'>('no_started');
    const [shiftTimer, setShiftTimer] = useState('00:00:00');
    const [shiftStartTimestamp, setShiftStartTimestamp] = useState<number | null>(null);
    const [timerActive, setTimerActive] = useState(false);
    const [myShifts, setMyShifts] = useState<any[]>([]);

    // Lunch States
    const [lunchTimer, setLunchTimer] = useState('00:00:00');
    const [lunchStartTimestamp, setLunchStartTimestamp] = useState<number | null>(null);
    const [lunchTimerActive, setLunchTimerActive] = useState(false);
    const [workModality, setWorkModality] = useState<'presencial' | 'remoto'>('presencial');

    // Cash Shifts Confirmation
    const [pendingCashShifts, setPendingCashShifts] = useState<any[]>([]);
    const [confirmingShiftId, setConfirmingShiftId] = useState<string | null>(null);

    // Tasks State
    const [tasks, setTasks] = useState<Task[]>([]);

    // Requests & Advances State
    const [requests, setRequests] = useState<DocRequest[]>([]);
    const [myAdvances, setMyAdvances] = useState<any[]>([]);
    const [advAmount, setAdvAmount] = useState('');
    const [advDate, setAdvDate] = useState('');
    const [advNotes, setAdvNotes] = useState('');

    // Leave request form
    const [docType, setDocType] = useState('vacaciones');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [docSubmitting, setDocSubmitting] = useState(false);

    // Chat Assistant State
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    // Initial Fetch
    useEffect(() => {
        if (clientId && employeeId) {
            fetchActiveShiftStatus();
            fetchPendingCashShifts();
            fetchTasks();
            fetchRequests();
            fetchMyAdvances();
        }
    }, [clientId, employeeId]);

    // Shift Timers
    useEffect(() => {
        let interval: any = null;
        if (timerActive && shiftStartTimestamp) {
            interval = setInterval(() => {
                const elapsedMs = Date.now() - shiftStartTimestamp;
                const secs = Math.floor((elapsedMs / 1000) % 60);
                const mins = Math.floor((elapsedMs / (1000 * 60)) % 60);
                const hours = Math.floor((elapsedMs / (1000 * 60 * 60)) % 24);
                setShiftTimer(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            }, 1000);
        } else {
            setShiftTimer('00:00:00');
        }
        return () => { if (interval) clearInterval(interval); };
    }, [timerActive, shiftStartTimestamp]);

    useEffect(() => {
        let interval: any = null;
        if (lunchTimerActive && lunchStartTimestamp) {
            interval = setInterval(() => {
                const elapsedMs = Date.now() - lunchStartTimestamp;
                const secs = Math.floor((elapsedMs / 1000) % 60);
                const mins = Math.floor((elapsedMs / (1000 * 60)) % 60);
                const hours = Math.floor((elapsedMs / (1000 * 60 * 60)) % 24);
                setLunchTimer(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            }, 1000);
        } else {
            setLunchTimer('00:00:00');
        }
        return () => { if (interval) clearInterval(interval); };
    }, [lunchTimerActive, lunchStartTimestamp]);

    const fetchActiveShiftStatus = async () => {
        if (!clientId || !employeeId) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/shifts`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success && json.shifts) {
                setMyShifts(json.shifts);
                if (json.shifts.length > 0) {
                    const latestShift = json.shifts[0];
                    if (!latestShift.clock_out) {
                        const clockInTs = new Date(latestShift.clock_in).getTime();
                        setShiftStartTimestamp(clockInTs);

                        if (latestShift.lunch_start && !latestShift.lunch_end) {
                            setShiftStatus('lunch');
                            const lunchStartTs = new Date(latestShift.lunch_start).getTime();
                            setLunchStartTimestamp(lunchStartTs);
                            setLunchTimerActive(true);
                            setTimerActive(false);
                        } else {
                            setShiftStatus('working');
                            setTimerActive(true);
                            setLunchTimerActive(false);
                        }
                    } else {
                        setShiftStatus('finished');
                        setTimerActive(false);
                        setLunchTimerActive(false);
                    }
                } else {
                    setShiftStatus('no_started');
                    setTimerActive(false);
                    setLunchTimerActive(false);
                }
            }
        } catch (err) {
            console.error("Error fetching shift status:", err);
        }
    };

    const handleClockIn = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/shifts/clock-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({ work_modality: workModality })
            });
            const json = await res.json();
            if (json.success) {
                const now = Date.now();
                setShiftStartTimestamp(now);
                setShiftStatus('working');
                setTimerActive(true);
                fetchActiveShiftStatus();
            } else {
                alert(`Error: ${json.error || 'No se pudo iniciar turno'}`);
            }
        } catch (err) {
            alert('Error de conexión al iniciar turno.');
        }
    };

    const handleLunchToggle = async () => {
        const isStartingLunch = shiftStatus === 'working';
        const endpoint = isStartingLunch ? 'lunch-start' : 'lunch-end';

        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/shifts/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                }
            });
            const json = await res.json();
            if (json.success) {
                if (isStartingLunch) {
                    setShiftStatus('lunch');
                    setLunchStartTimestamp(Date.now());
                    setLunchTimerActive(true);
                    setTimerActive(false);
                } else {
                    setShiftStatus('working');
                    setLunchTimerActive(false);
                    setTimerActive(true);
                }
                fetchActiveShiftStatus();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al registrar almuerzo/descanso.');
        }
    };

    const handleClockOut = async () => {
        if (!confirm('¿Estás seguro de que deseas finalizar tu turno de trabajo por hoy?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/shifts/clock-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                }
            });
            const json = await res.json();
            if (json.success) {
                setShiftStatus('finished');
                setTimerActive(false);
                setLunchTimerActive(false);
                fetchActiveShiftStatus();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al finalizar turno.');
        }
    };

    const fetchPendingCashShifts = async () => {
        if (!clientId) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/cash-shifts`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success && Array.isArray(json.shifts)) {
                const currentName = (employeeName || '').toLowerCase().trim();
                const pending = json.shifts.filter((s: any) => {
                    if (s.status !== 'pending_confirmation') return false;
                    if (s.employee_in_id && s.employee_in_id === employeeId) return true;
                    if (s.employee_in_name) {
                        const targetName = s.employee_in_name.toLowerCase().trim();
                        return currentName.includes(targetName) || targetName.includes(currentName);
                    }
                    return true;
                });
                setPendingCashShifts(pending);
            }
        } catch (err) {
            console.error("Error cargando arqueos pendientes:", err);
        }
    };

    const handleConfirmCashShift = async (shiftId: string) => {
        try {
            setConfirmingShiftId(shiftId);
            const res = await fetch(`/api/clients/${clientId}/cash-shifts/${shiftId}/confirm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                }
            });
            const json = await res.json();
            if (json.success) {
                alert("✅ ¡Arqueo de caja y cuentas claras confirmadas!");
                fetchPendingCashShifts();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al confirmar arqueo.');
        } finally {
            setConfirmingShiftId(null);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/tasks`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setTasks(json.tasks || []);
            }
        } catch (err) {
            console.error("Error loading tasks:", err);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/hr-documents?employeeId=${employeeId}`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setRequests(json.documents || []);
            }
        } catch (err) {
            console.error("Error loading requests:", err);
        }
    };

    const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !reason) {
            alert('Completa la fecha de inicio y la justificación.');
            return;
        }

        try {
            setDocSubmitting(true);
            const res = await fetch(`/api/clients/${clientId}/hr-documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    doc_type: docType,
                    start_date: startDate,
                    end_date: endDate || startDate,
                    reason
                })
            });
            const json = await res.json();
            if (json.success) {
                setStartDate('');
                setEndDate('');
                setReason('');
                fetchRequests();
                alert('✅ Solicitud registrada con éxito.');
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al enviar solicitud.');
        } finally {
            setDocSubmitting(false);
        }
    };

    const fetchMyAdvances = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/employee-advances?employeeId=${employeeId}`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setMyAdvances(json.advances || []);
            }
        } catch (err) {
            console.error("Error loading advances:", err);
        }
    };

    const handleRequestAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!advAmount) return;

        try {
            const res = await fetch(`/api/clients/${clientId}/employee-advances`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({
                    employeeId,
                    amount: advAmount,
                    requestedDate: advDate || new Date().toISOString().split('T')[0],
                    notes: advNotes,
                    status: 'pending'
                })
            });
            const json = await res.json();
            if (json.success) {
                setAdvAmount('');
                setAdvDate('');
                setAdvNotes('');
                fetchMyAdvances();
                alert('✅ Solicitud de anticipo registrada.');
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al solicitar anticipo.');
        }
    };

    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = { role: 'user', content: chatInput.trim(), timestamp: new Date().toLocaleTimeString() };
        setChatMessages(prev => [...prev, userMsg]);
        const prompt = chatInput.trim();
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await fetch(`/api/clients/${clientId}/ai-agent/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({ prompt, employeeId })
            });
            const json = await res.json();
            if (json.success) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: json.response || json.answer, timestamp: new Date().toLocaleTimeString() }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, no pude procesar la consulta en este momento.', timestamp: new Date().toLocaleTimeString() }]);
            }
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión con el asistente IA.', timestamp: new Date().toLocaleTimeString() }]);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 md:gap-6 p-3 md:p-6 min-h-screen bg-[#FAF8F5] text-[#161616] font-sans w-full max-w-full overflow-x-hidden">
            
            {/* Header del Perfil Wabi-Sabi */}
            <div className="bg-white border border-[#E2DFD7] p-4 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#161616] text-[#FAF8F5] flex items-center justify-center font-serif text-2xl font-bold uppercase shadow">
                        {employeeName.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-serif text-2xl font-semibold text-[#161616] tracking-tight">{employeeName}</h1>
                            <span className="bg-[#FAF8F5] text-[#6B6862] border border-[#E2DFD7] px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider font-mono">
                                {employeeRole}
                            </span>
                        </div>
                        <p className="text-xs text-[#6B6862] mt-1 flex items-center gap-2">
                            <span>ID Portal: <strong className="font-mono text-[#161616]">{employeeId.slice(0, 8)}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-[#D9381E]">
                                <span className="material-symbols-outlined text-[15px]">schedule</span>
                                {shiftStatus === 'working' ? `En Turno (${shiftTimer})` : shiftStatus === 'lunch' ? `En Almuerzo (${lunchTimer})` : shiftStatus === 'finished' ? 'Turno Finalizado' : 'Fuera de Turno'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Sub-Pestañas de Navegación Estilo Wabi-Sabi */}
                <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#E2DFD7] p-1 w-full md:w-auto overflow-x-auto custom-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveTab('jornada')}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition rounded-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'jornada' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#6B6862] hover:text-[#161616] bg-transparent'}`}
                    >
                        <span className="material-symbols-outlined text-base">schedule</span>
                        Mi Jornada
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('tareas')}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition rounded-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'tareas' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#6B6862] hover:text-[#161616] bg-transparent'}`}
                    >
                        <span className="material-symbols-outlined text-base">task_alt</span>
                        Mis Tareas ({tasks.filter(t => t.status !== 'completed' && t.status !== 'terminado').length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('solicitudes')}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition rounded-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'solicitudes' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#6B6862] hover:text-[#161616] bg-transparent'}`}
                    >
                        <span className="material-symbols-outlined text-base">real_estate_agent</span>
                        Solicitudes & Anticipos
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('nomina')}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition rounded-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'nomina' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#6B6862] hover:text-[#161616] bg-transparent'}`}
                    >
                        <span className="material-symbols-outlined text-base">payments</span>
                        Mi Nómina
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition rounded-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'chat' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#6B6862] hover:text-[#161616] bg-transparent'}`}
                    >
                        <span className="material-symbols-outlined text-base">smart_toy</span>
                        Asistente IA
                    </button>
                </div>
            </div>

            {/* Banner Alerta de Arqueos de Caja Pendientes por Confirmar */}
            {pendingCashShifts.length > 0 && (
                <div className="bg-[#FAF8F5] border-2 border-[#D9381E] p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#D9381E] text-3xl">point_of_sale</span>
                        <div>
                            <h4 className="font-serif text-base font-bold text-[#161616]">Tienes {pendingCashShifts.length} Arqueo(s) de Caja Pendientes por Confirmar</h4>
                            <p className="text-xs text-[#6B6862]">Verifica que el dinero en efectivo entregado coincida para dar la conformidad de cuentas claras.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pendingCashShifts.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                disabled={confirmingShiftId === s.id}
                                onClick={() => handleConfirmCashShift(s.id)}
                                className="bg-[#D9381E] hover:bg-[#b52a14] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Confirmar Recepción (${s.final_cash_actual ? s.final_cash_actual.toLocaleString('es-CO') : '0'})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 1: MI JORNADA / CONTROL DE TURNO */}
            {activeTab === 'jornada' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tarjeta Principal Marcación */}
                    <div className="lg:col-span-2 bg-white border border-[#E2DFD7] p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-4 mb-6">
                                <div>
                                    <h3 className="font-serif text-xl font-semibold text-[#161616]">Control de Marcación y Jornada</h3>
                                    <p className="text-xs text-[#6B6862] mt-0.5">Registra el inicio de tu turno, pausar para descanso y finalización del día.</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase tracking-widest text-[#6B6862] font-bold block">Tiempo de Jornada</span>
                                    <span className="font-mono text-3xl font-bold text-[#D9381E]">{shiftTimer}</span>
                                </div>
                            </div>

                            {/* Modalidad de Trabajo */}
                            {shiftStatus === 'no_started' && (
                                <div className="mb-6 bg-[#FAF8F5] border border-[#E2DFD7] p-4">
                                    <label className="text-xs font-bold text-[#6B6862] uppercase tracking-wider block mb-2">Modalidad de Trabajo del Día</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setWorkModality('presencial')}
                                            className={`p-3 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition rounded-none ${workModality === 'presencial' ? 'bg-[#161616] text-white border-[#161616]' : 'bg-white text-[#6B6862] border-[#E2DFD7]'}`}
                                        >
                                            <span className="material-symbols-outlined text-base">store</span>
                                            Presencial Sede
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWorkModality('remoto')}
                                            className={`p-3 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition rounded-none ${workModality === 'remoto' ? 'bg-[#161616] text-white border-[#161616]' : 'bg-white text-[#6B6862] border-[#E2DFD7]'}`}
                                        >
                                            <span className="material-symbols-outlined text-base">home_work</span>
                                            Trabajo Remoto
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Acciones del Turno */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                {shiftStatus === 'no_started' && (
                                    <button
                                        type="button"
                                        onClick={handleClockIn}
                                        className="col-span-3 bg-[#D9381E] hover:bg-[#b52a14] text-white p-5 text-sm font-bold uppercase tracking-wider cursor-pointer transition shadow-md flex items-center justify-center gap-2 rounded-none"
                                    >
                                        <span className="material-symbols-outlined text-2xl">play_circle</span>
                                        INICIAR TURNO DE TRABAJO
                                    </button>
                                )}

                                {(shiftStatus === 'working' || shiftStatus === 'lunch') && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleLunchToggle}
                                            className={`p-4 text-xs font-bold uppercase tracking-wider cursor-pointer transition border flex flex-col items-center justify-center gap-1 rounded-none ${shiftStatus === 'lunch' ? 'bg-[#161616] text-white border-[#161616]' : 'bg-[#FAF8F5] text-[#161616] border-[#E2DFD7] hover:border-[#161616]'}`}
                                        >
                                            <span className="material-symbols-outlined text-xl">restaurant</span>
                                            {shiftStatus === 'lunch' ? `REANUDAR TURNO (${lunchTimer})` : 'IR A ALMUERZO / DESCANSO'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleClockOut}
                                            className="col-span-2 bg-[#D9381E] hover:bg-[#b52a14] text-white p-4 text-xs font-bold uppercase tracking-wider cursor-pointer transition flex flex-col items-center justify-center gap-1 rounded-none"
                                        >
                                            <span className="material-symbols-outlined text-xl">stop_circle</span>
                                            FINALIZAR JORNADA LABORAL
                                        </button>
                                    </>
                                )}

                                {shiftStatus === 'finished' && (
                                    <div className="col-span-3 bg-[#FAF8F5] border border-[#E2DFD7] p-4 text-center">
                                        <span className="material-symbols-outlined text-[#D9381E] text-3xl block mb-1">task_alt</span>
                                        <h4 className="font-serif text-base font-bold text-[#161616]">¡Jornada de Hoy Finalizada!</h4>
                                        <p className="text-xs text-[#6B6862] mt-1">Has registrado la salida de tu turno. Tu historial de horas queda guardado de forma segura.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tip Wabi-Sabi */}
                        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 text-[11px] text-[#6B6862] flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-amber-600">info</span>
                            <span>Recuerda marcar la pausar de descanso para calcular de forma exacta tu tiempo de trabajo efectivo.</span>
                        </div>
                    </div>

                    {/* Historial Reciente de Turnos */}
                    <div className="bg-white border border-[#E2DFD7] p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="font-serif text-lg font-semibold text-[#161616] border-b border-[#E2DFD7] pb-3 mb-4">
                                Registros Recientes de Turno
                            </h3>
                            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                                {myShifts.slice(0, 7).map((s, idx) => (
                                    <div key={idx} className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-bold text-[#161616] block">
                                                {new Date(s.clock_in).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </span>
                                            <span className="text-[10px] text-[#6B6862] font-mono">
                                                Entrada: {new Date(s.clock_in).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono font-bold text-[#D9381E] block">
                                                {s.total_hours ? `${parseFloat(s.total_hours).toFixed(2)} hrs` : 'En Turno'}
                                            </span>
                                            <span className="text-[9px] uppercase font-bold text-[#6B6862]">
                                                {s.work_modality || 'Presencial'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {myShifts.length === 0 && (
                                    <p className="text-xs text-[#6B6862] italic text-center py-6">No hay marcaciones de turno anteriores.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: MIS TAREAS */}
            {activeTab === 'tareas' && (
                <div className="bg-white border border-[#E2DFD7] p-6 shadow-sm">
                    <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-4 mb-6">
                        <div>
                            <h3 className="font-serif text-xl font-semibold text-[#161616]">Mis Tareas Asignadas</h3>
                            <p className="text-xs text-[#6B6862]">Revisa tus actividades pendientes y reporta los avances de trabajo.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tasks.map((task) => (
                            <div key={task.id} className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 flex flex-col justify-between gap-3">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 border font-mono ${task.status === 'completed' || task.status === 'terminado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                            {task.status || 'Pendiente'}
                                        </span>
                                        {task.due_date && (
                                            <span className="text-[10px] font-mono text-[#6B6862]">
                                                Vence: {new Date(task.due_date).toLocaleDateString('es-CO')}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-sm text-[#161616] mb-1">{task.title || task.task_description}</h4>
                                    {task.description && <p className="text-xs text-[#6B6862] line-clamp-2">{task.description}</p>}
                                </div>

                                <div className="border-t border-[#E2DFD7] pt-2 flex justify-between items-center text-[10px] text-[#6B6862]">
                                    <span>Asignado por: {task.created_by_name || 'Administración'}</span>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="col-span-full py-12 text-center text-xs text-[#6B6862] italic bg-[#FAF8F5] border border-[#E2DFD7]">
                                ¡No tienes tareas ni actividades pendientes asignadas por el momento!
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: SOLICITUDES Y ANTICIPOS */}
            {activeTab === 'solicitudes' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Permisos / Vacaciones Form */}
                    <div className="bg-white border border-[#E2DFD7] p-6 shadow-sm">
                        <h3 className="font-serif text-lg font-semibold text-[#161616] border-b border-[#E2DFD7] pb-3 mb-4">
                            Solicitud de Permisos o Vacaciones
                        </h3>
                        <form onSubmit={handleSubmitLeaveRequest} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-[#6B6862]">Tipo de Solicitud</label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none font-sans cursor-pointer h-[40px]"
                                >
                                    <option value="vacaciones">Vacaciones</option>
                                    <option value="permiso_personal">Permiso Personal</option>
                                    <option value="incapacidad">Incapacidad Médica</option>
                                    <option value="licencia">Licencia Laboral</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-[#6B6862]">Fecha Inicio *</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none font-mono h-[40px]"
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-[#6B6862]">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none font-mono h-[40px]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-[#6B6862]">Motivo / Observaciones *</label>
                                <textarea
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Explica detalladamente la razón de tu solicitud..."
                                    className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none font-sans"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={docSubmitting}
                                className="bg-[#161616] hover:bg-[#333] text-white p-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition rounded-none"
                            >
                                Registrar Solicitud de Permiso
                            </button>
                        </form>

                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B6862] mt-6 mb-3">Historial de Solicitudes</h4>
                        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {requests.map((req) => (
                                <div key={req.id} className="bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-[#161616] capitalize block">{req.doc_type.replace('_', ' ')}</span>
                                        <span className="text-[10px] text-[#6B6862] block font-mono">{req.start_date} al {req.end_date}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : req.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                        {req.status}
                                    </span>
                                </div>
                            ))}
                            {requests.length === 0 && (
                                <p className="text-xs text-[#6B6862] italic text-center py-4">No hay solicitudes registradas.</p>
                            )}
                        </div>
                    </div>

                    {/* Anticipos de Nómina */}
                    <div className="bg-white border border-[#E2DFD7] p-6 shadow-sm">
                        <h3 className="font-serif text-lg font-semibold text-[#161616] border-b border-[#E2DFD7] pb-3 mb-4">
                            Solicitar Anticipo de Nómina
                        </h3>
                        <form onSubmit={handleRequestAdvance} className="flex flex-col gap-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-[#6B6862]">Monto ($ COP) *</label>
                                    <input
                                        type="number"
                                        value={advAmount}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => setAdvAmount(e.target.value)}
                                        placeholder="Ej: 150000"
                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs font-mono font-bold text-[#161616] outline-none h-[40px]"
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-[#6B6862]">Fecha Requerida</label>
                                    <input
                                        type="date"
                                        value={advDate}
                                        onChange={(e) => setAdvDate(e.target.value)}
                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none font-mono h-[40px]"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-[#6B6862]">Notas / Motivo</label>
                                <input
                                    type="text"
                                    value={advNotes}
                                    onChange={(e) => setAdvNotes(e.target.value)}
                                    placeholder="Observación opcional para la administración"
                                    className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none font-sans h-[40px]"
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-[#D9381E] hover:bg-[#b52a14] text-white p-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition rounded-none"
                            >
                                Enviar Solicitud de Anticipo
                            </button>
                        </form>

                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B6862] mb-3">Historial de Anticipos</h4>
                        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {myAdvances.map((adv) => (
                                <div key={adv.id} className="bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 flex justify-between items-center text-xs font-mono">
                                    <div>
                                        <span className="font-bold text-[#161616]">${parseFloat(adv.amount).toLocaleString('es-CO')}</span>
                                        <span className="text-[10px] text-[#6B6862] block font-sans">{adv.requested_date || adv.created_at?.split('T')[0]}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${adv.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                        {adv.status || 'Pendiente'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: MI NÓMINA */}
            {activeTab === 'nomina' && (
                <div className="bg-white border border-[#E2DFD7] p-6 shadow-sm">
                    <h3 className="font-serif text-xl font-semibold text-[#161616] border-b border-[#E2DFD7] pb-3 mb-6">
                        Resumen de Nómina y Horas Trabajadas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4">
                            <span className="text-[10px] uppercase font-bold text-[#6B6862] block">Total Horas Este Mes</span>
                            <span className="font-mono text-2xl font-bold text-[#161616]">
                                {myShifts.reduce((sum, s) => sum + (parseFloat(s.total_hours || 0) || 0), 0).toFixed(1)} hrs
                            </span>
                        </div>
                        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4">
                            <span className="text-[10px] uppercase font-bold text-[#6B6862] block">Turnos Registrados</span>
                            <span className="font-mono text-2xl font-bold text-[#161616]">{myShifts.length} Turnos</span>
                        </div>
                        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4">
                            <span className="text-[10px] uppercase font-bold text-[#6B6862] block">Anticipos Aprobados</span>
                            <span className="font-mono text-2xl font-bold text-[#D9381E]">
                                ${myAdvances.filter(a => a.status === 'delivered').reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0).toLocaleString('es-CO')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: ASISTENTE IA */}
            {activeTab === 'chat' && (
                <div className="bg-white border border-[#E2DFD7] p-6 shadow-sm flex flex-col h-[500px]">
                    <h3 className="font-serif text-lg font-semibold text-[#161616] border-b border-[#E2DFD7] pb-3 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#D9381E]">smart_toy</span>
                        Asistente Inteligente KOI ERP
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-[#FAF8F5] border border-[#E2DFD7] flex flex-col gap-3 mb-4">
                        {chatMessages.length === 0 && (
                            <p className="text-xs text-[#6B6862] italic text-center my-auto">
                                Hola {employeeName}, puedes preguntarme dudas sobre el inventario, políticas de tienda, procedimientos o tareas asignadas.
                            </p>
                        )}
                        {chatMessages.map((m, idx) => (
                            <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-3 max-w-[80%] text-xs ${m.role === 'user' ? 'bg-[#161616] text-white' : 'bg-white border border-[#E2DFD7] text-[#161616]'}`}>
                                    {m.content}
                                </div>
                                <span className="text-[9px] text-[#6B6862] mt-0.5">{m.timestamp}</span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSendChatMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Escribe tu consulta aquí..."
                            className="flex-1 bg-white border border-[#E2DFD7] p-3 text-xs outline-none focus:border-[#161616] font-sans"
                            disabled={chatLoading}
                        />
                        <button
                            type="submit"
                            disabled={chatLoading || !chatInput.trim()}
                            className="bg-[#161616] hover:bg-[#333] text-white px-5 py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none disabled:opacity-50"
                        >
                            Enviar
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
