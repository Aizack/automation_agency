import { createClientFolder } from '../services/drive';
import { createClient } from '../database/clientsCrud';
import { activeWaSessions } from '../services/whatsapp';

export const registrarClienteTool = {
    name: "registrar_cliente",
    description: "Registra un nuevo negocio o cliente en el sistema multi-tenant, creando su base de conocimientos en Drive y sus credenciales de acceso.",
    parameters: {
        type: "object",
        properties: {
            nombreEmpresa: { 
                type: "string", 
                description: "El nombre oficial del negocio o empresa a registrar (ej. Dental Studio, Pizzería Bella)" 
            },
            telefonoCliente: { 
                type: "string", 
                description: "El número de WhatsApp completo del cliente/dueño del negocio, con código de país (ej. 573001112222)" 
            },
            nombreContacto: { 
                type: "string", 
                description: "El nombre de la persona o contacto representante del negocio" 
            },
            emailContacto: { 
                type: "string", 
                description: "El correo electrónico del contacto principal" 
            }
        },
        required: ["nombreEmpresa", "telefonoCliente", "nombreContacto"]
    },
    execute: async (args: { nombreEmpresa: string, telefonoCliente: string, nombreContacto: string, emailContacto?: string }) => {
        console.log(`[Tool Registrar Cliente] 🚀 Iniciando onboarding de: ${args.nombreEmpresa}`);

        // 1. Limpieza de número de teléfono
        const cleanPhone = args.telefonoCliente.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
            throw new Error(`El número de teléfono '${args.telefonoCliente}' no es válido.`);
        }

        // 2. Generación automática de credenciales legibles
        const sanitizedContact = args.nombreContacto
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[^a-zA-Z0-9]/g, "_"); // Quitar espacios/especiales
        const username = `${sanitizedContact}_${Math.floor(100 + Math.random() * 900)}`;
        const password = Math.floor(100000 + Math.random() * 900000).toString();

        const cleanName = args.nombreEmpresa
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "_");
        const clientId = `client_${cleanName}_${Date.now().toString().slice(-4)}`;

        // 3. Crear Carpeta en Google Drive
        let driveFolderId = "";
        try {
            driveFolderId = await createClientFolder(args.nombreEmpresa);
            console.log(`[Tool Registrar Cliente] 📁 Carpeta de Drive creada: ${driveFolderId}`);
        } catch (driveErr: any) {
            console.error("[Tool Registrar Cliente] ⚠️ Error al crear carpeta de Drive (se procederá sin Drive):", driveErr.message);
        }

        // 4. Guardar cliente en la base de datos PostgreSQL
        await createClient({
            id: clientId,
            name: args.nombreEmpresa,
            phone_number: cleanPhone,
            system_prompt: `Eres Frant, el asistente virtual oficial de ${args.nombreEmpresa}. Responde amablemente basado en la información de tu base de conocimientos.`,
            active_tools: [],
            agent_phone: cleanPhone,
            drive_folder_id: driveFolderId || '',
            username: username,
            password: password,
            email: args.emailContacto || '',
            contact_name: args.nombreContacto
        });

        // 5. Abrir sesión de carga de WhatsApp por 10 minutos (600,000 ms)
        activeWaSessions.set(cleanPhone, {
            clientId: clientId,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        console.log(`[Tool Registrar Cliente] ✅ Registro exitoso. Cliente: ${clientId}. WhatsApp Session iniciada para +${cleanPhone}`);

        return JSON.stringify({
            success: true,
            clientId,
            username,
            password,
            driveFolderId,
            phoneNumber: cleanPhone,
            message: "Registro completado con éxito. Credenciales del Dashboard generadas."
        });
    }
};
