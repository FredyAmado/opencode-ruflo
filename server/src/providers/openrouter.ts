const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODEL_CHAIN = [
  'deepseek/deepseek-v4-flash-free',
  'deepseek/deepseek-chat',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-small-3.1-24b-instruct',
];

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ProviderResult {
  text: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export async function callProvider(
  messages: ProviderMessage[],
  options: ProviderOptions = {},
): Promise<ProviderResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { text: generateOfflineFallback(messages) };
  }

  const models = options.model ? [options.model, ...MODEL_CHAIN.filter(m => m !== options.model)] : MODEL_CHAIN;

  let lastError: string | null = null;

  for (const model of models) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://opencode.ai',
          'X-Title': 'opencode-ruflo',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2048,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = `HTTP ${response.status}: ${errText}`;
        if (response.status === 401 || response.status === 402) continue;
        throw new Error(lastError);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) return {
        text: content,
        usage: data?.usage ? { prompt_tokens: data.usage.prompt_tokens || 0, completion_tokens: data.usage.completion_tokens || 0 } : undefined,
      };
      lastError = 'Respuesta vacía del modelo';
    } catch (err: any) {
      lastError = err.message;
      continue;
    }
  }

  return { text: generateOfflineFallback(messages, lastError || 'Todos los modelos fallaron') };
}

function generateOfflineFallback(messages: ProviderMessage[], error?: string): string {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const systemMsg = messages.find(m => m.role === 'system');

  const persona = systemMsg
    ? systemMsg.content.split('\n')[0]?.substring(0, 100) || 'Agente'
    : 'Agente';

  if (error) {
    return `[${persona}]\n\n(Modo offline — proveedor AI no disponible: ${error})\n\nHe recibido tu solicitud. En modo offline puedo ayudarte con:\n- Análisis de código y revisión (sin generación AI)\n- Estructuración de problemas\n- Preguntas conceptuales\n\n**Tu mensaje:** ${lastUserMsg?.content?.substring(0, 200) || ''}\n\n¿Quieres que proceda con análisis conceptual sin generación AI?`;
  }

  return `[${persona}]\n\n(No hay API key configurada — OPENROUTER_API_KEY no está definida)\n\n**Tu mensaje:** ${lastUserMsg?.content?.substring(0, 200) || ''}`;
}
