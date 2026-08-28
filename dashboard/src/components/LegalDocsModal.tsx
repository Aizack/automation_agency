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
        <div className="fixed inset-0 z-[99999] backdrop-blur-md bg-black/85 flex items-center justify-center p-4 sm:p-6 animate-fade-in font-['Montserrat',sans-serif]">
            <div className="bg-[#0e0e11] border border-[#d89e41]/30 w-full max-w-4xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-[#d89e41]/10 max-h-[90vh] flex flex-col justify-between text-left">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#d89e41]/10 rounded-2xl border border-[#d89e41]/30 text-[#d89e41]">
                            <span className="material-symbols-outlined text-[24px]">gavel</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-white">Marco Legal & Transparencia — Diaz Lab Automation</h2>
                            <p className="text-xs text-slate-400">Términos de servicio, protección de datos Habeas Data y declaración de uso de IA</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-full transition cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                {/* Subnav Pestañas Legales */}
                <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
                    <button
                        onClick={() => setActiveTab('terminos')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${activeTab === 'terminos' ? 'bg-[#d89e41] text-black shadow-lg shadow-[#d89e41]/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        Términos de Servicio
                    </button>

                    <button
                        onClick={() => setActiveTab('privacidad')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${activeTab === 'privacidad' ? 'bg-[#d89e41] text-black shadow-lg shadow-[#d89e41]/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                        Política de Privacidad (Habeas Data)
                    </button>

                    <button
                        onClick={() => setActiveTab('ia_transparency')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${activeTab === 'ia_transparency' ? 'bg-[#d89e41] text-black shadow-lg shadow-[#d89e41]/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                        Transparencia en Inteligencia Artificial (IA)
                    </button>
                </div>

                {/* Contenido del Documento Legal */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-slate-300 leading-relaxed font-['Inter',sans-serif]">
                    
                    {activeTab === 'terminos' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider text-[#d89e41]">
                                TÉRMINOS Y CONDICIONES GENERALES DE USO - DIAZ LAB AUTOMATION
                            </h3>
                            <p><strong>Última actualización:</strong> 27 de agosto de 2026</p>
                            
                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">1. ACEPTACIÓN DE LOS TÉRMINOS</h4>
                                <p>Al acceder, registrarse o utilizar la plataforma SaaS de Diaz Lab Automation (en adelante "la Plataforma"), operada a través de diazlab.online, el cliente ("el Usuario") acepta sin reservas los presentes Términos de Servicio. Si el Usuario no está de acuerdo con alguno de los términos, debe abstenerse de utilizar la Plataforma.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">2. DESCRIPCIÓN DEL SERVICIO</h4>
                                <p>Diaz Lab Automation provee una solución multi-inquilino de gestión empresarial (ERP), sistema de punto de venta (POS), comandero para restaurantes, emisión de facturas electrónicas en cumplimiento con las regulaciones fiscales (DIAN), integración con pasarelas de pago y agentes virtuales alimentados por Inteligencia Artificial para WhatsApp y canales digitales.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">3. CUENTAS, SEGURIDAD Y AISLAMIENTO DE DATOS</h4>
                                <p>Cada inquilino ("tenant") cuenta con un entorno aislado lógico mediante clave única (`client_id`). El Usuario es responsable de mantener la confidencialidad de sus credenciales de acceso. Las contraseñas se almacenan encriptadas mediante algoritmos `bcrypt` seguros.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">4. LIMITACIÓN DE RESPONSABILIDAD</h4>
                                <p>Diaz Lab Automation garantiza un uptime objetivo del 99.5%. No asumimos responsabilidad por interrupciones atribuibles a proveedores globales de internet, fallas en APIs de terceros (Meta WhatsApp API, OpenAI, Google) o fuerza mayor.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacidad' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider text-[#d89e41]">
                                POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES (HABEAS DATA LEY 1581)
                            </h3>
                            <p><strong>Última actualización:</strong> 27 de agosto de 2026</p>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">1. RESPONSABLE DEL TRATAMIENTO DE DATOS</h4>
                                <p>Diaz Lab Automation, con domicilio comercial en Colombia y Latinoamérica, es el responsable del tratamiento de los datos personales recolectados a través de su plataforma SaaS y canales de soporte.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">2. FINALIDAD DE LA RECOLECCIÓN</h4>
                                <p>Los datos solicitados (nombre de empresa, NIT, teléfono, correo electrónico, inventario y registros de facturación) se utilizan exclusivamente para la prestación del servicio contratado, facturación electrónica, envío de soporte técnico y optimización de las herramientas ERP.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">3. PROTECCIÓN DE DATOS DE PAGO Y PASARELAS</h4>
                                <p>Diaz Lab Automation utiliza procesadores de pago de terceros certificados PCI-DSS (Stripe, Wompi, MercadoPago). En ningún caso almacenamos en nuestros servidores datos de tarjetas de crédito o códigos CVV.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">4. DERECHOS ARCO (ACCESO, RECTIFICACIÓN, CANCELACIÓN Y OPOSICIÓN)</h4>
                                <p>Cualquier titular puede solicitar la rectificación, actualización o eliminación definitiva de sus datos personales enviando un correo a <strong>soporte@diazlab.online</strong>.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ia_transparency' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider text-[#d89e41]">
                                🤖 AVISO DE TRANSPARENCIA EN INTELIGENCIA ARTIFICIAL (AI DISCLOSURE)
                            </h3>
                            <p><strong>Declaración oficial de uso de IA en la Plataforma Diaz Lab:</strong></p>

                            <div className="space-y-3 bg-[#d89e41]/10 p-4 rounded-2xl border border-[#d89e41]/30">
                                <h4 className="font-bold text-[#fce188] text-xs">1. USO DE MODELOS DE LENGUAJE E IA GENERATIVA</h4>
                                <p>Informamos a todos nuestros usuarios e interlocutores que Diaz Lab Automation integra tecnologías avanzadas de Inteligencia Artificial (incluyendo la API de Google Gemini y OpenAI) para brindar agentes autónomos de WhatsApp, análisis inteligente de inventarios y recomendaciones financieras.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">2. TRANSPARENCIA AL CLIENTE FINAL</h4>
                                <p>Los agentes de IA configurados en WhatsApp para atender comandero, pedidos o citas se identifican abiertamente como asistentes virtuales inteligentes de la empresa correspondiente.</p>
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xs">3. PRIVACIDAD DE PROMPTS Y NO ENTRENAMIENTO DE TERCEROS</h4>
                                <p>Garantizamos que los datos operativos, recetas gastronómicas y conversaciones procesadas por nuestros agentes de IA <strong>no son vendidas ni utilizadas para entrenar modelos públicos de lenguaje</strong> de proveedores externos.</p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer del Modal */}
                <div className="border-t border-white/10 pt-4 flex justify-between items-center text-xs text-slate-400">
                    <span>© 2026 Diaz Lab Automation. Todos los derechos reservados.</span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-[#d89e41] hover:bg-[#e2b75f] text-black font-extrabold rounded-xl transition cursor-pointer shadow-md"
                    >
                        Entendido & Aceptar
                    </button>
                </div>

            </div>
        </div>
    );
};
