import { ClientConfig } from '../core/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { VectorDatabase } from '../database/vectorDb';
import { agendarCitaTool } from '../tools/agendarCita';
import { crearPedidoTool } from '../tools/crearPedido';

// Inicializamos el SDK de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "API_KEY_MISSING");

// Interfaz básica de un agente
export class AIAgent {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async processMessage(userMessage: string, senderPhone: string): Promise<string> {
    console.log(`[Agente AI] Ejecutando Gemini para cliente: ${this.config.name}`);

    // 1. Retrieval-Augmented Generation (RAG)
    const contextFromDrive = await VectorDatabase.searchRelevantContext(this.config.id, userMessage);
    console.log(`[Agente AI] Inyectando contexto RAG: ${contextFromDrive}`);

    // 2. Preparar el Prompt del Sistema
    const fullSystemPrompt = `
      ${this.config.systemPrompt}

      INFORMACIÓN DE LA EMPRESA (RAG):
      Utiliza esta información para responder a las dudas del usuario si es relevante:
      ${contextFromDrive}

      INSTRUCCIONES IMPORTANTES:
      - Responde siempre de forma corta y conversacional, ideal para WhatsApp.
      - Si el usuario quiere ejecutar una acción (como agendar o comprar) y tienes la herramienta activa, dile que procederás con la acción. (El Function Calling real se integrará en la siguiente fase técnica).
      - Las herramientas activas para este cliente son: ${this.config.activeTools.join(', ')}
    `;

    try {
      if (process.env.GEMINI_API_KEY) {
        // Ejecución Real con Gemini
        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash", // Actualizado a 3.5 Flash según el requerimiento del usuario
            systemInstruction: fullSystemPrompt
        });

        const result = await model.generateContent(userMessage);
        const response = await result.response;
        return response.text();
      } else {
        // Fallback para pruebas locales sin API KEY (Mocks)
        console.warn("[Agente AI] GEMINI_API_KEY no encontrada. Usando modo simulación.");

        let toolResponse = "";
        if (this.config.activeTools.includes("agendarCita") && userMessage.toLowerCase().includes("cita")) {
            toolResponse = await agendarCitaTool.execute({ fecha: "Próximo Martes", hora: "10:00 AM" });
        } else if (this.config.activeTools.includes("crearPedido") && userMessage.toLowerCase().includes("pedir")) {
            toolResponse = await crearPedidoTool.execute({ producto: "Pizza Familiar", cantidad: 1 });
        }

        const finalResponseText = `(SIMULACIÓN) Basado en el archivo de Drive "${contextFromDrive}". ${toolResponse ? ' Además, ejecuté una acción: ' + toolResponse : ''}`;
        return `[AI Response para ${this.config.name}]: ${finalResponseText}`;
      }
    } catch (error) {
      console.error("[Agente AI] Error llamando a Gemini:", error);
      return "Lo siento, en este momento estoy experimentando problemas técnicos. Intenta más tarde.";
    }
  }
}
