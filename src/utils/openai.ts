import { MODEL_IMAGE, MODEL_PRO } from './modelConfig';
import { assertWithinUsage, recordUsage } from './usage';

export const OPENAI_STORAGE_KEY = 'neurion_openai_api_key';
export const LEGACY_GEMINI_STORAGE_KEY = 'neurion_gemini_api_key';
export const SECURE_KEY_SENTINEL = '__NEURION_OPENAI_KEY_SECURE__';

type GenerateContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GenerateContentRequest {
  model?: string;
  contents: any;
  config?: {
    systemInstruction?: string;
    responseMimeType?: string;
    thinkingConfig?: unknown;
    responseSchema?: unknown;
    temperature?: number;
  };
}

interface OpenAITextPayload {
  model?: string;
  contents: any;
  systemInstruction?: string;
  jsonMode?: boolean;
  temperature?: number;
}

interface OpenAIImagePayload {
  prompt: string;
  size: string;
  quality?: 'low' | 'medium' | 'high';
}

interface OpenAIEmbeddingPayload {
  input: string;
}

const electronOpenAI = () => (window as any).electronAPI?.openAI;

export async function loadOpenAIKeyIntoRuntime(): Promise<boolean> {
  const bridge = electronOpenAI();
  if (bridge?.hasKey) {
    const hasKey = await bridge.hasKey();
    if (hasKey) {
      (window as any).__NEURION_KEY__ = SECURE_KEY_SENTINEL;
      return true;
    }
  }

  const localKey = localStorage.getItem(OPENAI_STORAGE_KEY) || '';
  if (localKey) {
    (window as any).__NEURION_KEY__ = localKey;
    return true;
  }

  const legacyKey = localStorage.getItem(LEGACY_GEMINI_STORAGE_KEY) || '';
  if (legacyKey) {
    localStorage.removeItem(LEGACY_GEMINI_STORAGE_KEY);
  }

  (window as any).__NEURION_KEY__ = '';
  return false;
}

export function getStoredOpenAIKey(): string {
  return (window as any).__NEURION_KEY__ || localStorage.getItem(OPENAI_STORAGE_KEY) || '';
}

export async function saveOpenAIKey(apiKey: string): Promise<void> {
  const cleanKey = apiKey.trim();
  const bridge = electronOpenAI();

  if (bridge?.saveKey) {
    await bridge.saveKey(cleanKey);
    localStorage.removeItem(OPENAI_STORAGE_KEY);
    localStorage.removeItem(LEGACY_GEMINI_STORAGE_KEY);
    (window as any).__NEURION_KEY__ = SECURE_KEY_SENTINEL;
    return;
  }

  localStorage.setItem(OPENAI_STORAGE_KEY, cleanKey);
  localStorage.removeItem(LEGACY_GEMINI_STORAGE_KEY);
  (window as any).__NEURION_KEY__ = cleanKey;
}

export async function clearOpenAIKey(): Promise<void> {
  const bridge = electronOpenAI();
  if (bridge?.clearKey) {
    await bridge.clearKey();
  }
  localStorage.removeItem(OPENAI_STORAGE_KEY);
  localStorage.removeItem(LEGACY_GEMINI_STORAGE_KEY);
  (window as any).__NEURION_KEY__ = '';
}

export async function validateOpenAIKey(apiKey?: string): Promise<boolean> {
  const cleanKey = apiKey?.trim();
  const bridge = electronOpenAI();

  if (bridge?.validateKey) {
    return bridge.validateKey(cleanKey || null);
  }

  if (!cleanKey && !getStoredOpenAIKey()) return false;
  const key = cleanKey || getStoredOpenAIKey();
  if (!key || key === SECURE_KEY_SENTINEL) return false;

  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });

  return response.ok;
}

function normalizeTextContent(contents: OpenAITextPayload['contents']) {
  if (typeof contents === 'string') return contents;
  if (!Array.isArray(contents)) return String(contents || '');

  const parts = contents.map((part) => {
    if ('text' in part) {
      return { type: 'text', text: part.text };
    }

    if ('parts' in part) {
      const role = part.role ? `${part.role}: ` : '';
      const text = (part.parts || []).map((item: any) => item.text || '').join('\n');
      return { type: 'text', text: `${role}${text}`.trim() };
    }

    return {
      type: 'image_url',
      image_url: {
        url: `data:${part.inlineData?.mimeType || 'image/png'};base64,${part.inlineData?.data || ''}`,
      },
    };
  });

  return parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts;
}

async function directTextRequest(payload: OpenAITextPayload, apiKey: string): Promise<string> {
  const messages: any[] = [];
  if (payload.systemInstruction) {
    messages.push({ role: 'system', content: payload.systemInstruction });
  }
  messages.push({ role: 'user', content: normalizeTextContent(payload.contents) });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: payload.model || MODEL_PRO,
      messages,
      temperature: payload.temperature ?? 0.7,
      response_format: payload.jsonMode ? { type: 'json_object' } : undefined,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'OpenAI request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data?.choices?.[0]?.message?.content || '';
}

export async function generateOpenAIText(payload: OpenAITextPayload, apiKey = getStoredOpenAIKey()): Promise<string> {
  assertWithinUsage('text');
  const bridge = electronOpenAI();
  if (bridge?.generateText) {
    return bridge.generateText(payload);
  }

  if (!apiKey || apiKey === SECURE_KEY_SENTINEL) {
    throw new Error('Chave OpenAI não configurada.');
  }

  return directTextRequest(payload, apiKey);
}

async function directImageRequest(payload: OpenAIImagePayload, apiKey: string): Promise<string | null> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_IMAGE,
      prompt: payload.prompt,
      size: payload.size,
      quality: payload.quality || 'medium',
      n: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'OpenAI image request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const base64 = data?.data?.[0]?.b64_json;
  return base64 ? `data:image/png;base64,${base64}` : data?.data?.[0]?.url || null;
}

export async function generateOpenAIImage(payload: OpenAIImagePayload, apiKey = getStoredOpenAIKey()): Promise<string | null> {
  assertWithinUsage('image');
  const bridge = electronOpenAI();
  if (bridge?.generateImage) {
    return bridge.generateImage(payload);
  }

  if (!apiKey || apiKey === SECURE_KEY_SENTINEL) {
    throw new Error('Chave OpenAI não configurada.');
  }

  return directImageRequest(payload, apiKey);
}

async function directEmbeddingRequest(payload: OpenAIEmbeddingPayload, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: payload.input,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'OpenAI embedding request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data?.data?.[0]?.embedding || [];
}

export async function generateOpenAIEmbedding(payload: OpenAIEmbeddingPayload, apiKey = getStoredOpenAIKey()): Promise<number[]> {
  const bridge = electronOpenAI();
  if (bridge?.generateEmbedding) {
    return bridge.generateEmbedding(payload);
  }

  if (!apiKey || apiKey === SECURE_KEY_SENTINEL) {
    throw new Error('Chave OpenAI não configurada.');
  }

  return directEmbeddingRequest(payload, apiKey);
}

export class OpenAICompatClient {
  private apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
  }

  models = {
    generateContent: async ({ model, contents, config }: GenerateContentRequest) => {
      const text = await generateOpenAIText({
        model,
        contents,
        systemInstruction: config?.systemInstruction,
        jsonMode: config?.responseMimeType === 'application/json',
        temperature: config?.temperature,
      }, this.apiKey);
      recordUsage('text', 1);

      return {
        text,
        candidates: [
          {
            content: {
              parts: [{ text }],
            },
          },
        ],
      };
    },
    embedContent: async ({ contents }: { model?: string; contents: any[] }) => {
      const input = contents
        ?.flatMap((item) => item.parts || [])
        ?.map((part) => part.text || '')
        ?.join('\n')
        ?.trim() || '';
      const values = await generateOpenAIEmbedding({ input }, this.apiKey);

      return {
        embeddings: [
          {
            values,
          },
        ],
      };
    },
  };
}

export const Type = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
};

