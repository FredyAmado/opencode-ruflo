# Ruflo — Orquestación Multi-Agente

Ruflo extiende Opencode con agentes especializados, memoria compartida y swarms.

## Agentes disponibles

Usa `@<nombre> <mensaje>` para hablar directamente con un agente:

| Comando | Agente | Descripción | Plugin |
|---------|--------|-------------|--------|
| `@ceo <tarea>` | CEO | **Estratega y orquestador**. Planea, delega y da seguimiento usando el sistema ruflo | core |
| `@coder <tarea>` | Coder | Programación y desarrollo | core |
| `@tester <tarea>` | Tester | Pruebas y aseguramiento de calidad | core |
| `@architect <tarea>` | Architect | Arquitectura y diseño de sistemas | core |
| `@reviewer <tarea>` | Reviewer | Revisión de código y calidad | core |
| `@security <tarea>` | Security | Seguridad y vulnerabilidades | core |
| `@researcher <tarea>` | Researcher | Investigación técnica | core |
| `@writer <tarea>` | Writer | Documentación técnica | core |
| `@devops <tarea>` | DevOps | Infraestructura y CI/CD | core |
| `@designer <tarea>` | Designer | Diseño UI/UX | core |
| `@planner <tarea>` | Planner | Planificación y gestión | core |
| `@security-auditor <tarea>` | Security Auditor | Auditoría OWASP de seguridad | security-audit |
| `@test-generator <tarea>` | Test Generator | Generación automática de tests | testgen |
| `@doc-writer <tarea>` | Doc Writer | Documentación técnica | docs |

## CEO — Orquestación Multi-Agente

El agente `@ceo` es tu interfaz principal para el sistema ruflo. Usa `@ceo` para:

- **Planificar**: `@ceo plan crear login con JWT` → analiza y sugiere agentes
- **Ejecutar**: `@ceo build crear login con JWT` → orquesta agentes en background
- **Consultar**: `@ceo task 42` → ve el estado de una tarea en ejecución

## Swarms (Enjambres de agentes)

Usa `#swarm <objetivo>` para ejecutar un equipo de agentes coordinados.

### Topologías

| Topología | Comportamiento |
|-----------|----------------|
| `hierarchical` | Coordinador planifica → workers ejecutan → coordinador sintetiza (default) |
| `sequential` | Cada agente recibe el resultado del anterior, en cadena |
| `mesh` | Todos los agentes trabajan en paralelo, resultados combinados |

### Flujo de trabajo con swarms

1. **Crear swarm**: `ruflo_swarm_init` con los IDs de los agentes y la topología
2. **Ejecutar**: `#swarm desarrolla un módulo de autenticación` — los agentes trabajan en equipo
3. **Ver resultado**: `ruflo_swarm_status` para ver el estado y resultado

## Plugins

Los plugins de ruflo añaden agentes y capacidades adicionales:

| Plugin | Agentes | Descripción |
|--------|---------|-------------|
| `security-audit` | security-auditor | Auditoría de seguridad OWASP |
| `testgen` | test-generator | Generación automática de tests |
| `docs` | doc-writer | Documentación técnica |

Los plugins se cargan automáticamente desde el directorio `plugins/`. Usa `ruflo_plugin_list` para ver los instalados y `ruflo_plugin_scan` para recargar.

## Enrutamiento Automático de @comandos

El plugin ruflo intercepta todos tus @comandos usando el hook `experimental.chat.messages.transform`, que los detecta ANTES de que lleguen al AI. Esto significa que:

- **`@ceo <tarea>`** → siempre se redirige al agente CEO (sin depender de que el AI lo detecte)
- **`@wiki-keeper <tarea>`** → siempre se redirige al wiki-keeper
- **`#swarm <objetivo>`** → se convierte en una orquestación multi-agente
- **`#resumen`** → compila el resumen del día automáticamente
- **Model fallback** → `@retry-*`, `@img-*`, `@video-*` se redirigen al agente correcto

El ruteo es invisible para vos. El plugin modifica el mensaje antes de que el AI lo procese, agregando instrucciones explícitas de delegación.

## Auto-Logging Global

Todo el trabajo que realices se guarda **automáticamente** en:
1. **Memoria ruflo** — base de datos SQLite (observations)
2. **Obsidian LLM-Wiki** — `LLM-Wiki/log.md` (formato cronológico) y páginas en `wiki/fuentes/auto/`
3. **opencode-mem** — memoria persistente entre sesiones (vía plugin global)

No necesitas hacer nada adicional. El registro ocurre a nivel de plugin, de forma invisible.

### Resumen diario

Usa `#resumen` al final del día para compilar todo el trabajo realizado. El resumen se guarda en:
- `LLM-Wiki/log.md`
- `LLM-Wiki/wiki/fuentes/YYYY-MM-DD-resumen-diario.md`
- Memoria ruflo (type: summary)

### wiki-keeper (global)

El agente `@wiki-keeper` está disponible desde cualquier proyecto (no solo desde el vault Obsidian). Úsalo para:
- Consultar conocimiento acumulado
- Ingerir nuevas fuentes
- Mantener páginas de la wiki

## Skills de flujo de trabajo

Skills adicionales disponibles para metodologías de desarrollo:

| Skill | Descripción | Cuándo usarla |
|-------|-------------|---------------|
| `subagent-driven-development` | Ejecutar planes con subagente fresco por tarea + revisión 2 etapas | Al implementar un plan multi-tarea |
| `dispatching-parallel-agents` | Despachar múltiples subagentes en paralelo para tareas independientes | Cuando 2+ tareas no comparten estado |
| `writing-plans` | Escribir planes de implementación detallados con tareas atómicas y código completo | Antes de codificar una feature multi-paso |
| `memory-lifecycle` | Pipeline formal del ciclo de vida de memoria (init → observe → compact → end) | Para entender cómo se persiste el estado |
| `context-monitor` | Alertas de agotamiento de contexto, costo alto y scope creep | Cuando la sesión se siente lenta o errática |
| `hook-profiles` | Perfiles de logging (minimal/standard/strict) | Para controlar el nivel de ruido en memoria |

Cargá cualquier skill con el comando `skill <nombre>`.

## Herramientas MCP

### Agentes (6)
| Herramienta | Descripción |
|-------------|-------------|
| `ruflo_health` | Verifica que el worker esté funcionando |
| `ruflo_agent_list` | Lista todos los agentes con sus estados |
| `ruflo_agent_get` | Obtiene detalles de un agente por ID o nombre |
| `ruflo_agent_spawn` | Ejecuta una tarea en un agente (usa AI) |
| `ruflo_agent_create` | Crea un nuevo agente personalizado |
| `ruflo_agent_tasks` | Lista tareas de un agente |

### Memoria (4)
| Herramienta | Descripción |
|-------------|-------------|
| `ruflo_memory_search` | Busca en la memoria compartida (observaciones) |
| `ruflo_context_get` | Obtiene contexto compartido entre agentes |
| `ruflo_context_set` | Actualiza o crea contexto compartido |
| `ruflo_memory_summarize` | Genera resumen AI de interacciones recientes |

### Swarms (3)
| Herramienta | Descripción |
|-------------|-------------|
| `ruflo_swarm_init` | Crea un nuevo swarm con agentes y topología |
| `ruflo_swarm_execute` | Ejecuta un swarm con un objetivo |
| `ruflo_swarm_status` | Consulta estado y resultados de un swarm |

### Plugins (3)
| Herramienta | Descripción |
|-------------|-------------|
| `ruflo_plugin_list` | Lista los plugins de ruflo instalados |
| `ruflo_plugin_scan` | Escanea directorios y registra plugins |
| `ruflo_plugin_validate` | Valida estructura, seguridad y obsolescencia de un plugin |

### Quality Gates (plugin validation)

Usa `ruflo_plugin_validate <directory>` para obtener un reporte con 3 categorías:
- **Estructura**: plugin.json válido, campos requeridos, agentes bien definidos, skills existentes
- **Seguridad**: API keys hardcodeadas, tokens, URLs con credenciales, variables de entorno
- **Obsolescencia**: plugin sin modificar >90 días (warning) o >180 días (fallo)

Ejemplo de uso por un agente:
```
ruflo_plugin_validate directory: /path/to/plugins/mi-plugin
```
