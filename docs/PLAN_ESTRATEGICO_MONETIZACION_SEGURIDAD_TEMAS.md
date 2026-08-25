# 🎯 Plan Estratégico: Monetización, Seguridad Zero-Trust y Sistema de Temas Visuales

---

## 1. 📊 Revisión General del Estado del Proyecto

### Módulos Actuales Operativos:
- **ERP Base:** Facturación POS, Electrónica DIAN (CUFE + QR SHA-384), Inventarios, Cartera / Cobranza, Nómina y Anticipos.
- **Logística & Entregas:** Hoja de ruta por cercanía para domiciliarios (Speedie Gonzalez), enlaces a Google Maps sin costo de API, integración WhatsApp Web.
- **Auditoría & Trazabilidad:** Bitácora de auditoría global `system_audit_logs` que registra acciones administrativas y operaciones sensibles.
- **Portal de Empleado:** Acceso por PIN/Teléfono, control de jornadas, descansos, tareas, anticipos y entregas asignadas.
- **Bot WhatsApp Multi-Tenant:** Agente IA autónomo con soporte multi-agente, derivación a departamentos y fallback a humanos.

---

## 2. 💎 Estructura de Planes de Pago & Monetización (Basados en Módulos e IA)

| Característica / Límite | 🟢 **Plan Básico (Micro)** | 🚀 **Plan Pro (Crecimiento)** | 👑 **Plan Enterprise / IA Custom** |
|---|---|---|---|
| **Precio Sugerido** | $49.000 COP / mes | $149.000 COP / mes | $349.000 COP / mes |
| **Facturas Electrónicas DIAN** | Hasta 10 / mes | **Ilimitadas** | **Ilimitadas** |
| **Impresión POS 80mm** | Incluida | Incluida | Incluida |
| **Colaboradores / Empleados** | Hasta 3 usuarios | Hasta 15 usuarios | **Ilimitados** |
| **Bot de WhatsApp con IA** | No incluido (o mensajes manuales) | Bot Autónomo Estándar | **Agente IA Personalizado + RAG de PDF/Catálogos** |
| **Módulo de Logística (Domicilios)** | Básico (sin mapas) | Rutas por Cercanía + Maps | Rutas avanzadas + Asignación automática por IA |
| **Bitácora de Auditoría** | 7 días de historial | 90 días de historial | **Historial Ilimitado + Exportación Excel/PDF** |
| **Soporte & Configuración** | Vía ticket / email | WhatsApp Prioritario | **Gestor Dedicado 24/7 + Implementación Custom** |

---

## 3. 🛡️ Plan de Ataque de Seguridad & Blindaje Zero-Trust

### Fase 1: Auditoría de Aislamiento Multi-Tenant (Data Isolation)
- [x] **Enforce Client-ID Scoping:** Verificar que cada consulta SQL contenga estrictamente `WHERE client_id = $1` sin fugas entre inquilinos.
- [ ] **Middleware de Sanitización Global:** Implementar validación automática de parámetros de entrada para prevenir Inyección SQL y XSS.

### Fase 2: Autenticación & Control de Sesiones
- [x] **Protección de PINs Zero-Trust:** Los PINs de marcación rápida nunca se exponen en texto plano (enmascarados como `••••••`). Solo permiten reseteo/cambio.
- [ ] **Rate-Limiting por IP y Tenant:** Prevenir ataques de fuerza bruta en endpoints de login, marcación rápida de PIN y endpoints de prueba (`/seed-test`).
- [ ] **Rotación de JWT & Refresh Tokens:** Expiración de tokens de sesión a las 8 horas con revocación en servidor ante cierre de sesión.

### Fase 3: Seguridad de Headers & HTTP
- [ ] **Configuración Helmet HTTP Headers:** Activar `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`.
- [ ] **Restricción Estricta de CORS:** Limitar los orígenes permitidos únicamente al dominio de producción y desarrollo local autorizado.

---

## 4. 🎨 Sistema de Temas Visuales (UI/UX Themes Palette)

Para ofrecer experiencias visuales de primer nivel ("WOW Effect") sin aumentar consumo de recursos ni requerir librerías pesadas, implementaremos un **Selector de Temas Dinámicos** basado en Variables CSS globales (`tokens.css`):

### Temas Propuestos:
1. **🌙 Obsidian Gold (Predeterminado):** Modo oscuro de lujo con acentos dorados/ámbar y bordes de cristalismo suave.
2. **💎 Emerald Lux:** Tema oscuro para negocios ecológicos/farmacias con tonalidades esmeralda y menta.
3. **⚡ Cyberpunk Neon:** Tema futurista de alto contraste con acentos neón azul/púrpura para agencias digitales y boutiques de tecnología.
4. **☀️ Royal Light:** Tema claro pulcro y elegante con fondos blancos hueso, tipografía refinada e íconos azul rey.
5. **🍇 Sunset Violet:** Tema moderno con degradados de púrpura, violeta y rosa para salones de belleza y boutiques.

---

## 📋 Tareas Pendientes Registradas para Próximas Iteraciones:
- [ ] Implementar el selector de Temas Visuales CSS en el Panel de Configuración de la Tienda.
- [ ] Reforzar Rate-Limiting en todos los endpoints de autenticación y API públicas.
- [ ] Configurar modal de Upgrade automático al alcanzar el límite del Plan Básico (10 facturas).
- [ ] Realizar pruebas de penetración automatizadas (OWASP ZAP / Eslint Security Audit).
