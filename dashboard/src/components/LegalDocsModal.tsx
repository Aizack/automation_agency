import React, { useState } from 'react';

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
                                Diaz Lab Automation — Términos de servicio, Habeas Data y declaración de IA
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-[#6B6862] hover:text-[#161616] hover:bg-[#E2DFD7]/50 p-2 rounded-md transition cursor-pointer flex items-center justify-center"
                        title="Cerrar modal"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
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
                            <div className="border-b border-[#E2DFD7] pb-3">
                                <h3 className="text-xl sm:text-2xl font-serif text-[#161616] font-normal uppercase tracking-wide m-0">
                                    Términos y Condiciones Generales de Uso
                                </h3>
                                <p className="text-xs text-[#6B6862] font-mono mt-1 mb-0">
                                    Última actualización: 27 de agosto de 2026
                                </p>
                            </div>
                            
                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    1. Aceptación de los Términos
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Al acceder, registrarse o utilizar la plataforma SaaS de Diaz Lab Automation (en adelante "la Plataforma"), operada a través de diazlab.online, el cliente ("el Usuario") acepta sin reservas los presentes Términos de Servicio. Si el Usuario no está de acuerdo con alguno de los términos, debe abstenerse de utilizar la Plataforma.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    2. Descripción del Servicio
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Diaz Lab Automation provee una solución multi-inquilino de gestión empresarial (ERP), sistema de punto de venta (POS), comandero para restaurantes, emisión de facturas electrónicas en cumplimiento con las regulaciones fiscales (DIAN), integración con pasarelas de pago y agentes virtuales alimentados por Inteligencia Artificial para WhatsApp y canales digitales.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    3. Cuentas, Seguridad y Aislamiento de Datos
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Cada inquilino ("tenant") cuenta con un entorno aislado lógico mediante clave única (<code className="font-mono bg-[#FAF8F3] px-1.5 py-0.5 border border-[#E2DFD7] text-[#D9381E]">client_id</code>). El Usuario es responsable de mantener la confidencialidad de sus credenciales de acceso. Las contraseñas se almacenan encriptadas mediante algoritmos seguros bcrypt.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    4. Limitación de Responsabilidad
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Diaz Lab Automation garantiza un uptime objetivo del 99.5%. No asumimos responsabilidad por interrupciones atribuibles a proveedores globales de internet, fallas en APIs de terceros (Meta WhatsApp API, OpenAI, Google) o fuerza mayor.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacidad' && (
                        <div className="space-y-5">
                            <div className="border-b border-[#E2DFD7] pb-3">
                                <h3 className="text-xl sm:text-2xl font-serif text-[#161616] font-normal uppercase tracking-wide m-0">
                                    Política de Tratamiento de Datos Personales
                                </h3>
                                <p className="text-xs text-[#6B6862] font-mono mt-1 mb-0">
                                    Habeas Data Ley 1581 • Última actualización: 27 de agosto de 2026
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    1. Responsable del Tratamiento de Datos
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Diaz Lab Automation, con domicilio comercial en Colombia y Latinoamérica, es el responsable del tratamiento de los datos personales recolectados a través de su plataforma SaaS y canales de soporte.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    2. Finalidad de la Recolección
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Los datos solicitados (nombre de empresa, NIT, teléfono, correo electrónico, inventario y registros de facturación) se utilizan exclusivamente para la prestación del servicio contratado, facturación electrónica, envío de soporte técnico y optimización de las herramientas ERP.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    3. Protección de Datos de Pago y Pasarelas
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Diaz Lab Automation utiliza procesadores de pago de terceros certificados PCI-DSS (Stripe, Wompi, MercadoPago). En ningún caso almacenamos en nuestros servidores datos de tarjetas de crédito o códigos CVV.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    4. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Cualquier titular puede solicitar la rectificación, actualización o eliminación definitiva de sus datos personales enviando un correo a <strong className="text-[#161616]">soporte@diazlab.online</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ia_transparency' && (
                        <div className="space-y-5">
                            <div className="border-b border-[#E2DFD7] pb-3">
                                <h3 className="text-xl sm:text-2xl font-serif text-[#161616] font-normal uppercase tracking-wide m-0 flex items-center gap-2">
                                    <span>🤖</span> Transparencia en Inteligencia Artificial
                                </h3>
                                <p className="text-xs text-[#6B6862] font-mono mt-1 mb-0">
                                    Declaración oficial de uso de Inteligencia Artificial (AI Disclosure)
                                </p>
                            </div>

                            <div className="space-y-2 bg-[#FAF8F3] p-5 border border-[#D9381E]/40 shadow-xs">
                                <h4 className="font-bold text-[#D9381E] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#D9381E] pl-2.5">
                                    1. Uso de Modelos de Lenguaje e IA Generativa
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Informamos a todos nuestros usuarios e interlocutores que Diaz Lab Automation integra tecnologías avanzadas de Inteligencia Artificial (incluyendo la API de Google Gemini y OpenAI) para brindar agentes autónomos de WhatsApp, análisis inteligente de inventarios y recomendaciones financieras.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    2. Transparencia al Cliente Final
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Los agentes de IA configurados en WhatsApp para atender comandero, pedidos o citas se identifican abiertamente como asistentes virtuales inteligentes de la empresa correspondiente.
                                </p>
                            </div>

                            <div className="space-y-2 bg-white p-5 border border-[#E2DFD7] shadow-xs">
                                <h4 className="font-bold text-[#161616] text-xs uppercase tracking-wider flex items-center gap-2 m-0 border-l-2 border-[#161616] pl-2.5">
                                    3. Privacidad de Prompts y No Entrenamiento de Terceros
                                </h4>
                                <p className="text-[#333333] text-xs sm:text-[0.83rem] m-0 pt-1 leading-relaxed">
                                    Garantizamos que los datos operativos, recetas gastronómicas y conversaciones procesadas por nuestros agentes de IA <strong className="text-[#161616]">no son vendidas ni utilizadas para entrenar modelos públicos de lenguaje</strong> de proveedores externos.
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer del Modal - Wabi Sabi Actions */}
                <div className="bg-[#FAF8F3] px-6 py-4 border-t border-[#E2DFD7] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#6B6862]">
                    <span>© 2026 Diaz Lab Automation • Todos los derechos reservados.</span>
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

