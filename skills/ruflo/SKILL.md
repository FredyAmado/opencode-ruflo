# Ruflo — Orquestación Multi-Agente

Ruflo extiende Opencode con agentes especializados, memoria compartida y swarms.

## Agentes disponibles

Usa `@<nombre> <mensaje>` para hablar directamente con un agente:

| Comando | Agente | Descripción | Plugin |
|---------|--------|-------------|--------|
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

## Auto-Logging Global

Todo el trabajo que realices con `@agente` o `#swarm` se guarda **automáticamente** en:
1. **Memoria ruflo** — base de datos SQLite (observations)
2. **Obsidian LLM-Wiki** — `LLM-Wiki/log.md` (formato cronológico)
3. **opencode-mem** — memoria persistente entre sesiones (vía plugin global)

No necesitas hacer nada adicional. El registro ocurre de forma invisible.

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

### Plugins (2)
| Herramienta | Descripción |
|-------------|-------------|
| `ruflo_plugin_list` | Lista los plugins de ruflo instalados |
| `ruflo_plugin_scan` | Escanea directorios y registra plugins |
