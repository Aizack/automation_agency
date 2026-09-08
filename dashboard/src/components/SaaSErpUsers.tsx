import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface TenantUser {
  id: string;
  role_id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  permissions: string[];
  created_at: string;
}

interface SaaSErpUsersProps {
  clientId: string;
}

const ALL_MODULES = [
  { key: 'inventory',       label: 'Inventario & Stock',  icon: 'inventory_2' },
  { key: 'billing',         label: 'Facturación POS',     icon: 'receipt_long' },
  { key: 'cartera',         label: 'Cartera y Cobros',    icon: 'payments' },
  { key: 'crm',             label: 'Clientes / CRM',      icon: 'contacts' },
  { key: 'employees',       label: 'Personal & Turnos',   icon: 'groups' },
  { key: 'appointments',    label: 'Agenda de Citas',     icon: 'calendar_month' },
  { key: 'formulas',        label: 'Optometría & RX',     icon: 'visibility' },
  { key: 'lab',             label: 'Laboratorio',         icon: 'precision_manufacturing' },
  { key: 'domicilios',      label: 'Domicilios & Envíos', icon: 'local_shipping' },
  { key: 'campaigns',       label: 'Campañas Geográficas', icon: 'explore' },
  { key: 'marketing',       label: 'Marketing & Difusión', icon: 'campaign' },
  { key: 'metas_ventas',    label: 'Metas de Venta',      icon: 'trending_up' },
  { key: 'suppliers',       label: 'Proveedores',         icon: 'local_shipping' },
  { key: 'purchase_orders', label: 'Órdenes de Compra',   icon: 'shopping_cart' },
  { key: 'trazabilidad',    label: 'Trazabilidad & Logs', icon: 'shield' },
  { key: 'system_status',   label: 'Estado del Sistema',  icon: 'terminal' },
  { key: 'settings',        label: 'Configuración Sede',  icon: 'settings' },
];

const ROLE_LABELS: Record<string, string> = {
  admin:       'Admin / Gerencia',
  vendedor:    'Vendedor / Asesor',
  optometra:   'Optómetra',
  laboratorio: 'Técnico de Laboratorio',
  recepcion:   'Recepción / Caja',
  domicilios:  'Mensajero / Domiciliario',
  agent:       'Agente IA / Operador',
};

export const SaaSErpUsers: React.FC<SaaSErpUsersProps> = ({ clientId }) => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('vendedor');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/tenant-users`);
      const json = await res.json();
      if (json.success) setUsers(json.users || []);
      else setError(json.error || 'Error cargando usuarios.');
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [clientId]);

  const openCreate = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormFullName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('vendedor');
    setFormPermissions(['billing', 'crm', 'inventory']);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (user: TenantUser) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormFullName(user.full_name);
    setFormEmail(user.email || '');
    setFormPassword('');
    setFormRole(user.role);
    setFormPermissions(user.permissions || []);
    setShowForm(true);
    setError(null);
  };

  const togglePermission = (key: string) => {
    setFormPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSelectAllPermissions = () => {
    setFormPermissions(ALL_MODULES.map(m => m.key));
  };

  const handleDeselectAllPermissions = () => {
    setFormPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: any = {
        username: formUsername.trim(),
        full_name: formFullName.trim(),
        email: formEmail.trim() || null,
        role: formRole,
        permissions: formPermissions,
      };
      if (formPassword) body.password = formPassword;

      const url = editingUser
        ? `/api/clients/${clientId}/tenant-users/${editingUser.id}`
        : `/api/clients/${clientId}/tenant-users`;
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setShowForm(false);
        setSuccessMsg(editingUser ? 'Usuario actualizado exitosamente.' : 'Usuario creado con acceso configurado.');
        setTimeout(() => setSuccessMsg(null), 3500);
        fetchUsers();
      } else {
        setError(json.error || 'Error guardando datos de usuario.');
      }
    } catch {
      setError('Error de conexión al guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`¿Estás seguro de revocar y eliminar el acceso de "${name}"?`)) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/tenant-users/${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Acceso de usuario eliminado.');
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchUsers();
      } else {
        setError(json.error || 'Error al eliminar usuario.');
      }
    } catch {
      setError('Error de red al intentar eliminar el usuario.');
    }
  };

  return (
    <div className="space-y-6 text-[#161616]">
      {/* Cabecera Wabi-Sabi */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-4">
        <div>
          <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">
            SEGURIDAD & ACCESOS
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight">
            Accesos & Permisos de Usuarios
          </h2>
          <p className="text-xs text-[#76746E] font-sans mt-0.5">
            Administración de cuentas con acceso a la plataforma, asignación de roles y control granular por módulo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="px-3.5 py-2 border border-[#E2DFD7] bg-white hover:bg-[#FAF8F5] text-xs font-mono font-bold text-[#161616] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Refrescar lista"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            Refrescar
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] border border-[#161616] hover:border-[#D9381E] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            + Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-[#FAF8F5] border-l-4 border-[#D9381E] p-3 border-y border-r border-[#E2DFD7] text-[#D9381E] text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="cursor-pointer hover:opacity-75">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-[#FAF8F5] border-l-4 border-emerald-600 p-3 border-y border-r border-[#E2DFD7] text-emerald-800 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="cursor-pointer hover:opacity-75">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* Resumen de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#76746E] block font-bold">Total Usuarios</span>
          <p className="text-2xl font-mono font-bold text-[#161616]">{users.length}</p>
          <span className="text-[10px] font-mono text-[#76746E]">Cuentas activas en sede</span>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#76746E] block font-bold">Administradores</span>
          <p className="text-2xl font-mono font-bold text-[#161616]">
            {users.filter(u => u.role === 'admin').length}
          </p>
          <span className="text-[10px] font-mono text-[#76746E]">Acceso irrestricto</span>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#76746E] block font-bold">Ventas & Mostrador</span>
          <p className="text-2xl font-mono font-bold text-[#161616]">
            {users.filter(u => ['vendedor', 'recepcion'].includes(u.role)).length}
          </p>
          <span className="text-[10px] font-mono text-[#76746E]">Caja y facturación</span>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#76746E] block font-bold">Especialistas / Otros</span>
          <p className="text-2xl font-mono font-bold text-[#161616]">
            {users.filter(u => !['admin', 'vendedor', 'recepcion'].includes(u.role)).length}
          </p>
          <span className="text-[10px] font-mono text-[#76746E]">Optometría / Lab / Domicilios</span>
        </div>
      </div>

      {/* Lista de Usuarios */}
      {loading ? (
        <div className="bg-white border border-[#E2DFD7] p-12 text-center text-[#76746E] space-y-2">
          <span className="material-symbols-outlined animate-spin text-3xl text-[#161616]">sync</span>
          <p className="text-xs font-mono uppercase tracking-wider">Cargando usuarios con acceso...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-[#E2DFD7] p-12 text-center text-[#76746E] space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#76746E]">manage_accounts</span>
          <p className="text-sm font-serif text-[#161616]">No hay usuarios con acceso configurados</p>
          <p className="text-xs font-mono text-[#76746E]">Haz clic en "+ Nuevo Usuario" para conceder credenciales de acceso al ERP.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2DFD7] overflow-hidden">
          <div className="p-3 bg-[#FAF8F5] border-b border-[#E2DFD7] flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#161616]">
              Directorio de Usuarios ({users.length})
            </span>
            <span className="text-[10px] font-mono text-[#76746E]">
              Haga clic en 'Editar' para ajustar credenciales o módulos
            </span>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {users.map(user => (
              <div
                key={user.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Avatar Wabi-Sabi Cuadrado */}
                  <div className="w-10 h-10 bg-[#161616] text-[#F6F4EE] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[#161616]">
                    {(user.full_name || user.username || '?').substring(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#161616]">
                        {user.full_name || user.username}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616]">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>

                    <div className="text-xs text-[#76746E] font-mono flex flex-wrap items-center gap-2">
                      <span className="text-[#161616]">@{user.username}</span>
                      {user.email && (
                        <>
                          <span>·</span>
                          <span>{user.email}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="text-[11px]">
                        Creado: {new Date(user.created_at).toLocaleDateString('es-CO')}
                      </span>
                    </div>

                    {/* Módulos permitidos */}
                    {user.permissions && user.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {user.permissions.map(p => {
                          const mod = ALL_MODULES.find(m => m.key === p);
                          return (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-white border border-[#E2DFD7] text-[#76746E]"
                            >
                              <span className="material-symbols-outlined text-[12px]">{mod?.icon || 'check'}</span>
                              {mod?.label || p}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-xs font-mono font-bold text-[#161616] flex items-center gap-1.5 transition cursor-pointer"
                    title="Editar usuario y permisos"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(user.id, user.full_name || user.username)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#D9381E]/10 border border-[#E2DFD7] hover:border-[#D9381E] text-xs font-mono font-bold text-[#76746E] hover:text-[#D9381E] flex items-center gap-1 transition cursor-pointer"
                    title="Revocar acceso"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Usuario Wabi-Sabi */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
          <div className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-2xl w-full rounded-none overflow-hidden p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-5">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">
                  {editingUser ? 'ACTUALIZAR CREDENCIALES' : 'NUEVO ACCESO'}
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#161616]">
                  {editingUser ? 'Editar Usuario & Permisos' : 'Crear Usuario de Plataforma'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#76746E] font-bold font-mono">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={e => setFormFullName(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#76746E] font-bold font-mono">
                    Nombre de Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="Ej. cmendoza"
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#76746E] font-bold font-mono">
                    Contraseña {editingUser ? '(dejar en blanco para no cambiar)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#76746E] font-bold font-mono">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider text-[#76746E] font-bold font-mono">
                    Rol Principal *
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    required
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none cursor-pointer transition-colors"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Matriz de Permisos por Módulo */}
              <div className="space-y-2 border border-[#E2DFD7] p-4 bg-white">
                <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-2">
                  <div>
                    <span className="text-[10px] font-bold text-[#161616] uppercase tracking-wider font-mono block">
                      Permisos de Acceso a Módulos
                    </span>
                    <span className="text-[10px] font-mono text-[#76746E]">
                      Seleccione los módulos que este usuario podrá visualizar y operar
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="text-[10px] font-mono underline text-[#161616] hover:text-[#D9381E] cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-[10px] font-mono text-[#E2DFD7]">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllPermissions}
                      className="text-[10px] font-mono underline text-[#76746E] hover:text-[#D9381E] cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                  {ALL_MODULES.map(mod => {
                    const isChecked = formPermissions.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        className={`flex items-center gap-2.5 p-2.5 border rounded-none cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-[#FAF8F5] border-[#161616] text-[#161616]'
                            : 'bg-white border-[#E2DFD7] text-[#76746E] hover:border-[#161616]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(mod.key)}
                          className="rounded-none border-[#E2DFD7] text-[#161616] focus:ring-0 cursor-pointer"
                        />
                        <span className="material-symbols-outlined text-[16px] text-[#161616] shrink-0">
                          {mod.icon}
                        </span>
                        <span className="text-[11px] font-mono font-bold truncate">
                          {mod.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-white border border-[#E2DFD7] text-xs font-mono font-bold text-[#161616] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] border border-[#161616] hover:border-[#D9381E] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
