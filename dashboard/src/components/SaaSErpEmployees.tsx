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
}

interface SaaSErpEmployeesProps {
    clientId: string;
}

export const SaaSErpEmployees: React.FC<SaaSErpEmployeesProps> = ({ clientId }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isDeptOpen, setIsDeptOpen] = useState(false);
    const [isEmpOpen, setIsEmpOpen] = useState(false);
    const [isClockOpen, setIsClockOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [empShifts, setEmpShifts] = useState<Shift[]>([]);
    const [shiftsLoading, setShiftsLoading] = useState(false);

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
    const [clockPin, setClockPin] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const token = localStorage.getItem('auth_token');

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

    // Timesheet shifts modal
    const openClockModal = async (emp: Employee) => {
        setSelectedEmp(emp);
        setClockPin('');
        setErrorMsg('');
        setIsClockOpen(true);
        loadShifts(emp.id);
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

    const handleClockAction = async (action: 'in' | 'out') => {
        if (!selectedEmp) return;
        if (clockPin !== selectedEmp.pin) {
            setErrorMsg('PIN de seguridad incorrecto.');
            return;
        }

        try {
            setActionLoading(true);
            setErrorMsg('');
            const res = await fetch(`/api/clients/${clientId}/employees/${selectedEmp.id}/clock-${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setClockPin('');
                loadShifts(selectedEmp.id);
            } else {
                setErrorMsg(json.error || `Error al marcar ${action === 'in' ? 'entrada' : 'salida'}.`);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    // Calculate aggregated adoption stats
    const activeShiftsCount = empShifts.filter(s => !s.clock_out).length;
    const totalHours = empShifts.reduce((acc, curr) => acc + Number(curr.hours_worked || 0), 0);

    return (
        <div className="space-y-6 text-on-surface">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Gestión de Empleados y Nómina</h2>
                    <p className="text-xs text-on-surface-variant">Registra departamentos, crea asesores de atención y controla turnos de trabajo con marcación.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { setErrorMsg(''); setDeptName(''); setIsDeptOpen(true); }}
                        className="px-4 py-2 border border-outline/20 hover:bg-surface-variant/20 text-on-surface text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                    >
                        <span className="material-symbols-outlined text-[16px]">domain</span>
                        Departamentos
                    </button>
                    <button 
                        onClick={openCreateEmpModal}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
                    >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        Nuevo Empleado
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
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
                                            <td className="py-3.5 px-2 font-bold text-on-surface">{emp.name} {emp.last_name || ''}</td>
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
                                                    onClick={() => openClockModal(emp)}
                                                    className="px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border-0 rounded-lg text-[10px] font-bold cursor-pointer transition"
                                                >
                                                    Turnos
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
                    </div>
                </div>
            )}

            {/* EMPLOYEE WORK LOGS (CLOCKED SHIFTS) MODAL */}
            {isClockOpen && selectedEmp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden p-6 shadow-2xl animate-float">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-green-500">work_history</span>
                                Registro de Turnos: {selectedEmp.name} {selectedEmp.last_name || ''}
                            </h3>
                            <button 
                                onClick={() => setIsClockOpen(false)}
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

                        {/* Fast Clock Form (Simulates Physical Tablet/Kiosk checkout) */}
                        <div className="bg-surface-container/20 border border-outline/5 p-4 rounded-xl mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase font-mono">PIN del Empleado</label>
                                <input 
                                    type="password"
                                    maxLength={4}
                                    value={clockPin}
                                    onChange={(e) => setClockPin(e.target.value.replace(/\D/g, ''))}
                                    className="bg-surface border border-outline/20 px-3 py-2 rounded-xl text-on-surface font-mono tracking-widest text-center text-sm outline-none focus:border-primary w-24"
                                    placeholder="••••"
                                />
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button 
                                    onClick={() => handleClockAction('in')}
                                    disabled={actionLoading}
                                    className="flex-grow md:flex-none px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition shadow"
                                >
                                    <span className="material-symbols-outlined text-[16px]">login</span>
                                    Entrada
                                </button>
                                <button 
                                    onClick={() => handleClockAction('out')}
                                    disabled={actionLoading}
                                    className="flex-grow md:flex-none px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition shadow"
                                >
                                    <span className="material-symbols-outlined text-[16px]">logout</span>
                                    Salida
                                </button>
                            </div>
                        </div>

                        {/* Summary metrics for this employee */}
                        <div className="flex justify-between items-center mb-4 text-xs font-bold bg-primary/5 p-3 rounded-xl border border-primary/10">
                            <span className="text-on-surface-variant">Turnos Activos: <span className="text-green-500">{activeShiftsCount}</span></span>
                            <span className="text-on-surface-variant">Horas Totales: <span className="text-primary">{totalHours.toFixed(2)} Hrs</span></span>
                        </div>

                        {/* Shifts listing grid */}
                        <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                            <h4 className="text-xs font-bold text-on-surface-variant mb-2">Turnos Recientes</h4>
                            {shiftsLoading ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : empShifts.length === 0 ? (
                                <p className="text-xs text-on-surface-variant/60 py-3 text-center">No hay registros de marcación para este empleado.</p>
                            ) : (
                                empShifts.map(s => (
                                    <div key={s.id} className="flex justify-between items-center bg-surface-container/30 border border-outline/5 p-3 rounded-xl text-xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-green-500 text-[14px]">login</span>
                                                <span className="font-bold">{new Date(s.clock_in).toLocaleString('es-CO')}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-orange-500 text-[14px]">logout</span>
                                                <span>{s.clock_out ? new Date(s.clock_out).toLocaleString('es-CO') : <span className="text-green-500 font-bold">Activo</span>}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-primary font-mono">{Number(s.hours_worked || 0).toFixed(2)} Hrs</p>
                                            <p className="text-[9px] text-on-surface-variant">Horas Trabajadas</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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
        </div>
    );
};
