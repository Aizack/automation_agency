import dotenv from 'dotenv';
dotenv.config();

import { uploadTenantFile, isR2Configured } from '../services/storageService';

async function main() {
  console.log("R2 Configured?:", isR2Configured());
  console.log("Account ID:", process.env.R2_ACCOUNT_ID);
  console.log("Bucket:", process.env.R2_BUCKET_NAME);

  const dummyBuffer = Buffer.from("Hola Cloudflare R2! Prueba de conexión desde la plataforma SaaS Multi-Tenant.", "utf-8");
  
  try {
    const url = await uploadTenantFile("test_client_001", "receipts", "test_ping.txt", dummyBuffer, "text/plain");
    console.log("TEST EXITOSO! URL pública devuelta:", url);
  } catch (err) {
    console.error("TEST FALLÓ:", err);
  }
}

main();
