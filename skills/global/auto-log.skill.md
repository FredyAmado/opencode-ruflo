# Auto-Logging Global

Todo el trabajo que realices en cualquier proyecto queda registrado automáticamente.

## ¿Qué se guarda?

- **@agent <tarea>** → se guarda la interacción en memoria y en la wiki Obsidian
- **#swarm <objetivo>** → se guarda el resultado del swarm
- **Trabajo manual** → puedes pedir `#resumen` al final del día para compilar todo

## ¿Dónde se guarda?

1. **Memoria ruflo** — base de datos SQLite local, búsqueda rápida vía MCP
2. **Memoria opencode-mem** — persistente entre sesiones de opencode
3. **Obsidian LLM-Wiki** — archivos markdown editables en `~/Documents/OpencodeObsidian/OpencodeObsidian/LLM-Wiki/`

## Comandos

| Comando | Función |
|---------|---------|
| `#resumen` | Compila todo el trabajo del día y genera resumen en las 3 capas |
| `@chronicler <acción>` | Forzar una operación de registro manual |

## Notas

- Todo el logging es automático y transparente
- No necesitas invocar nada para que el trabajo se guarde
- Al final del día usa `#resumen` para cerrar la jornada
