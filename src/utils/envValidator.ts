/**
 * Validación de variables de entorno críticas al arranque.
 * Lanza un error descriptivo si falta alguna variable requerida,
 * evitando fallos silenciosos en producción.
 */

const REQUIRED_VARS: string[] = [
  'DATABASE_URL',
  'GEMINI_API_KEY',
];

const WARN_VARS: string[] = [
  'JWT_SECRET',
  'NODE_ENV',
];

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key] || process.env[key]!.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ [EnvValidator] ERROR CRÍTICO: Variables de entorno requeridas no definidas:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n   Revisa tu archivo .env o las variables de entorno del servidor.');
    console.error('   El servidor NO puede arrancar sin estas variables.\n');
    process.exit(1);
  }

  for (const key of WARN_VARS) {
    if (!process.env[key] || process.env[key]!.trim() === '') {
      console.warn(`⚠️  [EnvValidator] ADVERTENCIA: Variable '${key}' no definida. Se usará valor por defecto (no recomendado en producción).`);
    }
  }

  if (process.env.JWT_SECRET === 'super_secret_fallback_key_123' || !process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('\n❌ [EnvValidator] ERROR CRÍTICO: JWT_SECRET está usando el valor por defecto en producción.');
      console.error('   Define un JWT_SECRET seguro y único en tus variables de entorno.\n');
      process.exit(1);
    }
  }

  console.log('✅ [EnvValidator] Variables de entorno validadas correctamente.');
}
