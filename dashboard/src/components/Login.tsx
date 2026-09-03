import React, { useState } from 'react';
import { LegalDocsModal } from './LegalDocsModal';

type LoginTab = 'negocio' | 'empleado';
type NegocioAccessMode = 'admin' | 'employee_erp';

interface LoginProps {
  onLoginSuccess: (clientId: string, role: string, token: string, extra?: Record<string, any>) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terminos' | 'privacidad' | 'ia_transparency'>('terminos');

  const [activeTab, setActiveTab] = useState<LoginTab>(() => {
    return (localStorage.getItem('login_active_tab') as LoginTab) || 'negocio';
  });

  // Modo de ingreso dentro de Negocio (Admin con Usuario/Contraseña vs Empleado ERP con Teléfono/PIN)
  const [negocioMode, setNegocioMode] = useState<NegocioAccessMode>('admin');

  // Pestaña Negocio - Modo Admin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Pestaña Negocio - Modo Empleado ERP & Pestaña Empleado Personal
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    localStorage.setItem('login_active_tab', tab);
    setError(null);
  };

  // 1. LOGIN AL ERP (Pestaña Negocio)
  const handleNegocioLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (negocioMode === 'admin') {
      // Admin / Dueño con Usuario y Contraseña
      if (!username || !password) {
        setError('Ingresa tu usuario y contraseña.');
        return;
      }

      try {
        setLoading(true);
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const json = await res.json();

        if (json.success) {
          onLoginSuccess(json.data.id, json.data.role, json.data.token, json.data);
        } else {
          setError(json.error || 'Credenciales incorrectas.');
        }
      } catch {
        setError('Error de conexión al servidor.');
      } finally {
        setLoading(false);
      }
    } else {
      // Empleado entrando al ERP con Teléfono y PIN (4 dígitos)
      if (!phone || !pin) {
        setError('Ingresa tu número de teléfono y PIN de 4 dígitos.');
        return;
      }

      try {
        setLoading(true);
        const res = await fetch('/api/auth/employee-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
        });
        const json = await res.json();

        if (json.success) {
          if (!json.data.hasErpAccess) {
            setError('Tu rol de empleado no tiene permisos para acceder al ERP. Usa la pestaña "Empleado" para entrar a tu perfil personal.');
            return;
          }
          onLoginSuccess(json.data.clientId, 'employee', json.data.token, {
            employeeRole: json.data.employeeRole,
            permissions: json.data.permissions,
            hasErpAccess: true,
            name: json.data.name,
            clientName: json.data.clientName,
          });
        } else {
          setError(json.error || 'Teléfono o PIN incorrectos.');
        }
      } catch {
        setError('Error de conexión al servidor.');
      } finally {
        setLoading(false);
      }
    }
  };

  // 2. LOGIN AL PERFIL PERSONAL DE EMPLEADO (Pestaña Empleado)
  const handleEmpleadoPersonalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !pin) {
      setError('Ingresa tu teléfono y PIN de 4 dígitos.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      });
      const json = await res.json();

      if (json.success) {
        localStorage.setItem('emp_token', json.data.token);
        localStorage.setItem('emp_id', json.data.id);
        localStorage.setItem('emp_name', json.data.name);
        localStorage.setItem('emp_role', json.data.employeeRole || '');
        localStorage.setItem('emp_client_id', json.data.clientId);
        localStorage.setItem('emp_client_category', json.data.clientCategory || 'general');

        onLoginSuccess(json.data.clientId, 'employee', json.data.token, {
          employeeId: json.data.id,
          employeeRole: json.data.employeeRole,
          clientCategory: json.data.clientCategory,
          permissions: json.data.permissions,
          hasErpAccess: false, // Forzar vista de perfil personal de trabajo
          name: json.data.name,
          clientName: json.data.clientName,
        });
      } else {
        setError(json.error || 'Teléfono o PIN incorrectos.');
      }
    } catch {
      setError('Error de conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: 'var(--bg-color)', fontFamily: 'var(--font-family-sans)' }}>

      {/* Luces y degradados de fondo */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '60%', height: '60%',
        background: 'radial-gradient(circle, rgba(216,162,78,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="glass-card relative z-10 w-full" style={{
        maxWidth: '440px',
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--outline-color)',
        background: 'var(--surface-val)',
        boxShadow: 'var(--shadow-lg)'
      }}>

        {/* Header / Logo */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 54, height: 54,
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(216,162,78,0.12)',
            border: '1px solid rgba(216,162,78,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-color)', fontSize: 30 }}>
              smart_toy
            </span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: 0, letterSpacing: '-0.02em' }}>
              Diaz Lab Automations
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Plataforma de gestión inteligente
            </p>
          </div>
        </div>

        {/* Pestañas Principales: Negocio vs Empleado */}
        <div className="login-tabs">
          <button
            className={`login-tab ${activeTab === 'negocio' ? 'active' : ''}`}
            onClick={() => handleTabChange('negocio')}
            type="button"
          >
            🏢 Negocio (ERP)
          </button>
          <button
            className={`login-tab ${activeTab === 'empleado' ? 'active' : ''}`}
            onClick={() => handleTabChange('empleado')}
            type="button"
          >
            👤 Mi Perfil Empleado
          </button>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: 500,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 1: NEGOCIO (ACCESO AL ERP)                       */}
        {/* ======================================================== */}
        {activeTab === 'negocio' && (
          <form onSubmit={handleNegocioLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Sub-selector de tipo de ingreso al ERP */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--surface-container-val)', padding: 3, borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => { setNegocioMode('admin'); setError(null); }}
                style={{
                  flex: 1, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: negocioMode === 'admin' ? 'var(--surface-bright-val)' : 'transparent',
                  color: negocioMode === 'admin' ? 'var(--primary-color)' : 'var(--text-muted)'
                }}
              >
                👑 Dueño / Admin
              </button>
              <button
                type="button"
                onClick={() => { setNegocioMode('employee_erp'); setError(null); }}
                style={{
                  flex: 1, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: negocioMode === 'employee_erp' ? 'var(--surface-bright-val)' : 'transparent',
                  color: negocioMode === 'employee_erp' ? 'var(--primary-color)' : 'var(--text-muted)'
                }}
              >
                💼 Personal ERP
              </button>
            </div>

            {/* Campos para Modo Admin (Usuario + Contraseña) */}
            {negocioMode === 'admin' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Usuario Admin
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      style={{ paddingRight: '40px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Campos para Modo Personal ERP (Teléfono + PIN 4 dígitos) */
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Número de teléfono
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Ej. 573001234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    PIN de acceso (6 dígitos)
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showPin ? 'text' : 'password'}
                      className="input-field"
                      maxLength={6}
                      placeholder="● ● ● ● ● ●"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.4em', fontWeight: 700, paddingRight: '40px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                      title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {showPin ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" disabled={loading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginTop: 6 }}>
              {loading ? (
                <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>sync</span> Entrando al ERP...</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span> Acceder al ERP</>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: PERFIL DE EMPLEADO (TRABAJO PERSONAL)          */}
        {/* ======================================================== */}
        {activeTab === 'empleado' && (
          <form onSubmit={handleEmpleadoPersonalLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Número de teléfono registrado
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="Ej. 573001234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                PIN de acceso (6 dígitos)
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  className="input-field"
                  maxLength={6}
                  placeholder="● ● ● ● ● ●"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.4em', fontWeight: 700, paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {showPin ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0' }}>
                Accede a tu turno, tareas asignadas, RRHH y Chat IA
              </p>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginTop: 6 }}>
              {loading ? (
                <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>sync</span> Entrando...</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>badge</span> Entrar a mi Perfil</>
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            Diaz Lab Automations © 2026 • Todos los derechos reservados.
          </p>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--primary-color)' }}>
            <button
              type="button"
              onClick={() => { setLegalModalTab('terminos'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
            >
              Términos
            </button>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <button
              type="button"
              onClick={() => { setLegalModalTab('privacidad'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.68rem', padding: 0 }}
            >
              Privacidad (Habeas Data)
            </button>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <button
              type="button"
              onClick={() => { setLegalModalTab('ia_transparency'); setIsLegalModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 'bold', padding: 0 }}
            >
              🤖 Transparencia IA
            </button>
          </div>
        </div>
      </div>

      <LegalDocsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
