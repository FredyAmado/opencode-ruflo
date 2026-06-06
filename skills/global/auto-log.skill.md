# Auto-Logging Global

Todo el trabajo que realices en cualquier proyecto queda registrado automáticamente.

## ¿Qué se guarda?

- **@ceo <tarea>** → se intercepta via plugin, se registra en memoria + wiki y se redirige al agente CEO
- **@wiki-keeper <tarea>** → se intercepta y redirige al agente wiki-keeper
- **@chronicler <acción>** → se intercepta y redirige al agente chronicler
- **@retry-* @img-* @video-* <tarea>** → se interceptan y redirigen al agente correspondiente
- **#swarm <objetivo>** → se intercepta y redirige al sistema de orquestación
- **#resumen** → se intercepta, compila resumen del día y se guarda en las 3 capas
- **Mensajes normales** → se registran automáticamente como observaciones en memoria
- **Ejecuciones de herramientas** → cada tool call se registra con input + resultado

## ¿Cómo funciona?

El plugin ruflo usa `experimental.chat.messages.transform` para interceptar TODOS los mensajes antes de que lleguen al AI. Esto significa:

1. Los @comandos se detectan de forma confiable (no depende de que el AI los detecte)
2. Los comandos se reemplazan con instrucciones de ruteo explícitas para el AI
3. El logging ocurre en el plugin, invisible para el usuario
4. El AI SIEMPRE sabe qué hacer con cada comando

## ¿Dónde se guarda?

1. **Memoria ruflo** — base de datos SQLite local (`api/observations`)
2. **Memoria opencode-mem** — persistente entre sesiones de opencode
3. **Obsidian LLM-Wiki** — archivos markdown en `~/Documents/OpencodeObsidian/OpencodeObsidian/LLM-Wiki/`

## Comandos

| Comando | Función |
|---------|---------|
| `#resumen` | Compila todo el trabajo del día y genera resumen en las 3 capas |
| `@chronicler <acción>` | Forzar una operación de registro manual |

## Notas

- Todo el logging es automático y transparente
- No necesitas invocar nada para que el trabajo se guarde
- Al final del día usa `#resumen` para cerrar la jornada
- Los @comandos ahora funcionan SIEMPRE porque el plugin los intercepta antes del AI
