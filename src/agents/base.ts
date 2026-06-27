import { ClientConfig } from '../core/config';

import { VectorDatabase } from '../database/vectorDb';
import { agendarCitaTool } from '../tools/agendarCita';
import { crearPedidoTool } from '../tools/crearPedido';

// Interfaz básica de un agente
export class AIAgent {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  // En producción, esto llamaría a la API de OpenAI / Anthropic
  // Inyectando las herramientas (tools) permitidas en config.activeTools
  async processMessage(userMessage: string, senderPhone: string): Promise<string> {
    console.log(`[Agente AI] Ejecutando prompt para cliente: ${this.config.name}`);
    console.log(`[Agente AI] Tools cargadas: ${this.config.activeTools.join(', ')}`);

    // 1. Retrieval-Augmented Generation (RAG)
    // Buscamos en los PDFs del cliente en la BD Vectorial
    const contextFromDrive = await VectorDatabase.searchRelevantContext(this.config.id, userMessage);
    console.log(`[Agente AI] Inyectando contexto RAG: ${contextFromDrive}`);

    // 2. Simulación de la decisión del LLM de llamar a una herramienta (Function Calling)
    let toolResponse = "";

    if (this.config.activeTools.includes("agendarCita") && userMessage.toLowerCase().includes("cita")) {
        // En un flujo real, el LLM nos pediría llamar a la herramienta. Aquí simulamos la ejecución.
        toolResponse = await agendarCitaTool.execute({ fecha: "Próximo Martes", hora: "10:00 AM" });
    } else if (this.config.activeTools.includes("crearPedido") && userMessage.toLowerCase().includes("pedir")) {
        toolResponse = await crearPedidoTool.execute({ producto: "Pizza Familiar", cantidad: 1 });
    }

    // 3. Respuesta final del LLM
    const finalResponseText = `Basado en el archivo de Drive "${contextFromDrive}". ${toolResponse ? ' Además, ejecuté una acción: ' + toolResponse : ''}`;

    return `[AI Response para ${this.config.name}]: ${finalResponseText}`;
  }
}
