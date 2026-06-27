/**
 * Herramienta (Tool) para que el Agente pueda agendar citas.
 * Se expone como una función que el LLM (ej. Claude/OpenAI) puede decidir llamar.
 */
export const agendarCitaTool = {
    name: "agendar_cita",
    description: "Utiliza esta herramienta cuando el usuario pida agendar o reservar una cita en una fecha y hora específicas.",
    parameters: {
        type: "object",
        properties: {
            fecha: { type: "string", description: "La fecha solicitada por el usuario (ej. 2024-11-20)" },
            hora: { type: "string", description: "La hora solicitada (ej. 15:30)" }
        },
        required: ["fecha", "hora"]
    },
    execute: async (args: { fecha: string, hora: string }) => {
        console.log(`[Tool Ejecutada] 📅 Intentando agendar cita para el ${args.fecha} a las ${args.hora}`);
        // Aquí iría la lógica para conectar con el calendario de Google / Calendly del cliente
        return `Éxito: Cita agendada para el ${args.fecha} a las ${args.hora}.`;
    }
};