import { pool } from '../database/postgres';
import { client, whatsappState } from './whatsapp';

/**
 * Helper delay function
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Formats a currency value to COP style
 */
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
};

/**
 * Checks the database for invoices that are due in 2 days or expired 2 days ago,
 * and sends template-based notifications via WhatsApp with a random delay queue.
 */
export const checkAndSendReminders = async (): Promise<void> => {
    console.log("[Scheduler] 🕒 Iniciando verificación de facturación y cobro de cartera...");

    if (!client || whatsappState.status !== 'CONNECTED') {
        console.warn("[Scheduler] ⚠️ El cliente de WhatsApp no está conectado. Postponiendo envíos.");
        return;
    }

    try {
        // 1. Obtener facturas que vencen en 2 días (y no se les ha enviado recordatorio)
        const remindersRes = await pool.query(`
            SELECT i.id, i.invoice_number, i.customer_name, i.customer_phone, i.total_amount, i.due_date, c.name as business_name
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE i.status = 'pending'
              AND i.reminder_sent = FALSE
              AND i.due_date <= NOW() + INTERVAL '2 days'
              AND i.due_date > NOW();
        `);

        // 2. Obtener facturas vencidas hace 2 días (y no se les ha notificado la mora)
        const overdueRes = await pool.query(`
            SELECT i.id, i.invoice_number, i.customer_name, i.customer_phone, i.total_amount, i.due_date, c.name as business_name
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE i.status IN ('pending', 'overdue')
              AND i.overdue_sent = FALSE
              AND i.due_date <= NOW() - INTERVAL '2 days';
        `);

        const queue: Array<{
            invoiceId: string;
            phone: string;
            message: string;
            type: 'reminder' | 'overdue';
        }> = [];

        // Llenar cola con recordatorios de vencimiento próximo
        remindersRes.rows.forEach(row => {
            const formattedDueDate = new Date(row.due_date).toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const formattedAmount = formatCurrency(parseFloat(row.total_amount));
            const message = `Hola ${row.customer_name}, te recordamos que tu cuenta ${row.invoice_number} por valor de ${formattedAmount} vence este ${formattedDueDate}. Recuerda que es importante tu pago para evitar reportes en las centrales de riesgo. ¡Que tengas un excelente día te desea ${row.business_name}!`;
            
            queue.push({
                invoiceId: row.id,
                phone: row.customer_phone,
                message,
                type: 'reminder'
            });
        });

        // Llenar cola con notificaciones de mora
        overdueRes.rows.forEach(row => {
            const formattedDueDate = new Date(row.due_date).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const formattedAmount = formatCurrency(parseFloat(row.total_amount));
            const message = `Hola ${row.customer_name}, te notificamos que tu cuenta ${row.invoice_number} por valor de ${formattedAmount} venció el ${formattedDueDate}. Por favor ponte al día a la brevedad para evitar recargos por mora o afectación en tu historial. ¡Que tengas un excelente día te desea ${row.business_name}!`;

            queue.push({
                invoiceId: row.id,
                phone: row.customer_phone,
                message,
                type: 'overdue'
            });
        });

        if (queue.length === 0) {
            console.log("[Scheduler] ✅ No hay recordatorios ni cobros pendientes por enviar hoy.");
            return;
        }

        console.log(`[Scheduler] 📨 Se encontraron ${queue.length} notificaciones en cola. Iniciando envíos con retraso humano...`);

        // Procesar cola con retraso humano (entre 30 y 60 segundos por mensaje)
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            const cleanPhone = item.phone.replace(/\D/g, '');
            const formattedPhone = `${cleanPhone}@c.us`;

            try {
                console.log(`[Scheduler] [${i+1}/${queue.length}] Enviando ${item.type} a +${cleanPhone}...`);
                
                await client.sendMessage(formattedPhone, item.message);
                
                // Actualizar DB sobre el estado enviado
                if (item.type === 'reminder') {
                    await pool.query(`UPDATE invoices SET reminder_sent = TRUE WHERE id = $1`, [item.invoiceId]);
                } else {
                    await pool.query(`
                        UPDATE invoices 
                        SET overdue_sent = TRUE, status = 'overdue' 
                        WHERE id = $1
                    `, [item.invoiceId]);
                }

                console.log(`[Scheduler] [${i+1}/${queue.length}] ✅ Enviado exitosamente.`);

            } catch (err: any) {
                console.error(`[Scheduler] ❌ Error enviando mensaje a +${cleanPhone}:`, err.message);
            }

            // Si no es el último mensaje, esperar retraso aleatorio para evitar baneo
            if (i < queue.length - 1) {
                const randomDelay = Math.floor(Math.random() * (60000 - 30000 + 1) + 30000); // 30s a 60s
                console.log(`[Scheduler] ⏳ Esperando ${Math.round(randomDelay/1000)} segundos antes del próximo envío...`);
                await delay(randomDelay);
            }
        }

        console.log("[Scheduler] 🎉 Procesamiento de cola completado.");

    } catch (error) {
        console.error("[Scheduler] ❌ Error ejecutando consultas de cobro de cartera:", error);
    }
};

/**
 * Starts the scheduler loop running once every hour.
 * It triggers checkAndSendReminders at 8:00 AM daily.
 */
export const startScheduler = (): void => {
    console.log("[Scheduler] ⏰ Scheduler de Cobro de Cartera iniciado.");
    
    let lastRunDate = '';

    // Intervalo de verificación cada 30 minutos
    setInterval(async () => {
        const now = new Date();
        const currentDateStr = now.toDateString(); // ej: "Tue Aug 04 2026"
        const currentHour = now.getHours();

        // Ejecutar si son las 8:00 AM (u 8:30 AM) y no se ha ejecutado hoy
        if (currentHour === 8 && lastRunDate !== currentDateStr) {
            lastRunDate = currentDateStr;
            await checkAndSendReminders();
        }
    }, 1800000); // 30 minutos en ms
};
