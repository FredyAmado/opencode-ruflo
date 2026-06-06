---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can run concurrently without shared state
---

# Dispatching Parallel Agents

Despachá múltiples subagentes en paralelo para tareas independientes. Cada agente recibe contexto aislado y un objetivo específico.

**Principio clave:** Un agente por dominio de problema independiente. Dejalos trabajar en paralelo.

## Cuándo usarlo

Usalo cuando:
- 3+ tests fallando con causas raíz diferentes
- Múltiples subsistemas rotos independientemente
- Cada problema se entiende sin contexto de los otros
- No hay estado compartido entre las investigaciones

NO usarlo cuando:
- Las fallas están relacionadas (arreglar una podría arreglar otras)
- Necesitás entender el estado completo del sistema
- Los agentes interferirían entre sí (mismos archivos, mismos recursos)

## El patrón

### 1. Identificá dominios independientes

Agrupá las fallas por subsistema:
- Tests de auth: login, refresh token, logout
- Tests de API: middleware, rate limiting, validación
- Tests de DB: migraciones, queries, conexión

### 2. Creá tareas enfocadas para cada agente

Cada agente recibe:
- **Scope específico:** un archivo o subsistema
- **Objetivo claro:** "hacé pasar estos tests"
- **Restricciones:** "no cambiés código de producción" o "arreglá tests solamente"
- **Output esperado:** resumen de lo que encontraste y arreglaste

### 3. Despachá en paralelo

```markdown
[@coder scope: auth tests - Arreglá los 2 tests fallando en
  tests/auth/login.test.ts:
  1. "should reject expired tokens" - mock de tiempo no funciona
  2. "should refresh before expiry" - refresh no extiende expiración
  No cambiés la lógica de auth. Devolvé resumen de causas.]

[@coder scope: api middleware - Arreglá el test de rate limiting
  en tests/api/middleware.test.ts. El contador de requests
  se resetea antes de tiempo. Devolvé resumen.]
```

### 4. Revisá e integrá

Cuando los agentes vuelven:
- Leé cada resumen
- Verificá que los fixes no conflictúan
- Ejecutá la suite completa
- Integrá todos los cambios

## Errores comunes

❌ **Demasiado amplio:** "Arreglá todos los tests" → el agente se pierde
✅ **Específico:** "Arreglá tests/auth/login.test.ts" → scope enfocado

❌ **Sin contexto:** "Arreglá la race condition" → no sabe dónde
✅ **Con contexto:** Pegá los mensajes de error y nombres de test

❌ **Sin restricciones:** el agente podría refactorizar todo
✅ **Con restricciones:** "No cambiés código de producción"

## Cuándo NO usarlo

- Fallas relacionadas (arreglar una arregla otras) → investigá juntas
- Necesitás contexto completo del sistema
- Debug exploratorio (no sabés qué está roto)
- Estado compartido (agentes editarían los mismos archivos)

## Beneficios

1. **Paralelización** — múltiples investigaciones simultáneas
2. **Enfoque** — cada agente tiene scope angosto, menos contexto
3. **Independencia** — los agentes no interfieren
4. **Velocidad** — 3 problemas resueltos en el tiempo de 1
