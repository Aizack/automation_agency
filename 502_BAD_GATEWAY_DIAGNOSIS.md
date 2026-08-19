# 🚨 Error 502 Bad Gateway - Diagnosis & Solutions

## ¿Qué pasó?

Tu servidor Express está **FUNCIONANDO** en `localhost:3000`:
```
✅ 🚀 [Servidor API] Servidor Express activo en el puerto 3000
✅ Frontend compilado exitosamente
✅ TypeScript sin errores
```

Pero cuando intentas acceder desde `frant-test.diazlab.online`, **Cloudflare devuelve error 502**.

---

## 📊 Diagrama del Flujo

```
ESCENARIO ACTUAL (Fallando):

Browser
  ↓
"frant-test.diazlab.online" 
  ↓ 
[Cloudflare - Proxy]  
  ↓
[Nginx/Reverse Proxy Local] ❌ Probablemente DOWN
  ↓
localhost:3000 ✅ (funciona)


RESULTADO: 502 Bad Gateway (el intermediario no puede conectar al origen)
```

---

## 🔍 Posibles Causas

### **1. Nginx Proxy NO está corriendo**
El archivo `/etc/nginx/nginx.conf` o la configuración del proxy local podría estar inactiva.

**Verificar:**
```powershell
# Ver procesos de Nginx
Get-Process nginx -ErrorAction SilentlyContinue

# Si no existe, necesita reactivarse
# En Linux/WSL:
sudo systemctl start nginx
sudo systemctl status nginx
```

### **2. Configuración de Nginx incorrecta**
El proxy podría estar apuntando a puerto incorrecto o con SSL mal configurado.

**Esperar:**
```
upstream backend {
    server 127.0.0.1:3000;  # Debe ser este puerto
}

server {
    listen 443 ssl;
    server_name frant-test.diazlab.online;
    
    location / {
        proxy_pass http://backend;  # ← Debe apuntar al puerto 3000
        proxy_set_header Host $host;
    }
}
```

### **3. Firewall bloqueando puerto 3000**
El firewall de Windows podría estar bloqueando conexiones locales.

**Verificar:**
```powershell
# Ver puertos escuchando
netstat -ano | findstr :3000

# Debería mostrar:
# TCP  127.0.0.1:3000  LISTENING  [PID de node]
```

### **4. DNS/Hosts file mal configurado**
El archivo `C:\Windows\System32\drivers\etc\hosts` podría no tener la redirección.

**Esperar:**
```
127.0.0.1 frant-test.diazlab.online
127.0.0.1 localhost
```

---

## ✅ Soluciones

### **Solución 1: Verificar que el servidor está escuchando (LOCAL)**

```powershell
# Terminal 1: Ve a la carpeta del proyecto
cd "D:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant"

# Terminal 1: Inicia el servidor
npm run start:api:ui

# Terminal 2: Verifica que está escuchando
# En PowerShell
netstat -ano | findstr :3000

# Debería mostrar:
# TCP    127.0.0.1:3000         LISTENING       12345
```

### **Solución 2: Acceder DIRECTAMENTE a localhost (para testing)**

```
❌ https://frant-test.diazlab.online  (fallando)
✅ http://localhost:3000             (debería funcionar)
```

Ve a `http://localhost:3000` en tu navegador y verifica:
- ¿Ves la pantalla de login?
- ¿Puedes loguear?

Si funciona en `localhost:3000`, entonces el problema es solo el proxy.

### **Solución 3: Revisar estado de Nginx/Proxy**

```bash
# Si estás en WSL o Linux
sudo systemctl status nginx

# Si está inactivo, reinicialo
sudo systemctl restart nginx

# Verificar configuración
sudo nginx -t  # Debe decir "ok"
```

### **Solución 4: Contactar a tu proveedor VPS/Hosting**

Si el servidor está en un VPS externo (no local), podría ser:
- ❌ VPS caído
- ❌ Certificado SSL expirado
- ❌ Nginx del VPS no está corriendo
- ❌ Límite de conexiones alcanzado

**Acciones:**
1. SSH al VPS: `ssh usuario@ip_vps`
2. Verifica: `ps aux | grep node`
3. Verifica nginx: `systemctl status nginx`
4. Revisa logs: `tail -f /var/log/nginx/error.log`

---

## 🎯 Plan de Debugging Paso a Paso

### **PASO 1: Confirmar que localhost funciona**
```
1. Terminal abierta con: npm run start:api:ui
2. Abre navegador: http://localhost:3000
3. ¿Ves el login?
   ✅ Sí → El servidor funciona, ir a PASO 2
   ❌ No → Error del servidor local, revisar console
```

### **PASO 2: Revisar configuración de proxy**
```
1. Verifica archivo Nginx: /etc/nginx/nginx.conf (en WSL/Linux)
2. O verifica Nginx en Windows si lo tienes instalado
3. Debe tener:
   - proxy_pass http://127.0.0.1:3000
   - Certificado SSL válido
```

### **PASO 3: Reiniciar Nginx**
```
1. En WSL/Linux:
   sudo systemctl restart nginx
   
2. En Windows con Nginx instalado:
   nginx -s reload
```

### **PASO 4: Probar desde frant-test.diazlab.online**
```
1. Espera 5 minutos (para que Cloudflare cache se actualice)
2. Abre: https://frant-test.diazlab.online
3. ¿Funciona?
   ✅ Sí → ¡Problema resuelto!
   ❌ No → Contacta a soporte de infraestructura
```

---

## 🔧 Configuración Nginx de Referencia

**Archivo:** `/etc/nginx/sites-available/frant-test.diazlab.online`

```nginx
upstream backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name frant-test.diazlab.online;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/frant-test.diazlab.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/frant-test.diazlab.online/privkey.pem;

    # Configuración de proxy
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        # Headers importantes
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Servir archivos estáticos sin proxy
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://backend;
        proxy_cache_valid 200 1d;
        expires 7d;
    }
}

# Redireccionar HTTP a HTTPS
server {
    listen 80;
    server_name frant-test.diazlab.online;
    return 301 https://$server_name$request_uri;
}
```

Después de cambiar, recargar:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📝 Resumen

| Nivel | Estado | Acción |
|-------|--------|--------|
| **Servidor Node.js** | ✅ Funciona | Nada que hacer |
| **TypeScript** | ✅ Compila | Arreglado ✓ |
| **Localhost:3000** | ✅ Probablemente OK | Verifica en navegador |
| **Proxy/Nginx** | ❌ Probablemente caído | Reinicia o revisa config |
| **Cloudflare** | ⚠️ En espera | Espera a que proxy responda |

**PRÓXIMO PASO:** Accede a `http://localhost:3000` para confirmar que el servidor funciona localmente. Si funciona ahí, el problema es 100% del proxy/infraestructura.
