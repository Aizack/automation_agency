import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RestaurantWaiterPortal } from './RestaurantWaiterPortal';

interface Task {
    id: string;
    task_description: string;
    title: string;
    description: string | null;
    status: string; // e.g. pendiente, en proceso, terminado / completed
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
    notes?: string;
    admin_notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'negotiating';
    created_at: string;
}

export const EmployeePortal: React.FC = () => {
    const formatDateOnly = (dateStr: string) => {
        if (!dateStr) return '';
        const part = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = part.split('-');
        if (parts.length === 3) {
            return `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
        }
        return new Date(dateStr).toLocaleDateString('es-CO');
    };



    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Session Data
    const [employeeToken, setEmployeeToken] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [employeeRole, setEmployeeRole] = useState('');
    const [clientCategory, setClientCategory] = useState('');
    const [clientId, setClientId] = useState('');

    // Dashboard State
    const [shiftStatus, setShiftStatus] = useState<'no_started' | 'working' | 'lunch' | 'finished'>('no_started');
    const [shiftTimer, setShiftTimer] = useState('00:00:00');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [requests, setRequests] = useState<DocRequest[]>([]);

    // States for task detail modal and updates
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskUpdates, setTaskUpdates] = useState<any[]>([]);
    const [loadingUpdates, setLoadingUpdates] = useState(false);
    const [newReportText, setNewReportText] = useState('');
    const [newSelectedStatus, setNewSelectedStatus] = useState<string>('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // States for employee creating own tasks / visits
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [taskFormTitle, setTaskFormTitle] = useState('');
    const [taskFormDesc, setTaskFormDesc] = useState('');
    const [taskFormType, setTaskFormType] = useState<'tarea' | 'visita'>('tarea');
    const [taskFormDueDate, setTaskFormDueDate] = useState('');
    const [taskFormDueTime, setTaskFormDueTime] = useState('');
    const [crmSearchQuery, setCrmSearchQuery] = useState('');
    const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
    const [selectedCrmCustomerId, setSelectedCrmCustomerId] = useState<string>('');
    const [showCrmSuggestions, setShowCrmSuggestions] = useState(false);
    const [activeTab, setActiveTab] = useState<'turnos' | 'mesas' | 'tareas' | 'solicitudes' | 'chat' | 'campanias' | 'finanzas' | 'entregas'>('turnos');
    const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
    const [deliveriesLoading, setDeliveriesLoading] = useState(false);

    const fetchMyDeliveries = async () => {
        const storedToken = localStorage.getItem('emp_token') || employeeToken;
        const storedClientId = localStorage.getItem('emp_client_id') || clientId;
        const storedEmpId = localStorage.getItem('emp_id') || employeeId;
        if (!storedClientId || !storedEmpId) return;

        try {
            setDeliveriesLoading(true);
            const res = await fetch(`/api/clients/${storedClientId}/employees/${storedEmpId}/deliveries`, {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setMyDeliveries(json.deliveries || []);
            }
        } catch (err) {
            console.error("Error loading employee deliveries:", err);
        } finally {
            setDeliveriesLoading(false);
        }
    };

    // Timer Interval ref
    const [timerActive, setTimerActive] = useState(false);
    const [shiftStartTimestamp, setShiftStartTimestamp] = useState<number | null>(null);
    const [myShifts, setMyShifts] = useState<any[]>([]);

    // Lunch Timer States
    const [lunchTimer, setLunchTimer] = useState('00:00:00');
    const [lunchStartTimestamp, setLunchStartTimestamp] = useState<number | null>(null);
    const [lunchTimerActive, setLunchTimerActive] = useState(false);
    const [workModality, setWorkModality] = useState<'presencial' | 'remoto'>('presencial');

    // Form States
    const [docType, setDocType] = useState('vacaciones');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
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
    const [employees, setEmployees] = useState<any[]>([]);

    // Salary Advances States
    const [myAdvances, setMyAdvances] = useState<any[]>([]);
    const [advLoading, setAdvLoading] = useState(false);
    const [advAmount, setAdvAmount] = useState('');
    const [advDate, setAdvDate] = useState('');
    const [advNotes, setAdvNotes] = useState('');

    const fetchMyAdvances = async () => {
        const storedToken = localStorage.getItem('emp_token') || employeeToken;
        const storedClientId = localStorage.getItem('emp_client_id') || clientId;
        const storedEmpId = localStorage.getItem('emp_id') || employeeId;
        if (!storedClientId || !storedToken || !storedEmpId) return;
        try {
            setAdvLoading(true);
            const res = await fetch(`/api/clients/${storedClientId}/employee-advances?employeeId=${storedEmpId}`, {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setMyAdvances(json.advances || []);
            }
        } catch (err) {
            console.error("Error loading employee advances:", err);
        } finally {
            setAdvLoading(false);
        }
    };

    const handleRequestAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        const storedToken = localStorage.getItem('emp_token') || employeeToken;
        const storedClientId = localStorage.getItem('emp_client_id') || clientId;
        const storedEmpId = localStorage.getItem('emp_id') || employeeId;
        if (!storedClientId || !storedToken || !storedEmpId || !advAmount) return;

        try {
            const res = await fetch(`/api/clients/${storedClientId}/employee-advances`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${storedToken}`
                },
                body: JSON.stringify({
                    employeeId: storedEmpId,
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
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al solicitar anticipo.');
        }
    };

    const handleConfirmAdvanceDelivery = async (advanceId: string) => {
        const storedToken = localStorage.getItem('emp_token') || employeeToken;
        const storedClientId = localStorage.getItem('emp_client_id') || clientId;
        if (!storedClientId || !storedToken) return;

        if (!confirm('¿Confirmas que has recibido el dinero de este anticipo?')) return;

        try {
            const res = await fetch(`/api/clients/${storedClientId}/employee-advances/${advanceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${storedToken}`
                },
                body: JSON.stringify({
                    confirmedByEmployee: true,
                    status: 'delivered'
                })
            });
            const json = await res.json();
            if (json.success) {
                fetchMyAdvances();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al confirmar recibido.');
        }
    };

    const fetchEmployees = async () => {
        const storedToken = localStorage.getItem('emp_token') || employeeToken;
        const storedClientId = localStorage.getItem('emp_client_id') || clientId;
        if (!storedClientId || !storedToken) return;
        try {
            const res = await fetch(`/api/clients/${storedClientId}/employees`, {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setEmployees(json.employees || []);
            }
        } catch (err) {
            console.error("Error loading employees list in EmployeePortal chat:", err);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchEmployees();
        }
    }, [isAuthenticated, clientId, employeeToken]);

    // check localstorage session
    useEffect(() => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const res = await originalFetch(...args);
            if (res.status === 403) {
                const clone = res.clone();
                try {
                    const json = await clone.json();
                    if (json.error === 'Token inválido o expirado.') {
                        localStorage.removeItem('emp_token');
                        localStorage.removeItem('emp_id');
                        localStorage.removeItem('emp_name');
                        localStorage.removeItem('emp_role');
                        localStorage.removeItem('emp_client_id');
                        localStorage.removeItem('shift_start_ts');
                        alert('Tu sesión de empleado ha expirado. Por favor inicia sesión nuevamente.');
                        window.location.reload();
                    }
                } catch (e) {
                    // Ignore
                }
            }
            return res;
        };

        const storedToken = localStorage.getItem('emp_token');
        const storedEmpId = localStorage.getItem('emp_id');
        const storedName = localStorage.getItem('emp_name');
        const storedRole = localStorage.getItem('emp_role');
        const storedCategory = localStorage.getItem('emp_client_category');
        const storedClientId = localStorage.getItem('emp_client_id');
        const storedShiftStart = localStorage.getItem('shift_start_ts');

        if (storedToken && storedEmpId && storedClientId) {
            setEmployeeToken(storedToken);
            setEmployeeId(storedEmpId);
            setEmployeeName(storedName || 'Empleado');
            setEmployeeRole(storedRole || 'employee');
            setClientCategory(storedCategory || '');
            setClientId(storedClientId);
            setIsAuthenticated(true);

            if (storedShiftStart) {
                setShiftStartTimestamp(parseInt(storedShiftStart));
                setTimerActive(true);
                setShiftStatus('working');
            }
        }

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    // Fetch Tasks & Requests when authenticated
    useEffect(() => {
        if (isAuthenticated && employeeId && clientId) {
            fetchTasks();
            fetchRequests();
            fetchVisits();
            fetchActiveShiftStatus();
            fetchCrmCustomers();
            fetchMyDeliveries();
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

    // Lunch Timer effect
    useEffect(() => {
        let interval: any = null;
        if (lunchTimerActive && lunchStartTimestamp) {
            interval = setInterval(() => {
                const elapsedMs = Date.now() - lunchStartTimestamp;
                const secs = Math.floor((elapsedMs / 1000) % 60);
                const mins = Math.floor((elapsedMs / (1000 * 60)) % 60);
                const hours = Math.floor((elapsedMs / (1000 * 60 * 60)) % 24);
                setLunchTimer(
                    `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                );
            }, 1000);
        } else {
            setLunchTimer('00:00:00');
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [lunchTimerActive, lunchStartTimestamp]);

    // Auto-sync Active Shift Status with Backend
    const fetchActiveShiftStatus = async () => {
        if (!clientId || !employeeId || !employeeToken) return;
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
                        // Shift is active!
                        const clockInTs = new Date(latestShift.clock_in).getTime();
                        setShiftStartTimestamp(clockInTs);
                        
                        if (latestShift.lunch_start && !latestShift.lunch_end) {
                            // In lunch!
                            setShiftStatus('lunch');
                            const lunchStartTs = new Date(latestShift.lunch_start).getTime();
                            setLunchStartTimestamp(lunchStartTs);
                            setLunchTimerActive(true);
                            setTimerActive(false);
                        } else {
                            // Working!
                            setShiftStatus('working');
                            setTimerActive(true);
                            setLunchTimerActive(false);
                            if (latestShift.lunch_start && latestShift.lunch_end) {
                                const elapsedMs = new Date(latestShift.lunch_end).getTime() - new Date(latestShift.lunch_start).getTime();
                                const secs = Math.floor((elapsedMs / 1000) % 60);
                                const mins = Math.floor((elapsedMs / (1000 * 60)) % 60);
                                const hours = Math.floor((elapsedMs / (1000 * 60 * 60)) % 24);
                                setLunchTimer(
                                    `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                                );
                            }
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
            console.error("Error fetching active shift status:", err);
        }
    };

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

    useEffect(() => {
        if (isAuthenticated && activeTab === 'finanzas') {
            fetchMyAdvances();
        }
    }, [isAuthenticated, activeTab, clientId, employeeToken]);



    // LOGOUT ACTION
    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('session_role');
        localStorage.removeItem('session_name');
        localStorage.removeItem('current_view');
        localStorage.removeItem('current_client_id');
        localStorage.removeItem('employee_role');
        localStorage.removeItem('employee_permissions');
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
        window.location.reload();
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

    // FETCH TASK UPDATES
    const fetchTaskUpdates = async (taskId: string) => {
        try {
            setLoadingUpdates(true);
            const headers = { 'Authorization': `Bearer ${employeeToken}` };
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/tasks/${taskId}/updates`, { headers });
            const json = await res.json();
            if (json.success) {
                setTaskUpdates(json.updates || []);
            }
        } catch (err) {
            console.error("Error fetching task updates:", err);
        } finally {
            setLoadingUpdates(false);
        }
    };

    // SUBMIT TASK UPDATE & REPORT
    const handleSubmitTaskUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask || !newReportText.trim() || !newSelectedStatus) return;

        try {
            setIsSubmittingReport(true);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            };
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/tasks/${selectedTask.id}/updates`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    new_status: newSelectedStatus,
                    report_text: newReportText,
                    created_by_name: employeeName
                })
            });
            const json = await res.json();
            if (json.success) {
                setNewReportText('');
                // update selected task locally
                setSelectedTask({
                    ...selectedTask,
                    status: newSelectedStatus
                });
                // reload task updates history
                fetchTaskUpdates(selectedTask.id);
                // reload general tasks list
                fetchTasks();
            } else {
                alert(json.error || 'Error al guardar reporte.');
            }
        } catch (err) {
            console.error("Error saving task report:", err);
            alert("Error de conexión al guardar el reporte.");
        } finally {
            setIsSubmittingReport(false);
        }
    };

    // FETCH CRM CUSTOMERS FOR VISITS
    const fetchCrmCustomers = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${employeeToken}` };
            const res = await fetch(`/api/clients/${clientId}/crm-customers`, { headers });
            const json = await res.json();
            if (json.success) {
                setCrmCustomers(json.customers || []);
            }
        } catch (err) {
            console.error("Error loading CRM customers:", err);
        }
    };

    // CREATE EMPLOYEE OWN TASK OR VISIT
    const handleCreateEmployeeOwnTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskFormTitle.trim()) return;

        try {
            setIsSubmittingReport(true);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            };
            
            const dueDateTime = (taskFormDueDate && taskFormDueTime) 
                ? `${taskFormDueDate}T${taskFormDueTime}` 
                : (taskFormDueDate || null);

            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/tasks`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: taskFormTitle,
                    description: taskFormDesc,
                    due_date: dueDateTime,
                    created_by_name: employeeName,
                    task_type: taskFormType,
                    target_customer_id: taskFormType === 'visita' ? selectedCrmCustomerId : null
                })
            });
            const json = await res.json();
            if (json.success) {
                setIsCreateTaskOpen(false);
                setTaskFormTitle('');
                setTaskFormDesc('');
                setTaskFormType('tarea');
                setTaskFormDueDate('');
                setTaskFormDueTime('');
                setCrmSearchQuery('');
                setSelectedCrmCustomerId('');
                fetchTasks();
            } else {
                alert(json.error || 'Error al crear la tarea/visita.');
            }
        } catch (err) {
            console.error("Error creating employee task:", err);
            alert("Error de conexión al crear la tarea/visita.");
        } finally {
            setIsSubmittingReport(false);
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
                    return_date: returnDate || null,
                    reason: reason,
                    file_url: fileBase64 || null
                })
            });
            const json = await res.json();
            if (json.success) {
                setDocSuccess('Solicitud enviada correctamente a administración.');
                setStartDate('');
                setEndDate('');
                setReturnDate('');
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
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/clock-in`, {
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
                setLunchTimerActive(false);
                fetchActiveShiftStatus();
            }
        } catch (err) {
            console.error("Error starting shift:", err);
        }
    };

    const handleShiftEnd = async () => {
        if (!window.confirm('¿Deseas finalizar tu turno del día de hoy?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/clock-out`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                localStorage.removeItem('shift_start_ts');
                setTimerActive(false);
                setLunchTimerActive(false);
                setShiftStartTimestamp(null);
                setShiftStatus('finished');
                fetchActiveShiftStatus();
            }
        } catch (err) {
            console.error("Error ending shift:", err);
        }
    };

    const handleLunchStart = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/lunch-start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setShiftStatus('lunch');
                setTimerActive(false);
                const startTs = Date.now();
                setLunchStartTimestamp(startTs);
                setLunchTimerActive(true);
                fetchActiveShiftStatus();
            }
        } catch (err) {
            console.error("Error starting lunch:", err);
        }
    };

    const handleLunchEnd = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${employeeId}/lunch-end`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            });
            const json = await res.json();
            if (json.success) {
                setShiftStatus('working');
                setTimerActive(true);
                setLunchTimerActive(false);
                fetchActiveShiftStatus();
            }
        } catch (err) {
            console.error("Error ending lunch:", err);
        }
    };

    const getTargetChannelName = (val: string) => {
        if (val.startsWith('emp_')) {
            const targetEmpId = val.split('_')[1];
            const sorted = [employeeId, targetEmpId].sort();
            return `direct_${sorted[0]}_${sorted[1]}`;
        }
        return val;
    };

    // FETCH CHAT MESSAGES
    const fetchChatMessages = async (isPolling = false) => {
        try {
            const sinceQuery = isPolling && chatMessages.length > 0
                ? `&since=${encodeURIComponent(chatMessages[chatMessages.length - 1].created_at)}`
                : '';
            
            const resolvedChannel = getTargetChannelName(chatChannel);
            const res = await fetch(`/api/clients/${clientId}/chats/messages?channel=${resolvedChannel}${sinceQuery}`, {
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
            const resolvedChannel = getTargetChannelName(chatChannel);
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
                    channel: resolvedChannel
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

    // PANTALLA DE VERIFICACIÓN / CARGA DE SESIÓN
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#070b13] text-white flex flex-col items-center justify-center font-sans">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-[#d8a24e] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider animate-pulse">Cargando perfil de trabajo...</p>
                </div>
            </div>
        );
    }

    const getTaskStatusInfo = (task: any) => {
        const isCompleted = task.status === 'completed' || task.status === 'terminado';
        const isOverdue = !isCompleted && task.due_date && new Date(task.due_date) < new Date();
        
        if (isCompleted) {
            return {
                label: 'Terminado',
                bgColor: 'bg-green-500/10 border-green-500/20 text-green-500',
                badgeColor: 'bg-green-500',
                textColor: 'text-green-500'
            };
        }
        if (isOverdue) {
            return {
                label: 'Atrasado',
                bgColor: 'bg-red-500/10 border-red-500/20 text-red-500',
                badgeColor: 'bg-red-500',
                textColor: 'text-red-500 animate-pulse'
            };
        }
        if (task.status === 'en proceso' || task.status === 'en_proceso') {
            return {
                label: 'En Proceso',
                bgColor: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
                badgeColor: 'bg-yellow-500',
                textColor: 'text-yellow-500'
            };
        }
        // Default is pendiente
        return {
            label: 'Pendiente',
            bgColor: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
            badgeColor: 'bg-blue-500',
            textColor: 'text-blue-500'
        };
    };

    const roleLower = (employeeRole || '').toLowerCase().trim();
    const categoryLower = (clientCategory || '').toLowerCase().trim();

    // Permisos Dinámicos por Categoría de Negocio y Rol de Empleado
    const isDeliveryGuy = ['delivery', 'domiciliario', 'mensajero', 'driver', 'admin'].includes(roleLower) || myDeliveries.length > 0;
    const canSeeTables = (categoryLower === 'restaurante' || categoryLower.includes('restauran') || categoryLower.includes('gastrono')) &&
                          (['waiter', 'mesero', 'cashier', 'cajero', 'kitchen', 'cocina', 'admin'].includes(roleLower) || !roleLower || roleLower === 'employee');
    const canSeeVisits = ['vendedor', 'field', 'comercial', 'sales', 'admin'].includes(roleLower);

    // MAIN DASHBOARD PORTAL
    return (
        <div className="min-h-screen bg-[#0d0d0d] text-on-surface font-sans flex flex-col md:flex-row">
            {/* Sidebar Navigation (Visible on Desktop) */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-[#0d0d0d] border-r border-outline/10 p-6 flex-shrink-0 justify-between">
                <div className="space-y-8">
                    {/* User profile card */}
                    <div className="flex items-center gap-3 border-b border-outline/10 pb-6">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                            {employeeName[0]?.toUpperCase() || 'E'}
                        </div>
                        <div>
                            <h2 className="font-semibold text-xs text-on-surface truncate max-w-[150px]">{employeeName}</h2>
                            <p className="text-[10px] text-on-surface-variant/70 font-mono uppercase truncate max-w-[150px]">Rol: {employeeRole}</p>
                        </div>
                    </div>

                    {/* Nav links */}
                    <nav className="flex flex-col gap-1.5">
                        <button 
                            onClick={() => setActiveTab('turnos')}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                activeTab === 'turnos' 
                                    ? 'bg-white/5 text-on-surface sidebar-item-active font-medium' 
                                    : 'bg-transparent text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface font-normal'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px] opacity-70">schedule</span>
                            Mi Jornada
                        </button>

                        {canSeeTables && (
                            <button 
                                onClick={() => setActiveTab('mesas')}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                    activeTab === 'mesas' 
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 sidebar-item-active font-bold' 
                                        : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-medium'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[15px]">table_restaurant</span>
                                🪑 Mis Mesas & Comandero
                            </button>
                        )}

                        <button 
                            onClick={() => setActiveTab('tareas')}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                activeTab === 'tareas' 
                                    ? 'bg-white/5 text-on-surface sidebar-item-active font-medium' 
                                    : 'bg-transparent text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface font-normal'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px] opacity-70">task_alt</span>
                            Mis Tareas
                        </button>

                        {isDeliveryGuy && (
                            <button 
                                onClick={() => setActiveTab('entregas')}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                    activeTab === 'entregas' 
                                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 sidebar-item-active font-bold' 
                                        : 'bg-transparent text-emerald-400/80 hover:bg-emerald-500/10 hover:text-emerald-300 font-medium'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                                Mis Entregas ({myDeliveries.length})
                            </button>
                        )}

                        <button 
                            onClick={() => setActiveTab('solicitudes')}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                activeTab === 'solicitudes' 
                                    ? 'bg-white/5 text-on-surface sidebar-item-active font-medium' 
                                    : 'bg-transparent text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface font-normal'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px] opacity-70">assignment</span>
                            Mis Solicitudes
                        </button>

                        {canSeeVisits && (
                            <button 
                                onClick={() => setActiveTab('campanias')}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                    activeTab === 'campanias' 
                                        ? 'bg-white/5 text-on-surface sidebar-item-active font-medium' 
                                        : 'bg-transparent text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface font-normal'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[15px] opacity-70">explore</span>
                                Mis Visitas
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                activeTab === 'chat' 
                                    ? 'bg-white/5 text-on-surface sidebar-item-active font-medium' 
                                    : 'bg-transparent text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface font-normal'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px] opacity-70">smart_toy</span>
                            Chat IA
                        </button>
                        <button 
                            onClick={() => setActiveTab('finanzas')}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 cursor-pointer text-xs transition-all ${
                                activeTab === 'finanzas' 
                                    ? 'bg-white/5 text-on-surface sidebar-item-active font-medium' 
                                    : 'bg-transparent text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface font-normal'
                             }`}
                        >
                             <span className="material-symbols-outlined text-[15px] opacity-70">payments</span>
                             Mi Nómina & Anticipos
                        </button>
                    </nav>
                </div>

                {/* Logout button at bottom of sidebar */}
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 border border-outline/20 hover:border-error/30 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-xl cursor-pointer text-xs font-medium transition w-full bg-transparent"
                >
                    <span className="material-symbols-outlined text-[15px]">logout</span>
                    Cerrar Sesión
                </button>
            </aside>

            {/* Mobile/Flexible layout container */}
            <div className="flex-grow flex flex-col min-h-screen">
                {/* Header Navbar (Visible on Mobile) */}
                <header className="md:hidden bg-surface-container-low/20 backdrop-blur-md border-b border-outline/10 p-4 sticky top-0 z-30 flex justify-between items-center">
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

                {/* Mobile Tab Navigation (Visible on Mobile) */}
                <nav className="md:hidden bg-surface-container-high/20 border-b border-outline/10 flex justify-around p-1 select-none overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('turnos')}
                        className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                            activeTab === 'turnos' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined">schedule</span>
                        Jornada
                    </button>

                    {canSeeTables && (
                        <button 
                            onClick={() => setActiveTab('mesas')}
                            className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                                activeTab === 'mesas' ? 'text-amber-400 font-extrabold' : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            <span className="material-symbols-outlined text-amber-400">table_restaurant</span>
                            Mesas
                        </button>
                    )}

                    {isDeliveryGuy && (
                        <button 
                            onClick={() => setActiveTab('entregas')}
                            className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                                activeTab === 'entregas' ? 'text-emerald-400 font-extrabold' : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            <span className="material-symbols-outlined text-emerald-400">local_shipping</span>
                            Entregas
                        </button>
                    )}

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

                    {canSeeVisits && (
                        <button 
                            onClick={() => setActiveTab('campanias')}
                            className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                                activeTab === 'campanias' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            <span className="material-symbols-outlined">explore</span>
                            Visitas
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                            activeTab === 'chat' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined">smart_toy</span>
                        Chat IA
                    </button>
                    <button 
                        onClick={() => setActiveTab('finanzas')}
                        className={`flex flex-col items-center gap-1 py-2 flex-grow border-0 cursor-pointer transition text-[10px] font-bold bg-transparent ${
                            activeTab === 'finanzas' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined">payments</span>
                        Nómina
                    </button>
                </nav>

                {/* Main Content Area */}
                <main className={`flex-grow p-4 md:p-6 overflow-y-auto mx-auto w-full relative ${activeTab === 'mesas' ? 'max-w-7xl' : 'max-w-xl'}`}>

                    {/* TAB MESAS & COMANDERO (PARA MESEROS) */}
                    {activeTab === 'mesas' && (
                        <div className="space-y-4 text-left">
                            <RestaurantWaiterPortal clientId={clientId} waiterId={employeeId} waiterName={employeeName} />
                        </div>
                    )}

                    {/* TAB 1: TURNOS & ELAPSED TIMER */}
                    {activeTab === 'turnos' && (
                        <div className="space-y-6">
                            {/* Clock / Timer Widget */}
                            <div className="glass-card p-6 rounded-3xl text-center border border-outline/10 shadow-xl relative overflow-hidden bg-gradient-to-b from-surface-container/20 to-surface-container-high/40">
                                <span className="text-[10px] text-primary uppercase font-mono tracking-wider font-bold">
                                    {shiftStatus === 'lunch' ? 'Tiempo de Almuerzo (Activo)' : 'Tiempo de Jornada'}
                                </span>
                                <div className="text-4xl font-black font-mono tracking-wider my-3 text-white">
                                    {shiftStatus === 'lunch' ? lunchTimer : shiftTimer}
                                </div>
                                
                                {shiftStatus === 'lunch' && (
                                    <p className="text-xs text-on-surface-variant mb-3 font-mono">
                                        Jornada acumulada (pausada): {shiftTimer}
                                    </p>
                                )}

                                {shiftStatus === 'working' && lunchTimer !== '00:00:00' && (
                                    <p className="text-xs text-on-surface-variant mb-3 font-mono">
                                        Último descanso: {lunchTimer}
                                    </p>
                                )}
                                
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

                            {/* Selector de Modalidad (Solo si no ha iniciado turno o si está en turno) */}
                            {shiftStatus !== 'finished' && (
                                <div className="bg-surface-container/20 border border-outline/10 p-4 rounded-2xl">
                                    <span className="block text-[10px] text-on-surface-variant uppercase font-mono tracking-wider font-bold mb-3 text-center">
                                        Modalidad de Trabajo
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            type="button"
                                            disabled={shiftStatus !== 'no_started'}
                                            onClick={() => setWorkModality('presencial')}
                                            className={`py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                                                workModality === 'presencial'
                                                    ? 'bg-primary border-primary text-on-primary'
                                                    : 'bg-transparent border-outline/20 text-on-surface-variant hover:border-primary/50'
                                            } ${shiftStatus !== 'no_started' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">domain</span>
                                            Presencial
                                        </button>
                                        <button 
                                            type="button"
                                            disabled={shiftStatus !== 'no_started'}
                                            onClick={() => setWorkModality('remoto')}
                                            className={`py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                                                workModality === 'remoto'
                                                    ? 'bg-primary border-primary text-on-primary'
                                                    : 'bg-transparent border-outline/20 text-on-surface-variant hover:border-primary/50'
                                            } ${shiftStatus !== 'no_started' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">home</span>
                                            Remoto
                                        </button>
                                    </div>
                                    {shiftStatus !== 'no_started' && (
                                        <p className="text-[10px] text-on-surface-variant/60 text-center mt-2">
                                            Modalidad fijada al iniciar el turno ({workModality === 'presencial' ? 'Presencial' : 'Remoto'}).
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Shift Controls Grid */}
                            <div className="grid grid-cols-2 gap-3.5">
                                {shiftStatus === 'no_started' && (
                                    <button 
                                        onClick={handleShiftStart}
                                        className="col-span-2 bg-primary hover:opacity-90 text-on-primary p-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                        INICIAR TURNO
                                    </button>
                                )}

                                {shiftStatus === 'working' && (
                                    <>
                                        <button 
                                            onClick={handleLunchStart}
                                            className="bg-surface-container border border-outline/20 hover:bg-surface-container-high text-on-surface p-3.5 rounded-xl font-semibold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">coffee</span>
                                            ALMUERZO / DESCANSO
                                        </button>
                                        <button 
                                            onClick={handleShiftEnd}
                                            className="bg-error/20 border border-error/30 hover:bg-error/30 text-error p-3.5 rounded-xl font-semibold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">stop</span>
                                            FINALIZAR TURNO
                                        </button>
                                    </>
                                )}

                                {shiftStatus === 'lunch' && (
                                    <button 
                                        onClick={handleLunchEnd}
                                        className="col-span-2 bg-primary hover:opacity-90 text-on-primary p-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                        RETOMAR TRABAJO
                                    </button>
                                )}

                                {shiftStatus === 'finished' && (
                                    <div className="col-span-2 glass-card p-4 text-center text-xs text-primary font-medium border border-primary/20 bg-primary/5">
                                        ✅ ¡Jornada completada exitosamente! Que tengas un excelente día de descanso.
                                    </div>
                                )}
                            </div>

                            {/* Mis Registros Recientes */}
                            <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl mt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-xs text-on-surface">Mis Registros Recientes</h4>
                                    <button 
                                        type="button"
                                        onClick={fetchActiveShiftStatus} 
                                        className="w-6 h-6 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-lg flex items-center justify-center border border-outline/10 cursor-pointer transition"
                                        title="Refrescar jornada"
                                    >
                                        <span className="material-symbols-outlined text-[13px]">refresh</span>
                                    </button>
                                </div>
                                {myShifts.length === 0 ? (
                                    <p className="text-[11px] text-on-surface-variant/60 text-center py-4">No tienes marcaciones registradas recientemente.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {myShifts.slice(0, 5).map(s => {
                                            const date = new Date(s.clock_in);
                                            const outDate = s.clock_out ? new Date(s.clock_out) : null;
                                            return (
                                                <div key={s.id} className="flex justify-between items-center bg-surface-container/50 border border-outline/5 p-3 rounded-xl text-xs">
                                                    <div>
                                                        <p className="font-bold text-on-surface">
                                                            {date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                        </p>
                                                        <p className="text-[10px] text-on-surface-variant/80 font-mono mt-0.5">
                                                            Entrada: {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} 
                                                            {outDate && ` | Salida: ${outDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                                                        </p>
                                                    </div>
                                                    <span className="font-bold text-primary font-mono">
                                                        {Number(s.hours_worked || 0).toFixed(2)} hrs
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                {/* TAB 2: TAREAS ASIGNADAS */}
                {activeTab === 'tareas' && (
                    <div className="space-y-4">
                        {/* Banner si el colaborador tiene entregas a domicilio */}
                        {myDeliveries.length > 0 && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3 text-left">
                                    <span className="material-symbols-outlined text-emerald-400 text-2xl">local_shipping</span>
                                    <div>
                                        <h4 className="font-bold text-xs text-emerald-400">¡Tienes {myDeliveries.length} Entregas a Domicilio hoy!</h4>
                                        <p className="text-[10px] text-on-surface-variant">Ruta asignada por cercanía con direcciones y cobros en efectivo.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveTab('entregas')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0"
                                >
                                    Ver Entregas
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-on-surface">Mis Tareas Pendientes</h3>
                                <button 
                                    type="button"
                                    onClick={fetchTasks} 
                                    className="w-6 h-6 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-lg flex items-center justify-center border border-outline/10 cursor-pointer transition"
                                    title="Refrescar tareas"
                                >
                                    <span className="material-symbols-outlined text-[13px]">refresh</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsCreateTaskOpen(true);
                                        setTaskFormType('tarea');
                                        setTaskFormTitle('');
                                        setTaskFormDesc('');
                                        setTaskFormDueDate('');
                                        setTaskFormDueTime('');
                                        setCrmSearchQuery('');
                                        setSelectedCrmCustomerId('');
                                    }} 
                                    className="px-2.5 py-1 bg-primary hover:bg-primary-container text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer flex items-center gap-1 transition shadow"
                                >
                                    <span className="material-symbols-outlined text-[12px]">add</span>
                                    Nueva Tarea
                                </button>
                            </div>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-bold">
                                {tasks.filter(t => t.status === 'pendiente' || t.status === 'pending' || t.status === 'en proceso' || t.status === 'en_proceso').length} activas
                            </span>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="glass-card p-8 text-center text-xs text-on-surface-variant rounded-2xl border border-outline/10">
                                No tienes tareas asignadas en este momento. ¡Buen trabajo!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {tasks.map((task) => {
                                    const statusInfo = getTaskStatusInfo(task);
                                    return (
                                        <div 
                                            key={task.id}
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setNewSelectedStatus(task.status || 'pendiente');
                                                fetchTaskUpdates(task.id);
                                            }}
                                            className="p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition hover:border-primary/50 bg-surface-container/20 border-outline/10 text-on-surface"
                                        >
                                            <div className="flex items-center gap-3 flex-grow">
                                                <span className={`w-3 h-3 rounded-full shrink-0 ${statusInfo.badgeColor}`} />
                                                
                                                <div className="text-left">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-xs font-bold">
                                                            {task.title}
                                                        </p>
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${statusInfo.bgColor}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                        {task.task_type === 'visita' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                Visita
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.description && (
                                                        <p className="text-[10px] text-on-surface-variant/80 mt-0.5">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {task.created_by_name && (
                                                            <p className="text-[9px] text-primary/80 font-mono">
                                                                Por: {task.created_by_name}
                                                            </p>
                                                        )}
                                                        {task.due_date && (
                                                            <p className="text-[9px] text-orange-400 font-mono flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                                Límite: {new Date(task.due_date).toLocaleString('es-CO')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[9px] text-on-surface-variant/60 font-mono shrink-0 ml-2">
                                                {new Date(task.created_at).toLocaleDateString('es-CO')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: MIS ENTREGAS DEL DÍA (DOMICILIOS Y RUTAS POR CERCANÍA) */}
                {activeTab === 'entregas' && (
                    <div className="space-y-4 text-left">
                        <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                            <div>
                                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                                    Mis Entregas del Día (Ruta de Domicilios)
                                </h3>
                                <p className="text-[11px] text-on-surface-variant mt-0.5">
                                    Ruta asignada organizada automáticamente por orden de cercanía.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={fetchMyDeliveries}
                                className="w-8 h-8 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30 cursor-pointer transition"
                                title="Refrescar entregas"
                            >
                                <span className="material-symbols-outlined text-[16px]">refresh</span>
                            </button>
                        </div>

                        {deliveriesLoading ? (
                            <p className="text-xs text-on-surface-variant italic py-8 text-center animate-pulse">Cargando tu ruta de domicilios para hoy...</p>
                        ) : myDeliveries.length === 0 ? (
                            <div className="glass-card p-8 text-center text-xs text-on-surface-variant rounded-2xl border border-outline/10 space-y-2">
                                <span className="material-symbols-outlined text-4xl text-emerald-500/40">task_alt</span>
                                <p className="font-bold text-on-surface">No tienes entregas pendientes asignadas para hoy.</p>
                                <p className="text-[11px] text-on-surface-variant/80">¡Buen trabajo! Si se asignan nuevas facturas con despacho aparecierán aquí automáticamente.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myDeliveries.map((del: any, idx: number) => (
                                    <div key={del.invoice_id} className="bg-surface-container/40 border border-outline/15 p-4 rounded-2xl space-y-3 hover:border-emerald-500/40 transition shadow-lg">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-emerald-500/20 text-emerald-400 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/30 font-mono">
                                                    Parada #{del.route_order || idx + 1} (Cercanía)
                                                </span>
                                                <span className="font-bold text-on-surface text-sm">Factura #{del.invoice_number}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                del.delivery_status === 'delivered' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                del.delivery_status === 'in_transit' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                                {del.delivery_status === 'delivered' ? '✅ Entregado' : del.delivery_status === 'in_transit' ? '🚀 En Camino' : '⏳ Pendiente'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                            <div className="space-y-0.5">
                                                <span className="text-on-surface-variant block font-medium text-[10px] uppercase tracking-wider">Cliente / Recibe:</span>
                                                <strong className="text-on-surface font-semibold text-sm">{del.customer_name}</strong>
                                                <p className="text-on-surface-variant font-mono text-[11px]">📞 +{del.customer_phone}</p>
                                            </div>

                                            <div className="space-y-0.5">
                                                <span className="text-on-surface-variant block font-medium text-[10px] uppercase tracking-wider">Dirección de Entrega:</span>
                                                <strong className="text-emerald-400 font-semibold text-xs leading-snug block">{del.delivery_address}</strong>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-outline/10 text-xs">
                                            <div>
                                                <span className="text-on-surface-variant text-[11px]">Monto a Recibir: </span>
                                                <strong className={`font-bold font-mono text-sm ${del.payment_status === 'paid' ? 'text-green-400' : 'text-amber-400'}`}>
                                                    ${del.total_amount.toLocaleString('es-CO')} COP
                                                </strong>
                                                <span className="text-[10px] text-on-surface-variant block font-mono uppercase mt-0.5">
                                                    ({del.payment_method === 'efectivo' ? '💵 Efectivo Contra-Entrega' : '🏦 Pagado por Nequi/Banco'})
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                <a
                                                    href={`https://maps.google.com/?q=${encodeURIComponent(del.delivery_address)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-surface-container-high hover:bg-surface-container text-on-surface font-semibold text-[11px] px-3 py-2 rounded-xl border border-outline/20 transition flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">map</span>
                                                    Navegar Mapa
                                                </a>
                                                <a
                                                    href={`https://wa.me/${del.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${del.customer_name}, soy Speedie Gonzalez tu domiciliario. Estoy en camino a la dirección ${del.delivery_address} con tu pedido de la Factura #${del.invoice_number}.`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-green-600 hover:bg-green-500 text-white font-bold text-[11px] px-3 py-2 rounded-xl transition flex items-center gap-1 shadow-md"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">chat</span>
                                                    WhatsApp
                                                </a>
                                            </div>
                                        </div>

                                        {del.notes && (
                                            <p className="text-[11px] text-on-surface-variant/90 bg-surface-container-high/40 p-2.5 rounded-xl italic border border-outline/5">
                                                💡 Indicación: {del.notes}
                                            </p>
                                        )}
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

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-on-surface-variant">Inicio de Receso</label>
                                        <input 
                                            type="date"
                                            required
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            onClick={(e) => {
                                                try {
                                                    (e.target as any).showPicker();
                                                } catch (err) {}
                                            }}
                                            className="w-full bg-surface-container-high/40 border border-outline/20 p-2 rounded-xl text-on-surface outline-none cursor-pointer text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-on-surface-variant">Último Día de Receso</label>
                                        <input 
                                            type="date"
                                            required
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            onClick={(e) => {
                                                try {
                                                    (e.target as any).showPicker();
                                                } catch (err) {}
                                            }}
                                            className="w-full bg-surface-container-high/40 border border-outline/20 p-2 rounded-xl text-on-surface outline-none cursor-pointer text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-on-surface-variant">Regreso a Labores</label>
                                        <input 
                                            type="date"
                                            required
                                            value={returnDate}
                                            onChange={(e) => setReturnDate(e.target.value)}
                                            onClick={(e) => {
                                                try {
                                                    (e.target as any).showPicker();
                                                } catch (err) {}
                                            }}
                                            className="w-full bg-surface-container-high/40 border border-outline/20 p-2 rounded-xl text-on-surface outline-none cursor-pointer text-xs"
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
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-sm text-on-surface">Historial de Solicitudes</h3>
                                <button 
                                    type="button"
                                    onClick={fetchRequests} 
                                    className="w-6 h-6 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-lg flex items-center justify-center border border-outline/10 cursor-pointer transition"
                                    title="Refrescar solicitudes"
                                >
                                    <span className="material-symbols-outlined text-[13px]">refresh</span>
                                </button>
                            </div>
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
                                            <p className="text-on-surface-variant font-medium">{req.notes || req.reason || 'Sin justificación'}</p>
                                            {req.admin_notes && (
                                                <div className="bg-surface-container-high/40 p-2 rounded-lg border border-outline/5 mt-1.5 text-[10px] text-on-surface">
                                                    <span className="font-bold text-primary block mb-0.5">Respuesta de Gestión Humana:</span>
                                                    {req.admin_notes}
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-[10px] text-on-surface-variant/60 font-mono mt-2 pt-1 border-t border-outline/5">
                                                <span>
                                                    📅 {formatDateOnly(req.start_date)}
                                                    {req.end_date ? ` al ${formatDateOnly(req.end_date)}` : ''}
                                                    {(req as any).return_date ? ` (Regresa: ${formatDateOnly((req as any).return_date)})` : ''}
                                                </span>
                                                <span>Creado: {formatDateOnly(req.created_at)}</span>
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
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={fetchVisits}
                                    className="w-8 h-8 bg-surface-container hover:bg-surface-variant text-on-surface border border-outline/10 cursor-pointer flex items-center justify-center transition rounded-xl"
                                    title="Refrescar campañas"
                                >
                                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setVError(''); setVSuccess(''); setIsVCreateOpen(true); }}
                                    className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white text-[10px] font-bold rounded-xl border-0 cursor-pointer flex items-center gap-1.5 transition shadow"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add_location</span>
                                    Nueva
                                </button>
                            </div>
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
                        {isVCreateOpen && createPortal(
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-left">
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
                            </div>,
                            document.body
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
                                    {employees
                                        .filter(emp => emp.id !== employeeId)
                                        .map(emp => (
                                            <option key={emp.id} value={`emp_${emp.id}`}>
                                                💬 Chat: {emp.name} {emp.last_name || ''}
                                            </option>
                                        ))
                                    }
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

                {/* TAB 5: MI NÓMINA & ANTICIPOS */}
                {activeTab === 'finanzas' && (
                    <div className="space-y-6">
                        {/* 1. Resumen contractual */}
                        <div className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4 text-left">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Mi Contrato & Condiciones</h3>
                            {(() => {
                                const me = employees.find(e => e.id === employeeId);
                                if (!me) return <p className="text-xs text-on-surface-variant italic">Cargando detalles contractuales...</p>;
                                return (
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="space-y-1.5">
                                            <p className="text-on-surface-variant">Fecha de Contratación:</p>
                                            <p className="font-bold text-on-surface">{me.hire_date ? new Date(me.hire_date).toLocaleDateString('es-CO') : 'No registrada'}</p>
                                            
                                            <p className="text-on-surface-variant mt-2">Salario Base:</p>
                                            <p className="font-bold text-on-surface">
                                                {me.payment_type === 'hourly' 
                                                    ? `$${Number(me.hourly_rate || 0).toLocaleString('es-CO')} / Hora`
                                                    : `$${Number(me.basic_salary || 0).toLocaleString('es-CO')} / Mensual`}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-on-surface-variant">Días Vacaciones Acumulados:</p>
                                            <p className="font-bold text-green-500">{Number(me.vacation_days_accumulated || 0).toFixed(1)} días</p>

                                            <p className="text-on-surface-variant mt-2">Frecuencia & Método de Pago:</p>
                                            <p className="font-bold text-on-surface capitalize">
                                                {me.pay_period || 'Mensual'} - {me.payment_method === 'cash' ? 'Efectivo' : `Transferencia (${me.bank_name || 'N/A'})`}
                                            </p>
                                        </div>
                                        <div className="col-span-2 border-t border-outline/5 pt-2 flex justify-between text-[10px] text-on-surface-variant">
                                            <span>Estado Vinculación: <strong className="uppercase">{me.employment_status || 'Vinculado'}</strong></span>
                                            <span>Estado Actividad: <strong className="uppercase">{me.activity_status || 'Activo'}</strong></span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* 2. Solicitar Anticipo Form */}
                        <div className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4 text-left">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Solicitar Anticipo</h3>
                            <form onSubmit={handleRequestAdvance} className="space-y-3.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-on-surface-variant font-medium">Monto a solicitar ($ COP) *</label>
                                        <input 
                                            type="number" 
                                            required
                                            value={advAmount}
                                            onChange={(e) => setAdvAmount(e.target.value)}
                                            placeholder="Ej: 150000"
                                            className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary w-full"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-on-surface-variant font-medium">Fecha Requerida *</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={advDate}
                                            onChange={(e) => setAdvDate(e.target.value)}
                                            className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary w-full"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-on-surface-variant font-medium">Motivo / Notas adicionales</label>
                                    <textarea 
                                        value={advNotes}
                                        onChange={(e) => setAdvNotes(e.target.value)}
                                        placeholder="Ej: Para cubrir transporte o medicamentos"
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none h-16 resize-none w-full"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer border-0"
                                >
                                    Enviar Solicitud
                                </button>
                            </form>
                        </div>

                        {/* 3. Historial de Anticipos */}
                        <div className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4 text-left">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Historial de Anticipos</h3>
                            {advLoading ? (
                                <p className="text-xs text-on-surface-variant italic py-4 text-center">Cargando historial...</p>
                            ) : myAdvances.length === 0 ? (
                                <p className="text-xs text-on-surface-variant/60 italic py-4 text-center">No registras solicitudes de anticipo.</p>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                    {myAdvances.map(adv => (
                                        <div key={adv.id} className="p-3 bg-surface-container/20 border border-outline/5 rounded-xl space-y-2 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-on-surface text-[13px] font-mono">${Number(adv.amount).toLocaleString('es-CO')}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                                                    adv.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    adv.status === 'in_process' ? 'bg-blue-500/10 text-blue-500' :
                                                    adv.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                    {adv.status === 'pending' ? 'Pendiente' :
                                                     adv.status === 'in_process' ? 'En Proceso' :
                                                     adv.status === 'delivered' ? 'Entregado' : 'Rechazado'}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-on-surface-variant space-y-0.5 font-sans">
                                                <p>Fecha Solicitud: {new Date(adv.requested_date).toLocaleDateString('es-CO')}</p>
                                                {adv.notes && <p className="italic">Motivo: "{adv.notes}"</p>}
                                                {adv.admin_notes && (
                                                    <p className="text-blue-400 font-medium">Nota Admin: "{adv.admin_notes}"</p>
                                                )}
                                                {adv.status === 'delivered' && (
                                                    <p className="text-green-500">
                                                        Vía: {adv.payment_method === 'cash' ? 'Efectivo' : `Transferencia (${adv.bank_name || 'N/A'})`}
                                                        {adv.delivered_at && ` | Entregado: ${new Date(adv.delivered_at).toLocaleDateString('es-CO')}`}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Doble Firma / Confirmación de Empleado */}
                                            {adv.status === 'delivered' && (
                                                <div className="pt-2 border-t border-outline/5 flex items-center justify-between gap-2 font-mono text-[9px] text-on-surface-variant">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span>Firma Admin: {adv.confirmed_by_admin ? '✅ Firmado' : '❌ Pendiente'}</span>
                                                        <span>Firma Empleado: {adv.confirmed_by_employee ? '✅ Firmado' : '❌ Pendiente'}</span>
                                                    </div>
                                                    {!adv.confirmed_by_employee && (
                                                        <button 
                                                            onClick={() => handleConfirmAdvanceDelivery(adv.id)}
                                                            className="px-3 py-1 bg-green-500 text-white text-[9px] font-bold uppercase rounded-lg border-0 hover:bg-green-600 transition cursor-pointer"
                                                        >
                                                            Firma Recibido
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TASK DETAIL / UPDATE FORM MODAL */}
                {selectedTask && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-left">
                        <div className="glass-card max-w-md w-full rounded-2xl p-6 shadow-2xl animate-float max-h-[90vh] overflow-y-auto custom-scrollbar text-xs">
                            <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                                <div>
                                    <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px] text-primary">task</span>
                                        Detalle de Tarea
                                    </h4>
                                    {selectedTask.task_type === 'visita' && (
                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-1 inline-block">
                                            Tipo: Visita Médica/Comercial
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>

                            {/* Task Information */}
                            <div className="space-y-3 bg-surface-container/20 p-4 rounded-xl border border-outline/5 mb-4">
                                <div>
                                    <span className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider block">Título</span>
                                    <span className="text-on-surface font-semibold text-xs">{selectedTask.title}</span>
                                </div>
                                {selectedTask.description && (
                                    <div>
                                        <span className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider block">Instrucciones / Descripción</span>
                                        <p className="text-on-surface/90 text-xs whitespace-pre-line leading-relaxed">{selectedTask.description}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 border-t border-outline/5 pt-2">
                                    <div>
                                        <span className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider block">Asignado Por</span>
                                        <span className="text-on-surface font-mono">{selectedTask.created_by_name || 'Administrador'}</span>
                                    </div>
                                    {selectedTask.due_date && (
                                        <div>
                                            <span className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider block">Fecha Límite</span>
                                            <span className="text-orange-400 font-bold">{new Date(selectedTask.due_date).toLocaleString('es-CO')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Change & Update Submission */}
                            <form onSubmit={handleSubmitTaskUpdate} className="space-y-3 border-t border-outline/10 pt-4 mb-4">
                                <h5 className="font-bold text-xs text-primary uppercase tracking-wider">Reportar Avance</h5>
                                
                                <div className="space-y-1">
                                    <label className="block font-bold text-[10px] text-on-surface-variant uppercase">Nuevo Estado</label>
                                    <select
                                        value={newSelectedStatus}
                                        onChange={(e) => setNewSelectedStatus(e.target.value)}
                                        className="w-full bg-surface-container border border-outline/25 p-2 rounded-xl text-on-surface outline-none cursor-pointer"
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en proceso">En Proceso</option>
                                        <option value="terminado">Terminado</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block font-bold text-[10px] text-on-surface-variant uppercase">¿Qué avance o reporte realizaste? (Obligatorio)</label>
                                    <textarea
                                        required
                                        rows={2}
                                        value={newReportText}
                                        onChange={(e) => setNewReportText(e.target.value)}
                                        className="w-full bg-surface-container border border-outline/25 p-2 rounded-xl text-on-surface outline-none resize-none"
                                        placeholder="Escribe detalladamente qué hiciste..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingReport}
                                    className="w-full py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-xl cursor-pointer transition shadow disabled:opacity-50"
                                >
                                    {isSubmittingReport ? 'Guardando reporte...' : 'Guardar Reporte y Estado'}
                                </button>
                            </form>

                            {/* Task Updates Logs / History */}
                            <div className="space-y-3 border-t border-outline/10 pt-4">
                                <h5 className="font-bold text-xs text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">history</span>
                                    Historial de Reportes ({taskUpdates.length})
                                </h5>
                                
                                {loadingUpdates ? (
                                    <p className="italic text-on-surface-variant py-2 animate-pulse">Cargando bitácora...</p>
                                ) : taskUpdates.length === 0 ? (
                                    <p className="italic text-on-surface-variant/70 py-2">No se han ingresado reportes sobre esta tarea.</p>
                                ) : (
                                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                        {taskUpdates.map((upd) => (
                                            <div key={upd.id} className="p-3 bg-white/5 rounded-xl border border-outline/5 space-y-1">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-primary font-mono">{upd.created_by_name}</span>
                                                    <span className="text-on-surface-variant/60 font-mono">
                                                        {new Date(upd.created_at).toLocaleString('es-CO')}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-on-surface/90 font-sans leading-relaxed">{upd.report_text}</p>
                                                <div className="flex items-center gap-1.5 text-[9px] text-on-surface-variant font-mono mt-1">
                                                    <span>Estado:</span>
                                                    <span className="line-through">{upd.old_status || 'desconocido'}</span>
                                                    <span className="material-symbols-outlined text-[10px]">arrow_right_alt</span>
                                                    <span className="text-primary font-bold">{upd.new_status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CREATE TAREA / VISITA FORM MODAL */}
                {isCreateTaskOpen && createPortal(
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-left">
                        <div className="glass-card max-w-sm w-full rounded-2xl p-6 shadow-2xl animate-float max-h-[90vh] overflow-y-auto custom-scrollbar text-xs">
                            <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                                <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                                    Programar Tarea / Visita
                                </h4>
                                <button
                                    onClick={() => setIsCreateTaskOpen(false)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleCreateEmployeeOwnTask} className="space-y-4 text-xs">
                                {/* Tipo: Tarea o Visita */}
                                <div className="space-y-1">
                                    <label className="block font-bold text-[10px] text-on-surface-variant uppercase">Tipo de Actividad</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTaskFormType('tarea')}
                                            className={`flex-grow py-2 border rounded-xl font-bold text-xs cursor-pointer transition ${
                                                taskFormType === 'tarea' ? 'bg-primary border-primary text-on-primary shadow' : 'bg-transparent border-outline/20 text-on-surface-variant hover:border-primary/50'
                                            }`}
                                        >
                                            Tarea Común
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTaskFormType('visita')}
                                            className={`flex-grow py-2 border rounded-xl font-bold text-xs cursor-pointer transition ${
                                                taskFormType === 'visita' ? 'bg-primary border-primary text-on-primary shadow' : 'bg-transparent border-outline/20 text-on-surface-variant hover:border-primary/50'
                                            }`}
                                        >
                                            Visita (CRM)
                                        </button>
                                    </div>
                                </div>

                                {/* Título */}
                                <div className="space-y-1">
                                    <label className="block font-bold text-[10px] text-on-surface-variant uppercase">Título de la Actividad</label>
                                    <input
                                        type="text"
                                        required
                                        value={taskFormTitle}
                                        onChange={(e) => setTaskFormTitle(e.target.value)}
                                        className="w-full bg-surface-container border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                        placeholder={taskFormType === 'visita' ? "Ej: Visita de inspección visual" : "Ej: Archivar reportes diarios"}
                                    />
                                </div>

                                {/* Si es visita, buscador predictivo del CRM */}
                                {taskFormType === 'visita' && (
                                    <div className="space-y-1 relative">
                                        <label className="block font-bold text-[10px] text-on-surface-variant uppercase">Buscar Cliente / Empresa en CRM</label>
                                        <input
                                            type="text"
                                            required={!selectedCrmCustomerId}
                                            value={crmSearchQuery}
                                            onChange={(e) => {
                                                setCrmSearchQuery(e.target.value);
                                                setShowCrmSuggestions(true);
                                            }}
                                            onFocus={() => setShowCrmSuggestions(true)}
                                            className="w-full bg-surface-container border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                            placeholder="Escribe nombre o NIT/Cédula..."
                                        />
                                        {showCrmSuggestions && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-high border border-outline/20 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-[99999] custom-scrollbar text-xs">
                                                <div className="p-2 border-b border-outline/5 flex justify-between items-center bg-surface-container-high-hover">
                                                    <span className="font-bold text-[9px] uppercase tracking-wider text-on-surface-variant">Contactos/Empresas CRM</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCrmSuggestions(false)}
                                                        className="text-primary hover:text-primary-container text-[10px] font-bold bg-transparent border-0 cursor-pointer"
                                                    >
                                                        Cerrar
                                                    </button>
                                                </div>
                                                {crmCustomers.filter(c => 
                                                    c.name.toLowerCase().includes(crmSearchQuery.toLowerCase()) ||
                                                    (c.last_name && c.last_name.toLowerCase().includes(crmSearchQuery.toLowerCase())) ||
                                                    c.document_number.includes(crmSearchQuery)
                                                ).length === 0 ? (
                                                    <div className="p-3 text-on-surface-variant/70 italic">
                                                        No se encontraron clientes/empresas.
                                                    </div>
                                                ) : (
                                                    crmCustomers.filter(c => 
                                                        c.name.toLowerCase().includes(crmSearchQuery.toLowerCase()) ||
                                                        (c.last_name && c.last_name.toLowerCase().includes(crmSearchQuery.toLowerCase())) ||
                                                        c.document_number.includes(crmSearchQuery)
                                                    ).map(cust => (
                                                        <div 
                                                            key={cust.id}
                                                            onClick={() => {
                                                                setSelectedCrmCustomerId(cust.id);
                                                                setCrmSearchQuery(`${cust.name} ${cust.last_name || ''} (${cust.document_number})`);
                                                                if (taskFormTitle === '') {
                                                                    setTaskFormTitle(`Visita a: ${cust.name} ${cust.last_name || ''}`);
                                                                }
                                                                setShowCrmSuggestions(false);
                                                            }}
                                                            className="p-3 hover:bg-surface-variant/40 cursor-pointer border-b border-outline/5 text-on-surface flex flex-col"
                                                        >
                                                            <span className="font-bold">{cust.name} {cust.last_name || ''}</span>
                                                            <span className="text-[10px] text-on-surface-variant font-mono">
                                                                {cust.customer_type === 'empresa' ? 'Empresa / NIT' : 'Persona / CC'}: {cust.document_number}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Descripción */}
                                <div className="space-y-1">
                                    <label className="block font-bold text-[10px] text-on-surface-variant uppercase">Descripción / Detalles</label>
                                    <textarea
                                        rows={2}
                                        value={taskFormDesc}
                                        onChange={(e) => setTaskFormDesc(e.target.value)}
                                        className="w-full bg-surface-container border border-outline/25 p-2 rounded-xl text-on-surface outline-none resize-none"
                                        placeholder="Detalles sobre lo que se realizará..."
                                    />
                                </div>

                                {/* Fecha y hora límite */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="block font-bold text-[10px] text-on-surface-variant uppercase">Fecha Límite</label>
                                        <input
                                            type="date"
                                            required
                                            value={taskFormDueDate}
                                            onChange={(e) => setTaskFormDueDate(e.target.value)}
                                            className="w-full bg-surface-container border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block font-bold text-[10px] text-on-surface-variant uppercase">Hora Límite</label>
                                        <input
                                            type="time"
                                            required
                                            value={taskFormDueTime}
                                            onChange={(e) => setTaskFormDueTime(e.target.value)}
                                            className="w-full bg-surface-container border border-outline/25 p-2 rounded-xl text-on-surface outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingReport}
                                    className="w-full py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-xl cursor-pointer transition shadow disabled:opacity-50 mt-2"
                                >
                                    {isSubmittingReport ? 'Programando...' : 'Programar Actividad'}
                                </button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
            </main>
        </div>
    </div>
    );
};
