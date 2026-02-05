/**
 * Ollama Service for local LLM inference
 * Enables on-premise AI without sending data to external clouds
 */

export interface OllamaConfig {
  baseUrl: string;      // e.g., "http://localhost:11434"
  model: string;        // e.g., "llama3.1:8b", "mistral:7b"
  timeout: number;      // ms
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  timeout: 60000, // 60 seconds
};

export class OllamaService {
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Ollama is available and responding
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate a completion using Ollama
   */
  async generate(prompt: string, options: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const body: any = {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3, // Low for consistent analysis
          num_predict: options.maxTokens ?? 500,
          top_p: 0.9,
        },
      };

      if (options.systemPrompt) {
        body.system = options.systemPrompt;
      }

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${errorText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Generate with chat format (for models that support it)
   */
  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 500,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama chat error: ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(): Promise<{
    name: string;
    size: string;
    quantization: string;
  } | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.config.model }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        name: this.config.model,
        size: data.details?.parameter_size || 'unknown',
        quantization: data.details?.quantization_level || 'unknown',
      };
    } catch {
      return null;
    }
  }
}

// Singleton instance
let ollamaInstance: OllamaService | null = null;

export function getOllamaService(config?: Partial<OllamaConfig>): OllamaService {
  if (!ollamaInstance || config) {
    ollamaInstance = new OllamaService(config);
  }
  return ollamaInstance;
}
