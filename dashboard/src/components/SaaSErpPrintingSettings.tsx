import React, { useState, useEffect } from 'react';
import { 
    checkPrintAgentStatus, 
    printTestLabelViaAgent, 
    triggerProtocolPrint,
    getSavedThermalPrinter, 
    setSavedThermalPrinter, 
    AGENT_DOWNLOAD_URL, 
    type AgentPrinter 
} from '../utils/frantPrintClient';

export const SaaSErpPrintingSettings: React.FC = () => {
    const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
    const [agentVersion, setAgentVersion] = useState<string>('');
    const [printers, setPrinters] = useState<AgentPrinter[]>([]);
    const [selectedLabelPrinter, setSelectedLabelPrinter] = useState<string>(getSavedThermalPrinter());
    const [selectedReceiptPrinter, setSelectedReceiptPrinter] = useState<string>(() => localStorage.getItem('frant_receipt_printer_name') || '');
    const [checking, setChecking] = useState(false);
    const [testingLabel, setTestingLabel] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const checkStatus = async () => {
        setChecking(true);
        setTestResult(null);
        try {
            const res = await checkPrintAgentStatus();
            setAgentOnline(res.online);
            setAgentVersion(res.version || '1.0.0');
            setPrinters(res.printers);

            if (res.online && res.printers.length > 0) {
                // Auto-seleccionar impresora de etiquetas si no hay una guardada
                if (!selectedLabelPrinter || !res.printers.some(p => p.name === selectedLabelPrinter)) {
                    const bestLabel = res.printers.find(p => /etiqueta|barcode|3b-365|tsc/i.test(p.name)) || res.printers[0];
                    setSelectedLabelPrinter(bestLabel.name);
                    setSavedThermalPrinter(bestLabel.name);
                }

                // Auto-seleccionar impresora de recibos si no hay una guardada
                if (!selectedReceiptPrinter || !res.printers.some(p => p.name === selectedReceiptPrinter)) {
                    const bestReceipt = res.printers.find(p => /pos|80|receipt|ticket/i.test(p.name));
                    if (bestReceipt) {
                        setSelectedReceiptPrinter(bestReceipt.name);
                        localStorage.setItem('frant_receipt_printer_name', bestReceipt.name);
                    }
                }
            }
        } catch {
            setAgentOnline(false);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const handleSelectLabelPrinter = (name: string) => {
        setSelectedLabelPrinter(name);
        setSavedThermalPrinter(name);
    };

    const handleSelectReceiptPrinter = (name: string) => {
        setSelectedReceiptPrinter(name);
        localStorage.setItem('frant_receipt_printer_name', name);
    };

    const handleDirectProtocolTest = () => {
        triggerProtocolPrint('test', null, selectedLabelPrinter);
    };

    const handleTestPrint = async () => {
        if (!selectedLabelPrinter) {
            alert('Por favor selecciona una impresora de etiquetas primero.');
            return;
        }
        setTestingLabel(true);
        setTestResult(null);
        try {
            const res = await printTestLabelViaAgent(selectedLabelPrinter);
            setTestResult(res);
        } catch (err: any) {
            setTestResult({ success: false, message: 'No se pudo enviar la prueba al agente.' });
        } finally {
            setTestingLabel(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in text-left">
            {/* Header de la sección */}
            <div className="bg-white border border-[#E2DFD7] p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2DFD7] pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[24px] text-[#D9381E]">print</span>
                            <h2 className="font-serif text-2xl text-[#161616] font-normal">
                                Estación de Impresión Térmica
                            </h2>
                        </div>
                        <p className="text-xs text-[#6B6862] font-mono mt-1">
                            Control absoluto de cabezal térmico TSPL & ESC/POS en Windows sin pasar por el navegador.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {agentOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0FDF4] border border-[#BBF7D0] text-emerald-900 text-xs font-mono font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                AGENTE ACTIVO (v{agentVersion})
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA] text-red-900 text-xs font-mono font-bold">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                AGENTE NO DETECTADO
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={checkStatus}
                            disabled={checking}
                            className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#EAE7DE] border border-[#E2DFD7] text-[#161616] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                            title="Verificar conexión local con http://127.0.0.1:19890"
                        >
                            <span className={`material-symbols-outlined text-[16px] ${checking ? 'animate-spin' : ''}`}>
                                refresh
                            </span>
                            {checking ? 'Verificando...' : 'Verificar'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDirectProtocolTest}
                            className="px-3 py-1.5 bg-[#D9381E] hover:bg-[#B82E17] text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Dispara la impresión directamente a Windows (funciona incluso con VPN o sin HTTP)"
                        >
                            <span className="material-symbols-outlined text-[16px]">bolt</span>
                            Imprimir Prueba Directa
                        </button>
                    </div>
                </div>

                {/* Hero Card de Descarga */}
                <div className="mt-6 bg-[#FAF8F5] border border-[#E2DFD7] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-8 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-[#D9381E] text-white px-2 py-0.5 font-mono font-bold tracking-wider uppercase">
                                Software Oficial Windows
                            </span>
                            <span className="text-xs text-[#6B6862] font-mono">
                                64-bit • v1.0.0 • 8.6 MB
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#161616] font-mono">
                            Frant Print Agent para Windows
                        </h3>
                        <p className="text-xs text-[#6B6862] leading-relaxed">
                            Servicio ultra-liviano que se ejecuta en segundo plano en la máquina de la caja. 
                            Toma las órdenes de impresión del ERP y las envía <strong>directamente al cabezal térmico por USB</strong> mediante la API de Windows (<code className="bg-[#EAE7DE] px-1 text-[#161616]">winspool.drv</code> en modo RAW), 
                            eliminando al 100% los cuadros de diálogo, márgenes de Firefox/Chrome y problemas de escala.
                        </p>
                    </div>

                    <div className="lg:col-span-4 flex flex-col items-stretch sm:items-end justify-center gap-2">
                        <a
                            href={AGENT_DOWNLOAD_URL}
                            download="FrantPrintAgent.exe"
                            className="px-5 py-3 bg-[#161616] hover:bg-[#333] text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition no-underline text-center cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px] text-[#D9381E]">download</span>
                            Descargar Agente (.exe)
                        </a>
                        <span className="text-[10px] text-[#76746E] font-mono text-center sm:text-right">
                            Sin instalador complejo • 1 solo archivo ejecutable
                        </span>
                    </div>
                </div>

                {/* Instrucciones de Instalación en 3 Pasos */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#E2DFD7] pt-5">
                    <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#161616]">
                            <span className="w-5 h-5 rounded-full bg-[#161616] text-white flex items-center justify-center text-[10px]">1</span>
                            Descargar en el PC
                        </div>
                        <p className="text-[11px] text-[#6B6862] leading-normal">
                            Haz clic en el botón negro de arriba y guarda el archivo <strong className="text-[#161616]">FrantPrintAgent.exe</strong> en tu computador de caja o mostrador.
                        </p>
                    </div>

                    <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#161616]">
                            <span className="w-5 h-5 rounded-full bg-[#161616] text-white flex items-center justify-center text-[10px]">2</span>
                            Ejecutar una vez
                        </div>
                        <p className="text-[11px] text-[#6B6862] leading-normal">
                            Doble clic sobre el archivo descargado. Windows abrirá una pequeña ventana negra que detectará tus impresoras térmicas en 1 segundo.
                        </p>
                    </div>

                    <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#161616]">
                            <span className="w-5 h-5 rounded-full bg-[#161616] text-white flex items-center justify-center text-[10px]">3</span>
                            Listo para Imprimir
                        </div>
                        <p className="text-[11px] text-[#6B6862] leading-normal">
                            Vuelve al ERP. Cada vez que des clic en "Imprimir", el papel saldrá al instante en 50 milisegundos sin ventanas emergentes.
                        </p>
                    </div>
                </div>
            </div>

            {/* Panel de Configuración de Impresoras (Cuando el agente está en línea) */}
            <div className="bg-white border border-[#E2DFD7] p-6 shadow-xs space-y-5">
                <div className="border-b border-[#E2DFD7] pb-3">
                    <h3 className="font-mono font-bold text-sm text-[#161616] uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#D9381E]">tune</span>
                        Asignación de Impresoras en este Equipo
                    </h3>
                    <p className="text-xs text-[#6B6862] mt-0.5">
                        Define qué impresora física de Windows debe recibir cada tipo de trabajo.
                    </p>
                </div>

                {agentOnline ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Impresora de Etiquetas */}
                            <div className="space-y-2 bg-[#FAF8F5] border border-[#E2DFD7] p-4">
                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#161616] flex items-center justify-between">
                                    <span>🏷️ Impresora de Etiquetas (Barcodes)</span>
                                    <span className="text-[10px] text-[#D9381E] font-normal">TSPL Nativo</span>
                                </label>
                                <select
                                    value={selectedLabelPrinter}
                                    onChange={(e) => handleSelectLabelPrinter(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs font-mono font-bold text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                                >
                                    {printers.map((p) => (
                                        <option key={p.name} value={p.name}>
                                            {p.name} ({p.driver} • {p.port})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[#76746E]">
                                    Recomendado: 4BARCODE 3B-365B, TSC TTP-244, Xprinter XP-365B.
                                </p>
                            </div>

                            {/* Impresora de Recibos POS */}
                            <div className="space-y-2 bg-[#FAF8F5] border border-[#E2DFD7] p-4">
                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#161616] flex items-center justify-between">
                                    <span>🧾 Impresora de Tirilla / Factura POS</span>
                                    <span className="text-[10px] text-emerald-700 font-normal">ESC/POS</span>
                                </label>
                                <select
                                    value={selectedReceiptPrinter}
                                    onChange={(e) => handleSelectReceiptPrinter(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs font-mono font-bold text-[#161616] outline-none focus:border-[#161616] cursor-pointer"
                                >
                                    <option value="">-- Sin asignar --</option>
                                    {printers.map((p) => (
                                        <option key={p.name} value={p.name}>
                                            {p.name} ({p.driver} • {p.port})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[#76746E]">
                                    Recomendado: POS-80C, Epson TM-T20, Bixolon, Xprinter 80mm.
                                </p>
                            </div>
                        </div>

                        {/* Botón de Prueba en Vivo */}
                        <div className="border-t border-[#E2DFD7] pt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-[#6B6862]">
                                Prueba la comunicación enviando una fila de prueba real a tu impresora seleccionada.
                            </div>
                            <button
                                type="button"
                                onClick={handleTestPrint}
                                disabled={testingLabel || !selectedLabelPrinter}
                                className="px-5 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined text-[16px] ${testingLabel ? 'animate-spin' : ''}`}>
                                    {testingLabel ? 'refresh' : 'print'}
                                </span>
                                {testingLabel ? 'Imprimiendo Prueba...' : 'Imprimir Etiqueta de Prueba'}
                            </button>
                        </div>

                        {testResult && (
                            <div className={`p-3 text-xs font-mono font-bold border ${
                                testResult.success 
                                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-emerald-900' 
                                    : 'bg-[#FEF2F2] border-[#FECACA] text-red-900'
                            }`}>
                                {testResult.success ? '✓ ' : '✗ '} {testResult.message}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 bg-[#FAF8F5] border border-dashed border-[#E2DFD7] text-center space-y-3">
                        <span className="material-symbols-outlined text-4xl text-[#76746E]">
                            sensors_off
                        </span>
                        <div className="max-w-md mx-auto space-y-1">
                            <h4 className="font-bold text-sm text-[#161616]">
                                El Agente Local no está en ejecución en este PC
                            </h4>
                            <p className="text-xs text-[#6B6862]">
                                Para listar tus impresoras térmicas y calibrar la estación, descarga y abre <strong className="text-[#161616]">FrantPrintAgent.exe</strong> en este computador.
                            </p>
                        </div>
                        <div className="pt-2">
                            <a
                                href={AGENT_DOWNLOAD_URL}
                                download="FrantPrintAgent.exe"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#161616] text-white text-xs font-bold uppercase font-mono tracking-wider no-underline shadow-2xs hover:bg-[#333]"
                            >
                                <span className="material-symbols-outlined text-[15px]">download</span>
                                Descargar FrantPrintAgent.exe
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Comparativa Técnica */}
            <div className="bg-white border border-[#E2DFD7] p-6 shadow-xs space-y-3">
                <h3 className="font-mono font-bold text-sm text-[#161616] uppercase tracking-wider">
                    ¿Por qué usar el Agente Local frente a la Impresión de Navegador?
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                            <tr className="border-b border-[#E2DFD7] text-[#76746E] uppercase">
                                <th className="p-2">Característica</th>
                                <th className="p-2 text-emerald-800 bg-[#F0FDF4]">Con Frant Print Agent (Recomendado)</th>
                                <th className="p-2 text-red-800 bg-[#FEF2F2]">Modo Navegador Web Estándar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2DFD7]">
                            <tr>
                                <td className="p-2 font-bold text-[#161616]">Velocidad de Salida</td>
                                <td className="p-2 bg-[#F0FDF4] text-emerald-900 font-bold">~50 milisegundos (Instantáneo)</td>
                                <td className="p-2 bg-[#FEF2F2] text-red-900">1.5 a 3 segundos (Lento)</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-bold text-[#161616]">Cuadros de Diálogo</td>
                                <td className="p-2 bg-[#F0FDF4] text-emerald-900 font-bold">Cero cuadros (Impresión Silenciosa)</td>
                                <td className="p-2 bg-[#FEF2F2] text-red-900">Abre diálogo de Firefox/Chrome</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-bold text-[#161616]">Precisión Milimétrica</td>
                                <td className="p-2 bg-[#F0FDF4] text-emerald-900 font-bold">100% Exacto (203 DPI directo a micras)</td>
                                <td className="p-2 bg-[#FEF2F2] text-red-900">Sujeto a zoom de pantalla y escala 94%</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-bold text-[#161616]">Desconfiguración Humana</td>
                                <td className="p-2 bg-[#F0FDF4] text-emerald-900 font-bold">Imposible (Manda coordenadas fijas)</td>
                                <td className="p-2 bg-[#FEF2F2] text-red-900">Alta (Si mueven márgenes o escala)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
