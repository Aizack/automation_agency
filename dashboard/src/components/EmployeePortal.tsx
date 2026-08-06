import React, { useState, useEffect } from 'react';

interface Task {
    id: string;
    task_description: string;
    status: 'pending' | 'completed';
    created_at: string;
}

interface DocRequest {
    id: string;
    doc_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export const EmployeePortal: React.FC = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // Session Data
    const [employeeToken, setEmployeeToken] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [employeeRole, setEmployeeRole] = useState('');
    const [clientId, setClientId] = useState('');

    // Dashboard State
    const [shiftStatus, setShiftStatus] = useState<'no_started' | 'working' | 'lunch' | 'finished'>('no_started');
    const [shiftTimer, setShiftTimer] = useState('00:00:00');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [requests, setRequests] = useState<DocRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'turnos' | 'tareas' | 'solicitudes' | 'chat' | 'campanias'>('turnos');

    // Timer Interval ref
    const [timerActive, setTimerActive] = useState(false);
    const [shiftStartTimestamp, setShiftStartTimestamp] = useState<number | null>(null);

    // Form States
    const [docType, setDocType] = useState('vacaciones');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [docError, setDocError] = useState('');
    const [docSuccess, setDocSuccess] = useState('');
    const [fileBase64, setFileBase64] = useState<string | null>(null);

    // Laboral Letter state
    const [laboralLetter, setLaboralLetter] = useState<string | null>(null);

    // Campaigns & Visits state
    const [visits, setVisits] = useState<any[]>([]);
    const [visitsLoading, setVisitsLoading] = useState(false);
    
    // Visit Form States
    const [vName, setVName] = useState('');
    const [vType, setVType] = useState<'calle' | 'sitio'>('sitio');
    const [vDept, setVDept] = useState('Cundinamarca');
    const [vMun, setVMun] = useState('Bogotá');
    const [vBarrio, setVBarrio] = useState('');
    const [vPos, setVPos] = useState('');
    const [vAddress, setVAddress] = useState('');
    const [vContact, setVContact] = useState('');
    const [vSecondary, setVSecondary] = useState('');
    const [vAgreement, setVAgreement] = useState('');
    const [vLat, setVLat] = useState('');
    const [vLng, setVLng] = useState('');
    const [vPhoto, setVPhoto] = useState<string | null>(null);
    const [vError, setVError] = useState('');
    const [vSuccess, setVSuccess] = useState('');
    const [isVCreateOpen, setIsVCreateOpen] = useState(false);

    // Standalone Chat States
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatChannel, setChatChannel] = useState('general');
    const [chatLoading, setChatLoading] = useState(false);

    // check localstorage session
    useEffect(() => {
        const storedToken = localStorage.getItem('emp_token');
        const storedEmpId = localStorage.getItem('emp_id');
        const storedName = localStorage.getItem('emp_name');
        const storedRole = localStorage.getItem('emp_role');
        const storedClientId = localStorage.getItem('emp_client_id');
        const storedShiftStart = localStorage.getItem('shift_start_ts');

        if (storedToken && storedEmpId && storedClientId) {
            setEmployeeToken(storedToken);
            setEmployeeId(storedEmpId);
            setEmployeeName(storedName || 'Empleado');
            setEmployeeRole(storedRole || 'employee');
            setClientId(storedClientId);
            setIsAuthenticated(true);

            if (storedShiftStart) {
                setShiftStartTimestamp(parseInt(storedShiftStart));
                setTimerActive(true);
                setShiftStatus('working');
            }
        }
    }, []);

    // Fetch Tasks & Requests when authenticated
    useEffect(() => {
        if (isAuthenticated && employeeId && clientId) {
            fetchTasks();
            fetchRequests();
            fetchVisits();
            if (activeTab === 'chat') {
                fetchChatMessages();
            }
        }
    }, [isAuthenticated, employeeId, clientId, activeTab]);

    // Timer effect
    useEffect(() => {
        let interval: any = null;
        if (timerActive && shiftStartTimestamp) {
            interval = setInterval(() => {
                const elapsedMs = Date.now() - shiftStartTimestamp;
                const secs = Math.floor((elapsedMs / 1000) % 60);
                const mins = Math.floor((elapsedMs / (1000 * 60)) % 60);
                const hours = Math.floor((elapsedMs / (1000 * 60 * 60)) % 24);
                setShiftTimer(
                    `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                );
            }, 1000);
        } else {
            setShiftTimer('00:00:00');
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerActive, shiftStartTimestamp]);

    // Polling for new chat messages
    useEffect(() => {
        let chatInterval: any = null;
        if (isAuthenticated && activeTab === 'chat') {
            chatInterval = setInterval(() => {
                fetchChatMessages(true);
            }, 3000); // Poll every 3 seconds
        }
        return () => {
            if (chatInterval) clearInterval(chatInterval);
        };
    }, [isAuthenticated, activeTab, chatChannel]);

    // LOGIN ACTION
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || !pin) {
            setErrorMsg('Completa tu teléfono y PIN.');
            return;
        }

        try {
            setLoading(true);
            setErrorMsg('');
            const res = await fetch('/api/auth/employee-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, pin })
            });
            const json = await res.json();
            if (json.success) {
                localStorage.setItem('emp_token', json.token);
                localStorage.setItem('emp_id', json.employee.id);
                localStorage.setItem('emp_name', json.employee.name);
                localStorage.setItem('emp_role', json.employee.role);
                localStorage.setItem('emp_client_id', json.employee.clientId);

                setEmployeeToken(json.token);
                setEmployeeId(json.employee.id);
                setEmployeeName(json.employee.name);
                setEmployeeRole(json.employee.role);
                setClientId(json.employee.clientId);
                setIsAuthenticated(true);
            } else {
                setErrorMsg(json.error || 'PIN o teléfono incorrecto.');
            }
        } catch (err: any) {
            setErrorMsg('Error de red o conexión al servidor.');
        } finally {
            setLoading(false);
        }
    };

    // LOGOUT ACTION
    const handleLogout = () => {
        localStorage.removeItem('emp_token');
        localStorage.removeItem('emp_id');
        localStorage.removeItem('emp_name');
        localStorage.removeItem('emp_role');
        localStorage.removeItem('emp_client_id');
        localStorage.removeItem('shift_start_ts');
        setIsAuthenticated(false);
        setTimerActive(false);
        setShiftStartTimestamp(null);
        setShiftStatus('no_started');
    };

    // FETCH TASKS
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

    // TOGGLE TASK STATUS
    const handleToggleTask = async (taskId: string, currentStatus: string) => {
        try {
            const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({ status: nextStatus })
            });
            const json = await res.json();
            if (json.success) {
                fetchTasks();
            }
        } catch (err) {
            console.error("Error updating task status:", err);
        }
    };

    // FETCH DOCUMENT REQUESTS
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

    // SUBMIT DOCUMENT REQUEST
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFileBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !reason) {
            setDocError('Por favor ingresa fecha de inicio y motivo.');
            return;
        }

        try {
            setDocError('');
            setDocSuccess('');
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
                    end_date: endDate || null,
                    reason: reason,
                    file_url: fileBase64 || null
                })
            });
            const json = await res.json();
            if (json.success) {
                setDocSuccess('Solicitud enviada correctamente a administración.');
                setStartDate('');
                setEndDate('');
                setReason('');
                setFileBase64(null);
                fetchRequests();
            } else {
                setDocError(json.error || 'Error al procesar la solicitud.');
            }
        } catch (err: any) {
            setDocError('Error de red al enviar la solicitud.');
        }
    };

    // GENERATE EMPLOYMENT VERIFICATION LETTER
    const handleGenerateLaboralLetter = async () => {
        try {
            setDocError('');
            const res = await fetch(`/api/clients/${clientId}/hr-documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    doc_type: 'carta_laboral',
                    start_date: new Date().toISOString().split('T')[0],
                    reason: 'Solicitud digital auto-generada'
                })
            });
            const json = await res.json();
            if (json.success && json.letter_preview) {
                setLaboralLetter(json.letter_preview);
            } else {
                setDocError(json.error || 'Error al generar certificación laboral.');
            }
        } catch (err) {
            setDocError('Error al contactar con el departamento de nómina.');
        }
    };

    // FETCH VISITS FOR LOGGED EMPLOYEE
    const fetchVisits = async () => {
        try {
            setVisitsLoading(true);
            const res = await fetch(`/api/clients/${clientId}/field-visits?employeeId=${employeeId}`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setVisits(json.visits || []);
            }
        } catch (err) {
            console.error("Error loading visits:", err);
        } finally {
            setVisitsLoading(false);
        }
    };

    const handleVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setVPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('La geolocalización no es soportada por tu navegador.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setVLat(pos.coords.latitude.toString());
                setVLng(pos.coords.longitude.toString());
            },
            () => {
                alert('No se pudo obtener la ubicación automáticamente.');
            }
        );
    };

    const handleCreateVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vName || !vAddress || !vContact) {
            setVError('Nombre, dirección y contacto principal son obligatorios.');
            return;
        }

        try {
            setVError('');
            setVSuccess('');
            const res = await fetch(`/api/clients/${clientId}/field-visits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({
                    name: vName,
                    campaign_type: vType,
                    employee_id: employeeId,
                    department: vDept,
                    municipio: vMun,
                    barrio: vBarrio || null,
                    point_of_sale: vPos || 'Principal',
                    address: vAddress,
                    latitude: vLat ? parseFloat(vLat) : null,
                    longitude: vLng ? parseFloat(vLng) : null,
                    contact_name: vContact,
                    secondary_contacts: vSecondary ? [vSecondary] : [],
                    agreement_terms: vAgreement || null,
                    proof_photo_url: vPhoto || null,
                    status: 'programada'
                })
            });

            const json = await res.json();
            if (json.success) {
                setVSuccess('Campaña/Visita registrada exitosamente.');
                setIsVCreateOpen(false);
                setVName('');
                setVBarrio('');
                setVPos('');
                setVAddress('');
                setVContact('');
                setVSecondary('');
                setVAgreement('');
                setVLat('');
                setVLng('');
                setVPhoto(null);
                fetchVisits();
            } else {
                setVError(json.error || 'Error al guardar la visita.');
            }
        } catch (err: any) {
            setVError(err.message || 'Error de red.');
        }
    };

    const handleVUpdateStatus = async (id: string, newStatus: 'en_progreso' | 'completada' | 'cancelada') => {
        let photoUrl: string | null = null;
        if (newStatus === 'completada') {
            const confirmFinish = window.confirm('¿Deseas completar la visita y subir el comprobante de check-out?');
            if (!confirmFinish) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        photoUrl = reader.result as string;
                        await sendVUpdate(id, newStatus, photoUrl);
                    };
                    reader.readAsDataURL(file);
                } else {
                    await sendVUpdate(id, newStatus, null);
                }
            };
            input.click();
        } else {
            await sendVUpdate(id, newStatus, null);
        }
    };

    const sendVUpdate = async (id: string, status: string, photo: string | null) => {
        try {
            const res = await fetch(`/api/clients/${clientId}/field-visits/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({ status, proof_photo_url: photo })
            });
            const json = await res.json();
            if (json.success) {
                fetchVisits();
            } else {
                alert(json.error || 'Error al actualizar.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // SHIFT CONTROL ACTIONS
    const handleShiftStart = async () => {
        try {
            const res = await fetch(`/api/employees/${employeeId}/shifts/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                const ts = Date.now();
                localStorage.setItem('shift_start_ts', ts.toString());
                setShiftStartTimestamp(ts);
                setTimerActive(true);
                setShiftStatus('working');
            }
        } catch (err) {
            console.error("Error starting shift:", err);
        }
    };

    const handleShiftEnd = async () => {
        if (!window.confirm('¿Deseas finalizar tu turno del día de hoy?')) return;
        try {
            const res = await fetch(`/api/employees/${employeeId}/shifts/end`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                localStorage.removeItem('shift_start_ts');
                setTimerActive(false);
                setShiftStartTimestamp(null);
                setShiftStatus('finished');
            }
        } catch (err) {
            console.error("Error ending shift:", err);
        }
    };

    const handleLunchStart = async () => {
        try {
            const res = await fetch(`/api/employees/${employeeId}/shifts/lunch-start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setShiftStatus('lunch');
                setTimerActive(false);
            }
        } catch (err) {
            console.error("Error starting lunch:", err);
        }
    };

    const handleLunchEnd = async () => {
        try {
            const res = await fetch(`/api/employees/${employeeId}/shifts/lunch-end`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setShiftStatus('working');
                // Ajustar acumulado
                setTimerActive(true);
            }
        } catch (err) {
            console.error("Error ending lunch:", err);
        }
    };

    // FETCH CHAT MESSAGES
    const fetchChatMessages = async (isPolling = false) => {
        try {
            const sinceQuery = isPolling && chatMessages.length > 0
                ? `&since=${encodeURIComponent(chatMessages[chatMessages.length - 1].created_at)}`
                : '';
            
            const res = await fetch(`/api/clients/${clientId}/chats/messages?channel=${chatChannel}${sinceQuery}`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success && json.messages) {
                if (isPolling) {
                    if (json.messages.length > 0) {
                        setChatMessages(prev => [...prev, ...json.messages]);
                    }
                } else {
                    setChatMessages(json.messages);
                }
            }
        } catch (err) {
            console.error("Error fetching chat messages:", err);
        }
    };

    // SEND CHAT MESSAGE
    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        try {
            setChatLoading(true);
            const res = await fetch(`/api/clients/${clientId}/chats/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${employeeToken}`
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    sender_name: employeeName,
                    message_text: chatInput,
                    channel: chatChannel
                })
            });
            const json = await res.json();
            if (json.success) {
                setChatInput('');
                fetchChatMessages(true);
            }
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setChatLoading(false);
        }
    };

    // LOGIN SCREEN
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-4 font-sans text-white">
                <div className="w-full max-w-sm glass-card p-8 rounded-3xl border border-outline/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary"></div>
                    
                    <div className="text-center mb-8">
                        <span className="material-symbols-outlined text-[48px] text-primary animate-pulse">lock</span>
                        <h2 className="text-2xl font-black mt-3">Portal del Empleado</h2>
                        <p className="text-xs text-on-surface-variant mt-1">Registra tu jornada de trabajo y gestiona tus tareas.</p>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-2xl mb-5 font-bold text-center">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-on-surface-variant">Número de Teléfono</label>
                            <input 
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-surface-container-high/40 border border-outline/25 p-3 rounded-2xl text-on-surface focus:border-primary outline-none font-mono text-center text-lg"
                                placeholder="Ej: 3001234567"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-on-surface-variant">PIN de Acceso (4 dígitos)</label>
                            <input 
                                type="password"
                                maxLength={4}
                                required
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="w-full bg-surface-container-high/40 border border-outline/25 p-3 rounded-2xl text-on-surface focus:border-primary outline-none font-mono text-center text-2xl tracking-widest"
                                placeholder="••••"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-container text-white py-3 rounded-2xl font-bold cursor-pointer transition shadow-lg text-sm mt-6"
                        >
                            {loading ? 'Verificando PIN...' : 'Ingresar al Portal'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // MAIN DASHBOARD PORTAL
    return (
        <div className="min-h-screen bg-[#070b13] text-white font-sans flex flex-col">
            {/* Header Navbar */}
            <header className="bg-surface-container-low/20 backdrop-blur-md border-b border-outline/10 p-4 sticky top-0 z-30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[24px]">badge</span>
                    <div>
                        <h1 className="font-black text-sm">{employeeName}</h1>
                        <p className="text-[10px] text-on-surface-variant font-mono uppercase">Rol: {employeeRole}</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer text-xs font-bold transition bg-transparent"
                >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Salir
                </button>
            </header>

            {/* Portal Tab Navigation */}
            <nav className="bg-surface-container-high/20 border-b border-outline/10 flex justify-around p-1 select-none">
                <button 
                    onClick={() => setActiveTab('turnos')}
                    className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                        activeTab === 'turnos' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined">schedule</span>
                    Jornada
                </button>
                <button 
                    onClick={() => setActiveTab('tareas')}
                    className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                        activeTab === 'tareas' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined">task_alt</span>
                    Tareas
                </button>
                <button 
                    onClick={() => setActiveTab('solicitudes')}
                    className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                        activeTab === 'solicitudes' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined">assignment</span>
                    RRHH
                </button>
                <button 
                    onClick={() => setActiveTab('campanias')}
                    className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                        activeTab === 'campanias' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined">explore</span>
                    Visitas
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                        activeTab === 'chat' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined">smart_toy</span>
                    Chat IA
                </button>
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow p-4 md:p-6 overflow-y-auto max-w-xl mx-auto w-full">
                
                {/* TAB 1: TURNOS & ELAPSED TIMER */}
                {activeTab === 'turnos' && (
                    <div className="space-y-6">
                        {/* Clock / Timer Widget */}
                        <div className="glass-card p-6 rounded-3xl text-center border border-outline/10 shadow-xl relative overflow-hidden bg-gradient-to-b from-surface-container/20 to-surface-container-high/40">
                            <span className="text-[10px] text-primary uppercase font-mono tracking-wider font-bold">Tiempo Acumulado</span>
                            <div className="text-4xl font-black font-mono tracking-wider my-3 text-white">
                                {shiftTimer}
                            </div>
                            
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-outline/10 text-on-surface-variant">
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                    shiftStatus === 'working' ? 'bg-green-500 animate-ping' :
                                    shiftStatus === 'lunch' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                                }`}></span>
                                <span className="capitalize">
                                    {shiftStatus === 'no_started' ? 'Turno No Iniciado' :
                                     shiftStatus === 'working' ? 'Trabajando / En Turno' :
                                     shiftStatus === 'lunch' ? 'En Almuerzo / Descanso' : 'Turno Finalizado'}
                                </span>
                            </div>
                        </div>

                        {/* Shift Controls Grid */}
                        <div className="grid grid-cols-2 gap-3.5">
                            {shiftStatus === 'no_started' && (
                                <button 
                                    onClick={handleShiftStart}
                                    className="col-span-2 bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow transition"
                                >
                                    <span className="material-symbols-outlined">play_arrow</span>
                                    INICIAR TURNO
                                </button>
                            )}

                            {shiftStatus === 'working' && (
                                <>
                                    <button 
                                        onClick={handleLunchStart}
                                        className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer transition"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">coffee</span>
                                        ALMUERZO / DESCANSO
                                    </button>
                                    <button 
                                        onClick={handleShiftEnd}
                                        className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer transition"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">stop</span>
                                        FINALIZAR TURNO
                                    </button>
                                </>
                            )}

                            {shiftStatus === 'lunch' && (
                                <button 
                                    onClick={handleLunchEnd}
                                    className="col-span-2 bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow transition"
                                >
                                    <span className="material-symbols-outlined">restart_alt</span>
                                    RETOMAR TRABAJO
                                </button>
                            )}

                            {shiftStatus === 'finished' && (
                                <div className="col-span-2 glass-card p-6 text-center text-sm text-green-500 font-bold border border-green-500/20 bg-green-500/5">
                                    ✅ ¡Jornada completada exitosamente! Que tengas un excelente día de descanso.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: TAREAS ASIGNADAS */}
                {activeTab === 'tareas' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-base text-on-surface">Mis Tareas Pendientes</h3>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-bold">
                                {tasks.filter(t => t.status === 'pending').length} por hacer
                            </span>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="glass-card p-8 text-center text-xs text-on-surface-variant rounded-2xl border border-outline/10">
                                No tienes tareas asignadas en este momento. ¡Buen trabajo!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {tasks.map((task) => (
                                    <div 
                                        key={task.id}
                                        onClick={() => handleToggleTask(task.id, task.status)}
                                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition hover:border-primary/50 ${
                                            task.status === 'completed' ? 'bg-green-500/5 border-green-500/20 text-on-surface-variant/70' : 'bg-surface-container/20 border-outline/10 text-on-surface'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-[20px] ${
                                                task.status === 'completed' ? 'text-green-500' : 'text-on-surface-variant'
                                            }`}>
                                                {task.status === 'completed' ? 'check_box' : 'check_box_outline_blank'}
                                            </span>
                                            <span className={`text-xs ${task.status === 'completed' ? 'line-through' : 'font-medium'}`}>
                                                {task.task_description}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-on-surface-variant/60 font-mono">
                                            {new Date(task.created_at).toLocaleDateString('es-CO')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: RRHH SOLICITUDES & CERTIFICADOS */}
                {activeTab === 'solicitudes' && (
                    <div className="space-y-6">
                        
                        {/* Auto-generar carta laboral */}
                        <div className="glass-card p-5 rounded-2xl border border-outline/10 flex flex-col items-center text-center">
                            <span className="material-symbols-outlined text-primary text-[32px] mb-2">description</span>
                            <h4 className="font-bold text-xs">Certificación Laboral Digital</h4>
                            <p className="text-[10px] text-on-surface-variant/80 mt-1 max-w-xs">Genera tu carta laboral certificada con cargo y sueldo de forma inmediata.</p>
                            <button
                                onClick={handleGenerateLaboralLetter}
                                className="mt-3.5 px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl cursor-pointer transition shadow"
                            >
                                Descargar / Ver Certificado
                            </button>

                            {laboralLetter && (
                                <div className="mt-4 p-4 bg-white text-black text-left text-xs font-sans rounded-xl border border-outline/20 leading-relaxed shadow-inner max-h-[300px] overflow-y-auto w-full whitespace-pre-line">
                                    <div className="font-bold text-center border-b border-gray-300 pb-2 mb-2 uppercase text-[10px]">Vista Previa de Certificado</div>
                                    {laboralLetter}
                                    <button 
                                        onClick={() => window.print()}
                                        className="w-full mt-4 bg-gray-900 text-white font-bold p-2 rounded text-center cursor-pointer hover:bg-black"
                                    >
                                        Imprimir Documento
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Solicitar Vacaciones/Incapacidad */}
                        <div className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
                            <h3 className="font-bold text-sm text-on-surface border-b border-outline/10 pb-2">Subir Incapacidad o Solicitar Vacaciones</h3>
                            
                            {docError && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl font-bold">⚠️ {docError}</div>}
                            {docSuccess && <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs p-3 rounded-xl font-bold">✓ {docSuccess}</div>}

                            <form onSubmit={handleSubmitRequest} className="space-y-3.5 text-xs text-on-surface">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant">Tipo de Solicitud</label>
                                    <select
                                        value={docType}
                                        onChange={(e) => setDocType(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface outline-none cursor-pointer"
                                    >
                                        <option value="vacaciones">Vacaciones Anuales</option>
                                        <option value="incapacidad">Subir Incapacidad Médica</option>
                                        <option value="permiso">Permiso Remunerado / No Remunerado</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-on-surface-variant">Fecha de Inicio</label>
                                        <input 
                                            type="date"
                                            required
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-on-surface-variant">Fecha de Fin (Opcional)</label>
                                        <input 
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant">Motivo / Justificación</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface outline-none resize-none font-sans"
                                        placeholder="Describe brevemente el motivo..."
                                    />
                                </div>

                                {docType === 'incapacidad' && (
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-on-surface-variant">Cargar Foto de Incapacidad (Opcional)</label>
                                        <input 
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="w-full border border-dashed border-outline/20 p-2.5 rounded-xl text-on-surface outline-none cursor-pointer bg-white/5"
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary-container text-white py-2.5 rounded-xl font-bold cursor-pointer transition text-xs"
                                >
                                    Enviar Solicitud
                                </button>
                            </form>
                        </div>

                        {/* Historial de Solicitudes */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm text-on-surface">Historial de Solicitudes</h3>
                            {requests.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">No has presentado solicitudes todavía.</p>
                            ) : (
                                <div className="space-y-2">
                                    {requests.map((req) => (
                                        <div key={req.id} className="p-3 bg-surface-container/20 border border-outline/10 rounded-xl text-xs space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-primary capitalize">{req.doc_type.replace('_', ' ')}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                    req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                    req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                    {req.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-on-surface-variant font-medium">{req.reason}</p>
                                            <div className="flex justify-between items-center text-[10px] text-on-surface-variant/60 font-mono mt-2 pt-1 border-t border-outline/5">
                                                <span>📅 {new Date(req.start_date).toLocaleDateString('es-CO')}</span>
                                                <span>Creado: {new Date(req.created_at).toLocaleDateString('es-CO')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 5: CAMPAÑAS DE CAMPO (VISITAS) */}
                {activeTab === 'campanias' && (
                    <div className="space-y-6">
                        {/* Title and Program button */}
                        <div className="flex justify-between items-center bg-surface-container/20 p-4 rounded-2xl border border-outline/5">
                            <div>
                                <h3 className="font-bold text-sm text-on-surface">Mis Campañas de Campo</h3>
                                <p className="text-[10px] text-on-surface-variant">Revisa tus asignaciones puerta a puerta o en punto físico y sube fotos de check-out.</p>
                            </div>
                            <button
                                onClick={() => { setVError(''); setVSuccess(''); setIsVCreateOpen(true); }}
                                className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white text-[10px] font-bold rounded-xl border-0 cursor-pointer flex items-center gap-1.5 transition shadow"
                            >
                                <span className="material-symbols-outlined text-[14px]">add_location</span>
                                Nueva
                            </button>
                        </div>

                        {vSuccess && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs p-3 rounded-xl font-bold">
                                ✅ {vSuccess}
                            </div>
                        )}

                        {/* List of campaigns */}
                        <div className="space-y-4">
                            {visitsLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : visits.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-outline/20 rounded-2xl bg-surface-container/5">
                                    <span className="material-symbols-outlined text-on-surface-variant/40 text-[40px] mb-1">explore</span>
                                    <p className="text-xs font-bold text-on-surface-variant">No tienes visitas asignadas o creadas hoy.</p>
                                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5">Haz clic en "Nueva" para agendar una visita en tu zona actual.</p>
                                </div>
                            ) : (
                                visits.map((v: any) => (
                                    <div key={v.id} className="p-4 bg-surface-container/20 border border-outline/10 rounded-xl space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`material-symbols-outlined text-[14px] ${v.campaign_type === 'calle' ? 'text-amber-500' : 'text-primary'}`}>
                                                        {v.campaign_type === 'calle' ? 'streetview' : 'domain'}
                                                    </span>
                                                    <span className="font-bold text-xs text-on-surface capitalize">{v.name}</span>
                                                </div>
                                                <p className="text-[8px] text-on-surface-variant font-mono mt-0.5">Visita: {new Date(v.visit_date).toLocaleDateString('es-CO')}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                                v.status === 'programada' ? 'bg-blue-500/10 text-blue-500' :
                                                v.status === 'en_progreso' ? 'bg-amber-500/10 text-amber-500' :
                                                v.status === 'completada' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                                {v.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="text-[11px] space-y-1 bg-white/5 p-2.5 rounded-lg border border-outline/5">
                                            <p className="text-on-surface-variant">📍 Barrio: <strong className="text-on-surface">{v.barrio || 'N/A'}</strong> ({v.municipio})</p>
                                            <p className="text-on-surface-variant">⛪ Punto: <strong className="text-on-surface">{v.point_of_sale}</strong></p>
                                            <p className="text-on-surface-variant">📞 Contacto: <strong className="text-on-surface">{v.contact_name}</strong></p>
                                            <p className="text-on-surface-variant border-t border-outline/5 pt-1 mt-1 text-[10px]">
                                                Dirección: <strong className="text-on-surface">{v.address}</strong>
                                            </p>
                                            {v.agreement_terms && (
                                                <p className="text-[10px] text-primary italic bg-primary/5 p-1.5 rounded-md mt-1">
                                                    Convenio: {v.agreement_terms}
                                                </p>
                                            )}
                                        </div>

                                        {/* Performance metrics */}
                                        <div className="grid grid-cols-2 gap-2 text-center text-[10px] border-y border-outline/5 py-1.5">
                                            <div>
                                                <span className="text-on-surface-variant uppercase block text-[8px]">Inscritos Captados</span>
                                                <strong className="text-white">{v.registered_customers_count || 0} Leads</strong>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant uppercase block text-[8px]">Ventas ROI</span>
                                                <strong className="text-green-500">${new Intl.NumberFormat('es-CO').format(v.total_sales_amount || 0)} COP</strong>
                                            </div>
                                        </div>

                                        {v.proof_photo_url && (
                                            <div className="space-y-1">
                                                <span className="text-[8px] text-on-surface-variant font-bold uppercase block">Prueba de Check-out:</span>
                                                <div className="h-24 rounded-lg overflow-hidden border border-outline/5">
                                                    <img src={v.proof_photo_url} className="w-full h-full object-cover" alt="Visita" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Checkout Actions */}
                                        {v.status === 'programada' && (
                                            <div className="flex justify-end pt-1">
                                                <button
                                                    onClick={() => handleVUpdateStatus(v.id, 'en_progreso')}
                                                    className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer transition flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                                                    Iniciar Visita
                                                </button>
                                            </div>
                                        )}

                                        {v.status === 'en_progreso' && (
                                            <div className="flex justify-end pt-1">
                                                <button
                                                    onClick={() => handleVUpdateStatus(v.id, 'completada')}
                                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer transition flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                                    Completar check-out (Foto)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* CREATE VISITA / CAMPAÑA FORM DIALOG */}
                        {isVCreateOpen && (
                            <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                                <div className="glass-card max-w-sm w-full rounded-2xl p-5 shadow-2xl animate-float max-h-[85vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-center border-b border-outline/10 pb-2 mb-3">
                                        <h4 className="font-bold text-sm text-on-surface">Registrar Nueva Visita</h4>
                                        <button
                                            onClick={() => setIsVCreateOpen(false)}
                                            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>

                                    {vError && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] p-2 rounded-lg mb-3 font-bold">
                                            ⚠️ {vError}
                                        </div>
                                    )}

                                    <form onSubmit={handleCreateVisit} className="space-y-3 text-[11px]">
                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Nombre de la Visita</label>
                                            <input
                                                type="text"
                                                required
                                                value={vName}
                                                onChange={(e) => setVName(e.target.value)}
                                                className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none focus:border-primary"
                                                placeholder="Ej: Convenio Colsubsidio"
                                            />
                                        </div>

                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Tipo de Visita</label>
                                            <select
                                                value={vType}
                                                onChange={(e) => setVType(e.target.value as any)}
                                                className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none cursor-pointer"
                                            >
                                                <option value="sitio">Sitio (Convenio en Empresa/Colegio)</option>
                                                <option value="calle">Calle (Puerta a Puerta en Barrio)</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Depto</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={vDept}
                                                    onChange={(e) => setVDept(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Municipio</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={vMun}
                                                    onChange={(e) => setVMun(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Barrio</label>
                                                <input
                                                    type="text"
                                                    value={vBarrio}
                                                    onChange={(e) => setVBarrio(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                                    placeholder="Ej: Bosa"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Punto Físico</label>
                                                <input
                                                    type="text"
                                                    value={vPos}
                                                    onChange={(e) => setVPos(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                                    placeholder="Ej: Colegio Mayor"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Dirección Completa</label>
                                            <input
                                                type="text"
                                                required
                                                value={vAddress}
                                                onChange={(e) => setVAddress(e.target.value)}
                                                className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                                placeholder="Ej: Carrera 7 # 12 - 34"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Encargado</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={vContact}
                                                    onChange={(e) => setVContact(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                                    placeholder="Ej: Dr. Gómez"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Teléfono</label>
                                                <input
                                                    type="text"
                                                    value={vSecondary}
                                                    onChange={(e) => setVSecondary(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                                    placeholder="Ej: 3009998877"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Acuerdos del Convenio</label>
                                            <textarea
                                                value={vAgreement}
                                                onChange={(e) => setVAgreement(e.target.value)}
                                                rows={2}
                                                className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface outline-none resize-none"
                                                placeholder="Ej: Charlas autorizadas en aulas..."
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase">GPS Georreferencia</label>
                                                <button
                                                    type="button"
                                                    onClick={handleVGetCurrentLocation}
                                                    className="text-[9px] text-primary hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-0.5"
                                                >
                                                    <span className="material-symbols-outlined text-[10px]">my_location</span>
                                                    Fijar GPS
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Lat"
                                                    value={vLat}
                                                    onChange={(e) => setVLat(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface font-mono"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Lng"
                                                    value={vLng}
                                                    onChange={(e) => setVLng(e.target.value)}
                                                    className="w-full bg-surface-container-high/40 border border-outline/25 p-2 rounded-xl text-on-surface font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase">Foto de Comprobante</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleVFileChange}
                                                className="w-full text-[10px] text-on-surface-variant file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-primary/15 file:text-primary file:cursor-pointer cursor-pointer"
                                            />
                                            {vPhoto && (
                                                <div className="h-16 rounded-lg overflow-hidden border border-outline/5 mt-1">
                                                    <img src={vPhoto} className="w-full h-full object-cover" alt="Preview" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 justify-end pt-3 border-t border-outline/10">
                                            <button
                                                type="button"
                                                onClick={() => setIsVCreateOpen(false)}
                                                className="px-3.5 py-1.5 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-lg font-bold cursor-pointer text-[10px] transition bg-transparent"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3.5 py-1.5 bg-primary hover:bg-primary-container text-white rounded-lg font-bold cursor-pointer text-[10px] transition border-0"
                                            >
                                                Guardar Visita
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: CHAT CORPORATIVO INTEGRADO CON IA */}
                {activeTab === 'chat' && (
                    <div className="flex flex-col h-[75vh] glass-card rounded-3xl overflow-hidden border border-outline/10">
                        {/* Channel selector */}
                        <div className="bg-surface-container-high/20 border-b border-outline/10 p-3.5 flex justify-between items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[20px] text-primary">chat_bubble</span>
                                <select 
                                    value={chatChannel}
                                    onChange={(e) => {
                                        setChatChannel(e.target.value);
                                        setChatMessages([]);
                                    }}
                                    className="bg-transparent border-0 font-bold text-xs text-on-surface outline-none cursor-pointer"
                                >
                                    <option value="general">📣 Canal General</option>
                                    <option value="ventas">💰 Canal Ventas</option>
                                    <option value="soporte">🔧 Canal Soporte</option>
                                    <option value="asistente">🤖 Consultar Asistente IA</option>
                                </select>
                            </div>
                            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                                Live Polling
                            </span>
                        </div>

                        {/* Chat messages area */}
                        <div className="flex-grow p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-surface-container-low/10">
                            {chatMessages.length === 0 ? (
                                <div className="text-center text-on-surface-variant/60 text-xs py-10 flex flex-col items-center space-y-2">
                                    <span className="material-symbols-outlined text-[32px]">forum</span>
                                    <p>No hay mensajes en este canal. ¡Sé el primero en escribir!</p>
                                    {chatChannel === 'asistente' && (
                                        <p className="text-[10px] text-primary/80 font-bold max-w-xs mt-1">Aquí puedes hacer preguntas al asistente IA sobre la información de la empresa, inventario o asignaciones.</p>
                                    )}
                                </div>
                            ) : (
                                chatMessages.map((msg) => {
                                    const isMe = msg.employee_id === employeeId || msg.sender_name === employeeName;
                                    const isAI = msg.sender_name === 'Asistente IA 🤖';
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[9px] text-on-surface-variant font-bold mb-1 px-1">
                                                {msg.sender_name}
                                            </span>
                                            <div className={`p-3 rounded-2xl text-xs max-w-[85%] border shadow-sm ${
                                                isMe ? 'bg-primary border-primary/20 text-white rounded-tr-none' : 
                                                isAI ? 'bg-[#002f5c]/40 border-secondary/20 text-white rounded-tl-none font-sans leading-relaxed' :
                                                'bg-surface-container border-outline/10 text-on-surface rounded-tl-none'
                                            }`}>
                                                {msg.message_text}
                                            </div>
                                            <span className="text-[8px] text-on-surface-variant/40 font-mono mt-1 px-1">
                                                {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Send message form */}
                        <form onSubmit={handleSendChatMessage} className="p-3 bg-surface-container-high/30 border-t border-outline/10 flex gap-2">
                            <input 
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="flex-grow bg-surface-container-high/60 border border-outline/20 p-2.5 rounded-xl text-xs text-on-surface focus:border-primary outline-none"
                                placeholder={chatChannel === 'asistente' ? "Pregúntale al bot de la empresa..." : "Escribe un mensaje al canal..."}
                            />
                            <button
                                type="submit"
                                disabled={chatLoading || !chatInput.trim()}
                                className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-container text-white flex items-center justify-center border-0 cursor-pointer disabled:opacity-50 transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">send</span>
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};
