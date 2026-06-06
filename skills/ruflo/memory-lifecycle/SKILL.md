---
name: memory-lifecycle
description: Memory persistence lifecycle for agent sessions — init, observe, compact, summarize
---

# Memory Lifecycle

Pipeline formal del ciclo de vida de memoria para sesiones de agente.

## Ciclo completo

```
SessionStart  →  [Observaciones durante sesión]  →  PreCompact  →  Stop  →  SessionEnd
     │                                                                    │
     └── init session en memoria                                         └── resumen final
```

## Etapas

### 1. SessionStart
- Se crea una sesión en opencode-mem con el projecto actual y el prompt inicial
- Se registra en ruflo memory como observation type: `session_start`
- Se escribe entrada en Obsidian log.md

### 2. Observaciones (durante la sesión)
- Cada mensaje del usuario → observation type: `message`
- Cada tool call → observation type: `tool_execution`
- Cada @comando → observation type específico (`ceo_task`, `swarm`, etc.)
- Se guarda automáticamente vía el plugin ruflo (messages.transform + tool.execute.after)

### 3. PreCompact (antes de compactar)
- Se registran los últimos N mensajes como observation type: `pre_compact`
- Se mantiene el sessionId activo

### 4. Stop (cuando compacts)
- Se registra `session_compacted` en ruflo memory
- Se cierra la sesión en opencode-mem
- Se guarda el último prompt como referencia

### 5. SessionEnd (cuando termina la sesión)
- Se genera resumen automático (vía `#resumen` o al cerrar)
- El resumen se guarda en las 3 capas:
  1. Ruflo memory (SQLite)
  2. Opencode-mem (persistente)
  3. Obsidian wiki (markdown)

## Implementación actual

El plugin ruflo implementa este pipeline vía:
- `experimental.chat.messages.transform` → captura mensajes + comandos
- `tool.execute.after` → captura ejecuciones de herramientas
- `experimental.session.compacting` → registra compactaciones
- `experimental.chat.system.transform` → inyecta contexto al inicio
