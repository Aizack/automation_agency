/**
 * Servicio simulado para la conexión con Google Drive API.
 * En producción, esto utilizará 'googleapis' para conectarse usando
 * un Service Account y leerá los archivos de los 5TB de almacenamiento.
 */

export const fetchDocumentsFromDrive = async (clientId: string) => {
    console.log(`[Google Drive Service] Buscando carpeta del cliente: ${clientId}...`);

    // Simulación de lectura de archivos PDF/Docx en Google Drive
    // La estructura en Drive sería algo como: /Agencia_Data/{clientId}/

    let mockDocuments: string[] = [];

    if (clientId === "client_001") {
        mockDocuments = [
            "Manual de Precios Odontológicos: La limpieza dental cuesta $50. La ortodoncia empieza en $500.",
            "Horarios de Atención: Lunes a Viernes de 8:00 AM a 5:00 PM."
        ];
    } else if (clientId === "client_002") {
        mockDocuments = [
            "Menú Pizzería: Pizza familiar $15. Pizza personal $8. Bebidas $2.",
            "Políticas de envío: Envío gratis a menos de 5km."
        ];
    }

    console.log(`[Google Drive Service] Se encontraron ${mockDocuments.length} documentos para ${clientId}.`);
    return mockDocuments;
};
