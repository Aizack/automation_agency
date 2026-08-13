import React, { useState, useEffect } from 'react';

interface Employee {
    id: string;
    name: string;
    last_name?: string;
    phone: string;
    role: string;
    department_id: string | null;
    department_name: string | null;
    pin: string;
    is_active: boolean;
    created_at: string;
}

interface Department {
    id: string;
    name: string;
    created_at: string;
}

interface Shift {
    id: string;
    clock_in: string;
    clock_out: string | null;
    hours_worked: number;
    lunch_start?: string | null;
    lunch_end?: string | null;
}

interface SaaSErpEmployeesProps {
    clientId: string;
    viewMode?: 'personal' | 'turnos';
}

export const SaaSErpEmployees: React.FC<SaaSErpEmployeesProps> = ({ clientId, viewMode }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isDeptOpen, setIsDeptOpen] = useState(false);
    const [isEmpOpen, setIsEmpOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [empShifts, setEmpShifts] = useState<Shift[]>([]);
    const [shiftsLoading, setShiftsLoading] = useState(false);
    
    // Detail Modal states
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedEmpDetail, setSelectedEmpDetail] = useState<Employee | null>(null);
    const [empTasks, setEmpTasks] = useState<any[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskDueTime, setNewTaskDueTime] = useState('');
    const [newTaskCreator, setNewTaskCreator] = useState('');
    const [detailTab, setDetailTab] = useState<'info' | 'shifts' | 'tasks'>('info');

    // Payroll states
    const [isPayrollOpen, setIsPayrollOpen] = useState(false);
    const [payrollSummary, setPayrollSummary] = useState<any>(null);
    const [payrollLoading, setPayrollLoading] = useState(false);

    // HR Document requests states
    const [hrDocs, setHrDocs] = useState<any[]>([]);
    const [hrDocsLoading, setHrDocsLoading] = useState(false);

    // Form inputs
    const [deptName, setDeptName] = useState('');
    const [empName, setEmpName] = useState('');
    const [empLastName, setEmpLastName] = useState('');
    const [empPhone, setEmpPhone] = useState('');
    const [empRole, setEmpRole] = useState('agent');
    const [empDeptId, setEmpDeptId] = useState('');
    const [empPin, setEmpPin] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Turnos Panel states
    const [activeView, setActiveView] = useState<'list' | 'shifts'>(viewMode === 'turnos' ? 'shifts' : 'list');
    const [selectedEmpForShifts, setSelectedEmpForShifts] = useState<Employee | null>(null);
    const [shiftsTab, setShiftsTab] = useState<'hoy' | 'historial'>('hoy');
    const [shiftsSubTab, setShiftsSubTab] = useState<'semana' | 'mes' | 'todos'>('semana');
    const [todayShifts, setTodayShifts] = useState<any[]>([]);
    const [todayShiftsLoading, setTodayShiftsLoading] = useState(false);
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | null>(null);

    const token = localStorage.getItem('auth_token');

    const fetchTodayShifts = async () => {
        try {
            setTodayShiftsLoading(true);
            const res = await fetch(`/api/clients/${clientId}/shifts/today`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setTodayShifts(json.shifts || []);
            }
        } catch (err) {
            console.error("Error loading today shifts:", err);
        } finally {
            setTodayShiftsLoading(false);
        }
    };

    const selectEmployeeForShifts = (emp: Employee) => {
        setSelectedEmpForShifts(emp);
        setShiftsTab('historial');
        setShiftsSubTab('semana');
        setSelectedMonthFilter(null);
        loadShifts(emp.id);
    };

    const getDatesOfCurrentWeek = () => {
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sun, 1 = Mon...
        const distance = currentDay === 0 ? -6 : 1 - currentDay; // Distance to Monday
        const monday = new Date(now);
        monday.setDate(now.getDate() + distance);
        monday.setHours(0, 0, 0, 0);
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const getHoursForDate = (date: Date) => {
        const dayShifts = empShifts.filter(s => {
            const clockInDate = new Date(s.clock_in);
            return clockInDate.toDateString() === date.toDateString();
        });
        return dayShifts.reduce((acc, curr) => acc + Number(curr.hours_worked || 0), 0);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [empRes, deptRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/employees`, { headers }),
                fetch(`/api/clients/${clientId}/departments`, { headers })
            ]);

            const empJson = await empRes.json();
            const deptJson = await deptRes.json();

            if (empJson.success) setEmployees(empJson.employees || []);
            if (deptJson.success) setDepartments(deptJson.departments || []);
        } catch (err) {
            console.error("Error loading employees data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHrDocs = async () => {
        try {
            setHrDocsLoading(true);
            const res = await fetch(`/api/clients/${clientId}/hr-documents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setHrDocs(json.documents || []);
            }
        } catch (err) {
            console.error("Error loading HR documents:", err);
        } finally {
            setHrDocsLoading(false);
        }
    };

    const openPayrollModal = async (emp: Employee) => {
        setSelectedEmp(emp);
        setIsPayrollOpen(true);
        setPayrollLoading(true);
        setPayrollSummary(null);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${emp.id}/payroll-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setPayrollSummary(json.payroll);
            } else {
                setErrorMsg(json.error || 'Error al calcular la nómina.');
            }
        } catch (err: any) {
            setErrorMsg('Error de red al obtener la liquidación.');
        } finally {
            setPayrollLoading(false);
        }
    };

    const handleUpdateDocStatus = async (docId: string, nextStatus: 'approved' | 'rejected') => {
        const notes = window.prompt('Notas de respuesta al empleado (opcional):', '');
        if (notes === null) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/hr-documents/${docId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus, notes })
            });
            const json = await res.json();
            if (json.success) {
                fetchHrDocs();
            }
        } catch (err) {
            console.error("Error updating document:", err);
        }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!window.confirm('¿Deseas eliminar permanentemente esta solicitud?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/hr-documents/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                fetchHrDocs();
            }
        } catch (err) {
            console.error("Error deleting document:", err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchHrDocs();
        fetchTodayShifts();
    }, [clientId]);

    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deptName) return;

        try {
            setActionLoading(true);
            setErrorMsg('');
            const res = await fetch(`/api/clients/${clientId}/departments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: deptName })
            });
            const json = await res.json();
            if (json.success) {
                setDeptName('');
                setIsDeptOpen(false);
                fetchData();
            } else {
                setErrorMsg(json.error || 'Error al guardar departamento.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDept = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de eliminar el departamento "${name}"?`)) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/departments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                fetchData();
            }
        } catch (err) {
            console.error("Error deleting department:", err);
        }
    };

    const handleCreateEmp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empName || !empPhone) {
            setErrorMsg('Nombre y teléfono son requeridos.');
            return;
        }

        try {
            setActionLoading(true);
            setErrorMsg('');
            
            const url = selectedEmp 
                ? `/api/clients/${clientId}/employees/${selectedEmp.id}`
                : `/api/clients/${clientId}/employees`;
            
            const method = selectedEmp ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: empName,
                    last_name: empLastName,
                    phone: empPhone,
                    role: empRole,
                    department_id: empDeptId || null,
                    pin: empPin,
                    is_active: true
                })
            });
            const json = await res.json();
            if (json.success) {
                setIsEmpOpen(false);
                fetchData();
            } else {
                setErrorMsg(json.error || 'Error al guardar empleado.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEmp = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de eliminar el empleado "${name}"?`)) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/employees/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                fetchData();
            }
        } catch (err) {
            console.error("Error deleting employee:", err);
        }
    };

    const openCreateEmpModal = () => {
        setSelectedEmp(null);
        setEmpName('');
        setEmpLastName('');
        setEmpPhone('');
        setEmpRole('agent');
        setEmpDeptId('');
        setEmpPin('');
        setErrorMsg('');
        setIsEmpOpen(true);
    };

    const openEditEmpModal = (emp: Employee) => {
        setSelectedEmp(emp);
        setEmpName(emp.name);
        setEmpLastName(emp.last_name || '');
        setEmpPhone(emp.phone);
        setEmpRole(emp.role);
        setEmpDeptId(emp.department_id || '');
        setEmpPin(emp.pin);
        setErrorMsg('');
        setIsEmpOpen(true);
    };

    const loadShifts = async (empId: string) => {
        try {
            setShiftsLoading(true);
            const res = await fetch(`/api/clients/${clientId}/employees/${empId}/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setEmpShifts(json.shifts || []);
            }
        } catch (err) {
            console.error("Error loading shifts:", err);
        } finally {
            setShiftsLoading(false);
        }
    };

    const loadTasks = async (empId: string) => {
        try {
            setTasksLoading(true);
            const res = await fetch(`/api/clients/${clientId}/employees/${empId}/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setEmpTasks(json.tasks || []);
            }
        } catch (err) {
            console.error("Error loading employee tasks:", err);
        } finally {
            setTasksLoading(false);
        }
    };

    const handleAssignTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmpDetail || !newTaskTitle.trim()) return;

        try {
            setActionLoading(true);
            const res = await fetch(`/api/clients/${clientId}/employees/${selectedEmpDetail.id}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTaskTitle,
                    description: newTaskDesc,
                    due_date: (newTaskDueDate && newTaskDueTime) ? `${newTaskDueDate}T${newTaskDueTime}` : (newTaskDueDate || null),
                    created_by_name: newTaskCreator.trim() || 'Administrador'
                })
            });
            const json = await res.json();
            if (json.success) {
                setNewTaskTitle('');
                setNewTaskDesc('');
                setNewTaskDueDate('');
                setNewTaskDueTime('');
                setNewTaskCreator(localStorage.getItem('session_name') || '');
                loadTasks(selectedEmpDetail.id);
            } else {
                alert(json.error || 'Error al asignar la tarea.');
            }
        } catch (err) {
            console.error("Error assigning task:", err);
            alert("Error de conexión al asignar tarea.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenDetail = (emp: Employee) => {
        setSelectedEmpDetail(emp);
        loadShifts(emp.id);
        loadTasks(emp.id);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setNewTaskCreator(localStorage.getItem('session_name') || '');
        setDetailTab('info');
        setIsDetailOpen(true);
    };

    const renderShiftsPanel = () => {
        return (
            <div className="space-y-6">
                {/* Header of Shifts View */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container/20 border border-outline/10 p-5 rounded-2xl">
                    <div>
                        <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-500">work_history</span>
                            Control de Asistencia y Turnos
                        </h3>
                        <p className="text-xs text-on-surface-variant">Monitorea en tiempo real los registros de entrada, almuerzos, salidas y puntualidad.</p>
                    </div>
                    {viewMode !== 'turnos' && (
                        <button 
                            onClick={() => { setActiveView('list'); setSelectedEmpForShifts(null); }}
                            className="px-4 py-2 border border-outline/20 hover:bg-surface-variant/20 text-on-surface text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                        >
                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                            Volver a Lista
                        </button>
                    )}
                </div>

                {/* Tabs for Shifts View */}
                <div className="flex border-b border-outline/10 gap-4 text-xs font-bold">
                    <button 
                        onClick={() => { setShiftsTab('hoy'); fetchTodayShifts(); }}
                        className={`pb-3 cursor-pointer transition-all border-b-2 px-1 ${
                            shiftsTab === 'hoy' ? 'border-primary text-primary font-black' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
                        }`}
                    >
                        Asistencia de Hoy
                    </button>
                    <button 
                        onClick={() => { setShiftsTab('historial'); }}
                        className={`pb-3 cursor-pointer transition-all border-b-2 px-1 ${
                            shiftsTab === 'historial' ? 'border-primary text-primary font-black' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
                        }`}
                    >
                        Historial de Fichajes
                    </button>
                </div>

                {/* ASISTENCIA DE HOY TAB */}
                {shiftsTab === 'hoy' && (
                    <div className="space-y-6">
                        {/* Summary indicators */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-surface-container/40 border border-outline/10 p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-on-surface-variant uppercase font-mono font-bold">Fichajes de Hoy</p>
                                    <p className="text-xl font-black text-on-surface mt-1">{todayShifts.length}</p>
                                </div>
                                <span className="material-symbols-outlined text-primary text-[28px] opacity-70">badge</span>
                            </div>
                            <div className="bg-surface-container/40 border border-outline/10 p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-on-surface-variant uppercase font-mono font-bold">En Turno Activo</p>
                                    <p className="text-xl font-black text-green-500 mt-1">{todayShifts.filter(s => !s.clock_out).length}</p>
                                </div>
                                <span className="material-symbols-outlined text-green-500 text-[28px] opacity-70">play_circle</span>
                            </div>
                            <div className="bg-surface-container/40 border border-outline/10 p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-on-surface-variant uppercase font-mono font-bold">Retardos (Tarde)</p>
                                    <p className="text-xl font-black text-orange-500 mt-1">
                                        {todayShifts.filter(s => {
                                            const date = new Date(s.clock_in);
                                            const hour = date.getHours();
                                            const min = date.getMinutes();
                                            return hour > 8 || (hour === 8 && min > 15);
                                        }).length}
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-orange-500 text-[28px] opacity-70">schedule</span>
                            </div>
                        </div>

                        {/* Today Shifts List */}
                        <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 overflow-x-auto">
                            <h4 className="font-bold text-sm text-on-surface mb-4">Ingresos y Salidas del Día</h4>
                            {todayShiftsLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : todayShifts.length === 0 ? (
                                <p className="text-xs text-on-surface-variant/60 py-6 text-center">Nadie ha fichado el día de hoy todavía.</p>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="text-on-surface-variant/70 border-b border-outline/10 font-bold">
                                            <th className="py-2.5 px-2">Empleado</th>
                                            <th className="py-2.5 px-2">Hora Entrada</th>
                                            <th className="py-2.5 px-2">Hora Salida</th>
                                            <th className="py-2.5 px-2">Almuerzo</th>
                                            <th className="py-2.5 px-2">Puntualidad</th>
                                            <th className="py-2.5 px-2">Horas</th>
                                            <th className="py-2.5 px-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayShifts.map(s => {
                                            const inDate = new Date(s.clock_in);
                                            const inHour = inDate.getHours();
                                            const inMin = inDate.getMinutes();
                                            const isLate = inHour > 8 || (inHour === 8 && inMin > 15);
                                            
                                            let lunchTimeStr = '--';
                                            if (s.lunch_start) {
                                                if (s.lunch_end) {
                                                    const diffMins = Math.floor((new Date(s.lunch_end).getTime() - new Date(s.lunch_start).getTime()) / 60000);
                                                    lunchTimeStr = `${diffMins} min`;
                                                } else {
                                                    lunchTimeStr = 'Almorzando';
                                                }
                                            }

                                            return (
                                                <tr key={s.id} className="border-b border-outline/5 hover:bg-surface-variant/20 transition-all">
                                                    <td className="py-3 px-2 font-bold text-on-surface">
                                                        {s.employee_name} {s.employee_last_name || ''}
                                                    </td>
                                                    <td className="py-3 px-2 font-mono">
                                                        {inDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </td>
                                                    <td className="py-3 px-2 font-mono">
                                                        {s.clock_out ? (
                                                            new Date(s.clock_out).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
                                                        ) : (
                                                            s.lunch_start && !s.lunch_end ? (
                                                                <span className="text-amber-500 font-bold">En Almuerzo</span>
                                                            ) : (
                                                                <span className="text-green-500 font-bold">Activo</span>
                                                            )
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 text-on-surface-variant/80 font-mono">
                                                        {lunchTimeStr === 'Almorzando' ? (
                                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">Almorzando</span>
                                                        ) : (
                                                            lunchTimeStr
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                            isLate ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                        }`}>
                                                            {isLate ? 'Tarde' : 'A Tiempo'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 font-mono font-bold text-primary">
                                                        {Number(s.hours_worked || 0).toFixed(2)} hrs
                                                    </td>
                                                    <td className="py-3 px-2 text-right">
                                                        <button 
                                                            onClick={() => {
                                                                const emp = employees.find(e => e.id === s.employee_id);
                                                                if (emp) selectEmployeeForShifts(emp);
                                                            }}
                                                            className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-0 rounded text-[10px] font-bold cursor-pointer transition"
                                                        >
                                                            Ver Historial
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* HISTORIAL GENERAL TAB */}
                {shiftsTab === 'historial' && (
                    <div className="space-y-6">
                        {/* Employee Selector Dropdown */}
                        <div className="bg-surface-container/40 border border-outline/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Seleccionar Empleado</label>
                                <select 
                                    value={selectedEmpForShifts?.id || ''}
                                    onChange={(e) => {
                                        const emp = employees.find(x => x.id === e.target.value);
                                        if (emp) selectEmployeeForShifts(emp);
                                    }}
                                    className="bg-surface border border-outline/20 p-2.5 rounded-xl text-xs text-on-surface outline-none focus:border-primary cursor-pointer w-full md:w-64"
                                >
                                    <option value="">-- Selecciona un Empleado --</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name} {e.last_name || ''}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedEmpForShifts && (
                                <div className="flex gap-4 items-center bg-surface-container/50 border border-outline/10 p-3 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm font-display">
                                        {selectedEmpForShifts.name[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xs text-on-surface">{selectedEmpForShifts.name} {selectedEmpForShifts.last_name || ''}</h4>
                                        <p className="text-[10px] text-on-surface-variant font-mono capitalize">{selectedEmpForShifts.role} | +{selectedEmpForShifts.phone}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedEmpForShifts ? (
                            <div className="space-y-6">
                                {/* Sub-tabs: Semana, Mes, Todos */}
                                <div className="flex border-b border-outline/5 gap-4 text-xs font-bold">
                                    <button 
                                        onClick={() => setShiftsSubTab('semana')}
                                        className={`pb-2.5 cursor-pointer transition-all border-b-2 px-1 ${
                                            shiftsSubTab === 'semana' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
                                        }`}
                                    >
                                        Semana Actual
                                    </button>
                                    <button 
                                        onClick={() => setShiftsSubTab('mes')}
                                        className={`pb-2.5 cursor-pointer transition-all border-b-2 px-1 ${
                                            shiftsSubTab === 'mes' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
                                        }`}
                                    >
                                        Mes Actual
                                    </button>
                                    <button 
                                        onClick={() => setShiftsSubTab('todos')}
                                        className={`pb-2.5 cursor-pointer transition-all border-b-2 px-1 ${
                                            shiftsSubTab === 'todos' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
                                        }`}
                                    >
                                        Todos los Meses
                                    </button>
                                </div>

                                {/* SUBTAB: SEMANA ACTUAL */}
                                {shiftsSubTab === 'semana' && (
                                    <div className="space-y-6">
                                        {/* Weekly Cards Grid (Reference Image 1) */}
                                        <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-2xl">
                                            <h4 className="font-bold text-xs text-on-surface mb-4">Grilla de Horas de la Semana</h4>
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-outline/5 pb-4 mb-4">
                                                <div className="flex flex-wrap gap-2.5">
                                                    {getDatesOfCurrentWeek().map((date, idx) => {
                                                        const hours = getHoursForDate(date);
                                                        const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                                                        
                                                        let boxClass = 'bg-surface-container-high/40 text-on-surface-variant/50 border-outline/5';
                                                        if (hours > 0) {
                                                            boxClass = hours >= 8 
                                                                ? 'bg-green-600 text-white font-bold border-green-700 shadow-sm' 
                                                                : 'bg-amber-500 text-white font-bold border-amber-600 shadow-sm';
                                                        }

                                                        return (
                                                            <div key={idx} className="flex flex-col items-center gap-1">
                                                                <span className="text-[10px] text-on-surface-variant/80 font-bold">{weekdayNames[date.getDay()]}</span>
                                                                <div className={`w-16 h-12 rounded-xl flex items-center justify-center text-xs border transition ${boxClass}`}>
                                                                    {hours > 0 ? `${hours.toFixed(1)}h` : '--'}
                                                                </div>
                                                                <span className="text-[8px] text-on-surface-variant/50 font-mono">{date.getDate()}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="flex gap-6 items-center text-xs bg-surface-container/50 p-4 rounded-xl border border-outline/10">
                                                    <div>
                                                        <p className="text-[9px] uppercase font-mono font-bold text-on-surface-variant">Registrado / Esperado</p>
                                                        <p className="text-sm font-black text-on-surface mt-0.5">
                                                            {getDatesOfCurrentWeek().reduce((acc, curr) => acc + getHoursForDate(curr), 0).toFixed(1)}h / 40h
                                                        </p>
                                                    </div>
                                                    <div className="w-[1px] h-8 bg-outline/20" />
                                                    <div>
                                                        <p className="text-[9px] uppercase font-mono font-bold text-on-surface-variant">Extras / Compensadas</p>
                                                        <p className="text-sm font-black text-primary mt-0.5">
                                                            {(() => {
                                                                const total = getDatesOfCurrentWeek().reduce((acc, curr) => acc + getHoursForDate(curr), 0);
                                                                return total > 40 ? (total - 40).toFixed(1) : '0';
                                                            })()}h / 0h
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SUBTAB: MES ACTUAL */}
                                {shiftsSubTab === 'mes' && (
                                    <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-2xl">
                                        <h4 className="font-bold text-xs text-on-surface mb-4">Fichajes del Mes Actual</h4>
                                        {shiftsLoading ? (
                                            <div className="flex justify-center py-8">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : empShifts.filter(s => {
                                            const clockIn = new Date(s.clock_in);
                                            const now = new Date();
                                            return clockIn.getMonth() === now.getMonth() && clockIn.getFullYear() === now.getFullYear();
                                        }).length === 0 ? (
                                            <p className="text-xs text-on-surface-variant/60 py-6 text-center">No hay marcaciones este mes.</p>
                                        ) : (
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="text-on-surface-variant/70 border-b border-outline/10 font-bold">
                                                        <th className="py-2.5 px-2">Fecha</th>
                                                        <th className="py-2.5 px-2">Hora Entrada</th>
                                                        <th className="py-2.5 px-2">Hora Salida</th>
                                                        <th className="py-2.5 px-2">Horas Almuerzo</th>
                                                        <th className="py-2.5 px-2">Total Efectivo</th>
                                                        <th className="py-2.5 px-2 text-right">Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {empShifts.filter(s => {
                                                        const clockIn = new Date(s.clock_in);
                                                        const now = new Date();
                                                        return clockIn.getMonth() === now.getMonth() && clockIn.getFullYear() === now.getFullYear();
                                                    }).map(s => {
                                                        const date = new Date(s.clock_in);
                                                        const outDate = s.clock_out ? new Date(s.clock_out) : null;
                                                        
                                                        let lunchMin = 0;
                                                        if (s.lunch_start && s.lunch_end) {
                                                            lunchMin = Math.floor((new Date(s.lunch_end).getTime() - new Date(s.lunch_start).getTime()) / 60000);
                                                        }

                                                        const netHours = Number(s.hours_worked || 0);
                                                        const balance = netHours - 8; // Basado en jornada de 8h
                                                        const balanceStr = balance >= 0 ? `+${balance.toFixed(2)}` : `${balance.toFixed(2)}`;

                                                        return (
                                                            <tr key={s.id} className="border-b border-outline/5 hover:bg-surface-variant/20 transition-all">
                                                                <td className="py-3 px-2 font-bold text-on-surface">
                                                                    {date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                </td>
                                                                <td className="py-3 px-2 font-mono">
                                                                    {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                </td>
                                                                <td className="py-3 px-2 font-mono text-on-surface-variant">
                                                                    {outDate ? outDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : <span className="text-green-500 font-bold">Activo</span>}
                                                                </td>
                                                                <td className="py-3 px-2 font-mono text-on-surface-variant">
                                                                    {lunchMin > 0 ? `${lunchMin} mins` : '--'}
                                                                </td>
                                                                <td className="py-3 px-2 font-mono font-bold text-primary">
                                                                    {netHours.toFixed(2)} hrs
                                                                </td>
                                                                <td className={`py-3 px-2 font-mono text-right font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {balanceStr}h
                                                                </td>
                                                            </tr>
                                                        );
                                                    }).reverse()}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}

                                {/* SUBTAB: TODOS LOS MESES */}
                                {shiftsSubTab === 'todos' && (
                                    <div className="space-y-6">
                                        {/* Months Select Grid */}
                                        <div className="bg-surface-container/30 border border-outline/10 p-5 rounded-2xl">
                                            <h4 className="font-bold text-xs text-on-surface mb-3">Filtrar por Mes</h4>
                                            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((mName, mIdx) => (
                                                    <button 
                                                        key={mIdx}
                                                        onClick={() => setSelectedMonthFilter(selectedMonthFilter === mIdx ? null : mIdx)}
                                                        className={`py-2 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                                                            selectedMonthFilter === mIdx 
                                                                ? 'bg-primary border-primary text-white' 
                                                                : 'bg-surface-container-high/40 border-outline/20 text-on-surface-variant hover:border-primary/50'
                                                        }`}
                                                    >
                                                        {mName.slice(0, 3)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Historical List */}
                                        <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-2xl">
                                            <h4 className="font-bold text-xs text-on-surface mb-4">
                                                {selectedMonthFilter !== null 
                                                    ? `Marcaciones de ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedMonthFilter]}` 
                                                    : 'Todos los Fichajes'}
                                            </h4>
                                            {shiftsLoading ? (
                                                <div className="flex justify-center py-8">
                                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : empShifts.filter(s => {
                                                if (selectedMonthFilter === null) return true;
                                                const clockIn = new Date(s.clock_in);
                                                return clockIn.getMonth() === selectedMonthFilter;
                                            }).length === 0 ? (
                                                <p className="text-xs text-on-surface-variant/60 py-6 text-center">No hay marcaciones para este período.</p>
                                            ) : (
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead>
                                                        <tr className="text-on-surface-variant/70 border-b border-outline/10 font-bold">
                                                            <th className="py-2.5 px-2">Fecha</th>
                                                            <th className="py-2.5 px-2">Hora Entrada</th>
                                                            <th className="py-2.5 px-2">Hora Salida</th>
                                                            <th className="py-2.5 px-2">Lunch</th>
                                                            <th className="py-2.5 px-2 text-right">Horas Totales</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {empShifts.filter(s => {
                                                            if (selectedMonthFilter === null) return true;
                                                            const clockIn = new Date(s.clock_in);
                                                            return clockIn.getMonth() === selectedMonthFilter;
                                                        }).map(s => {
                                                            const date = new Date(s.clock_in);
                                                            const outDate = s.clock_out ? new Date(s.clock_out) : null;
                                                            let lunchMin = 0;
                                                            if (s.lunch_start && s.lunch_end) {
                                                                lunchMin = Math.floor((new Date(s.lunch_end).getTime() - new Date(s.lunch_start).getTime()) / 60000);
                                                            }
                                                            return (
                                                                <tr key={s.id} className="border-b border-outline/5 hover:bg-surface-variant/20 transition-all">
                                                                    <td className="py-3 px-2 font-bold text-on-surface">
                                                                        {date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </td>
                                                                    <td className="py-3 px-2 font-mono">
                                                                        {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                    </td>
                                                                    <td className="py-3 px-2 font-mono text-on-surface-variant">
                                                                        {outDate ? outDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : <span className="text-green-500 font-bold">Activo</span>}
                                                                    </td>
                                                                    <td className="py-3 px-2 font-mono text-on-surface-variant">
                                                                        {lunchMin > 0 ? `${lunchMin} min` : '--'}
                                                                    </td>
                                                                    <td className="py-3 px-2 font-mono font-bold text-primary text-right">
                                                                        {Number(s.hours_worked || 0).toFixed(2)} hrs
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-on-surface-variant/60 py-12 text-center bg-surface-container/10 rounded-2xl border border-dashed border-outline/20">
                                Selecciona un empleado de la lista para ver su historial detallado de fichajes semanales y mensuales.
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 text-on-surface">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">
                        {viewMode === 'turnos' ? 'Control de Asistencia y Turnos' : 'Gestión de Personal y Nómina'}
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                        {viewMode === 'turnos' 
                            ? 'Monitorea en tiempo real los registros de entrada, almuerzos, salidas y puntualidad.' 
                            : 'Registra departamentos, crea asesores de atención y liquida nóminas LatAm.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {viewMode !== 'turnos' && (
                        <>
                            <button 
                                onClick={() => { setErrorMsg(''); setDeptName(''); setIsDeptOpen(true); }}
                                className="px-4 py-2 border border-outline/20 hover:bg-surface-variant/20 text-on-surface text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[16px]">domain</span>
                                Departamentos
                            </button>
                            <button 
                                onClick={() => { fetchData(); fetchHrDocs(); fetchTodayShifts(); }}
                                className="w-9 h-9 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-xl flex items-center justify-center border border-outline/10 cursor-pointer transition shadow"
                                title="Refrescar Empleados"
                            >
                                <span className="material-symbols-outlined text-[18px]">refresh</span>
                            </button>
                            <button 
                                onClick={openCreateEmpModal}
                                className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
                            >
                                <span className="material-symbols-outlined text-[16px]">person_add</span>
                                Nuevo Empleado
                            </button>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : activeView === 'list' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Employees list table */}
                    <div className="lg:col-span-8 bg-surface-container/30 border border-outline/10 rounded-2xl p-6 overflow-x-auto">
                        <h3 className="font-bold text-sm text-on-surface mb-4">Listado de Personal</h3>
                        {employees.length === 0 ? (
                            <p className="text-sm text-on-surface-variant text-center py-6">No hay empleados registrados en el sistema.</p>
                        ) : (
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-outline/10 text-on-surface-variant uppercase font-bold tracking-tight">
                                        <th className="py-3 px-2">Nombre</th>
                                        <th className="py-3 px-2">Teléfono</th>
                                        <th className="py-3 px-2">Rol / Cargo</th>
                                        <th className="py-3 px-2">Departamento</th>
                                        <th className="py-3 px-2">PIN</th>
                                        <th className="py-3 px-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id} className="border-b border-outline/5 hover:bg-surface-variant/20 transition-all">
                                            <td className="py-3.5 px-2 font-bold text-on-surface cursor-pointer hover:text-primary hover:underline" onClick={() => handleOpenDetail(emp)}>{emp.name} {emp.last_name || ''}</td>
                                            <td className="py-3.5 px-2 font-mono">+{emp.phone}</td>
                                            <td className="py-3.5 px-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                    emp.role === 'admin' ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'
                                                }`}>
                                                    {emp.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-2 text-on-surface-variant">{emp.department_name || 'Sin Asignar'}</td>
                                            <td className="py-3.5 px-2 font-mono">••••</td>
                                            <td className="py-3.5 px-2 text-right space-x-1.5">
                                                <button 
                                                    onClick={() => handleOpenDetail(emp)}
                                                    className="px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border-0 rounded-lg text-[10px] font-bold cursor-pointer transition"
                                                >
                                                    Ficha/Turnos
                                                </button>
                                                <button 
                                                    onClick={() => openPayrollModal(emp)}
                                                    className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-0 rounded-lg text-[10px] font-bold cursor-pointer transition"
                                                >
                                                    Nómina
                                                </button>
                                                <button 
                                                    onClick={() => openEditEmpModal(emp)}
                                                    className="p-1.5 text-on-surface hover:bg-surface-variant/40 rounded-lg border-0 cursor-pointer transition-all inline-flex"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteEmp(emp.id, emp.name)}
                                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg border-0 cursor-pointer transition-all inline-flex"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Quick Stats & Adoption overview */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Adoption Stats Card */}
                        <div className="bg-surface-container/30 border border-outline/10 p-6 rounded-2xl">
                            <h3 className="font-bold text-sm text-on-surface mb-3">Métricas de Adopción</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3.5 bg-surface-container/50 border border-outline/10 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">groups</span>
                                        <span className="text-xs text-on-surface-variant">Asesores Totales</span>
                                    </div>
                                    <span className="font-bold text-sm">{employees.length}</span>
                                </div>

                                <div className="flex justify-between items-center p-3.5 bg-surface-container/50 border border-outline/10 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-500">work</span>
                                        <span className="text-xs text-on-surface-variant">Turnos Activos Hoy</span>
                                    </div>
                                    <span className="font-bold text-sm text-green-500">
                                        {employees.filter(e => e.is_active).length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Shift quick check-in instructions helper */}
                        <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl text-xs space-y-2">
                            <h4 className="font-bold text-primary flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                Marcación Rápida
                            </h4>
                            <p className="text-on-surface-variant leading-relaxed">
                                Los empleados pueden marcar su entrada y salida directamente en esta pantalla digitando su PIN secreto. Esto mantendrá activa su sesión y calculará sus horas laboradas.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                renderShiftsPanel()
            )}

            {/* HR Solicitudes & Incapacidades Panel */}
            <div className="glass-card p-6 rounded-2xl border border-outline/10 mt-6">
                <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                    <div>
                        <h3 className="font-bold text-sm text-on-surface">Solicitudes y Permisos de Personal (RRHH)</h3>
                        <p className="text-[10px] text-on-surface-variant">Revisa, aprueba o rechaza solicitudes de vacaciones, permisos e incapacidades médicas cargadas por los empleados.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-bold">
                        {hrDocs.filter(d => d.status === 'pending').length} Pendientes
                    </span>
                </div>

                {hrDocsLoading ? (
                    <div className="flex justify-center py-6">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : hrDocs.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/60 py-6 text-center italic">No hay solicitudes pendientes o registradas en el sistema.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {hrDocs.map((doc: any) => (
                            <div key={doc.id} className="p-4 bg-surface-container/20 border border-outline/10 rounded-xl space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-bold text-xs text-on-surface block">{doc.employee_name}</span>
                                        <span className="text-[9px] text-on-surface-variant font-mono">+{doc.employee_phone}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                        doc.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                        doc.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                        {doc.status}
                                    </span>
                                </div>

                                <div className="text-xs space-y-1.5">
                                    <div className="flex justify-between text-[10px] text-on-surface-variant">
                                        <span>Tipo: <strong className="text-primary capitalize">{doc.doc_type.replace('_', ' ')}</strong></span>
                                        <span>Rango: <strong>{new Date(doc.start_date).toLocaleDateString('es-CO')} {doc.end_date ? `- ${new Date(doc.end_date).toLocaleDateString('es-CO')}` : ''}</strong></span>
                                    </div>
                                    <p className="text-on-surface-variant font-medium bg-white/5 p-2 rounded-lg italic">"{doc.notes || doc.reason}"</p>
                                </div>

                                {doc.file_url && (
                                    <div className="pt-1">
                                        <a 
                                            href={doc.file_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">attachment</span>
                                            Ver archivo adjunto
                                        </a>
                                    </div>
                                )}

                                {doc.status === 'pending' && (
                                    <div className="flex gap-2 justify-end pt-2 border-t border-outline/5">
                                        <button 
                                            onClick={() => handleUpdateDocStatus(doc.id, 'rejected')}
                                            className="px-2.5 py-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/5 text-[10px] font-bold rounded-lg cursor-pointer transition bg-transparent"
                                        >
                                            Rechazar
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateDocStatus(doc.id, 'approved')}
                                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition border-0"
                                        >
                                            Aprobar
                                        </button>
                                    </div>
                                )}

                                {doc.status !== 'pending' && (
                                    <div className="flex justify-between items-center pt-2 border-t border-outline/5 text-[9px] text-on-surface-variant/60 font-mono">
                                        <span>Gestionado</span>
                                        <button 
                                            onClick={() => handleDeleteDoc(doc.id)}
                                            className="text-red-500 hover:underline border-0 bg-transparent cursor-pointer"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DEPARTMENTS MANAGER MODAL */}
            {isDeptOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Gestionar Departamentos</h3>
                            <button 
                                onClick={() => setIsDeptOpen(false)}
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

                        {/* Add department form */}
                        <form onSubmit={handleCreateDept} className="flex gap-2 mb-4">
                            <input 
                                type="text"
                                required
                                value={deptName}
                                onChange={(e) => setDeptName(e.target.value)}
                                className="flex-grow bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface text-xs focus:border-primary outline-none"
                                placeholder="Ej: Cartera, Recepción..."
                            />
                            <button 
                                type="submit"
                                disabled={actionLoading}
                                className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl cursor-pointer transition"
                            >
                                Agregar
                            </button>
                        </form>

                        {/* Departments list */}
                        <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                            <h4 className="text-xs font-bold text-on-surface-variant mb-2">Departamentos Activos</h4>
                            {departments.length === 0 ? (
                                <p className="text-xs text-on-surface-variant/60 py-3 text-center">No hay departamentos creados.</p>
                            ) : (
                                departments.map(d => (
                                    <div key={d.id} className="flex justify-between items-center bg-surface-container/30 border border-outline/5 p-3 rounded-xl">
                                        <span className="text-xs font-bold">{d.name}</span>
                                        <button 
                                            onClick={() => handleDeleteDept(d.id, d.name)}
                                            className="p-1 text-red-500 hover:bg-red-500/10 border-0 rounded cursor-pointer transition-all inline-flex"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE/EDIT EMPLOYEE MODAL */}
            {isEmpOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">
                                {selectedEmp ? 'Editar Empleado' : 'Registrar Empleado'}
                            </h3>
                            <button 
                                onClick={() => setIsEmpOpen(false)}
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

                        <form onSubmit={handleCreateEmp} className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Nombre</label>
                                    <input 
                                        type="text"
                                        required
                                        value={empName}
                                        onChange={(e) => setEmpName(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: Laura"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Apellido</label>
                                    <input 
                                        type="text"
                                        value={empLastName}
                                        onChange={(e) => setEmpLastName(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: Bermúdez"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Número de Teléfono</label>
                                <input 
                                    type="text"
                                    required
                                    value={empPhone}
                                    onChange={(e) => setEmpPhone(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono"
                                    placeholder="Ej: 3001234567"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Cargo o Rol de Trabajo</label>
                                <select 
                                    value={empRole}
                                    onChange={(e) => setEmpRole(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                >
                                    <option value="agent">Asesor de Atención / Agente</option>
                                    <option value="sales">Vendedor / Comercial</option>
                                    <option value="delivery">Puerta a Puerta / Logística</option>
                                    <option value="admin">Administrador del Inquilino</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Departamento Asociado</label>
                                <select 
                                    value={empDeptId}
                                    onChange={(e) => setEmpDeptId(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                >
                                    <option value="">Ninguno / Sin Asignar</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">PIN de Seguridad (Fichaje)</label>
                                <input 
                                    type="password"
                                    maxLength={4}
                                    required
                                    value={empPin}
                                    onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono tracking-widest text-center text-lg"
                                    placeholder="Ej: 1234"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-outline/10">
                                <button 
                                    type="button"
                                    onClick={() => setIsEmpOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer text-xs transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer text-xs transition flex items-center gap-1.5"
                                >
                                    {actionLoading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                         {/* Clock modal removed, functionality integrated into Assistance & Turnos subview */}
                    </div>
                </div>
            )}

            {/* PAYROLL SUMMARY MODAL */}
            {isPayrollOpen && selectedEmp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-2xl w-full rounded-2xl overflow-hidden p-6 shadow-2xl animate-float max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-primary">payments</span>
                                Liquidación Mensual de Nómina
                            </h3>
                            <button 
                                onClick={() => setIsPayrollOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {payrollLoading ? (
                            <div className="flex flex-col items-center py-12 space-y-3">
                                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-on-surface-variant font-bold">Calculando recargos, horas dominicales y deducciones de ley...</span>
                            </div>
                        ) : errorMsg ? (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-4 rounded-2xl font-bold text-center">
                                ⚠️ {errorMsg}
                            </div>
                        ) : payrollSummary ? (
                            <div className="space-y-6 text-xs" id="payroll-slip">
                                {/* Header paystub info */}
                                <div className="grid grid-cols-2 gap-4 bg-surface-container/30 p-4 rounded-xl border border-outline/5">
                                    <div>
                                        <p className="text-[10px] text-on-surface-variant uppercase font-mono">Empleado</p>
                                        <p className="font-bold text-sm text-primary mt-0.5">{selectedEmp.name} {selectedEmp.last_name || ''}</p>
                                        <p className="text-on-surface-variant font-mono mt-1">{selectedEmp.role.toUpperCase()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-on-surface-variant uppercase font-mono">Periodo de Liquidación</p>
                                        <p className="font-bold text-on-surface mt-0.5">Mensual Actual (30 días)</p>
                                        <p className="text-on-surface-variant font-mono mt-1">Sueldo Base: ${new Intl.NumberFormat('es-CO').format(payrollSummary.base_salary)} COP</p>
                                    </div>
                                </div>

                                {/* Hours & Timesheets overview */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-on-surface border-b border-outline/5 pb-1">1. Registro de Tiempos y Jornada</h4>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white/5 p-2.5 rounded-xl border border-outline/5">
                                            <p className="text-[10px] text-on-surface-variant">Horas Brutas Registradas</p>
                                            <p className="font-bold text-sm text-on-surface mt-1">{payrollSummary.hours_worked.toFixed(2)} Hrs</p>
                                        </div>
                                        <div className="bg-white/5 p-2.5 rounded-xl border border-outline/5">
                                            <p className="text-[10px] text-on-surface-variant">Descuento Almuerzo (Mins)</p>
                                            <p className="font-bold text-sm text-red-500 mt-1">{payrollSummary.lunch_discount_minutes} mins</p>
                                        </div>
                                        <div className="bg-white/5 p-2.5 rounded-xl border border-outline/5">
                                            <p className="text-[10px] text-on-surface-variant">Horas Netas Liquidadas</p>
                                            <p className="font-bold text-sm text-green-500 mt-1">{payrollSummary.net_hours_worked.toFixed(2)} Hrs</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Devengados (Earnings) table */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-on-surface border-b border-outline/5 pb-1">2. Detalle de Devengados (Ingresos)</h4>
                                    <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-outline/5">
                                        <div className="flex justify-between py-1">
                                            <span>Sueldo Neto de Horas Ordinarias</span>
                                            <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.base_payment)} COP</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-t border-white/5">
                                            <span>Recargos Nocturnos Liquidados (+35%)</span>
                                            <span className="font-mono text-primary">+${new Intl.NumberFormat('es-CO').format(payrollSummary.night_surcharge)} COP</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-t border-white/5">
                                            <span>Recargos Dominicales/Festivos (+75%)</span>
                                            <span className="font-mono text-primary">+${new Intl.NumberFormat('es-CO').format(payrollSummary.sunday_surcharge)} COP</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-t border-white/5 font-bold text-sm text-on-surface">
                                            <span>Total Devengado (Ingreso Bruto)</span>
                                            <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.gross_earnings)} COP</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deducciones (Deductions) table */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-on-surface border-b border-outline/5 pb-1">3. Deducciones de Ley (Trabajador)</h4>
                                    <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-outline/5">
                                        <div className="flex justify-between py-1">
                                            <span>Aporte a Salud Obligatoria (4%)</span>
                                            <span className="font-mono text-red-500">-${new Intl.NumberFormat('es-CO').format(payrollSummary.deductions.health)} COP</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-t border-white/5">
                                            <span>Aporte a Pensión Obligatoria (4%)</span>
                                            <span className="font-mono text-red-500">-${new Intl.NumberFormat('es-CO').format(payrollSummary.deductions.pension)} COP</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-t border-white/5 font-bold text-sm text-on-surface">
                                            <span>Total Deducciones</span>
                                            <span className="font-mono text-red-500">-${new Intl.NumberFormat('es-CO').format(payrollSummary.total_deductions)} COP</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Provisions and Employer taxes */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-on-surface border-b border-outline/5 pb-1">4. Costos Adicionales de Empresa (Provisiones &amp; ARL)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-3 rounded-xl border border-outline/5 space-y-1">
                                            <p className="font-bold text-[10px] text-on-surface-variant uppercase mb-1">Aportes Patronales (Empresa)</p>
                                            <div className="flex justify-between py-0.5 text-[10px]">
                                                <span>Pensión (12%)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.pension)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>Salud (8.5%): {payrollSummary.employer_contributions.exonerated_health_sena ? <span className="text-green-500 font-bold">Exonerado</span> : ''}</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.health)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>ARL ({payrollSummary.employer_contributions.arl_percentage}% - Riesgo I)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.arl)}</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-3 rounded-xl border border-outline/5 space-y-1">
                                            <p className="font-bold text-[10px] text-on-surface-variant uppercase mb-1">Provisiones Prestacionales (Ley)</p>
                                            <div className="flex justify-between py-0.5 text-[10px]">
                                                <span>Prima de Servicios (8.33%)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.provisions.prima)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>Cesantías (8.33%)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.provisions.cesantias)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>Int. Cesantías (1% mensual)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.provisions.intereses_cesantias)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>Vacaciones (4.17%)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.provisions.vacaciones)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Payable */}
                                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 p-4 rounded-xl flex justify-between items-center font-sans">
                                    <div>
                                        <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider font-bold">Total Neto a Pagar a Empleado</p>
                                        <p className="text-lg font-black text-white mt-1">${new Intl.NumberFormat('es-CO').format(payrollSummary.net_payment)} COP</p>
                                    </div>
                                    <button 
                                        onClick={() => window.print()}
                                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition shadow"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">print</span>
                                        Imprimir Desprendible
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* EMP DETAIL MODAL */}
            {isDetailOpen && selectedEmpDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-2xl w-full rounded-2xl overflow-hidden p-6 shadow-2xl animate-float max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-on-surface">Ficha del Empleado</h3>
                                <p className="text-xs text-on-surface-variant">{selectedEmpDetail.name} {selectedEmpDetail.last_name || ''}</p>
                            </div>
                            <button 
                                onClick={() => setIsDetailOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Modal Navigation Tabs */}
                        <div className="flex bg-surface-container/50 p-1 rounded-xl border border-outline/10 text-xs mb-4">
                            <button 
                                type="button"
                                onClick={() => setDetailTab('info')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'info' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Información General
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDetailTab('shifts')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'shifts' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Registro de Turnos
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDetailTab('tasks')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'tasks' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Tareas Asignadas ({empTasks.length})
                            </button>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-grow overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                            
                            {/* Tab 1: Info */}
                            {detailTab === 'info' && (
                                <div className="space-y-4 text-xs">
                                    <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-outline/5">
                                        <div>
                                            <span className="text-on-surface-variant block mb-1">Nombre Completo:</span>
                                            <strong className="text-on-surface text-sm">{selectedEmpDetail.name} {selectedEmpDetail.last_name || ''}</strong>
                                        </div>
                                        <div>
                                            <span className="text-on-surface-variant block mb-1">WhatsApp / Teléfono:</span>
                                            <strong className="text-on-surface text-sm">+{selectedEmpDetail.phone}</strong>
                                        </div>
                                        <div>
                                            <span className="text-on-surface-variant block mb-1">Rol / Cargo:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-block mt-0.5 uppercase ${
                                                selectedEmpDetail.role === 'admin' ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'
                                            }`}>
                                                {selectedEmpDetail.role}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-on-surface-variant block mb-1">Departamento:</span>
                                            <strong className="text-on-surface text-sm">{selectedEmpDetail.department_name || 'Sin Asignar'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-on-surface-variant block mb-1">PIN Marcación Rápida:</span>
                                            <strong className="text-on-surface font-mono text-sm tracking-widest">{selectedEmpDetail.pin}</strong>
                                        </div>
                                        <div>
                                            <span className="text-on-surface-variant block mb-1">Fecha Registro:</span>
                                            <span className="text-on-surface">{new Date(selectedEmpDetail.created_at).toLocaleDateString('es-CO')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Shifts */}
                            {detailTab === 'shifts' && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-xs text-on-surface border-b border-outline/5 pb-1">Historial Reciente de Turnos</h4>
                                    {shiftsLoading ? (
                                        <p className="text-xs text-on-surface-variant italic py-2 animate-pulse">Cargando turnos de asistencia...</p>
                                    ) : empShifts.length === 0 ? (
                                        <p className="text-xs text-on-surface-variant/70 italic py-2">No se registran turnos o marcaciones de entrada/salida para este empleado.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="border-b border-outline/10 text-on-surface-variant uppercase font-bold text-[10px]">
                                                        <th className="py-2 px-1">Fecha</th>
                                                        <th className="py-2 px-1">Entrada</th>
                                                        <th className="py-2 px-1">Almuerzo</th>
                                                        <th className="py-2 px-1">Salida</th>
                                                        <th className="py-2 px-1 text-right">Horas</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {empShifts.slice(0, 10).map((shift: any) => {
                                                        const inTime = shift.clock_in ? new Date(shift.clock_in).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '---';
                                                        const lunchStart = shift.lunch_start ? new Date(shift.lunch_start).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
                                                        const lunchEnd = shift.lunch_end ? new Date(shift.lunch_end).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
                                                        const outTime = shift.clock_out ? new Date(shift.clock_out).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '---';
                                                        const totalHours = shift.total_hours ? parseFloat(shift.total_hours).toFixed(2) + ' Hrs' : 'Activo';
                                                        
                                                        const lunchStr = lunchStart 
                                                            ? `${lunchStart} - ${lunchEnd || 'En curso'}`
                                                            : '---';

                                                        return (
                                                            <tr key={shift.id} className="border-b border-outline/5 hover:bg-white/5">
                                                                <td className="py-2 px-1 font-mono text-[10px]">{new Date(shift.created_at).toLocaleDateString('es-CO')}</td>
                                                                <td className="py-2 px-1 text-primary">{inTime}</td>
                                                                <td className="py-2 px-1 text-on-surface-variant/80">{lunchStr}</td>
                                                                <td className="py-2 px-1 text-secondary">{outTime}</td>
                                                                <td className="py-2 px-1 text-right font-mono font-bold text-green-500">{totalHours}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: Tasks */}
                            {detailTab === 'tasks' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-xs text-on-surface border-b border-outline/5 pb-1">Asignar Nueva Tarea</h4>
                                        <form onSubmit={handleAssignTask} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl border border-outline/5 text-xs">
                                            <div className="space-y-1">
                                                <label className="font-bold text-[10px] text-on-surface-variant uppercase">Título de la Tarea</label>
                                                <input 
                                                    type="text"
                                                    required
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    className="w-full bg-surface-container border border-outline/10 p-2 rounded-lg text-on-surface outline-none"
                                                    placeholder="Ej: Archivar facturas pendientes"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="font-bold text-[10px] text-on-surface-variant uppercase">Asignado Por (Tu Nombre)</label>
                                                <input 
                                                    type="text"
                                                    disabled
                                                    value={newTaskCreator}
                                                    className="w-full bg-surface-container border border-outline/10 p-2 rounded-lg text-on-surface outline-none opacity-60 cursor-not-allowed"
                                                    placeholder="Ej: Supervisor Carlos (Admin)"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="font-bold text-[10px] text-on-surface-variant uppercase">Descripción / Instrucciones</label>
                                                <textarea 
                                                    rows={2}
                                                    value={newTaskDesc}
                                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                                    className="w-full bg-surface-container border border-outline/10 p-2 rounded-lg text-on-surface outline-none resize-none"
                                                    placeholder="Escribe detalles o instrucciones claras para el empleado..."
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 md:col-span-2">
                                                <div className="space-y-1">
                                                    <label className="font-bold text-[10px] text-on-surface-variant uppercase">Fecha Límite</label>
                                                    <input 
                                                        type="date"
                                                        required
                                                        value={newTaskDueDate}
                                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                                        className="w-full bg-surface-container border border-outline/10 p-2 rounded-lg text-on-surface outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="font-bold text-[10px] text-on-surface-variant uppercase">Hora Límite</label>
                                                    <input 
                                                        type="time"
                                                        required
                                                        value={newTaskDueTime}
                                                        onChange={(e) => setNewTaskDueTime(e.target.value)}
                                                        className="w-full bg-surface-container border border-outline/10 p-2 rounded-lg text-on-surface outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end md:col-span-2 mt-1">
                                                <button
                                                    type="submit"
                                                    disabled={actionLoading}
                                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-lg cursor-pointer transition shadow"
                                                >
                                                    {actionLoading ? 'Guardando...' : 'Asignar Tarea'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-bold text-xs text-on-surface border-b border-outline/5 pb-1">Historial de Tareas</h4>
                                        {tasksLoading ? (
                                            <p className="text-xs text-on-surface-variant italic py-2 animate-pulse">Cargando tareas...</p>
                                        ) : empTasks.length === 0 ? (
                                            <p className="text-xs text-on-surface-variant/70 italic py-2">No hay tareas asignadas a este empleado.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                                {empTasks.map((tsk: any) => (
                                                    <div key={tsk.id} className="p-3 bg-surface-container/20 border border-outline/5 rounded-xl space-y-1.5 text-xs text-left">
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-bold text-on-surface">{tsk.title}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                                tsk.status === 'pendiente' ? 'bg-amber-500/15 text-amber-500' : 'bg-green-500/10 text-green-500'
                                                            }`}>
                                                                {tsk.status}
                                                            </span>
                                                        </div>
                                                        {tsk.description && (
                                                            <p className="text-on-surface-variant text-[11px] leading-relaxed">
                                                                {tsk.description}
                                                            </p>
                                                        )}
                                                        <div className="flex justify-between text-[10px] text-on-surface-variant/70 font-mono border-t border-outline/5 pt-1.5 mt-1.5">
                                                            <span>Por: <strong>{tsk.created_by_name || 'Admin'}</strong></span>
                                                            <span>Fecha: {new Date(tsk.created_at).toLocaleDateString('es-CO')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-outline/10 pt-4 mt-4 flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setIsDetailOpen(false)}
                                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl cursor-pointer transition"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
