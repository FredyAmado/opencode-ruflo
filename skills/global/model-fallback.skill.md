# Model Fallback Chain

Si una tarea se traba en bucles de errores (2-3 intentos fallidos sin progreso), usá la cadena de modelos de respaldo.

## Cadena de modelos

| Escalón | Modelo | Costo |
|---------|--------|-------|
| 1 | DeepSeek V4 Flash (default) | Gratis |
| 2 | `@retry-nemotron` — Nemotron 3 Super 120B | Gratis |
| 3 | `@retry-poolside` — Poolside Laguna XS.2 | Gratis |
| 4 | `@retry-gemini` — Gemini 2.5 Flash | $0.15/M |

## Cómo funciona

1. **Intentos 1-2**: Seguís con el modelo actual (DeepSeek V4 Flash)
2. **Intento 3**: Si seguís trabado, decile al usuario:
   - *"Llevamos X intentos sin resolver. ¿Querés que intente con Nemotron 3 Super (gratis)?"*
3. **Si acepta**: Simplemente escribí `@retry-nemotron <descripción del problema>`. El plugin ruflo lo intercepta automáticamente vía `messages.transform` y lo redirige al subagente retry. Ya no depende de que el AI lo detecte manualmente.
4. **Si ese también falla**: Subís al siguiente escalón de la cadena
5. **Cuando se resuelve**: Confirmale al usuario que volvemos al modelo gratis para la próxima tarea

## Notas
- Siempre ofrecé el cambio, nunca forcés
- Los subagentes retry tienen su propio modelo configurado, solo pasales el problema a resolver
- El plugin ruflo intercepta `@retry-*`, `@img-*` y `@video-*` automáticamente y los redirige al agente correcto
- Después de resolver, todo vuelve a DeepSeek V4 Flash gratis automáticamente

---

# Image Generation Fallback

Cuando el usuario pida generar imágenes, usá esta cadena de modelos.

## Cadena de imágenes

| Escalón | Agente | Modelo | Costo |
|---------|--------|--------|-------|
| 1 | `@img-flux-klein` | FLUX 2 Klein 4B `:free` (ImageRouter) | 3/día gratis, luego $0.0006/img |
| 2 | `@img-flux-flex` | Flux.2 Flex (OpenRouter) | ~$0.003/img |
| 3 | `@img-seedream` | Seedream 4.5 (OpenRouter) | ~$0.04/img |
| 4 | `@img-nanobanana` | Nano Banana 2 / Gemini 3.1 Flash Image (OpenRouter) | ~$0.05/img |

## Cómo funciona

1. Empezá siempre con el escalón más barato que tenga sentido para lo que pide el usuario
2. Si la calidad no alcanza, ofrecé subir al siguiente escalón
3. **Siempre avisá el costo** antes de generar algo que no sea gratis
4. Cuando el usuario pide "una imagen rápido" → FLUX 2 Klein (gratis)
5. Cuando pide "buena calidad" → Seedream o Nano Banana

## API Keys
- **ImageRouter.io**: necesita `$env:IMAGEROUTER_API_KEY` (para el tier pago, el gratis es web-only)
- **OpenRouter**: ya configurado con `$env:OPENROUTER_API_KEY`

---

# Video Generation Fallback

Cuando el usuario pida generar videos, usá esta cadena.

## Cadena de videos

| Escalón | Agente | Modelo | Costo |
|---------|--------|--------|-------|
| 1 | `@video-veo-lite` | Veo 3.1 Lite (OpenRouter) | Barato, 4-8s |
| 2 | `@video-kling` | Kling v3.0 Standard (OpenRouter) | Medio, 3-15s |
| 3 | (próximamente) | Veo 3.1 Fast / Kling Pro | Premium |

## Cómo funciona
1. La API de video es asíncrona (submit job → poll → resultado)
2. Empezá con Veo Lite para pruebas rápidas
3. Ofrecé Kling si necesita más duración o calidad
4. Siempre consultá al usuario antes de generar si hay costo
