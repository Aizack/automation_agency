import { pool } from '../database/postgres';

interface AsignarTareaArgs {
    titulo: string;
    descripcion?: string;
    nombreEmpleado?: string; // e.g. "Juan"
    rolEmpleado?: string;    // e.g. "ventas", "puerta_a_puerta"
    diasPlazo?: number;       // plazo en días, ej: 2
}

export const asignarTareaTool = {
    execute: async (args: AsignarTareaArgs, clientId: string): Promise<string> => {
        const { titulo, descripcion, nombreEmpleado, rolEmpleado, diasPlazo = 1 } = args;
        try {
            const dueInterval = `${diasPlazo} days`;

            // Caso A: Asignar a un empleado específico buscando por nombre
            if (nombreEmpleado) {
                const empRes = await pool.query(
                    `SELECT id, name FROM employees 
                     WHERE client_id = $1 AND name ILIKE $2 AND is_active = TRUE LIMIT 1`,
                    [clientId, `%${nombreEmpleado}%`]
                );

                if (empRes.rows.length === 0) {
                    return `⚠️ Error: No se encontró ningún empleado activo con el nombre '${nombreEmpleado}' en este negocio.`;
                }

                const emp = empRes.rows[0];

                await pool.query(
                    `INSERT INTO employee_tasks (client_id, employee_id, title, description, due_date, status)
                     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${dueInterval}', 'pendiente')`,
                    [clientId, emp.id, titulo, descripcion || null]
                );

                return `✅ Tarea '${titulo}' asignada exitosamente a ${emp.name}. Plazo de entrega: ${diasPlazo} día(s).`;
            }

            // Caso B: Asignar a todos los empleados de un rol o departamento específico
            if (rolEmpleado) {
                const empsRes = await pool.query(
                    `SELECT id, name FROM employees 
                     WHERE client_id = $1 AND role = $2 AND is_active = TRUE`,
                    [clientId, rolEmpleado]
                );

                if (empsRes.rows.length === 0) {
                    return `⚠️ Error: No se encontraron empleados activos con el rol/departamento '${rolEmpleado}'.`;
                }

                let count = 0;
                for (const emp of empsRes.rows) {
                    await pool.query(
                        `INSERT INTO employee_tasks (client_id, employee_id, title, description, due_date, status)
                         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${dueInterval}', 'pendiente')`,
                        [clientId, emp.id, titulo, descripcion || null]
                    );
                    count++;
                }

                return `✅ Tarea '${titulo}' asignada exitosamente a los ${count} empleados del rol/departamento '${rolEmpleado}'.`;
            }

            return `⚠️ Error: Debes especificar el nombre de un empleado o un rol/departamento destino para asignar la tarea.`;
        } catch (err: any) {
            console.error("[Tool AsignarTarea] Error:", err);
            return `⚠️ Error asignando la tarea: ${err.message}`;
        }
    }
};
