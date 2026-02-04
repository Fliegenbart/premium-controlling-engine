/**
 * Tree Reasoner - LLM-powered document navigation
 *
 * Uses hierarchical tree traversal instead of vector search
 * Supports both Ollama (local) and Claude (cloud)
 */

import { DocNode, QueryResult, Reference, ReasoningStep } from './types';
import { getAllDocuments, searchDocuments, getNode, getDocumentTree } from './document-store';
import { getNodePath } from './pdf-parser';
import { OllamaClient } from '../ollama-client';

interface ReasonerOptions {
  maxSteps?: number;
  useOllama?: boolean;
  ollamaModel?: string;
  anthropicApiKey?: string;
}

const DEFAULT_OPTIONS: ReasonerOptions = {
  maxSteps: 5,
  useOllama: true,
  ollamaModel: 'qwen2.5:7b',
};

/**
 * Answer a question using tree-based reasoning
 */
export async function answerQuestion(
  question: string,
  options: ReasonerOptions = {}
): Promise<QueryResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const reasoningTrace: ReasoningStep[] = [];
  const references: Reference[] = [];

  // Step 1: Search for relevant sections
  reasoningTrace.push({
    step: 1,
    action: 'navigate',
    thought: `Suche relevante Dokumente für: "${question}"`,
  });

  const searchResults = searchDocuments(question, 5);

  if (searchResults.length === 0) {
    return {
      answer:
        'Ich konnte keine relevanten Informationen in den verfügbaren Dokumenten finden.',
      confidence: 0.1,
      references: [],
      reasoningTrace,
    };
  }

  // Step 2: Read top results
  const contexts: string[] = [];

  for (const result of searchResults.slice(0, 3)) {
    reasoningTrace.push({
      step: reasoningTrace.length + 1,
      action: 'read',
      nodeId: result.node.id,
      nodeTitle: result.node.title,
      thought: `Lese Abschnitt: "${result.node.title}" aus "${result.documentTitle}"`,
    });

    contexts.push(`[${result.documentTitle} > ${result.path.join(' > ')}]\n${result.excerpt}`);

    references.push({
      documentId: result.documentId,
      documentTitle: result.documentTitle,
      nodeId: result.node.id,
      nodeTitle: result.node.title,
      page: result.node.page,
      excerpt: result.excerpt,
      path: result.path,
    });
  }

  // Step 3: Generate answer
  reasoningTrace.push({
    step: reasoningTrace.length + 1,
    action: 'answer',
    thought: 'Generiere Antwort basierend auf gefundenen Abschnitten',
  });

  const answer = await generateAnswer(question, contexts, opts);

  // Calculate confidence based on search results
  const avgRelevance =
    searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length;
  const confidence = Math.min(0.9, avgRelevance * 10 + 0.3);

  return {
    answer,
    confidence,
    references,
    reasoningTrace,
  };
}

/**
 * Generate answer using LLM
 */
async function generateAnswer(
  question: string,
  contexts: string[],
  options: ReasonerOptions
): Promise<string> {
  const prompt = `Du bist ein hilfreicher Assistent für Controlling-Dokumente.

KONTEXT aus Dokumenten:
${contexts.join('\n\n---\n\n')}

FRAGE: ${question}

Beantworte die Frage basierend auf dem Kontext. Wenn der Kontext die Frage nicht vollständig beantwortet, sage das. Verweise auf die Quellen.`;

  if (options.useOllama) {
    try {
      const ollama = new OllamaClient();
      const response = await ollama.generate(prompt, {
        model: options.ollamaModel,
        temperature: 0.3,
      });
      return response;
    } catch (error) {
      console.warn('Ollama nicht verfügbar, verwende Fallback');
      return generateFallbackAnswer(question, contexts);
    }
  } else if (options.anthropicApiKey) {
    // Use Claude API
    const Anthropic = await import('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: options.anthropicApiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock ? textBlock.text : 'Keine Antwort generiert.';
  }

  return generateFallbackAnswer(question, contexts);
}

/**
 * Fallback answer when no LLM is available
 */
function generateFallbackAnswer(question: string, contexts: string[]): string {
  if (contexts.length === 0) {
    return 'Keine relevanten Informationen gefunden.';
  }

  // Simple extractive answer
  const combined = contexts.join('\n\n');

  // Find sentences that might answer the question
  const questionKeywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const sentences = combined.split(/[.!?]+/).filter((s) => s.trim());
  const relevantSentences = sentences.filter((s) => {
    const sLower = s.toLowerCase();
    return questionKeywords.some((kw) => sLower.includes(kw));
  });

  if (relevantSentences.length > 0) {
    return (
      relevantSentences.slice(0, 3).join('. ') +
      '.\n\n(Antwort basiert auf Textextraktion ohne LLM)'
    );
  }

  return 'Relevante Abschnitte gefunden, aber keine direkte Antwort extrahierbar. Bitte prüfen Sie die Quellen.';
}

/**
 * Get document overview for navigation
 */
export function getDocumentOverview(): Array<{
  id: string;
  title: string;
  sections: number;
  sizeKB: number;
}> {
  return getAllDocuments().map((doc) => ({
    id: doc.id,
    title: doc.title,
    sections: doc.totalSections,
    sizeKB: Math.round(doc.sizeBytes / 1024),
  }));
}
