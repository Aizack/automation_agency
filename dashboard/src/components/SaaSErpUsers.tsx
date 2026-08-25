import React, { useState, useEffect } from 'react';
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
  { key: 'inventory',       label: 'Inventario',          icon: 'inventory_2' },
  { key: 'billing',         label: 'Facturación',         icon: 'receipt_long' },
  { key: 'cartera',         label: 'Cartera',             icon: 'payments' },
  { key: 'crm',             label: 'Clientes',            icon: 'contacts' },
  { key: 'employees',       label: 'Personal',            icon: 'groups' },
  { key: 'appointments',    label: 'Citas',               icon: 'calendar_month' },
  { key: 'formulas',        label: 'Optometría',          icon: 'visibility' },
  { key: 'lab',             label: 'Laboratorio',         icon: 'precision_manufacturing' },
  { key: 'domicilios',      label: 'Domicilios',          icon: 'local_shipping' },
  { key: 'campaigns',       label: 'Campañas',            icon: 'explore' },
  { key: 'marketing',       label: 'Marketing',           icon: 'campaign' },
  { key: 'suppliers',       label: 'Proveedores',         icon: 'local_shipping' },
  { key: 'purchase_orders', label: 'Órdenes de compra',  icon: 'shopping_cart' },
  { key: 'settings',        label: 'Configuración',       icon: 'settings' },
];

const ROLE_LABELS: Record<string, string> = {
  admin:       '👑 Admin',
  vendedor:    '🛒 Vendedor',
  optometra:   '👁 Optómetra',
  laboratorio: '🔬 Laboratorio',
  recepcion:   '📋 Recepción',
  domicilios:  '🚴 Domicilios',
  agent:       '🤖 Agente',
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
      setError('Error de conexión.');
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
    setFormPermissions([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: any = {
        username: formUsername,
        full_name: formFullName,
        email: formEmail || null,
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
        setSuccessMsg(editingUser ? 'Usuario actualizado.' : 'Usuario creado exitosamente.');
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchUsers();
      } else {
        setError(json.error || 'Error guardando usuario.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`¿Eliminar el acceso de "${name}" a esta plataforma?`)) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/tenant-users/${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Usuario eliminado.');
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchUsers();
      } else {
        setError(json.error || 'Error eliminando usuario.');
      }
    } catch {
      setError('Error de conexión.');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'var(--text-muted)', gap: 8 }}>
      <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: 20 }}>sync</span>
      Cargando usuarios...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* Header */}
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>
            Usuarios con Acceso al ERP
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {users.length} usuario{users.length !== 1 ? 's' : ''} con acceso configurado
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
          Agregar Usuario
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '0.8rem' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div style={{ background: 'var(--surface-container-val)', border: '1px solid var(--outline-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>
              {editingUser ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
            </h3>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>✕ Cancelar</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre Completo *</label>
              <input className="input-field" value={formFullName} onChange={e => setFormFullName(e.target.value)} placeholder="Ej. María López" required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Usuario *</label>
              <input className="input-field" value={formUsername} onChange={e => setFormUsername(e.target.value)} placeholder="Ej. mlopez" required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Contraseña {editingUser ? '(dejar vacío = no cambiar)' : '*'}
              </label>
              <input className="input-field" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="••••••••" required={!editingUser} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
              <input className="input-field" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="Opcional" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rol *</label>
              <select className="input-field" value={formRole} onChange={e => setFormRole(e.target.value)} required>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Permisos de módulos */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Módulos con acceso</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-2)' }}>
                {ALL_MODULES.map(mod => (
                  <label key={mod.key} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formPermissions.includes(mod.key) ? 'rgba(216,162,78,0.4)' : 'var(--outline-color)'}`,
                    background: formPermissions.includes(mod.key) ? 'rgba(216,162,78,0.08)' : 'transparent',
                    cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-color)',
                    transition: 'all 0.15s ease',
                  }}>
                    <input type="checkbox" checked={formPermissions.includes(mod.key)} onChange={() => togglePermission(mod.key)} style={{ accentColor: 'var(--primary-color)' }} />
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: formPermissions.includes(mod.key) ? 'var(--primary-color)' : 'var(--text-muted)' }}>{mod.icon}</span>
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <><span className="material-symbols-outlined" style={{ fontSize: 15, animation: 'spin 1s linear infinite' }}>sync</span> Guardando...</> : <>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>save</span>
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuarios */}
      {users.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.4 }}>manage_accounts</span>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>No hay usuarios con acceso al ERP todavía.</p>
          <p style={{ fontSize: '0.75rem', margin: '6px 0 0' }}>Haz clic en "Agregar Usuario" para crear el primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {users.map(user => (
            <div key={user.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-5)',
              background: 'var(--surface-container-val)',
              border: '1px solid var(--outline-color)',
              borderRadius: 'var(--radius-lg)',
              transition: 'border-color 0.15s ease',
            }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: 'rgba(216,162,78,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-color)',
                flexShrink: 0,
              }}>
                {(user.full_name || user.username || '?').substring(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-color)' }}>
                    {user.full_name || user.username}
                  </span>
                  <span className="status-badge status-badge--warning" style={{ flexShrink: 0 }}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  @{user.username}{user.email ? ` · ${user.email}` : ''}
                </div>
                {user.permissions && user.permissions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {user.permissions.slice(0, 6).map(p => (
                      <span key={p} style={{
                        padding: '1px 8px', fontSize: '0.65rem', fontWeight: 600,
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--outline-color)',
                        color: 'var(--text-muted)',
                      }}>
                        {ALL_MODULES.find(m => m.key === p)?.label || p}
                      </span>
                    ))}
                    {user.permissions.length > 6 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '1px 6px' }}>
                        +{user.permissions.length - 6} más
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => openEdit(user)} title="Editar"
                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                </button>
                <button className="btn-danger" onClick={() => handleDelete(user.id, user.full_name || user.username)} title="Eliminar"
                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
