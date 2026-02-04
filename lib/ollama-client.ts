/**
 * Ollama Client - Local LLM Integration
 * 
 * Supports:
 * - Streaming responses
 * - Tool/Function calling (with compatible models)
 * - Multiple model selection
 * - Automatic fallback
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export interface OllamaGenerateOptions {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_ctx?: number;
    num_predict?: number;
  };
  format?: 'json';
}

// Recommended models for controlling tasks
export const RECOMMENDED_MODELS = {
  // Best for German + Tool Calling
  primary: 'qwen2.5:14b',
  
  // Alternatives
  fast: 'qwen2.5:7b',
  large: 'qwen2.5:32b',
  
  // Fallbacks
  mistral: 'mistral:7b',
  llama: 'llama3.1:8b',
  
  // Code-focused
  codellama: 'codellama:13b',
} as const;

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  
  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = RECOMMENDED_MODELS.primary) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }
  
  /**
   * Check if Ollama is running and model is available
   */
  async healthCheck(): Promise<{ healthy: boolean; models: string[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return { healthy: false, models: [], error: 'Ollama not responding' };
      }
      
      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      
      return { healthy: true, models };
    } catch (error) {
      return { healthy: false, models: [], error: (error as Error).message };
    }
  }
  
  /**
   * Pull a model if not present
   */
  async pullModel(model: string, onProgress?: (status: string) => void): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: true }),
      });
      
      if (!response.ok || !response.body) {
        return false;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const lines = decoder.decode(value).split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (onProgress && data.status) {
              onProgress(data.status);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to pull model:', error);
      return false;
    }
  }
  
  /**
   * Generate a chat completion
   */
  async chat(options: OllamaGenerateOptions): Promise<string> {
    const model = options.model || this.defaultModel;
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.options?.temperature ?? 0.7,
          top_p: options.options?.top_p ?? 0.9,
          num_ctx: options.options?.num_ctx ?? 8192,
          num_predict: options.options?.num_predict ?? 2048,
        },
        format: options.format,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${error}`);
    }
    
    const data: OllamaResponse = await response.json();
    return data.message.content;
  }
  
  /**
   * Generate with streaming
   */
  async *chatStream(options: OllamaGenerateOptions): AsyncGenerator<string> {
    const model = options.model || this.defaultModel;
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: options.messages,
        stream: true,
        options: {
          temperature: options.options?.temperature ?? 0.7,
          num_ctx: options.options?.num_ctx ?? 8192,
        },
      }),
    });
    
    if (!response.ok || !response.body) {
      throw new Error('Ollama streaming failed');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const data: OllamaResponse = JSON.parse(line);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
  
  /**
   * Generate JSON response (structured output)
   */
  async chatJSON<T>(options: OllamaGenerateOptions): Promise<T> {
    const response = await this.chat({
      ...options,
      format: 'json',
      messages: [
        ...options.messages,
        {
          role: 'user',
          content: 'Respond ONLY with valid JSON, no additional text.'
        }
      ]
    });
    
    // Clean response (remove markdown code blocks if present)
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    
    return JSON.parse(cleaned.trim());
  }
  
  /**
   * Simple completion (no chat format)
   */
  async generate(prompt: string, model?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || this.defaultModel,
        prompt,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Ollama generate failed');
    }
    
    const data = await response.json();
    return data.response;
  }
}

// Singleton instance
let ollamaClient: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!ollamaClient) {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || RECOMMENDED_MODELS.primary;
    ollamaClient = new OllamaClient(host, model);
  }
  return ollamaClient;
}
