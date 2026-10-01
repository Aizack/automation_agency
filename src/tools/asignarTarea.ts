import { ERPBridgeService } from '../services/erpBridgeService';

interface AsignarTareaArgs {
    titulo: string;
    descripcion?: string;
    nombreEmpleado?: string;
    rolEmpleado?: string;
    diasPlazo?: number;
}

export const asignarTareaTool = {
    execute: async (args: AsignarTareaArgs, clientId: string): Promise<string> => {
        try {
            const result = await ERPBridgeService.asignarTarea(clientId, args);
            if (!result.success) {
                return `⚠️ Error asignando la tarea: ${result.error}`;
            }

            return `✅ Tarea '${result.titulo}' asignada exitosamente a ${result.asignadoA}. Fecha de entrega: ${result.fechaEntrega}.`;
        } catch (err: any) {
            console.error("[Tool AsignarTarea] Error:", err);
            return `⚠️ Error asignando la tarea: ${err.message}`;
        }
    }
};
