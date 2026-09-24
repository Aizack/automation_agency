import { pool } from '../database/postgres';

async function activateAllClients() {
    try {
        console.log("Activando todas las tiendas/clientes en la base de datos...");
        const res = await pool.query(`UPDATE clients SET is_activated = TRUE WHERE is_activated IS NOT TRUE OR is_activated = FALSE;`);
        console.log(`✅ Se actualizaron ${res.rowCount} clientes a is_activated = TRUE.`);

        const empRes = await pool.query(`UPDATE employees SET is_active = TRUE WHERE is_active IS NOT TRUE;`);
        console.log(`✅ Se actualizaron ${empRes.rowCount} empleados a is_active = TRUE.`);

        process.exit(0);
    } catch (err) {
        console.error("Error activando clientes:", err);
        process.exit(1);
    }
}

activateAllClients();
