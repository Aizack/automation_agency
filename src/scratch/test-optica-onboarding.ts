import { registrarClienteTool } from '../tools/registrarCliente';
import { pool } from '../database/postgres';
import { AIAgent } from '../agents/base';
import { getClientById } from '../database/clientsCrud';
import { guardarPerfilNegocioTool } from '../tools/guardarPerfilNegocio';

async function testOpticaFlow() {
  console.log("🚀 [Test Óptica] Iniciando simulación local del flujo completo de Óptica Sonrisas...\n");

  try {
    // 1. Limpiar base de datos de pruebas anteriores
    const testClientId = "client_optica_sonrisas_test";
    await pool.query("DELETE FROM clients WHERE id = $1", [testClientId]);
    console.log("🧹 [DB] Base de datos limpia de pruebas anteriores.");

    // 2. Simular Registro Conversacional de la Óptica
    console.log("\n--- PASO 1: Registro de la Óptica ---");
    const regResultStr = await registrarClienteTool.execute({
      nombreEmpresa: "Óptica Sonrisas Test",
      telefonoCliente: "573111111111",
      nombreContacto: "Isac Diaz",
      emailContacto: "contacto@opticasonrisas.com"
    });

    const regResult = JSON.parse(regResultStr);
    console.log("✅ Registro exitoso en Postgres.");
    console.log(`👤 Usuario de acceso generado: ${regResult.username}`);
    console.log(`🔗 Enlace de Activación enviado por WhatsApp: \n   ${regResult.activationLink}\n`);

    // Guardar el ID generado para la prueba
    const generatedId = regResult.clientId;
    const tempToken = regResult.activationLink.split('token=')[1];

    // 3. Simular Activación Segura del Cliente (El dueño establece su contraseña en el navegador)
    console.log("--- PASO 2: Activación Segura de Contraseña ---");
    // Verificamos el estado inicial en la base de datos
    const checkBefore = await pool.query("SELECT password, is_activated FROM clients WHERE id = $1", [generatedId]);
    console.log(`🔍 Estado antes de activar: is_activated = ${checkBefore.rows[0].is_activated}, password (token) = ${checkBefore.rows[0].password}`);

    // Simulamos la acción del Endpoint POST /api/activate-account
    const newPassword = "miClaveSegura123";
    await pool.query(
      "UPDATE clients SET password = $1, is_activated = TRUE WHERE id = $2 AND password = $3 AND is_activated = FALSE",
      [newPassword, generatedId, tempToken]
    );

    const checkAfter = await pool.query("SELECT password, is_activated FROM clients WHERE id = $1", [generatedId]);
    console.log(`✅ Estado después de activar: is_activated = ${checkAfter.rows[0].is_activated}, password (real) = ${checkAfter.rows[0].password}\n`);

    // 4. Simular Entrenamiento Conversacional (Post-Pago) y Carga de Perfil de la Óptica
    console.log("--- PASO 3: Entrenamiento conversacional con Glosario de Sinónimos ---");
    const perfilTexto = `
====================================================================
INFORMACIÓN DE NEGOCIO: ÓPTICA SONRISAS TEST
Horarios: Lunes a Sábado de 8:00 AM a 6:00 PM.
Ubicación: Calle 12 # 45-67, Medellín, Colombia.
Contacto Asistencia Humana: +573112223333.
Correo: contacto@opticasonrisas.com

PRODUCTOS Y PRECIOS:

1. LENTES FOTOCROMÁTICOS (SINÓNIMOS: gafas que se oscurecen, lentes transitions, gafas que cambian con el sol, transitions, gafas inteligentes para el sol).
- Explicación: Lentes que se oscurecen automáticamente al salir al sol y se aclaran bajo techo.
- Precio: $180.000 COP la pareja.

2. LENTES BIFOCALES (SINÓNIMOS: gafas con la lunita, las de la media luna abajo, gafas con el circulo abajo para leer).
- Explicación: Lentes que dividen la visión de lejos (arriba) y de cerca (abajo mediante una pestaña visible en forma de lunita).
- Tipos disponibles: 
  * Flat Top (lunita recta arriba) - Precio: $120.000 COP.
  * Invisible (bifocal sin la línea divisoria tan marcada) - Precio: $150.000 COP.

3. LENTES PROGRESIVOS o MULTIFOCALES (SINÓNIMOS: gafas sin la lunita para viejos, gafas progresivas, gafas para personas mayores sin corte, gafas multifocales, lentes progresivos).
- Explicación: Lentes modernos de gama alta que permiten ver a todas las distancias (lejos, intermedio y cerca) de forma gradual y sin la línea estética de la "lunita".
- Precio: $280.000 COP.
====================================================================
    `;

    // Ejecutar el guardado de perfil que gatilla el RAG e indexa los vectores en Postgres
    console.log("⏳ Indexando vectores de sinónimos e inventario en pgvector...");
    await guardarPerfilNegocioTool.execute({
      clientId: generatedId,
      perfilTexto: perfilTexto
    });
    console.log("✅ RAG indexado correctamente en la base de datos.\n");

    // 5. Simular Preguntas del Cliente Final
    console.log("--- PASO 4: Pruebas de Búsqueda Semántica e Inteligencia de Respuestas ---");
    const preguntasPrueba = [
      "hola, me interesa saber el precio de las gafas que se oscurecen con el sol",
      "cuanto cuestan las gafas que tienen la lunita?",
      "tienes gafas progresivas? o sea, las que son para viejitos pero no tienen la lunita abajo?"
    ];

    // Obtener la configuración final del cliente
    const config = await getClientById(generatedId);
    if (!config) {
      throw new Error(`No se encontró la configuración para el cliente ${generatedId}`);
    }

    const agent = new AIAgent(config);

    for (const pregunta of preguntasPrueba) {
      console.log(`\n👤 Cliente: "${pregunta}"`);
      const response = await agent.processMessage(pregunta, "573999999999");
      console.log(`🤖 Bot Frant: "${response.text}"`);
      // Esperar 2 segundos para evitar rate limits
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log("\n🎉 [Test Óptica] ¡Simulación del flujo completada con éxito!");

  } catch (err: any) {
    console.error("❌ Error en la simulación:", err);
  } finally {
    await pool.end();
  }
}

testOpticaFlow();
