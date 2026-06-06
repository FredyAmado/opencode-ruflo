# Caveman Mode — Compression de Output

Reduce tokens de salida sin perder calidad. 3 niveles controlables con `/modo`.

## Niveles

| Nivel | Output | Ahorro | Riesgo | Default |
|-------|--------|--------|--------|---------|
| `lite` | Sin relleno ("I'd be happy to help", "Great question!", hedges). Explicaciones completas. | ~30-40% | Muy bajo | **Sí** |
| `full` | Fragmentos, telegráfico, sin artículos ni prosa innecesaria. | ~65% | Medio | No |
| `normal` | Sin compresión. | 0% | Ninguno | No |

## Comandos

- `/modo lite` — Modo seguro, sin relleno (default)
- `/modo full` — Máxima compresión
- `/modo normal` — Sin compresión

## Auto-detección

Si la tarea involucra documentación, README, CHANGELOG, commit messages o release notes, el sistema fuerza automáticamente `normal` para evitar texto telegráfico en contenido formal.

## Cuándo usar cada modo

- **lite**: Trabajo diario. Debugging, refactors, code reviews, preguntas técnicas. La compresión de relleno no afecta la calidad de la respuesta.
- **full**: Tareas mecánicas conocidas (ej: "crea un CRUD de usuarios", "fix error X"), exploración rápida, ahorro máximo de tokens.
- **normal**: Documentación, commits, explicaciones a juniors, cualquier output que se vaya a compartir o leer fuera de la sesión.
