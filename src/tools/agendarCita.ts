import { pool } from '../database/postgres';

export const agendarCitaTool = {
    name: "agendar_cita",
    description: "Utiliza esta herramienta cuando el usuario pida agendar o reservar una cita en una fecha y hora específicas.",
    parameters: {
        type: "object",
        properties: {
            fecha: { 
                type: "string", 
                description: "La fecha de la cita en formato YYYY-MM-DD (ej. 2026-07-15)" 
            },
            hora: { 
                type: "string", 
                description: "La hora de la cita en formato HH:MM (ej. 14:30)" 
            },
            nombre: { 
                type: "string", 
                description: "El nombre completo del cliente que está agendando" 
            }
        },
        required: ["fecha", "hora", "nombre"]
    },
    execute: async (
        args: { fecha: string, hora: string, nombre: string }, 
        clientId?: string, 
        customerPhone?: string
    ) => {
        console.log(`[Tool Agendar Cita] 📅 Intentando agendar cita para ${args.nombre} el ${args.fecha} a las ${args.hora}`);
        
        const targetClientId = clientId || 'client_test_rag';
        const targetPhone = customerPhone || '3046247664';
        const timestamp = `${args.fecha}T${args.hora}:00`;

        try {
            await pool.query(
                `INSERT INTO appointments (client_id, customer_phone, customer_name, appointment_date, status) 
                 VALUES ($1, $2, $3, $4, 'confirmed')`,
                [targetClientId, targetPhone, args.nombre, timestamp]
            );
            console.log("[Tool Agendar Cita] ✅ Cita agendada e insertada en BD.");
            return `Éxito: Cita agendada para el ${args.fecha} a las ${args.hora} a nombre de ${args.nombre}.`;
        } catch (err: any) {
            console.error("[Tool Agendar Cita] Error insertando cita en BD:", err.message);
            throw new Error(`No se pudo agendar la cita en la base de datos: ${err.message}`);
        }
    }
};