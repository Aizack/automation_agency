import type { PrintItem } from './barcodePrinter';

export const AGENT_URL = 'http://127.0.0.1:19890';
export const AGENT_DOWNLOAD_URL = '/FrantPrintAgent.exe';

export interface AgentPrinter {
    name: string;
    driver: string;
    port: string;
    status: number;
}

export interface AgentStatusResponse {
    online: boolean;
    service?: string;
    version?: string;
    printers: AgentPrinter[];
}

export const checkPrintAgentStatus = async (): Promise<AgentStatusResponse> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${AGENT_URL}/status`, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            return {
                online: true,
                service: data.service,
                version: data.version,
                printers: data.printers || []
            };
        }
        return { online: false, printers: [] };
    } catch (err) {
        console.warn('[FrantPrintClient] Agent offline o bloqueado:', err);
        return { online: false, printers: [] };
    }
};

export const getSavedThermalPrinter = (): string => {
    return localStorage.getItem('frant_thermal_printer_name') || '';
};

export const setSavedThermalPrinter = (name: string): void => {
    localStorage.setItem('frant_thermal_printer_name', name);
};

export const printDirectLabelsViaAgent = async (
    items: PrintItem[],
    targetPrinter?: string
): Promise<{ success: boolean; message: string }> => {
    const printer = targetPrinter || getSavedThermalPrinter() || undefined;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${AGENT_URL}/print/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                printer,
                items
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const json = await res.json();
        if (res.ok && json.success) {
            return { success: true, message: json.message || 'Etiquetas impresas con éxito.' };
        }
        return { success: false, message: json.error || 'Error al imprimir en el agente.' };
    } catch (err: any) {
        return { success: false, message: 'No se pudo conectar con Frant Print Agent.' };
    }
};

export const printTestLabelViaAgent = async (
    targetPrinter?: string
): Promise<{ success: boolean; message: string }> => {
    const printer = targetPrinter || getSavedThermalPrinter() || undefined;

    try {
        const res = await fetch(`${AGENT_URL}/test-label`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ printer })
        });
        const json = await res.json();
        return {
            success: Boolean(json.success),
            message: json.message || json.error || ''
        };
    } catch (err: any) {
        return { success: false, message: 'Agente no disponible.' };
    }
};
