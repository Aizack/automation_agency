# 📘 Bitácora de Seguridad: Explicación de Auditoría y Correcciones Aplicadas

Este documento registra la explicación detallada de las vulnerabilidades encontradas, la arquitectura de protección y las correcciones aplicadas al proyecto `Bot multi-tenant-exp`.

---

## 📌 PARTE 1: La Seguridad en las Respuestas del Servidor (Los Encabezados HTTP)

### ⏳ Línea de Tiempo de una Petición Web

```
[ 1. Navegador Usuario ] ───(Petición)───▶ [ 2. Servidor Express (Tu Bot) ]
                                                       │
                                            (Prepara respuesta)
                                                       │
[ 4. Navegador Protegido ] ◀──(Respuesta + Headers)─── [ 3. Filtro de Seguridad ]
```

#### **Etapa 1: El usuario entra a tu página**
Cuando un cliente o administrador abre el navegador y entra a tu sistema (`http://localhost:3000`), el navegador del usuario le envía una solicitud HTTP al servidor de tu proyecto.

> **( 💡 Concepto: HTTP / Petición y Respuesta )**
> HTTP es el protocolo o "idioma" en el que se comunican los navegadores (Chrome, Firefox, Edge) y los servidores. Una **petición** es la pregunta del usuario (*"quiero ver el dashboard"*) y la **respuesta** son los datos que devuelve el servidor (*"aquí tienes la interfaz en HTML y JavaScript"*).

---

#### **Etapa 2: Tu servidor procesa la respuesta**
Tu servidor, escrito en **Express** (el framework de Node.js que maneja las rutas y URLs en tu código `src/server.ts`), recibe la petición y prepara el código HTML, los iconos y los datos para enviárselos de vuelta al usuario.

---

#### **Etapa 3: Detección de la Vulnerabilidad (¿Dónde estaba el problema?)**
Cuando la herramienta **VPulse** auditó la página, revisó las cartas de instrucciones que tu servidor le adjuntaba a cada respuesta web.

> **( 💡 Concepto: Encabezados HTTP / Headers )**
> Los *Headers* o encabezados HTTP son como una etiqueta pegada sobre un paquete postal. No son el contenido de la página en sí, sino **instrucciones de seguridad imperativas** que el servidor le ordena al navegador del usuario (*"No permitas que me metan en un iframe"*, *"No dejes que usen la cámara sin permiso"*, etc.).

**Faltaban 3 encabezados clave:**
1. **Sin `Referrer-Policy`**: Cuando un usuario hacía clic en un enlace externo dentro de tu plataforma, su navegador enviaba en la cabecera la dirección exacta (URL) completa de donde venía. Si esa URL contenía un token o código privado, el sitio web externo podía leerlo.
2. **Sin `Permissions-Policy`**: El navegador no tenía una regla que le prohibiera a scripts maliciosos acceder al micrófono, cámara o ubicación del usuario desde tu página.
3. **Sin `Content-Security-Policy` (CSP)**: Si un atacante lograba inyectar un texto o comentario malicioso con código JavaScript (ataque XSS), el navegador del usuario lo ejecutaría sin dudar porque no tenía una lista blanca de fuentes permitidas.

---

#### **Etapa 4: La Reparación (¿Cómo lo arreglamos?)**
En `src/server.ts` instalamos un **Middleware de Seguridad**.

> **( 💡 Concepto: Middleware )**
> Un *Middleware* es un filtro o un "guardia de seguridad" parado en la puerta del servidor. Toda petición que entra y toda respuesta que sale tiene que pasar obligatoriamente por él antes de llegar al usuario.

**Código agregado en `src/server.ts`:**
```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:;");
  next();
});
```

---

## 📌 PARTE 2: La Seguridad en las Librerías e Ingredientes (SCA - Dependencias)

### ⏳ Línea de Tiempo del Procesamiento de Archivos y Código

```
[ Tu Código Principal ] ──usaba──▶ [ Librería Externa: Multer (v2.2.0) ]
                                                 │
                                     (Vulnerabilidad Registrada en CVE)
                                                 │
                                                 ▼
                             [ Actualización a Multer (v2.3+ / Latest) ]
```

#### **Etapa 1: Tu proyecto usa librerías de terceros**
Ningún desarrollador escribe desde cero el código para procesar archivos subidos o empaquetar estilos CSS. En su lugar, usamos **dependencias**.

> **( 💡 Concepto: Dependencia / Librería )**
> Es un paquete de código escrito por otros programadores expertos que instalas en tu proyecto usando `npm`. Por ejemplo, la librería **`multer`** se encarga de recibir fotos, comprobantes de pago o documentos PDF que los usuarios suben en tu panel.

---

#### **Etapa 2: Detección de Vulnerabilidades en la Cadena de Suministro (SCA)**
VPulse ejecutó un escaneo **SCA (Software Composition Analysis)** conectándose en tiempo real a la base de datos mundial de vulnerabilidades **OSV.dev / NVD**.

> **( 💡 Concepto: CVE / OSV )**
> **CVE** (*Common Vulnerabilities and Exposures*) es el registro público mundial donde los investigadores de ciberseguridad publican los fallos descubiertos en programas y librerías. Por ejemplo: *"La versión 2.2.0 de Multer tiene un fallo de memoria"*.

**¿Por qué era peligroso?**
- La versión de `multer` que tenías instalada tenía vulnerabilidades registradas de **Denegación de Servicio (DoS)** y **agotamiento de memoria**.
- Un atacante podía subir un archivo especialmente manipulado que colgara el servidor o consumiera el 100% de la memoria RAM del equipo.

---

#### **Etapa 3: La Reparación (¿Cómo lo arreglamos?)**
Ejecutamos el comando de actualización:
```bash
npm install multer@latest
```
Esto descargó la versión más reciente de la librería, donde los desarrolladores originales de `multer` ya corrigieron la falla de código interno.

---

## 📌 PARTE 3: La Red de Seguridad (La Rama de Respaldo en Git)

Antes de tocar una sola línea de código o actualizar un paquete, ejecutamos:

```bash
git checkout -b backup/pre-vpulse-remediation-2026-09-11
```

> **( 💡 Concepto: Rama / Branch en Git )**
> Git es como un "árbol del tiempo" de tu proyecto. La rama principal es el tronco. Al crear un **Branch**, creas una dimensión o copia paralela exacta del código en ese instante.

**¿Por qué lo hicimos?** Si al actualizar `multer` o agregar los encabezados algo se hubiera roto o dejado de funcionar, con un solo comando podíamos volver en 1 segundo al pasado exacto antes del cambio.

---

### 📊 Resumen General

| Componente | Vulnerabilidad / Riesgo | Solución Aplicada |
| :--- | :--- | :--- |
| **Respaldo Git** | Riesgo de romper el sistema al modificar código | Se creó la rama paralela `backup/pre-vpulse-remediation-2026-09-11`. |
| **Encabezados HTTP** | Ausencia de reglas de protección contra XSS, fugas de URLs y uso de periféricos | Se añadió un middleware en Express (`src/server.ts`) con `CSP`, `Referrer-Policy` y `Permissions-Policy`. |
| **Librería Multer** | Vulnerabilidades conocidas (CVE) de memoria al subir archivos | Se actualizó `multer` a la última versión parcheada vía `npm`. |
| **Estilos Dashboard** | Posibles fallos de seguridad en empaquetado CSS | Se actualizó `postcss` en las dependencias del frontend. |
