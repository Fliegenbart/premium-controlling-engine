/**
 * Local LLM Service (Ollama only)
 * No external APIs are used.
 */

import { OllamaService, getOllamaService } from './ollama-service';

export type LLMProvider = 'ollama';

export interface LLMResponse {
  text: string;
  provider: 'ollama';
  model: string;
  latencyMs: number;
}

export interface HybridLLMConfig {
  ollamaUrl?: string;
  ollamaModel?: string;
}

const DEFAULT_CONFIG: HybridLLMConfig = {
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
};

export class HybridLLMService {
  private ollama: OllamaService;
  private config: HybridLLMConfig;
  private ollamaAvailable: boolean | null = null;

  constructor(config: Partial<HybridLLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Ollama
    this.ollama = getOllamaService({
      baseUrl: this.config.ollamaUrl,
      model: this.config.ollamaModel,
    });
  }

  /**
   * Check Ollama availability (cached for 30 seconds)
   */
  private async checkOllamaAvailable(): Promise<boolean> {
    // Use cached result if recent
    if (this.ollamaAvailable !== null) {
      return this.ollamaAvailable;
    }

    this.ollamaAvailable = await this.ollama.isAvailable();

    // Reset cache after 30 seconds
    setTimeout(() => {
      this.ollamaAvailable = null;
    }, 30000);

    return this.ollamaAvailable;
  }

  /**
   * Generate a response using Ollama
   */
  async generate(
    prompt: string,
    options: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const available = await this.checkOllamaAvailable();
      if (!available) {
        throw new Error('Ollama ist nicht verfügbar');
      }

      const text = await this.ollama.generate(prompt, {
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      return {
        text,
        provider: 'ollama',
        model: this.config.ollamaModel || 'llama3.1:8b',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`LLM generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a streaming response using Ollama
   */
  async *generateStream(
    prompt: string,
    options: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<{text: string; done: boolean}, void, unknown> {
    const startTime = Date.now();

    try {
      const available = await this.checkOllamaAvailable();
      if (!available) {
        throw new Error('Ollama ist nicht verfügbar');
      }

      let totalText = '';
      for await (const chunk of this.ollama.generateStream(prompt, {
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      })) {
        totalText += chunk;
        yield {
          text: chunk,
          done: false,
        };
      }

      // Emit final done signal
      yield {
        text: totalText,
        done: true,
      };
    } catch (error) {
      throw new Error(`LLM streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get current provider status
   */
  async getStatus(): Promise<{
    ollamaAvailable: boolean;
    preferredProvider: LLMProvider;
    activeProvider: 'ollama' | 'none';
  }> {
    const ollamaAvailable = await this.checkOllamaAvailable();

    const activeProvider: 'ollama' | 'none' = ollamaAvailable ? 'ollama' : 'none';

    return {
      ollamaAvailable,
      preferredProvider: 'ollama',
      activeProvider,
    };
  }
}

// Singleton
let hybridInstance: HybridLLMService | null = null;

export function getHybridLLMService(config?: Partial<HybridLLMConfig>): HybridLLMService {
  if (!hybridInstance || config) {
    hybridInstance = new HybridLLMService(config);
  }
  return hybridInstance;
}
