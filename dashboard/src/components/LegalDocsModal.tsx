import React, { useState, useEffect } from 'react';

interface LegalDocsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'terminos' | 'privacidad' | 'ia_transparency';
}

export const LegalDocsModal: React.FC<LegalDocsModalProps> = ({
    isOpen,
    onClose,
    initialTab = 'terminos'
}) => {
    const [activeTab, setActiveTab] = useState<'terminos' | 'privacidad' | 'ia_transparency'>(initialTab);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-[#161616]/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans">
            <div className="bg-[#F6F4EE] border border-[#161616] w-full max-w-4xl rounded-none sm:rounded-lg shadow-2xl max-h-[92vh] flex flex-col justify-between overflow-hidden text-left">
                
                {/* Header - Wabi Sabi Editorial */}
                <div className="bg-[#FAF8F3] px-6 py-5 border-b border-[#E2DFD7] flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-[#161616] text-[#FAF8F3] flex items-center justify-center rounded-none shadow-sm">
                            <span className="material-symbols-outlined text-[22px]">gavel</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-serif text-[#161616] font-normal leading-tight tracking-tight m-0">
                                Marco Legal & Transparencia
                            </h2>
                            <p className="text-xs text-[#6B6862] font-sans m-0 mt-0.5">
                                Frant by Diaz Lab Automation — Términos de servicio, Habeas Data, Google OAuth y cumplimiento Meta
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a 
                            href={activeTab === 'privacidad' || activeTab === 'ia_transparency' ? '/privacy' : '/terms'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#6B6862] hover:text-[#D9381E] border border-[#E2DFD7] px-2.5 py-1.5 bg-white transition"
                            title="Abrir página web completa"
                        >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            Ver URL pública
                        </a>
                        <button
                            onClick={onClose}
                            className="text-[#6B6862] hover:text-[#161616] hover:bg-[#E2DFD7]/50 p-2 rounded-md transition cursor-pointer flex items-center justify-center"
                            title="Cerrar modal"
                        >
                            <span className="material-symbols-outlined text-[22px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Subnav Pestañas Legales - Wabi Sabi Tabs */}
                <div className="bg-[#FAF8F3] px-6 py-3 border-b border-[#E2DFD7] flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('terminos')}
                        className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase transition cursor-pointer flex items-center gap-2 border ${
                            activeTab === 'terminos'
                                ? 'bg-[#161616] text-white border-[#161616] shadow-sm'
                                : 'bg-white text-[#6B6862] border-[#E2DFD7] hover:border-[#161616] hover:text-[#161616]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        Términos de Servicio
                    </button>

                    <button
                        onClick={() => setActiveTab('privacidad')}
                        className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase transition cursor-pointer flex items-center gap-2 border ${
                            activeTab === 'privacidad'
                                ? 'bg-[#161616] text-white border-[#161616] shadow-sm'
                                : 'bg-white text-[#6B6862] border-[#E2DFD7] hover:border-[#161616] hover:text-[#161616]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                        Política de Privacidad (Habeas Data)
                    </button>

                    <button
                        onClick={() => setActiveTab('ia_transparency')}
                        className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase transition cursor-pointer flex items-center gap-2 border ${
                            activeTab === 'ia_transparency'
                                ? 'bg-[#D9381E] text-white border-[#D9381E] shadow-sm'
                                : 'bg-white text-[#6B6862] border-[#E2DFD7] hover:border-[#D9381E] hover:text-[#D9381E]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                        Transparencia IA
                    </button>
                </div>

                {/* Contenido del Documento Legal - Paper Content Area */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-xs text-[#333333] leading-relaxed bg-[#F6F4EE]">
                    
                    {activeTab === 'terminos' && (
                        <div className="space-y-5">
                            <div className="border-b border-[#E2DFD7] pb-3 flex justify-between items-end flex-wrap gap-2">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-serif text-[#161616] font-normal uppercase tracking-wide m-0">
                                        Términos y Condiciones Generales de Uso
                                    </h3>
                                    <p className="text-xs text-[#6B6862] font-mono mt-1 mb-0">
                                        Última actualización: Noviembre 2026 • Frant by Diaz Lab Automation
                                    </p>
                                </div>
                                <a 
                                    href="/terms" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-[#D9381E] hover:underline flex items-center gap-1"
                                >
                                    <span>https://frant.app/terms</span>
                                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                </a>
                            </div>
                            
                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    1. Aceptación de los Términos y Operador
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Al acceder, registrarse o utilizar la plataforma SaaS <strong>Frant</strong> (Friendly Automation), operada por <strong>Diaz Lab Automation</strong> con domicilio en Barranquilla, Atlántico, Colombia, el cliente ("el Usuario") acepta sin reservas los presentes Términos de Servicio. Si el Usuario no está de acuerdo con alguno de los términos, debe abstenerse de utilizar la Plataforma.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    2. Descripción del Servicio y Ecosistema
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Diaz Lab Automation provee una solución multi-inquilino en la nube que integra gestión empresarial (ERP), sistema de punto de venta (POS), facturación electrónica con cumplimiento DIAN, cotizaciones, órdenes de compra, despacho transaccional de comprobantes vía Google OAuth 2.0 (<code>gmail.send</code>) y asistentes de Inteligencia Artificial para atención y ventas mediante la API Oficial de Meta (WhatsApp Business Cloud API).
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    3. Aislamiento Lógico de Inquilinos (Multi-Tenant) y Seguridad
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Cada tienda o empresa cuenta con un entorno aislado lógico mediante identificador único (<code className="font-mono bg-[#FAF8F3] px-1.5 py-0.5 border border-[#E2DFD7] text-[#D9381E]">client_id</code>). El Usuario es responsable de mantener la confidencialidad de sus credenciales. Las contraseñas se almacenan mediante algoritmos seguros de hashing bcrypt/PBKDF2.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    4. Propiedad Intelectual y Propiedad de los Datos
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    <strong>Sus datos son suyos:</strong> El cliente conserva en todo momento la propiedad íntegra de su inventario, base de clientes y registros transaccionales. Diaz Lab Automation es la titular exclusiva de los derechos de autor, código fuente, interfaz gráfica, diseño de marca y algoritmos de la plataforma Frant.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    5. Uso Aceptable y Normas de WhatsApp (Meta) y Google API
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Queda estrictamente prohibido el envío de SPAM, acoso, venta de productos restringidos o cualquier actividad violatoria de la <em>WhatsApp Commerce Policy</em>, los <em>Meta Platform Terms</em> y la <em>Google API Services User Data Policy</em>. Diaz Lab Automation se reserva el derecho de suspender conectores de mensajería o correo que incurran en prácticas fraudulentas o reportes masivos de spam.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    6. Niveles de Servicio, IA y Limitación de Responsabilidad
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Frant tiene un objetivo de disponibilidad del 99.5%. No asumimos responsabilidad por caídas atribuibles a fallas globales de Meta, Google, OpenAI o proveedores de conectividad. Las sugerencias de IA son de asistencia operativa y deben ser supervisadas por el personal del comercio. La legislación aplicable es la de la República de Colombia, con domicilio en Barranquilla, Atlántico, Colombia.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacidad' && (
                        <div className="space-y-5">
                            <div className="border-b border-[#E2DFD7] pb-3 flex justify-between items-end flex-wrap gap-2">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-serif text-[#161616] font-normal uppercase tracking-wide m-0">
                                        Política de Tratamiento de Datos Personales
                                    </h3>
                                    <p className="text-xs text-[#6B6862] font-mono mt-1 mb-0">
                                        Habeas Data Ley 1581 de 2012 • Cumplimiento Google OAuth & Meta Platform • Noviembre 2026
                                    </p>
                                </div>
                                <a 
                                    href="/privacy" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-[#D9381E] hover:underline flex items-center gap-1"
                                >
                                    <span>https://frant.app/privacy</span>
                                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                </a>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    1. Responsable del Tratamiento de Datos
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    <strong>Diaz Lab Automation</strong>, con domicilio principal en Barranquilla, Atlántico, Colombia, es el Responsable del tratamiento de los datos personales recolectados a través de Frant ERP (<code>https://frant.app</code>). Canal oficial de contacto y privacidad: <code>contacto@diazlab.online</code>.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    2. Finalidad y Prohibición de Venta de Datos
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Los datos se utilizan exclusivamente para operar los módulos ERP, emitir comprobantes fiscales, despachar facturas y cotizaciones por correo electrónico, sincronizar pedidos con WhatsApp Business y brindar soporte técnico. <strong>NUNCA vendemos, cedemos ni comercializamos</strong> datos con terceros o intermediarios publicitarios.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    3. Subencargados y Seguridad PCI-DSS
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Operamos con subencargados de estándar mundial: Meta Platforms (WhatsApp API), Google Cloud & OpenAI (modelos IA efímeros sin re-entrenamiento), y pasarelas de pago certificadas PCI-DSS (Stripe, Wompi). No almacenamos datos de tarjetas de crédito o códigos CVV.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#4285F4]/30 shadow-xs border-l-4 border-l-[#4285F4]">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0">
                                    <span className="material-symbols-outlined text-[16px] text-[#4285F4]">verified_user</span>
                                    4. Cumplimiento Google API — Acceso, Uso, Almacenamiento y Compartición
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    El uso y la transferencia a cualquier otra aplicación por parte de <strong>Frant ERP</strong> de la información recibida a través de las API de Google se apegan estrictamente a la <em>Política de Datos de Usuario de los Servicios de la API de Google (Google API Services User Data Policy)</em>, incluidos los requisitos de <strong>Uso Limitado (Limited Use Requirements)</strong>:
                                </p>
                                <ul className="text-xs text-[#444] space-y-1.5 list-disc pl-4 pt-1 m-0">
                                    <li><strong>Acceso (Permisos Mínimos):</strong> Solo se solicita autorización OAuth 2.0 para el permiso sensible <code>https://www.googleapis.com/auth/gmail.send</code> y los permisos de identidad básica (<code>userinfo.email</code> y <code>userinfo.profile</code>). Frant ERP <strong>no lee, no modifica, no elimina ni indexa</strong> la bandeja de entrada del usuario.</li>
                                    <li><strong>Uso Operativo:</strong> Exclusivamente para enviar facturas electrónicas, recibos de caja, cotizaciones y estados de cuenta a los clientes finales del comercio titular desde su propia dirección de Gmail corporativa.</li>
                                    <li><strong>Compartición Prohibida:</strong> NUNCA vendemos, alquilamos ni transferimos datos obtenidos de Google APIs a terceros, brokers de datos ni plataformas publicitarias.</li>
                                </ul>
                            </div>

                            <div className="space-y-2.5 bg-white p-5 border border-[#4285F4]/30 shadow-xs border-l-4 border-l-[#161616]">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0">
                                    <span className="material-symbols-outlined text-[16px] text-[#161616]">shield_lock</span>
                                    5. Mecanismos de Protección de Datos Sensibles (Data Protection Mechanisms)
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    En cumplimiento con los requisitos de seguridad de verificación de Google Cloud OAuth, Frant ERP protege todos los datos sensibles y credenciales mediante:
                                </p>
                                <ul className="text-xs text-[#444] space-y-1.5 list-disc pl-4 pt-1 m-0">
                                    <li><strong>Cifrado en Tránsito (Encryption in Transit):</strong> Todas las comunicaciones entre el navegador, los servidores de Frant y las APIs de Google utilizan obligatoriamente <strong>TLS 1.2 y TLS 1.3 sobre HTTPS</strong>.</li>
                                    <li><strong>Cifrado en Reposo (Encryption at Rest):</strong> Las credenciales y tokens OAuth 2.0 (<code>refresh_token</code> y <code>access_token</code>) se almacenan cifrados bajo el estándar <strong>AES-256</strong> en bases de datos PostgreSQL aisladas sin acceso público a internet.</li>
                                    <li><strong>Controles de Acceso y Aislamiento Multi-Tenant (RBAC):</strong> Aislamiento estricto por comercio (<code>client_id</code>) bajo principio de mínimo privilegio; solo administradores autorizados (<code>admin_tenant</code>) pueden gestionar la vinculación OAuth.</li>
                                    <li><strong>Política de Retención y Purgado Inmediato (0 días):</strong> Al presionar <em>"Desvincular Gmail"</em> en el ERP o revocar el acceso en <code>myaccount.google.com/permissions</code>, los tokens OAuth se purgan de forma inmediata, permanente e irreversible (<code>NULL</code>), con 0 días de retención residual.</li>
                                </ul>
                                <div className="bg-[#FAF8F3] border-l-4 border-[#0EA5E9] p-3 mt-2 text-xs text-[#161616]">
                                    <strong>Prohibición de Entrenamiento de Modelos IA/ML con Google Workspace APIs:</strong><br />
                                    <em>"Frant does not use data obtained through Google Workspace APIs (including Gmail APIs) to develop, train, or improve generalized or non-personalized artificial intelligence (AI) and/or machine learning (ML) models."</em><br />
                                    <span className="text-[#555]">(Frant no utiliza los datos obtenidos a través de las API de Google Workspace, incluidas las API de Gmail, para desarrollar, entrenar o mejorar modelos de inteligencia artificial y/o aprendizaje automático generalizados o no personalizados).</span>
                                </div>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    6. Mecanismos Autónomos de Eliminación (Meta Data Deletion Callback)
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Garantizamos eliminación inmediata a través de: (i) Botón <em>"Desvincular Gmail"</em> o <em>"Desconectar y Eliminar Datos"</em> en el Dashboard; (ii) Webhook automático oficial de Meta en <code className="font-mono bg-[#FAF8F3] px-1 border border-[#E2DFD7]">https://frant.app/api/v1/meta/data-deletion</code>; o (iii) Solicitud directa a <code>contacto@diazlab.online</code>.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    7. Derechos ARCO y Tiempos de Respuesta Legales
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Conforme a la Ley 1581 de 2012, cualquier titular puede conocer, actualizar o solicitar la supresión de sus datos. Las consultas se responden en un plazo legal máximo de <strong>10 días hábiles</strong> y los reclamos en <strong>15 días hábiles</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ia_transparency' && (
                        <div className="space-y-5">
                            <div className="border-b border-[#E2DFD7] pb-3 flex justify-between items-end flex-wrap gap-2">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-serif text-[#161616] font-normal uppercase tracking-wide m-0 flex items-center gap-2">
                                        <span>🤖</span> Transparencia en Inteligencia Artificial & OAuth
                                    </h3>
                                    <p className="text-xs text-[#6B6862] font-mono mt-1 mb-0">
                                        Declaración oficial de uso de Inteligencia Artificial y Políticas de Google Workspace APIs
                                    </p>
                                </div>
                                <a 
                                    href="/privacy" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-[#D9381E] hover:underline flex items-center gap-1"
                                >
                                    <span>https://frant.app/privacy</span>
                                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                </a>
                            </div>

                            <div className="space-y-2 bg-[#FAF8F3] p-5 border border-[#D9381E]/40 shadow-xs">
                                <h4 className="font-bold text-[#D9381E] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#D9381E] pl-2.5">
                                    1. Modelos de Lenguaje e IA Generativa
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Frant integra tecnologías de Inteligencia Artificial (incluyendo Google Gemini y OpenAI) para brindar agentes autónomos de WhatsApp, análisis de pedidos y respuestas de catálogo en tiempo real.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    2. Transparencia con el Cliente Final
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Los agentes conversacionales se identifican como asistentes virtuales del negocio respectivo, garantizando claridad ante el consumidor.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    3. Privacidad de Prompts y Cero Entrenamiento de Terceros
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Garantizamos que las conversaciones, inventarios y prompts de los clientes <strong>NUNCA se usan para re-entrenar modelos fundacionales públicos de IA</strong> ni se transfieren a terceros con fines de minería de datos.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#4285F4]/40 shadow-xs border-l-4 border-l-[#4285F4]">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0">
                                    <span className="material-symbols-outlined text-[16px] text-[#4285F4]">verified_user</span>
                                    4. Cumplimiento Google Workspace APIs — Prohibición de Entrenamiento IA/ML
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    En estricto apego a la <em>Google API Services User Data Policy</em> y las políticas de <em>Google Workspace APIs</em>:
                                </p>
                                <div className="bg-[#FAF8F3] border border-[#E2DFD7] p-3 mt-1 text-xs text-[#161616]">
                                    <em>"Frant does not use data obtained through Google Workspace APIs (including Gmail APIs) to develop, train, or improve generalized or non-personalized artificial intelligence (AI) and/or machine learning (ML) models."</em>
                                    <div className="text-[#555] mt-1">
                                        Frant no utiliza bajo ninguna circunstancia los datos obtenidos a través de las API de Google Workspace (incluidas las API de Gmail) para desarrollar, entrenar o mejorar modelos de inteligencia artificial (IA) y/o aprendizaje automático (ML) generalizados o no personalizados.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer del Modal - Wabi Sabi Actions */}
                <div className="bg-[#FAF8F3] px-6 py-4 border-t border-[#E2DFD7] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#6B6862]">
                    <div className="flex items-center gap-3">
                        <span>© 2026 Frant by Diaz Lab Automation • Barranquilla, Colombia.</span>
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline text-[#161616]">/terms</a>
                        <span>•</span>
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline text-[#161616]">/privacy</a>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-[#161616] hover:bg-[#D9381E] text-white font-semibold uppercase tracking-wider text-xs transition cursor-pointer shadow-sm border border-[#161616]"
                    >
                        Entendido & Aceptar
                    </button>
                </div>

            </div>
        </div>
    );
};
