---
name: hook-profiles
description: Perfiles de logging y monitoreo — minimal, standard, strict — para controlar el nivel de ruido en memoria
---

# Hook Profiles

Perfiles de registro para controlar cuánto se guarda en memoria.

## Perfiles disponibles

### Minimal
Solo registra eventos esenciales:
- `session.created` / `session.compacted`
- `#resumen` resúmenes diarios
- Errores del worker

Ideal para: sesiones rápidas de prueba, búsquedas, tareas simples

### Standard (default)
Registra eventos normales:
- Mensajes del usuario (con límite de 500 chars)
- Comandos @agente y #swarm
- Ejecuciones de herramientas
- Compactaciones de sesión
- Resúmenes diarios

Ideal para: trabajo de desarrollo normal

### Strict
Registra todo:
- Mensajes completos (sin límite de caracteres)
- Todas las ejecuciones de herramientas (input + output completos)
- Cada paso del proceso de subagentes
- Métricas de performance (timing de tool calls)
- Cambios de configuración

Ideal para: debugging, auditoría, sesiones de QA

## Cómo cambiarlo

Los perfiles se configuran via MCP `ruflo_settings_set`:
```bash
curl -X POST http://127.0.0.1:37778/api/settings -d '{"profile": "minimal"}'
curl -X POST http://127.0.0.1:37778/api/settings -d '{"profile": "strict"}'
```

El perfil default es `standard`. El cambio es inmediato, no requiere reinicio.

## Implementación

En el plugin ruflo, el perfil controla:
- `messages.transform` — si guarda mensajes completos o truncados
- `tool.execute.after` — si guarda resultados completos o resumidos
- `logToMemory` — qué tipos de eventos se registran
