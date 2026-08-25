import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

// Verificar si las credenciales de Cloudflare R2 están presentes en el entorno
export const isR2Configured = (): boolean => {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
};

// Cliente S3 estático configurado para el endpoint de Cloudflare R2
let s3ClientInstance: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (s3ClientInstance) return s3ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Credenciales de Cloudflare R2 incompletas en las variables de entorno (.env).');
  }

  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  return s3ClientInstance;
};

/**
  Sube un comprobante de pago o archivo multi-tenant.
  Si Cloudflare R2 está configurado, lo guarda en la nube S3.
  Si no está configurado o falla, hace fallback automático al almacenamiento local del servidor VPS.
 */
export const uploadTenantFile = async (
  clientId: string,
  category: 'receipts' | 'documents' | 'media',
  fileName: string,
  buffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Clave relativa estructurada por Tenant, Categoría, Año y Mes
  const s3Key = `tenants/${clientId}/${category}/${year}/${month}/${fileName}`;

  // 1. Intentar subir a Cloudflare R2 si está configurado
  if (isR2Configured()) {
    try {
      console.log(`[Storage Service] ☁️ Subiendo '${fileName}' a Cloudflare R2 (Bucket: ${process.env.R2_BUCKET_NAME})...`);
      const client = getS3Client();
      const bucket = process.env.R2_BUCKET_NAME!;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      // Determinar la URL pública devuelta
      const publicBaseUrl = process.env.R2_PUBLIC_URL 
        ? process.env.R2_PUBLIC_URL.replace(/\/$/, '')
        : `https://${bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

      const publicUrl = `${publicBaseUrl}/${s3Key}`;
      console.log(`[Storage Service] ✅ Archivo subido con éxito a Cloudflare R2: ${publicUrl}`);
      return publicUrl;

    } catch (r2Error: any) {
      console.error(`[Storage Service] ⚠️ Error al subir a Cloudflare R2. Usando fallback local:`, r2Error?.message || r2Error);
    }
  } else {
    console.log(`[Storage Service] ℹ️ Cloudflare R2 no configurado en .env. Usando almacenamiento local del servidor.`);
  }

  // 2. Fallback Local en Servidor VPS (Organizado por Tenant / Categoría / Año / Mes)
  const localDir = path.join(process.cwd(), 'uploads', 'tenants', clientId, category, year, month);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const localFilePath = path.join(localDir, fileName);
  fs.writeFileSync(localFilePath, buffer);

  const localPublicUrl = `/uploads/tenants/${clientId}/${category}/${year}/${month}/${fileName}`;
  console.log(`[Storage Service] 💾 Archivo guardado localmente en servidor VPS: ${localPublicUrl}`);
  return localPublicUrl;
};
