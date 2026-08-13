# Guía de Diagnóstico y Resolución de Problemas (Troubleshooting Log)

Este archivo sirve como registro histórico de errores comunes del entorno y del sistema para guiar a los agentes de IA (como Antigravity, Jules, Isac) y desarrolladores humanos en futuras sesiones de codificación, evitando el desperdicio innecesario de tiempo y tokens.

---

## 1. Falta de Detección de Cambios en Caliente (Hot-Reload) en Docker desde Windows
* **Síntoma:** Al editar archivos backend (`src/server.ts`, etc.) desde el editor en Windows, la aplicación no se reinicia ni aplica los cambios, resultando en respuestas antiguas de la API (como errores 404 en rutas recién creadas).
* **Causa Raíz:** El backend corre dentro de un contenedor de Docker (`agency_bot_app`). Por defecto, nodemon usa eventos del sistema de archivos de Linux, los cuales **no se propagan de Windows a Linux** a través de los volúmenes montados en Docker Desktop.
* **Resolución/Mitigación:** 
  1. Se agregó el flag **`-L`** (o `--legacy-watch`) a los comandos `dev` y `dev:api` en el [`package.json`](file:///d:/Archivos/proyectos/Agencia%20Automatizaci%C3%B3n/Bot%20multi-tenant/package.json) para forzar a nodemon a usar polling en lugar de eventos de archivo nativos.
  2. Si el contenedor experimenta problemas persistentes de sincronización, se debe forzar manualmente el reinicio del contenedor desde la terminal de Windows:
     ```bash
     docker compose restart app
     ```

---

## 2. Redirección y Mapeo del Dominio de Desarrollo
* **Síntoma:** El desarrollador accede a la plataforma local a través de `frant-test.diazlab.online` y no a través de `localhost:5173`.
* **Causa Raíz:** Existe una configuración local en el archivo de hosts (`127.0.0.1 frant-test.diazlab.online`) y una redirección proxy que hace que ese dominio resuelva localmente en la máquina del desarrollador en lugar de ir al VPS público en internet.
* **Lección para el Agente:** 
  * **No** sugieras cambiar a `localhost:5173` ni intentes realizar despliegues automáticos a producción de forma prematura creyendo que son entornos desconectados. 
  * Trata a `frant-test.diazlab.online` como el servidor local activo del desarrollador.

---

## 3. Conflicto de Puertos y Procesos Zombi (EADDRINUSE) en Puerto 3000
* **Síntoma:** Se inicia la aplicación localmente pero no responde con los cambios, o sale un error de puerto ocupado.
* **Causa Raíz:** Hay múltiples procesos ocupando el puerto `3000` al mismo tiempo (ej: el servicio de Docker `com.docker.backend.exe` y un túnel/relay de WSL `wslrelay.exe`).
* **Resolución/Mitigación:**
  * Para ver qué proceso está usando el puerto en Windows:
    ```powershell
    netstat -ano | findstr :3000
    ```
  * Para apagar el contenedor conflictivo o forzar el cierre:
    ```bash
    docker compose down
    docker compose up -d
    ```

---

## 4. Respuestas HTML 404 / 413 en Solicitudes que Esperan JSON
* **Síntoma:** El navegador arroja el error `JSON.parse: unexpected character at line 1 column 1` al subir un archivo o logotipo.
* **Causa Raíz:** 
  1. Si es **404**, significa que la versión del servidor en ejecución no tiene el endpoint cargado (revisar punto 1).
  2. Si es **413**, Nginx o el proxy local de desarrollo bloqueó la petición debido a que el archivo excede el tamaño máximo permitido de subida (generalmente limitado a 1MB por defecto en Nginx).
* **Solución en Frontend:** Para evitar depuraciones a ciegas, las llamadas de subida en el Frontend deben leer primero el cuerpo como texto con `res.text()` antes de pasarlo a `JSON.parse()`. Si falla la conversión, deben desplegar un cuadro de alerta amigable con el código HTTP de estado y el extracto de texto del error.
