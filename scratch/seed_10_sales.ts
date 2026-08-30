import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://agency_user:agency_password@localhost:5432/agency_db'
});

async function seed10Sales() {
    const clientId = 'client_test_optica';
    console.log(`[Seed Script] Iniciando siembra de Examen de Vista y 10 Ventas Realistas para cliente: ${clientId}...`);

    try {
        // 2. Crear o actualizar producto Servicio "Examen de Vista / Consulta Optométrica"
        const serviceProdRes = await pool.query(
            `INSERT INTO products (
                client_id, name, sku, description, price, stock, cost_price, min_stock, product_type
             ) VALUES (
                $1, 'Examen de Vista / Consulta Optométrica', 'SERV-EXAM-01', 
                'Examen clínico de agudeza visual, refracción computarizada y diagnóstico de patologías oculares básicas.', 
                40000.00, 999999, 0.00, 0, 'service'
             )
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [clientId]
        );

        let examProdId = serviceProdRes.rows[0]?.id;
        if (!examProdId) {
            const existingExam = await pool.query(`SELECT id FROM products WHERE client_id = $1 AND sku = 'SERV-EXAM-01' LIMIT 1`, [clientId]);
            examProdId = existingExam.rows[0]?.id;
        }

        // 3. Crear productos de prueba físicos (Monturas, Lentes, Limpiadores)
        const productsData = [
            { name: 'Montura Ray-Ban RB5154 Clubmaster', sku: 'OPT-RB5154', price: 350000, cost: 180000, stock: 15, brand: 'Ray-Ban', type: 'product' },
            { name: 'Lentes Progresivos Varilux Comfort Max', sku: 'LENT-PROG-01', price: 250000, cost: 120000, stock: 30, brand: 'Essilor', type: 'product' },
            { name: 'Lentes de Contacto Freshlook Colors (Par)', sku: 'LC-FRESH-01', price: 120000, cost: 60000, stock: 25, brand: 'Alcon', type: 'product' },
            { name: 'Montura Oakley Holbrook RX', sku: 'OPT-OAK-01', price: 280000, cost: 140000, stock: 10, brand: 'Oakley', type: 'product' },
            { name: 'Lentes Anti-Reflejo BlueFree AR', sku: 'LENT-AR-01', price: 100000, cost: 40000, stock: 50, brand: 'BlueFree', type: 'product' },
            { name: 'Líquido Limpiador para Lentes Spray 60ml', sku: 'ACC-CLEAN-60', price: 15000, cost: 5000, stock: 100, brand: 'OptiClean', type: 'product' },
            { name: 'Estuche Rígido con Paño Microfibra', sku: 'ACC-CASE-01', price: 10000, cost: 3000, stock: 80, brand: 'Generico', type: 'product' },
            { name: 'Montura Vogue VO5352', sku: 'OPT-VOGUE-01', price: 210000, cost: 95000, stock: 12, brand: 'Vogue', type: 'product' },
            { name: 'Lentes Bifocales Invisibles Polycarbonate', sku: 'LENT-BIF-01', price: 180000, cost: 80000, stock: 20, brand: 'PolyLens', type: 'product' },
            { name: 'Montura Gucci GG0061O', sku: 'OPT-GUCCI-01', price: 420000, cost: 220000, stock: 8, brand: 'Gucci', type: 'product' }
        ];

        const insertedProducts: any = {};
        for (const p of productsData) {
            const pRes = await pool.query(
                `INSERT INTO products (client_id, name, sku, price, cost_price, stock, min_stock, brand, product_type)
                 VALUES ($1, $2, $3, $4, $5, $6, 3, $7, $8)
                 ON CONFLICT DO NOTHING
                 RETURNING id`,
                [clientId, p.name, p.sku, p.price, p.cost, p.stock, p.brand, p.type]
            );
            let pId = pRes.rows[0]?.id;
            if (!pId) {
                const ex = await pool.query(`SELECT id FROM products WHERE client_id = $1 AND sku = $2 LIMIT 1`, [clientId, p.sku]);
                pId = ex.rows[0]?.id;
            }
            insertedProducts[p.sku] = pId;
        }

        // 4. Crear Clientes CRM de prueba
        const customers = [
            { name: 'Alejandro Morales', phone: '+573001234567', doc: '1012345678', email: 'alejandro.morales@gmail.com' },
            { name: 'María Fernanda Gómez', phone: '+573159876543', doc: '1098765432', email: 'mafe.gomez@hotmail.com' },
            { name: 'Carlos Eduardo Ramírez', phone: '+573104567890', doc: '80123456', email: 'carlos.ramirez@yahoo.com' },
            { name: 'Diana Patricia Torres', phone: '+573208765432', doc: '52987654', email: 'diana.torres@outlook.com' },
            { name: 'Santiago Restrepo', phone: '+573182345678', doc: '1025896314', email: 'santiago.restrepo@gmail.com' }
        ];

        const insertedCustomers: any[] = [];
        for (const c of customers) {
            const cRes = await pool.query(
                `INSERT INTO crm_customers (client_id, name, phone, document_number, email)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (client_id, document_number) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id, name, phone, document_number, email`,
                [clientId, c.name, c.phone, c.doc, c.email]
            );
            insertedCustomers.push(cRes.rows[0]);
        }

        // 5. Crear 10 Facturas Reales con Ítems, Trabajos de Laboratorio y Audit Logs
        const salesList = [
            {
                num: 'FAC-00101',
                customer: insertedCustomers[0],
                items: [{ id: examProdId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000 }],
                payment: 'efectivo',
                total: 40000,
                status: 'paid',
                needsLab: false
            },
            {
                num: 'FAC-00102',
                customer: insertedCustomers[1],
                items: [
                    { id: insertedProducts['OPT-RB5154'], name: 'Montura Ray-Ban RB5154 Clubmaster', qty: 1, price: 350000 },
                    { id: insertedProducts['LENT-PROG-01'], name: 'Lentes Progresivos Varilux Comfort Max', qty: 1, price: 250000 }
                ],
                payment: 'tarjeta',
                total: 600000,
                status: 'paid',
                needsLab: true,
                lensDesign: 'Progresivo Varilux',
                lensMat: 'Polycarbonate',
                lensTreat: 'Anti-Reflejo Crizal'
            },
            {
                num: 'FAC-00103',
                customer: insertedCustomers[2],
                items: [{ id: examProdId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000 }],
                payment: 'transferencia',
                total: 40000,
                status: 'paid',
                needsLab: false
            },
            {
                num: 'FAC-00104',
                customer: insertedCustomers[3],
                items: [{ id: insertedProducts['LC-FRESH-01'], name: 'Lentes de Contacto Freshlook Colors (Par)', qty: 1, price: 120000 }],
                payment: 'efectivo',
                total: 120000,
                status: 'paid',
                needsLab: false
            },
            {
                num: 'FAC-00105',
                customer: insertedCustomers[4],
                items: [
                    { id: insertedProducts['OPT-OAK-01'], name: 'Montura Oakley Holbrook RX', qty: 1, price: 280000 },
                    { id: insertedProducts['LENT-AR-01'], name: 'Lentes Anti-Reflejo BlueFree AR', qty: 1, price: 100000 }
                ],
                payment: 'efectivo',
                total: 380000,
                status: 'paid',
                needsLab: true,
                lensDesign: 'Monofocal Digital',
                lensMat: 'CR-39',
                lensTreat: 'Filtro Azul BlueFree'
            },
            {
                num: 'FAC-00106',
                customer: insertedCustomers[0],
                items: [
                    { id: insertedProducts['ACC-CLEAN-60'], name: 'Líquido Limpiador para Lentes Spray 60ml', qty: 1, price: 15000 },
                    { id: insertedProducts['ACC-CASE-01'], name: 'Estuche Rígido con Paño Microfibra', qty: 1, price: 10000 }
                ],
                payment: 'efectivo',
                total: 25000,
                status: 'paid',
                needsLab: false
            },
            {
                num: 'FAC-00107',
                customer: insertedCustomers[1],
                items: [
                    { id: insertedProducts['OPT-VOGUE-01'], name: 'Montura Vogue VO5352', qty: 1, price: 210000 },
                    { id: insertedProducts['LENT-BIF-01'], name: 'Lentes Bifocales Invisibles Polycarbonate', qty: 1, price: 180000 }
                ],
                payment: 'tarjeta',
                total: 390000,
                status: 'paid',
                needsLab: true,
                lensDesign: 'Bifocal Invisible',
                lensMat: 'Polycarbonate',
                lensTreat: 'Super Hydrophobic'
            },
            {
                num: 'FAC-00108',
                customer: insertedCustomers[2],
                items: [{ id: examProdId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000 }],
                payment: 'efectivo',
                total: 40000,
                status: 'paid',
                needsLab: false
            },
            {
                num: 'FAC-00109',
                customer: insertedCustomers[3],
                items: [
                    { id: insertedProducts['OPT-GUCCI-01'], name: 'Montura Gucci GG0061O', qty: 1, price: 420000 },
                    { id: insertedProducts['LENT-AR-01'], name: 'Lentes Anti-Reflejo BlueFree AR', qty: 1, price: 100000 }
                ],
                payment: 'transferencia',
                total: 520000,
                status: 'paid',
                needsLab: true,
                lensDesign: 'Monofocal Asférico',
                lensMat: 'Alto Índice 1.67',
                lensTreat: 'Fotocromático Transitions VII'
            },
            {
                num: 'FAC-00110',
                customer: insertedCustomers[4],
                items: [
                    { id: insertedProducts['ACC-CLEAN-60'], name: 'Líquido Limpiador para Lentes Spray 60ml', qty: 1, price: 15000 }
                ],
                payment: 'efectivo',
                total: 15000,
                status: 'paid',
                needsLab: false
            }
        ];

        let totalCashSales = 0;
        let totalCardSales = 0;
        let totalTransferSales = 0;

        for (const sale of salesList) {
            // Insertar factura
            const invRes = await pool.query(
                `INSERT INTO invoices (
                    client_id, invoice_number, customer_name, customer_phone, customer_document_type,
                    customer_document_number, customer_email, total_amount, status, due_date, payment_method, created_at
                 ) VALUES (
                    $1, $2, $3, $4, 'CC', $5, $6, $7, $8, NOW(), $9, NOW() - (RANDOM() * INTERVAL '5 days')
                 )
                 ON CONFLICT (client_id, invoice_number) DO UPDATE SET total_amount = EXCLUDED.total_amount
                 RETURNING id`,
                [
                    clientId, sale.num, sale.customer.name, sale.customer.phone,
                    sale.customer.document_number, sale.customer.email, sale.total, sale.status, sale.payment
                ]
            );
            const invoiceId = invRes.rows[0].id;

            // Insertar ítems
            for (const item of sale.items) {
                await pool.query(
                    `INSERT INTO invoice_items (invoice_id, product_id, quantity, price)
                     VALUES ($1, $2, $3, $4)`,
                    [invoiceId, item.id, item.qty, item.price]
                );

                // Descontar inventario si es producto físico
                await pool.query(
                    `UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 AND product_type = 'product'`,
                    [item.qty, item.id]
                );
            }

            // Sumar a totales para Arqueo de Caja
            if (sale.payment === 'efectivo') totalCashSales += sale.total;
            else if (sale.payment === 'tarjeta') totalCardSales += sale.total;
            else if (sale.payment === 'transferencia') totalTransferSales += sale.total;

            // Si requiere laboratorio optométrico, crear orden en lab_jobs
            if (sale.needsLab) {
                await pool.query(
                    `INSERT INTO lab_jobs (
                        client_id, customer_id, invoice_id, product_name, lens_design, lens_material, lens_treatment, job_value, status, notes
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'Trabajo enviado automáticamente desde venta en punto POS')`,
                    [
                        clientId, sale.customer.id, invoiceId, sale.items[0].name,
                        sale.lensDesign, sale.lensMat, sale.lensTreat, sale.total
                    ]
                );
            }

            // Audit log para Monitor de Eventos
            const desc = `Factura directa ${sale.num} generada por $${sale.total.toLocaleString('es-CO')} (${sale.payment}) para el cliente ${sale.customer.name}`;
            await pool.query(
                `INSERT INTO system_audit_logs (client_id, action, module, description, details)
                 VALUES ($1, 'INVOICE_CREATED', 'Facturación POS', $2, $3)`,
                [clientId, desc, JSON.stringify({ invoice_number: sale.num, total: sale.total, payment_method: sale.payment })]
            );
        }

        console.log(`[Seed Script] ✅ 10 Facturas creadas exitosamente.`);
        console.log(`[Seed Script] Totales registrados: Efectivo=$${totalCashSales.toLocaleString('es-CO')}, Tarjeta=$${totalCardSales.toLocaleString('es-CO')}, Transferencia=$${totalTransferSales.toLocaleString('es-CO')}`);

        // 6. Actualizar o crear Arqueo de Caja activo para refrendar el turno
        await pool.query(
            `INSERT INTO cash_shifts (
                client_id, employee_out_name, employee_in_name, initial_cash, total_cash_sales,
                total_card_sales, total_transfer_sales, total_sales, reported_cash_in_drawer,
                cash_difference, status, notes, created_at
             ) VALUES (
                $1, 'Super Admin', 'Carla Cantos', 50000.00, $2, $3, $4, $5, $6, 0.00, 'pending_confirmation',
                'Arqueo automático generado para validación de flujo completo de 10 ventas en punto de venta', NOW()
             )`,
            [clientId, totalCashSales, totalCardSales, totalTransferSales, (totalCashSales + totalCardSales + totalTransferSales), (50000 + totalCashSales)]
        );

        console.log(`[Seed Script] ✅ Arqueo de caja actualizado con las 10 ventas para prueba de Carla Cantos.`);

    } catch (err: any) {
        console.error(`[Seed Script] ❌ Error durante la siembra:`, err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seed10Sales();
