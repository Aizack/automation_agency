import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { translateErrorMessage } from '../utils/errorHandler';

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
    hire_date?: string | null;
    basic_salary?: number;
    payment_type?: 'fixed' | 'hourly';
    pay_period?: 'quincenal' | 'mensual';
    cutoff_days?: string | null;
    pay_days?: string | null;
    vacation_days_accumulated?: number;
    hourly_rate?: number;
    employment_status?: 'linked' | 'unlinked';
    activity_status?: 'active' | 'inactive';
    payment_method?: 'cash' | 'transfer';
    bank_name?: string | null;
    bank_account_number?: string | null;
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



const MODULES = [
    { key: 'inventory', label: '📦 Inventario' },
    { key: 'billing', label: '💵 Facturación' },
    { key: 'cartera', label: '📊 Cartera y Cobros' },
    { key: 'crm', label: '👤 CRM / Clientes' },
    { key: 'appointments', label: '📅 Agenda de Citas' },
    { key: 'formulas', label: '👁 Optometría / Fórmulas' },
    { key: 'lab', label: '🔬 Laboratorio' },
    { key: 'domicilios', label: '🚴 Despachos y Domicilios' },
    { key: 'employees', label: '👥 Administración Personal' },
    { key: 'campaigns', label: '🗺️ Campañas' },
    { key: 'marketing', label: '📢 Difusión Promocional' },
] as const;

export const SaaSErpEmployees: React.FC<SaaSErpEmployeesProps> = ({ clientId, viewMode }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [workRoles, setWorkRoles] = useState<string[]>(['agent', 'sales', 'delivery', 'admin']);
    const [loading, setLoading] = useState(true);
    const [employeeAccessPermissions, setEmployeeAccessPermissions] = useState<string[]>(['inventory', 'billing', 'crm', 'calendar', 'employees', 'hr', 'deliveries', 'whatsapp_bot']);

    // Salary advances states
    const [allAdvances, setAllAdvances] = useState<any[]>([]);
    const [loadingAdvances, setLoadingAdvances] = useState(false);
    
    // Approval process states
    const [processingAdv, setProcessingAdv] = useState<any | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [advActionType, setAdvActionType] = useState<'approve' | 'deliver' | 'reject'>('approve');
    const [deliveryMethod, setDeliveryMethod] = useState<'cash' | 'transfer'>('cash');
    const [deliveryBank, setDeliveryBank] = useState('');

    // Contractual edit states
    const [contrHireDate, setContrHireDate] = useState('');
    const [contrBasicSalary, setContrBasicSalary] = useState('');
    const [contrTransportAllowance, setContrTransportAllowance] = useState('');
    const [contrPaymentType, setContrPaymentType] = useState<'fixed' | 'hourly'>('fixed');
    const [contrPayPeriod, setContrPayPeriod] = useState<'quincenal' | 'mensual'>('mensual');
    const [contrCutoffDays, setContrCutoffDays] = useState('');
    const [contrPayDays, setContrPayDays] = useState('');
    const [contrVacations, setContrVacations] = useState('');
    const [contrEmpStatus, setContrEmpStatus] = useState<'linked' | 'unlinked'>('linked');
    const [contrContractType, setContrContractType] = useState<string>('indefinido');
    const [contrActStatus, setContrActStatus] = useState<'active' | 'inactive'>('active');
    const [contrPaymentMethod, setContrPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [contrBankName, setContrBankName] = useState('');
    const [contrBankAccount, setContrBankAccount] = useState('');
    const [savingContract, setSavingContract] = useState(false);

    // Modals
    const [isDeptOpen, setIsDeptOpen] = useState(false);
    const [isRoleOpen, setIsRoleOpen] = useState(false);
    const [roleName, setRoleName] = useState('');
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
    const [detailTab, setDetailTab] = useState<'info' | 'shifts' | 'tasks' | 'contrato' | 'permisos' | 'deliveries'>('info');

    // Payroll states
    const [isPayrollOpen, setIsPayrollOpen] = useState(false);
    const [payrollSummary, setPayrollSummary] = useState<any>(null);
    const [payrollLoading, setPayrollLoading] = useState(false);

    // HR Document requests states
    const [hrDocs, setHrDocs] = useState<any[]>([]);
    const [hrDocsLoading, setHrDocsLoading] = useState(false);

    // HR Admin registration states
    const [isAdminDocOpen, setIsAdminDocOpen] = useState(false);
    const [adminDocEmpId, setAdminDocEmpId] = useState('');
    const [adminDocType, setAdminDocType] = useState<'vacaciones' | 'permiso' | 'incapacidad'>('permiso');
    const [adminDocStartDate, setAdminDocStartDate] = useState('');
    const [adminDocEndDate, setAdminDocEndDate] = useState('');
    const [adminDocReturnDate, setAdminDocReturnDate] = useState('');
    const [adminDocNotes, setAdminDocNotes] = useState('');
    const [adminDocStatus, setAdminDocStatus] = useState<'pending' | 'approved' | 'negotiating'>('approved');

    // Form inputs
    const [deptName, setDeptName] = useState('');
    const [empName, setEmpName] = useState('');
    const [empLastName, setEmpLastName] = useState('');
    const [empPhone, setEmpPhone] = useState('');
    const [empRole, setEmpRole] = useState('agent');
    const [empDeptId, setEmpDeptId] = useState('');
    const [empPin, setEmpPin] = useState('');
    const [empCode, setEmpCode] = useState('');

    const [docFilterQuery, setDocFilterQuery] = useState('');
    const [docFilterMonth, setDocFilterMonth] = useState('');
    const [docFilterYear, setDocFilterYear] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Turnos Panel states
    const [activeView, setActiveView] = useState<'list' | 'shifts' | 'advances'>(viewMode === 'turnos' ? 'shifts' : 'list');
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
            
            const [empRes, deptRes, rolesRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/employees`, { headers }),
                fetch(`/api/clients/${clientId}/departments`, { headers }),
                fetch(`/api/clients/${clientId}/employee-roles`, { headers })
            ]);

            const empJson = await empRes.json();
            const deptJson = await deptRes.json();
            const rolesJson = await rolesRes.json();

            if (empJson.success) setEmployees(empJson.employees || []);
            if (deptJson.success) setDepartments(deptJson.departments || []);
            if (rolesJson.success) {
                const roles = (rolesJson.roles || []).map((role: any) => String(role.name || '').trim().toLowerCase()).filter(Boolean);
                setWorkRoles(Array.from(new Set(['agent', 'sales', 'delivery', 'admin', 'mesero', 'cocinero', 'bartender', 'caja', 'capitan_meseros', ...roles])));
            }
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

    const fetchAllAdvances = async () => {
        try {
            setLoadingAdvances(true);
            const res = await fetch(`/api/clients/${clientId}/employee-advances`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setAllAdvances(json.advances || []);
            }
        } catch (err) {
            console.error("Error loading advances:", err);
        } finally {
            setLoadingAdvances(false);
        }
    };

    const handleProcessAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!processingAdv) return;

        let payload: any = {
            adminNotes: adminNotes.trim(),
        };

        if (advActionType === 'approve') {
            payload.status = 'in_process';
        } else if (advActionType === 'reject') {
            payload.status = 'rejected';
        } else if (advActionType === 'deliver') {
            payload.status = 'delivered';
            payload.confirmedByAdmin = true;
            payload.paymentMethod = deliveryMethod;
            payload.bankName = deliveryMethod === 'transfer' ? deliveryBank : null;
        }

        try {
            const res = await fetch(`/api/clients/${clientId}/employee-advances/${processingAdv.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                setProcessingAdv(null);
                setAdminNotes('');
                setDeliveryBank('');
                fetchAllAdvances();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al procesar el anticipo.');
        }
    };

    const handleSaveContractInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmpDetail) return;
        try {
            setSavingContract(true);
            const res = await fetch(`/api/clients/${clientId}/employees/${selectedEmpDetail.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: selectedEmpDetail.name,
                    phone: selectedEmpDetail.phone,
                    role: selectedEmpDetail.role,
                    department_id: selectedEmpDetail.department_id,
                    pin: selectedEmpDetail.pin,
                    is_active: contrActStatus === 'active',
                    hire_date: contrHireDate || null,
                    basic_salary: contrBasicSalary ? parseFloat(contrBasicSalary) : 0,
                    transport_allowance: contrTransportAllowance ? parseFloat(contrTransportAllowance) : 0,
                    payment_type: contrPaymentType,
                    pay_period: contrPayPeriod,
                    cutoff_days: contrCutoffDays || null,
                    pay_days: contrPayDays || null,
                    vacation_days_accumulated: contrVacations ? parseFloat(contrVacations) : 0,
                    hourly_rate: contrBasicSalary ? (parseFloat(contrBasicSalary) / 240) : 0,
                    employment_status: contrEmpStatus,
                    contract_type: contrContractType,
                    activity_status: contrActStatus,
                    payment_method: contrPaymentMethod,
                    bank_name: contrBankName || null,
                    bank_account_number: contrBankAccount || null
                })
            });
            const json = await res.json();
            if (json.success) {
                alert('¡Configuración contractual guardada con éxito!');
                fetchData();
                setIsDetailOpen(false);
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al guardar contrato.');
        } finally {
            setSavingContract(false);
        }
    };

    const openPayrollModal = async (emp: Employee) => {
        setSelectedEmp(emp);
        setIsPayrollOpen(true);
        setPayrollLoading(true);
        setPayrollSummary(null);
        setErrorMsg('');
        try {
            const currentMonthYear = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
            const res = await fetch(`/api/clients/${clientId}/employees/${emp.id}/payroll-summary?month_year=${currentMonthYear}`, {
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

    const handleUpdateDocStatus = async (docId: string, nextStatus: 'approved' | 'rejected' | 'negotiating') => {
        const notes = window.prompt('Notas de respuesta al empleado (opcional):', '');
        if (notes === null) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/hr-documents/${docId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus, admin_notes: notes })
            });
            const json = await res.json();
            if (json.success) {
                fetchHrDocs();
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAdminDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminDocEmpId || !adminDocStartDate || !adminDocNotes) {
            alert('Por favor selecciona un empleado, fecha de inicio y escribe una justificación.');
            return;
        }

        try {
            setActionLoading(true);
            const res = await fetch(`/api/clients/${clientId}/hr-documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    employee_id: adminDocEmpId,
                    doc_type: adminDocType,
                    status: adminDocStatus,
                    notes: adminDocNotes,
                    start_date: adminDocStartDate,
                    end_date: adminDocEndDate || null,
                    return_date: adminDocReturnDate || null,
                    admin_notes: 'Registrado directamente por Gestión Humana.'
                })
            });
            const json = await res.json();
            if (json.success) {
                if (adminDocStatus === 'approved') {
                    fetchData();
                }
                setIsAdminDocOpen(false);
                setAdminDocEmpId('');
                setAdminDocStartDate('');
                setAdminDocEndDate('');
                setAdminDocReturnDate('');
                setAdminDocNotes('');
                setAdminDocStatus('approved');
                fetchHrDocs();
                alert('Solicitud/Ausencia registrada correctamente.');
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error de red: ${err.message}`);
        } finally {
            setActionLoading(false);
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

    const formatDateOnly = (dateStr: string) => {
        if (!dateStr) return '';
        const part = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = part.split('-');
        if (parts.length === 3) {
            return `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
        }
        return new Date(dateStr).toLocaleDateString('es-CO');
    };



    const checkOverlap = (currentDoc: any) => {
        if (!currentDoc.start_date || !currentDoc.end_date || !currentDoc.department_id) return null;
        
        const curStart = new Date(currentDoc.start_date).getTime();
        const curEnd = new Date(currentDoc.end_date).getTime();
        
        const overlaps = hrDocs.filter((doc: any) => {
            if (doc.id === currentDoc.id) return false;
            if (doc.department_id !== currentDoc.department_id) return false;
            if (doc.status === 'rejected') return false;
            if (!doc.start_date || !doc.end_date) return false;
            
            const docStart = new Date(doc.start_date).getTime();
            const docEnd = new Date(doc.end_date).getTime();
            
            return (curStart <= docEnd && docStart <= curEnd);
        });
        
        if (overlaps.length > 0) {
            return overlaps.map((o: any) => o.employee_name).join(', ');
        }
        return null;
    };

    useEffect(() => {
        const storedRoles = localStorage.getItem(`erp_work_roles_${clientId}`);
        if (storedRoles) {
            try {
                const parsed = JSON.parse(storedRoles);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setWorkRoles(Array.from(new Set(['agent', 'sales', 'delivery', 'admin', ...parsed])));
                }
            } catch (err) {
                console.warn('No se pudieron cargar roles guardados:', err);
            }
        }
        fetchData();
        fetchHrDocs();
        fetchTodayShifts();
        fetchAllAdvances();
    }, [clientId]);

    useEffect(() => {
        if (employees.length > 0) {
            const dbRoles = employees
                .map((emp) => emp.role)
                .filter((role): role is string => Boolean(role && role.trim()))
                .map((role) => role.trim().toLowerCase());

            const merged = Array.from(new Set(['agent', 'sales', 'delivery', 'admin', 'mesero', 'cocinero', 'bartender', 'caja', 'capitan_meseros', ...dbRoles, ...workRoles.map((role) => role.trim().toLowerCase())]));
            const sorted = merged.filter((role) => role && role.trim().length > 0).sort((a, b) => a.localeCompare(b));
            setWorkRoles(sorted);
            localStorage.setItem(`erp_work_roles_${clientId}`, JSON.stringify(sorted));
        }
    }, [employees, clientId]);

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





    const generateEmployeeCode = () => {
        let maxNum = 0;
        (employees || []).forEach((emp: any) => {
            const code = String(emp.employee_code || '').trim().toUpperCase();
            const match = code.match(/EMP-(\d+)/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : (employees || []).length + 1;
        return `EMP-${String(nextNum).padStart(3, '0')}`;
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalized = roleName.trim();
        if (!normalized) {
            setErrorMsg('Escribe un nombre para el nuevo rol.');
            return;
        }

        try {
            const res = await fetch(`/api/clients/${clientId}/employee-roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: normalized })
            });
            const json = await res.json();
            if (json.success) {
                setRoleName('');
                setIsRoleOpen(false);
                setErrorMsg('');
                fetchData();
            } else {
                setErrorMsg(json.error || 'No se pudo crear el rol.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión al crear el rol.');
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
            const finalEmployeeCode = empCode.trim() || generateEmployeeCode();
            const normalizedRole = empRole.trim();
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
                    role: normalizedRole,
                    department_id: empDeptId || null,
                    pin: empPin,
                    employee_code: finalEmployeeCode,
                    is_active: true
                })
            });
            const json = await res.json();
            if (json.success) {
                setIsEmpOpen(false);
                fetchData();
            } else {
                setErrorMsg(translateErrorMessage(json.error, 'Error al guardar empleado.'));
            }
        } catch (err: any) {
            console.error("Error creating/editing employee:", err);
            setErrorMsg(translateErrorMessage(err.message, 'Error de red al guardar colaborador.'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEmp = async (id: string, name: string) => {
        if (!window.confirm(`¿Deseas eliminar permanentemente al colaborador ${name}?`)) return;
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
        setEmpCode(generateEmployeeCode());
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
        setEmpCode((emp as any).employee_code || generateEmployeeCode());
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

    const [empDeliveries, setEmpDeliveries] = useState<any[]>([]);
    const [loadingEmpDeliveries, setLoadingEmpDeliveries] = useState(false);

    const loadEmpDeliveries = async (empId: string) => {
        try {
            setLoadingEmpDeliveries(true);
            const res = await fetch(`/api/clients/${clientId}/employees/${empId}/deliveries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setEmpDeliveries(json.deliveries || []);
            }
        } catch (err) {
            console.error("Error cargando entregas:", err);
        } finally {
            setLoadingEmpDeliveries(false);
        }
    };

    const handleSeedDeliveriesTest = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/deliveries/seed-test`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                alert('🎉 ¡6 Facturas de Domicilio de prueba creadas con éxito para Speedie Gonzalez y ordenadas por cercanía!');
                if (selectedEmpDetail) {
                    loadEmpDeliveries(selectedEmpDetail.id);
                }
                fetchData();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error generando entregas de prueba.');
        }
    };

    const handleOpenDetail = (emp: Employee) => {
        setSelectedEmpDetail(emp);
        loadShifts(emp.id);
        loadTasks(emp.id);
        loadEmpDeliveries(emp.id);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setNewTaskCreator(localStorage.getItem('session_name') || '');
        setDetailTab('info');
        
        setContrHireDate(emp.hire_date ? emp.hire_date.split('T')[0] : '');
        const rawSalary = emp.basic_salary ? Math.round(parseFloat(emp.basic_salary.toString())).toString() : '';
        const rawAllowance = (emp as any).transport_allowance ? Math.round(parseFloat((emp as any).transport_allowance.toString())).toString() : '';
        setContrBasicSalary(rawSalary === '0' ? '' : rawSalary);
        setContrTransportAllowance(rawAllowance === '0' ? '' : rawAllowance);
        setContrPaymentType(emp.payment_type || 'fixed');
        setContrPayPeriod(emp.pay_period || 'mensual');
        setContrCutoffDays(emp.cutoff_days || '15,30');
        setContrPayDays(emp.pay_days || '15,30');
        setContrVacations(emp.vacation_days_accumulated?.toString() || '0');
        setContrEmpStatus(emp.employment_status || 'linked');
        setContrContractType((emp as any).contract_type || 'indefinido');
        setContrActStatus(emp.activity_status || 'active');
        setContrPaymentMethod(emp.payment_method || 'cash');
        setContrBankName(emp.bank_name || '');
        setContrBankAccount(emp.bank_account_number || '');

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

    const renderAdvancesPanel = () => {
        return (
            <div className="space-y-6 text-left">
                <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6">
                    <h3 className="font-bold text-sm text-on-surface mb-4">Gestión de Anticipos y Adelantos de Nómina</h3>
                    {loadingAdvances ? (
                        <div className="text-center py-12 text-xs text-on-surface-variant animate-pulse">Cargando anticipos...</div>
                    ) : allAdvances.length === 0 ? (
                        <div className="text-center py-12 text-xs text-on-surface-variant italic">No hay solicitudes de anticipo registradas.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {allAdvances.map(adv => (
                                <div key={adv.id} className="glass-card p-4 rounded-xl border border-outline/5 space-y-3 text-xs flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-on-surface text-sm">{adv.employee_name} {adv.employee_last_name || ''}</h4>
                                                <p className="text-[10px] text-on-surface-variant font-mono capitalize">{adv.employee_role}</p>
                                            </div>
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

                                        <div className="p-3 bg-surface-container/20 border border-outline/5 rounded-lg space-y-1">
                                            <div className="flex justify-between font-mono font-bold text-on-surface">
                                                <span>Monto:</span>
                                                <span>${Number(adv.amount).toLocaleString('es-CO')}</span>
                                            </div>
                                            <p className="text-[10px] text-on-surface-variant">Requerido: {new Date(adv.requested_date).toLocaleDateString('es-CO')}</p>
                                            {adv.notes && (
                                                <p className="text-[10px] text-on-surface-variant italic">"{adv.notes}"</p>
                                            )}
                                        </div>

                                        {adv.admin_notes && (
                                            <div className="text-[10px] text-on-surface-variant bg-blue-500/5 p-2 rounded border border-blue-500/10">
                                                <strong>Mensaje Admin:</strong> "{adv.admin_notes}"
                                            </div>
                                        )}

                                        {adv.status === 'delivered' && (
                                            <div className="text-[10px] text-on-surface-variant font-mono space-y-0.5 pt-1.5 border-t border-outline/5">
                                                <p>Método: <span className="capitalize">{adv.payment_method === 'cash' ? 'Efectivo' : `Transferencia (${adv.bank_name || 'N/A'})`}</span></p>
                                                {adv.delivered_at && <p>Fecha Entrega: {new Date(adv.delivered_at).toLocaleDateString('es-CO')}</p>}
                                                <div className="pt-2 border-t border-outline/5 flex justify-between text-[9px]">
                                                    <span>Recibo Admin: {adv.confirmed_by_admin ? '✅ Firmado' : '❌ Pendiente'}</span>
                                                    <span>Recibo Empleado: {adv.confirmed_by_employee ? '✅ Firmado' : '❌ Pendiente'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="pt-2 border-t border-outline/5 flex flex-wrap gap-2">
                                        {adv.status === 'pending' && (
                                            <>
                                                <button 
                                                    onClick={() => {
                                                        setProcessingAdv(adv);
                                                        setAdvActionType('approve');
                                                        setAdminNotes('');
                                                    }}
                                                    className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold rounded-lg border-0 transition cursor-pointer text-[10px]"
                                                >
                                                    Aprobar (En Proceso)
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setProcessingAdv(adv);
                                                        setAdvActionType('reject');
                                                        setAdminNotes('');
                                                    }}
                                                    className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-lg border-0 transition cursor-pointer text-[10px]"
                                                >
                                                    Rechazar
                                                </button>
                                            </>
                                        )}

                                        {adv.status === 'in_process' && (
                                            <button 
                                                onClick={() => {
                                                    setProcessingAdv(adv);
                                                    setAdvActionType('deliver');
                                                    setAdminNotes(adv.admin_notes || '');
                                                    setDeliveryMethod('cash');
                                                    setDeliveryBank('');
                                                }}
                                                className="w-full py-1.5 bg-green-500 text-white font-bold rounded-lg border-0 transition cursor-pointer text-[10px] uppercase tracking-wider hover:opacity-90"
                                            >
                                                Registrar Entrega / Desembolso
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal de Procesamiento de Anticipo */}
                {processingAdv && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <form onSubmit={handleProcessAdvance} className="bg-surface border border-outline/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
                            <h3 className="font-bold text-sm text-on-surface">
                                {advActionType === 'approve' && 'Aprobar Anticipo'}
                                {advActionType === 'reject' && 'Rechazar Anticipo'}
                                {advActionType === 'deliver' && 'Registrar Desembolso de Anticipo'}
                            </h3>
                            <p className="text-xs text-on-surface-variant">
                                Colaborador: <strong>{processingAdv.employee_name} {processingAdv.employee_last_name}</strong> | Monto: <strong>${Number(processingAdv.amount).toLocaleString('es-CO')}</strong>
                            </p>

                            <div className="space-y-3">
                                {advActionType === 'deliver' && (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-on-surface-variant font-medium">Método de Desembolso *</label>
                                            <select 
                                                value={deliveryMethod}
                                                onChange={(e: any) => setDeliveryMethod(e.target.value)}
                                                className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none cursor-pointer"
                                            >
                                                <option value="cash">Efectivo</option>
                                                <option value="transfer">Transferencia Bancaria / App</option>
                                            </select>
                                        </div>

                                        {deliveryMethod === 'transfer' && (
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-on-surface-variant font-medium">Banco / Canal (Nequi, Daviplata, Bancolombia, etc) *</label>
                                                <input 
                                                    type="text"
                                                    required
                                                    value={deliveryBank}
                                                    onChange={(e) => setDeliveryBank(e.target.value)}
                                                    placeholder="Ej: Nequi"
                                                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-on-surface-variant font-medium">
                                        {advActionType === 'approve' && 'Mensaje para el trabajador (ej: "puedes retirar en la tarde")'}
                                        {advActionType === 'reject' && 'Motivo del Rechazo'}
                                        {advActionType === 'deliver' && 'Notas de la transacción'}
                                    </label>
                                    <textarea 
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Escribe comentarios..."
                                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none h-20 resize-none w-full"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setProcessingAdv(null)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface rounded-xl hover:bg-surface-container text-xs cursor-pointer bg-transparent"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold cursor-pointer border-0 hover:opacity-90 transition shadow"
                                >
                                    Confirmar Acción
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        );
    };

    const filteredHrDocs = hrDocs.filter((doc: any) => {
        if (docFilterQuery) {
            const query = docFilterQuery.toLowerCase();
            const nameMatch = doc.employee_name?.toLowerCase().includes(query);
            const phoneMatch = doc.employee_phone?.toLowerCase().includes(query);
            const codeMatch = doc.employee_code?.toLowerCase().includes(query);
            if (!nameMatch && !phoneMatch && !codeMatch) return false;
        }
        if (docFilterMonth) {
            if (!doc.start_date) return false;
            const month = doc.start_date.split('-')[1];
            if (month !== docFilterMonth) return false;
        }
        if (docFilterYear) {
            if (!doc.start_date) return false;
            const year = doc.start_date.split('-')[0];
            if (year !== docFilterYear) return false;
        }
        return true;
    });

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
                                onClick={() => { setErrorMsg(''); setRoleName(''); setIsRoleOpen(true); }}
                                className="px-4 py-2 border border-outline/20 hover:bg-surface-variant/20 text-on-surface text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[16px]">badge</span>
                                Roles
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

            <div className="flex border-b border-outline/10 gap-6 mb-4">
                        <button
                            onClick={() => setActiveView('list')}
                            className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${
                                activeView === 'list' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
                            }`}
                        >
                            Colaboradores & Nómina
                            {activeView === 'list' && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setActiveView('shifts');
                                setSelectedEmpForShifts(null);
                            }}
                            className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${
                                activeView === 'shifts' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
                            }`}
                        >
                            Monitoreo de Turnos
                            {activeView === 'shifts' && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setActiveView('advances');
                                fetchAllAdvances();
                            }}
                            className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${
                                activeView === 'advances' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
                            }`}
                        >
                            Solicitudes de Anticipos
                            {activeView === 'advances' && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                            )}
                        </button>
                    </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : activeView === 'advances' ? (
                renderAdvancesPanel()
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
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAdminDocOpen(true)}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-[10px] font-bold rounded-lg cursor-pointer transition shadow border-0 flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">add_circle</span>
                            Registrar Ausencia / Permiso
                        </button>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-bold">
                            {hrDocs.filter(d => d.status === 'pending').length} Pendientes
                        </span>
                    </div>
                </div>

                {/* Filtros de Solicitudes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white/5 p-3 rounded-xl border border-outline/5 mb-4 text-xs">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Buscar Colaborador</label>
                        <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/60 text-[16px]">search</span>
                            <input 
                                type="text"
                                placeholder="Nombre, celular o No. de empleado..."
                                value={docFilterQuery}
                                onChange={(e) => setDocFilterQuery(e.target.value)}
                                className="w-full bg-surface-container-high/40 border border-outline/10 pl-9 pr-3 py-2 rounded-xl text-on-surface outline-none focus:border-primary text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Mes</label>
                        <select
                            value={docFilterMonth}
                            onChange={(e) => setDocFilterMonth(e.target.value)}
                            className="w-full bg-surface-container-high/40 border border-outline/10 p-2 rounded-xl text-on-surface outline-none cursor-pointer text-xs"
                        >
                            <option value="">-- Todos los Meses --</option>
                            <option value="01">Enero</option>
                            <option value="02">Febrero</option>
                            <option value="03">Marzo</option>
                            <option value="04">Abril</option>
                            <option value="05">Mayo</option>
                            <option value="06">Junio</option>
                            <option value="07">Julio</option>
                            <option value="08">Agosto</option>
                            <option value="09">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Año</label>
                        <select
                            value={docFilterYear}
                            onChange={(e) => setDocFilterYear(e.target.value)}
                            className="w-full bg-surface-container-high/40 border border-outline/10 p-2 rounded-xl text-on-surface outline-none cursor-pointer text-xs"
                        >
                            <option value="">-- Todos los Años --</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                        </select>
                    </div>
                </div>

                {hrDocsLoading ? (
                    <div className="flex justify-center py-6">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : hrDocs.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/60 py-6 text-center italic">No hay solicitudes pendientes o registradas en el sistema.</p>
                ) : filteredHrDocs.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/60 py-6 text-center italic">No se encontraron solicitudes que coincidan con los filtros.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredHrDocs.map((doc: any) => (
                            <div key={doc.id} className="p-4 bg-surface-container/20 border border-outline/10 rounded-xl space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-bold text-xs text-on-surface block">{doc.employee_name}</span>
                                        <span className="text-[9px] text-on-surface-variant font-mono">+{doc.employee_phone}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                        doc.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                        doc.status === 'negotiating' ? 'bg-purple-500/10 text-purple-500' :
                                        doc.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                        {doc.status === 'negotiating' ? 'En Negociación' : doc.status}
                                    </span>
                                </div>

                                <div className="text-xs space-y-1.5">
                                    <div className="flex justify-between text-[10px] text-on-surface-variant">
                                        <span>Tipo: <strong className="text-primary capitalize">{doc.doc_type.replace('_', ' ')}</strong></span>
                                        <span>Depto: <strong>{doc.department_name || 'Sin asignar'}</strong></span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-on-surface-variant">
                                        <span>Rango: <strong>{formatDateOnly(doc.start_date)}{doc.end_date ? ` al ${formatDateOnly(doc.end_date)}` : ''}{doc.return_date ? ` (Regresa: ${formatDateOnly(doc.return_date)})` : ''}</strong></span>
                                    </div>
                                    <p className="text-on-surface-variant font-medium bg-white/5 p-2 rounded-lg italic">"{doc.notes || doc.reason}"</p>
                                    {doc.admin_notes && (
                                        <div className="bg-surface-container-high/40 p-2 rounded-lg border border-outline/5 text-[10px] text-on-surface">
                                            <span className="font-bold text-primary block mb-0.5">Respuesta de Gestión Humana:</span>
                                            {doc.admin_notes}
                                        </div>
                                    )}
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

                                {(() => {
                                    const overlaps = checkOverlap(doc);
                                    if (overlaps) {
                                        return (
                                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] p-2.5 rounded-xl font-medium mt-2 flex items-start gap-1.5 animate-pulse">
                                                <span className="material-symbols-outlined text-[14px] mt-0.5">warning</span>
                                                <div>
                                                    <strong>Traslape de Fechas:</strong> Coincide con vacaciones/permisos de: {overlaps} ({doc.department_name || 'mismo departamento'})
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {(doc.status === 'pending' || doc.status === 'negotiating') && (
                                    <div className="flex gap-2 justify-end pt-2 border-t border-outline/5">
                                        <button 
                                            onClick={() => handleUpdateDocStatus(doc.id, 'rejected')}
                                            className="px-2.5 py-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/5 text-[10px] font-bold rounded-lg cursor-pointer transition bg-transparent"
                                        >
                                            Rechazar
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateDocStatus(doc.id, 'negotiating')}
                                            className="px-2.5 py-1.5 border border-purple-500/30 text-purple-500 hover:bg-purple-500/5 text-[10px] font-bold rounded-lg cursor-pointer transition bg-transparent"
                                        >
                                            Negociar
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateDocStatus(doc.id, 'approved')}
                                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition border-0"
                                        >
                                            Aprobar
                                        </button>
                                    </div>
                                )}

                                {doc.status !== 'pending' && doc.status !== 'negotiating' && (
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
            {isDeptOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
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
                                className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl cursor-pointer transition border-0"
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
                                            className="p-1 text-red-500 hover:bg-red-500/10 border-0 rounded cursor-pointer transition-all inline-flex bg-transparent"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ROLES MANAGER MODAL */}
            {isRoleOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Gestionar Roles</h3>
                            <button 
                                onClick={() => setIsRoleOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateRole} className="flex gap-2 mb-4">
                            <input 
                                type="text"
                                required
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                className="flex-grow bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface text-xs focus:border-primary outline-none"
                                placeholder="Ej: Auxiliar de ventas..."
                            />
                            <button 
                                type="submit"
                                className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl cursor-pointer transition border-0"
                            >
                                Agregar
                            </button>
                        </form>

                        <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                            <h4 className="text-xs font-bold text-on-surface-variant mb-2">Roles Disponibles</h4>
                            {workRoles.map((role) => (
                                <div key={role} className="flex justify-between items-center bg-surface-container/30 border border-outline/5 p-3 rounded-xl">
                                    <span className="text-xs font-bold capitalize">{role}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setWorkRoles((prev) => prev.filter((item) => item !== role))}
                                        className="p-1 text-red-500 hover:bg-red-500/10 border-0 rounded cursor-pointer transition-all inline-flex bg-transparent"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* REGISTER ABSENCE/PERMIT MODAL */}
            {isAdminDocOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Registrar Ausencia o Permiso</h3>
                            <button 
                                onClick={() => setIsAdminDocOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateAdminDoc} className="space-y-4 text-xs text-left">
                            <div className="space-y-1">
                                <label className="font-bold text-[10px] text-on-surface-variant uppercase">Colaborador</label>
                                <select
                                    value={adminDocEmpId}
                                    onChange={(e) => setAdminDocEmpId(e.target.value)}
                                    required
                                    className="w-full bg-surface-container border border-outline/10 p-2.5 rounded-xl text-xs text-on-surface outline-none cursor-pointer"
                                >
                                    <option value="">-- Seleccionar Empleado --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} {emp.last_name || ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-bold text-[10px] text-on-surface-variant uppercase">Tipo de Registro</label>
                                    <select
                                        value={adminDocType}
                                        onChange={(e) => setAdminDocType(e.target.value as any)}
                                        className="w-full bg-surface-container border border-outline/10 p-2.5 rounded-xl text-xs text-on-surface outline-none cursor-pointer"
                                    >
                                        <option value="permiso">Permiso / Licencia</option>
                                        <option value="vacaciones">Vacaciones</option>
                                        <option value="incapacidad">Incapacidad Médica</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-[10px] text-on-surface-variant uppercase">Estado Inicial</label>
                                    <select
                                        value={adminDocStatus}
                                        onChange={(e) => setAdminDocStatus(e.target.value as any)}
                                        className="w-full bg-surface-container border border-outline/10 p-2.5 rounded-xl text-xs text-on-surface outline-none cursor-pointer"
                                    >
                                        <option value="approved">Aprobado inmediatamente</option>
                                        <option value="pending">Pendiente</option>
                                        <option value="negotiating">En Negociación</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <label className="font-bold text-[10px] text-on-surface-variant uppercase">Fecha Inicio</label>
                                    <input 
                                        type="date"
                                        required
                                        value={adminDocStartDate}
                                        onChange={(e) => setAdminDocStartDate(e.target.value)}
                                        onClick={(e) => {
                                            try {
                                                (e.target as any).showPicker();
                                            } catch (err) {}
                                        }}
                                        className="w-full bg-surface-container border border-outline/10 p-2 rounded-xl text-on-surface outline-none text-xs cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-bold text-[10px] text-on-surface-variant uppercase">Último Día</label>
                                    <input 
                                        type="date"
                                        required
                                        value={adminDocEndDate}
                                        onChange={(e) => setAdminDocEndDate(e.target.value)}
                                        onClick={(e) => {
                                            try {
                                                (e.target as any).showPicker();
                                            } catch (err) {}
                                        }}
                                        className="w-full bg-surface-container border border-outline/10 p-2 rounded-xl text-on-surface outline-none text-xs cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-bold text-[10px] text-on-surface-variant uppercase">Regreso a Labores</label>
                                    <input 
                                        type="date"
                                        required
                                        value={adminDocReturnDate}
                                        onChange={(e) => setAdminDocReturnDate(e.target.value)}
                                        onClick={(e) => {
                                            try {
                                                (e.target as any).showPicker();
                                            } catch (err) {}
                                        }}
                                        className="w-full bg-surface-container border border-outline/10 p-2 rounded-xl text-on-surface outline-none text-xs cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-[10px] text-on-surface-variant uppercase">Justificación / Motivo</label>
                                <textarea
                                    value={adminDocNotes}
                                    onChange={(e) => setAdminDocNotes(e.target.value)}
                                    placeholder="Detalla el motivo de la ausencia, licencia o incapacidad..."
                                    required
                                    className="w-full bg-surface-container border border-outline/10 p-2.5 rounded-xl text-xs text-on-surface outline-none h-20 resize-none animate-pulse-once"
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-2 border-t border-outline/5">
                                <button 
                                    type="button"
                                    onClick={() => setIsAdminDocOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface-variant hover:bg-surface-variant/20 text-xs font-bold rounded-lg cursor-pointer transition bg-transparent"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg cursor-pointer transition border-0 shadow"
                                >
                                    {actionLoading ? 'Registrando...' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* CREATE/EDIT EMPLOYEE MODAL */}
            {isEmpOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="glass-card max-w-lg w-full rounded-3xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
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

                            <div className="space-y-3 pt-2 border-t border-outline/10">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-on-surface-variant">Módulos permitidos en el ERP</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {MODULES.map((module) => {
                                            const active = employeeAccessPermissions.includes(module.key);
                                            return (
                                                <button
                                                    key={module.key}
                                                    type="button"
                                                    onClick={() => setEmployeeAccessPermissions(prev => prev.includes(module.key) ? prev.filter(item => item !== module.key) : [...prev, module.key])}
                                                    className={`px-2 py-2 rounded-lg border text-[10px] font-bold transition ${
                                                        active ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-surface-container-high/40 border-outline/15 text-on-surface-variant hover:border-outline/30'
                                                    }`}
                                                >
                                                    {module.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Cargo o Rol de Trabajo</label>
                                <select 
                                    value={empRole}
                                    onChange={(e) => setEmpRole(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                >
                                    {workRoles.map((role) => (
                                        <option key={role} value={role}>
                                            {role === 'agent' ? 'Asesor de Atención / Agente' :
                                             role === 'sales' ? 'Vendedor / Comercial' :
                                             role === 'delivery' ? 'Puerta a Puerta / Domiciliario' :
                                             role === 'admin' ? 'Administrador del Inquilino' :
                                             role === 'mesero' ? '🍽️ Mesero / Comandero Móvil' :
                                             role === 'cocinero' ? '👨‍🍳 Cocinero / Chef (Pantalla Cocina KDS)' :
                                             role === 'bartender' ? '🍹 Bartender (Pantalla Barra KDS)' :
                                             role === 'caja' ? '💵 Cajero / Caja Central' :
                                             role === 'capitan_meseros' ? '🤵 Capitán de Meseros' :
                                             role.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                                        </option>
                                    ))}
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

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">PIN de Seguridad (6 dígitos)</label>
                                    <input 
                                        type="password"
                                        maxLength={6}
                                        required
                                        value={empPin}
                                        onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono tracking-widest text-center text-lg"
                                        placeholder="Ej: 123456"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Código / No. Empleado</label>
                                    <input 
                                        type="text"
                                        readOnly
                                        value={empCode}
                                        onChange={(e) => setEmpCode(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono text-center text-lg font-bold opacity-90"
                                        placeholder="Ej: EMP-001"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-outline/10">
                                <button 
                                    type="button"
                                    onClick={() => setIsEmpOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer text-xs transition bg-transparent"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer text-xs transition flex items-center gap-1.5 border-0"
                                >
                                    {actionLoading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* PAYROLL SUMMARY MODAL */}
            {isPayrollOpen && selectedEmp && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="glass-card max-w-2xl w-full rounded-3xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
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
                                            <span>Sueldo de Horas Ordinarias</span>
                                            <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.base_payment)} COP</span>
                                        </div>
                                        {payrollSummary.transport_allowance > 0 && (
                                            <div className="flex justify-between py-1 border-t border-white/5">
                                                <span>Auxilio de Transporte de Ley</span>
                                                <span className="font-mono text-primary">+${new Intl.NumberFormat('es-CO').format(payrollSummary.transport_allowance)} COP</span>
                                            </div>
                                        )}
                                        {payrollSummary.extra_hours_surcharge > 0 && (
                                            <div className="flex justify-between py-1 border-t border-white/5">
                                                <span>Horas Extras Diurnas (+25%)</span>
                                                <span className="font-mono text-primary">+${new Intl.NumberFormat('es-CO').format(payrollSummary.extra_hours_surcharge)} COP</span>
                                            </div>
                                        )}
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
                                        {payrollSummary.deductions.advances > 0 && (
                                            <div className="flex justify-between py-1 border-t border-white/5">
                                                <span>Deducción por Anticipos Recibidos</span>
                                                <span className="font-mono text-red-500">-${new Intl.NumberFormat('es-CO').format(payrollSummary.deductions.advances)} COP</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between py-1.5 border-t border-white/5 font-bold text-sm text-on-surface">
                                            <span>Total Deducciones</span>
                                            <span className="font-mono text-red-500">-${new Intl.NumberFormat('es-CO').format(payrollSummary.total_deductions)} COP</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Provisions and Employer taxes */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-on-surface border-b border-outline/5 pb-1">4. Costos Adicionales de Empresa (Seguridad Social &amp; Parafiscales &amp; Provisiones)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-3 rounded-xl border border-outline/5 space-y-1.5">
                                            <p className="font-bold text-[10px] text-on-surface-variant uppercase mb-1">Seguridad Social &amp; Parafiscales</p>
                                            <div className="flex justify-between py-0.5 text-[10px]">
                                                <span>Pensión (12%)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.pension)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>Salud (8.5%)</span>
                                                <span className="font-mono">
                                                    {payrollSummary.employer_contributions.exonerated_health_sena ? <span className="text-green-500 font-bold">Exonerado (Art. 114-1 ET)</span> : `$${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.health)}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>ARL ({payrollSummary.employer_contributions.arl_percentage?.toFixed(3)}%)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.arl)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>Caja Compensación (4%)</span>
                                                <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.caja_compensacion)}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>SENA (2%)</span>
                                                <span className="font-mono">
                                                    {payrollSummary.employer_contributions.exonerated_health_sena ? <span className="text-green-500 font-bold">Exonerado</span> : `$${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.sena)}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                <span>ICBF (3%)</span>
                                                <span className="font-mono">
                                                    {payrollSummary.employer_contributions.exonerated_health_sena ? <span className="text-green-500 font-bold">Exonerado</span> : `$${new Intl.NumberFormat('es-CO').format(payrollSummary.employer_contributions.icbf)}`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-3 rounded-xl border border-outline/5 space-y-1.5 flex flex-col justify-between">
                                            <div>
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
                                                    <span>Int. Cesantías (12% Cesantías)</span>
                                                    <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.provisions.intereses_cesantias)}</span>
                                                </div>
                                                <div className="flex justify-between py-0.5 text-[10px] border-t border-white/5">
                                                    <span>Vacaciones (4.17%)</span>
                                                    <span className="font-mono">${new Intl.NumberFormat('es-CO').format(payrollSummary.provisions.vacaciones)}</span>
                                                </div>
                                            </div>
                                            <div className="border-t border-outline/10 pt-2 text-[10px] text-on-surface-variant/80">
                                                <p className="flex justify-between font-bold">
                                                    <span>Total Costo Empresa:</span>
                                                    <span className="font-mono text-primary">${new Intl.NumberFormat('es-CO').format(payrollSummary.totalEmployerCost)}</span>
                                                </p>
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
                </div>,
                document.body
            )}

            {/* EMP DETAIL MODAL */}
            {isDetailOpen && selectedEmpDetail && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="glass-card max-w-2xl w-full rounded-3xl overflow-hidden p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto flex flex-col">
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
                        <div className="flex bg-surface-container/50 p-1 rounded-xl border border-outline/10 text-[10px] mb-4 gap-1">
                            <button 
                                type="button"
                                onClick={() => setDetailTab('info')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'info' ? 'bg-primary text-white font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Información General
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDetailTab('shifts')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'shifts' ? 'bg-primary text-white font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Asistencia
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDetailTab('tasks')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'tasks' ? 'bg-primary text-white font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Tareas ({empTasks.length})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDetailTab('deliveries')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'deliveries' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400/80 hover:text-emerald-400'}`}
                            >
                                🚚 Mis Entregas ({empDeliveries.length})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDetailTab('contrato')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'contrato' ? 'bg-primary text-white font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Nómina & Contrato
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDetailTab('permisos')}
                                className={`flex-1 py-2 rounded-lg font-bold cursor-pointer transition ${detailTab === 'permisos' ? 'bg-primary text-white font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Permisos & Licencias
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
                                            <div className="flex items-center gap-2">
                                                <strong className="text-on-surface font-mono text-sm tracking-widest bg-surface-container-high/40 px-2.5 py-1 rounded-lg border border-outline/10 text-on-surface-variant">
                                                    ••••••
                                                </strong>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newPin = window.prompt('Escribe el nuevo PIN de 4 a 6 dígitos para este colaborador (se guardará de forma segura):');
                                                        if (newPin && newPin.trim()) {
                                                            if (!/^\d{4,6}$/.test(newPin.trim())) {
                                                                alert('El PIN debe contener únicamente entre 4 y 6 números.');
                                                                return;
                                                            }
                                                            setSelectedEmpDetail((prev: any) => prev ? { ...prev, pin: newPin.trim() } : null);
                                                            fetch(`/api/clients/${clientId}/employees/${selectedEmpDetail.id}`, {
                                                                method: 'PUT',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'Authorization': `Bearer ${token}`
                                                                },
                                                                body: JSON.stringify({
                                                                    name: selectedEmpDetail.name,
                                                                    phone: selectedEmpDetail.phone,
                                                                    role: selectedEmpDetail.role,
                                                                    pin: newPin.trim()
                                                                })
                                                            }).then(res => res.json()).then(data => {
                                                                if (data.success) {
                                                                    alert('🔐 ¡PIN restablecido con éxito!');
                                                                    fetchData();
                                                                } else {
                                                                    alert(`Error: ${data.error}`);
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition px-2.5 py-1 rounded-lg font-semibold cursor-pointer border border-primary/20 flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                                                    Restablecer PIN
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-on-surface-variant block mb-1">Código de Empleado:</span>
                                            <strong className="text-on-surface font-mono text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
                                                {(selectedEmpDetail as any).employee_code || `EMP-${String(employees.findIndex(e => e.id === selectedEmpDetail.id) + 1 || 1).padStart(3, '0')}`}
                                            </strong>
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

                            {detailTab === 'deliveries' && (
                                <div className="space-y-4 text-xs text-left">
                                    <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                        <div>
                                            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                                                Mis Entregas del Día (Ruta de Domicilios por Cercanía)
                                            </h4>
                                            <p className="text-[11px] text-on-surface-variant mt-0.5">
                                                Ruta asignada organizada automáticamente por proximidad y valores a cobrar.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSeedDeliveriesTest}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-md"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">science</span>
                                            Generar 6 Entregas de Prueba
                                        </button>
                                    </div>

                                    {loadingEmpDeliveries ? (
                                        <p className="text-xs text-on-surface-variant italic py-6 text-center animate-pulse">Cargando ruta de domicilios para hoy...</p>
                                    ) : empDeliveries.length === 0 ? (
                                        <div className="text-center py-8 bg-surface-container/20 border border-outline/10 rounded-2xl space-y-3">
                                            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-50">local_shipping</span>
                                            <p className="text-xs text-on-surface-variant font-medium">No se registran entregas asignadas para hoy.</p>
                                            <button
                                                type="button"
                                                onClick={handleSeedDeliveriesTest}
                                                className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                                            >
                                                🧪 Generar 6 Entregas de Prueba para Speedie
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                                            {empDeliveries.map((del: any, idx: number) => (
                                                <div key={del.invoice_id} className="bg-surface-container/40 border border-outline/15 p-4 rounded-2xl space-y-3 hover:border-emerald-500/30 transition">
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
                                                            <span className="text-on-surface-variant block font-medium">Cliente / Recibe:</span>
                                                            <strong className="text-on-surface font-semibold">{del.customer_name}</strong>
                                                            <p className="text-on-surface-variant font-mono text-[11px]">📞 +{del.customer_phone}</p>
                                                        </div>

                                                        <div className="space-y-0.5">
                                                            <span className="text-on-surface-variant block font-medium">Dirección de Entrega:</span>
                                                            <strong className="text-emerald-400 font-medium">{del.delivery_address}</strong>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline/10 text-xs">
                                                        <div>
                                                            <span className="text-on-surface-variant text-[11px]">Monto a Recibir: </span>
                                                            <strong className={`font-bold font-mono text-sm ${del.payment_status === 'paid' ? 'text-green-400' : 'text-amber-400'}`}>
                                                                ${del.total_amount.toLocaleString('es-CO')} COP
                                                            </strong>
                                                            <span className="text-[10px] text-on-surface-variant ml-1 font-mono uppercase">
                                                                ({del.payment_method === 'efectivo' ? '💵 Efectivo Contra-Entrega' : '🏦 Pagado por Nequi/Banco'})
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-1.5">
                                                            <a
                                                                href={`https://maps.google.com/?q=${encodeURIComponent(del.delivery_address)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="bg-surface-container-high hover:bg-surface-container text-on-surface font-semibold text-[10px] px-2.5 py-1.5 rounded-lg border border-outline/20 transition flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">map</span>
                                                                Abrir Mapa
                                                            </a>
                                                            <a
                                                                href={`https://wa.me/${del.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${del.customer_name}, soy Speedie Gonzalez tu domiciliario. Estoy en camino a la dirección ${del.delivery_address} con tu pedido de la Factura #${del.invoice_number}.`)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="bg-green-600 hover:bg-green-500 text-white font-semibold text-[10px] px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">chat</span>
                                                                WhatsApp
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {del.notes && (
                                                        <p className="text-[10px] text-on-surface-variant/80 bg-surface-container-high/40 p-2 rounded-lg italic">
                                                            💡 Nota del Despacho: {del.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {detailTab === 'contrato' && (
                                <form onSubmit={handleSaveContractInfo} className="space-y-4 text-xs text-left">
                                    <div className="bg-white/5 p-4 rounded-xl border border-outline/5 space-y-4">
                                        <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Condiciones Contractuales</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Fecha de Contratación</label>
                                                <div className="flex gap-1.5 items-center">
                                                    <input 
                                                        type="date" 
                                                        id="hire-date-input"
                                                        value={contrHireDate} 
                                                        onChange={(e) => setContrHireDate(e.target.value)}
                                                        onClick={(e) => {
                                                            try {
                                                                (e.target as any).showPicker();
                                                            } catch (err) {}
                                                        }}
                                                        className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none flex-grow cursor-pointer"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            try {
                                                                const el = document.getElementById('hire-date-input');
                                                                if (el) (el as any).showPicker();
                                                            } catch (err) {}
                                                        }}
                                                        className="px-2 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl text-[10px] font-bold cursor-pointer transition whitespace-nowrap"
                                                    >
                                                        Seleccionar
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Días Vacaciones Acumulados (Ley Colombiana)</label>
                                                <input 
                                                    type="text" 
                                                    readOnly
                                                    disabled
                                                    value={contrVacations} 
                                                    className="bg-surface-container/50 border border-outline/20 rounded-xl p-2 text-xs text-on-surface-variant/80 outline-none cursor-not-allowed font-medium"
                                                    title="Cálculo automático: (Días laborados * 15) / 360 - Días de vacaciones ya tomados y aprobados"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1 col-span-2">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Tipo de Contrato</label>
                                                <select 
                                                    value={contrContractType} 
                                                    onChange={(e: any) => setContrContractType(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="indefinido">Término Indefinido</option>
                                                    <option value="fijo">Término Fijo</option>
                                                    <option value="obra_labor">Obra o Labor</option>
                                                    <option value="servicios">Prestación de Servicios</option>
                                                    <option value="aprendizaje">Aprendizaje (SENA)</option>
                                                </select>
                                                <span className="text-[9px] text-on-surface-variant/70 italic mt-0.5">
                                                    * Nota: Prestación de Servicios no aplica provisiones ni aux. transporte. Aprendizaje solo aplica Salud y ARL patronal.
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Estado Vinculación</label>
                                                <select 
                                                    value={contrEmpStatus} 
                                                    onChange={(e: any) => setContrEmpStatus(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="linked">Vinculado (Activo)</option>
                                                    <option value="unlinked">Desvinculado (Despedido/Retirado)</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Estado Actividad</label>
                                                <select 
                                                    value={contrActStatus} 
                                                    onChange={(e: any) => setContrActStatus(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="active">Activo (Laborando)</option>
                                                    <option value="inactive">Inactivo (Vacaciones/Permiso/Incapacidad)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-4 rounded-xl border border-outline/5 space-y-4">
                                        <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Esquema de Pago y Salario</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Tipo de Salario</label>
                                                <select 
                                                    value={contrPaymentType} 
                                                    onChange={(e: any) => setContrPaymentType(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="fixed">Fijo Mensual</option>
                                                    <option value="hourly">Pago por Horas</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Periodicidad de Pago</label>
                                                <select 
                                                    value={contrPayPeriod} 
                                                    onChange={(e: any) => setContrPayPeriod(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="quincenal">Quincenal</option>
                                                    <option value="mensual">Mensual</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1 col-span-2">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Salario Base Mensual ($ COP)</label>
                                                <input 
                                                    type="number" 
                                                    value={contrBasicSalary} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setContrBasicSalary(val);
                                                    }}
                                                    onFocus={(e) => {
                                                        if (e.target.value === '0' || e.target.value === '0.00' || contrBasicSalary === '0' || contrBasicSalary === '0.00') {
                                                            setContrBasicSalary('');
                                                        }
                                                    }}
                                                    placeholder="Ej: 1750905"
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none w-full font-mono font-bold text-primary"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Auxilio de Transporte ($ COP)</label>
                                                <input 
                                                    type="number" 
                                                    value={contrTransportAllowance} 
                                                    onChange={(e) => setContrTransportAllowance(e.target.value)}
                                                    onFocus={(e) => {
                                                        if (e.target.value === '0' || e.target.value === '0.00' || contrTransportAllowance === '0' || contrTransportAllowance === '0.00') {
                                                            setContrTransportAllowance('');
                                                        }
                                                    }}
                                                    placeholder="Ej: 249095"
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none w-full font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Valor Hora (Fórmula de Ley)</label>
                                                <input 
                                                    type="text" 
                                                    readOnly 
                                                    value={contrBasicSalary ? `$${Number(parseFloat(contrBasicSalary) / 240).toLocaleString('es-CO', {maximumFractionDigits: 2})}` : '$0'}
                                                    className="bg-surface-container/40 border border-outline/10 text-on-surface-variant rounded-xl p-2 text-xs outline-none w-full font-mono cursor-not-allowed font-bold"
                                                />
                                                <span className="text-[9px] text-on-surface-variant/70 italic mt-0.5">Calculado: Salario / 240 Hrs</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Fechas de Corte (ej: 15,30)</label>
                                                <input 
                                                    type="text" 
                                                    value={contrCutoffDays} 
                                                    onChange={(e) => setContrCutoffDays(e.target.value)}
                                                    placeholder="Ej: 15,30"
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Fechas de Pago (ej: 15,30)</label>
                                                <input 
                                                    type="text" 
                                                    value={contrPayDays} 
                                                    onChange={(e) => setContrPayDays(e.target.value)}
                                                    placeholder="Ej: 15,30"
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-4 rounded-xl border border-outline/5 space-y-4">
                                        <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Medio de Recepción de Pago</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-medium">Medio</label>
                                                <select 
                                                    value={contrPaymentMethod} 
                                                    onChange={(e: any) => setContrPaymentMethod(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="cash">Efectivo</option>
                                                    <option value="transfer">Transferencia</option>
                                                </select>
                                            </div>
                                            {contrPaymentMethod === 'transfer' && (
                                                <>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-on-surface-variant font-medium">Banco / Canal</label>
                                                        <select 
                                                            value={contrBankName} 
                                                            onChange={(e) => setContrBankName(e.target.value)}
                                                            className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                                        >
                                                            <option value="">Seleccione Banco...</option>
                                                            <option value="Bancolombia">Bancolombia</option>
                                                            <option value="Nequi">Nequi</option>
                                                            <option value="Daviplata">Daviplata</option>
                                                            <option value="Davivienda">Davivienda</option>
                                                            <option value="Banco de Bogotá">Banco de Bogotá</option>
                                                            <option value="BBVA">BBVA</option>
                                                            <option value="Banco de Occidente">Banco de Occidente</option>
                                                            <option value="Banco Popular">Banco Popular</option>
                                                            <option value="Banco Caja Social">Banco Caja Social</option>
                                                            <option value="Banco Agrario">Banco Agrario</option>
                                                            <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                                                            <option value="Lulo Bank">Lulo Bank</option>
                                                            <option value="Nubank">Nubank</option>
                                                            <option value="RappiPay">RappiPay</option>
                                                            <option value="Banco Falabella">Banco Falabella</option>
                                                            <option value="GNB Sudameris">GNB Sudameris</option>
                                                            <option value="Banco Pichincha">Banco Pichincha</option>
                                                            <option value="Banco AV Villas">Banco AV Villas</option>
                                                            <option value="Coomeva">Coomeva</option>
                                                            <option value="Banco W">Banco W</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-on-surface-variant font-medium">Número Cuenta</label>
                                                        <input 
                                                            type="text" 
                                                            value={contrBankAccount} 
                                                            onChange={(e) => setContrBankAccount(e.target.value)}
                                                            placeholder="Ej: 3001234567"
                                                            className="bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none font-mono"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={savingContract}
                                        className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition cursor-pointer border-0 shadow"
                                    >
                                        {savingContract ? 'Guardando Contrato...' : 'Guardar Configuración de Nómina'}
                                    </button>
                                </form>
                            )}

                            {/* Tab 5: Permisos */}
                            {detailTab === 'permisos' && (
                                <div className="space-y-4 text-xs text-left">
                                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Historial de Permisos y Vacaciones</h4>
                                    {(() => {
                                        const empDocs = hrDocs.filter((d: any) => d.employee_id === selectedEmpDetail.id);
                                        if (empDocs.length === 0) {
                                            return <p className="text-xs text-on-surface-variant/60 italic text-center py-4">No hay permisos ni vacaciones registrados para este colaborador.</p>;
                                        }
                                        return (
                                            <div className="space-y-3">
                                                {empDocs.map((doc: any) => (
                                                    <div key={doc.id} className="p-4 bg-white/5 border border-outline/10 rounded-2xl space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-primary capitalize text-xs">{doc.doc_type.replace('_', ' ')}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                                doc.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                                doc.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                            }`}>
                                                                {doc.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 bg-white/5 p-2 rounded-xl text-[10px] text-on-surface-variant font-mono">
                                                            <div>
                                                                <span className="block text-[8px] uppercase font-bold text-on-surface-variant/60">Inicio</span>
                                                                {formatDateOnly(doc.start_date)}
                                                            </div>
                                                            <div>
                                                                <span className="block text-[8px] uppercase font-bold text-on-surface-variant/60">Último Día</span>
                                                                {doc.end_date ? formatDateOnly(doc.end_date) : 'N/A'}
                                                            </div>
                                                            <div>
                                                                <span className="block text-[8px] uppercase font-bold text-on-surface-variant/60">Regreso</span>
                                                                {doc.return_date ? formatDateOnly(doc.return_date) : 'N/A'}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-on-surface-variant/90 leading-relaxed bg-white/5 p-2 rounded-xl">
                                                            <strong>Justificación:</strong> "{doc.notes || doc.reason || 'Sin justificación'}"
                                                        </p>
                                                        {doc.admin_notes && (
                                                            <div className="bg-surface-container-high/40 p-2.5 rounded-xl border border-outline/5 text-[10px] text-on-surface">
                                                                <span className="font-bold text-primary block mb-0.5">Respuesta de Gestión Humana:</span>
                                                                {doc.admin_notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-outline/10 pt-4 mt-4 flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setIsDetailOpen(false)}
                                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl cursor-pointer transition border border-outline/20"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
