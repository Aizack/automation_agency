import { initDatabase } from '../src/database/initDb';
import { pool } from '../src/database/postgres';
import bcrypt from 'bcrypt';

async function runValidation() {
  console.log('🚀 === INICIANDO VALIDACIÓN DE FLUJO COMPLETO PARA RESTAURANTE ===\n');

  await initDatabase();
  await pool.query('ALTER TABLE employees ALTER COLUMN pin TYPE VARCHAR(255);');

  // 1. Obtener o crear Cliente Restaurante
  let clientRes = await pool.query("SELECT id, name, category, username FROM clients WHERE category = 'restaurante' LIMIT 1");
  let clientId: string;

  if (clientRes.rows.length === 0) {
    const passHash = await bcrypt.hash('admin123', 10);
    const newClient = await pool.query(
      `INSERT INTO clients (name, username, password_hash, category, email, phone_number, is_active)
       VALUES ('Restaurante El Costeño', 'costeno', $1, 'restaurante', 'contacto@elcosteno.com', '573001234567', true)
       RETURNING id, name, category, username`,
      [passHash]
    );
    clientId = newClient.rows[0].id;
    console.log('✅ Cliente Creado:', newClient.rows[0]);
  } else {
    clientId = clientRes.rows[0].id;
    console.log('✅ Cliente Restaurante Encontrado:', clientRes.rows[0]);
  }

  const pin = '123456';
  const pinHash = await bcrypt.hash(pin, 10);

  // 2. Crear los 4 Empleados con PIN 123456
  console.log('\n--- 1. CREANDO EMPLEADOS CON PIN 123456 ---');

  const employeesToCreate = [
    { name: 'Carlos Domiciliario', phone: '573001112233', role: 'delivery' },
    { name: 'Chef Mario Cocina', phone: '573002223344', role: 'kitchen' },
    { name: 'Ana Cajera POS', phone: '573003334455', role: 'cashier' },
    { name: 'Juan Mesero', phone: '573004445566', role: 'waiter' },
  ];

  const employeeMap: Record<string, string> = {};

  for (const emp of employeesToCreate) {
    // Verificar si existe por teléfono
    const existing = await pool.query(
      'SELECT id, name FROM employees WHERE client_id = $1 AND phone = $2',
      [clientId, emp.phone]
    );

    if (existing.rows.length > 0) {
      // Actualizar PIN a 123456
      await pool.query(
        'UPDATE employees SET pin = $1, role = $2, is_active = true WHERE id = $3',
        [pinHash, emp.role, existing.rows[0].id]
      );
      employeeMap[emp.role] = existing.rows[0].id;
      console.log(`  🔹 Empleado '${emp.name}' (${emp.role}) actualizado con PIN ${pin}.`);
    } else {
      const created = await pool.query(
        `INSERT INTO employees (client_id, name, phone, pin, role, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, name`,
        [clientId, emp.name, emp.phone, pinHash, emp.role]
      );
      employeeMap[emp.role] = created.rows[0].id;
      console.log(`  🔹 Empleado '${emp.name}' (${emp.role}) CREADO exitosamente con PIN ${pin}.`);
    }
  }

  // 3. Crear Insumos en Bodega (raw_materials) para Salchipapa Tradicional Costeña
  console.log('\n--- 2. CREANDO INSUMOS Y MATERIAS PRIMAS EN BODEGA ---');

  const rawMaterialsToCreate = [
    {
      name: 'Papa Sabanera (Cruda Limpia)',
      category: 'Verduras & Vegetales',
      purchase_unit: 'Bulto / Saco de 50 kg (50.000 g)',
      purchase_unit_cost: 100000,
      conversion_factor: 50000,
      consumption_unit: 'g',
      stock: 50000, // 50kg en gramos
      min_stock: 5000,
      supplier: 'Mercado Central de Abastos'
    },
    {
      name: 'Salchicha Manguera Costeña',
      category: 'Embutidos, Salchichas & Charcutería',
      purchase_unit: 'Kilogramo (1.000 g)',
      purchase_unit_cost: 18000,
      conversion_factor: 1000,
      consumption_unit: 'g',
      stock: 10000, // 10kg en gramos
      min_stock: 1000,
      supplier: 'Embutidos Del Caribe'
    },
    {
      name: 'Queso Costeño Rallado',
      category: 'Lácteos & Quesos',
      purchase_unit: 'Kilogramo (1.000 g)',
      purchase_unit_cost: 22000,
      conversion_factor: 1000,
      consumption_unit: 'g',
      stock: 5000, // 5kg en gramos
      min_stock: 500,
      supplier: 'Lácteos San Juan'
    },
    {
      name: 'Salsa Rosada Especial',
      category: 'Abarrotes, Salsas & Aceites',
      purchase_unit: 'Litro (1.000 ml)',
      purchase_unit_cost: 12000,
      conversion_factor: 1000,
      consumption_unit: 'ml',
      stock: 4000, // 4 litros en ml
      min_stock: 500,
      supplier: 'Salsas El Sabor'
    }
  ];

  const rawMaterialMap: Record<string, any> = {};

  for (const mat of rawMaterialsToCreate) {
    const existing = await pool.query(
      'SELECT id, stock_in_consumption_units FROM raw_materials WHERE client_id = $1 AND name = $2',
      [clientId, mat.name]
    );

    if (existing.rows.length > 0) {
      rawMaterialMap[mat.name] = existing.rows[0].id;
      console.log(`  🥦 Insumo '${mat.name}' listo en bodega (Stock Actual: ${existing.rows[0].stock_in_consumption_units} ${mat.consumption_unit}).`);
    } else {
      const created = await pool.query(
        `INSERT INTO raw_materials (
          client_id, name, category, purchase_unit, purchase_unit_cost,
          conversion_factor_to_consumption, consumption_unit, stock_in_consumption_units,
          min_stock_alert, supplier_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, name, stock_in_consumption_units, consumption_unit`,
        [
          clientId, mat.name, mat.category, mat.purchase_unit, mat.purchase_unit_cost,
          mat.conversion_factor, mat.consumption_unit, mat.stock, mat.min_stock, mat.supplier
        ]
      );
      rawMaterialMap[mat.name] = created.rows[0].id;
      console.log(`  🥦 Insumo '${mat.name}' CREADO en bodega con stock inicial de ${mat.stock} ${mat.consumption_unit}.`);
    }
  }

  // 4. Crear Plato en Menú del Restaurante (`products`)
  console.log('\n--- 3. CREANDO PLATO EN MENÚ: SALCHIPAPA TRADICIONAL COSTEÑA ($10.000 COP) ---');

  const dishName = 'Salchipapa Tradicional Costeña';
  const dishPrice = 10000;

  let dishRes = await pool.query(
    'SELECT id, name, price FROM products WHERE client_id = $1 AND name = $2',
    [clientId, dishName]
  );

  let dishId: string;
  if (dishRes.rows.length > 0) {
    dishId = dishRes.rows[0].id;
    console.log(`  🍽️ Plato '${dishName}' listo en Menú ($${dishPrice} COP).`);
  } else {
    const createdDish = await pool.query(
      `INSERT INTO products (client_id, name, description, price, stock, category_id)
       VALUES ($1, $2, 'Auténtica salchipapa costeña con papa crujiente, salchicha picada, abundante queso costeño rallado y salsa rosada artesanal.', $3, 999, NULL)
       RETURNING id, name, price`,
      [clientId, dishName, dishPrice]
    );
    dishId = createdDish.rows[0].id;
    console.log(`  🍽️ Plato '${dishName}' CREADO en Menú ($${dishPrice} COP).`);
  }

  // Vincular la Ficha Técnica BOM (Receta de Salchipapa Costeña)
  console.log('  📜 Configurando Receta BOM del Plato...');

  const recipeIngredients = [
    { rawName: 'Papa Sabanera (Cruda Limpia)', qty: 250, unit: 'g' },
    { rawName: 'Salchicha Manguera Costeña', qty: 100, unit: 'g' },
    { rawName: 'Queso Costeño Rallado', qty: 50, unit: 'g' },
    { rawName: 'Salsa Rosada Especial', qty: 30, unit: 'ml' },
  ];

  // Limpiar recetas previas para estandarizar
  await pool.query('DELETE FROM product_recipes WHERE client_id = $1 AND product_id = $2', [clientId, dishId]);

  for (const ing of recipeIngredients) {
    const rawId = rawMaterialMap[ing.rawName];
    if (rawId) {
      await pool.query(
        `INSERT INTO product_recipes (client_id, product_id, raw_product_id, quantity_required, unit_of_measure, preparation_instructions)
         VALUES ($1, $2, $3, $4, $5, 'Freír papas y salchichas a 180°C. Coronar con queso costeño rallado y bañar en salsa rosada.')`,
        [clientId, dishId, rawId, ing.qty, ing.unit]
      );
      console.log(`    -> Receta: ${ing.qty} ${ing.unit} de '${ing.rawName}'`);
    }
  }

  // 5. PRUEBA 1: FLUJO DE SERVICIO EN MESA (DINE-IN)
  console.log('\n======================================================');
  console.log('🧪 PRUEBA 1: FLUJO COMPLETO EN MESA (RESTAURANTE DINE-IN)');
  console.log('======================================================');

  // a) Crear/Asegurar Mesa #1 Salón
  let tableRes = await pool.query(
    "SELECT id, table_number FROM restaurant_tables WHERE client_id = $1 AND table_number = '1'",
    [clientId]
  );
  let tableId: string;
  if (tableRes.rows.length === 0) {
    const createdTable = await pool.query(
      `INSERT INTO restaurant_tables (client_id, table_number, zone, capacity, status, assigned_waiter_id)
       VALUES ($1, '1', 'Salón Principal', 4, 'occupied', $2)
       RETURNING id`,
      [clientId, employeeMap['waiter']]
    );
    tableId = createdTable.rows[0].id;
  } else {
    tableId = tableRes.rows[0].id;
    await pool.query('UPDATE restaurant_tables SET status = $1, assigned_waiter_id = $2 WHERE id = $3', ['occupied', employeeMap['waiter'], tableId]);
  }
  console.log(`  🪑 Mesa #1 asignada a Juan Mesero.`);

  // b) Tomar Comanda de Mesa (1 Salchipapa Tradicional Costeña)
  const orderNumberMesa = `ORD-MESA-${Math.floor(100 + Math.random() * 900)}`;
  const kdsMesaRes = await pool.query(
    `INSERT INTO kitchen_orders (
      client_id, table_id, waiter_id, order_number, station, status, items, notes
    ) VALUES ($1, $2, $3, $4, 'kitchen', 'pending', $5, $6)
    RETURNING *`,
    [
      clientId,
      tableId,
      employeeMap['waiter'],
      orderNumberMesa,
      JSON.stringify([{ name: dishName, quantity: 1, notes: 'Bien frita la papa, bastante queso' }]),
      'Mesa #1 - Cliente en Salón'
    ]
  );
  console.log(`  📲 Comanda ${orderNumberMesa} enviada al KDS desde Comandero de Juan Mesero.`);

  // c) Simular avance de estado en KDS por Chef Mario Cocina (Pendiente ➔ En Preparación ➔ Listo)
  const orderMesaId = kdsMesaRes.rows[0].id;
  await pool.query("UPDATE kitchen_orders SET status = 'in_preparation', prep_start_time = NOW() WHERE id = $1", [orderMesaId]);
  console.log(`  👨‍🍳 Chef Mario Cocina inicia preparación de Comanda ${orderNumberMesa} en KDS...`);

  await pool.query("UPDATE kitchen_orders SET status = 'ready', ready_time = NOW() WHERE id = $1", [orderMesaId]);
  console.log(`  🔔 Chef Mario Cocina marca comanda ${orderNumberMesa} como 🟢 ¡LISTA PARA SERVIR!`);

  // d) Facturación en Caja POS por Ana Cajera
  // 1 Salchipapa ($10.000) + Impoconsumo 8% ($800) + Propina 10% ($1.000) = Total $11.800 COP
  const invNumberMesa = `FACT-MESA-${Math.floor(1000 + Math.random() * 9000)}`;
  const subtotalMesa = 10000;
  const impoconsumoMesa = subtotalMesa * 0.08;
  const propinaMesa = subtotalMesa * 0.10;
  const totalMesa = subtotalMesa + impoconsumoMesa + propinaMesa;

  // Registrar Factura de Mesa
  const invoiceMesaRes = await pool.query(
    `INSERT INTO invoices (
      client_id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number,
      customer_email, total_amount, status, due_date, payment_method, delivery_method, seller_employee_id
    ) VALUES ($1, $2, 'Cliente Salón Mesa #1', '573000000000', 'CC', '22222222', 'cliente1@salon.com', $3, 'paid', NOW(), 'efectivo', 'local', $4)
    RETURNING id, invoice_number, total_amount`,
    [clientId, invNumberMesa, totalMesa, employeeMap['cashier']]
  );
  const invoiceMesaId = invoiceMesaRes.rows[0].id;

  // Registrar ítem de factura
  await pool.query(
    `INSERT INTO invoice_items (invoice_id, product_id, quantity, price, product_name, product_type)
     VALUES ($1, $2, 1, $3, $4, 'inventory')`,
    [invoiceMesaId, dishId, subtotalMesa, dishName]
  );

  // Ejecutar descuento de insumos en bodega (BOM)
  for (const ing of recipeIngredients) {
    const rawId = rawMaterialMap[ing.rawName];
    await pool.query(
      `UPDATE raw_materials SET stock_in_consumption_units = GREATEST(0, stock_in_consumption_units - $1) WHERE id = $2 AND client_id = $3`,
      [ing.qty, rawId, clientId]
    );
  }

  console.log(`  🧾 Ana Cajera emitió Factura ${invNumberMesa} en POS:`);
  console.log(`     - Subtotal Consumo: $${subtotalMesa.toLocaleString()} COP`);
  console.log(`     - Impoconsumo (8%): $${impoconsumoMesa.toLocaleString()} COP`);
  console.log(`     - Propina Sugerida (10%): $${propinaMesa.toLocaleString()} COP`);
  console.log(`     - TOTAL FACTURADO: $${totalMesa.toLocaleString()} COP (Pagado en Efectivo)`);
  console.log(`  📦 Descuento automático de Bodega por 1 Salchipapa:`);
  console.log(`     - 250g Papa Sabanera | 100g Salchicha Manguera | 50g Queso Costeño | 30ml Salsa Rosada`);


  // 6. PRUEBA 2: FLUJO DE ENVÍO A DOMICILIO (DELIVERY)
  console.log('\n======================================================');
  console.log('🧪 PRUEBA 2: FLUJO COMPLETO DE ENVÍO A DOMICILIO (DELIVERY)');
  console.log('======================================================');

  const customerDomicilio = {
    name: 'María Gómez',
    phone: '573009876543',
    address: 'Calle 72 # 45-18, Apto 402, Barranquilla',
    doc: '1040506070'
  };

  // a) Facturación del Domicilio: 2 Salchipapas Tradicional Costeña ($20.000) + Impoconsumo 8% ($1.600) + Domicilio ($4.000) = $25.600 COP
  const invNumberDom = `FACT-DOM-${Math.floor(1000 + Math.random() * 9000)}`;
  const qtyDom = 2;
  const subtotalDom = dishPrice * qtyDom; // $20.000
  const impoconsumoDom = subtotalDom * 0.08; // $1.600
  const deliveryFeeDom = 4000;
  const totalDom = subtotalDom + impoconsumoDom + deliveryFeeDom; // $25.600

  const invoiceDomRes = await pool.query(
    `INSERT INTO invoices (
      client_id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number,
      customer_email, total_amount, status, due_date, payment_method, delivery_method, delivery_fee, delivery_address, delivery_status, seller_employee_id
    ) VALUES ($1, $2, $3, $4, 'CC', $5, 'maria.gomez@gmail.com', $6, 'paid', NOW(), 'transferencia', 'domicilio', $7, $8, 'pending', $9)
    RETURNING id, invoice_number, total_amount`,
    [clientId, invNumberDom, customerDomicilio.name, customerDomicilio.phone, customerDomicilio.doc, totalDom, deliveryFeeDom, customerDomicilio.address, employeeMap['cashier']]
  );
  const invoiceDomId = invoiceDomRes.rows[0].id;

  // Registrar ítem de factura
  await pool.query(
    `INSERT INTO invoice_items (invoice_id, product_id, quantity, price, product_name, product_type)
     VALUES ($1, $2, $3, $4, $5, 'inventory')`,
    [invoiceDomId, dishId, qtyDom, dishPrice, dishName]
  );

  // Ejecutar descuento de insumos en bodega (BOM para 2 Salchipapas)
  for (const ing of recipeIngredients) {
    const rawId = rawMaterialMap[ing.rawName];
    const totalQtyDeducted = ing.qty * qtyDom;
    await pool.query(
      `UPDATE raw_materials SET stock_in_consumption_units = GREATEST(0, stock_in_consumption_units - $1) WHERE id = $2 AND client_id = $3`,
      [totalQtyDeducted, rawId, clientId]
    );
  }

  // Registrar orden en la tabla de Domicilios (`deliveries`) asignando a Carlos Domiciliario
  await pool.query(
    `INSERT INTO deliveries (client_id, invoice_id, delivery_guy_id, recipient_name, recipient_phone, address, status, route_order, notes)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 1, 'Timbrar en el 402, cliente paga por transferencia Nequi')`,
    [clientId, invoiceDomId, employeeMap['delivery'], customerDomicilio.name, customerDomicilio.phone, customerDomicilio.address]
  );

  // Registrar en KDS para Cocina con insignia de Domicilio
  const orderNumberDom = `ORD-DOM-${Math.floor(100 + Math.random() * 900)}`;
  const kdsDomRes = await pool.query(
    `INSERT INTO kitchen_orders (
      client_id, table_id, order_number, station, status, items, notes
    ) VALUES ($1, NULL, $2, 'kitchen', 'pending', $3, $4)
    RETURNING id`,
    [
      clientId,
      orderNumberDom,
      JSON.stringify([{ name: dishName, quantity: qtyDom, notes: 'Empaque térmico de viaje anti-derrame' }]),
      `DOMICILIO para ${customerDomicilio.name} - Dir: ${customerDomicilio.address}`
    ]
  );

  console.log(`  📲 Pedido de Domicilio ${orderNumberDom} registrado y enviado a KDS:`);
  console.log(`     - Cliente: ${customerDomicilio.name} (${customerDomicilio.phone})`);
  console.log(`     - Dirección: ${customerDomicilio.address}`);
  console.log(`     - Factura: ${invNumberDom} | Total: $${totalDom.toLocaleString()} COP (Incluye $4.000 Domicilio)`);
  console.log(`  📦 Descuento automático de Bodega por 2 Salchipapas:`);
  console.log(`     - 500g Papa Sabanera | 200g Salchicha Manguera | 100g Queso Costeño | 60ml Salsa Rosada`);

  // b) Avance de Estado KDS (Cocina): Pendiente ➔ Listo
  const orderDomId = kdsDomRes.rows[0].id;
  await pool.query("UPDATE kitchen_orders SET status = 'ready', ready_time = NOW() WHERE id = $1", [orderDomId]);
  console.log(`  👨‍🍳 Chef Mario Cocina finaliza preparación y marca pedido ${orderNumberDom} como 🟢 ¡LISTO PARA EMPACAR!`);

  // c) Avance de Estado Domiciliario (Carlos Domiciliario): Pending ➔ En Camino ➔ Entregado
  await pool.query("UPDATE deliveries SET status = 'en_camino' WHERE invoice_id = $1", [invoiceDomId]);
  await pool.query("UPDATE invoices SET delivery_status = 'en_camino' WHERE id = $1", [invoiceDomId]);
  console.log(`  🛵 Carlos Domiciliario recoge pedido, abre WhatsApp al cliente y marca 🔵 'EN CAMINO'...`);

  await pool.query("UPDATE deliveries SET status = 'entregado' WHERE invoice_id = $1", [invoiceDomId]);
  await pool.query("UPDATE invoices SET delivery_status = 'entregado' WHERE id = $1", [invoiceDomId]);
  console.log(`  ✅ Carlos Domiciliario entrega el pedido en ${customerDomicilio.address} y marca 🟢 'ENTREGADO'.`);

  // 7. VERIFICACIÓN FINAL DE STOCK EN BODEGA (`raw_materials`)
  console.log('\n======================================================');
  console.log('📊 VERIFICACIÓN DE INVENTARIO FINAL DE BODEGA EN TIEMPO REAL');
  console.log('======================================================');

  const finalStockRes = await pool.query(
    'SELECT name, category, stock_in_consumption_units, consumption_unit FROM raw_materials WHERE client_id = $1 ORDER BY name ASC',
    [clientId]
  );

  console.table(finalStockRes.rows.map((r: any) => ({
    Insumo: r.name,
    Categoría: r.category,
    'Stock Restante': `${parseFloat(r.stock_in_consumption_units).toLocaleString()} ${r.consumption_unit}`,
  })));

  console.log('\n🎉 === ¡VALIDACIÓN DE FLUJO COMPLETO EN LOCAL CONCLUIDA EXITOSAMENTE CON 0 ERRORES! ===\n');
  process.exit(0);
}

runValidation().catch(err => {
  console.error('❌ Error en validación:', err);
  process.exit(1);
});
