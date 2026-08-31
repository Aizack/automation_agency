# 🚀 Configuración de Despliegue VPS, GitHub Actions y Secretos

Este archivo contiene la información de acceso, credenciales y secretos de CI/CD para el despliegue automático del proyecto en el servidor VPS de producción.

---

## 🌐 Información del Servidor VPS (Producción)

* **Dominio Público:** [https://frant-test.diazlab.online](https://frant-test.diazlab.online)
* **Proveedor VPS:** Contabo Cloud VPS (EE.UU. St. Louis)
* **Dirección IP:** `209.145.50.230`
* **Puerto SSH:** `22`
* **Usuario SSH:** `root`
* **Contraseña SSH:** `Kadabrocol0726++`
* **Hostname Servidor:** `vmi3433097`
* **Ruta de la Aplicación en VPS:** `/app/agency-bot`
* **Administrador de Procesos:** PM2 (`agency-bot` / PID en vivo)
* **Servidor Proxy:** Nginx (`systemctl reload nginx`)

---

## 🔑 Secretos Configurados en GitHub Actions

Para la automatización de despliegue continuo (CI/CD) al hacer `git push`:

* **URL Directa de Configuración:** [https://github.com/Aizack/automation_agency/settings/secrets/actions](https://github.com/Aizack/automation_agency/settings/secrets/actions)
* **Nombre del Secreto:** `VPS_PASSWORD`
* **Valor del Secreto:** `Kadabrocol0726++`

---

## 🛡️ Ramas de Respaldo Estables (Backup)

Ramas de protección creadas antes de cambios estructurales para reversión rápida:

1. **`backup/v1-stable`**: Versión previa estable funcional.
2. **`backup/previous-stable`**: Copia de respaldo para rollback inmediato en caso de fallos.

---

## ⚙️ Flujo Automático de Despliegue (.github/workflows/deploy.yml)

Cada vez que se ejecuta `git push` en la rama `feature/initial-architecture-6060039206840083513` o `main`:

```bash
cd /app/agency-bot
git reset --hard
git pull origin feature/initial-architecture-6060039206840083513
cd dashboard && npm run build
pm2 restart all
systemctl reload nginx 2>/dev/null || true
```
