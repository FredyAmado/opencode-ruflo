---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks — dispatch a fresh subagent per task, review after each
---

# Subagent-Driven Development

Ejecutá planes de implementación delegando cada tarea a un subagente nuevo, con revisión en dos etapas después de cada una: primero cumplimiento del spec, luego calidad de código.

**Principio clave:** Subagente nuevo por tarea + revisión en dos etapas (spec → calidad) = alta calidad, iteración rápida

**Ejecución continua:** No pausés para consultar al usuario entre tareas. Ejecutá todo el plan sin parar. Solo parás si hay BLOCKED que no podés resolver, ambigüedad que impide progresar, o todas las tareas terminaron.

## Cuándo usarlo

Usalo cuando:
- Tenés un plan de implementación con tareas bien definidas
- Las tareas son mayormente independientes (no comparten estado mutable)
- Trabajás en la misma sesión (sin cerrar contexto)

NO usarlo cuando:
- Las tareas están fuertemente acopladas (una depende del resultado exacto de otra)
- Necesitás entender el estado completo del sistema antes de cada cambio
- El plan todavía no está escrito (usá writing-plans primero)

## El proceso

Por cada tarea del plan:
1. **Extraer** el texto completo de la tarea + contexto relevante del plan
2. **Crear** un subagente implementador vía `@coder <task>` o Task con subagent_type adecuado
3. **Responder preguntas** si el subagente las tiene, luego re-despachar
4. **Implementador** implementa, testea, hace autocrítica, commitea
5. **Revisor de spec** — usá `@reviewer` para verificar que el código cumple el spec
6. **Revisor de calidad** — usá `@reviewer` para revisar calidad del código
7. **Marcar tarea completa** en todowrite

## Manejo de estados del implementador

- **DONE**: Procedé a revisión de spec
- **DONE_WITH_CONCERNS**: Leé las dudas antes de revisar; si son correctitud/dependencias, address primero
- **NEEDS_CONTEXT**: Proveé el contexto faltante y re-despachá
- **BLOCKED**: Evaluá — si es contexto, aportalo; si la tarea es muy grande, dividila; si el plan está mal, escalá al usuario

## Ejemplo de flujo

```
Usuario: implementá el módulo de autenticación según el plan en docs/plan-auth.md

Vos: Voy a usar subagent-driven-development.

[Leer plan, extraer 4 tareas, crear todowrite]

Tarea 1: Modelo User + tabla SQL

[@coder Crea el modelo User con sequelize, tabla usuarios con
  id, email, password_hash, created_at, updated_at.
  Seguí TDD: test → fail → implement → pass → commit.]

Implementador: "La contraseña la guardo con bcrypt o argon2?"
Vos: "bcrypt, 12 rounds"

Implementador: [implementa, testea, commit]

[@reviewer Revisá spec: el modelo User tiene todos los campos
  del spec? Las validaciones están?]

@reviewer: ✅ Spec compliant

[@reviewer Revisá calidad: nombres, estructura, tests, errores]

@reviewer: ✅ Approved

[Marcar Tarea 1 completa]
```

## Modelos recomendados

- **Tareas mecánicas** (1-2 archivos, spec claro): usá el modelo default (DeepSeek V4 Flash)
- **Integraciones** (multi-archivo): podés escalar a `@retry-nemotron` gratis
- **Arquitectura/revisión**: el mejor modelo disponible

## Red flags

- No empezar en main/master sin permiso explícito
- No saltear revisiones (spec O calidad)
- No despachar múltiples implementadores en paralelo (conflictos)
- No ignorar preguntas del subagente
- No pasar a la siguiente tarea si hay issues abiertos en la revisión
