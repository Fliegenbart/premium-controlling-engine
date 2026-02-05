/**
 * Hybrid LLM Service
 * Automatically switches between local (Ollama) and cloud (Claude) based on availability
 * Prioritizes local for data sovereignty
 */

import Anthropic from '@anthropic-ai/sdk';
import { OllamaService, getOllamaService } from './ollama-service';

export type LLMProvider = 'claude' | 'ollama' | 'auto';

export interface LLMResponse {
  text: string;
  provider: 'claude' | 'ollama';
  model: string;
  latencyMs: number;
}

export interface HybridLLMConfig {
  preferredProvider: LLMProvider;
  claudeApiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

const DEFAULT_CONFIG: HybridLLMConfig = {
  preferredProvider: (process.env.LLM_PROVIDER as LLMProvider) || 'auto',
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
};

export class HybridLLMService {
  private claude: Anthropic | null = null;
  private ollama: OllamaService;
  private config: HybridLLMConfig;
  private ollamaAvailable: boolean | null = null;

  constructor(config: Partial<HybridLLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Claude if API key available
    if (this.config.claudeApiKey) {
      this.claude = new Anthropic({ apiKey: this.config.claudeApiKey });
    }

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
   * Generate a response using the best available provider
   */
  async generate(
    prompt: string,
    options: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      forceProvider?: 'claude' | 'ollama';
    } = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    // Determine which provider to use
    let useOllama = false;

    if (options.forceProvider === 'ollama') {
      useOllama = true;
    } else if (options.forceProvider === 'claude') {
      useOllama = false;
    } else if (this.config.preferredProvider === 'ollama') {
      useOllama = await this.checkOllamaAvailable();
    } else if (this.config.preferredProvider === 'auto') {
      // Auto: prefer Ollama for data sovereignty, fallback to Claude
      useOllama = await this.checkOllamaAvailable();
    }
    // else: preferredProvider === 'claude', use Claude

    // Try primary provider
    if (useOllama) {
      try {
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
        console.warn('Ollama failed, falling back to Claude:', error);
        // Fall through to Claude
      }
    }

    // Use Claude (primary or fallback)
    if (!this.claude) {
      throw new Error('No LLM available: Claude API key not configured and Ollama not available');
    }

    try {
      const messages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: prompt },
      ];

      const response = await this.claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: options.maxTokens || 500,
        system: options.systemPrompt,
        messages,
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      return {
        text,
        provider: 'claude',
        model: 'claude-3-5-haiku',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`LLM generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get current provider status
   */
  async getStatus(): Promise<{
    ollamaAvailable: boolean;
    claudeAvailable: boolean;
    preferredProvider: LLMProvider;
    activeProvider: 'claude' | 'ollama' | 'none';
  }> {
    const ollamaAvailable = await this.checkOllamaAvailable();
    const claudeAvailable = !!this.claude;

    let activeProvider: 'claude' | 'ollama' | 'none' = 'none';
    if (this.config.preferredProvider === 'ollama' && ollamaAvailable) {
      activeProvider = 'ollama';
    } else if (this.config.preferredProvider === 'claude' && claudeAvailable) {
      activeProvider = 'claude';
    } else if (this.config.preferredProvider === 'auto') {
      activeProvider = ollamaAvailable ? 'ollama' : (claudeAvailable ? 'claude' : 'none');
    }

    return {
      ollamaAvailable,
      claudeAvailable,
      preferredProvider: this.config.preferredProvider,
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
