import React, { useState, useEffect, useRef } from 'react';
import { authFetch as fetch } from '../utils/api';
import { SaaSErpInvoices } from './SaaSErpInvoices';
import { SaaSErpInventory } from './SaaSErpInventory';
import { SaaSErpCartera } from './SaaSErpCartera';
import { SaaSErpEmployeeProfile } from './SaaSErpEmployeeProfile';
import { SaaSErpCashShifts } from './SaaSErpCashShifts';
import { SaaSErpCRM } from './SaaSErpCRM';
import { SaaSErpStoreSettings } from './SaaSErpStoreSettings';
import { NotificationBell } from './NotificationBell';

interface FrantErpMobileViewProps {
  clientId: string;
  clientData: any;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeUserName: string;
  activeUserRole: string;
  shiftStatus: string;
  shiftTimer: string;
  onBack: () => void;
  hasPermission: (permKey: string) => boolean;
  onLogout: () => void;
  onConnectWhatsApp?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const FrantErpMobileView: React.FC<FrantErpMobileViewProps> = ({
  clientId,
  clientData,
  activeTab,
  setActiveTab,
  activeUserName,
  activeUserRole,
  shiftStatus,
  shiftTimer,
  onBack,
  hasPermission,
  onLogout,
  onConnectWhatsApp
}) => {
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Chat de Frant IA para Móvil
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `¡Hola ${activeUserName}! Soy Frant IA, tu asistente de gestión comercial y ERP. ¿En qué te puedo colaborar hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAiSheetOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiSheetOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/clients/${clientId}/ai-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || data.response || 'He procesado tu solicitud.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Ocurrió un inconveniente al conectar con Frant IA. Por favor intenta de nuevo.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const isEmployeeRole = activeUserRole.toLowerCase().includes('empleado') || activeUserRole.toLowerCase().includes('mesero') || activeUserRole.toLowerCase().includes('cajero');

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5] text-[#161616] font-sans antialiased w-full pb-20 select-none">
      {/* 1. Header Móvil Exclusivo (Wabi-Sabi Recto) */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5] border-b border-[#E2DFD7] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-none bg-[#161616] text-[#FAF8F5] font-serif font-bold text-base flex items-center justify-center border border-[#161616]">
            F
          </div>
          <div>
            <h1 className="font-serif text-base font-bold text-[#161616] leading-none tracking-tight">
              Frant ERP
            </h1>
            <span className="text-[10px] text-[#D9381E] font-bold uppercase tracking-wider block mt-0.5">
              {clientData?.branchName || clientData?.branch_name || clientData?.name || 'Sede Principal'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Campanita de Notificaciones */}
          <NotificationBell 
            clientId={clientId} 
            onConnectWhatsApp={onConnectWhatsApp || (() => {})}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />

          {/* Botón Salir / Perfil */}
          <button 
            type="button"
            onClick={() => setActiveTab('employee_profile')}
            className="w-8 h-8 bg-[#161616] text-[#FAF8F5] font-serif font-bold text-xs flex items-center justify-center border border-[#161616] cursor-pointer"
            title="Mi Perfil"
          >
            {activeUserName.substring(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      {/* 2. Tarjeta Resumen Contextual según Rol (Wabi-Sabi Recta) */}
      <section className="p-3 bg-[#FAF8F5] border-b border-[#E2DFD7]">
        {isEmployeeRole ? (
          /* Tarjeta para Empleado: Foco en Jornada y Estado de Turno */
          <div 
            onClick={() => setActiveTab('employee_profile')}
            className="bg-white border border-[#E2DFD7] p-3 cursor-pointer hover:border-[#161616] transition"
          >
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D9381E] text-base">schedule</span>
                <span className="text-xs font-bold uppercase text-[#161616]">Estado del Turno</span>
              </div>
              <span className="text-[10px] bg-[#FAF8F5] border border-[#E2DFD7] px-2 py-0.5 font-mono font-bold text-[#D9381E]">
                {shiftStatus === 'working' ? 'EN JORNADA' : shiftStatus === 'lunch' ? 'EN ALMUERZO' : 'FUERA DE TURNO'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#6B6862]">Tiempo registrado:</span>
              <span className="text-sm font-mono font-bold text-[#161616]">
                {shiftStatus === 'working' ? shiftTimer : '--:--:--'}
              </span>
            </div>
          </div>
        ) : (
          /* Tarjeta para Administrador/SuperAdmin: Resumen Ejecutivo y Métricas Rápidas */
          <div className="bg-white border border-[#E2DFD7] p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6862]">Resumen Hoy</span>
              <div className="flex items-center gap-2">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-[10px] font-bold text-[#D9381E] hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    ← Consola Admin
                  </button>
                )}
                <span className="text-[10px] font-mono font-bold text-[#D9381E] bg-[#FDF1EE] px-2 py-0.5 border border-[#E2DFD7]">
                  EN VIVO
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-2">
                <span className="text-[10px] font-bold text-[#6B6862] block uppercase">Ventas Directas</span>
                <span className="text-base font-serif font-bold text-[#161616]">$ --</span>
              </div>
              <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-2">
                <span className="text-[10px] font-bold text-[#6B6862] block uppercase">Arqueos Caja</span>
                <span className="text-base font-serif font-bold text-[#161616]">OK</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. Barra Compacta de Subsecciones (Segmented Control Horizontal) */}
      <nav className="p-2 bg-[#FAF8F5] border-b border-[#E2DFD7] sticky top-[57px] z-30">
        <div className="flex bg-[#EAE6DF] p-1 border border-[#E2DFD7] gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('resumen')}
            className={`flex-1 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-0 cursor-pointer transition ${
              activeTab === 'resumen' ? 'bg-white text-[#161616] shadow-xs' : 'text-[#6B6862] bg-transparent'
            }`}
          >
            Resumen
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('facturacion')}
            className={`flex-1 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-0 cursor-pointer transition ${
              ['facturacion', 'facturacion2'].includes(activeTab) ? 'bg-white text-[#161616] shadow-xs' : 'text-[#6B6862] bg-transparent'
            }`}
          >
            Facturación
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventario')}
            className={`flex-1 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-0 cursor-pointer transition ${
              activeTab === 'inventario' ? 'bg-white text-[#161616] shadow-xs' : 'text-[#6B6862] bg-transparent'
            }`}
          >
            Inventario
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cartera')}
            className={`flex-1 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-0 cursor-pointer transition ${
              activeTab === 'cartera' ? 'bg-white text-[#161616] shadow-xs' : 'text-[#6B6862] bg-transparent'
            }`}
          >
            Cartera
          </button>
        </div>
      </nav>

      {/* 4. Contenedor Principal Adaptativo Móvil */}
      <main className="flex-1 p-3 overflow-y-auto">
        {activeTab === 'resumen' && (
          <div className="space-y-4">
            <h2 className="font-serif text-lg font-bold text-[#161616]">Panel de Control Móvil</h2>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('facturacion')}
                className="w-full bg-white border border-[#E2DFD7] p-4 text-left flex items-center justify-between cursor-pointer hover:border-[#161616]"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#D9381E] text-2xl">point_of_sale</span>
                  <div>
                    <h3 className="font-bold text-sm text-[#161616]">Nueva Factura de Venta</h3>
                    <p className="text-xs text-[#6B6862]">Crear factura rápida con POS / DIAN</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-base text-[#6B6862]">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inventario')}
                className="w-full bg-white border border-[#E2DFD7] p-4 text-left flex items-center justify-between cursor-pointer hover:border-[#161616]"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#161616] text-2xl">inventory_2</span>
                  <div>
                    <h3 className="font-bold text-sm text-[#161616]">Consultar Inventario</h3>
                    <p className="text-xs text-[#6B6862]">Productos, precios y stock en bodega</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-base text-[#6B6862]">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('arqueo_caja')}
                className="w-full bg-white border border-[#E2DFD7] p-4 text-left flex items-center justify-between cursor-pointer hover:border-[#161616]"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#161616] text-2xl">account_balance_wallet</span>
                  <div>
                    <h3 className="font-bold text-sm text-[#161616]">Turno & Arqueo de Caja</h3>
                    <p className="text-xs text-[#6B6862]">Apertura, cierres y movimientos de caja</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-base text-[#6B6862]">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiSheetOpen(true)}
                className="w-full bg-[#161616] text-[#FAF8F5] border border-[#161616] p-4 text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#D9381E] text-2xl">smart_toy</span>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#FAF8F5]">Asistente Frant IA</h3>
                    <p className="text-xs text-[#E2DFD7]">Consultas en lenguaje natural de tu negocio</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-base text-[#D9381E]">sparkles</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'facturacion' && <SaaSErpInvoices clientId={clientId} />}
        {activeTab === 'inventario' && <SaaSErpInventory clientId={clientId} />}
        {activeTab === 'cartera' && <SaaSErpCartera clientId={clientId} />}
        {activeTab === 'employee_profile' && <SaaSErpEmployeeProfile clientId={clientId} />}
        {activeTab === 'arqueo_caja' && <SaaSErpCashShifts clientId={clientId} />}
        {activeTab === 'clientes' && <SaaSErpCRM clientId={clientId} />}
        {activeTab === 'configuracion' && <SaaSErpStoreSettings clientId={clientId} onProfileUpdated={() => {}} />}
      </main>

      {/* 5. Bottom Navigation Bar Fija para Celulares (Wabi-Sabi Recta) */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF8F5] border-t border-[#E2DFD7] flex items-center justify-around py-2 px-1">
        <button
          type="button"
          onClick={() => { setActiveTab('resumen'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-1 ${
            activeTab === 'resumen' ? 'text-[#D9381E]' : 'text-[#6B6862]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">grid_view</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Resumen</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('facturacion'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-1 ${
            activeTab === 'facturacion' ? 'text-[#D9381E]' : 'text-[#6B6862]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">receipt_long</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Facturar</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('inventario'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-1 ${
            activeTab === 'inventario' ? 'text-[#D9381E]' : 'text-[#6B6862]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">inventory_2</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Stock</span>
        </button>

        <button
          type="button"
          onClick={() => { setIsAiSheetOpen(true); setIsMoreMenuOpen(false); }}
          className="flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-1 text-[#161616]"
        >
          <span className="material-symbols-outlined text-xl text-[#D9381E]">smart_toy</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Frant IA</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className={`flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-1 ${
            isMoreMenuOpen ? 'text-[#D9381E]' : 'text-[#6B6862]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">menu</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Más</span>
        </button>
      </footer>

      {/* 6. Menú Desplegable "Más" para Móvil */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end animate-fade-in" onClick={() => setIsMoreMenuOpen(false)}>
          <div className="bg-[#FAF8F5] border-t-2 border-[#161616] p-4 space-y-2 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-2">
              <h3 className="font-serif text-base font-bold text-[#161616]">Todos los Módulos</h3>
              <button type="button" onClick={() => setIsMoreMenuOpen(false)} className="bg-transparent border-0 cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('employee_profile'); setIsMoreMenuOpen(false); }}
                className="p-3 bg-white border border-[#E2DFD7] text-left text-xs font-bold uppercase flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[#D9381E]">schedule</span>
                <span>Mi Perfil & Turno</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('arqueo_caja'); setIsMoreMenuOpen(false); }}
                className="p-3 bg-white border border-[#E2DFD7] text-left text-xs font-bold uppercase flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[#161616]">account_balance_wallet</span>
                <span>Arqueo de Caja</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('cartera'); setIsMoreMenuOpen(false); }}
                className="p-3 bg-white border border-[#E2DFD7] text-left text-xs font-bold uppercase flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[#161616]">payments</span>
                <span>Cartera Cuentas</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('clientes'); setIsMoreMenuOpen(false); }}
                className="p-3 bg-white border border-[#E2DFD7] text-left text-xs font-bold uppercase flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[#161616]">group</span>
                <span>Clientes CRM</span>
              </button>

              {hasPermission('settings') && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('configuracion'); setIsMoreMenuOpen(false); }}
                  className="p-3 bg-white border border-[#E2DFD7] text-left text-xs font-bold uppercase flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[#161616]">settings</span>
                  <span>Configuración</span>
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="p-3 bg-[#161616] text-[#FAF8F5] border border-[#161616] text-left text-xs font-bold uppercase flex items-center gap-2 col-span-2 mt-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#D9381E]">logout</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Full-Screen / Chat de Frant IA para Celulares */}
      {isAiSheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col animate-fade-in">
          <div className="flex-1 bg-[#FAF8F5] mt-12 flex flex-col border-t-2 border-[#161616]">
            <div className="p-4 bg-white border-b border-[#E2DFD7] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D9381E] text-2xl">smart_toy</span>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#161616]">Frant IA Assistant</h3>
                  <span className="text-[10px] text-[#6B6862] font-mono">Asistente Ejecutivo Inteligente</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiSheetOpen(false)}
                className="bg-transparent border-0 cursor-pointer p-1 text-[#161616]"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Mensajes del Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 border text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#161616] text-white border-[#161616]'
                        : 'bg-white text-[#161616] border-[#E2DFD7]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span
                      className={`text-[9px] font-mono block mt-1 text-right ${
                        msg.sender === 'user' ? 'text-gray-400' : 'text-[#6B6862]'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-xs text-[#6B6862] font-mono italic p-2">
                  <span className="material-symbols-outlined animate-spin text-base text-[#D9381E]">sync</span>
                  Frant IA está escribiendo...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input de Mensaje */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#E2DFD7] flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe una pregunta para Frant IA..."
                className="flex-1 bg-[#FAF8F5] border border-[#E2DFD7] px-3 py-2 text-xs outline-none text-[#161616]"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="bg-[#D9381E] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider border-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <span>Enviar</span>
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
