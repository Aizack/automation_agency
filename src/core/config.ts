export interface ClientConfig {
  id: string;
  name: string;
  phoneNumber: string; // El número de WhatsApp que la agencia le asignó o conectó a este cliente
  systemPrompt: string;
  activeTools: string[];
}

// Simulamos una base de datos de configuración de clientes (Tenant Registry)
// En producción, esto vendría de PostgreSQL.
export const getClientConfigByPhone = (phone: string): ClientConfig | null => {
  const clients: ClientConfig[] = [
    {
      id: "client_001",
      name: "Clínica Dental Sonrisas",
      phoneNumber: "1234567890", // Número del bot asociado a la clínica
      systemPrompt: "Eres el asistente virtual de Clínica Sonrisas. Tu objetivo es agendar citas médicas con empatía y revisar horarios.",
      activeTools: ["agendarCita", "consultarHorarios"]
    },
    {
      id: "client_002",
      name: "Pizzería Napoli",
      phoneNumber: "0987654321", // Número del bot asociado a la pizzería
      systemPrompt: "Eres el asistente de Pizzería Napoli. Debes tomar pedidos, confirmar la dirección de envío y calcular el costo.",
      activeTools: ["crearPedido", "consultarMenu"]
    }
  ];

  return clients.find(c => c.phoneNumber === phone) || null;
};