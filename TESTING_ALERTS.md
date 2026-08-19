# 🧪 GUÍA DE TESTING: Sistema de Gestión de Errores y Logging

## ✅ Verificación Rápida

### 1. Backend - Confirmar Endpoints
```bash
# En terminal de PowerShell (dentro del contenedor)

# Obtener token admin
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Listar alertas activas (reemplaza TOKEN con el recibido)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/admin/alerts/active

# Historial de alertas
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/admin/alerts/history?limit=10
```

### 2. Frontend - Panel de Alertas
1. **Login** como admin
2. Ve a **Admin Dashboard** (ícono de engranaje)
3. Busca pestaña o sección **"Estado de Red"**
4. Deberías ver tabla con botones: **Resolver**, **Snooze**, **Reabrir**

### 3. Testing Manual de Flujos

#### Flujo A: Resolver Alerta
1. Identifica alerta con estado "Activo" (rojo)
2. Haz clic en botón **"✓ Resolver"** (verde)
3. Se abre modal con campos:
   - **Alerta:** (nombre del alerta)
   - **Mensaje:** (descripción)
   - **Nota de Resolución:** (textarea obligatorio)
4. Escribe nota: "Reinicié el servicio de WhatsApp"
5. Haz clic **"Confirmar"**
6. ✅ Alerta cambia a estado "Resuelto"
7. ✅ Muestra tu nombre + timestamp
8. ✅ Muestra tu nota en la fila

#### Flujo B: Silenciar Alerta (Snooze)
1. Identifica alerta activa
2. Haz clic en **"⏰ Snooze"**
3. ✅ Alerta desaparece de filtro "Activos"
4. ✅ Muestra badge "⏰ Silenciado"
5. Espera 60 minutos O refresca manualmente

#### Flujo C: Reabrir Alerta
1. Filtra por **"Resueltos"**
2. Identifica alerta resuelta
3. Haz clic **"⟳ Reabrir"**
4. Confirma en dialog: "¿Reabrir?"
5. ✅ Alerta vuelve a "Activo"
6. ✅ Counter `reopen_count` incrementa

---

## 🔬 Testing de Correlación ID

### Ver correlationId en Logs
1. Abre los logs del contenedor:
```bash
docker compose logs -f app
```

2. Haz una petición desde frontend (ej. refrescar alertas)

3. En los logs verás:
```json
{"level":"INFO","timestamp":"2026-08-15T...","message":"GET /api/admin/alerts/history completed","correlationId":"ABC123XY","endpoint":"GET /api/admin/alerts/history","statusCode":200,"duration":45}
```

4. ✅ Cada request tiene correlationId único

---

## 🎯 Testing de Throttling

### Verificar que alertas no se duplican
1. Simula error que dispara alerta repetida:
```typescript
// En src/index.ts o src/server.ts
for (let i = 0; i < 10; i++) {
  await logger.raiseAlert('test_alert', 'red', 'Test', 'detail', 'test_client');
}
```

2. **Expectativa:** 
   - ✅ Solo se ve 1 alerta en Discord
   - ✅ Solo se ve 1 fila en DB
   - ✅ timestamp se actualiza cada vez (no crea duplicadas)

3. Espera 5 minutos
4. Lanza la misma alerta nuevamente
5. **Expectativa:**
   - ✅ Se envía a Discord nuevamente
   - ✅ Se crea nuevo registro en DB

---

## 🛠️ Testing de Error Handler Global

### Simular error en endpoint
1. Crea endpoint que lance error:
```typescript
app.get('/api/test/error', (req, res) => {
  throw new Error('Test error');
});
```

2. Haz request desde frontend o curl
3. **Expectativa:**
   - ✅ Respuesta JSON con correlationId
   - ✅ Error registrado en logs
   - ✅ Alerta creada en system_alerts si statusCode >= 500
   - ✅ Discord recibe notificación

---

## 📋 Checklist de Validación

### Backend
- [ ] Middlewares se registran sin error al iniciar
- [ ] Endpoints `/admin/alerts/*` responden 200 OK
- [ ] BD tiene columnas nuevas en system_alerts
- [ ] Logs muestran correlationId en formato JSON
- [ ] Alertas no se duplican (throttling funciona)
- [ ] Resoluciones quedan registradas en DB

### Frontend
- [ ] SystemAlertsPanel carga sin error
- [ ] Botones "Resolver", "Snooze", "Reabrir" son clickeables
- [ ] Modal de resolución abre al hacer clic
- [ ] Campo de nota es obligatorio (no se puede enviar vacío)
- [ ] Después de resolver, tabla se actualiza
- [ ] Auto-refresh cada 30s actualiza la vista

### Integración
- [ ] Cambios en DB se ven en UI en menos de 5 segundos
- [ ] correlationId en logs coincide con request headers
- [ ] Errores se registran como alertas automáticamente
- [ ] Discord recibe notificaciones de alertas críticas

---

## 🚨 Troubleshooting

### Los botones no funcionan
**Solución:**
1. Verifica token en localStorage: `localStorage.getItem('auth_token')`
2. Verifica que eres admin (role = 'admin')
3. Abre DevTools (F12) → Network → filtra "resolve/snooze/reopen"
4. Busca error 401/403 en response

### Modal no muestra
**Solución:**
1. Verifica que z-index esté correcto (es 50)
2. Abre DevTools → Elements → busca div con `fixed inset-0`
3. Verifica que bg-black/40 es visible (opacidad)

### No se ve correlationId en logs
**Solución:**
1. Verifica que middleware se registró: `app.use(correlationIdMiddleware);`
2. Abre DevTools → Network → observa headers de response
3. Busca header `x-correlation-id`

### Las alertas se duplican
**Solución:**
1. Verifica que throttle está habilitado en `src/services/logger.ts`
2. Comprueba que `isAlertThrottled()` se llama antes de `raiseAlert()`
3. Aumenta `ALERT_THROTTLE_MS` si necesita más tiempo

---

## 📊 Métricas de Éxito

Después de 1 hora de uso, deberías ver:
- ✅ Menos alertas duplicadas (throttling funciona)
- ✅ Admin puede resolver alertas (reducción manual de activas)
- ✅ Historial completo de quién resolvió qué (auditoría)
- ✅ Logs estructurados en JSON (fácil de parsear)
- ✅ Requests correlacionados end-to-end (troubleshooting más fácil)
