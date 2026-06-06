---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

Escribí planes de implementación completos, asumiendo que el ejecutor tiene cero contexto del codebase y gusto cuestionable. Documentá todo: archivos a tocar, código, tests, cómo probar. Tareas pequeñas. DRY. YAGNI. TDD. Commits frecuentes.

**Anunciá al empezar:** "Voy a usar la skill writing-plans para crear el plan de implementación."

**Guardar planes en:** `docs/plans/YYYY-MM-DD-<feature>.md`

## Verificación de alcance

Si el spec cubre múltiples subsistemas independientes, partilo en planes separados — uno por subsistema. Cada plan debe producir software funcional y testeable por sí solo.

## Estructura de archivos

Antes de definir tareas, mapeá qué archivos se crearán o modificarán y qué responsabilidad tiene cada uno.

- Archivos enfocados y pequeños > archivos grandes que hacen demasiado
- Archivos que cambian juntos deberían vivir juntos
- En codebases existentes, seguí los patrones establecidos

## Granularidad de tareas

**Cada paso = una acción (2-5 minutos):**
- "Escribí el test que falla"
- "Ejecutalo para verificar que falla"
- "Implementá el código mínimo para que pase"
- "Ejecutá los tests para verificar que pasan"
- "Commit"

## Encabezado del plan

```markdown
# [Feature] Implementation Plan

> Para workers: usá la skill subagent-driven-development para implementar tarea por tarea.

**Goal:** [Una oración]

**Architecture:** [2-3 oraciones sobre el enfoque]

**Tech Stack:** [Librerías clave]

---
```

## Estructura de tarea

````markdown
### Tarea N: [Componente]

**Archivos:**
- Crear: `src/feature/file.ts`
- Modificar: `src/existing/file.ts:123-145`
- Test: `tests/feature/file.test.ts`

- [ ] **Paso 1: Escribí el test que falla**

```typescript
describe('feature', () => {
  it('should do X', () => {
    expect(function(input)).toBe(expected);
  });
});
```

- [ ] **Paso 2: Ejecutalo para verificar que falla**

Run: `npx vitest tests/feature/file.test.ts`
Expected: FAIL

- [ ] **Paso 3: Implementación mínima**

```typescript
export function function(input: string): string {
  return expected;
}
```

- [ ] **Paso 4: Verificá que pasa**

Run: `npx vitest tests/feature/file.test.ts`
Expected: PASS

- [ ] **Paso 5: Commit**

```bash
git add tests/feature/file.test.ts src/feature/file.ts
git commit -m "feat: add specific feature"
```
````

## Sin placeholders

Cada paso debe contener el contenido real. FAIL si ves:
- "TBD", "TODO", "implementar después"
- "Agregar manejo de errores apropiado" (sin código)
- "Similar a Tarea N" (repetí el código)
- Referencias a tipos no definidos en ninguna tarea

## Autorevisión

Después de escribir el plan completo:
1. **Cobertura del spec:** cada requisito tiene una tarea que lo implementa?
2. **Placeholders:** buscá patrones prohibidos, arreglalos
3. **Consistencia:** los tipos y nombres coinciden entre tareas?

## Handoff

Después de guardar el plan: "Plan completo guardado en `docs/plans/<file>.md`. Dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — despacho un subagente por tarea, revisión entre tareas
2. **Ejecución inline** — ejecuto las tareas en esta sesión

¿Cuál preferís?"
