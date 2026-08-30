import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://agency_user:agency_pass@agency_bot_db:5432/agency_db'
});

async function seedRichOpticalStore() {
    console.log("🌱 Iniciando sembrado enriquecido de datos para client_test_optica...");

    const clientId = 'client_test_optica';

    try {
        // 0. Limpiar datos de facturación, carteras, domicilios y talleres antiguos para dejar la tienda de prueba impecable
        await pool.query(`DELETE FROM invoice_installments WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = $1);`, [clientId]);
        await pool.query(`DELETE FROM deliveries WHERE client_id = $1;`, [clientId]);
        await pool.query(`DELETE FROM lab_jobs WHERE client_id = $1;`, [clientId]);
        await pool.query(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = $1);`, [clientId]);
        await pool.query(`DELETE FROM invoices WHERE client_id = $1;`, [clientId]);
        await pool.query(`DELETE FROM patient_clinical_records WHERE client_id = $1;`, [clientId]);
        await pool.query(`DELETE FROM formulas WHERE client_id = $1;`, [clientId]);

        console.log("🧹 Datos antiguos limpios.");

        // 1. Asegurar Producto de Servicio (Examen de vista)
        let examProductRes = await pool.query(
            `SELECT id FROM products WHERE client_id = $1 AND (name ILIKE '%examen%' OR product_type = 'service') LIMIT 1;`,
            [clientId]
        );
        let examProductId: string;

        if (examProductRes.rows.length === 0) {
            const insExam = await pool.query(
                `INSERT INTO products (client_id, name, sku, category_id, cost_price, price, stock, product_type, is_active, description)
                 VALUES ($1, 'Examen de Vista / Consulta Optométrica', 'SERV-EXAM-01', null, 10000.00, 40000.00, 999999, 'service', true, 'Evaluación de agudeza visual, refracción computarizada y tonometría.')
                 RETURNING id;`,
                [clientId]
            );
            examProductId = insExam.rows[0].id;
        } else {
            examProductId = examProductRes.rows[0].id;
        }

        // Obtener o crear productos de inventario físico
        const frameRes = await pool.query(`SELECT id, name, price FROM products WHERE client_id = $1 AND product_type = 'product' LIMIT 5;`, [clientId]);
        let productsList = frameRes.rows;

        if (productsList.length === 0) {
            const p1 = await pool.query(`INSERT INTO products (client_id, name, sku, cost_price, price, stock, product_type) VALUES ($1, 'Montura Titanio Ray-Ban RB5228', 'MON-RB-5228', 120000, 350000, 15, 'product') RETURNING id, name, price;`, [clientId]);
            const p2 = await pool.query(`INSERT INTO products (client_id, name, sku, cost_price, price, stock, product_type) VALUES ($1, 'Lente de Contacto Bausch+Lomb SoftLens', 'LC-BL-01', 45000, 95000, 30, 'product') RETURNING id, name, price;`, [clientId]);
            const p3 = await pool.query(`INSERT INTO products (client_id, name, sku, cost_price, price, stock, product_type) VALUES ($1, 'Líquido Limpiador Antiempañante 60ml', 'ACC-LIM-60', 5000, 15000, 50, 'product') RETURNING id, name, price;`, [clientId]);
            productsList = [p1.rows[0], p2.rows[0], p3.rows[0]];
        }

        // 2. Crear / Asegurar 6 Pacientes Reales en CRM
        const patientsData = [
            { name: 'Alejandro', lastName: 'Morales', doc: '1012345678', phone: '+573001234567', email: 'alejandro.morales@gmail.com', address: 'Calle 72 # 45-18, Apt 502, Barranquilla' },
            { name: 'María Fernanda', lastName: 'Gómez', doc: '1023456789', phone: '+573109876543', email: 'mf.gomez@hotmail.com', address: 'Carrera 53 # 80-12, Barranquilla' },
            { name: 'Carlos Eduardo', lastName: 'Ramírez', doc: '1034567890', phone: '+573154567890', email: 'carlos.ramirez@yahoo.es', address: 'Calle 93 # 46-22, Barranquilla' },
            { name: 'Diana Patricia', lastName: 'Torres', doc: '1045678901', phone: '+573201239876', email: 'diana.torres@outlook.com', address: 'Carrera 43 # 68-05, Barranquilla' },
            { name: 'Santiago', lastName: 'Restrepo', doc: '1056789012', phone: '+573017654321', email: 'santiago.restrepo@gmail.com', address: 'Calle 84 # 51B-30, Barranquilla' },
            { name: 'Camila Andrea', lastName: 'Benítez', doc: '1067890123', phone: '+573189998877', email: 'camila.benitez@gmail.com', address: 'Carrera 58 # 74-110, Barranquilla' }
        ];

        const patientIds: string[] = [];

        for (const p of patientsData) {
            const check = await pool.query(`SELECT id FROM crm_customers WHERE client_id = $1 AND document_number = $2;`, [clientId, p.doc]);
            if (check.rows.length > 0) {
                patientIds.push(check.rows[0].id);
            } else {
                const ins = await pool.query(
                    `INSERT INTO crm_customers (client_id, name, last_name, document_type, document_number, phone, email, address)
                     VALUES ($1, $2, $3, 'CC', $4, $5, $6, $7)
                     RETURNING id;`,
                    [clientId, p.name, p.lastName, p.doc, p.phone, p.email, p.address]
                );
                patientIds.push(ins.rows[0].id);
            }
        }

        console.log(`✅ 6 Pacientes asegurados en CRM.`);

        // 3. Crear Historias Clínicas Optométricas conforme a Ley (MinSalud/DIAN)
        const clinicalCases = [
            {
                customerIndex: 0,
                reason: 'Astenopía severa y visión borrosa lejana al trabajar frente al computador.',
                medAnt: 'Hipertensión arterial controlada con Losartán 50mg.',
                ocuAnt: 'Uso previo de lentes monofocales hace 2 años.',
                avOd: '20/40', avOi: '20/50',
                refrOd: 'Esf: -1.50 | Cil: -0.75 | Eje: 90° | Add: +1.50',
                refrOi: 'Esf: -1.75 | Cil: -0.50 | Eje: 85° | Add: +1.50',
                tonoOd: '14 mmHg', tonoOi: '15 mmHg',
                ophthal: 'Córnea transparente, cristalino transparente, relación excavación/disco 0.3 fisiológica.',
                diag: 'H52.1 Miopía + H52.2 Astigmatismo + H52.4 Presbicia.',
                plan: 'Prescripción de lentes multifocales digitales con filtro de luz azul (Blue Defense).'
            },
            {
                customerIndex: 1,
                reason: 'Cefalea frontal al leer y fatiga ocular vespertina.',
                medAnt: 'Sin antecedentes sistémicos de relevancia.',
                ocuAnt: 'Primer examen optométrico de control.',
                avOd: '20/30', avOi: '20/25',
                refrOd: 'Esf: +0.75 | Cil: -1.25 | Eje: 180°',
                refrOi: 'Esf: +0.50 | Cil: -1.00 | Eje: 175°',
                tonoOd: '13 mmHg', tonoOi: '13 mmHg',
                ophthal: 'Segmento anterior sin alteraciones, película lagrimal estable.',
                diag: 'H52.2 Astigmatismo hipermetrópico compuesto.',
                plan: 'Lentes monofocales en policarbonato con tratamiento antirreflejo premium.'
            },
            {
                customerIndex: 2,
                reason: 'Dificultad para enfocar texto pequeño y visión borrosa nocturna al conducir.',
                medAnt: 'Diabetes Mellitus Tipo 2 en tratamiento.',
                ocuAnt: 'Fotofobia moderada.',
                avOd: '20/40', avOi: '20/40',
                refrOd: 'Esf: -2.00 | Cil: -1.00 | Eje: 10° | Add: +2.00',
                refrOi: 'Esf: -2.25 | Cil: -0.75 | Eje: 170° | Add: +2.00',
                tonoOd: '16 mmHg', tonoOi: '16 mmHg',
                ophthal: 'Fondo de ojo sin signos de retinopatía diabética activa.',
                diag: 'H52.1 Miopía + H52.4 Presbicia.',
                plan: 'Lentes progresivos fotocromáticos (Transitions VIII).'
            },
            {
                customerIndex: 3,
                reason: 'Sensación de cuerpo extraño y ardor constante (Ojo Seco).',
                medAnt: 'Alergias ambientales temporales.',
                ocuAnt: 'Cirugía refractiva LASIK en 2018.',
                avOd: '20/20', avOi: '20/20',
                refrOd: 'Esf: Plano | Cil: -0.25 | Eje: 0°',
                refrOi: 'Esf: Plano | Cil: -0.25 | Eje: 0°',
                tonoOd: '12 mmHg', tonoOi: '12 mmHg',
                ophthal: 'Tiempo de rotura lagrimal (BUT) reducido a 5 segundos. Inyección conjuntival leve.',
                diag: 'H04.1 Síndrome de Ojo Seco evaporativo.',
                plan: 'Lagrimas artificiales hialuronato de sodio 0.15% cada 4 horas y pausas activas.'
            },
            {
                customerIndex: 4,
                reason: 'Examen ocupacional de rutina requerido por la empresa.',
                medAnt: 'Ninguno.',
                ocuAnt: 'Visión 20/20 espontánea.',
                avOd: '20/20', avOi: '20/20',
                refrOd: 'Esf: Plano',
                refrOi: 'Esf: Plano',
                tonoOd: '14 mmHg', tonoOi: '14 mmHg',
                ophthal: 'Estructuras oculares dentro de límites normales.',
                diag: 'Z01.0 Examen de ojos y de la visión (Normal).',
                plan: 'Certificado de aptitud visual expedido. Control en 12 meses.'
            },
            {
                customerIndex: 5,
                reason: 'Disminución progresiva de agudeza visual lejana en ambos ojos.',
                medAnt: 'Ninguno.',
                ocuAnt: 'Uso de gafas de lectura compradas en droguería.',
                avOd: '20/60', avOi: '20/60',
                refrOd: 'Esf: -2.75 | Cil: -1.50 | Eje: 95°',
                refrOi: 'Esf: -3.00 | Cil: -1.25 | Eje: 85°',
                tonoOd: '15 mmHg', tonoOi: '14 mmHg',
                ophthal: 'Media transparencia de medios ópticos.',
                diag: 'H52.1 Miopía moderada + H52.2 Astigmatismo.',
                plan: 'Prescripción oftálmica con lentes de alto índice 1.67 antirreflejos.'
            }
        ];

        for (const c of clinicalCases) {
            const pat = patientsData[c.customerIndex];
            const pId = patientIds[c.customerIndex];

            // Insertar Historia Clínica
            await pool.query(
                `INSERT INTO patient_clinical_records (
                    client_id, customer_id, customer_name, customer_document, customer_phone,
                    consultation_reason, medical_antecedents, ocular_antecedents,
                    visual_acuity_od, visual_acuity_oi, refraction_od, refraction_oi,
                    tonometry_od, tonometry_oi, ophthalmoscopy_notes, diagnosis, treatment_plan, optometrist_name
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);`,
                [
                    clientId, pId, `${pat.name} ${pat.lastName}`, pat.doc, pat.phone,
                    c.reason, c.medAnt, c.ocuAnt, c.avOd, c.avOi, c.refrOd, c.refrOi,
                    c.tonoOd, c.tonoOi, c.ophthal, c.diag, c.plan, 'Dra. Karen Diaz (Optómetra Reg. 45091)'
                ]
            );

            // Insertar Fórmula Oftálmica
            const formulaRx = JSON.stringify({
                od: { esf: '-1.50', cil: '-0.75', eje: '90', adi: '+1.50', av: c.avOd },
                oi: { esf: '-1.75', cil: '-0.50', eje: '85', adi: '+1.50', av: c.avOi },
                dp: '63'
            });

            await pool.query(
                `INSERT INTO formulas (client_id, customer_id, od_sphere, od_cylinder, od_axis, od_addition, oi_sphere, oi_cylinder, oi_axis, oi_addition, dp_distance, notes)
                 VALUES ($1, $2, '-1.50', '-0.75', '90', '+1.50', '-1.75', '-0.50', '85', '+1.50', '63', $3);`,
                [clientId, pId, c.plan]
            );

            // Actualizar fórmula en perfil CRM
            await pool.query(
                `UPDATE crm_customers SET lens_prescription = $1 WHERE id = $2;`,
                [formulaRx, pId]
            );
        }

        console.log("✅ 6 Historias Clínicas Optométricas y Fórmulas registradas.");

        // 4. Crear 10 Facturas Reales con Variedad de Flujos (Domicilios, Cartera a Cuotas, POS)
        const invoicesToCreate = [
            {
                invNumber: 'FAC-00101',
                customerIndex: 0, // Alejandro Morales
                paymentMethod: 'transferencia',
                status: 'paid',
                deliveryMethod: 'domicilio',
                deliveryFee: 12000,
                deliveryAddress: 'Calle 72 # 45-18, Apt 502, Barranquilla',
                items: [
                    { productId: examProductId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000, type: 'service' },
                    { productId: productsList[0].id, name: productsList[0].name, qty: 1, price: 350000, type: 'product' }
                ]
            },
            {
                invNumber: 'FAC-00102',
                customerIndex: 1, // María Fernanda Gómez
                paymentMethod: 'credito',
                installmentsCount: 3,
                installmentFrequency: 'mensual',
                abono: 150000,
                status: 'pending',
                deliveryMethod: 'local',
                deliveryFee: 0,
                items: [
                    { productId: null, name: 'Lentes Progresivos Digitales Transitions VIII', qty: 1, price: 450000, type: 'lens', lensDesign: 'Progresivo', lensMaterial: 'Policarbonato', lensTreatment: 'Transitions Fotocromático' },
                    { productId: examProductId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000, type: 'service' }
                ]
            },
            {
                invNumber: 'FAC-00103',
                customerIndex: 2, // Carlos Eduardo Ramírez
                paymentMethod: 'credito',
                installmentsCount: 2,
                installmentFrequency: 'quincenal',
                abono: 100000,
                status: 'pending',
                deliveryMethod: 'domicilio',
                deliveryFee: 15000,
                deliveryAddress: 'Calle 93 # 46-22, Barranquilla',
                items: [
                    { productId: productsList[0]?.id || examProductId, name: 'Montura Carrera Ca5542', qty: 1, price: 290000, type: 'product' },
                    { productId: examProductId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000, type: 'service' }
                ]
            },
            {
                invNumber: 'FAC-00104',
                customerIndex: 3, // Diana Patricia Torres
                paymentMethod: 'efectivo',
                status: 'paid',
                deliveryMethod: 'local',
                deliveryFee: 0,
                items: [
                    { productId: productsList[2]?.id || examProductId, name: 'Líquido Limpiador Antiempañante 60ml', qty: 2, price: 15000, type: 'product' }
                ]
            },
            {
                invNumber: 'FAC-00105',
                customerIndex: 4, // Santiago Restrepo
                paymentMethod: 'tarjeta',
                status: 'paid',
                deliveryMethod: 'local',
                deliveryFee: 0,
                items: [
                    { productId: examProductId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000, type: 'service' }
                ]
            },
            {
                invNumber: 'FAC-00106',
                customerIndex: 5, // Camila Andrea Benítez
                paymentMethod: 'transferencia',
                status: 'paid',
                deliveryMethod: 'domicilio',
                deliveryFee: 10000,
                deliveryAddress: 'Carrera 58 # 74-110, Barranquilla',
                items: [
                    { productId: null, name: 'Lentes Monofocales Antirreflejo High Index 1.67', qty: 1, price: 180000, type: 'lens', lensDesign: 'Monofocal', lensMaterial: 'Alto Índice 1.67', lensTreatment: 'Antirreflejo Super Clean' }
                ]
            },
            {
                invNumber: 'FAC-00107',
                customerIndex: 0, // Alejandro Morales
                paymentMethod: 'credito',
                installmentsCount: 4,
                installmentFrequency: 'mensual',
                abono: 100000,
                status: 'pending',
                deliveryMethod: 'local',
                deliveryFee: 0,
                items: [
                    { productId: null, name: 'Lentes Bifocales Invisible Policarbonato', qty: 1, price: 220000, type: 'lens', lensDesign: 'Bifocal Invisible', lensMaterial: 'Policarbonato', lensTreatment: 'Filtro Azul' },
                    { productId: productsList[0]?.id || examProductId, name: 'Montura Vogue Eyewear VO5322', qty: 1, price: 380000, type: 'product' }
                ]
            },
            {
                invNumber: 'FAC-00108',
                customerIndex: 1, // María Fernanda Gómez
                paymentMethod: 'efectivo',
                status: 'paid',
                deliveryMethod: 'local',
                deliveryFee: 0,
                items: [
                    { productId: examProductId, name: 'Examen de Vista / Consulta Optométrica', qty: 1, price: 40000, type: 'service' }
                ]
            },
            {
                invNumber: 'FAC-00109',
                customerIndex: 2, // Carlos Eduardo Ramírez
                paymentMethod: 'transferencia',
                status: 'paid',
                deliveryMethod: 'local',
                deliveryFee: 0,
                items: [
                    { productId: productsList[1]?.id || examProductId, name: 'Lente de Contacto Bausch+Lomb SoftLens', qty: 2, price: 95000, type: 'product' }
                ]
            },
            {
                invNumber: 'FAC-00110',
                customerIndex: 3, // Diana Patricia Torres
                paymentMethod: 'tarjeta',
                status: 'paid',
                deliveryMethod: 'local',
                deliveryFee: 0,
                items: [
                    { productId: productsList[0]?.id || examProductId, name: 'Gafas de Sol Polarizadas Oakley Holbrook', qty: 1, price: 520000, type: 'product' }
                ]
            }
        ];

        for (const inv of invoicesToCreate) {
            const pat = patientsData[inv.customerIndex];
            const pId = patientIds[inv.customerIndex];

            // Calcular total de la factura
            const subtotal = inv.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const total = subtotal;

            const invRes = await pool.query(
                `INSERT INTO invoices (
                    client_id, invoice_number, customer_name, customer_phone,
                    customer_document_type, customer_document_number, customer_email, customer_address,
                    total_amount, status, due_date, payment_method,
                    installments_count, installment_frequency,
                    delivery_method, delivery_fee, delivery_address, delivery_status
                ) VALUES ($1, $2, $3, $4, 'CC', $5, $6, $7, $8, $9, NOW() + INTERVAL '15 days', $10, $11, $12, $13, $14, $15, $16)
                RETURNING id;`,
                [
                    clientId, inv.invNumber, `${pat.name} ${pat.lastName}`, pat.phone,
                    pat.doc, pat.email, pat.address, total, inv.status, inv.paymentMethod,
                    inv.installmentsCount || 1, inv.installmentFrequency || null,
                    inv.deliveryMethod, inv.deliveryFee, inv.deliveryAddress || pat.address,
                    inv.deliveryMethod === 'domicilio' ? 'pending' : 'entregado'
                ]
            );

            const invoiceId = invRes.rows[0].id;

            // Insertar items de factura
            for (const item of inv.items) {
                await pool.query(
                    `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, price, product_type, lens_design, lens_material, lens_treatment)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
                    [invoiceId, item.productId, item.name, item.qty, item.price, item.type, (item as any).lensDesign || null, (item as any).lensMaterial || null, (item as any).lensTreatment || null]
                );

                // Si es un lente oftálmico, registrar automáticamente el trabajo en la tabla lab_jobs
                if (item.type === 'lens') {
                    await pool.query(
                        `INSERT INTO lab_jobs (
                            client_id, invoice_id, customer_id, product_name, lens_design, lens_material, lens_treatment, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending');`,
                        [clientId, invoiceId, pId, item.name, (item as any).lensDesign, (item as any).lensMaterial, (item as any).lensTreatment]
                    );
                }
            }

            // Si es pedido a domicilio, registrar en la tabla deliveries para el módulo de despachos
            if (inv.deliveryMethod === 'domicilio') {
                await pool.query(
                    `INSERT INTO deliveries (
                        client_id, invoice_id, recipient_name, recipient_phone, address, status, notes
                    ) VALUES ($1, $2, $3, $4, $5, 'pending', 'Entregar preferiblemente en horario laboral');`,
                    [clientId, invoiceId, `${pat.name} ${pat.lastName}`, pat.phone, inv.deliveryAddress || pat.address]
                );
            }

            // Si es venta a crédito / cuotas, insertar plan de cuotas en invoice_installments
            if (inv.paymentMethod === 'credito') {
                const abono = inv.abono || 0;
                if (abono > 0) {
                    await pool.query(
                        `INSERT INTO invoice_installments (invoice_id, installment_number, due_date, amount, status, paid_amount, paid_at)
                         VALUES ($1, 0, NOW(), $2, 'paid', $2, NOW());`,
                        [invoiceId, abono]
                    );
                }

                const remaining = total - abono;
                const count = inv.installmentsCount || 2;
                const installmentVal = Math.round(remaining / count);

                for (let i = 1; i <= count; i++) {
                    await pool.query(
                        `INSERT INTO invoice_installments (invoice_id, installment_number, due_date, amount, status, paid_amount)
                         VALUES ($1, $2, NOW() + (${i} || ' month')::INTERVAL, $3, 'pending', 0.00);`,
                        [invoiceId, i, installmentVal]
                    );
                }
            }
        }

        console.log("✅ 10 Facturas creadas exitosamente con flujos de Domicilio, Cuotas y POS.");
        console.log("🎉 Sembrado completado con éxito para client_test_optica!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error durante el sembrado:", err);
        process.exit(1);
    }
}

seedRichOpticalStore();
