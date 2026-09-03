# 🛡️ Reglas de Seguridad de Git y Estrategia de Ramas

Este documento define la normativa estricta para la gestión del repositorio Git, evitando cualquier pérdida accidental de código o sobrescritura de funcionalidades desarrolladas.

---

## ⚠️ 1. REGLAS INVIOLABLES DE SEGURIDAD (ANTI-PÉRDIDA DE CÓDIGO)

1. **PROHIBIDO `git reset --hard` SIN BACKUP PREVIO**:
   - Queda estrictamente prohibido ejecutar `git reset --hard` o comandos destructivos sin antes haber verificado el estado del espacio de trabajo con `git status` y haber creado una rama de respaldo temporal (`git branch backup/temp-XXXX`).

2. **REGLA DE ORO DE PULL Y MERGE**:
   - NUNCA ejecutar `git pull` o `git merge` si existen cambios pendientes en el espacio de trabajo.
   - Antes de actualizar código desde el remoto, se DEBE ejecutar:
     ```bash
     git add .
     git commit -m "wip: cambios locales guardados antes de pull"
     # O en su defecto: git stash save "cambios locales"
     ```

3. **VERIFICACIÓN OBLIGATORIA ANTES DE PUSH**:
   - Antes de subir cambios a `main` o a la rama de producción, se debe verificar la integridad del código:
     - `npx tsc --noEmit` (Sin errores de TypeScript)
     - `npm run build:frontend` (Compilación limpia de Vite)

---

## 🌿 2. ESTRATEGIA Y GESTIÓN DE RAMAS

El proyecto utiliza un esquema de 3 niveles de estabilidad:

```
  [ main ] ────────────► Producción Estable (Despliegue automático a VPS)
     ▲
     │ (PR / Merge verificado)
  [ feature/initial-architecture... ] ──► Desarrollo Activo (Nuevas funcionalidades)
     ▲
     │ (Backup antes de cambios mayores)
  [ backup/v1-stable ] ──► Puntos de Restauración Inmutables
```

### Roles de las Ramas:

1. **`main` (Producción)**:
   - Contiene únicamente código estable y probado en su totalidad.
   - Los pushes a esta rama disparan el despliegue automático hacia el VPS.

2. **`feature/initial-architecture-6060039206840083513` (Desarrollo Activo)**:
   - Rama principal donde se realizan los ajustes diarios, nuevas características y correcciones.

3. **`backup/v1-stable` & `backup/previous-stable` (Respaldos)**:
   - Ramas congeladas en puntos donde el sistema funcionaba al 100%. Sirven para rollback inmediato si se presenta una regresión grave.

---

## 📋 3. PASO A PASO PARA TRABAJAR UNA NUEVA TAREA

1. **Verificar estado actual**:
   ```bash
   git status
   ```
2. **Si hay trabajo en progreso, hacer commit local**:
   ```bash
   git add .
   git commit -m "feat: descripción clara del avance realizado"
   ```
3. **Sincronizar de forma segura**:
   ```bash
   git pull --rebase origin feature/initial-architecture-6060039206840083513
   ```
4. **Al completar la tarea y verificar builds**:
   ```bash
   git push origin feature/initial-architecture-6060039206840083513
   ```
