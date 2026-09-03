import { pool } from './postgres';

let initDatabasePromise: Promise<void> | null = null;

export const initDatabase = async () => {
  if (initDatabasePromise) {
    return initDatabasePromise;
  }

  initDatabasePromise = (async () => {
    console.log("[DB Init] 🔄 Inicializando base de datos en PostgreSQL...");

    try {
        // 1. Crear extensión UUID en caso de que no exista
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        console.log("[DB Init] ✅ Extensión uuid-ossp lista.");

        // 2. Crear tabla clients (con credenciales de acceso y drive_folder_id)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                system_prompt TEXT NOT NULL,
                active_tools TEXT[] DEFAULT '{}',
                status VARCHAR(20) DEFAULT 'active',
                agent_phone VARCHAR(20),
                drive_folder_id VARCHAR(100),
                username VARCHAR(50) UNIQUE,
                password VARCHAR(100),
                email VARCHAR(100),
                contact_name VARCHAR(100),
                owner_phone VARCHAR(20),
                first_message_notified BOOLEAN DEFAULT FALSE,
                is_activated BOOLEAN DEFAULT FALSE,
                category VARCHAR(50) DEFAULT 'optica',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Ejecutar alter table por si la tabla ya existía sin estas columnas
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_phone VARCHAR(20);`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(100);`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS password VARCHAR(100);`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(100);`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100);`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20);`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_message_notified BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'optica';`);
        console.log("[DB Init] ✅ Tabla 'clients' creada y alterada con columnas de Login, agent_phone, drive_folder_id, owner_phone, first_message_notified, is_activated y category.");

        // 2.1 Crear tabla users (usuarios de plataforma) y user_client_roles (acceso multi-tenant)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255),
                full_name VARCHAR(150),
                email VARCHAR(150),
                is_global_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_client_roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL DEFAULT 'viewer',
                permissions_json JSONB DEFAULT '{"modules": []}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, client_id, role)
            );
        `);

        await pool.query(`
            INSERT INTO users (username, password_hash, full_name, email, is_global_admin)
            SELECT c.username, c.password, c.name, c.email, (c.username = 'admin')
            FROM clients c
            WHERE c.username IS NOT NULL
            ON CONFLICT (username) DO NOTHING
        `);

        await pool.query(`
            INSERT INTO user_client_roles (user_id, client_id, role, permissions_json)
            SELECT u.id, c.id, 'admin_tenant', '{"modules":["inventory","billing","crm","calendar","employees","hr","deliveries","whatsapp_bot"]}'::jsonb
            FROM clients c
            INNER JOIN users u ON u.username = c.username
            WHERE c.username IS NOT NULL
            ON CONFLICT (user_id, client_id, role) DO NOTHING
        `);
        console.log("[DB Init] ✅ Tablas 'users' y 'user_client_roles' creadas y sincronizadas con clientes existentes.");

        // 3. Crear tabla interactions (Métricas)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS interactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                sender_phone VARCHAR(20) NOT NULL,
                message_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                tokens_input INT DEFAULT 0,
                tokens_output INT DEFAULT 0,
                api_cost NUMERIC(10, 6) DEFAULT 0.000000,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'interactions' creada o ya existente.");

        // 4. Crear tabla takeover_sessions (Traspaso Humano)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS takeover_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                customer_phone VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'active', -- 'active' (IA pausada), 'closed' (IA activa)
                current_agent_phone VARCHAR(20),
                escalation_index INT DEFAULT 0,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                interacted_with_agent BOOLEAN DEFAULT FALSE,
                customer_name VARCHAR(100) DEFAULT 'Cliente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'takeover_sessions' creada o ya existente.");

        // 4.1 Crear tabla agent_contacts (Lista jerárquica de asesores)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS agent_contacts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                priority INT NOT NULL,
                status VARCHAR(20) DEFAULT 'online', -- 'online', 'offline'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, phone)
            );
        `);
        // Ejecutar alter table por si la columna department no existe
        await pool.query(`ALTER TABLE agent_contacts ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'recepcion';`);
        await pool.query(`ALTER TABLE agent_contacts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE agent_contacts ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'agent';`);
        await pool.query(`ALTER TABLE agent_contacts ADD COLUMN IF NOT EXISTS pin VARCHAR(255) DEFAULT '1234';`);
        await pool.query(`ALTER TABLE agent_contacts ALTER COLUMN pin TYPE VARCHAR(255);`);
        await pool.query(`ALTER TABLE agent_contacts ALTER COLUMN role TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE agent_contacts ALTER COLUMN department TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE takeover_sessions ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'recepcion';`);
        console.log("[DB Init] ✅ Tabla 'agent_contacts' creada o ya existente, alterada con columnas department, is_verified, role y pin ampliadas. Tabla 'takeover_sessions' alterada con department.");

        // 4.2 Crear tabla products (Inventario)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                sku VARCHAR(50),
                description TEXT,
                price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                stock INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'products' creada o ya existente.");

        // 4.3 Tabla de Facturas (Cobro de Cartera / Factura Electrónica)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                invoice_number VARCHAR(50) NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                customer_document_type VARCHAR(10) DEFAULT 'CC',
                customer_document_number VARCHAR(30) NOT NULL,
                customer_email VARCHAR(100) NOT NULL,
                customer_address VARCHAR(200),
                total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                due_date TIMESTAMP NOT NULL,
                reminder_sent BOOLEAN DEFAULT FALSE,
                overdue_sent BOOLEAN DEFAULT FALSE,
                payment_method VARCHAR(50) DEFAULT 'contado',
                installments_count INT DEFAULT 1,
                installment_frequency VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, invoice_number)
            );
        `);
        console.log("[DB Init] ✅ Tabla 'invoices' creada o ya existente.");

        // 4.4 Detalle de Factura
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                quantity INT NOT NULL DEFAULT 1,
                price NUMERIC(10, 2) NOT NULL
            );
        `);
        console.log("[DB Init] ✅ Tabla 'invoice_items' creada o ya existente.");

        // 4.5 Tabla de Cotizaciones Comerciales
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quotes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                quote_number VARCHAR(50) NOT NULL,
                customer_name VARCHAR(150) NOT NULL,
                customer_phone VARCHAR(50),
                customer_email VARCHAR(150),
                customer_document VARCHAR(50),
                items JSONB NOT NULL DEFAULT '[]'::jsonb,
                subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) NOT NULL DEFAULT 'pending',
                valid_until DATE,
                notes TEXT,
                seller_name VARCHAR(100),
                converted_invoice_id UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, quote_number)
            );
            CREATE INDEX IF NOT EXISTS idx_quotes_client_status ON quotes(client_id, status);
        `);
        console.log("[DB Init] ✅ Tabla 'quotes' (Cotizaciones Comerciales) creada.");

        // 5. Crear tabla appointments (Agenda de citas interna)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                customer_phone VARCHAR(20) NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                customer_document_number VARCHAR(30),
                crm_customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL,
                appointment_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
                visit_reason VARCHAR(50) DEFAULT 'examen_vista',
                visit_reason_details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'appointments' creada o ya existente.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointment_settings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                slot_duration_minutes INT NOT NULL DEFAULT 30,
                opening_time TIME NOT NULL DEFAULT '08:00:00',
                closing_time TIME NOT NULL DEFAULT '18:00:00',
                working_days INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
                time_zone VARCHAR(50) DEFAULT 'America/Bogota',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id)
            );
        `);
        console.log("[DB Init] ✅ Tabla 'appointment_settings' creada o ya existente.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointment_schedule_blocks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('day', 'slot')),
                target_date DATE,
                day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
                start_time TIME,
                end_time TIME,
                reason TEXT NOT NULL DEFAULT 'Bloqueado por administración',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_by VARCHAR(100) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK (
                    (block_type = 'day' AND target_date IS NOT NULL AND start_time IS NULL AND end_time IS NULL)
                    OR
                    (block_type = 'slot' AND target_date IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL)
                    OR
                    (block_type = 'slot' AND target_date IS NULL AND day_of_week IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL)
                )
            );
        `);
        console.log("[DB Init] ✅ Tabla 'appointment_schedule_blocks' creada o ya existente.");

        await pool.query(`
            ALTER TABLE appointments
              ALTER COLUMN status SET DEFAULT 'scheduled';
        `);

        await pool.query(`
            UPDATE appointments
            SET status = 'scheduled'
            WHERE status IS NULL OR status NOT IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
        `);

        await pool.query(`
            ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
            ALTER TABLE appointments
              ADD CONSTRAINT appointments_status_check
              CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));
        `);

        await pool.query(`
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_document_number VARCHAR(30);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS crm_customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL;
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_reason VARCHAR(50) DEFAULT 'examen_vista';
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_reason_details TEXT;
        `);

        await pool.query(`
            INSERT INTO appointment_settings (client_id, slot_duration_minutes, opening_time, closing_time, working_days)
            SELECT id, 30, '08:00:00', '18:00:00', ARRAY[1,2,3,4,5]
            FROM clients
            ON CONFLICT (client_id) DO NOTHING;
        `);

        // 5.1 Crear tabla system_alerts (Alertas y Logs de Estado)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                alert_key VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                resolved_by VARCHAR(100),
                resolution_notes TEXT,
                snooze_until TIMESTAMP,
                reopen_count INT DEFAULT 0,
                severity_level INT DEFAULT 1
            );
        `);
        console.log("[DB Init] ✅ Tabla 'system_alerts' creada o ya existente.");

        // Agregar columnas si no existen
        await pool.query(`ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(100);`);
        await pool.query(`ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS resolution_notes TEXT;`);
        await pool.query(`ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMP;`);
        await pool.query(`ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS reopen_count INT DEFAULT 0;`);
        await pool.query(`ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS severity_level INT DEFAULT 1;`);
        console.log("[DB Init] ✅ Columnas añadidas a 'system_alerts'.");

        // 5.2 Modificar y crear tablas de la Fase 2 (Empleados, Turnos, CRM, OTP, etc.)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_departments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'business_departments' creada o ya existente.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, name)
            );
        `);
        console.log("[DB Init] ✅ Tabla 'employee_roles' creada o ya existente.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) DEFAULT '',
                phone VARCHAR(20) NOT NULL,
                role VARCHAR(100) DEFAULT 'agent', -- 'admin', 'agent'
                department_id UUID REFERENCES business_departments(id) ON DELETE SET NULL,
                pin VARCHAR(255) DEFAULT '1234',
                allowed_modules JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'employees' creada o ya existente.");

        await pool.query(`ALTER TABLE employees ALTER COLUMN role TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE employees ALTER COLUMN pin TYPE VARCHAR(255);`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS shift_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                clock_in TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                clock_out TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'shift_logs' creada o ya existente.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS crm_customers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) DEFAULT '',
                document_type VARCHAR(10) DEFAULT 'CC',
                document_number VARCHAR(30) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                address VARCHAR(200),
                lens_prescription TEXT,
                last_interaction_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, document_number)
            );
        `);
        console.log("[DB Init] ✅ Tabla 'crm_customers' creada o ya existente.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS phone_verifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                phone VARCHAR(20) NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'phone_verifications' creada o ya existente.");

        // Modificaciones incrementales
        await pool.query(`
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
        `);
        await pool.query(`
            ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE;
        `);
        console.log("[DB Init] ✅ Columnas logo_url y client_id alteradas.");

        // FASE 3: Modificaciones incrementales y nuevas tablas
        console.log("[DB Init] 🔄 Inicializando tablas de la Fase 3...");

        // 1. Alterar tabla clients (enabled_modules JSONB)
        await pool.query(`
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '{"inventory": true, "billing": true, "crm": true, "calendar": true, "employees": true, "hr": true, "deliveries": true, "whatsapp_bot": true}'::jsonb;
        `);

        // 2. Alterar tabla employees (salarial, supervisor, foto, funciones, etc.)
        await pool.query(`
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_supervisor BOOLEAN DEFAULT FALSE;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_duties TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS arl_class VARCHAR(10) DEFAULT 'I';
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) DEFAULT '';
        `);

        // 3. Alterar tabla shift_logs (lunch)
        await pool.query(`
            ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS lunch_start TIMESTAMP;
            ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS lunch_end TIMESTAMP;
        `);

        // 4. Crear tabla de Campañas / Visitas de Calle & Sitio (field_visits)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS field_visits (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                name VARCHAR(150) NOT NULL,
                campaign_type VARCHAR(50) DEFAULT 'sitio',
                agreement_terms TEXT,
                department VARCHAR(100) NOT NULL DEFAULT 'Cundinamarca',
                municipio VARCHAR(100) NOT NULL DEFAULT 'Bogotá',
                barrio VARCHAR(100),
                point_of_sale VARCHAR(150) NOT NULL DEFAULT 'Principal',
                address VARCHAR(250) NOT NULL,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                contact_name VARCHAR(100) NOT NULL,
                secondary_contacts JSONB DEFAULT '[]',
                proof_photo_url TEXT,
                visit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'programada',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Alterar crm_customers (vendedor asignado, interacciones de seguimiento y link a campaña)
        await pool.query(`
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS assigned_seller_id UUID REFERENCES employees(id) ON DELETE SET NULL;
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS next_interaction_date DATE;
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS suggested_action TEXT;
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS ia_suggested_message TEXT;
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES field_visits(id) ON DELETE SET NULL;
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS marketing_unsubscribed BOOLEAN DEFAULT FALSE;
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) DEFAULT '';
        `);

        // 6. Alterar invoices y productos (link campaña, costos, alarmas)
        await pool.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES field_visits(id) ON DELETE SET NULL;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0.00;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 5;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(100);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_phone VARCHAR(20);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS material VARCHAR(100);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS style VARCHAR(100);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(100);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_discount NUMERIC(5,2) DEFAULT 0.00;
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0.00;
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_document_number VARCHAR(30);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS crm_customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL;
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_reason VARCHAR(50) DEFAULT 'examen_vista';
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_reason_details TEXT;
        `);

        // 7. Crear tabla de Metas Mensuales (sales_goals)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sales_goals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                department_id UUID REFERENCES business_departments(id) ON DELETE CASCADE,
                employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                target_amount NUMERIC(12,2) NOT NULL,
                current_amount NUMERIC(12,2) DEFAULT 0.00,
                month_year VARCHAR(7) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 8. Crear tabla de Tareas del Personal (employee_tasks)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_tasks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                due_date TIMESTAMP,
                status VARCHAR(20) DEFAULT 'pendiente',
                created_by_name VARCHAR(100) DEFAULT 'Administrador',
                task_type VARCHAR(20) DEFAULT 'tarea',
                target_customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(100) DEFAULT 'Administrador';
            ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) DEFAULT 'tarea';
            ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS target_customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL;
        `);

        // 8b. Crear tabla de Reportes/Actualizaciones de Tareas (employee_task_updates)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_task_updates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
                old_status VARCHAR(20),
                new_status VARCHAR(20) NOT NULL,
                report_text TEXT NOT NULL,
                created_by_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 9. Crear tabla de Documentos de RRHH (hr_documents)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hr_documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                doc_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'approved',
                file_url TEXT,
                notes TEXT,
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 10. Crear tabla de Envíos / Domicilios (deliveries)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deliveries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                delivery_guy_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
                recipient_name VARCHAR(100) NOT NULL,
                recipient_phone VARCHAR(20) NOT NULL,
                address VARCHAR(250) NOT NULL,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                route_order INT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pendiente',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 11. Crear tabla de Auditoría de Empleados (employee_activity_logs)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_activity_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 12. Crear tablas de Campañas de Marketing y Difusiones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                base_message TEXT NOT NULL,
                target_segment VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS marketing_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
                customer_phone VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'sent',
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 13. Crear tabla de Mensajes del Chat Corporativo
        await pool.query(`
            CREATE TABLE IF NOT EXISTS corporate_chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                sender_name VARCHAR(100) NOT NULL,
                message_text TEXT NOT NULL,
                channel VARCHAR(50) DEFAULT 'general',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("[DB Init] ✅ Tablas y alteraciones de la Fase 3 completadas con éxito.");

        // 6. Crear tabla vector_store (pgvector para el RAG)
        await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        console.log("[DB Init] ✅ Extensión vector (pgvector) lista.");

        // Eliminar tabla anterior para limpiar dimensiones antiguas de 768
        await pool.query(`DROP TABLE IF EXISTS vector_store CASCADE;`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS vector_store (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                embedding vector(3072) NOT NULL,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'vector_store' (pgvector 3072 dimensiones) creada.");

        // 7. Semillar/Insertar Clientes Iniciales (Seed Data)
        const clientsToSeed = [
            {
                id: "client_001",
                name: "Clínica Dental Sonrisas",
                phone_number: "1234567890",
                system_prompt: "Eres el asistente virtual de Clínica Sonrisas. Tu objetivo es agendar citas médicas con empatía y revisar horarios.",
                active_tools: ["agendarCita", "consultarHorarios"],
                agent_phone: "573001112222", // Número del dentista humano
                category: "optica"
            },
            {
                id: "client_002",
                name: "Pizzería Napoli",
                phone_number: "0987654321",
                system_prompt: "Eres el asistente de Pizzería Napoli. Debes tomar pedidos, confirmar la dirección de envío y calcular el costo.",
                active_tools: ["crearPedido", "consultarMenu"],
                agent_phone: "573003334444", // Número del pizzero humano
                category: "restaurante"
            }
        ];

        for (const client of clientsToSeed) {
            await pool.query(`
                INSERT INTO clients (id, name, phone_number, system_prompt, active_tools, status, agent_phone, category)
                VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    phone_number = EXCLUDED.phone_number,
                    system_prompt = EXCLUDED.system_prompt,
                    active_tools = EXCLUDED.active_tools,
                    agent_phone = EXCLUDED.agent_phone,
                    category = EXCLUDED.category;
            `, [client.id, client.name, client.phone_number, client.system_prompt, client.active_tools, client.agent_phone, client.category]);
        }

        console.log("[DB Init] ✅ Datos iniciales de clientes semillados correctamente.");

        // --- MIGRACIONES FASE 4: FACTURACIÓN COMPLETA, CARTERA Y LOGÍSTICA ---
        console.log("[DB Init] 🔄 Inicializando tablas y columnas de la Fase 4...");
        
        await pool.query(`
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS nit VARCHAR(50);
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS address VARCHAR(255);
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS invoice_footer TEXT;
        `);

        await pool.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'local';
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0.00;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_address TEXT;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending';
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_name VARCHAR(150);
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_user_name VARCHAR(150);

            CREATE TABLE IF NOT EXISTS employee_targets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL,
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                month_year VARCHAR(7) NOT NULL,
                target_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, month_year)
            );

            CREATE TABLE IF NOT EXISTS employee_commissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL,
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                month_year VARCHAR(7) NOT NULL,
                sale_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS birth_date DATE;
            ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'persona';

            ALTER TABLE clients ADD COLUMN IF NOT EXISTS parent_client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE;
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS branch_name VARCHAR(150);
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_main_branch BOOLEAN DEFAULT true;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

            CREATE TABLE IF NOT EXISTS employee_branch_transfers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                transferred_by_user_name VARCHAR(150) NOT NULL,
                reason TEXT,
                transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS inventory_transfers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transfer_code VARCHAR(50) NOT NULL UNIQUE,
                from_client_id VARCHAR(50) NOT NULL REFERENCES clients(id),
                to_client_id VARCHAR(50) NOT NULL REFERENCES clients(id),
                product_id UUID NOT NULL REFERENCES products(id),
                product_name VARCHAR(200) NOT NULL,
                quantity NUMERIC(12,2) NOT NULL,
                status VARCHAR(30) DEFAULT 'completed',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

            CREATE TABLE IF NOT EXISTS product_variants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE,
                variant_name VARCHAR(100) NOT NULL,
                color_hex VARCHAR(30),
                sku VARCHAR(100),
                price NUMERIC(10,2),
                cost_price NUMERIC(10,2) DEFAULT 0.00,
                stock INT NOT NULL DEFAULT 0,
                min_stock INT NOT NULL DEFAULT 2,
                image_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE;
            ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_hex VARCHAR(30);
            ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
            ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0.00;

            UPDATE product_variants pv 
            SET client_id = p.client_id 
            FROM products p 
            WHERE pv.product_id = p.id AND (pv.client_id IS NULL OR pv.client_id = '');
        `);

        await pool.query(`
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100);
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(150);
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'inventory';
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lens_design VARCHAR(100);
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lens_material VARCHAR(100);
            ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lens_treatment VARCHAR(100);
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoice_installments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
                installment_number INT NOT NULL,
                due_date TIMESTAMP NOT NULL,
                amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                paid_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS formulas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE,
                customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE,
                od_sphere VARCHAR(15),
                od_cylinder VARCHAR(15),
                od_axis VARCHAR(15),
                od_addition VARCHAR(15),
                oi_sphere VARCHAR(15),
                oi_cylinder VARCHAR(15),
                oi_axis VARCHAR(15),
                oi_addition VARCHAR(15),
                dp_distance VARCHAR(15),
                height VARCHAR(15),
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // ----------------- FASE 5: Proveedores, Categorías y Compras -----------------
        console.log("[DB Init] 🔄 Inicializando tablas de la Fase 5 (Proveedores y Compras)...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, name)
            );

            CREATE TABLE IF NOT EXISTS suppliers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                email VARCHAR(100),
                address VARCHAR(200),
                contact_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS supplier_categories (
                supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
                category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
                PRIMARY KEY(supplier_id, category_id)
            );

            CREATE TABLE IF NOT EXISTS purchase_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
                order_number VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                total_amount NUMERIC(12, 2) DEFAULT 0.00,
                delivery_method VARCHAR(50) DEFAULT 'envio_tienda',
                carrier_name VARCHAR(100),
                tracking_number VARCHAR(100),
                shipping_cost NUMERIC(10, 2) DEFAULT 0.00,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                received_at TIMESTAMP,
                UNIQUE(client_id, order_number)
            );

            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
                product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                quantity INT NOT NULL,
                cost_price NUMERIC(10, 2) NOT NULL
            );
        `);
        await pool.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
        `);
        console.log("[DB Init] ✅ Tablas y alteraciones de la Fase 5 completadas con éxito.");

        // --- MIGRACIONES DE LA FASE DE LABS & NÓMINA ---
        console.log("[DB Init] 🔄 Inicializando tablas y columnas de Laboratorios, Nómina y Anticipos...");

        // A. Corrección de restricción en invoice_items (Bug D)
        await pool.query(`
            ALTER TABLE invoice_items ALTER COLUMN product_id DROP NOT NULL;
        `);

        // B. Alteraciones de proveedores y empleados
        await pool.query(`
            ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_laboratory BOOLEAN DEFAULT FALSE;
            
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary NUMERIC(10, 2) DEFAULT 0.00;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'fixed_monthly';
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_period VARCHAR(20) DEFAULT 'mensual';
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS cutoff_day_1 INT DEFAULT 15;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS cutoff_day_2 INT DEFAULT 30;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_day_1 INT DEFAULT 15;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_day_2 INT DEFAULT 30;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS vacation_days_accumulated NUMERIC(5, 2) DEFAULT 0.00;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0.00;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC(12, 2) DEFAULT 0.00;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'vinculado';
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS activity_status VARCHAR(20) DEFAULT 'activo';
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash';
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'indefinido';
            ALTER TABLE hr_documents ADD COLUMN IF NOT EXISTS admin_notes TEXT;
        `);

        // C. Crear tabla lab_jobs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lab_jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                customer_id UUID NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
                formula_id UUID REFERENCES formulas(id) ON DELETE SET NULL,
                supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
                invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
                product_name VARCHAR(150),
                lens_design VARCHAR(100),
                lens_material VARCHAR(100),
                lens_treatment VARCHAR(100),
                job_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                notes TEXT,
                sent_at TIMESTAMP,
                received_at TIMESTAMP,
                delivered_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // D. Crear tabla employee_advances
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_advances (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                requested_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                admin_notes TEXT,
                payment_method VARCHAR(20) DEFAULT 'cash',
                bank_name VARCHAR(50),
                confirmed_by_admin BOOLEAN DEFAULT FALSE,
                confirmed_by_employee BOOLEAN DEFAULT FALSE,
                delivered_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tablas y alteraciones de Laboratorios, Nómina y Anticipos completadas con éxito.");
        console.log("[DB Init] ✅ Tablas y columnas de la Fase 4 creadas o verificadas con éxito.");

        // ── FASE 5: Arquitectura multi-tenant, identidad y trazabilidad de stock ──
        await pool.query(`
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS banner_url TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE employees ALTER COLUMN pin TYPE VARCHAR(255);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_stock INT DEFAULT 0;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS committed_stock INT DEFAULT 0;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS available_modifiers JSONB DEFAULT '[]';
            ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_movements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                movement_type VARCHAR(30) NOT NULL,
                quantity INT NOT NULL,
                previous_stock INT NOT NULL DEFAULT 0,
                new_stock INT NOT NULL DEFAULT 0,
                reference_id UUID,
                reference_type VARCHAR(50),
                notes TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_stock_movements_client ON stock_movements(client_id);
            CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
        `);

        // ── FASE 6: Módulo Contable, Cuentas Bancarias del Negocio y Métodos de Pago ──
        await pool.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transfer_bank VARCHAR(100);
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transfer_destination_account VARCHAR(200);
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_user_name VARCHAR(100);
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_by_user_name VARCHAR(100);
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cufe VARCHAR(100);
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electronic_status VARCHAR(30) DEFAULT 'draft';
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_breakdown JSONB;
            
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) DEFAULT 'basic';
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS electronic_invoices_limit INT DEFAULT 10;
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS electronic_invoices_used INT DEFAULT 0;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price NUMERIC(10, 2) NOT NULL,
                billing_cycle VARCHAR(20) DEFAULT 'monthly',
                features JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_subscription_plans_client ON subscription_plans(client_id);

            CREATE TABLE IF NOT EXISTS business_bank_accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                bank_name VARCHAR(100) NOT NULL,
                account_type VARCHAR(50) NOT NULL DEFAULT 'ahorros',
                account_number VARCHAR(100) NOT NULL,
                account_holder VARCHAR(150),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_business_bank_accounts_client ON business_bank_accounts(client_id);
        `);

        // Reparación e inicialización secuencial automática de Códigos de Empleados (EMP-001, EMP-002, etc.)
        await pool.query(`
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50);
            
            WITH numbered_employees AS (
                SELECT id, client_id, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at ASC, id ASC) as seq
                FROM employees
            )
            UPDATE employees e
            SET employee_code = 'EMP-' || LPAD(ne.seq::text, 3, '0')
            FROM numbered_employees ne
            WHERE e.id = ne.id AND (e.employee_code IS NULL OR e.employee_code = '' OR e.employee_code = 'EMP-004');
        `);

        // Tabla de Trazabilidad y Bitácora de Auditoría del Sistema
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                user_name VARCHAR(100) NOT NULL DEFAULT 'Sistema / IA',
                user_email VARCHAR(100),
                user_role VARCHAR(50) DEFAULT 'operador',
                action VARCHAR(100) NOT NULL,
                module VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                details JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_audit_logs_client ON system_audit_logs(client_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON system_audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON system_audit_logs(module);
        `);

        console.log("[DB Init] ✅ Módulo de Trazabilidad Global y Bitácora de Auditoría inicializado.");

        // ----------------- FASE RESTAURANTES & GASTRONOMÍA -----------------
        console.log("[DB Init] 🔄 Inicializando tablas del Módulo de Restaurantes & Gastronomía...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS restaurant_tables (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                table_number VARCHAR(20) NOT NULL,
                zone VARCHAR(50) DEFAULT 'Salon Principal',
                capacity INT DEFAULT 4,
                status VARCHAR(20) DEFAULT 'free',
                assigned_waiter_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, table_number, zone)
            );

            CREATE TABLE IF NOT EXISTS product_recipes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                raw_product_id UUID,
                quantity_required NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
                unit_of_measure VARCHAR(30) DEFAULT 'unidad',
                preparation_instructions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE product_recipes DROP CONSTRAINT IF EXISTS product_recipes_raw_product_id_fkey;

            CREATE TABLE IF NOT EXISTS kitchen_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
                invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
                waiter_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                order_number VARCHAR(50) NOT NULL,
                station VARCHAR(30) NOT NULL DEFAULT 'kitchen',
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                items JSONB NOT NULL DEFAULT '[]'::jsonb,
                notes TEXT,
                prep_start_time TIMESTAMP,
                ready_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_kitchen_orders_client ON kitchen_orders(client_id, status);

            CREATE TABLE IF NOT EXISTS raw_materials (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'General',
                purchase_unit VARCHAR(50) NOT NULL DEFAULT 'kg',
                purchase_unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                conversion_factor_to_consumption NUMERIC(12,4) NOT NULL DEFAULT 1000.0000,
                consumption_unit VARCHAR(30) NOT NULL DEFAULT 'g',
                stock_in_consumption_units NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
                min_stock_alert NUMERIC(14,4) DEFAULT 1000.0000,
                expiration_date DATE,
                batch_number VARCHAR(100),
                is_casual_purchase BOOLEAN DEFAULT FALSE,
                supplier_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS expiration_date DATE;
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS is_casual_purchase BOOLEAN DEFAULT FALSE;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'product';
            CREATE INDEX IF NOT EXISTS idx_raw_materials_client ON raw_materials(client_id);

            CREATE TABLE IF NOT EXISTS business_assets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                asset_type VARCHAR(50) DEFAULT 'equipo',
                asset_value NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                useful_life_months INT NOT NULL DEFAULT 60,
                purchase_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS business_liabilities (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                creditor_name VARCHAR(255) NOT NULL,
                liability_type VARCHAR(50) DEFAULT 'bancario',
                total_debt NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                monthly_payment NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                interest_rate_annual NUMERIC(5,2) DEFAULT 0.00,
                remaining_months INT DEFAULT 12,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cash_shifts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_out_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                employee_out_name VARCHAR(100),
                employee_in_id UUID REFERENCES employees(id) ON DELETE SET NULL,
                employee_in_name VARCHAR(100),
                start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                initial_cash NUMERIC(12,2) DEFAULT 0.00,
                total_cash_sales NUMERIC(12,2) DEFAULT 0.00,
                total_card_sales NUMERIC(12,2) DEFAULT 0.00,
                total_transfer_sales NUMERIC(12,2) DEFAULT 0.00,
                total_sales NUMERIC(12,2) DEFAULT 0.00,
                reported_cash_in_drawer NUMERIC(12,2) DEFAULT 0.00,
                cash_difference NUMERIC(12,2) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'pending_confirmation',
                notes TEXT,
                client_timestamp TIMESTAMP,
                server_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                clock_drift_seconds INT DEFAULT 0,
                confirmed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMP;
            ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS server_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS clock_drift_seconds INT DEFAULT 0;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS professional_license VARCHAR(50);

            CREATE TABLE IF NOT EXISTS patient_clinical_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL,
                customer_name VARCHAR(150) NOT NULL,
                customer_document VARCHAR(50),
                customer_phone VARCHAR(50),
                consultation_reason TEXT,
                medical_antecedents TEXT,
                ocular_antecedents TEXT,
                has_strabismus BOOLEAN DEFAULT FALSE,
                strabismus_notes TEXT,
                has_pterygium BOOLEAN DEFAULT FALSE,
                pterygium_notes TEXT,
                has_cataract BOOLEAN DEFAULT FALSE,
                cataract_notes TEXT,
                surgeries_antecedents TEXT,
                allergies_antecedents TEXT,
                systemic_antecedents TEXT,
                family_antecedents TEXT,
                previous_rx_od VARCHAR(100),
                previous_rx_oi VARCHAR(100),
                visual_acuity_od VARCHAR(50),
                visual_acuity_oi VARCHAR(50),
                refraction_od VARCHAR(100),
                refraction_oi VARCHAR(100),
                retinoscopy_od VARCHAR(100),
                retinoscopy_oi VARCHAR(100),
                subjective_od VARCHAR(100),
                subjective_oi VARCHAR(100),
                tonometry_od VARCHAR(50),
                tonometry_oi VARCHAR(50),
                biomicroscopy_notes TEXT,
                pupillary_reflexes TEXT,
                ophthalmoscopy_notes TEXT,
                diagnosis TEXT,
                cie10_code VARCHAR(20),
                treatment_plan TEXT,
                optometrist_name VARCHAR(100),
                professional_license VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS has_strabismus BOOLEAN DEFAULT FALSE;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS strabismus_notes TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS has_pterygium BOOLEAN DEFAULT FALSE;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS pterygium_notes TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS has_cataract BOOLEAN DEFAULT FALSE;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS cataract_notes TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS surgeries_antecedents TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS allergies_antecedents TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS systemic_antecedents TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS family_antecedents TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS previous_rx_od VARCHAR(100);
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS previous_rx_oi VARCHAR(100);
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS retinoscopy_od VARCHAR(100);
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS retinoscopy_oi VARCHAR(100);
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS subjective_od VARCHAR(100);
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS subjective_oi VARCHAR(100);
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS biomicroscopy_notes TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS pupillary_reflexes TEXT;
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS cie10_code VARCHAR(20);
            ALTER TABLE patient_clinical_records ADD COLUMN IF NOT EXISTS professional_license VARCHAR(50);

            CREATE TABLE IF NOT EXISTS monthly_fixed_expenses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                concept VARCHAR(150) NOT NULL,
                category VARCHAR(50) DEFAULT 'operativo',
                expense_type VARCHAR(20) DEFAULT 'fijo',
                expense_date DATE DEFAULT CURRENT_DATE,
                amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                period_month_year VARCHAR(7),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE monthly_fixed_expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(20) DEFAULT 'fijo';
            ALTER TABLE monthly_fixed_expenses ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;

            CREATE TABLE IF NOT EXISTS enterprise_initial_investment (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                category VARCHAR(50) NOT NULL,
                concept VARCHAR(150) NOT NULL,
                amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS enterprise_loans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                bank_name VARCHAR(150) NOT NULL,
                loan_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                monthly_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 1.50,
                term_months INT NOT NULL DEFAULT 36,
                monthly_installment_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                start_date DATE DEFAULT CURRENT_DATE,
                is_active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS support_tickets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                ticket_code VARCHAR(30) UNIQUE NOT NULL,
                created_by_user_name VARCHAR(150) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'general',
                status VARCHAR(30) DEFAULT 'open',
                ai_diagnosis TEXT,
                ai_action_taken TEXT,
                stack_trace TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Tabla de Comisiones de Vendedores (Cruzadas con Metas)
            CREATE TABLE IF NOT EXISTS employee_commissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
                sale_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                commission_pct NUMERIC(5,2) DEFAULT 0.00,
                month_year VARCHAR(7) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Tabla de Sesiones Activas por Usuario (Sesión Única por Dispositivo)
            CREATE TABLE IF NOT EXISTS active_user_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_type VARCHAR(20) NOT NULL, -- 'client', 'user', 'employee'
                user_id VARCHAR(100) NOT NULL,
                client_id VARCHAR(50) NOT NULL,
                session_id UUID NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_user_active_session UNIQUE (user_type, user_id)
            );
        `);

        // Sincronización de contact_name a full_name en users para corregir nombres de tienda en accesos
        await pool.query(`
            UPDATE users u
            SET full_name = c.contact_name
            FROM clients c
            WHERE LOWER(u.username) = LOWER(c.username)
              AND c.contact_name IS NOT NULL
              AND c.contact_name != ''
              AND (u.full_name IS NULL OR u.full_name != c.contact_name);
        `);

        console.log("[DB Init] ✅ Tablas de Finanzas, Inversión, Préstamos, Tickets, Variantes y Comisiones inicializadas.");
        console.log("[DB Init] 🎉 ¡Inicialización completada con éxito!");

    } catch (error) {
        console.error("[DB Init] ❌ Error inicializando base de datos:", error);
        throw error;
    }
  })();

  return initDatabasePromise;
};
