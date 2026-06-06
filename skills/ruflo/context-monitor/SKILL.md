---
name: context-monitor
description: Alertas y guías para monitorear agotamiento de contexto, costo alto, y accumulation de scope
---

# Context Monitor

Alertas para mantener la sesión saludable.

## Señales de agotamiento de contexto

- **Respuestas se vuelven genéricas** — el AI empieza a dar respuestas vagas o cortas
- **Olvida instrucciones recientes** — ignora lo que le pediste hace 3-4 mensajes
- **Errores repetitivos** — comete el mismo error que ya corrigió antes
- **Tool calls fallan en cadena** — llama herramientas con parámetros incorrectos consistentemente

### Qué hacer
1. **Compacter**: usá `session.compacting` hook (automático) o pedí `#resumen` primero
2. **Dividir**: partí la tarea actual en sub-tareas más pequeñas y usá `@ceo` para orquestar
3. **Fresh agent**: delegá a un subagente via `@coder <tarea específica>` para tareas complejas

## Señales de costo alto

Monitoreá el costo acumulado de la sesión. Si es significativo:
- Usá `@retry-nemotron` para tareas de prueba/exploración (gratis)
- Dejá los modelos premium (`@retry-gemini`) solo para tareas que requieran razonamiento profundo
- Imágenes: empezá siempre con `@img-flux-klein` (gratis/tier free)

## Señales de scope creep

- **"Ya que estamos..."** — el usuario empieza a agregar features relacionados
- **Tareas laterales** — aparecen requests que no estaban en el plan original
- **Refactors no planificados** — cambios estructurales que no pidieron

### Qué hacer
1. **Anotar**: registrá el nuevo request como observación en memoria
2. **Preguntar**: "Esto no estaba en el plan original. ¿Lo agregamos al scope actual o lo dejamos para después?"
3. **Planificar**: si es para después, usá `@ceo` para crear un nuevo plan
