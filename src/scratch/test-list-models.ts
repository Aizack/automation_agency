import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function run() {
  console.log("🔍 Diagnosticando API Key de Gemini...");
  console.log("   - Key: ", process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.slice(0, 10)}...` : "NO ENCONTRADA");
  
  try {
    // Probar con gemini-1.5-flash
    console.log("🔄 Enviando prompt de prueba con 'gemini-1.5-flash'...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hola, responde 'OK' si recibes esto.");
    console.log("✅ ¡Conexión Exitosa!");
    console.log("📝 Respuesta:", result.response.text());
  } catch (err: any) {
    console.error("❌ Error con 'gemini-1.5-flash':", err.message);
    
    // Probar con gemini-1.5-pro
    try {
      console.log("\n🔄 Intentando alternativa con 'gemini-1.5-pro'...");
      const modelPro = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const resultPro = await modelPro.generateContent("Hola");
      console.log("✅ ¡Conexión Exitosa con Pro!");
      console.log("📝 Respuesta:", resultPro.response.text());
    } catch (errPro: any) {
      console.error("❌ Error con 'gemini-1.5-pro':", errPro.message);
    }
  }
}

run();
