import { pool } from '../database/postgres';

export interface CatalogBranch {
  id: string;
  name: string;
  branch_name: string;
  address: string;
  phone: string;
  is_main_branch: boolean;
}

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  promo_discount: number;
  final_price: number;
  stock: number;
  image_url: string | null;
  gallery_images: string[];
  brand: string | null;
  material: string | null;
  style: string | null;
  color: string | null;
  is_featured: boolean;
  category_name?: string;
}

export interface PublicCatalogData {
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    banner_url: string | null;
    primary_color: string;
    catalog_description: string | null;
    phone: string | null;
    agent_phone: string | null;
    address: string | null;
    category: string;
  };
  branches: CatalogBranch[];
  categories: Array<{ id: string; name: string }>;
  products: CatalogProduct[];
}

/**
 * Normaliza y resuelve un cliente/tenant por su slug o ID o username
 */
export async function getClientBySlugOrId(identifier: string) {
  const cleanId = identifier.trim().toLowerCase();
  
  const res = await pool.query(
    `SELECT id, name, COALESCE(slug, id) as slug, logo_url, banner_url, 
            COALESCE(primary_color, '#2563eb') as primary_color, 
            catalog_description, phone_number, agent_phone, address, category,
            COALESCE(web_catalog_enabled, true) as web_catalog_enabled
     FROM clients 
     WHERE LOWER(id) = $1 OR LOWER(slug) = $1 OR LOWER(username) = $1 
     LIMIT 1`,
    [cleanId]
  );

  if (res.rows.length === 0) {
    // Si no encuentra coincidencia exacta, intentamos reemplazar guiones por espacios
    const fuzzyName = cleanId.replace(/-/g, ' ');
    const fallbackRes = await pool.query(
      `SELECT id, name, COALESCE(slug, id) as slug, logo_url, banner_url, 
              COALESCE(primary_color, '#2563eb') as primary_color, 
              catalog_description, phone_number, agent_phone, address, category,
              COALESCE(web_catalog_enabled, true) as web_catalog_enabled
       FROM clients 
       WHERE LOWER(name) LIKE $1 
       LIMIT 1`,
      [`%${fuzzyName}%`]
    );
    return fallbackRes.rows[0] || null;
  }

  return res.rows[0];
}

/**
 * Obtiene el catálogo público estructurado para el cliente final
 */
export async function getPublicCatalog(identifier: string): Promise<PublicCatalogData | null> {
  const client = await getClientBySlugOrId(identifier);

  if (!client || !client.web_catalog_enabled) {
    return null;
  }

  const clientId = client.id;

  // 1. Obtener sedes (branches)
  const branchesRes = await pool.query(
    `SELECT id, name, COALESCE(branch_name, name) as branch_name, 
            COALESCE(address, '') as address, COALESCE(phone_number, agent_phone, '') as phone,
            COALESCE(is_main_branch, (id = $1)) as is_main_branch
     FROM clients 
     WHERE id = $1 OR parent_client_id = $1
     ORDER BY is_main_branch DESC, name ASC`,
    [clientId]
  );

  // 2. Obtener categorías de productos visibles en la web
  const categoriesRes = await pool.query(
    `SELECT id, name FROM product_categories WHERE client_id = $1 AND (is_visible_web IS TRUE OR is_visible_web IS NULL) ORDER BY name ASC`,
    [clientId]
  );

  // 3. Obtener productos públicos visibles (excluyendo categorías ocultas)
  const productsRes = await pool.query(
    `SELECT p.id, p.name, p.sku, p.description, 
            p.price::float as price, 
            COALESCE(p.promo_discount, 0)::float as promo_discount,
            p.stock, p.image_url, 
            COALESCE(p.gallery_images, '[]'::jsonb) as gallery_images,
            p.brand, p.material, p.style, p.color, 
            COALESCE(p.is_featured, false) as is_featured,
            pc.name as category_name
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE p.client_id = $1 
       AND (p.is_visible_web IS TRUE OR p.is_visible_web IS NULL)
       AND (pc.id IS NULL OR pc.is_visible_web IS TRUE OR pc.is_visible_web IS NULL)
     ORDER BY p.is_featured DESC, p.created_at DESC`,
    [clientId]
  );

  const sanitizedProducts: CatalogProduct[] = productsRes.rows.map(row => {
    const rawPrice = Number(row.price) || 0;
    const discount = Number(row.promo_discount) || 0;
    const finalPrice = discount > 0 ? Math.max(0, rawPrice * (1 - discount / 100)) : rawPrice;

    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      description: row.description,
      price: rawPrice,
      promo_discount: discount,
      final_price: Math.round(finalPrice * 100) / 100,
      stock: Math.max(0, row.stock || 0),
      image_url: row.image_url,
      gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : [],
      brand: row.brand,
      material: row.material,
      style: row.style,
      color: row.color,
      is_featured: Boolean(row.is_featured),
      category_name: row.category_name || undefined
    };
  });

  return {
    tenant: {
      id: client.id,
      name: client.name,
      slug: client.slug || client.id,
      logo_url: client.logo_url,
      banner_url: client.banner_url,
      primary_color: client.primary_color || '#2563eb',
      catalog_description: client.catalog_description,
      phone: client.phone_number,
      agent_phone: client.agent_phone,
      address: client.address,
      category: client.category || 'general'
    },
    branches: branchesRes.rows,
    categories: categoriesRes.rows,
    products: sanitizedProducts
  };
}

/**
 * Procesa la creación de un pedido desde el Catálogo Web
 */
export async function createCatalogOrder(identifier: string, orderData: {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  customer_document?: string;
  branch_id?: string;
  delivery_method?: 'domicilio' | 'pickup';
  notes?: string;
  items: Array<{ product_id: string; quantity: number }>;
}) {
  const client = await getClientBySlugOrId(identifier);
  if (!client) {
    throw new Error('Negocio no encontrado');
  }

  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new Error('El carrito no contiene productos');
  }

  const clientId = client.id;
  const productIds = orderData.items.map(item => item.product_id);

  // Consultar precios reales del servidor para evitar manipulación
  const productsDbRes = await pool.query(
    `SELECT id, name, price::float, promo_discount::float, stock 
     FROM products 
     WHERE client_id = $1 AND id = ANY($2::uuid[])`,
    [clientId, productIds]
  );

  const productMap = new Map<string, any>();
  for (const row of productsDbRes.rows) {
    productMap.set(row.id, row);
  }

  let totalAmount = 0;
  const processedItems: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }> = [];

  for (const item of orderData.items) {
    const dbProd = productMap.get(item.product_id);
    if (!dbProd) {
      throw new Error(`El producto ${item.product_id} no está disponible`);
    }

    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const rawPrice = Number(dbProd.price) || 0;
    const discount = Number(dbProd.promo_discount) || 0;
    const unitPrice = discount > 0 ? rawPrice * (1 - discount / 100) : rawPrice;
    const subtotal = Math.round(unitPrice * qty * 100) / 100;

    totalAmount += subtotal;

    processedItems.push({
      product_id: dbProd.id,
      name: dbProd.name,
      quantity: qty,
      unit_price: Math.round(unitPrice * 100) / 100,
      subtotal
    });
  }

  totalAmount = Math.round(totalAmount * 100) / 100;

  // Generar número consecutivo de orden WEB
  const countRes = await pool.query(
    `SELECT COUNT(*) FROM invoices WHERE client_id = $1 AND invoice_number LIKE 'WEB-%'`,
    [clientId]
  );
  const nextNum = (parseInt(countRes.rows[0].count, 10) || 0) + 1;
  const invoiceNumber = `WEB-${String(nextNum).padStart(4, '0')}`;

  const cleanPhone = (orderData.customer_phone || '').replace(/\D/g, '');
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  // Insertar Orden/Factura en DB
  const invoiceRes = await pool.query(
    `INSERT INTO invoices (
      client_id, invoice_number, customer_name, customer_phone, 
      customer_email, customer_address, customer_document_number,
      total_amount, status, due_date, payment_method, order_source,
      delivery_method, delivery_address, branch_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, 'contado', 'web_catalog', $10, $11, $12)
    RETURNING id`,
    [
      clientId,
      invoiceNumber,
      orderData.customer_name || 'Cliente Web',
      cleanPhone || '0000000000',
      orderData.customer_email || '',
      orderData.customer_address || '',
      orderData.customer_document || 'NA',
      totalAmount,
      dueDate,
      orderData.delivery_method || 'domicilio',
      orderData.customer_address || '',
      orderData.branch_id || clientId
    ]
  );

  const invoiceId = invoiceRes.rows[0].id;

  // Insertar ítems de orden
  for (const item of processedItems) {
    await pool.query(
      `INSERT INTO invoice_items (invoice_id, product_id, quantity, price)
       VALUES ($1, $2, $3, $4)`,
      [invoiceId, item.product_id, item.quantity, item.unit_price]
    );

    // Descontar inventario
    await pool.query(
      `UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 AND client_id = $3`,
      [item.quantity, item.product_id, clientId]
    );
  }

  // Número de WhatsApp destino (teléfono de la sede o del negocio)
  const targetWhatsappPhone = (client.agent_phone || client.phone_number || '').replace(/\D/g, '');

  // Construir mensaje formateado para WhatsApp
  let itemsSummary = processedItems.map(i => `• ${i.quantity}x ${i.name} ($${i.subtotal.toLocaleString('es-CO')})`).join('\n');
  const deliveryText = orderData.delivery_method === 'pickup' ? '🏬 Retiro en Tienda' : `🚚 Envío a Domicilio (${orderData.customer_address || 'Dirección indicada'})`;

  const waMessage = 
`🛍️ *NUEVO PEDIDO DE CATÁLOGO WEB* (${invoiceNumber})
-----------------------------------------
👤 *Cliente:* ${orderData.customer_name}
📱 *Teléfono:* ${orderData.customer_phone}
📦 *Modo:* ${deliveryText}

*Productos Solicitados:*
${itemsSummary}

💰 *TOTAL A PAGAR:* $${totalAmount.toLocaleString('es-CO')} COP
-----------------------------------------
Por favor confirmar disponiblidad y coordinar entrega. ¡Gracias!`;

  const encodedMsg = encodeURIComponent(waMessage);
  const whatsappUrl = targetWhatsappPhone ? `https://wa.me/${targetWhatsappPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

  return {
    success: true,
    invoice_id: invoiceId,
    invoice_number: invoiceNumber,
    total_amount: totalAmount,
    currency: 'COP',
    whatsapp_url: whatsappUrl,
    whatsapp_number: targetWhatsappPhone,
    summary: {
      items_count: processedItems.reduce((acc, i) => acc + i.quantity, 0),
      delivery_method: orderData.delivery_method || 'domicilio'
    }
  };
}
